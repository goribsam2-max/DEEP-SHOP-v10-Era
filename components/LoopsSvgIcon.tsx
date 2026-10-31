import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { LOOPS_SVG_MAP } from "../lib/loopsSvgRegistry";

export const LOOPS_ICONS_UPDATED_EVENT = "loopsIconsUpdated";

let cachedOverrides: Record<string, string> = (() => {
  try {
    const raw = localStorage.getItem("custom_icons_cache");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    }
  } catch {}
  return {};
})();

let listenerInitialized = false;
const subscribers = new Set<() => void>();

function notifyAllSubscribers() {
  subscribers.forEach((cb) => {
    try {
      cb();
    } catch {}
  });
}

function ensureFirestoreIconListener() {
  if (listenerInitialized) return;
  listenerInitialized = true;

  try {
    onSnapshot(
      doc(db, "settings", "custom_icons"),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const rawIcons = data?.icons || data || {};
        const next: Record<string, string> = {};
        Object.keys(rawIcons).forEach((k) => {
          if (typeof rawIcons[k] === "string" && k !== "icons") {
            next[k.toLowerCase()] = rawIcons[k];
          }
        });
        cachedOverrides = next;
        try {
          localStorage.setItem("custom_icons_cache", JSON.stringify(next));
        } catch {}
        notifyAllSubscribers();
      },
      () => {}
    );
  } catch {}

  if (typeof window !== "undefined") {
    window.addEventListener(LOOPS_ICONS_UPDATED_EVENT, (ev: Event) => {
      const detail = (ev as CustomEvent<Record<string, string>>).detail;
      if (detail && typeof detail === "object") {
        cachedOverrides = { ...cachedOverrides, ...detail };
      } else {
        try {
          const raw = localStorage.getItem("custom_icons_cache");
          if (raw) cachedOverrides = JSON.parse(raw) || {};
        } catch {}
      }
      notifyAllSubscribers();
    });
  }
}

export function broadcastLoopsIconUpdate(overrides?: Record<string, string>) {
  if (overrides) {
    cachedOverrides = { ...overrides };
  }
  notifyAllSubscribers();
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(LOOPS_ICONS_UPDATED_EVENT, { detail: overrides })
    );
  }
}

function injectSvgClass(rawSvg: string, className: string): string {
  const trimmed = (rawSvg || "").trim();
  if (!trimmed.toLowerCase().includes("<svg")) return "";

  return trimmed.replace(/<svg\b([^>]*)>/i, (_full, attrs: string) => {
    const cleanedAttrs = attrs
      .replace(/\bwidth="[^"]*"/gi, "")
      .replace(/\bheight="[^"]*"/gi, "")
      .replace(/\bclass="[^"]*"/gi, "")
      .replace(/\bclassName="[^"]*"/gi, "");
    const hasViewBox = /\bviewBox=/i.test(cleanedAttrs);
    const viewBoxAttr = hasViewBox ? "" : ' viewBox="0 0 24 24"';
    return `<svg class="${className}"${viewBoxAttr} ${cleanedAttrs.trim()}>`;
  });
}

export interface LoopsSvgIconProps {
  name: string;
  className?: string;
  previewOverrideSvg?: string;
}

export const LoopsSvgIcon: React.FC<LoopsSvgIconProps> = ({
  name,
  className = "w-5 h-5",
  previewOverrideSvg,
}) => {
  const [, setVersion] = useState(0);

  useEffect(() => {
    ensureFirestoreIconListener();
    const bump = () => setVersion((v) => v + 1);
    subscribers.add(bump);
    return () => {
      subscribers.delete(bump);
    };
  }, []);

  const normalizedKey = name.toLowerCase().trim();
  const rawSvg =
    (previewOverrideSvg && previewOverrideSvg.trim()) ||
    cachedOverrides[normalizedKey] ||
    LOOPS_SVG_MAP[normalizedKey] ||
    "";

  if (!rawSvg) return null;

  const html = injectSvgClass(rawSvg, `shrink-0 ${className}`.trim());
  if (!html) return null;

  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center shrink-0 leading-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default LoopsSvgIcon;
