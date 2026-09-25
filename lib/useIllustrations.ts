import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

let cachedIllustrations: Record<string, string> | null = null;
let listeners: Array<(data: Record<string, string>) => void> = [];
let unsubscribe: (() => void) | null = null;

const initIllustrations = () => {
  if (unsubscribe) return;
  unsubscribe = onSnapshot(doc(db, "settings", "illustrations"), (snap) => {
    if (snap.exists()) {
      cachedIllustrations = snap.data() as Record<string, string>;
    } else {
      cachedIllustrations = {};
    }
    listeners.forEach(l => l(cachedIllustrations!));
  }, (err) => {
    console.error("Failed to fetch illustrations:", err);
  });
};

initIllustrations();

export function useIllustrations() {
  const [illustrations, setIllustrations] = useState<Record<string, string>>(cachedIllustrations || {});

  useEffect(() => {
    const listener = (data: Record<string, string>) => {
      setIllustrations(data);
    };
    listeners.push(listener);
    if (cachedIllustrations) {
      setIllustrations(cachedIllustrations);
    }
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  return illustrations;
}
