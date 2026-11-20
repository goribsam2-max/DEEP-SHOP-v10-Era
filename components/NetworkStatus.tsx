import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { showIsland } from "./ui/dynamic-island";
import { useIllustrations } from "../lib/useIllustrations";
import { APPLE_SPRING_DEFAULT, isAppleShoppingRoute } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

export const NetworkStatus: React.FC = () => {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const [showRestoredBanner, setShowRestoredBanner] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const isAppleShop =
    typeof window !== "undefined" && isAppleShoppingRoute(window.location.pathname);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setShowRestoredBanner(false);
    };
    const handleOnline = () => {
      setIsOffline(false);
      setShowRestoredBanner(true);
      const t = setTimeout(() => {
        setShowRestoredBanner(false);
      }, 2800);
      showIsland({
        state: "success",
        title: "Network Restored",
        subtitle: "Your connection is back online.",
      });
      return () => clearTimeout(t);
    };

    const handleForceOfflinePop = () => {
      setIsOffline(true);
      triggerHaptic("warning");
      showIsland({
        state: "error",
        title: "Offline Mode",
        subtitle: "Cached products & cart remain available.",
      });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    window.addEventListener("showNetworkError", handleForceOfflinePop);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("showNetworkError", handleForceOfflinePop);
    };
  }, []);

  if (!isOffline && !showRestoredBanner) return null;

  return (
    <AnimatePresence>
      {showRestoredBanner && !isOffline && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.96 }}
          transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_DEFAULT}
          className="fixed top-[max(12px,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[9500] pointer-events-none px-3 w-max max-w-[92vw]"
        >
          <div
            className={
              isAppleShop
                ? "flex items-center gap-2 rounded-full bg-[#1C1C1E]/92 dark:bg-[#2C2C2E]/95 backdrop-blur-xl border border-white/15 px-3.5 py-1.5 text-[11.5px] font-semibold text-white shadow-lg"
                : "flex items-center gap-2 rounded-full bg-emerald-600/95 backdrop-blur-md px-3.5 py-1.5 text-[11.5px] font-semibold text-white shadow-lg"
            }
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#30D158] shrink-0" />
            <span>Back Online · Live catalog synced</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

