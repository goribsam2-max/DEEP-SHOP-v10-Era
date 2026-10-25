import * as React from "react";
import { Star, CheckCircle2, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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

    return (
      <>
        <motion.article
          ref={ref}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={cn(
            "rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-2xs transition-colors hover:border-zinc-300 dark:hover:border-zinc-700 w-full",
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
                  className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 bg-zinc-100 dark:bg-zinc-800"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-zinc-900 dark:bg-zinc-800 text-white dark:text-zinc-100 flex items-center justify-center text-xs font-bold tracking-tight shrink-0 border border-zinc-200/20">
                  {getInitials(name)}
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {name || "Verified Customer"}
                  </h3>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
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
                          ? "text-amber-400 fill-amber-400"
                          : "text-zinc-200 dark:text-zinc-700"
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 tabular-nums ml-1">
                  {safeRating.toFixed(1)}
                </span>
              </div>

              {canDelete && onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
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
            <p className="mt-3.5 text-sm sm:text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-200 whitespace-pre-line break-words">
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
                  onClick={() => setLightboxSrc(img)}
                  className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shrink-0 bg-zinc-100 dark:bg-zinc-800 group cursor-zoom-in"
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

        {/* Fullscreen Review Photo Lightbox */}
        <AnimatePresence>
          {lightboxSrc && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightboxSrc(null)}
              className="fixed inset-0 z-[220] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <button
                type="button"
                onClick={() => setLightboxSrc(null)}
                className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
                aria-label="Close photo preview"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={lightboxSrc}
                alt="Customer review attachment"
                referrerPolicy="no-referrer"
                onClick={(e) => e.stopPropagation()}
                className="max-w-full max-h-[86vh] object-contain rounded-2xl shadow-2xl"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }
);

ReviewCard.displayName = "ReviewCard";

export { ReviewCard };
