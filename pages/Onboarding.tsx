import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { DEEP_SHOP_LOGO_DATA_URI } from "../lib/useFooterLogo";
import { APPLE_SPRING_DEFAULT } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

const slides = [
  {
    image: DEEP_SHOP_LOGO_DATA_URI,
    title: "Let's find the Best & Latest Mobiles",
    desc: "Discover premium quality border cross phones and mobile accessories tailored to your tech lifestyle.",
  },
  {
    image: DEEP_SHOP_LOGO_DATA_URI,
    title: "Experience Seamless Delivery Monitoring",
    desc: "Track your orders in real-time and get updates instantly right at your doorstep.",
  },
  {
    image: DEEP_SHOP_LOGO_DATA_URI,
    title: "Explore Our Vast Mobile Products We Offer",
    desc: "Browse a huge variety of products from top brands and find the best deals every day.",
  },
  {
    image: DEEP_SHOP_LOGO_DATA_URI,
    title: "Build Your Exclusive Favorites List",
    desc: "Save the phones you love and create a personalized wishlist for easy shopping later.",
  },
];

const Onboarding: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const handleFinish = () => {
    triggerHaptic("medium");
    localStorage.setItem("vibe_onboarded", "true");
    onFinish();
    navigate("/auth-selector");
  };

  const next = () => {
    if (current === slides.length - 1) {
      handleFinish();
    } else {
      triggerHaptic("selection");
      setCurrent(current + 1);
    }
  };

  return (
    <div className="ds-apple-shop-canvas min-h-[100dvh] flex flex-col justify-between p-6 sm:p-8">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-between">
        <div className="flex justify-end pt-1 pb-4">
          <button
            type="button"
            onClick={handleFinish}
            className="ds-apple-muted px-3 py-2 text-[14px] font-semibold hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors cursor-pointer"
          >
            Skip
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -8 }}
              transition={prefersReducedMotion ? { duration: 0.16 } : APPLE_SPRING_DEFAULT}
              className="w-full flex flex-col items-center"
            >
              <div className="ds-apple-surface w-full max-w-[270px] sm:max-w-[300px] aspect-[4/5] rounded-[32px] mb-8 overflow-hidden flex-shrink-0 flex items-center justify-center p-6">
                <img
                  src={slides[current].image}
                  className="w-[78%] h-[78%] object-contain"
                  alt=""
                />
              </div>
              <h1 className="ds-apple-display text-[24px] sm:text-[26px] font-semibold text-center mb-3 tracking-[-0.025em] leading-[1.15] text-[#1D1D1F] dark:text-[#F5F5F7] px-2">
                {slides[current].title}
              </h1>
              <p className="ds-apple-muted text-[15px] text-center leading-relaxed mb-8 px-4 font-normal">
                {slides[current].desc}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center gap-2 mb-8">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => {
                  triggerHaptic("selection");
                  setCurrent(i);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  i === current
                    ? "w-8 bg-[#0071E3] dark:bg-[#0A84FF]"
                    : "w-2 bg-black/[0.15] dark:bg-white/[0.2]"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4 w-full pb-2 relative z-10">
          <button
            type="button"
            onClick={next}
            className="ds-apple-btn-primary w-full min-h-[52px] px-5 rounded-full text-[16px] font-semibold whitespace-nowrap active:scale-[0.98] transition-transform cursor-pointer flex items-center justify-center"
          >
            {current === slides.length - 1 ? "Start Shopping" : "Continue"}
          </button>

          {current === 0 && (
            <p className="text-center text-[14px] font-medium ds-apple-muted pt-1">
              Already a member?{" "}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("selection");
                  navigate("/auth-selector");
                }}
                className="text-[#0071E3] dark:text-[#0A84FF] font-semibold hover:underline underline-offset-4 cursor-pointer"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
