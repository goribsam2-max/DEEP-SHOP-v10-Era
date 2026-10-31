import React from 'react';
import { CornerUpLeft, Image as ImageIcon, Mic } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ProgressiveImage } from './ProgressiveImage';

export interface ReplyData {
  id?: string;
  text?: string;
  senderId?: string;
  senderName?: string;
  imageUrl?: string;
  audioUrl?: string;
}

export interface MessageReplyPreviewProps {
  replyTo: ReplyData;
  isMe: boolean;
  currentUserId: string;
  onScrollToMessage?: (id: string) => void;
  className?: string;
}

export const MessageReplyPreview: React.FC<MessageReplyPreviewProps> = ({
  replyTo,
  isMe,
  currentUserId,
  onScrollToMessage,
  className,
}) => {
  if (!replyTo) return null;

  const isSenderMe = replyTo.senderId === currentUserId;
  const displayName = isSenderMe
    ? 'You'
    : replyTo.senderName && replyTo.senderName !== 'User'
    ? replyTo.senderName
    : 'User';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (replyTo.id && onScrollToMessage) {
      onScrollToMessage(replyTo.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group/reply mb-1.5 flex items-center gap-2.5 px-3 py-2 rounded-2xl text-left cursor-pointer transition-colors select-none relative overflow-hidden border',
        isMe
          ? 'bg-black/18 hover:bg-black/25 border-white/15 text-white'
          : 'bg-zinc-100/90 dark:bg-white/[0.06] hover:bg-zinc-200/70 dark:hover:bg-white/[0.1] border-zinc-200/80 dark:border-white/10 text-zinc-900 dark:text-zinc-100',
        className
      )}
      title="Jump to quoted message"
    >
      <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden">
        <div className="flex items-center gap-1.5 min-w-0">
          <CornerUpLeft
            className={cn(
              'w-3 h-3 shrink-0',
              isMe ? 'text-white/85' : 'text-[#1877F2]'
            )}
          />
          <span
            className={cn(
              'text-[11.5px] font-semibold tracking-tight truncate',
              isMe ? 'text-white' : 'text-[#1877F2]'
            )}
          >
            {displayName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-0.5 min-w-0 overflow-hidden">
          {replyTo.imageUrl && !replyTo.text && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[11.5px] font-medium shrink-0',
                isMe ? 'text-white/85' : 'text-zinc-600 dark:text-zinc-300'
              )}
            >
              <ImageIcon className="w-3 h-3" /> Photo
            </span>
          )}
          {replyTo.audioUrl && !replyTo.text && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[11.5px] font-medium shrink-0',
                isMe ? 'text-white/85' : 'text-zinc-600 dark:text-zinc-300'
              )}
            >
              <Mic className="w-3 h-3" /> Voice message
            </span>
          )}
          {replyTo.text && (
            <p
              className={cn(
                'text-[12px] font-normal leading-snug line-clamp-2 break-words overflow-hidden text-ellipsis',
                isMe ? 'text-white/90' : 'text-zinc-600 dark:text-zinc-300'
              )}
            >
              {replyTo.text}
            </p>
          )}
        </div>
      </div>

      {replyTo.imageUrl && (
        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-black/10 dark:border-white/10 bg-black/10">
          <ProgressiveImage
            src={replyTo.imageUrl}
            alt="Quoted preview"
            containerClassName="w-10 h-10 min-h-0"
            showShimmerIcon={false}
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
};
