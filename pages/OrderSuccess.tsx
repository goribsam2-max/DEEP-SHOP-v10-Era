import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, Clock } from "lucide-react";
import { APPLE_SPRING_DEFAULT, APPLE_SPRING_SNAPPY } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

const OrderSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [showStatus, setShowStatus] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    triggerHaptic("success");
    const timer = setTimeout(() => {
      setShowStatus(true);
    }, prefersReducedMotion ? 150 : 650);
    return () => clearTimeout(timer);
  }, [prefersReducedMotion]);

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black flex flex-col items-center justify-center px-6 sm:px-10 text-center relative overflow-hidden">
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={prefersReducedMotion ? { duration: 0.2 } : APPLE_SPRING_DEFAULT}
        className="relative z-10 w-full max-w-sm bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] rounded-[28px] p-8 shadow-sm flex flex-col items-center"
      >
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0.72, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={prefersReducedMotion ? { duration: 0.2 } : APPLE_SPRING_DEFAULT}
          className="relative mb-6 w-20 h-20 rounded-full bg-[#248A3D]/12 dark:bg-[#30D158]/16 border border-[#248A3D]/20 dark:border-[#30D158]/25 flex items-center justify-center text-[#248A3D] dark:text-[#30D158]"
        >
          <Check className="w-9 h-9" strokeWidth={2.5} />
        </motion.div>

        <h1 className="text-[24px] font-bold tracking-[-0.022em] text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
          Order Placed!
        </h1>

        {orderId && (
          <p className="text-[12px] font-mono tabular-nums text-[#6E6E73] dark:text-[#98989D] mb-5">
            #{orderId.slice(0, 10).toUpperCase()}
          </p>
        )}

        <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.05] dark:border-white/[0.06] rounded-[18px] p-4 w-full mb-7">
          <div className="flex items-center gap-3 text-left">
            <div className="w-8 h-8 rounded-full bg-[#248A3D]/12 dark:bg-[#30D158]/16 text-[#248A3D] dark:text-[#30D158] flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-[13px] font-medium leading-snug text-[#1D1D1F] dark:text-[#F5F5F7]">
              Your order has been received and is currently under review by our team.
            </p>
          </div>
        </div>

        <AnimatePresence>
          {showStatus && (
            <motion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={prefersReducedMotion ? { duration: 0.2 } : APPLE_SPRING_SNAPPY}
              className="space-y-3 w-full"
            >
              {orderId && (
                <Link
                  to={`/e-receipt/${orderId}`}
                  onClick={() => triggerHaptic("selection")}
                  className="block w-full py-3.5 bg-[#0071E3] dark:bg-[#0A84FF] text-white rounded-full font-semibold text-[14px] tracking-tight hover:opacity-95 transition-transform active:scale-[0.97]"
                >
                  View Digital Receipt
                </Link>
              )}
              <Link
                to="/"
                onClick={() => triggerHaptic("selection")}
                className="block w-full py-3.5 border border-black/[0.08] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] rounded-full font-semibold text-[14px] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-transform active:scale-[0.97]"
              >
                Continue Exploring
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default OrderSuccess;
