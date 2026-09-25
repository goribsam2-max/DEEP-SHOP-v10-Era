import React, { useState } from "react";
import { Product } from "../../types";
import { formatPrice } from "../../lib/utils";
import { Zap, Smartphone, Sparkles, ShieldCheck, Lock, Info, ArrowRight } from "lucide-react";
import { PixelImage } from "./PixelImage";

interface BorderOfferCardProps {
  product: Product;
  onBuyNow: (product: Product) => void;
}

export const BorderOfferCard: React.FC<BorderOfferCardProps> = ({ product, onBuyNow }) => {
  const [showDetails, setShowDetails] = useState(false);
  const isSold = Boolean(product.isSold || product.stock === 0);
  const displayPrice = product.offerPrice && product.offerPrice < product.price ? product.offerPrice : product.price;
  const originalPrice = product.offerPrice && product.offerPrice < product.price ? product.price : null;
  const discountAmount = originalPrice ? originalPrice - displayPrice : 0;

  return (
    <div className="relative bg-white/75 dark:bg-zinc-900/80 backdrop-blur-2xl border border-white/60 dark:border-zinc-700/60 rounded-3xl p-4 text-zinc-900 dark:text-zinc-100 shadow-[0_10px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all duration-300 group flex flex-col justify-between h-full overflow-hidden">
      
      {/* Liquid Ambient Glow Accent */}
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-orange-500/15 rounded-full blur-2xl pointer-events-none" />

      <div>
        {/* Top Header Row with Badges */}
        <div className="flex items-center justify-between gap-1.5 mb-2.5 z-10 relative">
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-[10px] px-3 py-1 rounded-full shadow-xs tracking-wider uppercase">
            <Zap className="w-3 h-3 fill-white stroke-none" />
            <span>BORDER OFFER</span>
          </div>

          <div className="flex items-center gap-1 bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[9px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-md">
            <Lock className="w-2.5 h-2.5 text-amber-500" />
            <span>100% FULL ADVANCE</span>
          </div>
        </div>

        {/* Product Image Area with Rubber Stamp Seal */}
        <div className="relative w-full h-44 sm:h-48 rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/60 border border-white/50 dark:border-zinc-700/50 overflow-hidden flex items-center justify-center p-3 mb-3 z-10">
          <PixelImage
            src={product.image}
            alt={product.name}
            className="w-full h-full"
            imgClassName={`w-full h-full object-contain transition-transform duration-500 ${isSold ? "opacity-30 grayscale" : "group-hover:scale-105"}`}
          />

          {/* Rubber Stamp "SOLD OUT" Seal when marked as sold */}
          {isSold && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-2 z-20">
              <div className="rotate-[-12deg] border-4 border-rose-500 text-rose-500 font-black px-4 py-2 rounded-2xl uppercase tracking-widest text-center shadow-2xl bg-black/85 border-dashed">
                <span className="text-xl sm:text-2xl block leading-none font-extrabold">
                  SOLD OUT
                </span>
                <span className="text-[10px] font-bold text-rose-400 block mt-1 tracking-normal">
                  সোল্ড আউট হয়ে গেছে
                </span>
              </div>
            </div>
          )}

          {/* Savings Badge */}
          {!isSold && discountAmount > 0 && (
            <div className="absolute top-2.5 left-2.5 bg-rose-600 text-white font-black text-[10px] px-2.5 py-0.5 rounded-lg shadow-sm">
              Save {formatPrice(discountAmount)}
            </div>
          )}
        </div>

        {/* Product Name, Brand & Description details option */}
        <div className="mb-2 z-10 relative">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              {product.brand || "Border Stock Phone"}
            </span>
            {product.description && (
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="text-[10px] text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 font-bold flex items-center gap-0.5 cursor-pointer"
              >
                <Info className="w-3 h-3" />
                <span>{showDetails ? "Hide Details" : "Details"}</span>
              </button>
            )}
          </div>

          <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-1">
            {product.name}
          </h3>

          {/* Expandable Description Details */}
          {showDetails && product.description && (
            <p className="text-[11px] text-zinc-600 dark:text-zinc-300 bg-white/80 dark:bg-zinc-800/80 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 leading-relaxed my-2 max-h-20 overflow-y-auto no-scrollbar animate-in fade-in duration-200">
              {product.description}
            </p>
          )}
        </div>

        {/* Phone Specs Chips with Lucide SVG Icons (No Emojis) */}
        <div className="flex flex-wrap gap-1.5 mb-3 z-10 relative">
          {product.storage && (
            <span className="inline-flex items-center gap-1 bg-zinc-200/70 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300 text-[10px] font-semibold px-2 py-0.5 rounded-lg border border-zinc-300/50 dark:border-zinc-700/50">
              <Smartphone className="w-3 h-3 text-amber-500" />
              <span>{product.storage}</span>
            </span>
          )}
          {product.condition && (
            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded-lg border border-amber-500/20">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>{product.condition}</span>
            </span>
          )}
          {product.batteryHealth && (
            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded-lg border border-emerald-500/20">
              <Zap className="w-3 h-3 text-emerald-500" />
              <span>{product.batteryHealth}</span>
            </span>
          )}
          {product.warranty && (
            <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[10px] font-semibold px-2 py-0.5 rounded-lg border border-blue-500/20">
              <ShieldCheck className="w-3 h-3 text-blue-500" />
              <span>{product.warranty}</span>
            </span>
          )}
        </div>
      </div>

      {/* Price & Action Section */}
      <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/80 z-10 relative">
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <span className="text-[10px] text-zinc-500 font-semibold block">Offer Price:</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 tracking-tight">
                {formatPrice(displayPrice)}
              </span>
              {originalPrice && (
                <span className="text-xs text-zinc-400 line-through font-semibold">
                  {formatPrice(originalPrice)}
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[9px] text-amber-700 dark:text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              ১০০% ফুল এডভান্স
            </span>
          </div>
        </div>

        {/* Dedicated Buy Now Button */}
        {isSold ? (
          <button
            type="button"
            disabled
            className="w-full py-2.5 rounded-2xl bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 font-bold text-xs border border-zinc-300/50 dark:border-zinc-700/60 cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <span>SOLD OUT (সোল্ড আউট)</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onBuyNow(product)}
            className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-105 active:scale-98 text-white font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-white stroke-none" />
            <span>অর্ডার করুন (১০০% ফুল এডভান্স)</span>
          </button>
        )}
      </div>

    </div>
  );
};
