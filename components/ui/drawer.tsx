import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion, PanInfo } from "framer-motion";
import clsx from "clsx";
import { Material } from "./material-1";
import {
  APPLE_SPRING_DEFAULT,
  isAppleShoppingRoute,
  projectMomentum,
} from "../../lib/shoppingRoute";
import { triggerHaptic } from "../../lib/haptics";

interface DrawerProps {
  height?: number;
  onDismiss: () => void;
  show: boolean;
  children: React.ReactNode;
  zIndexOverlay?: string;
  zIndexContent?: string;
  zIndex?: number;
}

export const Drawer: React.FC<DrawerProps> = ({
  height,
  onDismiss,
  show,
  children,
  zIndexOverlay = "z-[99999]",
  zIndexContent = "z-[999999]",
  zIndex,
}) => {
  const [mounted, setMounted] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const isAppleShop =
    typeof window !== "undefined" && isAppleShoppingRoute(window.location.pathname);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [show, onDismiss]);

  if (!mounted) return null;

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const projectedY = info.offset.y + projectMomentum(info.velocity.y, 0.994);
    if (projectedY > 110 || info.velocity.y > 420) {
      triggerHaptic("light");
      onDismiss();
    }
  };

  if (!isAppleShop) {
    return createPortal(
      <AnimatePresence>
        {show && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onDismiss}
              className={clsx("fixed inset-0 bg-black/50 backdrop-blur-sm", !zIndex ? zIndexOverlay : "")}
              style={{ zIndex: zIndex ?? undefined }}
            />
            <Material
              type="menu"
              className={clsx(
                "fixed bottom-0 left-0 w-full max-h-[85vh] overflow-y-auto hide-scrollbar bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 shadow-lg rounded-t-[20px] rounded-b-none",
                !zIndex ? zIndexContent : ""
              )}
              style={{
                height,
                zIndex: zIndex ? zIndex + 1 : undefined,
              }}
            >
              <div>{children}</div>
            </Material>
          </>
        )}
      </AnimatePresence>,
      document.body
    );
  }

  return createPortal(
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.14 : 0.22 }}
            onClick={() => {
              triggerHaptic("light");
              onDismiss();
            }}
            className={clsx(
              "ds-apple-portal ds-apple-backdrop fixed inset-0",
              !zIndex ? zIndexOverlay : ""
            )}
            style={{ zIndex: zIndex ?? undefined }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={prefersReducedMotion ? { opacity: 0 } : { y: "100%", opacity: 0.96 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { y: "100%", opacity: 0.96 }}
            transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_DEFAULT}
            drag={prefersReducedMotion ? false : "y"}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.08, bottom: 0.55 }}
            onDragEnd={handleDragEnd}
            style={{
              height,
              zIndex: zIndex ? zIndex + 1 : undefined,
            }}
            className={clsx(
              "ds-apple-portal ds-apple-sheet fixed bottom-0 inset-x-0 mx-auto w-full max-w-[560px] max-h-[88dvh] overflow-y-auto hide-scrollbar rounded-t-[28px] rounded-b-none touch-pan-y",
              !zIndex ? zIndexContent : ""
            )}
          >
            <div className="sticky top-0 z-10 flex justify-center pt-3 pb-2 pointer-events-none">
              <div className="w-10 h-1.5 rounded-full bg-zinc-300/90 dark:bg-zinc-600/90" />
            </div>
            <div className="pb-[env(safe-area-inset-bottom,16px)]">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};
