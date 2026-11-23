import React, { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Product } from "../../types";
import { formatPrice } from "../../lib/utils";
import { Zap, Smartphone, Sparkles, ShieldCheck, Lock, Info } from "lucide-react";
import { PixelImage } from "./PixelImage";
import { triggerHaptic } from "../../lib/haptics";
import { APPLE_SPRING_SNAPPY } from "../../lib/shoppingRoute";

interface BorderOfferCardProps {
  product: Product;
  onBuyNow: (product: Product) => void;
}

export const BorderOfferCard: React.FC<BorderOfferCardProps> = ({ product, onBuyNow }) => {
  const [showDetails, setShowDetails] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const isSold = Boolean(product.isSold || product.stock === 0);
  const displayPrice = product.offerPrice && product.offerPrice < product.price ? product.offerPrice : product.price;
  const originalPrice = product.offerPrice && product.offerPrice < product.price ? product.price : null;
  const discountAmount = originalPrice ? originalPrice - displayPrice : 0;

  return (
    <div className="ds-apple-surface relative rounded-[24px] p-4 transition-transform duration-200 group flex flex-col justify-between h-full overflow-hidden">
      <div>
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="inline-flex items-center gap-1 bg-[#FF9500]/12 dark:bg-[#FF9F0A]/18 text-[#C96B00] dark:text-[#FF9F0A] font-semibold text-[10px] px-2.5 py-1 rounded-full tracking-wide uppercase whitespace-nowrap">
            <Zap className="w-3 h-3 fill-current" />
            <span>Border Offer</span>
          </div>

          <div className="inline-flex items-center gap-1 bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#6E6E73] dark:text-[#98989D] text-[10px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap">
            <Lock className="w-2.5 h-2.5" />
            <span>100% Advance</span>
          </div>
        </div>

        {/* Product Image Area */}
        <div className="relative w-full h-44 sm:h-48 rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.05] dark:border-white/[0.08] overflow-hidden flex items-center justify-center mb-3">
          <PixelImage
            src={product.image}
            alt={product.name}
            className="w-full h-full"
            imgClassName={`w-full h-full object-cover transition-transform duration-500 ${isSold ? "opacity-30 grayscale" : "group-hover:scale-[1.03]"}`}
          />

          {isSold && (
            <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] flex items-center justify-center p-2 z-20">
              <div className="bg-black/80 border border-white/20 text-white font-semibold px-4 py-2 rounded-2xl text-center">
                <span className="text-base sm:text-lg block leading-none tracking-tight">
                  SOLD OUT
                </span>
                <span className="text-[11px] font-medium text-white/75 block mt-1">
                  This offer has sold out
                </span>
              </div>
            </div>
          )}

          {!isSold && discountAmount > 0 && (
            <div className="absolute top-2.5 left-2.5 bg-[#FF3B30] dark:bg-[#FF453A] text-white font-semibold text-[10px] px-2.5 py-0.5 rounded-lg tabular-nums whitespace-nowrap">
              Save {formatPrice(discountAmount)}
            </div>
          )}
        </div>

        {/* Product Name, Brand & Description */}
        <div className="mb-2">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="text-[10.5px] font-semibold text-[#0071E3] dark:text-[#0A84FF] uppercase tracking-wider truncate">
              {product.brand || "Border Stock Phone"}
            </span>
            {product.description && (
              <button
                type="button"
                onPointerDown={() => triggerHaptic("light")}
                onClick={() => setShowDetails(!showDetails)}
                className="text-[11px] text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-white font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Info className="w-3 h-3" />
                <span>{showDetails ? "Hide" : "Details"}</span>
              </button>
            )}
          </div>

          <h3 className="font-semibold text-[15px] text-[#1D1D1F] dark:text-[#F5F5F7] leading-snug line-clamp-1 tracking-tight">
            {product.name}
          </h3>

          <AnimatePresence initial={false}>
            {showDetails && product.description && (
              <motion.p
                initial={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                transition={prefersReducedMotion ? { duration: 0.12 } : APPLE_SPRING_SNAPPY}
                className="text-[11.5px] text-[#6E6E73] dark:text-[#98989D] bg-[#F2F2F7] dark:bg-[#2C2C2E] p-2.5 rounded-xl border border-black/[0.05] dark:border-white/[0.08] leading-relaxed my-2 max-h-20 overflow-y-auto no-scrollbar"
              >
                {product.description}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Phone Specs Chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {product.storage && (
            <span className="inline-flex items-center gap-1 bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] text-[10.5px] font-medium px-2 py-0.5 rounded-lg">
              <Smartphone className="w-3 h-3 text-[#6E6E73]" />
              <span>{product.storage}</span>
            </span>
          )}
          {product.condition && (
            <span className="inline-flex items-center gap-1 bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] text-[10.5px] font-medium px-2 py-0.5 rounded-lg">
              <Sparkles className="w-3 h-3 text-[#FF9500]" />
              <span>{product.condition}</span>
            </span>
          )}
          {product.batteryHealth && (
            <span className="inline-flex items-center gap-1 bg-[#248A3D]/10 dark:bg-[#30D158]/15 text-[#248A3D] dark:text-[#30D158] text-[10.5px] font-medium px-2 py-0.5 rounded-lg">
              <Zap className="w-3 h-3" />
              <span>{product.batteryHealth}</span>
            </span>
          )}
          {product.warranty && (
            <span className="inline-flex items-center gap-1 bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] text-[10.5px] font-medium px-2 py-0.5 rounded-lg">
              <ShieldCheck className="w-3 h-3" />
              <span>{product.warranty}</span>
            </span>
          )}
        </div>
      </div>

      {/* Price & Action Section */}
      <div className="pt-2.5 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="flex items-baseline justify-between mb-2.5">
          <div className="min-w-0">
            <span className="text-[10.5px] text-[#6E6E73] dark:text-[#98989D] font-medium block">
              Offer Price
            </span>
            <div className="flex items-baseline gap-1.5 tabular-nums">
              <span className="text-base sm:text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight whitespace-nowrap">
                {formatPrice(displayPrice)}
              </span>
              {originalPrice && (
                <span className="text-xs text-[#86868B] line-through font-medium whitespace-nowrap">
                  {formatPrice(originalPrice)}
                </span>
              )}
            </div>
          </div>

          <span className="text-[10px] text-[#6E6E73] dark:text-[#98989D] font-semibold bg-[#F2F2F7] dark:bg-[#2C2C2E] px-2 py-0.5 rounded-md whitespace-nowrap">
            100% Advance
          </span>
        </div>

        {isSold ? (
          <button
            type="button"
            disabled
            className="ds-apple-btn-secondary w-full h-10 rounded-full font-semibold text-xs opacity-50 cursor-not-allowed flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <span>SOLD OUT</span>
          </button>
        ) : (
          <button
            type="button"
            onPointerDown={() => triggerHaptic("light")}
            onClick={() => onBuyNow(product)}
            className="ds-apple-btn-primary w-full h-10 px-4 rounded-full font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Order Now (100% Advance)</span>
          </button>
        )}
      </div>
    </div>
  );
};
