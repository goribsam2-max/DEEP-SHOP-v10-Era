import React, { useEffect, useState, useRef } from "react";
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

export const PixelImage: React.FC<PixelImageProps> = ({
  src,
  alt = "Product Image",
  className,
  imgClassName,
  loading = "lazy",
  fallbackSrc = "/favicon.png",
  onClick,
  style,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Check if image is already cached/completed on mount or when src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);

    if (!src) {
      setHasError(true);
      return;
    }

    // Pre-test image cache or load
    const img = new Image();
    img.src = src;
    if (img.complete && img.naturalWidth > 0) {
      setIsLoaded(true);
    } else {
      img.onload = () => {
        setIsLoaded(true);
      };
      img.onerror = () => {
        setHasError(true);
      };
    }
  }, [src]);

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
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent pointer-events-none" />
          <div className="flex flex-col items-center justify-center gap-1.5 opacity-40 scale-90">
            <div className="w-8 h-8 rounded-full bg-zinc-300 dark:bg-zinc-700/80 flex items-center justify-center animate-pulse">
              <ImageIcon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            </div>
          </div>
        </div>
      )}

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center p-3 text-center bg-zinc-100 dark:bg-zinc-800/60">
          <div className="w-9 h-9 rounded-full bg-zinc-200/80 dark:bg-zinc-700/80 flex items-center justify-center mb-1">
            <ImageIcon className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          </div>
          <span className="text-[10px] text-zinc-400 font-medium">DEEP SHOP</span>
        </div>
      )}

      {/* Main Image with smooth fade-in and scale-in */}
      {src && !hasError && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={handleImageLoad}
          onError={handleImageError}
          draggable={false}
          className={cn(
            "w-full h-full object-contain transition-all duration-500 ease-out will-change-transform will-change-opacity",
            isLoaded
              ? "opacity-100 scale-100 blur-0"
              : "opacity-0 scale-[0.98] blur-[4px] pointer-events-none",
            imgClassName
          )}
        />
      )}
    </div>
  );
};

export default PixelImage;
