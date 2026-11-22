import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Icon from '../Icon';
import { MsgReplyIcon } from './MessagesSvgIcons';
import { triggerHaptic } from '../../lib/haptics';
import { cn } from '../../lib/utils';

interface SwipeableInboxRowProps {
  chatId: string;
  isSwiped: boolean;
  isPinned: boolean;
  isArchived: boolean;
  isUnread: boolean;
  isMenuOpen: boolean;
  onOpenSwipe: (id: string) => void;
  onCloseSwipe: () => void;
  onPin: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onToggleUnread: () => void;
  onLongPress: (rect: DOMRect) => void;
  onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
  onClick: () => void;
  children: React.ReactNode;
}

const ROW_ACTION_WIDTH = 198;
const ROW_READ_THRESHOLD = 62;

export const SwipeableInboxRow: React.FC<SwipeableInboxRowProps> = ({
  chatId,
  isSwiped,
  isPinned,
  isArchived,
  isUnread,
  isMenuOpen,
  onOpenSwipe,
  onCloseSwipe,
  onPin,
  onArchive,
  onDelete,
  onToggleUnread,
  onLongPress,
  onContextMenu,
  onClick,
  children,
}) => {
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchSessionRef = useRef<{
    startX: number;
    startY: number;
    baseOffset: number;
    locked: 'x' | 'y' | null;
    crossedRight: boolean;
    didDrag: boolean;
  } | null>(null);

  const effectiveOffset = dragOffset !== null ? dragOffset : isSwiped ? -ROW_ACTION_WIDTH : 0;
  const showLeftActions = effectiveOffset < -6;
  const showRightReadPill = effectiveOffset > 8;
  const rightArmed = effectiveOffset >= ROW_READ_THRESHOLD;

  const clearLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  return (
    <div
      data-no-swipe="true"
      className={cn('relative select-none', isMenuOpen && 'z-50')}
      onContextMenu={onContextMenu}
      onTouchStart={(e) => {
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        const rect = e.currentTarget.getBoundingClientRect();
        touchSessionRef.current = {
          startX: t.clientX,
          startY: t.clientY,
          baseOffset: isSwiped ? -ROW_ACTION_WIDTH : 0,
          locked: null,
          crossedRight: false,
          didDrag: false,
        };
        clearLongPress();
        longPressRef.current = setTimeout(() => {
          triggerHaptic('medium');
          onLongPress(rect);
          touchSessionRef.current = null;
          setDragOffset(null);
        }, 450);
      }}
      onTouchMove={(e) => {
        const s = touchSessionRef.current;
        if (!s || e.touches.length !== 1) return;
        const t = e.touches[0];
        const dx = t.clientX - s.startX;
        const dy = t.clientY - s.startY;

        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          clearLongPress();
        }

        if (!s.locked) {
          if (Math.abs(dy) > 11 && Math.abs(dy) > Math.abs(dx) * 1.1) {
            s.locked = 'y';
            touchSessionRef.current = null;
            setDragOffset(null);
            return;
          }
          if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.15) {
            s.locked = 'x';
            s.didDrag = true;
          } else {
            return;
          }
        }

        if (s.locked === 'x') {
          const rawNext = s.baseOffset + dx;
          const clamped = Math.max(-216, Math.min(86, rawNext));
          setDragOffset(clamped);

          const armed = clamped >= ROW_READ_THRESHOLD;
          if (armed !== s.crossedRight) {
            s.crossedRight = armed;
            if (armed) triggerHaptic('selection');
          }
        }
      }}
      onTouchEnd={() => {
        clearLongPress();
        const s = touchSessionRef.current;
        const currentOffset = dragOffset;
        touchSessionRef.current = null;
        setDragOffset(null);

        if (!s || s.locked !== 'x' || currentOffset === null) return;

        if (currentOffset <= -78) {
          if (!isSwiped) triggerHaptic('selection');
          onOpenSwipe(chatId);
          return;
        }

        if (isSwiped && currentOffset > -135) {
          onCloseSwipe();
          return;
        }

        if (currentOffset >= ROW_READ_THRESHOLD) {
          triggerHaptic('selection');
          onToggleUnread();
          return;
        }

        if (isSwiped) {
          onCloseSwipe();
        }
      }}
      onTouchCancel={() => {
        clearLongPress();
        touchSessionRef.current = null;
        setDragOffset(null);
      }}
    >
      <div className="relative overflow-hidden rounded-2xl">
        {/* Right-swipe Mark Read / Unread reveal */}
        {showRightReadPill && (
          <div
            className={cn(
              'absolute left-0 top-0 bottom-0 w-24 flex items-center justify-center rounded-l-2xl transition-colors z-0',
              rightArmed
                ? 'bg-[#0071E3] text-white'
                : 'bg-[#0071E3]/15 text-[#0071E3] dark:bg-[#0A84FF]/20 dark:text-[#0A84FF]'
            )}
          >
            <div className="flex flex-col items-center gap-1">
              <Icon name={isUnread ? 'check-double' : 'message-circle'} className="w-4 h-4" />
              <span className="text-[10px] font-bold whitespace-nowrap">
                {isUnread ? 'Read' : 'Unread'}
              </span>
            </div>
          </div>
        )}

        {/* Left-swipe Pin / Archive / Delete reveal */}
        {showLeftActions && (
          <div className="absolute right-0 top-0 bottom-0 w-[198px] flex items-center z-0 overflow-hidden rounded-r-2xl">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                triggerHaptic('selection');
                onPin();
                onCloseSwipe();
              }}
              className="h-full w-[66px] bg-[#F246F5] hover:bg-[#e135e4] text-white font-semibold text-xs flex flex-col items-center justify-center gap-1 transition cursor-pointer shrink-0"
            >
              <Icon name="pin" className="w-4 h-4" />
              <span className="text-[10px] whitespace-nowrap">{isPinned ? 'Unpin' : 'Pin'}</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                triggerHaptic('selection');
                onArchive();
                onCloseSwipe();
              }}
              className="h-full w-[66px] bg-zinc-700 hover:bg-zinc-600 text-white font-semibold text-xs flex flex-col items-center justify-center gap-1 transition cursor-pointer shrink-0"
            >
              <Icon name="archive" className="w-4 h-4" />
              <span className="text-[10px] whitespace-nowrap">{isArchived ? 'Restore' : 'Archive'}</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                triggerHaptic('warning');
                onDelete();
                onCloseSwipe();
              }}
              className="h-full w-[66px] bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex flex-col items-center justify-center gap-1 transition cursor-pointer shrink-0"
            >
              <Icon name="trash-2" className="w-4 h-4" />
              <span className="text-[10px] whitespace-nowrap">Delete</span>
            </button>
          </div>
        )}

        {/* Foreground Sliding Row */}
        <div
          onClick={() => {
            if (isSwiped) {
              onCloseSwipe();
              return;
            }
            onClick();
          }}
          style={{
            transform: `translate3d(${effectiveOffset}px, 0, 0)`,
            transition: dragOffset !== null ? 'none' : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
          className={cn(
            'relative z-10',
            (isSwiped || effectiveOffset !== 0) && 'bg-white/95 dark:bg-zinc-900 rounded-2xl'
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

interface SwipeableMessageBubbleProps {
  isMe: boolean;
  onReply: () => void;
  onCancelHold: () => void;
  holdHandlers: {
    onContextMenu?: (e: React.MouseEvent) => void;
    onTouchStart?: (e: React.TouchEvent) => void;
    onTouchMove?: (e: React.TouchEvent) => void;
    onTouchEnd?: () => void;
    onTouchCancel?: () => void;
  };
  onDoubleClick?: (e: React.MouseEvent) => void;
  title?: string;
  className?: string;
  children: React.ReactNode;
}

const REPLY_TRIGGER_DISTANCE = 44;

export const SwipeableMessageBubble: React.FC<SwipeableMessageBubbleProps> = ({
  isMe,
  onReply,
  onCancelHold,
  holdHandlers,
  onDoubleClick,
  title,
  className,
  children,
}) => {
  const [dragX, setDragX] = useState(0);
  const swipeRef = useRef<{
    startX: number;
    startY: number;
    locked: 'x' | 'y' | null;
    triggeredHaptic: boolean;
  } | null>(null);

  const absX = Math.abs(dragX);
  const replyReady = absX >= REPLY_TRIGGER_DISTANCE;
  const progress = Math.min(1, absX / REPLY_TRIGGER_DISTANCE);

  return (
    <div
      data-no-swipe="true"
      className="relative flex items-center"
      onContextMenu={holdHandlers.onContextMenu}
      onTouchStart={(e) => {
        holdHandlers.onTouchStart?.(e);
        if (e.touches.length !== 1) return;
        swipeRef.current = {
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          locked: null,
          triggeredHaptic: false,
        };
      }}
      onTouchMove={(e) => {
        holdHandlers.onTouchMove?.(e);
        const s = swipeRef.current;
        if (!s || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - s.startX;
        const dy = e.touches[0].clientY - s.startY;

        if (!s.locked) {
          if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.1) {
            s.locked = 'y';
            swipeRef.current = null;
            setDragX(0);
            return;
          }
          // Sent bubbles swipe left towards center; received bubbles swipe right towards center
          const validDirection = isMe ? dx < -8 : dx > 8;
          if (validDirection && Math.abs(dx) > Math.abs(dy) * 1.2) {
            s.locked = 'x';
            onCancelHold();
          } else {
            return;
          }
        }

        if (s.locked === 'x') {
          onCancelHold();
          const damped = isMe
            ? Math.max(-68, Math.min(0, dx * 0.72))
            : Math.min(68, Math.max(0, dx * 0.72));
          setDragX(damped);

          if (!s.triggeredHaptic && Math.abs(damped) >= REPLY_TRIGGER_DISTANCE) {
            s.triggeredHaptic = true;
            triggerHaptic('selection');
          } else if (s.triggeredHaptic && Math.abs(damped) < REPLY_TRIGGER_DISTANCE - 10) {
            s.triggeredHaptic = false;
          }
        }
      }}
      onTouchEnd={() => {
        holdHandlers.onTouchEnd?.();
        const shouldReply = Math.abs(dragX) >= REPLY_TRIGGER_DISTANCE;
        swipeRef.current = null;
        setDragX(0);
        if (shouldReply) {
          triggerHaptic('light');
          onReply();
        }
      }}
      onTouchCancel={() => {
        holdHandlers.onTouchCancel?.();
        swipeRef.current = null;
        setDragX(0);
      }}
    >
      {absX > 6 && (
        <motion.div
          aria-hidden="true"
          style={{
            opacity: progress,
            scale: 0.65 + progress * 0.4,
          }}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center pointer-events-none shadow-md transition-colors',
            isMe ? '-right-10' : '-left-10',
            replyReady
              ? 'bg-[#0071E3] text-white'
              : 'bg-white/90 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300 border border-black/10 dark:border-white/10'
          )}
        >
          <MsgReplyIcon className="w-4 h-4" />
        </motion.div>
      )}

      <div
        onDoubleClick={onDoubleClick}
        title={title}
        style={{
          transform: `translate3d(${dragX}px, 0, 0)`,
          transition: dragX === 0 ? 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
        }}
        className={className}
      >
        {children}
      </div>
    </div>
  );
};
