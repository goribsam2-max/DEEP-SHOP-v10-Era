import React from 'react';
import { EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ProgressiveImage } from './ProgressiveImage';

interface MessageMediaGridProps {
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
  isMe,
  dataSaverMode = false,
  loadedImages = {},
  onLoadImage,
  onImageClick,
}) => {
  if (!images || images.length === 0) return null;

  // Single Image (Hero display)
  if (images.length === 1) {
    const imgUrl = images[0];
    const isLoaded = !dataSaverMode || loadedImages[`${messageId}-0`];

    return (
      <div className="rounded-2xl overflow-hidden relative w-[250px] sm:w-[290px] max-w-full shadow-sm select-none group/img">
        {isLoaded ? (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onImageClick(imgUrl, 0, images);
            }}
            className="cursor-pointer overflow-hidden rounded-2xl w-full min-h-[180px] max-h-[360px] bg-zinc-100 dark:bg-zinc-900"
          >
            <ProgressiveImage
              src={imgUrl}
              thumbnailSrc={thumbnailSrcs?.[0]}
              alt="Photo"
              containerClassName="w-full h-full min-h-[180px] max-h-[360px]"
              className="max-h-[360px] transition-transform duration-300 group-hover/img:scale-[1.02]"
            />
          </div>
        ) : (
          <div className="w-56 h-36 bg-zinc-800/80 backdrop-blur-md flex flex-col items-center justify-center p-3 text-center gap-1.5 rounded-2xl border border-zinc-700/50">
            <EyeOff className="w-5 h-5 text-zinc-400" />
            <p className="text-[10px] text-zinc-300 font-bold">Image hidden (Data Saver)</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadImage?.(`${messageId}-0`);
              }}
              className="px-2.5 py-1 rounded-full bg-[#EF8020] text-white text-[9px] font-black uppercase hover:bg-[#EF8020]/90 transition cursor-pointer"
            >
              Load Image
            </button>
          </div>
        )}
      </div>
    );
  }

  // 2 Images: Side-by-side grid
  if (images.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-1.5 w-[250px] sm:w-[290px] max-w-full rounded-2xl overflow-hidden select-none">
        {images.map((imgUrl, idx) => {
          const isLoaded = !dataSaverMode || loadedImages[`${messageId}-${idx}`];
          return (
            <div
              key={idx}
              className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group/item bg-zinc-100 dark:bg-zinc-900"
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
                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800 p-2 text-center">
                  <EyeOff className="w-4 h-4 text-zinc-400" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLoadImage?.(`${messageId}-${idx}`);
                    }}
                    className="mt-1 px-2 py-0.5 rounded-full bg-[#EF8020] text-white text-[8px] font-bold cursor-pointer"
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

  // 3 Images: 1 big on top, 2 below
  if (images.length === 3) {
    return (
      <div className="flex flex-col gap-1.5 w-[250px] sm:w-[290px] max-w-full rounded-2xl overflow-hidden select-none">
        {/* Top large image */}
        <div
          className="relative aspect-[16/10] rounded-xl overflow-hidden cursor-pointer group/item bg-zinc-100 dark:bg-zinc-900"
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
        {/* Bottom 2 images */}
        <div className="grid grid-cols-2 gap-1.5">
          {images.slice(1).map((imgUrl, i) => {
            const idx = i + 1;
            return (
              <div
                key={idx}
                className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group/item bg-zinc-100 dark:bg-zinc-900"
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

  // 4 or More Images: 2x2 Grid with +N overlay on 4th item
  const displayImages = images.slice(0, 4);
  const remainingCount = images.length - 4;

  return (
    <div className="grid grid-cols-2 gap-1.5 w-[250px] sm:w-[290px] max-w-full rounded-2xl overflow-hidden select-none">
      {displayImages.map((imgUrl, idx) => {
        const isLastItem = idx === 3 && remainingCount > 0;
        return (
          <div
            key={idx}
            className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group/item bg-zinc-100 dark:bg-zinc-900"
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
                "transition-transform duration-300",
                !isLastItem && "group-hover/item:scale-105"
              )}
            />
            {isLastItem && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center transition-all group-hover/item:bg-black/70">
                <span className="text-white text-xl font-black tracking-tight drop-shadow-md">
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
