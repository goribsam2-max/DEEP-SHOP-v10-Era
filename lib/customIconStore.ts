import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

let customIconsCache: Record<string, string> = {};
try {
  const cached = localStorage.getItem('custom_icons_cache');
  if (cached) {
    const parsed = JSON.parse(cached);
    if (parsed && typeof parsed === 'object') {
      const cleaned: Record<string, string> = {};
      Object.keys(parsed).forEach((k) => {
        if (typeof parsed[k] === 'string' && k !== 'icons') {
          cleaned[k.toLowerCase()] = parsed[k];
        }
      });
      customIconsCache = cleaned;
    }
  }
} catch (e) {
  console.warn('Failed to read custom icons cache from localStorage', e);
}

const listeners = new Set<() => void>();
let isListening = false;

function notifyListeners() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {}
  });
}

export function applyRawCustomIconsMap(rawIcons: Record<string, any>) {
  const cleaned: Record<string, string> = {};
  Object.keys(rawIcons || {}).forEach((k) => {
    if (typeof rawIcons[k] === 'string' && k !== 'icons') {
      cleaned[k.toLowerCase()] = rawIcons[k];
    }
  });
  customIconsCache = cleaned;
  try {
    localStorage.setItem('custom_icons_cache', JSON.stringify(customIconsCache));
  } catch {}
  notifyListeners();
}

export function initCustomIconsStore() {
  if (isListening) return;
  isListening = true;

  if (typeof window !== 'undefined') {
    const handleEvent = (ev: Event) => {
      const detailIcons = (ev as CustomEvent<any>)?.detail;
      if (detailIcons && typeof detailIcons === 'object') {
        applyRawCustomIconsMap(detailIcons);
      } else {
        try {
          const cached = localStorage.getItem('custom_icons_cache');
          if (cached) applyRawCustomIconsMap(JSON.parse(cached));
        } catch {}
      }
    };
    window.addEventListener('loops:custom-icons-updated', handleEvent);
    window.addEventListener('loopsIconsUpdated', handleEvent);
  }

  try {
    onSnapshot(
      doc(db, 'settings', 'custom_icons'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const rawIcons = data?.icons || data || {};
          applyRawCustomIconsMap(rawIcons);
        } else {
          customIconsCache = {};
          try {
            localStorage.removeItem('custom_icons_cache');
          } catch {}
          notifyListeners();
        }
      },
      (err) => {
        console.warn('Custom icons listener error', err);
      }
    );
  } catch (e) {
    console.warn('Failed to initialize custom icons listener', e);
  }
}

export function subscribeCustomIcons(cb: () => void): () => void {
  initCustomIconsStore();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getCustomIconFromCache(candidates: string[]): string | null {
  for (const cand of candidates) {
    if (!cand) continue;
    const key = cand.toLowerCase().trim();
    const hit = customIconsCache[key] || customIconsCache[cand];
    if (hit && hit.trim()) {
      return hit;
    }
  }
  return null;
}
