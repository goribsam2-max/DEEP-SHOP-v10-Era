import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pin } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  MsgCopyIcon,
  MsgForwardIcon,
  MsgPlusIcon,
  MsgReplyIcon,
  MsgTrashIcon,
} from './MessagesSvgIcons';

const QUICK_REACTIONS = ['🔥', '🙌', '😭', '🙈', '🙏', '🫡', '✨'];
const EXTENDED_REACTIONS = [
  '🔥', '🙌', '😭', '🙈', '🙏', '🫡', '✨',
  '❤️', '👍', '😂', '🥰', '😮', '😢', '😡',
  '👏', '🎉', '💯', '👀', '⭐', '🤩', '🚀',
];

interface MessageHoldPopupProps {
  isOpen: boolean;
  message: any | null;
  currentUserId?: string;
  canPin?: boolean;
  isPinned?: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onCopy: () => void;
  onReply: () => void;
  onForward: () => void;
  onDelete: () => void;
  onTogglePin?: () => void;
}

export const MessageHoldPopup: React.FC<MessageHoldPopupProps> = ({
  isOpen,
  message,
  currentUserId,
  canPin = false,
  isPinned = false,
  onClose,
  onReact,
  onCopy,
  onReply,
  onForward,
  onDelete,
  onTogglePin,
}) => {
  const [showAllEmojis, setShowAllEmojis] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShowAllEmojis(false);
    }
  }, [isOpen]);

  const myReaction = currentUserId && message?.reactions ? message.reactions[currentUserId] : null;
  const previewImage = message?.images?.[0] || message?.imageUrl || null;
  const previewText =
    message?.text?.trim() ||
    (previewImage ? 'Photo attachment' : message?.audioUrl ? 'Voice message' : 'Message');

  return (
    <AnimatePresence>
      {isOpen && message && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          className="msg-v2-popup fixed inset-0 z-[9500] bg-black/15 dark:bg-black/55 backdrop-blur-[6px] flex items-end sm:items-center justify-center p-4 pb-7 sm:p-6 select-none"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 430, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[364px] bg-white dark:bg-[#181A22] rounded-[28px] p-4 shadow-[0_24px_64px_rgba(15,23,42,0.16)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.65)] border border-black/[0.04] dark:border-white/10"
          >
            {/* 1. Quoted Message Box at Top matching IMG_5359 right */}
            <div className="bg-[#F4F5F7] dark:bg-white/[0.06] rounded-[18px] px-4 py-3 mb-3.5 flex items-start justify-between gap-2.5 text-left">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {previewImage && (
                  <img
                    src={previewImage}
                    alt=""
                    className="w-10 h-10 rounded-xl object-cover shrink-0 border border-black/5 dark:border-white/10"
                  />
                )}
                <p className="text-[13.5px] leading-[1.46] text-zinc-800 dark:text-zinc-200 line-clamp-3 break-words">
                  {previewText}
                </p>
              </div>

              {canPin && onTogglePin && (
                <button
                  type="button"
                  onClick={() => {
                    onTogglePin();
                    onClose();
                  }}
                  title={isPinned ? 'Unpin message' : 'Pin message'}
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition cursor-pointer',
                    isPinned
                      ? 'bg-[#2F80ED]/15 text-[#2F80ED]'
                      : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10'
                  )}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 2. React Section matching IMG_5359 right */}
            <div className="px-0.5 mb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12.5px] font-medium text-zinc-600 dark:text-zinc-400">
                  React
                </span>
                {showAllEmojis && (
                  <button
                    type="button"
                    onClick={() => setShowAllEmojis(false)}
                    className="text-xs font-semibold text-[#2F80ED] cursor-pointer"
                  >
                    Less
                  </button>
                )}
              </div>

              {showAllEmojis ? (
                <div className="grid grid-cols-7 gap-1.5 py-1 max-h-[136px] overflow-y-auto no-scrollbar">
                  {EXTENDED_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onReact(emoji);
                        onClose();
                      }}
                      className={cn(
                        'h-9 rounded-xl flex items-center justify-center text-[22px] hover:scale-120 active:scale-95 transition-transform cursor-pointer',
                        myReaction === emoji && 'bg-[#2F80ED]/15 ring-1 ring-[#2F80ED]/40'
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-1">
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onReact(emoji);
                        onClose();
                      }}
                      className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center text-[23px] hover:scale-125 active:scale-90 transition-transform cursor-pointer',
                        myReaction === emoji && 'bg-[#2F80ED]/15 ring-1 ring-[#2F80ED]/40'
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowAllEmojis(true)}
                    className="w-8 h-8 rounded-full bg-[#F2F4F7] dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/15 flex items-center justify-center text-zinc-700 dark:text-zinc-300 transition shrink-0 cursor-pointer"
                    title="More reactions"
                  >
                    <MsgPlusIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* 3. Divided Action List (Label left, exact custom SVG icon right — 1:1 with IMG_5359 right) */}
            <div className="divide-y divide-zinc-100 dark:divide-white/[0.07] mt-1">
              <button
                type="button"
                onClick={() => {
                  onCopy();
                  onClose();
                }}
                className="w-full flex items-center justify-between py-3.5 px-1.5 hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition text-left cursor-pointer"
              >
                <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                  Copy
                </span>
                <MsgCopyIcon className="w-[20px] h-[20px] text-zinc-800 dark:text-zinc-300" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onReply();
                  onClose();
                }}
                className="w-full flex items-center justify-between py-3.5 px-1.5 hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition text-left cursor-pointer"
              >
                <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                  Reply
                </span>
                <MsgReplyIcon className="w-[20px] h-[20px] text-zinc-800 dark:text-zinc-300" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onForward();
                  onClose();
                }}
                className="w-full flex items-center justify-between py-3.5 px-1.5 hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition text-left cursor-pointer"
              >
                <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                  Forward
                </span>
                <MsgForwardIcon className="w-[20px] h-[20px] text-zinc-800 dark:text-zinc-300" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="w-full flex items-center justify-between pt-3.5 pb-1.5 px-1.5 hover:bg-rose-50/60 dark:hover:bg-rose-950/20 transition text-left cursor-pointer group"
              >
                <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                  Delete
                </span>
                <MsgTrashIcon className="w-[20px] h-[20px] text-zinc-800 dark:text-zinc-300 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
