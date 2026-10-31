import React, { useState, useRef } from 'react';
import {
  Camera,
  Mic,
  Image as ImageIcon,
  MessageSquareMore,
  Plus,
  X,
  Send,
  Bookmark,
  Pencil,
  Smile,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ChatBottomBarProps {
  newMessage: string;
  setNewMessage: (val: string) => void;
  onInputChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSendMessage: () => void;
  isRecording: boolean;
  recordingDuration: number;
  startRecording: () => void;
  stopRecording: (send: boolean) => void;
  cancelRecording: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  cameraInputRef?: React.RefObject<HTMLInputElement>;
  onOpenSavedReplies: () => void;
  onOpenDraw: () => void;
  onOpenGifs: () => void;
  onOpenStickers: () => void;
  isBlocked?: boolean;
  blockedMessage?: string;
  isUploading?: boolean;
  previewUrls?: string[];
  onRemovePreview?: (index: number) => void;
}

export const ChatBottomBar: React.FC<ChatBottomBarProps> = ({
  newMessage,
  setNewMessage,
  onInputChange,
  onSendMessage,
  isRecording,
  recordingDuration,
  startRecording,
  stopRecording,
  cancelRecording,
  fileInputRef,
  cameraInputRef,
  onOpenSavedReplies,
  onOpenDraw,
  onOpenGifs,
  onOpenStickers,
  isBlocked = false,
  blockedMessage,
  isUploading = false,
  previewUrls = [],
  onRemovePreview,
}) => {
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  if (isBlocked) {
    return (
      <div className="w-full py-3 px-4 bg-zinc-100 dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 text-center text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium">
        {blockedMessage || 'You cannot send messages to this conversation.'}
      </div>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
    }
  };

  const handleCameraClick = () => {
    if (cameraInputRef && cameraInputRef.current) {
      cameraInputRef.current.click();
    } else if (fileInputRef && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const hasContent = Boolean(newMessage.trim() || previewUrls.length > 0);
  const computedRows = Math.min(5, Math.max(1, newMessage.split('\n').length + Math.floor(newMessage.length / 56)));

  return (
    <div className="w-full relative select-none">
      {/* Attachments Preview Tray */}
      {previewUrls.length > 0 && (
        <div className="flex items-center gap-2.5 mb-2.5 p-2.5 msg-composer-capsule rounded-2xl overflow-x-auto no-scrollbar border">
          {previewUrls.map((url, idx) => (
            <div
              key={idx}
              className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-black/10 dark:border-white/10 shadow-sm group"
            >
              <img src={url} alt="Attachment" className="w-full h-full object-cover" />
              {isUploading && (
                <div className="absolute inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                </div>
              )}
              {onRemovePreview && (
                <button
                  type="button"
                  onClick={() => onRemovePreview(idx)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/75 hover:bg-rose-500 text-white flex items-center justify-center shadow-md cursor-pointer transition"
                  title="Remove photo"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Floating More Tools Popover */}
      <AnimatePresence>
        {showPlusMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowPlusMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ type: 'spring', damping: 26, stiffness: 340 }}
              className="absolute right-1 bottom-14 sm:bottom-15 z-50 w-52 bg-white dark:bg-[#1A1C24] rounded-3xl shadow-[0_16px_44px_rgba(0,0,0,0.22)] border border-zinc-200/90 dark:border-zinc-800 p-2 space-y-0.5"
            >
              <button
                type="button"
                onClick={() => {
                  setShowPlusMenu(false);
                  onOpenSavedReplies();
                }}
                className="w-full px-3.5 py-2.5 rounded-2xl flex items-center gap-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition text-left cursor-pointer"
              >
                <Bookmark className="w-4 h-4 text-zinc-700 dark:text-zinc-300 stroke-[2]" />
                <span>Saved Replies</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPlusMenu(false);
                  onOpenDraw();
                }}
                className="w-full px-3.5 py-2.5 rounded-2xl flex items-center gap-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition text-left cursor-pointer"
              >
                <Pencil className="w-4 h-4 text-zinc-700 dark:text-zinc-300 stroke-[2]" />
                <span>Sketch & Draw</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPlusMenu(false);
                  onOpenGifs();
                }}
                className="w-full px-3.5 py-2.5 rounded-2xl flex items-center gap-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition text-left cursor-pointer"
              >
                <div className="w-4 h-4 border-[1.75px] border-zinc-700 dark:border-zinc-300 rounded-[4px] flex items-center justify-center font-bold text-[7.5px] leading-none">
                  GIF
                </div>
                <span>Browse GIFs</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPlusMenu(false);
                  onOpenStickers();
                }}
                className="w-full px-3.5 py-2.5 rounded-2xl flex items-center gap-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition text-left cursor-pointer"
              >
                <Smile className="w-4 h-4 text-zinc-700 dark:text-zinc-300 stroke-[2]" />
                <span>Stickers</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Composer Capsule */}
      <div className="w-full flex items-end msg-composer-capsule border rounded-[26px] p-1.5 gap-1.5 transition-all focus-within:ring-2 focus-within:ring-[#1877F2]/25">
        {/* Camera Action */}
        <button
          type="button"
          onClick={handleCameraClick}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full msg-accent-btn flex items-center justify-center text-white shrink-0 hover:brightness-110 active:scale-95 transition-all shadow-xs cursor-pointer mb-0.5"
          title="Camera or Photo"
        >
          <Camera className="w-4.5 h-4.5 text-white stroke-[2.2]" />
        </button>

        {/* Recording Status OR Clean Multi-line Input */}
        {isRecording ? (
          <div className="flex-1 min-w-0 flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
              <span className="font-mono tabular-nums text-xs sm:text-sm font-semibold text-rose-500 truncate">
                Recording {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={cancelRecording}
                className="text-xs text-zinc-500 hover:text-rose-500 transition px-2.5 py-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => stopRecording(true)}
                className="w-8 h-8 rounded-full msg-accent-btn text-white flex items-center justify-center shadow-sm active:scale-95 transition cursor-pointer"
                title="Send voice message"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={newMessage}
            rows={computedRows}
            onChange={(e) => {
              if (onInputChange) {
                onInputChange(e);
              } else {
                setNewMessage(e.target.value);
              }
              if (showPlusMenu) setShowPlusMenu(false);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Write a message..."
            className="ds-liquid-input msg-clean-input flex-1 min-w-0 bg-transparent border-0 px-2.5 py-2 text-[15px] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-0 resize-none leading-relaxed overflow-y-auto min-h-[38px] max-h-[128px]"
          />
        )}

        {/* Right Controls */}
        {!isRecording && (
          <div className="flex items-center shrink-0 pr-0.5 gap-0.5 sm:gap-1 mb-0.5">
            {hasContent ? (
              <button
                type="button"
                onClick={onSendMessage}
                disabled={isUploading}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full msg-accent-btn text-white flex items-center justify-center hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
                title="Send message"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            ) : (
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/[0.08] active:scale-95 transition cursor-pointer"
                  title="Record voice message"
                >
                  <Mic className="w-4.5 h-4.5 stroke-[2]" />
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/[0.08] active:scale-95 transition cursor-pointer"
                  title="Send photo"
                >
                  <ImageIcon className="w-4.5 h-4.5 stroke-[2]" />
                </button>

                <button
                  type="button"
                  onClick={onOpenSavedReplies}
                  className="hidden sm:flex w-9 h-9 rounded-full items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/[0.08] active:scale-95 transition cursor-pointer"
                  title="Quick replies"
                >
                  <MessageSquareMore className="w-4.5 h-4.5 stroke-[2]" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowPlusMenu(!showPlusMenu)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    showPlusMenu
                      ? 'msg-accent-btn text-white shadow-sm rotate-90'
                      : 'text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/[0.08] active:scale-95'
                  }`}
                  title="More tools"
                >
                  {showPlusMenu ? (
                    <X className="w-4 h-4 stroke-[2.4]" />
                  ) : (
                    <Plus className="w-5 h-5 stroke-[2.1]" />
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
