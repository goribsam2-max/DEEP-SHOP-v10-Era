import React from 'react';
import { CornerUpLeft, Image as ImageIcon, Mic } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ReplyData {
  id?: string;
  text?: string;
  senderId?: string;
  senderName?: string;
  imageUrl?: string;
  audioUrl?: string;
}

interface MessageReplyPreviewProps {
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
  className
}) => {
  if (!replyTo) return null;

  const isSenderMe = replyTo.senderId === currentUserId;
  const displayName = isSenderMe ? 'You' : (replyTo.senderName && replyTo.senderName !== 'User' ? replyTo.senderName : 'User');

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
        "group/reply mb-1.5 flex items-stretch gap-2.5 px-3 py-2 rounded-xl text-left cursor-pointer transition-all select-none relative overflow-hidden",
        "border-l-[3.5px]",
        isMe
          ? "bg-black/20 hover:bg-black/30 border-white/90 text-white"
          : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border-[#5B51D8] dark:border-[#7B73F0] text-zinc-900 dark:text-zinc-100",
        className
      )}
      title="Click to view quoted message"
    >
      <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden max-w-full">
        {/* Author Name */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-full">
          <CornerUpLeft className={cn("w-3 h-3 shrink-0", isMe ? "text-white/80" : "text-[#5B51D8] dark:text-[#7B73F0]")} />
          <span className={cn(
            "text-[11.5px] font-bold tracking-tight truncate max-w-full",
            isMe ? "text-white" : "text-[#5B51D8] dark:text-[#7B73F0]"
          )}>
            {displayName}
          </span>
        </div>

        {/* Message preview snippet */}
        <div className="flex items-center gap-1.5 mt-0.5 min-w-0 max-w-full overflow-hidden">
          {replyTo.imageUrl && !replyTo.text && (
            <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium shrink-0", isMe ? "text-white/80" : "text-zinc-600 dark:text-zinc-300")}>
              <ImageIcon className="w-3 h-3" /> Photo
            </span>
          )}
          {replyTo.audioUrl && !replyTo.text && (
            <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium shrink-0", isMe ? "text-white/80" : "text-zinc-600 dark:text-zinc-300")}>
              <Mic className="w-3 h-3" /> Voice Message
            </span>
          )}
          {replyTo.text && (
            <p className={cn(
              "text-[12px] font-normal leading-snug line-clamp-2 break-all overflow-hidden text-ellipsis max-w-full",
              isMe ? "text-white/90" : "text-zinc-600 dark:text-zinc-300"
            )}>
              {replyTo.text}
            </p>
          )}
        </div>
      </div>

      {/* Image Thumbnail */}
      {replyTo.imageUrl && (
        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-black/10 dark:border-white/10 bg-black/10">
          <img src={replyTo.imageUrl} alt="preview" className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
};
