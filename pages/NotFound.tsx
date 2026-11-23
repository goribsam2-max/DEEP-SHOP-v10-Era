import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import Logo from "../components/Logo";
import SEO from "../components/SEO";
import { useIllustrations } from "../lib/useIllustrations";
import { APPLE_SPRING_DEFAULT } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const illustrations = useIllustrations();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="ds-apple-shop-canvas min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <SEO
        title="Page Not Found (404)"
        description="The page you are looking for does not exist or has been removed."
        noindex={true}
      />
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={shouldReduceMotion ? { duration: 0.2 } : APPLE_SPRING_DEFAULT}
        className="ds-apple-surface max-w-md w-full p-8 sm:p-10 rounded-[28px]"
      >
        <div className="flex justify-center mb-8">
          <Logo scale={1.15} centerOrigin />
        </div>

        {illustrations.notFound ? (
          <div className="w-44 h-44 mx-auto mb-6 rounded-[20px] overflow-hidden">
            <img
              src={illustrations.notFound}
              alt="Page not found"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-16 h-16 mx-auto bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-full flex items-center justify-center mb-6">
            <Search className="w-7 h-7 text-[#6E6E73] dark:text-[#98989D]" />
          </div>
        )}

        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
          Page Not Found
        </h1>

        <p className="text-[14px] text-[#6E6E73] dark:text-[#98989D] mb-8 leading-relaxed">
          The page you are looking for might have been removed, renamed, or is temporarily unavailable.
        </p>

        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            navigate("/");
          }}
          className="ds-apple-btn-primary w-full py-3.5 px-5 rounded-full text-[15px] font-semibold whitespace-nowrap active:scale-[0.98] transition-transform"
        >
          Back to Home
        </button>
      </motion.div>
    </div>
  );
};

export default NotFound;

