import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

export interface NotificationPermissionAttempt {
    permission: NotificationPermission | 'unsupported';
    elapsedMs: number;
    wasPreDenied: boolean;
}

/**
 * Synchronously invokes window.Notification.requestPermission() inside a user click gesture.
 * Supports both modern Promise-returning browsers and legacy callback Safari/WebViews.
 */
export function requestBrowserNotificationPermissionWithMeta(): Promise<NotificationPermissionAttempt> {
    if (typeof window === 'undefined' || !('Notification' in window) || !window.Notification) {
        return Promise.resolve({
            permission: 'unsupported',
            elapsedMs: 0,
            wasPreDenied: false,
        });
    }

    const existing = window.Notification.permission;
    if (existing === 'granted') {
        return Promise.resolve({
            permission: 'granted',
            elapsedMs: 0,
            wasPreDenied: false,
        });
    }

    const wasPreDenied = existing === 'denied';
    const startMs = Date.now();

    try {
        return new Promise<NotificationPermissionAttempt>((resolve) => {
            let settled = false;
            const finish = (perm: NotificationPermission) => {
                if (settled) return;
                settled = true;
                resolve({
                    permission: perm,
                    elapsedMs: Date.now() - startMs,
                    wasPreDenied,
                });
            };

            const maybePromise = window.Notification.requestPermission((cbPerm) => {
                finish(cbPerm);
            });

            if (maybePromise && typeof (maybePromise as Promise<NotificationPermission>).then === 'function') {
                (maybePromise as Promise<NotificationPermission>)
                    .then((perm) => finish(perm))
                    .catch(() => finish(window.Notification?.permission || 'denied'));
            }
        });
    } catch {
        return Promise.resolve({
            permission: window.Notification?.permission || 'denied',
            elapsedMs: Date.now() - startMs,
            wasPreDenied,
        });
    }
}

export async function unsubscribeFromWebPush() {
    try {
        try {
            localStorage.setItem('deepshop_push_enabled', 'false');
        } catch {}
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            return true;
        }
        const registration = await navigator.serviceWorker.ready;
        if (!registration.pushManager) return true;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            await subscription.unsubscribe();
        }
        return true;
    } catch (e) {
        console.error('Web Push unsubscribe error', e);
        return false;
    }
}

export async function subscribeToWebPush(
    uidParam?: string,
    preAcquiredPermission?: NotificationPermission | 'unsupported'
) {
    try {
        let permission: NotificationPermission | 'unsupported' =
            preAcquiredPermission || 'default';

        if (!preAcquiredPermission) {
            const attempt = await requestBrowserNotificationPermissionWithMeta();
            permission = attempt.permission;
        }

        if (permission === 'unsupported') {
            return { error: "Push notifications are not supported on this device/browser", unsupported: true };
        }

        if (permission !== 'granted') {
            return {
                error: "Notification permission was denied. Please allow notifications in your browser settings.",
                denied: true,
            };
        }

        const uid = uidParam || auth.currentUser?.uid;
        try {
            localStorage.setItem('deepshop_push_enabled', 'true');
        } catch {}

        if (uid) {
            setDoc(
                doc(db, 'users', uid),
                {
                    notificationsEnabled: true,
                    pushAlertsOptIn: true,
                    pushUpdatedAt: Date.now(),
                },
                { merge: true }
            ).catch(() => {});
        }

        // If browser supports Notification API but not ServiceWorker/PushManager (e.g., certain mobile browsers),
        // still succeed because browser notification permission was granted!
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            try {
                new window.Notification('DEEP SHOP', {
                    body: 'Push notifications are now enabled for your account!',
                    icon: '/favicon.svg',
                });
            } catch {}
            return { ok: true, permission: 'granted', browserNotificationOnly: true };
        }

        const res = await fetch('/api/web-push/public-key');
        if (!res.ok) {
            return { ok: true, permission: 'granted', browserNotificationOnly: true };
        }
        const { publicKey } = await res.json();

        if (publicKey) {
            let registration = await navigator.serviceWorker.getRegistration();
            if (!registration) {
                try {
                    registration = await navigator.serviceWorker.register('/custom-sw.js');
                } catch (e: any) {
                    console.warn("Service worker registration fallback:", e?.message);
                    return { ok: true, permission: 'granted', browserNotificationOnly: true };
                }
            }

            registration = await navigator.serviceWorker.ready;

            if (!registration || !registration.pushManager) {
                return { ok: true, permission: 'granted', browserNotificationOnly: true };
            }

            const existingSub = await registration.pushManager.getSubscription();

            const urlB64ToUint8Array = (base64String: string) => {
                const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
                const base64 = (base64String + padding)
                    .replace(/-/g, '+')
                    .replace(/_/g, '/');
                const rawData = window.atob(base64);
                const outputArray = new Uint8Array(rawData.length);
                for (let i = 0; i < rawData.length; ++i) {
                    outputArray[i] = rawData.charCodeAt(i);
                }
                return outputArray;
            };

            let subscription = existingSub;
            let isFreshSub = false;

            if (existingSub) {
                const currentKey = existingSub.options.applicationServerKey;
                const newKey = urlB64ToUint8Array(publicKey);

                let match = true;
                if (currentKey && currentKey.byteLength === newKey.byteLength) {
                    const currArr = new Uint8Array(currentKey);
                    for (let i = 0; i < 5; i++) {
                        if (currArr[i] !== newKey[i]) match = false;
                    }
                } else {
                    match = false;
                }

                if (!match) {
                    await existingSub.unsubscribe();
                    subscription = null;
                }
            }

            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlB64ToUint8Array(publicKey),
                });
                isFreshSub = true;
            }

            const subJson = subscription?.toJSON ? subscription.toJSON() : subscription;

            try {
                await fetch('/api/web-push/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subscription: subJson, uid }),
                });
            } catch (err) {
                console.error("Failed to save subscription to API", err);
            }

            if (isFreshSub && subJson) {
                fetch('/api/send-welcome-push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subscription: subJson }),
                }).catch(() => {});
            }

            if (uid) {
                try {
                    await setDoc(
                        doc(db, 'users', uid),
                        {
                            webPushSub: subJson,
                            notificationsEnabled: true,
                        },
                        { merge: true }
                    );
                } catch (e) {
                    console.error("Failed to save to users doc", e);
                }
            }

            return subscription;
        }

        return { ok: true, permission: 'granted' };
    } catch (e: any) {
        console.warn('Web Push setup notice:', e?.message || e);
        return { error: e?.message || "Failed to subscribe" };
    }
}

export async function sendPushNotification(
    uid: string,
    payload: { title: string; body: string; url?: string; image?: string; icon?: string }
) {
    try {
        await fetch('/api/send-push-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: uid, payload }),
        });
    } catch (e) {
        console.error("Failed to send push notification", e);
    }
}
