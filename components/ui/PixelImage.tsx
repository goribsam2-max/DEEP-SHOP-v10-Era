import React, { useEffect, useState, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Image as ImageIcon } from "lucide-react";

export interface PixelImageProps {
  src?: string;
  alt?: string;
  grid?: string;
  customGrid?: any;
  grayscaleAnimation?: boolean;
  pixelFadeInDuration?: number;
  maxAnimationDelay?: number;
  colorRevealDelay?: number;
  className?: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
  fallbackSrc?: string;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

function optimizeImageSrc(rawSrc?: string, maxWidth = 640): string {
  if (!rawSrc) return "";
  const trimmed = rawSrc.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }

  try {
    if (trimmed.includes("images.unsplash.com/")) {
      const url = new URL(trimmed);
      if (!url.searchParams.has("w")) {
        url.searchParams.set("w", String(maxWidth));
      }
      if (!url.searchParams.has("q")) {
        url.searchParams.set("q", "75");
      }
      if (!url.searchParams.has("auto")) {
        url.searchParams.set("auto", "format");
      }
      return url.toString();
    }

    if (
      trimmed.includes("res.cloudinary.com/") &&
      trimmed.includes("/image/upload/") &&
      !trimmed.includes("/f_auto") &&
      !trimmed.includes("/q_auto")
    ) {
      return trimmed.replace(
        "/image/upload/",
        `/image/upload/f_auto,q_auto:good,w_${maxWidth}/`
      );
    }

    if (trimmed.includes("images.pexels.com/") && !trimmed.includes("w=")) {
      const sep = trimmed.includes("?") ? "&" : "?";
      return `${trimmed}${sep}auto=compress&cs=tinysrgb&w=${maxWidth}`;
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

export const PixelImage: React.FC<PixelImageProps> = ({
  src,
  alt = "Product Image",
  className,
  imgClassName,
  loading = "lazy",
  onClick,
  style,
}) => {
  const optimizedSrc = useMemo(
    () => optimizeImageSrc(src, loading === "eager" ? 1080 : 600),
    [src, loading]
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Respect native browser lazy-loading instead of eagerly creating new Image() for offscreen cards
  useEffect(() => {
    if (!optimizedSrc) {
      setIsLoaded(false);
      setHasError(true);
      return;
    }

    setHasError(false);
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
    }
  }, [optimizedSrc]);

  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  const handleImageError = () => {
    setHasError(true);
  };

  return (
    <div
      onClick={onClick}
      style={style}
      className={cn(
        "relative w-full h-full overflow-hidden isolate select-none bg-zinc-100/80 dark:bg-zinc-800/80 flex items-center justify-center",
        className
      )}
    >
      {/* Sleek animated shimmer skeleton placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden bg-zinc-200/60 dark:bg-zinc-800/80">
          <div className="flex flex-col items-center justify-center gap-1.5 opacity-40 scale-90">
            <div className="w-8 h-8 rounded-full bg-zinc-300 dark:bg-zinc-700/80 flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            </div>
          </div>
        </div>
      )}

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center p-3 text-center bg-zinc-100 dark:bg-zinc-800/60">
          <div className="w-9 h-9 rounded-full bg-zinc-200/80 dark:bg-zinc-700/80 flex items-center justify-center mb-1">
            <ImageIcon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          </div>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
            DEEP SHOP
          </span>
        </div>
      )}

      {/* Main Image with native lazy loading & zero-reflow opacity transition */}
      {Boolean(optimizedSrc && !hasError) && (
        <img
          ref={imgRef}
          src={optimizedSrc}
          alt={alt}
          loading={loading}
          decoding="async"
          fetchPriority={loading === "eager" ? "high" : "low"}
          onLoad={handleImageLoad}
          onError={handleImageError}
          draggable={false}
          className={cn(
            "w-full h-full object-contain transition-opacity duration-300 ease-out",
            isLoaded ? "opacity-100" : "opacity-0 pointer-events-none",
            imgClassName
          )}
        />
      )}
    </div>
  );
};

export default PixelImage;
