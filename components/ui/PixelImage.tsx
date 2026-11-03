import React, { useEffect, useState, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Image as ImageIcon } from "lucide-react";
import { optimizeImageUrl } from "../../lib/imageOptimize";

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
  maxWidth?: number;
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
  maxWidth,
  fallbackSrc,
  onClick,
  style,
}) => {
  const targetWidth = maxWidth || (loading === "eager" ? 960 : 420);
  const optimizedSrc = useMemo(
    () => optimizeImageUrl(src, targetWidth, 75),
    [src, targetWidth]
  );

  const [activeSrc, setActiveSrc] = useState<string>(optimizedSrc);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!optimizedSrc) {
      setActiveSrc("");
      setIsLoaded(false);
      setHasError(true);
      return;
    }

    setActiveSrc(optimizedSrc);
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
    if (src && activeSrc !== src) {
      setActiveSrc(src);
      return;
    }
    if (fallbackSrc && activeSrc !== fallbackSrc) {
      setActiveSrc(fallbackSrc);
      return;
    }
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
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden bg-zinc-200/60 dark:bg-zinc-800/80">
          <div className="flex flex-col items-center justify-center gap-1.5 opacity-40 scale-90">
            <div className="w-8 h-8 rounded-full bg-zinc-300 dark:bg-zinc-700/80 flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            </div>
          </div>
        </div>
      )}

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

      {Boolean(activeSrc && !hasError) && (
        <img
          ref={imgRef}
          src={activeSrc}
          alt={alt}
          loading={loading}
          decoding="async"
          fetchPriority={loading === "eager" ? "high" : "low"}
          onLoad={handleImageLoad}
          onError={handleImageError}
          draggable={false}
          className={cn(
            "w-full h-full object-contain transition-opacity duration-200 ease-out",
            isLoaded ? "opacity-100" : "opacity-0 pointer-events-none",
            imgClassName
          )}
        />
      )}
    </div>
  );
};

export default PixelImage;
