"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Lock, Info, ChevronRight } from "lucide-react";
import { Product } from "../../types";
import { formatPrice } from "../../lib/utils";
import { getProductDisplayImage } from "../../src/lib/phonePartsArt";
import { triggerHaptic } from "../../lib/haptics";

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
  opacity: 0,
  zIndex: 10,
};

const enterAnimation = {
  y: -16,
  scale: 0.9,
  opacity: 0.85,
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
  const displayPrice =
    product.offerPrice && product.offerPrice < product.price
      ? product.offerPrice
      : product.price;
  const originalPrice =
    product.offerPrice && product.offerPrice < product.price
      ? product.price
      : null;
  const advanceAmount =
    product.borderOfferAdvanceAmount !== undefined &&
    product.borderOfferAdvanceAmount !== null &&
    Number(product.borderOfferAdvanceAmount) > 0
      ? Number(product.borderOfferAdvanceAmount)
      : product.advanceAmount !== undefined &&
          product.advanceAmount !== null &&
          Number(product.advanceAmount) > 0
        ? Number(product.advanceAmount)
        : displayPrice;

  const isFullAdvance = advanceAmount >= displayPrice;

  const specItems = [
    product.storage,
    product.condition,
    product.batteryHealth ? `Battery ${product.batteryHealth}` : "",
    product.warranty,
  ].filter(Boolean);

  return (
    <div className="ds-apple-surface flex h-full w-full flex-col justify-between gap-2.5 p-4 rounded-[22px] overflow-hidden relative">
      <div className="ds-apple-surface-subtle relative flex h-[170px] sm:h-[185px] w-full items-center justify-center overflow-hidden rounded-2xl p-2 shrink-0">
        <img
          src={getProductDisplayImage(product)}
          alt={product.name}
          className={`h-full w-full select-none object-contain transition-transform duration-300 ${
            isSold ? "opacity-25 grayscale" : ""
          }`}
        />

        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/70 backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-1 rounded-full tabular-nums">
          <Lock className="w-2.5 h-2.5" />
          <span>
            {isFullAdvance
              ? "১০০% ফুল এডভান্স"
              : `এডভান্স ${formatPrice(advanceAmount)}`}
          </span>
        </div>

        {isSold && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-2 z-20">
            <span className="px-4 py-1.5 rounded-full bg-black/80 text-white text-xs font-semibold tracking-wide">
              Sold Out
            </span>
          </div>
        )}
      </div>

      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="ds-apple-eyebrow ds-apple-muted text-[10px] truncate">
            {product.brand || "Border Stock"}
          </span>
          {product.description && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setShowDetails(!showDetails);
              }}
              className="ds-apple-accent-text text-[11px] flex items-center gap-1 font-semibold cursor-pointer shrink-0"
            >
              <Info className="w-3 h-3" />
              <span>{showDetails ? "Hide" : "Details"}</span>
            </button>
          )}
        </div>

        <h3 className="truncate font-semibold text-[15px] sm:text-base tracking-tight">
          {product.name}
        </h3>

        {showDetails && product.description && (
          <p className="ds-apple-surface-subtle text-[11px] p-2.5 rounded-xl leading-relaxed max-h-16 overflow-y-auto no-scrollbar">
            {product.description}
          </p>
        )}

        {specItems.length > 0 && (
          <p className="ds-apple-muted text-[11px] truncate">
            {specItems.join(" · ")}
          </p>
        )}
      </div>

      <div className="flex w-full items-center justify-between gap-2 pt-2.5 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="font-semibold text-base sm:text-lg">
              {formatPrice(displayPrice)}
            </span>
            {originalPrice && (
              <span className="ds-apple-muted text-[11px] line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>
          <span className="ds-apple-muted text-[10px] font-medium truncate">
            {isFullAdvance
              ? "১০০% ফুল এডভান্স প্রযোজ্য"
              : `নির্ধারিত এডভান্স: ${formatPrice(advanceAmount)}`}
          </span>
        </div>

        {isSold ? (
          <button
            type="button"
            disabled
            className="ds-apple-btn-secondary flex h-9 shrink-0 select-none items-center rounded-full px-4 text-xs font-semibold opacity-50 cursor-not-allowed"
          >
            Sold Out
          </button>
        ) : (
          <button
            type="button"
            onPointerDown={() => triggerHaptic()}
            onClick={() => onBuyNow(product)}
            className="ds-apple-btn-primary flex h-9 shrink-0 cursor-pointer select-none items-center gap-1 rounded-full pl-4 pr-3 text-xs sm:text-sm font-semibold active:scale-95 transition-transform"
          >
            <span>অর্ডার করুন</span>
            <ChevronRight className="w-4 h-4" />
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
  const shouldReduceMotion = useReducedMotion();
  const { scale, y } = positionStyles[index] ?? positionStyles[2];
  const zIndex = index === 0 && isAnimating ? 10 : 3 - index;

  const exitAnim = index === 0 ? exitAnimation : undefined;
  const initialAnim = index === 2 ? enterAnimation : undefined;

  return (
    <motion.div
      key={card.id}
      initial={initialAnim}
      animate={{ y, scale, opacity: 1 }}
      exit={exitAnim}
      transition={
        shouldReduceMotion
          ? { duration: 0.16 }
          : {
              type: "spring",
              duration: 0.55,
              bounce: 0,
            }
      }
      style={{
        zIndex,
        left: "50%",
        x: "-50%",
        bottom: 0,
      }}
      className="absolute flex h-[350px] sm:h-[365px] w-[320px] sm:w-[490px] items-center justify-center overflow-hidden rounded-[22px] will-change-transform"
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
  const offerProducts = products;
  const [cards, setCards] = useState<Card[]>(() =>
    offerProducts.slice(0, 3).map((p, idx) => ({ id: p.id || idx, product: p }))
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const [nextIndex, setNextIndex] = useState(3);

  if (offerProducts.length === 0) return null;

  const handleAnimate = () => {
    if (offerProducts.length === 0) return;
    triggerHaptic();
    setIsAnimating(true);
    const nextProduct = offerProducts[nextIndex % offerProducts.length];
    setCards([
      ...cards.slice(1),
      { id: `${nextProduct.id}-${Date.now()}`, product: nextProduct },
    ]);
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

      {offerProducts.length > 1 && (
        <div className="relative z-10 flex w-full items-center justify-center pt-4 pb-1">
          <button
            type="button"
            onClick={handleAnimate}
            className="ds-apple-btn-secondary flex h-9 cursor-pointer select-none items-center justify-center gap-1 rounded-full px-5 text-xs font-semibold active:scale-95 transition-transform"
          >
            <span>পরবর্তী অফার</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
