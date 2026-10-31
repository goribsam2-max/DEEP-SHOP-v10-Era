import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ImageSkeletonShimmer } from './ProgressiveImage';

export interface ChatMediaGalleryModalProps {
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

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, images.length - 1)));
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setUserToggledControls(true);
      setIsImageLoading(true);
    }
  }, [isOpen, initialIndex, images.length]);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setIsImageLoading(true);
  }, [currentIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : prev));
      } else if (e.key === '+' || e.key === '=') {
        setZoom((prev) => Math.min(4, prev + 0.5));
      } else if (e.key === '-') {
        setZoom((prev) => {
          const next = Math.max(1, prev - 0.5);
          if (next === 1) setOffset({ x: 0, y: 0 });
          return next;
        });
      } else if (e.key === '0') {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, images.length, onClose]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleDoubleTapOrClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (zoom > 1) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    } else {
      setZoom(2.4);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((prev) => Math.min(4, prev + 0.25));
    } else {
      setZoom((prev) => {
        const next = Math.max(1, prev - 0.25);
        if (next === 1) setOffset({ x: 0, y: 0 });
        return next;
      });
    }
  };

  const isZoomedIn = zoom > 1;
  const showControls = !isZoomedIn && userToggledControls;

  const formattedDate = timestamp
    ? new Date(
        typeof timestamp.toMillis === 'function'
          ? timestamp.toMillis()
          : timestamp?.seconds
          ? timestamp.seconds * 1000
          : timestamp
      ).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  const initialLetter = (senderName || 'P')[0]?.toUpperCase() || 'P';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[60000] bg-zinc-950/96 backdrop-blur-2xl flex flex-col justify-between overflow-hidden select-none"
        onClick={() => {
          if (isZoomedIn) {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
          } else {
            setUserToggledControls((prev) => !prev);
          }
        }}
      >
        {/* Floating Top Glass Bar */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'w-full flex items-center justify-between px-4 sm:px-6 py-3.5 z-50 transition-all duration-300 bg-gradient-to-b from-black/80 via-black/45 to-transparent',
            showControls
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 -translate-y-6 pointer-events-none'
          )}
        >
          {/* Left: Back + Sender Details */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0"
              title="Back (Esc)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="w-9 h-9 rounded-full bg-white/12 border border-white/15 flex items-center justify-center text-white text-xs font-bold shrink-0 hidden sm:flex">
              {initialLetter}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white text-sm sm:text-[15px] font-semibold tracking-tight truncate">
                  {senderName || 'Shared Photo'}
                </span>
                {images.length > 1 && (
                  <span className="text-white/60 text-xs tabular-nums shrink-0">
                    · {currentIndex + 1} of {images.length}
                  </span>
                )}
              </div>
              {formattedDate && (
                <p className="text-[11px] text-zinc-400 tabular-nums mt-0.5 truncate">
                  {formattedDate}
                </p>
              )}
            </div>
          </div>

          {/* Right: Save & Close */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={currentImage}
              download={`message-photo-${currentIndex + 1}.jpg`}
              target="_blank"
              rel="noreferrer"
              className="h-10 px-4 rounded-full msg-accent-btn hover:brightness-110 text-white transition flex items-center gap-2 text-xs font-semibold shadow-lg"
              title="Save photo"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Save Photo</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Photo Stage */}
        <div
          className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden"
          onWheel={handleWheel}
        >
          {/* Previous Photo Button */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              disabled={currentIndex === 0}
              className={cn(
                'absolute left-3 sm:left-6 z-40 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/15 flex items-center justify-center transition-all duration-200 shadow-2xl cursor-pointer',
                currentIndex === 0 && 'opacity-0 pointer-events-none',
                !showControls && 'opacity-0 pointer-events-none -translate-x-4'
              )}
              title="Previous photo"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Interactive Pan & Zoom Canvas */}
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={cn(
              'w-full h-full flex items-center justify-center px-3 sm:px-12 py-2',
              isZoomedIn ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
            )}
            drag={isZoomedIn}
            dragConstraints={{ left: -900, right: 900, top: -900, bottom: 900 }}
            onDrag={(_, info) => {
              setOffset((prev) => ({
                x: prev.x + info.delta.x,
                y: prev.y + info.delta.y,
              }));
            }}
            onDoubleClick={handleDoubleTapOrClick}
          >
            {isImageLoading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="w-[300px] sm:w-[420px] aspect-[4/3] max-w-[85vw] max-h-[70vh] rounded-3xl overflow-hidden shadow-2xl">
                  <ImageSkeletonShimmer />
                </div>
              </div>
            )}

            <motion.img
              src={currentImage}
              alt={`Photo ${currentIndex + 1}`}
              onLoad={() => setIsImageLoading(false)}
              onError={() => setIsImageLoading(false)}
              animate={{
                scale: zoom,
                x: offset.x,
                y: offset.y,
              }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className={cn(
                'max-w-full max-h-[78vh] object-contain rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.65)] select-none pointer-events-auto',
                isImageLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-200'
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (isZoomedIn) {
                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                } else {
                  setUserToggledControls((prev) => !prev);
                }
              }}
            />
          </motion.div>

          {/* Next Photo Button */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              disabled={currentIndex === images.length - 1}
              className={cn(
                'absolute right-3 sm:right-6 z-40 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/15 flex items-center justify-center transition-all duration-200 shadow-2xl cursor-pointer',
                currentIndex === images.length - 1 && 'opacity-0 pointer-events-none',
                !showControls && 'opacity-0 pointer-events-none translate-x-4'
              )}
              title="Next photo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Reset Zoom Chip When Zoomed In */}
          {isZoomedIn && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              className="absolute bottom-6 bg-zinc-900/85 hover:bg-zinc-900 text-white px-4 py-2 rounded-full text-xs font-semibold border border-white/15 backdrop-blur-xl cursor-pointer transition flex items-center gap-2 shadow-2xl z-50"
              title="Reset zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="tabular-nums">{Math.round(zoom * 100)}% · Reset view</span>
            </button>
          )}
        </div>

        {/* Floating Bottom Controls & Thumbnail Filmstrip */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'w-full px-4 pb-5 pt-2 z-50 transition-all duration-300 bg-gradient-to-t from-black/85 via-black/45 to-transparent flex flex-col items-center gap-3',
            showControls
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-6 pointer-events-none'
          )}
        >
          {/* Interactive Zoom Capsule */}
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 backdrop-blur-xl border border-white/12 shadow-lg">
            <button
              type="button"
              onClick={() =>
                setZoom((prev) => {
                  const next = Math.max(1, prev - 0.5);
                  if (next === 1) setOffset({ x: 0, y: 0 });
                  return next;
                })
              }
              className="w-8 h-8 rounded-full hover:bg-white/15 text-white flex items-center justify-center transition cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <span className="px-2.5 text-xs font-mono tabular-nums text-white/90 font-medium">
              {Math.round(zoom * 100)}%
            </span>

            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(4, prev + 0.5))}
              className="w-8 h-8 rounded-full hover:bg-white/15 text-white flex items-center justify-center transition cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Filmstrip Thumbnails for Multi-Photo Messages */}
          {images.length > 1 && (
            <div className="flex items-center gap-2 max-w-full overflow-x-auto no-scrollbar py-1 px-2">
              {images.map((thumbUrl, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      'w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden shrink-0 transition-all duration-200 cursor-pointer relative',
                      isActive
                        ? 'ring-2 ring-[#1877F2] scale-105 opacity-100 shadow-lg'
                        : 'opacity-50 hover:opacity-90 scale-95 hover:scale-100'
                    )}
                  >
                    <img
                      src={thumbUrl}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
