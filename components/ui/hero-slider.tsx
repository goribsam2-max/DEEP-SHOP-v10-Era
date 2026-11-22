import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion, PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PixelImage } from "./PixelImage";
import { triggerHaptic } from "../../lib/haptics";

interface Card {
  id: string;
  title: string;
  description: string;
  category: string;
  image: string;
  date: string;
  actionText: string;
}

interface HeroSliderProps {
  cards: Card[];
  autoSlideDelay?: number;
  pauseDurationAfterInteract?: number;
}

export function HeroSlider({
  cards,
  autoSlideDelay = 4500,
  pauseDurationAfterInteract = 10000,
}: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [direction, setDirection] = useState(1);
  const shouldReduceMotion = useReducedMotion();
  const navigate = useNavigate();

  const interactTimeRef = useRef<number>(0);

  const nextSlide = () => {
    if (cards.length <= 1) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const prevSlide = () => {
    if (cards.length <= 1) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleInteract = () => {
    setIsAutoPlaying(false);
    interactTimeRef.current = Date.now();
  };

  useEffect(() => {
    if (isAutoPlaying || cards.length <= 1) return;
    const remaining = Math.max(
      500,
      pauseDurationAfterInteract - (Date.now() - interactTimeRef.current)
    );
    const timer = setTimeout(() => {
      setIsAutoPlaying(true);
    }, remaining);
    return () => clearTimeout(timer);
  }, [isAutoPlaying, pauseDurationAfterInteract, cards.length]);

  useEffect(() => {
    if (!isAutoPlaying || cards.length <= 1) return;
    const timer = setTimeout(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }, autoSlideDelay);
    return () => clearTimeout(timer);
  }, [currentIndex, isAutoPlaying, autoSlideDelay, cards.length]);

  if (cards.length === 0) return null;

  const variants = {
    enter: (dir: number) => ({
      x: shouldReduceMotion ? 0 : dir > 0 ? 120 : -120,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: shouldReduceMotion ? 0 : dir < 0 ? 120 : -120,
      opacity: 0,
    }),
  };

  const activeCard = cards[currentIndex] || cards[0];

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (cards.length <= 1) return;
    const swipeThreshold = 45;
    const velocityThreshold = 280;
    if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      triggerHaptic();
      handleInteract();
      nextSlide();
    } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      triggerHaptic();
      handleInteract();
      prevSlide();
    }
  };

  return (
    <div
      className="ds-apple-surface relative w-full overflow-hidden rounded-[24px] md:rounded-[28px]"
      onMouseEnter={handleInteract}
      onTouchStart={handleInteract}
    >
      <div className="relative h-[300px] md:h-[380px] w-full flex items-center justify-center">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            drag={cards.length > 1 ? "x" : false}
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={handleDragEnd}
            transition={
              shouldReduceMotion
                ? { duration: 0.18 }
                : {
                    x: { type: "spring", bounce: 0, duration: 0.42 },
                    opacity: { duration: 0.24 },
                  }
            }
            style={{ touchAction: "pan-y" }}
            className="absolute inset-0 flex flex-col md:flex-row items-center justify-between p-6 md:px-14 md:py-10 w-full h-full cursor-pointer select-none touch-pan-y"
            onClick={() => navigate(`/product/${activeCard.id}`)}
          >
            <div className="flex-1 text-center md:text-left z-10 min-w-0 max-w-xl">
              <p className="ds-apple-eyebrow ds-apple-muted text-[11px] mb-2 truncate">
                {activeCard.category || "Featured"}
              </p>
              <h3 className="ds-apple-display text-[22px] sm:text-[26px] md:text-[36px] font-semibold mb-2 md:mb-3 line-clamp-2">
                {activeCard.title}
              </h3>
              <p className="ds-apple-muted text-sm md:text-[15px] leading-relaxed line-clamp-2 mb-4 md:mb-6 max-w-md hidden md:block">
                {activeCard.description?.replace(/<[^>]*>?/gm, "")}
              </p>
              <div className="flex items-center justify-center md:justify-start gap-4">
                <span className="text-lg md:text-2xl font-semibold tabular-nums tracking-tight">
                  {activeCard.date}
                </span>
                <motion.button
                  type="button"
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    triggerHaptic();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/product/${activeCard.id}`);
                  }}
                  className="ds-apple-btn-primary rounded-full px-5 h-9 md:h-10 text-xs md:text-sm font-medium inline-flex items-center justify-center cursor-pointer whitespace-nowrap"
                >
                  {activeCard.actionText || "Buy"}
                </motion.button>
              </div>
            </div>

            <div className="flex-1 w-full h-full relative z-0 flex justify-center items-center mt-3 md:mt-0">
              <div className="max-h-[135px] md:max-h-[260px] w-full max-w-[260px] md:max-w-[340px] h-[135px] md:h-[260px] flex items-center justify-center">
                <PixelImage
                  src={activeCard.image}
                  alt={activeCard.title}
                  className="bg-transparent rounded-2xl"
                  imgClassName="max-h-[130px] md:max-h-[250px] w-auto object-contain transition-transform duration-300"
                />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {cards.length > 1 && (
          <>
            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
              aria-label="Previous featured product"
              className="ds-apple-surface-subtle hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full items-center justify-center opacity-85 hover:opacity-100 transition cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic();
                handleInteract();
                prevSlide();
              }}
            >
              <ChevronLeft className="h-5 w-5" />
            </motion.button>
            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
              aria-label="Next featured product"
              className="ds-apple-surface-subtle hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full items-center justify-center opacity-85 hover:opacity-100 transition cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic();
                handleInteract();
                nextSlide();
              }}
            >
              <ChevronRight className="h-5 w-5" />
            </motion.button>
          </>
        )}
      </div>

      {cards.length > 1 && (
        <div
          aria-hidden="true"
          className="absolute bottom-3.5 left-0 w-full flex items-center justify-center gap-1.5 z-20 pointer-events-none"
        >
          {cards.slice(0, 10).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex % 10
                  ? "w-6 bg-zinc-900 dark:bg-white"
                  : "w-1.5 bg-zinc-400/50 dark:bg-zinc-600/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
