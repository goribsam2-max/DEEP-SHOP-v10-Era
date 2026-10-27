import React, { useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { ExternalLink, Sparkles } from "lucide-react";

export type AdSlotPosition =
  | "header_top"
  | "feed_in_feed"
  | "post_in_article"
  | "sidebar_right"
  | "bottom_fixed"
  | "multiplex_grid";

export interface AdPlacementConfig {
  id: string;
  slot: AdSlotPosition;
  active: boolean;
  type: "script" | "custom";
  scriptCode?: string;
  title?: string;
  text?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonLink?: string;
  deviceTarget?: "all" | "mobile" | "desktop";
  format?: "in_feed" | "display" | "multiplex" | "in_article";
}

interface AdPlacementSlotProps {
  slot: AdSlotPosition;
  className?: string;
  postIndex?: number;
}

export const AdPlacementSlot: React.FC<AdPlacementSlotProps> = ({
  slot,
  className = "",
  postIndex,
}) => {
  const [placements, setPlacements] = useState<AdPlacementConfig[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "ad_placements"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const list: AdPlacementConfig[] = Array.isArray(data.placements)
          ? data.placements
          : [];
        setPlacements(list);
      }
    });
    return () => unsub();
  }, []);

  const activeAd = placements.find((p) => p.slot === slot && p.active);

  // Evaluate script code securely inside the container
  useEffect(() => {
    if (!activeAd || activeAd.type !== "script" || !activeAd.scriptCode) return;
    const el = containerRef.current;
    if (!el) return;

    el.innerHTML = "";

    try {
      const range = document.createRange();
      range.selectNode(el);
      const fragment = range.createContextualFragment(activeAd.scriptCode);
      el.appendChild(fragment);

      // Re-run script tags if browser skipped contextual execution
      const scripts = el.querySelectorAll("script");
      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");
        Array.from(oldScript.attributes).forEach((attr) =>
          newScript.setAttribute(attr.name, attr.value)
        );
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        if (oldScript.parentNode) {
          oldScript.parentNode.replaceChild(newScript, oldScript);
        }
      });
    } catch (err) {
      console.error("Error executing ad script placement:", err);
    }
  }, [activeAd?.id, activeAd?.scriptCode, activeAd?.type]);

  if (!activeAd) return null;

  // Device check (mobile vs desktop)
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  if (
    activeAd.deviceTarget === "mobile" &&
    !isMobile
  )
    return null;
  if (
    activeAd.deviceTarget === "desktop" &&
    isMobile
  )
    return null;

  // 1. Script Based Ad Slot
  if (activeAd.type === "script") {
    return (
      <div
        className={`w-full flex justify-center items-center overflow-hidden my-3 ${className}`}
      >
        <div
          ref={containerRef}
          className="w-full min-h-[60px] flex items-center justify-center text-center text-xs text-zinc-400"
        />
      </div>
    );
  }

  // 2. Custom Liquid Glass Ad Placement Slot (Responsive Text + Image + Button)
  const isMultiplex = activeAd.format === "multiplex";

  if (isMultiplex) {
    return (
      <div className={`my-4 p-4 rounded-[24px] bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-purple-50/60 dark:from-zinc-900/90 dark:via-zinc-900/60 dark:to-zinc-800/80 border border-blue-200/60 dark:border-zinc-700/60 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md ${className}`}>
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-blue-100 dark:border-zinc-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Sponsored Recommendations
          </span>
          <span className="text-[10px] text-zinc-400">Ad</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white dark:bg-zinc-800 p-3 border border-slate-100 dark:border-zinc-700 flex flex-col justify-between space-y-2">
            {activeAd.imageUrl && (
              <img
                src={activeAd.imageUrl}
                alt={activeAd.title || "Ad"}
                className="w-full h-28 object-cover rounded-xl"
              />
            )}
            <div>
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white line-clamp-2">
                {activeAd.title || "Promoted Feature"}
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1">
                {activeAd.text}
              </p>
            </div>
            {activeAd.buttonLink && (
              <a
                href={activeAd.buttonLink}
                target={activeAd.buttonLink.startsWith("http") ? "_blank" : "_self"}
                rel="noopener noreferrer"
                className="w-full py-1.5 px-3 rounded-xl bg-[#1877F2] text-white text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-blue-600 transition"
              >
                <span>{activeAd.buttonText || "Learn More"}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`my-3.5 p-4 rounded-[24px] bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.06)] flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 transition hover:shadow-md ${className}`}
    >
      {activeAd.imageUrl && (
        <div className="w-full sm:w-36 h-36 sm:h-28 rounded-2xl overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-800">
          <img
            src={activeAd.imageUrl}
            alt={activeAd.title || "Ad"}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
            Sponsored
          </span>
          <span className="text-[10px] text-zinc-400">Promoted</span>
        </div>
        {activeAd.title && (
          <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white leading-tight line-clamp-2">
            {activeAd.title}
          </h3>
        )}
        {activeAd.text && (
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-2">
            {activeAd.text}
          </p>
        )}
        {activeAd.buttonLink && (
          <div className="pt-1">
            <a
              href={activeAd.buttonLink}
              target={activeAd.buttonLink.startsWith("http") ? "_blank" : "_self"}
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1877F2] hover:bg-blue-600 text-white text-xs font-bold transition shadow-sm active:scale-95"
            >
              <span>{activeAd.buttonText || "Check It Out"}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
