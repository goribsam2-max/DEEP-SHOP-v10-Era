import { lazy, ComponentType } from 'react';

/**
 * Robust wrapper around React.lazy to handle chunk loading failures
 * (e.g. "'text/html' is not a valid JavaScript MIME type", "module is not valid", or stale cache hashes)
 * by retrying once and doing a guarded clean reload if necessary.
 */
export function lazyRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  name?: string
) {
  return lazy(async () => {
    const storageKey = `ds_lazy_retry_${name || 'route'}_${Math.floor(Date.now() / 60000)}`;
    let alreadyReloaded = false;
    try {
      alreadyReloaded = sessionStorage.getItem(storageKey) === 'true';
    } catch {}

    try {
      return await componentImport();
    } catch (firstErr: any) {
      // Retry up to 2 times in case of transient mobile network drop
      try {
        await new Promise((r) => setTimeout(r, 200));
        return await componentImport();
      } catch {
        try {
          await new Promise((r) => setTimeout(r, 450));
          return await componentImport();
        } catch (error: any) {
          const msg = String(error?.message || firstErr?.message || '').toLowerCase();
          const isMimeOrChunkErr =
            msg.includes('text/html') ||
            msg.includes('dynamically imported module') ||
            msg.includes('importing a module script failed') ||
            msg.includes('module is not valid') ||
            msg.includes('loading chunk') ||
            msg.includes('mime type') ||
            msg.includes('valid javascript') ||
            msg.includes("unexpected token '<'");

          if (isMimeOrChunkErr && !alreadyReloaded && typeof window !== 'undefined') {
            try {
              sessionStorage.setItem(storageKey, 'true');
              if ('caches' in window) {
                caches.delete('app-js-chunks').catch(() => {});
              }
            } catch {}
            window.location.reload();
            return new Promise<{ default: T }>(() => {});
          }
          throw error;
        }
      }
    }
  });
}
