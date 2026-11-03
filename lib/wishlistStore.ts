import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";

type Listener = () => void;

let currentUid: string | null = null;
let wishlistedIds = new Set<string>();
let unsubFirestore: (() => void) | null = null;
let authInitialized = false;
const subscribers = new Set<Listener>();

function notifySubscribers() {
  subscribers.forEach((cb) => {
    try {
      cb();
    } catch {}
  });
}

function attachForUid(uid: string | null) {
  if (uid === currentUid) return;
  currentUid = uid;
  if (unsubFirestore) {
    unsubFirestore();
    unsubFirestore = null;
  }
  wishlistedIds = new Set<string>();
  notifySubscribers();

  if (!uid) return;

  unsubFirestore = onSnapshot(
    collection(db, "users", uid, "wishlist"),
    (snap) => {
      const next = new Set<string>();
      snap.docs.forEach((d) => next.add(d.id));
      wishlistedIds = next;
      notifySubscribers();
    },
    () => {}
  );
}

function ensureWishlistAuthSubscription() {
  if (authInitialized) return;
  authInitialized = true;
  attachForUid(auth.currentUser?.uid || null);
  onAuthStateChanged(auth, (u) => {
    attachForUid(u?.uid || null);
  });
}

export function useIsWishlisted(productId?: string): boolean {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!productId) return;
    ensureWishlistAuthSubscription();
    const listener = () => setTick((t) => t + 1);
    subscribers.add(listener);
    return () => {
      subscribers.delete(listener);
    };
  }, [productId]);

  if (!productId) return false;
  return wishlistedIds.has(productId);
}

export async function toggleWishlistItem(
  productId: string
): Promise<"added" | "removed" | "unauthenticated"> {
  const user = auth.currentUser;
  if (!user) return "unauthenticated";

  const wishlistRef = doc(db, "users", user.uid, "wishlist", productId);
  const wasWishlisted = wishlistedIds.has(productId);

  if (wasWishlisted) {
    wishlistedIds.delete(productId);
    notifySubscribers();
    await deleteDoc(wishlistRef);
    return "removed";
  } else {
    wishlistedIds.add(productId);
    notifySubscribers();
    await setDoc(wishlistRef, {
      productId,
      addedAt: new Date().toISOString(),
    });
    return "added";
  }
}
