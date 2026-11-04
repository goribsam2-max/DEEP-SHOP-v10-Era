import { initializeApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  type Auth,
} from "firebase/auth";
import {
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBYDcBuYZEH38mwWoCqTmyImGIYqlXteZ4",
  authDomain: "deep-shop-bd.firebaseapp.com",
  projectId: "deep-shop-bd",
  storageBucket: "deep-shop-bd.firebasestorage.app",
  messagingSenderId: "771344063997",
  appId: "1:771344063997:web:f06c63b007a7369bf94d94",
  measurementId: "G-K1LQBDQ85E",
};

const app = initializeApp(firebaseConfig);

const isEmbeddedFrame = (() => {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: isEmbeddedFrame
      ? [browserLocalPersistence]
      : [indexedDBLocalPersistence, browserLocalPersistence],
  });
} catch {
  authInstance = getAuth(app);
}
export const auth = authInstance;

let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: isEmbeddedFrame
      ? memoryLocalCache()
      : persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
    experimentalAutoDetectLongPolling: true,
    ignoreUndefinedProperties: true,
  });
} catch {
  firestoreInstance = initializeFirestore(app, {
    localCache: memoryLocalCache(),
    experimentalAutoDetectLongPolling: true,
    ignoreUndefinedProperties: true,
  });
}

export const db = firestoreInstance;

export const messaging = async () => {
  try {
    const { getMessaging, isSupported } = await import("firebase/messaging");
    const supported = await isSupported();
    if (supported) {
      return getMessaging(app);
    }
  } catch {}
  return null;
};
