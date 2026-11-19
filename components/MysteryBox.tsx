import { formatPrice } from "@/lib/utils";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Gift, Sparkles } from "lucide-react";
import Icon from "./Icon";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "./ui/status-badge";
import { APPLE_SPRING_DEFAULT, APPLE_SPRING_SNAPPY } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

const BoxPosition = "fixed bottom-24 md:bottom-10 left-4 md:left-10 z-[80]";

const MysteryBox: React.FC<{ products: any[] }> = ({ products }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [result, setResult] = useState<"win" | "lose" | null>(null);
  const [revealedProduct, setRevealedProduct] = useState<any>(null);
  const [discount, setDiscount] = useState(0);
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    try {
      const state = JSON.parse(localStorage.getItem("vibe_mystery_box") || "{}");
      const today = new Date().toDateString();
      const lastPlayedDate = state.lastPlayed
        ? new Date(state.lastPlayed).toDateString()
        : null;

      if (lastPlayedDate !== today) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const handleOpen = () => {
    if (products.length === 0) return;
    triggerHaptic("medium");
    setIsShaking(true);

    setTimeout(() => {
      setIsShaking(false);
      setIsOpen(true);

      const isWin = Math.random() > 0.3;
      let stateObj: any = { lastPlayed: Date.now(), result: "lose" };

      if (isWin) {
        triggerHaptic("success");
        const randomProd = products[Math.floor(Math.random() * products.length)];
        const discPct = Math.floor(Math.random() * 6) + 5;
        setRevealedProduct(randomProd);
        setDiscount(discPct);
        setResult("win");
        stateObj = {
          ...stateObj,
          result: "win",
          productId: randomProd.id,
          discountPct: discPct,
          discountPrice: Math.floor(randomProd.price * (1 - discPct / 100)),
          expiresAt: Date.now() + 60 * 60 * 1000,
          used: false,
        };
      } else {
        triggerHaptic("light");
        setResult("lose");
      }

      localStorage.setItem("vibe_mystery_box", JSON.stringify(stateObj));
    }, 1100);
  };

  const handleClose = () => {
    triggerHaptic("light");
    setIsOpen(false);
    setVisible(false);
  };

  if (products.length === 0 || !visible) return null;

  return (
    <>
      <motion.button
        type="button"
        className={`${BoxPosition} cursor-pointer group flex flex-col items-center justify-center bg-transparent border-0 p-0`}
        whileHover={prefersReducedMotion ? undefined : { scale: 1.04 }}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
        transition={APPLE_SPRING_SNAPPY}
        onClick={handleOpen}
      >
        <motion.div
          className="w-14 h-14 bg-[#0071E3] dark:bg-[#0A84FF] rounded-full shadow-[0_12px_30px_rgba(0,113,227,0.34)] flex items-center justify-center relative border-2 border-white/90 dark:border-white/25"
          animate={
            prefersReducedMotion
              ? undefined
              : { rotate: isShaking ? [0, -12, 12, -12, 12, 0] : 0 }
          }
          transition={{ duration: 0.42, repeat: isShaking ? Infinity : 0 }}
        >
          <Icon name="gift" className="text-lg text-white z-10" />
        </motion.div>
        <div className="mt-1.5 shadow-sm">
          <StatusBadge leftIcon={Gift} leftLabel="Mystery Box" />
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.14 : 0.18 }}
            className="ds-apple-portal fixed inset-0 z-[1000] ds-apple-backdrop flex items-center justify-center p-5"
            onClick={handleClose}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0.94, opacity: 0, y: 12 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0.96, opacity: 0, y: 8 }}
              transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_DEFAULT}
              onClick={(e) => e.stopPropagation()}
              className="ds-apple-portal ds-apple-modal rounded-[28px] px-6 pt-7 pb-6 max-w-[360px] w-full relative overflow-hidden text-left"
            >
              {result === "win" && revealedProduct ? (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <StatusBadge
                      leftIcon={Sparkles}
                      leftLabel="You Unlocked a Deal!"
                      status="success"
                    />
                  </div>

                  <div className="relative w-36 h-36 mx-auto mb-5 bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-[22px] p-4 border border-black/[0.06] dark:border-white/[0.08] group">
                    <img
                      src={revealedProduct.image}
                      alt={revealedProduct.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute -bottom-2.5 -right-2.5 bg-[#0071E3] dark:bg-[#0A84FF] text-white w-12 h-12 rounded-full flex flex-col items-center justify-center font-bold shadow-lg border-2 border-white dark:border-[#1C1C1E] tabular-nums">
                      <span className="text-[9px] leading-none">EXTRA</span>
                      <span className="text-xs leading-none">{discount}%</span>
                    </div>
                  </div>

                  <h3 className="text-[#1D1D1F] dark:text-[#F5F5F7] font-bold text-[19px] leading-[1.24] tracking-[-0.02em]">
                    {revealedProduct.name}
                  </h3>

                  <div className="flex items-center gap-2.5 mt-2 tabular-nums">
                    <span className="text-lg font-bold text-[#0071E3] dark:text-[#0A84FF]">
                      {formatPrice(
                        Math.floor(revealedProduct.price * (1 - discount / 100))
                      )}
                    </span>
                    <span className="text-xs font-semibold text-[#86868B] line-through">
                      {formatPrice(revealedProduct.price)}
                    </span>
                  </div>
                  <p className="text-[#6E6E73] dark:text-[#A1A1A6] text-[14px] mt-1.5">
                    Special deal reserved for the next 1 hour.
                  </p>

                  <div className="mt-6 flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        navigate(`/product/${revealedProduct.id}`);
                      }}
                      className="ds-apple-btn-primary w-full min-h-[48px] px-5 rounded-full font-semibold text-[15px] tracking-[-0.01em] active:scale-[0.97] transition-transform cursor-pointer"
                    >
                      Claim offer now
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="ds-apple-btn-secondary w-full min-h-[46px] px-5 rounded-full font-semibold text-[15px] tracking-[-0.01em] active:scale-[0.97] transition-transform cursor-pointer"
                    >
                      Maybe later
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <h3 className="text-[#1D1D1F] dark:text-[#F5F5F7] font-bold text-[20px] leading-[1.24] tracking-[-0.02em]">
                    Better luck next time
                  </h3>
                  <p className="text-[#6E6E73] dark:text-[#A1A1A6] text-[15px] leading-[1.45] mt-2">
                    You didn&apos;t unlock an instant deal today. Check back tomorrow for another spin!
                  </p>
                  <div className="mt-6 flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="ds-apple-btn-primary w-full min-h-[48px] px-5 rounded-full font-semibold text-[15px] tracking-[-0.01em] active:scale-[0.97] transition-transform cursor-pointer"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MysteryBox;
