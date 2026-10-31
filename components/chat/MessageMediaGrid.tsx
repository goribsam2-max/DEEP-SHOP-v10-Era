import React from 'react';
import { EyeOff, Maximize2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ProgressiveImage } from './ProgressiveImage';

export interface MessageMediaGridProps {
  images: string[];
  thumbnailSrcs?: string[];
  messageId: string;
  isMe: boolean;
  dataSaverMode?: boolean;
  loadedImages?: Record<string, boolean>;
  onLoadImage?: (key: string) => void;
  onImageClick: (imgUrl: string, index: number, allImages: string[]) => void;
}

export const MessageMediaGrid: React.FC<MessageMediaGridProps> = ({
  images,
  thumbnailSrcs,
  messageId,
  dataSaverMode = false,
  loadedImages = {},
  onLoadImage,
  onImageClick,
}) => {
  if (!images || images.length === 0) return null;

  // Single Photo Hero Frame
  if (images.length === 1) {
    const imgUrl = images[0];
    const isLoaded = !dataSaverMode || loadedImages[`${messageId}-0`];

    return (
      <div className="rounded-[18px] overflow-hidden relative w-[248px] sm:w-[292px] max-w-full ring-1 ring-black/8 dark:ring-white/10 select-none group/img">
        {isLoaded ? (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onImageClick(imgUrl, 0, images);
            }}
            className="cursor-pointer overflow-hidden rounded-[18px] w-full min-h-[170px] max-h-[360px] bg-zinc-100 dark:bg-zinc-900 relative"
          >
            <ProgressiveImage
              src={imgUrl}
              thumbnailSrc={thumbnailSrcs?.[0]}
              alt="Photo"
              containerClassName="w-full h-full min-h-[170px] max-h-[360px]"
              className="max-h-[360px] transition-transform duration-300 ease-out group-hover/img:scale-[1.02]"
            />
            <div className="absolute bottom-2.5 right-2.5 w-7 h-7 rounded-full bg-black/45 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none">
              <Maximize2 className="w-3.5 h-3.5" />
            </div>
          </div>
        ) : (
          <div className="w-60 h-36 bg-zinc-100 dark:bg-zinc-900 flex flex-col items-center justify-center p-4 text-center gap-2 rounded-[18px]">
            <EyeOff className="w-5 h-5 text-zinc-400" />
            <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">
              Photo paused by Data Saver
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadImage?.(`${messageId}-0`);
              }}
              className="px-3.5 py-1.5 rounded-full msg-accent-btn text-white text-xs font-semibold hover:brightness-110 transition cursor-pointer"
            >
              Load photo
            </button>
          </div>
        )}
      </div>
    );
  }

  // 2 Photos: Crisp 2-Column Collage
  if (images.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-1 w-[248px] sm:w-[292px] max-w-full rounded-[18px] overflow-hidden ring-1 ring-black/8 dark:ring-white/10 select-none">
        {images.map((imgUrl, idx) => {
          const isLoaded = !dataSaverMode || loadedImages[`${messageId}-${idx}`];
          return (
            <div
              key={idx}
              className="relative aspect-square overflow-hidden cursor-pointer group/item bg-zinc-100 dark:bg-zinc-900"
              onClick={(e) => {
                e.stopPropagation();
                onImageClick(imgUrl, idx, images);
              }}
            >
              {isLoaded ? (
                <ProgressiveImage
                  src={imgUrl}
                  thumbnailSrc={thumbnailSrcs?.[idx]}
                  alt={`Photo ${idx + 1}`}
                  containerClassName="w-full h-full"
                  className="transition-transform duration-300 group-hover/item:scale-105"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-900 p-2 text-center gap-1.5">
                  <EyeOff className="w-4 h-4 text-zinc-400" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLoadImage?.(`${messageId}-${idx}`);
                    }}
                    className="px-2.5 py-1 rounded-full msg-accent-btn text-white text-[10px] font-semibold cursor-pointer"
                  >
                    Load
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // 3 Photos: 1 Hero + 2 Square Below
  if (images.length === 3) {
    return (
      <div className="flex flex-col gap-1 w-[248px] sm:w-[292px] max-w-full rounded-[18px] overflow-hidden ring-1 ring-black/8 dark:ring-white/10 select-none">
        <div
          className="relative aspect-[16/10] overflow-hidden cursor-pointer group/item bg-zinc-100 dark:bg-zinc-900"
          onClick={(e) => {
            e.stopPropagation();
            onImageClick(images[0], 0, images);
          }}
        >
          <ProgressiveImage
            src={images[0]}
            thumbnailSrc={thumbnailSrcs?.[0]}
            alt="Photo 1"
            containerClassName="w-full h-full"
            className="transition-transform duration-300 group-hover/item:scale-105"
          />
        </div>
        <div className="grid grid-cols-2 gap-1">
          {images.slice(1).map((imgUrl, i) => {
            const idx = i + 1;
            return (
              <div
                key={idx}
                className="relative aspect-square overflow-hidden cursor-pointer group/item bg-zinc-100 dark:bg-zinc-900"
                onClick={(e) => {
                  e.stopPropagation();
                  onImageClick(imgUrl, idx, images);
                }}
              >
                <ProgressiveImage
                  src={imgUrl}
                  thumbnailSrc={thumbnailSrcs?.[idx]}
                  alt={`Photo ${idx + 1}`}
                  containerClassName="w-full h-full"
                  className="transition-transform duration-300 group-hover/item:scale-105"
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 4+ Photos: 2x2 Grid with Clean +N Overlay
  const displayImages = images.slice(0, 4);
  const remainingCount = images.length - 4;

  return (
    <div className="grid grid-cols-2 gap-1 w-[248px] sm:w-[292px] max-w-full rounded-[18px] overflow-hidden ring-1 ring-black/8 dark:ring-white/10 select-none">
      {displayImages.map((imgUrl, idx) => {
        const isLastItem = idx === 3 && remainingCount > 0;
        return (
          <div
            key={idx}
            className="relative aspect-square overflow-hidden cursor-pointer group/item bg-zinc-100 dark:bg-zinc-900"
            onClick={(e) => {
              e.stopPropagation();
              onImageClick(imgUrl, idx, images);
            }}
          >
            <ProgressiveImage
              src={imgUrl}
              thumbnailSrc={thumbnailSrcs?.[idx]}
              alt={`Photo ${idx + 1}`}
              containerClassName="w-full h-full"
              className={cn(
                'transition-transform duration-300',
                !isLastItem && 'group-hover/item:scale-105'
              )}
            />
            {isLastItem && (
              <div className="absolute inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center transition-colors group-hover/item:bg-black/65">
                <span className="text-white text-lg font-bold tabular-nums tracking-tight">
                  +{remainingCount}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MessageMediaGrid;
