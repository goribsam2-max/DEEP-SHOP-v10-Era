import React, { useEffect, useRef } from 'react';
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
  Check
} from 'lucide-react';

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
  };
  postId: string;
  isPostOwner: boolean;
  isCommentOwner: boolean;
  isAdmin: boolean;
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
  postId,
  isPostOwner,
  isCommentOwner,
  isAdmin,
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

  if (!isOpen || !comment) return null;

  const canPin = isPostOwner || isAdmin;
  const canDelete = isCommentOwner || isPostOwner || isAdmin;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[220000] flex items-center justify-center p-4">
        {/* Dimmed backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/65 backdrop-blur-md"
        />

        {/* Content Box */}
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, scale: 0.9, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative z-10 w-[270px] sm:w-[280px] max-w-full flex flex-col items-center gap-2.5"
        >
          {/* Highlighted Comment Preview */}
          <div className="w-full bg-zinc-900/90 border border-white/15 rounded-2xl p-3 shadow-2xl text-white">
            <div className="flex items-center gap-2 mb-1">
              {comment.userAvatar ? (
                <img
                  src={comment.userAvatar}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover border border-white/20"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold">
                  {comment.userName?.charAt(0) || 'U'}
                </div>
              )}
              <span className="text-xs font-semibold text-zinc-200 truncate">
                {comment.userName || 'User'}
              </span>
              {comment.isPinned && (
                <span className="ml-auto text-[10px] text-amber-400 font-medium flex items-center gap-0.5">
                  <Pin className="w-2.5 h-2.5 fill-amber-400" /> Pinned
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-100 line-clamp-2 leading-relaxed">
              {comment.text}
            </p>
          </div>

          {/* Frosted Glass Menu Options matching IMG_5381 */}
          <div className="w-full bg-zinc-900/90 border border-white/15 rounded-[26px] p-1.5 shadow-2xl backdrop-blur-2xl flex flex-col divide-y divide-white/5 overflow-hidden">
            <div className="flex flex-col py-0.5">
              {canPin && onPinToggle && (
                <button
                  type="button"
                  onClick={() => {
                    onPinToggle(comment.id, Boolean(comment.isPinned));
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-white hover:bg-white/10 active:bg-white/15 rounded-xl transition-colors text-left"
                >
                  <Pin className={`w-4 h-4 ${comment.isPinned ? 'text-amber-400 fill-amber-400' : 'text-zinc-200'}`} />
                  <span>{comment.isPinned ? 'Unpin' : 'Pin'}</span>
                </button>
              )}

              {onReplyWithReel && (
                <button
                  type="button"
                  onClick={() => {
                    onReplyWithReel(comment);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-white hover:bg-white/10 active:bg-white/15 rounded-xl transition-colors text-left"
                >
                  <Film className="w-4 h-4 text-zinc-200" />
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
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-white hover:bg-white/10 active:bg-white/15 rounded-xl transition-colors text-left"
                >
                  <PlusCircle className="w-4 h-4 text-zinc-200" />
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
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-white hover:bg-white/10 active:bg-white/15 rounded-xl transition-colors text-left"
                >
                  <Share2 className="w-4 h-4 text-zinc-200" />
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
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-white hover:bg-white/10 active:bg-white/15 rounded-xl transition-colors text-left"
                >
                  <EyeOff className="w-4 h-4 text-zinc-200" />
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
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-white hover:bg-white/10 active:bg-white/15 rounded-xl transition-colors text-left"
                >
                  <UserX className="w-4 h-4 text-zinc-200" />
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
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-[#FF3040] hover:bg-red-500/10 active:bg-red-500/20 rounded-xl transition-colors text-left"
                >
                  <AlertTriangle className="w-4 h-4 text-[#FF3040]" />
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
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-[#FF3040] hover:bg-red-500/10 active:bg-red-500/20 rounded-xl transition-colors text-left"
                >
                  <Trash2 className="w-4 h-4 text-[#FF3040]" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/** Hook for Long Press on Mobile/Desktop */
export function useCommentLongPress(
  callback: (e: React.SyntheticEvent) => void,
  ms = 380
) {
  const timerRef = useRef<any>(null);
  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const start = (e: React.SyntheticEvent) => {
    const clientX = 'touches' in e ? (e as any).touches[0]?.clientX : (e as any).clientX;
    const clientY = 'touches' in e ? (e as any).touches[0]?.clientY : (e as any).clientY;
    startPos.current = { x: clientX || 0, y: clientY || 0 };

    timerRef.current = setTimeout(() => {
      callback(e);
    }, ms);
  };

  const clear = (e?: React.SyntheticEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const move = (e: React.SyntheticEvent) => {
    if (!timerRef.current) return;
    const clientX = 'touches' in e ? (e as any).touches[0]?.clientX : (e as any).clientX;
    const clientY = 'touches' in e ? (e as any).touches[0]?.clientY : (e as any).clientY;
    if (clientX && clientY) {
      const dx = Math.abs(clientX - startPos.current.x);
      const dy = Math.abs(clientY - startPos.current.y);
      if (dx > 8 || dy > 8) {
        clear();
      }
    }
  };

  return {
    onPointerDown: start,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerMove: move,
    onContextMenu: (e: React.SyntheticEvent) => {
      e.preventDefault();
      clear();
      callback(e);
    },
  };
}
