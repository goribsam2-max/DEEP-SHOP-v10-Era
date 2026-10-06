import React, { useState, useEffect, useRef } from 'react';
import { ImageIcon, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

// Global in-memory cache of fully loaded image URLs to prevent re-shimmer on re-renders
const globalLoadedImageCache = new Set<string>();

export interface ProgressiveImageProps {
  src: string;
  thumbnailSrc?: string;
  alt?: string;
  className?: string;
  containerClassName?: string;
  aspectRatio?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  loading?: 'lazy' | 'eager';
  showShimmerIcon?: boolean;
}

/**
 * 🌟 Skeleton Loading Component with a Subtle Moving Gradient Shimmer
 * Ensures users see an animated placeholder before the image finishes loading,
 * completely replacing any empty/blank space experience.
 */
export const ImageSkeletonShimmer: React.FC<{
  className?: string;
  showIcon?: boolean;
  aspectRatio?: string;
}> = ({ className = '', showIcon = true, aspectRatio }) => {
  return (
    <div
      className={cn(
        "relative w-full h-full min-h-[140px] overflow-hidden select-none",
        "bg-gradient-to-br from-zinc-200/90 via-zinc-100/80 to-zinc-200/90",
        "dark:from-zinc-900/90 dark:via-zinc-800/80 dark:to-zinc-900/90",
        aspectRatio,
        className
      )}
    >
      {/* 🌊 Fluid Animated Shimmer Wave with Subtle Translucent Gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.35) 50%, transparent 100%)',
          animation: 'progressiveShimmer 1.6s infinite ease-in-out',
        }}
      />

      {/* Dark theme enhanced shimmer beam */}
      <div
        className="absolute inset-0 pointer-events-none hidden dark:block"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.08) 50%, transparent 100%)',
          animation: 'progressiveShimmer 1.6s infinite ease-in-out',
        }}
      />

      {/* 🖼️ Subtle Center Icon Placeholder with Gentle Breathing Pulse */}
      {showIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-2xl bg-white/40 dark:bg-zinc-800/60 backdrop-blur-xs border border-zinc-300/40 dark:border-white/10 flex items-center justify-center text-zinc-400 dark:text-zinc-500 shadow-xs">
            <ImageIcon className="w-5 h-5 opacity-70 animate-pulse text-zinc-500 dark:text-zinc-400" />
          </div>
        </div>
      )}

      {/* Keyframe Injection */}
      <style>{`
        @keyframes progressiveShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

/**
 * 🚀 Progressive Image Component for Chat & Community Modules
 * 
 * 1. SKELETON SHIMMER: Always renders an animated shimmer placeholder first.
 *    No empty space, no collapsed 0px containers.
 * 2. LOW-RES THUMBNAIL: If provided (e.g., base64 micro-thumbnail in Firestore),
 *    renders instantaneously (~0-50ms) with soft ambient blur.
 * 3. HIGH-RES IMAGE: Fetches full resolution in background and transitions
 *    buttery-smoothly with cross-fade (400ms ease-out) once fully loaded.
 */
export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  thumbnailSrc,
  alt = 'Photo',
  className = '',
  containerClassName = '',
  aspectRatio,
  onClick,
  loading = 'eager',
  showShimmerIcon = true,
}) => {
  const isAlreadyCached = globalLoadedImageCache.has(src);

  const [isHighResLoaded, setIsHighResLoaded] = useState(isAlreadyCached);
  const [isThumbLoaded, setIsThumbLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Micro thumbnail candidate (either explicit prop or stored thumb)
  const lowResCandidate = thumbnailSrc;

  useEffect(() => {
    if (!src) return;

    if (globalLoadedImageCache.has(src)) {
      setIsHighResLoaded(true);
      return;
    }

    setIsHighResLoaded(false);
    setHasError(false);

    let isMounted = true;

    // 1. Preload High-Resolution Image
    const highResImg = new Image();
    highResImg.decoding = 'async';
    highResImg.src = src;

    highResImg.onload = () => {
      if (!isMounted) return;
      globalLoadedImageCache.add(src);
      setIsHighResLoaded(true);
    };

    highResImg.onerror = () => {
      if (!isMounted) return;
      setHasError(true);
    };

    // 2. Preload Low-Resolution Thumbnail if provided and high-res is not cached
    let thumbImg: HTMLImageElement | null = null;
    if (lowResCandidate && !isAlreadyCached) {
      thumbImg = new Image();
      thumbImg.src = lowResCandidate;
      thumbImg.onload = () => {
        if (!isMounted) return;
        setIsThumbLoaded(true);
      };
    }

    return () => {
      isMounted = false;
      highResImg.onload = null;
      highResImg.onerror = null;
      if (thumbImg) thumbImg.onload = null;
    };
  }, [src, retryCount, lowResCandidate]);

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHasError(false);
    setIsHighResLoaded(false);
    setRetryCount(prev => prev + 1);
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative overflow-hidden w-full h-full select-none",
        "bg-zinc-100 dark:bg-zinc-900 min-h-[140px]",
        aspectRatio,
        containerClassName
      )}
    >
      {/* ── STAGE 1: SKELETON SHIMMER PLACEHOLDER ── */}
      {/* Always visible until the high-res image (or at least blurred thumbnail) is ready */}
      {(!isHighResLoaded && !isThumbLoaded && !hasError) && (
        <div className="absolute inset-0 z-10">
          <ImageSkeletonShimmer showIcon={showShimmerIcon} />
        </div>
      )}

      {/* ── STAGE 2: LOW-RESOLUTION AMBIENT BLUR THUMBNAIL ── */}
      {/* Renders almost instantly (from Firestore micro-base64) so user immediately sees photo contents */}
      {lowResCandidate && (isThumbLoaded || lowResCandidate.startsWith('data:')) && !isHighResLoaded && !hasError && (
        <img
          src={lowResCandidate}
          alt={alt}
          aria-hidden="true"
          className={cn(
            "absolute inset-0 w-full h-full object-cover filter blur-md scale-105 opacity-90 transition-opacity duration-400 ease-out",
            className
          )}
        />
      )}

      {/* ── STAGE 3: HIGH-RESOLUTION FINAL IMAGE ── */}
      {/* Smooth cross-fade transition from blurred thumbnail / skeleton shimmer into crystal clear photo */}
      {!hasError && (
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={() => {
            globalLoadedImageCache.add(src);
            setIsHighResLoaded(true);
          }}
          onError={() => setHasError(true)}
          className={cn(
            "w-full h-full object-cover transition-all duration-400 ease-out",
            isHighResLoaded
              ? "opacity-100 blur-0 scale-100"
              : "opacity-0 blur-xs scale-[0.99]",
            className
          )}
        />
      )}

      {/* ── STAGE 4: GRACEFUL ERROR FALLBACK ── */}
      {hasError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-3 bg-zinc-900/95 text-center gap-1.5 border border-zinc-800">
          <AlertCircle className="w-5 h-5 text-zinc-400" />
          <span className="text-[11px] font-bold text-zinc-300">Failed to load photo</span>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-1 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-sm"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Tap to retry</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ProgressiveImage;
