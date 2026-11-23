import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { X } from "lucide-react";
import { APPLE_SPRING_DEFAULT, isAppleShoppingRoute } from "../../lib/shoppingRoute";
import { triggerHaptic } from "../../lib/haptics";

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

interface Banner {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  link?: string;
  bannerType?: "hero" | "popup" | "gif";
}

export function OnboardingDialog({
  defaultOpen = true,
  slides,
  onClose,
}: {
  defaultOpen?: boolean;
  slides: Banner[];
  onClose?: () => void;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [activeIndex, setActiveIndex] = React.useState(0);
  const prefersReducedMotion = useReducedMotion();
  const isAppleShop =
    typeof window !== "undefined" && isAppleShoppingRoute(window.location.pathname);

  React.useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setActiveIndex(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  if (slides.length === 0 || !open) return null;

  const isFirstSlide = activeIndex === 0;
  const isLastSlide = activeIndex === slides.length - 1;
  const currentSlide = slides[activeIndex] ?? slides[0];

  const handleCloseAll = () => {
    triggerHaptic("light");
    setOpen(false);
    if (onClose) onClose();
  };

  const handleNext = () => {
    triggerHaptic("light");
    if (isLastSlide) {
      handleCloseAll();
      return;
    }
    emblaApi?.scrollNext();
  };

  const handlePrevious = () => {
    triggerHaptic("light");
    emblaApi?.scrollPrev();
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center p-5",
        isAppleShop && "ds-apple-portal"
      )}
    >
      <div
        className={cn(
          "fixed inset-0",
          isAppleShop ? "ds-apple-backdrop" : "ds-liquid-backdrop"
        )}
        onClick={handleCloseAll}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 10 }}
        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_DEFAULT}
        className={cn(
          isAppleShop ? "ds-apple-modal rounded-[28px]" : "ds-liquid-glass-popup",
          "relative z-10 w-full max-w-[390px] sm:max-w-[440px] mx-auto overflow-hidden p-4 sm:p-5"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div ref={emblaRef} className="overflow-hidden rounded-[22px] relative">
          <div className="flex">
            {slides.map((slide) => (
              <div key={slide.id} className="flex-[0_0_100%] min-w-0">
                <img
                  src={slide.imageUrl}
                  alt={slide.title}
                  className="aspect-square sm:aspect-video w-full rounded-[20px] object-contain sm:object-cover ds-skeleton"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onPointerDown={() => triggerHaptic("light")}
            onClick={handleCloseAll}
            className="ds-liquid-btn-secondary absolute top-3 right-3 w-9 h-9 !min-h-0 flex items-center justify-center rounded-full transition-transform active:scale-95 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {slides.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  emblaApi?.scrollTo(index);
                }}
                aria-label={`Go to ${slide.title}`}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200 cursor-pointer",
                  index === activeIndex
                    ? "w-6 bg-[#0071E3] dark:bg-[#0A84FF]"
                    : "w-2 bg-zinc-400/50 dark:bg-zinc-600"
                )}
              />
            ))}
          </div>
        )}

        <div className="grid mt-5 px-2">
          {slides.map((slide) => (
            <motion.div
              key={slide.id}
              animate={{ opacity: currentSlide.id === slide.id ? 1 : 0 }}
              initial={false}
              className={cn(
                "col-start-1 row-start-1 text-left",
                currentSlide.id === slide.id
                  ? "pointer-events-auto"
                  : "pointer-events-none"
              )}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <h2 className="ds-liquid-popup-title ds-apple-display text-[20px] font-semibold leading-[1.24] tracking-[-0.025em]">
                {slide.title}
              </h2>
              {slide.description && (
                <p className="ds-liquid-popup-desc text-[15px] leading-[1.46] mt-2">
                  {slide.description}
                </p>
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-6 px-1 pb-1 flex flex-col gap-2.5">
          <button
            type="button"
            onPointerDown={() => triggerHaptic("light")}
            onClick={handleNext}
            className={cn(
              isAppleShop ? "ds-apple-btn-primary" : "ds-liquid-btn-primary",
              "w-full min-h-[48px] px-5 rounded-full text-[15px] font-semibold tracking-[-0.01em] transition-transform active:scale-[0.97] cursor-pointer"
            )}
          >
            {isLastSlide ? "Get started" : "Next"}
          </button>
          {!isFirstSlide ? (
            <button
              type="button"
              onPointerDown={() => triggerHaptic("light")}
              onClick={handlePrevious}
              className={cn(
                isAppleShop ? "ds-apple-btn-secondary" : "ds-liquid-btn-secondary",
                "w-full min-h-[48px] px-5 rounded-full text-[15px] font-semibold tracking-[-0.01em] transition-transform active:scale-[0.97] cursor-pointer"
              )}
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              onPointerDown={() => triggerHaptic("light")}
              onClick={handleCloseAll}
              className={cn(
                isAppleShop ? "ds-apple-btn-secondary" : "ds-liquid-btn-secondary",
                "w-full min-h-[48px] px-5 rounded-full text-[15px] font-semibold tracking-[-0.01em] transition-transform active:scale-[0.97] cursor-pointer"
              )}
            >
              Skip
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
