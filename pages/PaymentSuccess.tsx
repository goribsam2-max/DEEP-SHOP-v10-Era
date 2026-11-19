import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { APPLE_SPRING_DEFAULT } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#000000] text-[#1D1D1F] dark:text-[#F5F5F7] flex flex-col p-6 items-center justify-center text-center transition-colors">
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0.15 } : APPLE_SPRING_DEFAULT}
        className="w-full max-w-md bg-white dark:bg-[#1C1C1E] rounded-[28px] border border-black/[0.06] dark:border-white/[0.1] p-8 sm:p-10 shadow-sm flex flex-col items-center"
      >
        <div className="w-20 h-20 bg-[#248A3D]/12 dark:bg-[#30D158]/15 rounded-full flex items-center justify-center mb-6 text-[#248A3D] dark:text-[#30D158]">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold mb-2 tracking-tight">Order Confirmed</h1>
        <p className="text-[#6E6E73] dark:text-[#8E8E93] text-sm mb-8 max-w-xs leading-relaxed">
          Your essentials are being prepared for delivery.
        </p>

        <div className="w-full space-y-3">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              navigate("/orders");
            }}
            className="w-full h-12 bg-[#0071E3] dark:bg-[#0A84FF] text-white rounded-full font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            Track Logistics
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              navigate(`/e-receipt/${orderId}`);
            }}
            className="w-full h-12 bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] rounded-full font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            View Digital Receipt
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;
