"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Smartphone, Sparkles, ShieldCheck, Lock, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Product } from "../../types";
import { formatPrice } from "../../lib/utils";

interface Card {
  id: string | number;
  product: Product;
}

const positionStyles = [
  { scale: 1, y: 12 },
  { scale: 0.95, y: -16 },
  { scale: 0.9, y: -44 },
];

const exitAnimation = {
  y: 340,
  scale: 1,
  zIndex: 10,
};

const enterAnimation = {
  y: -16,
  scale: 0.9,
};

function CardContent({
  product,
  onBuyNow,
}: {
  product: Product;
  onBuyNow: (p: Product) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const isSold = Boolean(product.isSold || product.stock === 0);
  const displayPrice = product.offerPrice && product.offerPrice < product.price ? product.offerPrice : product.price;
  const originalPrice = product.offerPrice && product.offerPrice < product.price ? product.price : null;
  const advanceAmount = (product.borderOfferAdvanceAmount !== undefined && product.borderOfferAdvanceAmount !== null && Number(product.borderOfferAdvanceAmount) > 0)
    ? Number(product.borderOfferAdvanceAmount)
    : ((product.advanceAmount !== undefined && product.advanceAmount !== null && Number(product.advanceAmount) > 0)
        ? Number(product.advanceAmount)
        : displayPrice);

  const isFullAdvance = advanceAmount >= displayPrice;

  return (
    <div className="flex h-full w-full flex-col justify-between gap-2.5 p-3.5 sm:p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-t-xl overflow-hidden relative text-zinc-900 dark:text-zinc-100">
      
      {/* Liquid Glass Ambient Gradient */}
      <div className="absolute -top-10 -right-10 w-36 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Image Area with Exact Outline Specification */}
      <div className="-outline-offset-1 flex h-[170px] sm:h-[185px] w-full items-center justify-center overflow-hidden rounded-xl outline outline-black/10 dark:outline-white/10 relative bg-zinc-50/70 dark:bg-zinc-800/40 p-2 shrink-0">
        <img
          src={product.image || "/placeholder.svg"}
          alt={product.name}
          className={`h-full w-full select-none object-contain transition-transform duration-500 ${isSold ? "opacity-25 grayscale" : "hover:scale-105"}`}
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-amber-500 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full shadow-sm">
          <Zap className="w-3 h-3 fill-white stroke-none" />
          <span>BORDER OFFER</span>
        </div>

        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/60 dark:bg-zinc-900/80 backdrop-blur-md text-amber-400 border border-amber-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full">
          <Lock className="w-2.5 h-2.5 text-amber-400" />
          <span>{isFullAdvance ? "১০০% ফুল এডভান্স" : `এডভান্স ${formatPrice(advanceAmount)}`}</span>
        </div>

        {/* Rubber Stamp "SOLD OUT" Seal when marked as sold */}
        {isSold && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-2 z-20">
            <div className="rotate-[-12deg] border-4 border-rose-500 text-rose-500 font-black px-4 py-1.5 rounded-2xl uppercase tracking-widest text-center shadow-2xl bg-black/90 border-dashed">
              <span className="text-lg sm:text-xl block leading-none font-black">
                SOLD OUT
              </span>
              <span className="text-[9px] font-bold text-rose-400 block mt-0.5 tracking-normal">
                সোল্ড আউট
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Middle Specs & Description Area */}
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider truncate">
            {product.brand || "Border Stock Mobile"}
          </span>
          {product.description && (
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-[10px] text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-0.5 font-bold cursor-pointer shrink-0"
            >
              <Info className="w-3 h-3" />
              <span>{showDetails ? "Hide" : "Details"}</span>
            </button>
          )}
        </div>

        <h3 className="truncate font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
          {product.name}
        </h3>

        {/* Expandable Description Details */}
        {showDetails && product.description && (
          <p className="text-[11px] text-zinc-600 dark:text-zinc-300 bg-white/90 dark:bg-zinc-800/90 p-2 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 leading-relaxed max-h-16 overflow-y-auto no-scrollbar animate-in fade-in duration-200">
            {product.description}
          </p>
        )}

        {/* Specifications Chips with Pure SVG Icons (No Emojis) */}
        <div className="flex flex-wrap gap-1 pt-0.5">
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

      {/* Bottom Bar matching exact User Spec */}
      <div className="flex w-full items-center justify-between gap-2 pt-2 border-t border-zinc-200/70 dark:border-zinc-800/80">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-baseline gap-1.5">
            <span className="font-extrabold text-base sm:text-lg text-amber-600 dark:text-amber-400">
              {formatPrice(displayPrice)}
            </span>
            {originalPrice && (
              <span className="text-[10px] text-zinc-400 line-through font-semibold">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold truncate">
            {isFullAdvance ? "১০০% ফুল এডভান্স প্রযোজ্য" : `নির্ধারিত এডভান্স: ${formatPrice(advanceAmount)}`}
          </span>
        </div>

        {isSold ? (
          <button
            type="button"
            disabled
            className="flex h-10 shrink-0 select-none items-center gap-1 rounded-full bg-zinc-200 dark:bg-zinc-800 px-4 text-xs font-bold text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
          >
            <span>SOLD OUT</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onBuyNow(product)}
            className="flex h-10 shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-full bg-foreground pl-4 pr-3 text-xs sm:text-sm font-bold text-background shadow-md hover:opacity-90 active:scale-95 transition-all"
          >
            <span>অর্ডার করুন</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="square"
            >
              <path d="M9.5 18L15.5 12L9.5 6" />
            </svg>
          </button>
        )}
      </div>

    </div>
  );
}

function AnimatedCard({
  card,
  index,
  isAnimating,
  onBuyNow,
}: {
  card: Card;
  index: number;
  isAnimating: boolean;
  onBuyNow: (p: Product) => void;
}) {
  const { scale, y } = positionStyles[index] ?? positionStyles[2];
  const zIndex = index === 0 && isAnimating ? 10 : 3 - index;

  const exitAnim = index === 0 ? exitAnimation : undefined;
  const initialAnim = index === 2 ? enterAnimation : undefined;

  return (
    <motion.div
      key={card.id}
      initial={initialAnim}
      animate={{ y, scale }}
      exit={exitAnim}
      transition={{
        type: "spring",
        duration: 1,
        bounce: 0,
      }}
      style={{
        zIndex,
        left: "50%",
        x: "-50%",
        bottom: 0,
      }}
      className="absolute flex h-[350px] sm:h-[365px] w-[320px] sm:w-[490px] items-center justify-center overflow-hidden rounded-t-2xl border-x border-t border-border bg-card p-1 shadow-xl will-change-transform"
    >
      <CardContent product={card.product} onBuyNow={onBuyNow} />
    </motion.div>
  );
}

export default function AnimatedCardStack({
  products = [],
  onBuyNow = () => {},
}: {
  products?: Product[];
  onBuyNow?: (p: Product) => void;
}) {
  const offerProducts = products.length > 0 ? products : [
    {
      id: "demo-1",
      name: "iPhone 15 Pro Max (Border Intake)",
      price: 135000,
      offerPrice: 118000,
      borderOfferAdvanceAmount: 118000,
      brand: "Apple",
      image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80",
      description: "Original Border Cross Intake Stock, Grade A 100% Fresh Condition with 7 days replacement warranty.",
      storage: "256GB",
      condition: "Intake Grade A",
      batteryHealth: "100%",
      warranty: "7 Days Replacement",
      isBorderOffer: true,
      stock: 5,
    },
    {
      id: "demo-2",
      name: "Samsung Galaxy S24 Ultra 5G",
      price: 125000,
      offerPrice: 108000,
      borderOfferAdvanceAmount: 2000,
      brand: "Samsung",
      image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80",
      description: "Snapdragon 8 Gen 3, Titanium Gray Border Stock Intake with 12GB RAM.",
      storage: "12GB/256GB",
      condition: "Brand New Sealed",
      batteryHealth: "100%",
      warranty: "7 Days Replacement",
      isBorderOffer: true,
      stock: 3,
    },
    {
      id: "demo-3",
      name: "Google Pixel 8 Pro 5G",
      price: 85000,
      offerPrice: 72000,
      borderOfferAdvanceAmount: 1500,
      brand: "Google",
      image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80",
      description: "Tensor G3 Camera Beast, Official Global Border Stock, 12GB RAM.",
      storage: "128GB",
      condition: "Grade A Mint",
      batteryHealth: "99%",
      warranty: "7 Days Replacement",
      isBorderOffer: true,
      stock: 4,
    },
  ] as Product[];

  const [cards, setCards] = useState<Card[]>(
    offerProducts.slice(0, 3).map((p, idx) => ({ id: p.id || idx, product: p }))
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const [nextIndex, setNextIndex] = useState(3);

  const handleAnimate = () => {
    if (offerProducts.length === 0) return;
    setIsAnimating(true);

    const nextProduct = offerProducts[nextIndex % offerProducts.length];
    setCards([...cards.slice(1), { id: `${nextProduct.id}-${Date.now()}`, product: nextProduct }]);
    setNextIndex((prev) => prev + 1);
    setIsAnimating(false);
  };

  return (
    <div className="flex w-full flex-col items-center justify-center pt-2">
      <div className="relative h-[380px] w-full overflow-hidden sm:w-[644px]">
        <AnimatePresence initial={false}>
          {cards.slice(0, 3).map((card, index) => (
            <AnimatedCard
              key={card.id}
              card={card}
              index={index}
              isAnimating={isAnimating}
              onBuyNow={onBuyNow}
            />
          ))}
        </AnimatePresence>
      </div>

      <div className="relative z-10 -mt-px flex w-full items-center justify-center border-t border-border py-4">
        <button
          type="button"
          onClick={handleAnimate}
          className="flex h-9 cursor-pointer select-none items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-border bg-background px-4 font-medium text-secondary-foreground transition-all hover:bg-secondary/80 active:scale-[0.98]"
        >
          <span>পরবর্তী অফার</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="square"
          >
            <path d="M9.5 18L15.5 12L9.5 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
