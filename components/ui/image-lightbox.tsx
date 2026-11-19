import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, Share2 } from "lucide-react";
import { APPLE_SPRING_DEFAULT, APPLE_SPRING_SNAPPY } from "../../lib/shoppingRoute";
import { triggerHaptic } from "../../lib/haptics";

interface ImageLightboxProps {
  images: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageLightbox({ images, initialIndex, isOpen, onClose }: ImageLightboxProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);
  const [scale, setScale] = useState(1);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (isOpen) {
      setActiveIndex(initialIndex);
      setScale(1);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, initialIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") paginate(1);
      if (e.key === "ArrowLeft") paginate(-1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeIndex]);

  const paginate = (newDirection: number) => {
    triggerHaptic("light");
    setDirection(newDirection);
    setScale(1);
    setActiveIndex((prev) => {
      let nextIndex = prev + newDirection;
      if (nextIndex < 0) nextIndex = images.length - 1;
      if (nextIndex >= images.length) nextIndex = 0;
      return nextIndex;
    });
  };

  const handleDownload = async () => {
    triggerHaptic("light");
    try {
      const response = await fetch(images[activeIndex]);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `product-image-${activeIndex + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download image", error);
    }
  };

  const handleShare = async () => {
    triggerHaptic("light");
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Product Image",
          url: images[activeIndex],
        });
      } catch (error) {
        console.error("Error sharing", error);
      }
    }
  };

  const swipeConfidenceThreshold = 8000;
  const swipePower = (offset: number, velocity: number) => Math.abs(offset) * velocity;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.14 : 0.2 }}
          className="ds-apple-portal fixed inset-0 z-[100000] flex items-center justify-center bg-black/94 backdrop-blur-2xl"
        >
          {/* Floating Apple Top Controls */}
          <div className="absolute top-0 left-0 right-0 p-4 sm:p-5 flex items-center justify-between z-[100001]">
            <div className="px-3.5 py-1.5 rounded-full bg-white/12 backdrop-blur-md border border-white/15 text-white font-semibold text-xs tabular-nums">
              {activeIndex + 1} / {images.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onPointerDown={() => triggerHaptic("light")}
                onClick={() => setScale((s) => Math.min(s + 0.5, 3))}
                aria-label="Zoom in"
                className="w-9 h-9 rounded-full bg-white/12 backdrop-blur-md border border-white/15 text-white hover:bg-white/20 flex items-center justify-center active:scale-95 transition cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onPointerDown={() => triggerHaptic("light")}
                onClick={() => setScale((s) => Math.max(s - 0.5, 1))}
                aria-label="Zoom out"
                className="w-9 h-9 rounded-full bg-white/12 backdrop-blur-md border border-white/15 text-white hover:bg-white/20 flex items-center justify-center active:scale-95 transition cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share image"
                className="w-9 h-9 rounded-full bg-white/12 backdrop-blur-md border border-white/15 text-white hover:bg-white/20 hidden sm:flex items-center justify-center active:scale-95 transition cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleDownload}
                aria-label="Download image"
                className="w-9 h-9 rounded-full bg-white/12 backdrop-blur-md border border-white/15 text-white hover:bg-white/20 flex items-center justify-center active:scale-95 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                type="button"
                onPointerDown={() => triggerHaptic("light")}
                onClick={onClose}
                aria-label="Close lightbox"
                className="w-9 h-9 rounded-full bg-white/16 backdrop-blur-md border border-white/20 text-white hover:bg-white/25 flex items-center justify-center active:scale-95 transition ml-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/12 hover:bg-white/22 border border-white/15 text-white backdrop-blur-md flex items-center justify-center transition active:scale-95 z-[100001] cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  paginate(-1);
                }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/12 hover:bg-white/22 border border-white/15 text-white backdrop-blur-md flex items-center justify-center transition active:scale-95 z-[100001] cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  paginate(1);
                }}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Main Stage */}
          <div
            className="relative w-full h-full flex items-center justify-center p-4 md:p-12"
            onClick={onClose}
          >
            <AnimatePresence initial={false} custom={direction}>
              {images[activeIndex]?.trim() ? (
                <motion.img
                  key={activeIndex}
                  src={images[activeIndex].trim()}
                  custom={direction}
                  initial={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: direction > 0 ? 90 : -90, scale: 0.96 }
                  }
                  animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0, scale }}
                  exit={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: direction < 0 ? 90 : -90, scale: 0.96 }
                  }
                  transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_DEFAULT}
                  drag={scale === 1 && !prefersReducedMotion ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.45}
                  onDragEnd={(_, { offset, velocity }) => {
                    const swipe = swipePower(offset.x, velocity.x);
                    if (swipe < -swipeConfidenceThreshold) {
                      paginate(1);
                    } else if (swipe > swipeConfidenceThreshold) {
                      paginate(-1);
                    }
                  }}
                  className="absolute max-w-full max-h-[85dvh] object-contain rounded-2xl md:rounded-3xl cursor-grab active:cursor-grabbing"
                  onClick={(e) => e.stopPropagation()}
                  alt={`Product full view ${activeIndex + 1}`}
                />
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
