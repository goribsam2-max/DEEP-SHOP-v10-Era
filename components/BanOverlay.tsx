import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import Icon from "./Icon";
import { ShieldAlert } from "lucide-react";

export default function BanOverlay() {
  const [isBanned, setIsBanned] = useState(false);

  useEffect(() => {
    let unsubProfile: any = null;

    const checkBan = async (uid: string) => {
      unsubProfile = onSnapshot(doc(db, "users", uid), (docSnap) => {
        if (docSnap.exists() && docSnap.data().isBanned) {
          setIsBanned(true);
        } else {
          setIsBanned(false);
        }
      });
    };

    const checkIP = async (currentUserUid?: string) => {
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        const ip = data.ip;
        if (ip) {
          const formattedIp = ip.replace(/\./g, '_');
          const snap = await getDoc(doc(db, "config", "banned_ips"));
          if (snap.exists() && snap.data()[formattedIp] === true) {
            setIsBanned(true);
          }
          
          if (currentUserUid) {
             const { updateDoc } = await import("firebase/firestore");
             await updateDoc(doc(db, "users", currentUserUid), { ipAddress: ip }).catch(() => {});
          }
        }
      } catch (e) {
        // ignore
      }
    };

    checkIP(); // old call

    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        checkBan(user.uid);
      } else {
        if (unsubProfile) unsubProfile();
        setIsBanned(false);
        checkIP(); // old call // recheck IP when logged out
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  if (!isBanned) return null;

  return (
    <div className="fixed inset-0 z-[999999] bg-black/95 flex flex-col items-center justify-center p-6 text-center select-none" style={{ pointerEvents: 'all' }}>
      <div className="bg-zinc-900 border border-red-500/30 p-8 rounded-3xl max-w-sm w-full shadow-[0_0_100px_rgba(239,68,68,0.2)]">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10 text-red-500 animate-pulse" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2 tracking-tight">Access Denied</h1>
        <p className="text-sm font-semibold text-zinc-400 mb-6 leading-relaxed">
          আপনার অ্যাকাউন্ট বা ডিভাইস থেকে এই সাইটে প্রবেশ স্থগিত করা হয়েছে। নিয়ম লঙ্ঘনের কারণে (misbehave) আপনাকে ব্যান করা হয়েছে।
        </p>
        <div className="bg-black/50 p-4 rounded-2xl border border-white/5">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Status: Banned</p>
        </div>
      </div>
    </div>
  );
}
