import React, { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { optimizeImageUrl } from "../lib/imageOptimize";

let cachedLogoUrl = "";
let listenersStarted = false;
const logoSubscribers = new Set<(url: string) => void>();

function ensureLogoListeners() {
  if (listenersStarted) return;
  listenersStarted = true;

  const updateLogo = (next: string) => {
    if (!next || next === cachedLogoUrl) return;
    cachedLogoUrl = next;
    logoSubscribers.forEach((cb) => cb(cachedLogoUrl));
  };

  onSnapshot(
    doc(db, "settings", "payments"),
    (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        const img = d.footerLogo || d.logoUrl;
        if (img) updateLogo(img);
      }
    },
    () => {}
  );

  onSnapshot(
    doc(db, "settings", "seo"),
    (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        const img = d.appIconUrl || d.logoUrl || d.faviconUrl;
        if (img) updateLogo(img);
      }
    },
    () => {}
  );

  onSnapshot(
    doc(db, "settings", "platform"),
    (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.logoUrl || d.footerLogo) updateLogo(d.logoUrl || d.footerLogo);
      }
    },
    () => {}
  );
}

const Logo: React.FC<{
  className?: string;
  scale?: number;
  centerOrigin?: boolean;
  showIcon?: boolean;
}> = ({ className = "", scale = 1, centerOrigin = false, showIcon = true }) => {
  const [logoImg, setLogoImg] = useState<string>(() => cachedLogoUrl);

  useEffect(() => {
    ensureLogoListeners();
    if (cachedLogoUrl) setLogoImg(cachedLogoUrl);
    const handler = (next: string) => setLogoImg(next);
    logoSubscribers.add(handler);
    return () => {
      logoSubscribers.delete(handler);
    };
  }, []);

  const resolvedLogoSrc = logoImg?.trim()
    ? optimizeImageUrl(logoImg.trim(), 84, 80)
    : "";

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      style={{
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: centerOrigin ? "center center" : "left center",
      }}
    >
      {showIcon && resolvedLogoSrc && (
        <img
          src={resolvedLogoSrc}
          alt="Deep Shop Logo"
          width={32}
          height={32}
          decoding="async"
          className="w-8 h-8 object-cover rounded-full border border-black/10 dark:border-white/10 shadow-sm bg-white dark:bg-zinc-800 shrink-0"
          onError={() => setLogoImg("")}
        />
      )}
      <span
        className="lowercase text-[22px] sm:text-[25px] tracking-tight mt-0.5 text-zinc-900 dark:text-white block leading-none font-black"
        style={{
          fontFamily: "'Comfortaa', cursive",
          letterSpacing: "-0.02em",
        }}
      >
        deep shop
      </span>
    </div>
  );
};

export default Logo;
