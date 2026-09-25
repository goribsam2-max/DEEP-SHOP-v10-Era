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
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatBottomBarProps {
  newMessage: string;
  setNewMessage: (val: string) => void;
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
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (isBlocked) {
    return (
      <div className="w-full py-3 px-4 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-750 text-center text-xs sm:text-sm text-zinc-500 font-medium font-inter">
        {blockedMessage || 'You cannot send messages to this conversation.'}
      </div>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (newMessage.trim() || previewUrls.length > 0) {
        onSendMessage();
      }
    }
  };

  const handleCameraClick = () => {
    if (cameraInputRef && cameraInputRef.current) {
      cameraInputRef.current.click();
    } else if (fileInputRef && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="w-full relative font-inter select-none">
      {/* Attachments Preview if any */}
      {previewUrls.length > 0 && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-zinc-100/90 dark:bg-zinc-800/80 backdrop-blur-md rounded-2xl overflow-x-auto no-scrollbar border border-zinc-200/80 dark:border-zinc-700/60">
          {previewUrls.map((url, idx) => (
            <div key={idx} className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-zinc-300 dark:border-zinc-700 shadow-sm">
              <img src={url} alt="Attachment" className="w-full h-full object-cover" />
              {onRemovePreview && (
                <button
                  type="button"
                  onClick={() => onRemovePreview(idx)}
                  className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Floating Popup Menu from Image 4 (IMG_3980.jpeg) */}
      <AnimatePresence>
        {showPlusMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowPlusMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: 'spring', damping: 24, stiffness: 320 }}
              className="absolute right-2 bottom-14 sm:bottom-16 z-50 w-48 bg-white dark:bg-[#1E1F24] rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.25)] border border-zinc-200/90 dark:border-zinc-750/80 p-2 space-y-0.5"
            >
              {/* 1. Saved */}
              <button
                type="button"
                onClick={() => {
                  setShowPlusMenu(false);
                  onOpenSavedReplies();
                }}
                className="w-full px-3 py-2.5 rounded-2xl flex items-center gap-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-left cursor-pointer"
              >
                <Bookmark className="w-4 h-4 text-zinc-800 dark:text-zinc-200 stroke-[2]" />
                <span>Saved</span>
              </button>

              {/* 2. Draw */}
              <button
                type="button"
                onClick={() => {
                  setShowPlusMenu(false);
                  onOpenDraw();
                }}
                className="w-full px-3 py-2.5 rounded-2xl flex items-center justify-between text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Pencil className="w-4 h-4 text-zinc-800 dark:text-zinc-200 stroke-[2]" />
                  <span>Draw</span>
                </div>
                <span className="text-[10px] font-bold bg-[#4F46E5] text-white px-2 py-0.5 rounded-full shadow-sm">
                  New
                </span>
              </button>

              {/* 3. GIFs */}
              <button
                type="button"
                onClick={() => {
                  setShowPlusMenu(false);
                  onOpenGifs();
                }}
                className="w-full px-3 py-2.5 rounded-2xl flex items-center gap-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-left cursor-pointer"
              >
                <div className="w-4 h-4 border-2 border-zinc-800 dark:border-zinc-200 rounded-[4px] flex items-center justify-center font-bold text-[8px] leading-none">
                  GIF
                </div>
                <span>GIFs</span>
              </button>

              {/* 4. Stickers */}
              <button
                type="button"
                onClick={() => {
                  setShowPlusMenu(false);
                  onOpenStickers();
                }}
                className="w-full px-3 py-2.5 rounded-2xl flex items-center gap-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-left cursor-pointer"
              >
                <Smile className="w-4 h-4 text-zinc-800 dark:text-zinc-200 stroke-[2]" />
                <span>Stickers</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Bottom Bar Capsule */}
      <div className="w-full flex items-center bg-zinc-100 dark:bg-[#1E1F24] border border-zinc-200/80 dark:border-zinc-750/70 rounded-full p-1.5 gap-1.5 shadow-sm transition-all focus-within:border-zinc-300 dark:focus-within:border-zinc-650 overflow-hidden">
        {/* Left: Royal Blue/Indigo Camera Circle Button */}
        <button
          type="button"
          onClick={handleCameraClick}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#5B51D8] dark:bg-[#5B51D8] flex items-center justify-center text-white shrink-0 hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer"
          title="Take photo or choose from gallery"
        >
          <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2.2]" />
        </button>

        {/* Middle: Recording State or Text Input */}
        {isRecording ? (
          <div className="flex-1 min-w-0 flex items-center justify-between px-2 text-rose-500">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
              <span className="font-mono text-xs sm:text-sm font-bold truncate">
                {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <button
              type="button"
              onClick={cancelRecording}
              className="text-xs text-zinc-400 hover:text-rose-500 transition px-2 py-1 shrink-0 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              if (showPlusMenu) setShowPlusMenu(false);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            className="flex-1 min-w-0 bg-transparent border-0 px-2 py-1 text-[15px] sm:text-[16px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-0 leading-normal"
          />
        )}

        {/* Right Action Area inside Capsule: Dynamic Toggle between Action buttons & Send button */}
        <div className="flex items-center shrink-0 pr-0.5">
          {Boolean(newMessage.trim() || previewUrls.length > 0) ? (
            /* When user is typing or has attachment: Show ONLY Send button */
            <button
              type="button"
              onClick={onSendMessage}
              disabled={isUploading}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#5B51D8] text-white flex items-center justify-center hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
              title="Send message"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          ) : (
            /* When input is empty: Show full Telegram-style action bar (Mic, Gallery, Saved, Plus) */
            <div className="flex items-center gap-0.5 sm:gap-1">
              {/* 1. Mic button (Audio recording) */}
              <button
                type="button"
                onClick={() => {
                  if (isRecording) {
                    stopRecording(true);
                  } else {
                    startRecording();
                  }
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${
                  isRecording
                    ? 'bg-rose-500 text-white'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700/60 active:scale-95'
                }`}
                title={isRecording ? 'Send recording' : 'Record voice message'}
              >
                <Mic className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2]" />
              </button>

              {/* 2. Gallery / Image button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700/60 active:scale-95 transition cursor-pointer"
                title="Upload photo"
              >
                <ImageIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2]" />
              </button>

              {/* 3. Saved replies button */}
              <button
                type="button"
                onClick={onOpenSavedReplies}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700/60 active:scale-95 transition cursor-pointer"
                title="Saved replies"
              >
                <MessageSquareMore className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2]" />
              </button>

              {/* 4. Action (+) or (X) Button */}
              <button
                type="button"
                onClick={() => setShowPlusMenu(!showPlusMenu)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  showPlusMenu
                    ? 'bg-[#5B51D8] text-white shadow-md rotate-90'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700/60 active:scale-95'
                }`}
                title="More actions (Draw, GIFs, Stickers, Saved)"
              >
                {showPlusMenu ? (
                  <X className="w-4 h-4 stroke-[2.4]" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-zinc-700 dark:border-zinc-300 flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
