import React, { useState, useEffect } from 'react';
import { X, Search, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatGifStickerModalProps {
  isOpen: boolean;
  type: 'gif' | 'sticker';
  onClose: () => void;
  onSelectMedia: (url: string, isSticker?: boolean) => void;
}

const GIPHY_API_KEY = 'dfU9Rj78ULWD8qWnvDuIXBWpnpawi6tl';

export const ChatGifStickerModal: React.FC<ChatGifStickerModalProps> = ({
  isOpen,
  type,
  onClose,
  onSelectMedia,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const isGif = type === 'gif';

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (isGif) {
          const endpoint = debouncedQuery.trim()
            ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(debouncedQuery)}&limit=24&rating=g`
            : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=g`;
          
          const res = await fetch(endpoint);
          const data = await res.json();
          if (data?.data) {
            setResults(data.data.map((gif: any) => ({
              id: gif.id,
              title: gif.title,
              url: gif.images.fixed_height.url
            })));
          }
        } else {
          // EmojiHub for Stickers
          // Since EmojiHub is large, we fetch all once and filter if searching
          // Or use their category API
          const res = await fetch('https://emojihub.yurace.pro/api/all');
          const data = await res.json();
          
          if (Array.isArray(data)) {
            let mapped = data.map((item: any, idx: number) => {
              // Extract the character from unicode or just use the first htmlCode
              // Usually unicode is like ["U+1F600"]
              const charCode = item.unicode[0].replace('U+', '0x');
              const emoji = String.fromCodePoint(parseInt(charCode, 16));
              return {
                id: `emoji-${idx}`,
                name: item.name,
                url: `https://emojicdn.elk.sh/${emoji}?style=microsoft`, // Microsoft style looks like stickers
                emoji: emoji
              };
            });

            if (debouncedQuery.trim()) {
              const q = debouncedQuery.toLowerCase();
              mapped = mapped.filter(item => item.name.toLowerCase().includes(q));
            }
            
            setResults(mapped.slice(0, 48));
          }
        }
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isOpen, debouncedQuery, isGif]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10010] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="w-full max-w-lg bg-white dark:bg-[#121214] rounded-t-3xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
      >
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto my-3" />

        {/* Header */}
        <div className="px-5 pb-3 flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
          <h3 className="font-bold text-base text-zinc-900 dark:text-white capitalize">
            {isGif ? 'Search GIFs' : 'Sticker Collection'}
          </h3>
          <div className="w-9" />
        </div>

        {/* Search Bar */}
        <div className="p-4 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
            <Search className="w-4 h-4 text-zinc-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isGif ? 'Search GIFs...' : 'Search stickers...'}
              className="w-full bg-transparent text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none"
            />
            {(searchQuery || isLoading) && (
              <div className="flex items-center">
                {isLoading && <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin mr-1.5" />}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Grid List */}
        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          {isLoading && results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 text-[#F246F5] animate-spin" />
              <p className="text-xs text-zinc-500 font-medium">Loading collection...</p>
            </div>
          ) : (
            <div className={`grid ${isGif ? 'grid-cols-2 gap-2.5' : 'grid-cols-3 sm:grid-cols-4 gap-3'}`}>
              {results.map((item: any, index: number) => (
                <div
                  key={`${item.id || index}-${index}`}
                  onClick={() => {
                    onSelectMedia(item.url, !isGif);
                    onClose();
                  }}
                  className={`relative rounded-2xl overflow-hidden cursor-pointer group transition transform active:scale-95 ${
                    isGif
                      ? 'h-32 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800'
                      : 'p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-blue-500/50 flex flex-col items-center justify-center'
                  }`}
                >
                  <img
                    src={item.url}
                    alt={item.title || item.name}
                    className={`${isGif ? 'w-full h-full object-cover group-hover:scale-105' : 'w-16 h-16 object-contain'} transition-transform duration-200`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 text-center truncate w-full mt-1.5 px-1 block">
                    {item.title || item.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!isLoading && results.length === 0 && (
            <div className="text-center py-12 text-zinc-400 text-xs">
              No {isGif ? 'GIFs' : 'stickers'} found
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

