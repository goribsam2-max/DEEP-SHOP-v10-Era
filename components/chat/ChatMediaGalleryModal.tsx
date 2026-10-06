import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ImageSkeletonShimmer } from './ProgressiveImage';

interface ChatMediaGalleryModalProps {
  isOpen: boolean;
  images: string[];
  initialIndex?: number;
  senderName?: string;
  timestamp?: any;
  onClose: () => void;
}

export const ChatMediaGalleryModal: React.FC<ChatMediaGalleryModalProps> = ({
  isOpen,
  images = [],
  initialIndex = 0,
  senderName,
  timestamp,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [userToggledControls, setUserToggledControls] = useState(true);
  const [isImageLoading, setIsImageLoading] = useState(true);

  // Sync index when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, images.length - 1)));
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setUserToggledControls(true);
      setIsImageLoading(true);
    }
  }, [isOpen, initialIndex, images.length]);

  // Reset zoom and set loading when navigating between photos
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setIsImageLoading(true);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === '+' || e.key === '=') {
        setZoom(prev => Math.min(4, prev + 0.5));
      } else if (e.key === '-') {
        setZoom(prev => Math.max(1, prev - 0.5));
      } else if (e.key === '0') {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleDoubleTapOrClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (zoom > 1) {
      // Zoom out to normal
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    } else {
      // Zoom in to 2.5x
      setZoom(2.5);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom(prev => Math.min(4, prev + 0.25));
    } else {
      setZoom(prev => {
        const next = Math.max(1, prev - 0.25);
        if (next === 1) setOffset({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // 4th Style: Auto hide top and bottom controls when zoomed in!
  // "zoom korle auto hide hoeb 4th picture ar upore niche buttons gula and zoom out korle abr dekha jabe eigula"
  const isZoomedIn = zoom > 1;
  const showControls = !isZoomedIn && userToggledControls;

  const formattedDate = timestamp
    ? new Date(typeof timestamp.toMillis === 'function' ? timestamp.toMillis() : timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[60000] bg-black/95 backdrop-blur-2xl flex flex-col justify-between overflow-hidden select-none"
        onClick={() => {
          if (isZoomedIn) {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
          } else {
            setUserToggledControls(prev => !prev);
          }
        }}
      >
        {/* --- Top Header Bar (Auto-hides on zoom > 1) --- */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3.5 z-50 transition-all duration-300 backdrop-blur-md bg-black/40 border-b border-white/10",
            showControls
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-8 pointer-events-none"
          )}
        >
          {/* Back & Info */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95 cursor-pointer"
              title="Close (Esc)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-bold tracking-tight">
                  {senderName || 'Photo'}
                </span>
                {images.length > 1 && (
                  <span className="px-2 py-0.5 rounded-full bg-white/15 text-white/90 text-[11px] font-mono font-medium">
                    {currentIndex + 1} / {images.length}
                  </span>
                )}
              </div>
              {formattedDate && (
                <p className="text-[10px] text-zinc-400 mt-0.5">{formattedDate}</p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setZoom(prev => Math.max(1, prev - 0.5))}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs transition cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-zinc-300 px-2 py-1 bg-white/5 rounded-lg hidden sm:inline">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(prev => Math.min(4, prev + 0.5))}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs transition cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            {zoom > 1 && (
              <button
                onClick={() => {
                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Reset Zoom (0)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <a
              href={currentImage}
              download={`photo-${currentIndex + 1}.jpg`}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1 text-xs font-bold"
              title="Download Image"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Save</span>
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95 cursor-pointer ml-1"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* --- Center Image Canvas --- */}
        <div
          className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden"
          onWheel={handleWheel}
        >
          {/* Previous Arrow */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              disabled={currentIndex === 0}
              className={cn(
                "absolute left-4 z-40 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 transition-all duration-300 shadow-xl cursor-pointer",
                currentIndex === 0 && "opacity-0 pointer-events-none",
                !showControls && "opacity-0 pointer-events-none -translate-x-6"
              )}
              title="Previous Photo (Left Arrow)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Main Photo with Pan & Zoom */}
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "w-full h-full flex items-center justify-center p-2 sm:p-6",
              isZoomedIn ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
            )}
            drag={isZoomedIn}
            dragConstraints={{ left: -1000, right: 1000, top: -1000, bottom: 1000 }}
            onDrag={(_, info) => {
              setOffset(prev => ({
                x: prev.x + info.delta.x,
                y: prev.y + info.delta.y
              }));
            }}
            onDoubleClick={handleDoubleTapOrClick}
          >
            {isImageLoading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="w-[320px] sm:w-[420px] aspect-[4/3] max-w-[85vw] max-h-[70vh] rounded-2xl overflow-hidden shadow-2xl">
                  <ImageSkeletonShimmer />
                </div>
              </div>
            )}
            <motion.img
              src={currentImage}
              alt={`Photo ${currentIndex + 1}`}
              onLoad={() => setIsImageLoading(false)}
              onError={() => setIsImageLoading(false)}
              style={{
                scale: zoom,
                x: offset.x,
                y: offset.y,
              }}
              className={cn(
                "max-w-full max-h-[82vh] object-contain rounded-xl shadow-2xl select-none pointer-events-auto transition-transform duration-100 ease-out",
                isImageLoading ? "opacity-0" : "opacity-100 transition-opacity duration-300"
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (isZoomedIn) {
                  // If zoomed in, tap toggles back to 1x
                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                } else {
                  setUserToggledControls(prev => !prev);
                }
              }}
            />
          </motion.div>

          {/* Next Arrow */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              disabled={currentIndex === images.length - 1}
              className={cn(
                "absolute right-4 z-40 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 transition-all duration-300 shadow-xl cursor-pointer",
                currentIndex === images.length - 1 && "opacity-0 pointer-events-none",
                !showControls && "opacity-0 pointer-events-none translate-x-6"
              )}
              title="Next Photo (Right Arrow)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Quick Zoom Indicator Floating Chip when zoomed in */}
          {isZoomedIn && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              className="absolute bottom-6 bg-black/70 hover:bg-black/90 text-white/90 px-4 py-2 rounded-full text-xs font-bold border border-white/20 backdrop-blur-md cursor-pointer transition flex items-center gap-2 shadow-2xl z-50 animate-fade-in"
              title="Click to zoom out"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{Math.round(zoom * 100)}% • Click to Zoom Out</span>
            </div>
          )}
        </div>

        {/* --- Bottom Thumbnail Carousel Strip (Auto-hides on zoom > 1) --- */}
        {images.length > 1 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "w-full px-4 py-3.5 z-50 transition-all duration-300 backdrop-blur-md bg-black/40 border-t border-white/10 flex items-center justify-center overflow-x-auto scrollbar-none",
              showControls
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 translate-y-8 pointer-events-none"
            )}
          >
            <div className="flex items-center gap-2.5 max-w-full">
              {images.map((thumbUrl, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(idx);
                    }}
                    className={cn(
                      "w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 transition-all duration-200 cursor-pointer relative",
                      isActive
                        ? "ring-2 ring-[#EF8020] scale-110 shadow-lg brightness-110"
                        : "opacity-50 hover:opacity-100 brightness-90 hover:scale-105"
                    )}
                  >
                    <img
                      src={thumbUrl}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {isActive && (
                      <div className="absolute inset-0 border-2 border-white/40 rounded-xl" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
