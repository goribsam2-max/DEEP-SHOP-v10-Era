import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { triggerHaptic } from "../lib/haptics";
import { shouldIgnoreSwipeTarget } from "../lib/useSwipeNavigation";

const EDGE_START_MAX_X = 26;
const TRIGGER_DISTANCE = 68;
const MAX_VISUAL_DISTANCE = 104;

const EXCLUDED_EXACT = new Set(["/", "/onboarding"]);

const EXCLUDED_PREFIXES = [
  "/messages",
  "/create-reel",
  "/loops/create-reel",
  "/loops/create-story",
  "/news-hub/create-story",
  "/add-story",
  "/seller/add-story",
  "/loops/story",
  "/news-hub/story",
  "/loops/photo",
  "/news-hub/photo",
];

export const GlobalEdgeSwipeBack: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [pullX, setPullX] = useState(0);
  const [touchY, setTouchY] = useState<number>(320);

  const sessionRef = useRef<{
    startX: number;
    startY: number;
    lastX: number;
    startedAt: number;
    locked: "x" | "y" | null;
    crossedThreshold: boolean;
  } | null>(null);

  const isExcludedRoute = (() => {
    const p = location.pathname;
    if (EXCLUDED_EXACT.has(p)) return true;
    if (EXCLUDED_PREFIXES.some((prefix) => p.startsWith(prefix))) return true;
    if (p.startsWith("/loops") || p.startsWith("/news-hub")) {
      const sp = new URLSearchParams(location.search);
      const filter = (sp.get("filter") || "").toLowerCase();
      const tab = (sp.get("tab") || "").toLowerCase();
      if (filter === "video" || filter === "reels" || tab === "reels") {
        return true;
      }
    }
    return false;
  })();

  useEffect(() => {
    setPullX(0);
    sessionRef.current = null;
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (isExcludedRoute || typeof window === "undefined") return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        sessionRef.current = null;
        return;
      }
      const t = e.touches[0];
      if (t.clientX > EDGE_START_MAX_X) return;
      if (shouldIgnoreSwipeTarget(e.target, document.body, true)) return;

      sessionRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        lastX: t.clientX,
        startedAt: Date.now(),
        locked: null,
        crossedThreshold: false,
      };
      setTouchY(Math.max(120, Math.min(window.innerHeight - 120, t.clientY)));
    };

    const handleTouchMove = (e: TouchEvent) => {
      const s = sessionRef.current;
      if (!s) return;
      if (e.touches.length !== 1) {
        sessionRef.current = null;
        setPullX(0);
        return;
      }

      const t = e.touches[0];
      const dx = t.clientX - s.startX;
      const dy = t.clientY - s.startY;
      s.lastX = t.clientX;

      if (!s.locked) {
        if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx) * 1.1) {
          s.locked = "y";
          sessionRef.current = null;
          setPullX(0);
          return;
        }
        if (dx > 12 && dx > Math.abs(dy) * 1.2) {
          s.locked = "x";
        } else {
          return;
        }
      }

      if (s.locked === "x") {
        const clamped = Math.max(0, Math.min(MAX_VISUAL_DISTANCE, dx));
        setPullX(clamped);
        if (!s.crossedThreshold && clamped >= TRIGGER_DISTANCE) {
          s.crossedThreshold = true;
          triggerHaptic("selection");
        } else if (s.crossedThreshold && clamped < TRIGGER_DISTANCE - 8) {
          s.crossedThreshold = false;
        }
      }
    };

    const handleTouchEnd = () => {
      const s = sessionRef.current;
      sessionRef.current = null;
      if (!s || s.locked !== "x") {
        setPullX(0);
        return;
      }

      const dx = s.lastX - s.startX;
      const elapsed = Math.max(1, Date.now() - s.startedAt);
      const velocity = dx / elapsed;
      const shouldGoBack =
        dx >= TRIGGER_DISTANCE || (dx >= 44 && velocity > 0.45 && elapsed < 450);

      setPullX(0);
      if (shouldGoBack) {
        triggerHaptic("light");
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate("/");
        }
      }
    };

    const handleTouchCancel = () => {
      sessionRef.current = null;
      setPullX(0);
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchCancel, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [isExcludedRoute, navigate]);

  if (isExcludedRoute || pullX <= 4) return null;

  const progress = Math.min(1, pullX / TRIGGER_DISTANCE);
  const ready = pullX >= TRIGGER_DISTANCE;
  const translateX = Math.min(26, pullX * 0.28) - 8;

  return (
    <div
      aria-hidden="true"
      className="fixed left-0 z-[9998] pointer-events-none select-none"
      style={{
        top: touchY,
        transform: `translate3d(${translateX}px, -50%, 0) scale(${0.78 + progress * 0.24})`,
        opacity: Math.min(1, 0.25 + progress * 0.75),
      }}
    >
      <div
        className={`w-10 h-14 rounded-r-full backdrop-blur-2xl border border-l-0 shadow-[0_8px_24px_rgba(0,0,0,0.18)] flex items-center justify-center transition-colors duration-150 ${
          ready
            ? "bg-[#0071E3] text-white border-[#0071E3]/60"
            : "bg-white/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-white border-black/10 dark:border-white/15"
        }`}
      >
        <ChevronLeft className="w-5 h-5 stroke-[2.6]" />
      </div>
    </div>
  );
};
