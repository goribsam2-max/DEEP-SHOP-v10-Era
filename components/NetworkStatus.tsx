import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { showIsland } from "./ui/dynamic-island";
import { useIllustrations } from "../lib/useIllustrations";
import { APPLE_SPRING_DEFAULT, isAppleShoppingRoute } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

export const NetworkStatus: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const illustrations = useIllustrations();
  const prefersReducedMotion = useReducedMotion();
  const isAppleShop =
    typeof window !== "undefined" && isAppleShoppingRoute(window.location.pathname);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setIsDismissed(false);
      setShowRestored(false);
    };
    const handleOnline = () => {
      setIsOffline(false);
      setShowRestored(true);
      setTimeout(() => {
        setShowRestored(false);
      }, 3000);
      showIsland({
        state: "success",
        title: "Network Restored",
        subtitle: "Your connection is back online.",
      });
    };

    const handleForceOfflinePop = () => {
      setIsOffline(true);
      setIsDismissed(false);
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

  const handleRefresh = () => {
    triggerHaptic("light");
    setIsRefreshing(true);
    setTimeout(() => {
      if (navigator.onLine) {
        triggerHaptic("success");
        setIsOffline(false);
        setShowRestored(true);
        setTimeout(() => {
          setShowRestored(false);
        }, 3000);
        showIsland({
          state: "success",
          title: "Network Restored",
          subtitle: "Your connection is back online.",
        });
      } else {
        setIsRefreshing(false);
      }
    }, 800);
  };

  return (
    <AnimatePresence>
      {((isOffline && !isDismissed) || showRestored) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.14 : 0.18 }}
          className={
            isAppleShop
              ? "ds-apple-portal ds-apple-backdrop fixed inset-0 z-[100000] flex items-center justify-center p-4"
              : "fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          }
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 10 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_DEFAULT}
            className={
              isAppleShop
                ? "ds-apple-portal ds-apple-modal rounded-[26px] w-full max-w-[324px] overflow-hidden flex flex-col items-center"
                : "bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-[320px] overflow-hidden shadow-2xl flex flex-col items-center border border-transparent dark:border-zinc-800"
            }
          >
            <div className="w-full flex items-center justify-center pt-8 pb-4">
              {isOffline ? (
                <div className="w-28 h-28 relative">
                  {illustrations.offline ? (
                    <img
                      src={illustrations.offline}
                      alt="Network Offline"
                      className="w-full h-full object-cover rounded-[20px]"
                    />
                  ) : (
                    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                      <path className="fill-[#1D1D1F] dark:fill-[#F5F5F7]" d="M100 150C105.523 150 110 145.523 110 140C110 134.477 105.523 130 100 130C94.4772 130 90 134.477 90 140C90 145.523 94.4772 150 100 150Z" />
                      <path className="stroke-[#1D1D1F] dark:stroke-[#F5F5F7]" d="M50 90C77.6142 62.3858 122.386 62.3858 150 90" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
                      <path className="stroke-[#1D1D1F] dark:stroke-[#F5F5F7]" d="M70 110C86.5685 93.4315 113.431 93.4315 130 110" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
                      <path className="stroke-[#1D1D1F] dark:stroke-[#F5F5F7]" d="M30 30L170 170" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
                      <path className="stroke-zinc-200 dark:stroke-zinc-700" d="M124.966 64.9659C132.748 72.7479 138.583 82.2612 142.179 92.6841" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              ) : (
                <div className="w-28 h-28 relative">
                  <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <path d="M100 150C105.523 150 110 145.523 110 140C110 134.477 105.523 130 100 130C94.4772 130 90 134.477 90 140C90 145.523 94.4772 150 100 150Z" fill="#30D158" />
                    <path d="M50 90C77.6142 62.3858 122.386 62.3858 150 90" stroke="#30D158" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M70 110C86.5685 93.4315 113.431 93.4315 130 110" stroke="#30D158" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M30 70C68.6599 31.3401 131.34 31.3401 170 70" stroke="#30D158" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
            <div className="px-6 pb-2 text-center w-full">
              <h3 className="text-[19px] font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1.5 tracking-[-0.02em]">
                {isOffline ? "No Internet Connection" : "Connection Restored"}
              </h3>
              <p className="text-[#6E6E73] dark:text-[#A1A1A6] text-[14px] mb-5 leading-[1.45]">
                {isOffline
                  ? "You can surf offline but some features require internet data."
                  : "You are back online. Enjoy surfing!"}
              </p>

              {isOffline ? (
                <div className="flex w-full border-t border-black/[0.08] dark:border-white/[0.1]">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setIsDismissed(true);
                    }}
                    className="flex-1 py-3.5 text-[#6E6E73] dark:text-[#A1A1A6] text-[15px] font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.05] active:opacity-70 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <div className="w-[1px] bg-black/[0.08] dark:bg-white/[0.1]" />
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex-1 py-3.5 text-[#0071E3] dark:text-[#0A84FF] text-[15px] font-semibold hover:bg-black/[0.04] dark:hover:bg-white/[0.05] active:opacity-70 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isRefreshing ? <RefreshCw size={16} className="animate-spin" /> : "Retry"}
                  </button>
                </div>
              ) : (
                <div className="flex w-full border-t border-black/[0.08] dark:border-white/[0.1]">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setShowRestored(false);
                    }}
                    className="w-full py-3.5 text-[#0071E3] dark:text-[#0A84FF] text-[15px] font-semibold hover:bg-black/[0.04] dark:hover:bg-white/[0.05] active:opacity-70 transition cursor-pointer"
                  >
                    OK
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

