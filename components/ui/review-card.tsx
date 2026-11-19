import * as React from "react";
import { createPortal } from "react-dom";
import { Star, CheckCircle2, Trash2, X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { APPLE_SPRING_DEFAULT, APPLE_SPRING_SNAPPY } from "../../lib/shoppingRoute";
import { triggerHaptic } from "../../lib/haptics";

export interface ReviewCardProps {
  name: string;
  handle?: string;
  review: string;
  rating: number;
  imageUrl?: string;
  createdAt?: number;
  images?: string[];
  canDelete?: boolean;
  onDelete?: () => void;
  className?: string;
}

function getInitials(name: string): string {
  const parts = String(name || "Customer")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const ReviewCard = React.forwardRef<HTMLDivElement, ReviewCardProps>(
  (
    {
      name,
      handle,
      review,
      rating,
      imageUrl,
      createdAt,
      images,
      canDelete,
      onDelete,
      className,
    },
    ref
  ) => {
    const [avatarFailed, setAvatarFailed] = React.useState(false);
    const [lightboxSrc, setLightboxSrc] = React.useState<string | null>(null);
    const shouldReduceMotion = useReducedMotion();

    const safeRating = Math.min(5, Math.max(1, Number(rating || 5)));
    const formattedDate = React.useMemo(() => {
      try {
        const ts = createdAt ? new Date(createdAt) : new Date();
        if (isNaN(ts.getTime())) return "Recently";
        return ts.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      } catch {
        return "Recently";
      }
    }, [createdAt]);

    const cleanImages = Array.isArray(images)
      ? images.filter((u) => typeof u === "string" && u.trim().length > 0)
      : [];

    const cardTransition = shouldReduceMotion
      ? { duration: 0.16 }
      : APPLE_SPRING_DEFAULT;

    const lightboxNode =
      typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {lightboxSrc && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => {
                    triggerHaptic("light");
                    setLightboxSrc(null);
                  }}
                  className="ds-apple-portal fixed inset-0 z-[220] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4"
                >
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setLightboxSrc(null);
                    }}
                    className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                    aria-label="Close photo preview"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <motion.img
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                    animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                    transition={shouldReduceMotion ? { duration: 0.16 } : APPLE_SPRING_SNAPPY}
                    src={lightboxSrc}
                    alt="Customer review attachment"
                    referrerPolicy="no-referrer"
                    onClick={(e) => e.stopPropagation()}
                    className="max-w-full max-h-[86vh] object-contain rounded-[22px] shadow-2xl"
                  />
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )
        : null;

    return (
      <>
        <motion.article
          ref={ref}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={cardTransition}
          className={cn(
            "rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.1] p-5 sm:p-6 shadow-xs transition-colors hover:border-black/[0.12] dark:hover:border-white/[0.18] w-full",
            className
          )}
        >
          {/* Top Row: Reviewer Avatar + Identity on Left · Stars + Delete on Right */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {imageUrl && !avatarFailed ? (
                <img
                  src={imageUrl}
                  alt={name}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="w-10 h-10 rounded-full object-cover border border-black/[0.08] dark:border-white/[0.12] shrink-0 bg-[#F5F5F7] dark:bg-[#2C2C2E]"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#1D1D1F] dark:bg-[#2C2C2E] text-white flex items-center justify-center text-xs font-bold tracking-tight shrink-0 border border-white/10">
                  {getInitials(name)}
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-[#1D1D1F] dark:text-[#F5F5F7] truncate tracking-tight">
                    {name || "Verified Customer"}
                  </h3>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#248A3D] dark:text-[#30D158] shrink-0" />
                </div>
                <p className="text-xs text-[#6E6E73] dark:text-[#98989D] truncate mt-0.5 tabular-nums">
                  <span>{handle || "Verified Buyer"}</span>
                  <span className="mx-1.5">·</span>
                  <span>{formattedDate}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((starIdx) => (
                    <Star
                      key={starIdx}
                      className={cn(
                        "w-3.5 h-3.5 sm:w-4 sm:h-4",
                        starIdx <= Math.round(safeRating)
                          ? "text-[#FF9500] dark:text-[#FF9F0A] fill-[#FF9500] dark:fill-[#FF9F0A]"
                          : "text-black/[0.12] dark:text-white/[0.16]"
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums ml-1">
                  {safeRating.toFixed(1)}
                </span>
              </div>

              {canDelete && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("warning");
                    onDelete();
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[#6E6E73] dark:text-[#98989D] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors cursor-pointer active:scale-95"
                  aria-label="Delete review"
                  title="Delete review"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Review Body */}
          {review && (
            <p className="mt-3.5 text-sm sm:text-[15px] leading-relaxed text-[#1D1D1F]/85 dark:text-[#F5F5F7]/85 whitespace-pre-line break-words">
              {review}
            </p>
          )}

          {/* Attached Customer Photos */}
          {cleanImages.length > 0 && (
            <div className="flex items-center gap-2.5 mt-4 overflow-x-auto pb-1">
              {cleanImages.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setLightboxSrc(img);
                  }}
                  className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-black/[0.08] dark:border-white/[0.12] shrink-0 bg-[#F5F5F7] dark:bg-[#2C2C2E] group cursor-zoom-in active:scale-95 transition-transform"
                >
                  <img
                    src={img}
                    alt={`Customer photo ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </button>
              ))}
            </div>
          )}
        </motion.article>

        {lightboxNode}
      </>
    );
  }
);

ReviewCard.displayName = "ReviewCard";

export { ReviewCard };
