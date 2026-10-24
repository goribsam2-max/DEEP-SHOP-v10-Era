
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { setupProtection } from './protection';
setupProtection();
import App from './App';
import { RegionProvider } from './components/RegionContext';
import ErrorBoundary from './components/ErrorBoundary';
import { sendSystemAlertToTelegram } from './services/telegram';

// Suppress benign ResizeObserver errors that can cause unhandled overlays
const debounce = (cb: any) => {
  let frame: any;
  return (...args: any) => {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      cb(...args);
    });
  };
};

const OriginalResizeObserver = window.ResizeObserver;
window.ResizeObserver = class ResizeObserver extends OriginalResizeObserver {
  constructor(callback: any) {
    super(debounce(callback));
  }
};

const isBenignDevClientNoise = (msg: string, stack: string, filename = ""): boolean => {
  const combined = `${msg} ${stack} ${filename}`.toLowerCase();
  return (
    combined.includes("@vite/client") ||
    combined.includes("vite") && combined.includes("websocket") ||
    combined.includes("waitforsuccessfulping") ||
    combined.includes("failed to register a serviceworker") ||
    combined.includes("resizeobserver loop")
  );
};

window.addEventListener('error', (e) => {
  const msg = e.message || '';
  const stack = e.error?.stack || '';
  if (isBenignDevClientNoise(msg, stack, e.filename || '')) {
    e.stopImmediatePropagation();
    e.preventDefault();
    return;
  }
  // Global error handler
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
      !errorMsg && (!stack || stack.includes('@vite/client')) ||
      isBenignDevClientNoise(errorMsg || 'Unhandled Promise Rejection', stack)
    ) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
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
import { HelmetProvider } from 'react-helmet-async';
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
