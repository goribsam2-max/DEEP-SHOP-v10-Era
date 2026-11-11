import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { setupProtection } from './protection';
setupProtection();
import App from './App';
import { RegionProvider } from './components/RegionContext';
import ErrorBoundary from './components/ErrorBoundary';
import { sendSystemAlertToTelegram } from './services/telegram';
import { HelmetProvider } from 'react-helmet-async';

// Purge legacy JS chunk caches that could serve stale chunks or HTML fallbacks across deployments
if (typeof window !== 'undefined' && 'caches' in window) {
  caches
    .keys()
    .then((keys) => {
      keys.forEach((key) => {
        if (key === 'app-js-chunks' || key.startsWith('workbox-precache')) {
          caches.delete(key).catch(() => {});
        }
      });
    })
    .catch(() => {});
}

// Auto-recover from Vite dynamic import / preload MIME mismatches after a new deployment
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    const reloadGuardKey = 'ds_vite_preload_reload_' + Math.floor(Date.now() / 15000);
    try {
      if (!sessionStorage.getItem(reloadGuardKey)) {
        sessionStorage.setItem(reloadGuardKey, '1');
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  });
}

const isBenignDevClientNoise = (msg: string, stack: string, filename = ""): boolean => {
  const combined = `${msg} ${stack} ${filename}`.toLowerCase();
  return (
    combined.includes("@vite/client") ||
    (combined.includes("vite") && combined.includes("websocket")) ||
    combined.includes("waitforsuccessfulping") ||
    combined.includes("failed to register a serviceworker") ||
    combined.includes("resizeobserver loop") ||
    combined.includes("resource-exhausted") ||
    combined.includes("quota exceeded") ||
    combined.includes("maximum backoff delay") ||
    combined.includes("overloading the backend") ||
    combined.includes("internal assertion failed") ||
    combined.includes("key generator value") ||
    combined.includes("firestore (12.")
  );
};

const isStaleChunkOrMimeError = (msg: string): boolean => {
  const lower = (msg || '').toLowerCase();
  return (
    lower.includes('text/html') ||
    lower.includes('valid javascript mime type') ||
    lower.includes('dynamically imported module') ||
    lower.includes('module is not valid') ||
    lower.includes('importing a module script failed') ||
    lower.includes('loading chunk') ||
    lower.includes("unexpected token '<'")
  );
};

const triggerGuardedBundleReload = () => {
  try {
    const reloadKey = 'ds_chunk_reload_' + Math.floor(Date.now() / 20000);
    if (!sessionStorage.getItem(reloadKey)) {
      sessionStorage.setItem(reloadKey, 'true');
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.update().catch(() => {}));
        }).catch(() => {});
      }
      window.location.reload();
      return true;
    }
  } catch {}
  return false;
};

window.addEventListener('error', (e) => {
  const msg = e.message || '';
  const stack = e.error?.stack || '';
  if (isBenignDevClientNoise(msg, stack, e.filename || '')) {
    e.stopImmediatePropagation();
    e.preventDefault();
    return;
  }
  if (isStaleChunkOrMimeError(msg)) {
    if (triggerGuardedBundleReload()) {
      e.preventDefault();
      return;
    }
  }
  try {
    sendSystemAlertToTelegram(`Global Error: ${msg}`, stack || 'No stack trace available');
  } catch (err) {
    console.error('Failed to dispatch to telegram', err);
  }
});

window.addEventListener('unhandledrejection', (e) => {
  try {
    const errorMsg =
      e.reason?.message ||
      (typeof e.reason === 'string' ? e.reason : '');
    const stack = e.reason?.stack || '';
    if (
      (!errorMsg && (!stack || stack.includes('@vite/client'))) ||
      isBenignDevClientNoise(errorMsg || 'Unhandled Promise Rejection', stack)
    ) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    if (isStaleChunkOrMimeError(errorMsg)) {
      if (triggerGuardedBundleReload()) {
        e.preventDefault();
        return;
      }
    }
    sendSystemAlertToTelegram(
      `Unhandled Rejection: ${errorMsg || 'Unhandled Promise Rejection'}`,
      stack || 'No stack trace'
    );
  } catch (err) {
    console.error('Failed to dispatch to telegram', err);
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <RegionProvider>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </RegionProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener(
    'load',
    () => {
      const registerIdleSw = () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((reg) => {
            reg.update().catch(() => {});
          })
          .catch(() => {});
      };
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(registerIdleSw, { timeout: 3500 });
      } else {
        setTimeout(registerIdleSw, 2200);
      }
    },
    { once: true }
  );
}
