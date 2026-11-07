import React, { useState, useRef } from 'react';
import { Bookmark, Pencil, Smile, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import {
  MsgCameraIcon,
  MsgCloseIcon,
  MsgImageIcon,
  MsgMicIcon,
  MsgPlusIcon,
  MsgSendIcon,
} from './MessagesSvgIcons';

const RECORDER_BAR_SEEDS = [
  10, 16, 22, 14, 26, 18, 12, 24, 28, 16, 20, 26,
  14, 22, 28, 18, 12, 24, 20, 15, 25, 18, 14, 10,
];

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
      <div className="w-full py-3 px-4 msg-composer-capsule rounded-2xl text-center text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium">
        {blockedMessage || 'You cannot send messages to this conversation.'}
      </div>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 768) {
      e.preventDefault();
      e.stopPropagation();
      if (newMessage.trim() || previewUrls.length > 0) {
        onSendMessage();
      }
      return;
    }
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
  const computedRows = Math.min(
    5,
    Math.max(1, newMessage.split('\n').length + Math.floor(newMessage.length / 56))
  );

  const formattedRecTime = `${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60)
    .toString()
    .padStart(2, '0')}`;

  return (
    <div className="w-full relative select-none">
      {/* Attachments Preview Tray */}
      {previewUrls.length > 0 && !isRecording && (
        <div className="flex items-center gap-2.5 mb-2 p-2.5 msg-composer-capsule rounded-2xl overflow-x-auto no-scrollbar">
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
                  <MsgCloseIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Floating More Tools Popover */}
      <AnimatePresence>
        {showPlusMenu && !isRecording && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowPlusMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ type: 'spring', damping: 26, stiffness: 360 }}
              className="msg-v2-popup absolute left-0 bottom-14 z-50 w-52 bg-white dark:bg-[#1A1C24] rounded-3xl shadow-[0_16px_44px_rgba(15,23,42,0.16)] border border-black/[0.05] dark:border-white/10 p-2 space-y-0.5"
            >
              <button
                type="button"
                onClick={() => {
                  setShowPlusMenu(false);
                  handleCameraClick();
                }}
                className="w-full px-3.5 py-2.5 rounded-2xl flex items-center gap-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition text-left cursor-pointer"
              >
                <MsgCameraIcon className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                <span>Camera</span>
              </button>

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

      <AnimatePresence mode="wait" initial={false}>
        {isRecording ? (
          <motion.div
            key="voice-listening-panel"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="w-full flex flex-col items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl relative"
          >
            <button
              type="button"
              onClick={cancelRecording}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 cursor-pointer transition"
              title="Close"
            >
              <MsgCloseIcon className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-6 tracking-tight">
              Listening...
            </h3>

            {/* Glowing Iridescent Fluid Siri-style Orb from IMG_5472 */}
            <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center my-2">
              <motion.div
                animate={{
                  scale: [1, 1.08, 0.96, 1.05, 1],
                  rotate: [0, 90, 180, 270, 360],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr from-[#38BDF8] via-[#818CF8] via-35% via-[#C084FC] via-60% via-[#F472B6] to-[#FB7185] shadow-[0_0_60px_rgba(192,132,252,0.45)] blur-[1px] relative flex items-center justify-center overflow-hidden"
              >
                {/* Internal multi-layer fluid refraction rings */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/40 via-transparent to-black/30 backdrop-blur-sm" />
                <motion.div
                  animate={{
                    scale: [0.9, 1.15, 0.95, 1.1, 0.9],
                    opacity: [0.65, 0.95, 0.7, 1, 0.65],
                  }}
                  transition={{
                    duration: 3.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#60A5FA]/80 via-[#EC4899]/70 to-[#F43F5E]/80 blur-md"
                />
              </motion.div>
            </div>

            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono mt-4 tabular-nums">
              {formattedRecTime}
            </p>

            {/* Quick Actions */}
            <div className="flex items-center gap-4 mt-6">
              <button
                type="button"
                onClick={cancelRecording}
                className="px-5 py-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => stopRecording(true)}
                className="px-6 py-2.5 rounded-full bg-[#FF2E93] text-white text-xs font-bold shadow-lg shadow-pink-500/25 hover:brightness-105 active:scale-95 transition cursor-pointer flex items-center gap-2"
              >
                <span>Send</span>
                <MsgSendIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="text-composer-bar"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.14 }}
            className="w-full flex items-center gap-2 sm:gap-2.5"
          >
            {/* Left Pure Black Circular "+" Button matching IMG_5472 */}
            <button
              type="button"
              onClick={() => setShowPlusMenu((prev) => !prev)}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer ${
                showPlusMenu
                  ? 'bg-zinc-800 text-white rotate-45'
                  : 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950'
              }`}
              title="More tools & attachments"
              aria-label="Add tools"
            >
              <MsgPlusIcon className="w-5 h-5" />
            </button>

            {/* Center Pure White Input Capsule with X Clear button matching IMG_5472 */}
            <div
              className={`flex-1 min-w-0 flex items-center bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/80 rounded-full px-4 sm:px-4.5 py-1.5 transition-all focus-within:ring-2 focus-within:ring-pink-500/25 ${
                computedRows > 1 ? 'min-h-[46px]' : 'h-11 sm:h-12'
              }`}
            >
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
                placeholder='"Hello! I&apos;m feeling low today...'
                className={`ds-liquid-input msg-clean-input flex-1 min-w-0 bg-transparent border-0 text-[14px] sm:text-[14.5px] text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-0 resize-none leading-[20px] overflow-y-auto max-h-[120px] py-[6px]`}
              />

              <button
                type="button"
                onClick={() => setNewMessage('')}
                className={cn(
                  "w-6 h-6 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 shrink-0 ml-1 transition cursor-pointer",
                  !newMessage.trim() && "opacity-40 hover:opacity-100"
                )}
                title="Clear text"
              >
                <MsgCloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right Vibrant Hot Pink Circular Send / Mic Button matching IMG_5472 */}
            {hasContent ? (
              <motion.button
                key="send-btn"
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={onSendMessage}
                disabled={isUploading}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#FF2E93] text-white flex items-center justify-center hover:brightness-105 active:scale-92 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                title="Send message"
              >
                <MsgSendIcon className="w-[20px] h-[20px] mr-0.5" />
              </motion.button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#FF2E93] text-white flex items-center justify-center hover:brightness-105 active:scale-92 transition-all shrink-0 cursor-pointer"
                title="Speak / Voice message"
              >
                <MsgMicIcon className="w-5 h-5" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
