import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import Icon from "./Icon";
import { ShieldAlert } from "lucide-react";

export default function BanOverlay() {
  const [isBanned, setIsBanned] = useState(() => {
    try {
      return localStorage.getItem("deepshop_banned") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let unsubProfile: any = null;

    const onTriggerBan = () => {
      setIsBanned(true);
    };
    window.addEventListener("triggerBanOverlay", onTriggerBan);

    const checkBan = async (uid: string) => {
      unsubProfile = onSnapshot(doc(db, "users", uid), (docSnap) => {
        if (docSnap.exists() && docSnap.data().isBanned) {
          setIsBanned(true);
          try { localStorage.setItem("deepshop_banned", "true"); } catch {}
        } else {
          // Check local
          const localBan = localStorage.getItem("deepshop_banned") === "true";
          if (!localBan) {
            setIsBanned(false);
          }
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
            try { localStorage.setItem("deepshop_banned", "true"); } catch {}
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

    checkIP();

    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        checkBan(user.uid);
      } else {
        if (unsubProfile) unsubProfile();
        const localBan = localStorage.getItem("deepshop_banned") === "true";
        if (localBan) {
          setIsBanned(true);
        } else {
          setIsBanned(false);
          checkIP();
        }
      }
    });

    return () => {
      window.removeEventListener("triggerBanOverlay", onTriggerBan);
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  if (!isBanned) return null;

  return (
    <div className="ds-apple-portal fixed inset-0 z-[999999] bg-black/94 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none pointer-events-auto">
      <div className="bg-[#1C1C1E] border border-red-500/30 p-7 rounded-[28px] max-w-sm w-full shadow-2xl">
        <div className="w-16 h-16 bg-red-500/12 rounded-2xl border border-red-500/20 flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-8 h-8 text-[#FF453A]" />
        </div>
        <h1 className="ds-apple-display text-[22px] font-bold text-[#F5F5F7] mb-2 tracking-tight">
          Access Denied
        </h1>
        <p className="text-[14px] text-[#98989D] mb-6 leading-relaxed">
          Access to this site from your account or device has been permanently restricted due to 3 repeated violations involving abusive language or fraudulent details.
        </p>
        <div className="bg-[#2C2C2E] p-4 rounded-2xl border border-red-500/20">
          <p className="text-xs font-bold text-[#FF453A] uppercase tracking-wider">
            Status: Permanently Banned
          </p>
          <p className="text-[11px] text-[#98989D] mt-1">
            Policy: Zero Tolerance for Abuse & Fake Details
          </p>
        </div>
      </div>
    </div>
  );
}
