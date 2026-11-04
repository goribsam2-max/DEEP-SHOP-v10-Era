import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pin,
  Film,
  PlusCircle,
  Share2,
  EyeOff,
  UserX,
  AlertTriangle,
  Trash2,
  CornerUpLeft,
  Copy,
} from 'lucide-react';

const COMMENT_QUICK_EMOJIS = ['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂'];

export interface CommentContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  comment: {
    id: string;
    text: string;
    userName: string;
    userAvatar?: string;
    userId: string;
    isPinned?: boolean;
    createdAt?: any;
  } | null;
  postId: string;
  isPostOwner: boolean;
  isCommentOwner: boolean;
  isAdmin: boolean;
  onQuickReact?: (commentId: string, emoji: string) => void;
  onReply?: (comment: any) => void;
  onCopyText?: (text: string) => void;
  onPinToggle?: (commentId: string, currentPinned: boolean) => void;
  onReplyWithReel?: (comment: any) => void;
  onAddToStory?: (comment: any) => void;
  onShare?: (comment: any) => void;
  onRestrictUser?: (userId: string, userName: string) => void;
  onBlockUser?: (userId: string, userName: string) => void;
  onReportComment?: (comment: any) => void;
  onDeleteComment?: (commentId: string) => void;
  anchorPosition?: { x: number; y: number } | null;
}

export function LoopsCommentContextMenu({
  isOpen,
  onClose,
  comment,
  isPostOwner,
  isCommentOwner,
  isAdmin,
  onQuickReact,
  onReply,
  onCopyText,
  onPinToggle,
  onReplyWithReel,
  onAddToStory,
  onShare,
  onRestrictUser,
  onBlockUser,
  onReportComment,
  onDeleteComment,
}: CommentContextMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  const canPin = isPostOwner || isAdmin;
  const canDelete = isCommentOwner || isPostOwner || isAdmin;

  const handleCopy = () => {
    if (!comment?.text) return;
    if (onCopyText) {
      onCopyText(comment.text);
    } else {
      navigator.clipboard?.writeText(comment.text).catch(() => {});
    }
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && comment && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 select-none"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {/* Frosted Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/65 backdrop-blur-md"
          />

          {/* Floating Context Stack */}
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.9, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: 'spring', damping: 26, stiffness: 380 }}
            className="relative z-10 w-[296px] sm:w-[312px] max-w-[92vw] flex flex-col items-center gap-2.5"
          >
            {/* Quick Emoji Reaction Pill Bar */}
            {onQuickReact && (
              <motion.div
                initial={{ opacity: 0, scale: 0.86, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 24, stiffness: 420, delay: 0.02 }}
                className="w-full bg-zinc-900/95 border border-white/15 rounded-full px-2.5 py-1.5 shadow-2xl backdrop-blur-2xl flex items-center justify-between gap-0.5"
              >
                {COMMENT_QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onQuickReact(comment.id, emoji);
                      onClose();
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[20px] hover:scale-125 active:scale-95 transition-transform cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}

            {/* Highlighted Comment Preview */}
            <div className="w-full bg-zinc-900/95 border border-white/15 rounded-2xl p-3.5 shadow-2xl text-white">
              <div className="flex items-center gap-2 mb-1.5">
                {comment.userAvatar ? (
                  <img
                    src={comment.userAvatar}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-5 h-5 rounded-full object-cover border border-white/20 shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {(comment.userName || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-semibold text-zinc-100 truncate">
                  {comment.userName || 'User'}
                </span>
                {comment.isPinned && (
                  <span className="ml-auto text-[10px] text-amber-400 font-medium flex items-center gap-0.5 shrink-0">
                    <Pin className="w-2.5 h-2.5 fill-amber-400" /> Pinned
                  </span>
                )}
              </div>
              <p className="text-[13px] text-zinc-100 line-clamp-3 leading-relaxed break-words">
                {comment.text || 'Media comment'}
              </p>
            </div>

            {/* Frosted Action Menu */}
            <div className="w-full bg-zinc-900/95 border border-white/15 rounded-[24px] p-1.5 shadow-2xl backdrop-blur-2xl flex flex-col divide-y divide-white/10 overflow-hidden">
              <div className="flex flex-col py-0.5">
                {onReply && (
                  <button
                    type="button"
                    onClick={() => {
                      onReply(comment);
                      onClose();
                    }}
                    className="w-full min-h-[42px] flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-white hover:bg-white/10 active:bg-white/15 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <CornerUpLeft className="w-4 h-4 text-zinc-200 shrink-0" />
                    <span>Reply</span>
                  </button>
                )}

                {Boolean(comment.text) && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="w-full min-h-[42px] flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-white hover:bg-white/10 active:bg-white/15 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-zinc-200 shrink-0" />
                    <span>Copy text</span>
                  </button>
                )}

                {canPin && onPinToggle && (
                  <button
                    type="button"
                    onClick={() => {
                      onPinToggle(comment.id, Boolean(comment.isPinned));
                      onClose();
                    }}
                    className="w-full min-h-[42px] flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-white hover:bg-white/10 active:bg-white/15 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <Pin
                      className={`w-4 h-4 shrink-0 ${
                        comment.isPinned ? 'text-amber-400 fill-amber-400' : 'text-zinc-200'
                      }`}
                    />
                    <span>{comment.isPinned ? 'Unpin comment' : 'Pin comment'}</span>
                  </button>
                )}

                {onReplyWithReel && (
                  <button
                    type="button"
                    onClick={() => {
                      onReplyWithReel(comment);
                      onClose();
                    }}
                    className="w-full min-h-[42px] flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-white hover:bg-white/10 active:bg-white/15 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <Film className="w-4 h-4 text-zinc-200 shrink-0" />
                    <span>Reply with a reel</span>
                  </button>
                )}

                {onAddToStory && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddToStory(comment);
                      onClose();
                    }}
                    className="w-full min-h-[42px] flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-white hover:bg-white/10 active:bg-white/15 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-zinc-200 shrink-0" />
                    <span>Add to story</span>
                  </button>
                )}

                {onShare && (
                  <button
                    type="button"
                    onClick={() => {
                      onShare(comment);
                      onClose();
                    }}
                    className="w-full min-h-[42px] flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-white hover:bg-white/10 active:bg-white/15 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-zinc-200 shrink-0" />
                    <span>Share</span>
                  </button>
                )}

                {!isCommentOwner && onRestrictUser && (
                  <button
                    type="button"
                    onClick={() => {
                      onRestrictUser(comment.userId, comment.userName);
                      onClose();
                    }}
                    className="w-full min-h-[42px] flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-white hover:bg-white/10 active:bg-white/15 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <EyeOff className="w-4 h-4 text-zinc-200 shrink-0" />
                    <span>Restrict</span>
                  </button>
                )}

                {!isCommentOwner && onBlockUser && (
                  <button
                    type="button"
                    onClick={() => {
                      onBlockUser(comment.userId, comment.userName);
                      onClose();
                    }}
                    className="w-full min-h-[42px] flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-white hover:bg-white/10 active:bg-white/15 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <UserX className="w-4 h-4 text-zinc-200 shrink-0" />
                    <span>Block</span>
                  </button>
                )}

                {!isCommentOwner && onReportComment && (
                  <button
                    type="button"
                    onClick={() => {
                      onReportComment(comment);
                      onClose();
                    }}
                    className="w-full min-h-[42px] flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-[#FF3040] hover:bg-red-500/10 active:bg-red-500/20 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4 text-[#FF3040] shrink-0" />
                    <span>Report</span>
                  </button>
                )}

                {canDelete && onDeleteComment && (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteComment(comment.id);
                      onClose();
                    }}
                    className="w-full min-h-[42px] flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-[#FF3040] hover:bg-red-500/10 active:bg-red-500/20 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-[#FF3040] shrink-0" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** Reliable cross-device Long-Press Hook for Mobile Touch & Desktop Pointer */
export function useCommentLongPress(
  callback: (e: React.SyntheticEvent) => void,
  ms = 360
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const firedRef = useRef(false);

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const begin = (e: React.SyntheticEvent, x: number, y: number) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, a, input, textarea')) {
      return;
    }
    firedRef.current = false;
    startPos.current = { x, y };
    clear();
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      timerRef.current = null;
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
          navigator.vibrate(14);
        } catch {}
      }
      callback(e);
    }, ms);
  };

  const trackMove = (x: number, y: number) => {
    if (!timerRef.current) return;
    if (
      Math.abs(x - startPos.current.x) > 12 ||
      Math.abs(y - startPos.current.y) > 12
    ) {
      clear();
    }
  };

  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      begin(e, e.clientX, e.clientY);
    },
    onPointerMove: (e: React.PointerEvent) => {
      trackMove(e.clientX, e.clientY);
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      if (!t || timerRef.current) return;
      begin(e, t.clientX, t.clientY);
    },
    onTouchMove: (e: React.TouchEvent) => {
      const t = e.touches[0];
      if (t) trackMove(t.clientX, t.clientY);
    },
    onTouchEnd: clear,
    onTouchCancel: clear,
    onContextMenu: (e: React.MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea')) return;
      e.preventDefault();
      e.stopPropagation();
      clear();
      if (!firedRef.current) {
        callback(e);
      }
    },
  };
}
