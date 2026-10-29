import React, { useEffect, useRef, useState } from "react";
import { Image as ImageIcon } from "lucide-react";

const loadedImageCache = new Set<string>();
const inflightPreloads = new Map<string, Promise<void>>();

export function isImageCached(url?: string | null): boolean {
  if (!url) return false;
  return loadedImageCache.has(url);
}

export function markImageCached(url?: string | null): void {
  if (!url) return;
  loadedImageCache.add(url);
}

export function preloadImageUrl(url?: string | null): Promise<void> {
  if (!url || typeof window === "undefined") return Promise.resolve();
  if (loadedImageCache.has(url)) return Promise.resolve();

  const existing = inflightPreloads.get(url);
  if (existing) return existing;

  const promise = new Promise<void>((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";

    const finalize = () => {
      loadedImageCache.add(url);
      inflightPreloads.delete(url);
      resolve();
    };

    img.onload = () => {
      if (typeof img.decode === "function") {
        img.decode().then(finalize).catch(finalize);
      } else {
        finalize();
      }
    };

    img.onerror = () => {
      inflightPreloads.delete(url);
      resolve();
    };

    img.src = url;
  });

  inflightPreloads.set(url, promise);
  return promise;
}

export interface SmoothImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string;
  skeletonClassName?: string;
  eager?: boolean;
  fallback?: React.ReactNode;
}

/**
 * Atomic, scanline-free image renderer.
 * Holds the <img> at opacity-0 behind a clean shimmer surface until all bytes
 * are downloaded and decoded on a background thread, then reveals smoothly.
 */
export const SmoothImage: React.FC<SmoothImageProps> = ({
  src,
  alt = "",
  className = "",
  wrapperClassName = "",
  skeletonClassName = "",
  eager = false,
  fallback,
  onLoad,
  onError,
  referrerPolicy = "no-referrer",
  ...rest
}) => {
  const normalizedSrc = typeof src === "string" ? src.trim() : "";
  const [loaded, setLoaded] = useState<boolean>(() =>
    normalizedSrc ? loadedImageCache.has(normalizedSrc) : false
  );
  const [errored, setErrored] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setErrored(false);
    if (!normalizedSrc) {
      setLoaded(false);
      return;
    }

    if (loadedImageCache.has(normalizedSrc)) {
      setLoaded(true);
      return;
    }

    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      loadedImageCache.add(normalizedSrc);
      setLoaded(true);
      return;
    }

    setLoaded(false);
  }, [normalizedSrc]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    onLoad?.(e);

    const reveal = () => {
      if (normalizedSrc) {
        loadedImageCache.add(normalizedSrc);
      }
      setLoaded(true);
    };

    if (typeof target.decode === "function") {
      target.decode().then(reveal).catch(reveal);
    } else {
      reveal();
    }
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setErrored(true);
    onError?.(e);
  };

  const hasExplicitBoxSize =
    /\b(h-(?!auto\b)\S+|min-h-\S+|aspect-\S+|inset-0)\b/.test(
      `${wrapperClassName} ${className}`
    );

  if (!normalizedSrc || errored) {
    if (fallback) return <>{fallback}</>;
    return (
      <div
        className={`relative flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 ${
          !hasExplicitBoxSize ? "min-h-[180px]" : ""
        } ${wrapperClassName}`}
      >
        <ImageIcon className="w-6 h-6 opacity-60" />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-zinc-100 dark:bg-zinc-900 ${
        !loaded && !hasExplicitBoxSize ? "min-h-[220px]" : ""
      } ${wrapperClassName}`}
    >
      {!loaded && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 z-10 ds-skeleton bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse pointer-events-none ${skeletonClassName}`}
        />
      )}
      <img
        ref={imgRef}
        src={normalizedSrc}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy={referrerPolicy}
        onLoad={handleLoad}
        onError={handleError}
        className={`${className} transition-opacity duration-200 ease-out ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        {...rest}
      />
    </div>
  );
};

export default SmoothImage;
