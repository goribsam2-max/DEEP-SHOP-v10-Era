import React, { useState } from 'react';
import { X, Search, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatGifStickerModalProps {
  isOpen: boolean;
  type: 'gif' | 'sticker';
  onClose: () => void;
  onSelectMedia: (url: string, isSticker?: boolean) => void;
}

const POPULAR_GIFS = [
  { id: 'g1', title: 'Thumbs Up', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
  { id: 'g2', title: 'Thank You', url: 'https://media.giphy.com/media/osAcIGVgETAY8/giphy.gif' },
  { id: 'g3', title: 'Celebrate', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' },
  { id: 'g4', title: 'Laughing', url: 'https://media.giphy.com/media/xr9AQyxLtjlxS/giphy.gif' },
  { id: 'g5', title: 'Mind Blown', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
  { id: 'g6', title: 'Hello / Wave', url: 'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif' },
  { id: 'g7', title: 'Love / Hearts', url: 'https://media.giphy.com/media/26FLdm964upOuiqUE/giphy.gif' },
  { id: 'g8', title: 'Agreed / Yes', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif' },
  { id: 'g9', title: 'Deal Done', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' },
  { id: 'g10', title: 'Waiting', url: 'https://media.giphy.com/media/tXL4FHPSnVJ0A/giphy.gif' },
  { id: 'g11', title: 'Confused', url: 'https://media.giphy.com/media/g01ZnwAUvutuK8GIQn/giphy.gif' },
  { id: 'g12', title: 'Shopping Time', url: 'https://media.giphy.com/media/l0HFkA6omUyjVYqw8/giphy.gif' },
];

const POPULAR_STICKERS = [
  { id: 's1', name: 'Thumbs Up', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=thumbsup' },
  { id: 's2', name: 'Happy Star', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=happystar' },
  { id: 's3', name: 'Rocket', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=rocket' },
  { id: 's4', name: 'Party Cat', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=partycat' },
  { id: 's5', name: 'Love Bot', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=love' },
  { id: 's6', name: 'Cool Glasses', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=coolglasses' },
  { id: 's7', name: 'Gift Box', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=giftbox' },
  { id: 's8', name: 'Verified Shield', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=verifiedshield' },
  { id: 's9', name: 'Quick Delivery', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=delivery' },
  { id: 's10', name: 'Sale Fire', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=firedeal' },
  { id: 's11', name: '100% Legit', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=hundredpercent' },
  { id: 's12', name: 'Cash Handshake', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=handshake' },
];

export const ChatGifStickerModal: React.FC<ChatGifStickerModalProps> = ({
  isOpen,
  type,
  onClose,
  onSelectMedia,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const isGif = type === 'gif';
  const items = isGif ? POPULAR_GIFS : POPULAR_STICKERS;
  const filtered = searchQuery.trim()
    ? items.filter((item: any) =>
        (item.title || item.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

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
        </div>

        {/* Grid List */}
        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          <div className={`grid ${isGif ? 'grid-cols-2 gap-2.5' : 'grid-cols-3 sm:grid-cols-4 gap-3'}`}>
            {filtered.map((item: any) => (
              <div
                key={item.id}
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

          {filtered.length === 0 && (
            <div className="text-center py-12 text-zinc-400 text-xs">
              No {isGif ? 'GIFs' : 'stickers'} found for &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
