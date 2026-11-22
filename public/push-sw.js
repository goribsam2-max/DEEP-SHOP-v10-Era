/* Service Worker Push Notification & Click Handler (imported by VitePWA Workbox SW) */

self.addEventListener('push', function (event) {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      try {
        payload = { title: 'DEEP SHOP', body: event.data.text() };
      } catch (err) {
        payload = {};
      }
    }
  }

  const nestedData = payload && typeof payload.data === 'object' && payload.data !== null ? payload.data : {};
  const title = payload.title || nestedData.title || 'DEEP SHOP';
  const body = payload.body || payload.message || nestedData.body || 'You have a new notification.';
  const targetUrl = payload.url || payload.link || nestedData.url || nestedData.link || '/messages';
  const icon = payload.icon || nestedData.icon || '/pwa-192x192.png';
  const badge = payload.badge || '/favicon.png';
  const image = payload.image || nestedData.image || undefined;
  const isCall = payload.type === 'call' || nestedData.type === 'call' || Boolean(payload.isCall);
  const tag = payload.tag || nestedData.tag || (isCall ? 'deepshop-call' : 'deepshop-msg');

  const options = {
    body,
    icon,
    badge,
    ...(image ? { image } : {}),
    tag,
    renotify: true,
    requireInteraction: isCall,
    vibrate: isCall ? [280, 120, 280, 120, 420] : [160, 80, 160],
    timestamp: Date.now(),
    data: {
      ...nestedData,
      url: targetUrl,
      type: payload.type || nestedData.type || 'notification',
    },
    ...(isCall
      ? {
          actions: [{ action: 'open', title: 'Answer Call' }],
        }
      : {}),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const data = (event.notification && event.notification.data) || {};
  const rawUrl = data.url || '/';

  let targetUrl;
  try {
    targetUrl = new URL(rawUrl, self.location.origin).href;
  } catch (e) {
    targetUrl = self.location.origin + '/';
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url && client.url.startsWith(self.location.origin)) {
            if ('focus' in client) {
              client.focus();
            }
            if ('navigate' in client && typeof client.navigate === 'function') {
              return client.navigate(targetUrl).catch(function () {
                client.postMessage({ type: 'PUSH_NAVIGATE', url: rawUrl });
              });
            }
            client.postMessage({ type: 'PUSH_NAVIGATE', url: rawUrl });
            return;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

self.addEventListener('pushsubscriptionchange', function (event) {
  event.waitUntil(
    (async function () {
      try {
        const keyRes = await fetch('/api/web-push/public-key');
        if (!keyRes.ok) return;
        const keyJson = await keyRes.json();
        const publicKey = keyJson && keyJson.publicKey;
        if (!publicKey) return;

        const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
        const base64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }

        const newSub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: outputArray,
        });

        await fetch('/api/web-push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: newSub.toJSON ? newSub.toJSON() : newSub }),
        });
      } catch (err) {
        // Silent fallback; client re-syncs subscription on next open
      }
    })()
  );
});
