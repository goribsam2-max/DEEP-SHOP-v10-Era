import React, { useState, useRef } from 'react';
import { Bookmark, Pencil, Smile, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
            key="voice-recorder-bar"
            initial={{ opacity: 0, scale: 0.97, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ type: 'spring', stiffness: 460, damping: 30 }}
            className="w-full flex items-center gap-2 sm:gap-2.5"
          >
            {/* Left 48px Discard / Trash Button */}
            <button
              type="button"
              onClick={cancelRecording}
              aria-label="Discard voice recording"
              title="Discard recording"
              className="w-12 h-12 rounded-full bg-rose-500/12 dark:bg-rose-500/18 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white flex items-center justify-center shrink-0 transition-all active:scale-90 cursor-pointer"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            {/* Center Live Animated Equalizer Capsule */}
            <div className="flex-1 min-w-0 h-12 rounded-[24px] bg-gradient-to-r from-[#2F80ED]/10 via-[#2F80ED]/[0.06] to-[#2F80ED]/12 dark:from-[#2F80ED]/20 dark:via-[#1B2232] dark:to-[#2F80ED]/16 border border-[#2F80ED]/25 px-3.5 flex items-center justify-between gap-3 overflow-hidden">
              <div className="flex items-center gap-2 shrink-0">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                </span>
                <span className="font-mono tabular-nums text-[13px] font-bold text-zinc-900 dark:text-white">
                  {formattedRecTime}
                </span>
              </div>

              <div className="flex-1 min-w-0 h-7 flex items-center justify-center gap-[2.5px] overflow-hidden">
                {RECORDER_BAR_SEEDS.map((h, i) => (
                  <motion.span
                    key={i}
                    animate={{
                      scaleY: [0.35, 1, 0.45, 0.9, 0.4],
                    }}
                    transition={{
                      duration: 0.85 + (i % 5) * 0.11,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: (i % 7) * 0.06,
                    }}
                    style={{ height: `${h}px` }}
                    className="flex-1 min-w-[2px] max-w-[3.5px] rounded-full bg-[#2F80ED] dark:bg-[#60A5FA] origin-center will-change-transform"
                  />
                ))}
              </div>

              <span className="hidden sm:inline text-[11px] font-medium text-[#2F80ED] dark:text-[#60A5FA] shrink-0">
                Live
              </span>
            </div>

            {/* Right 48px Instant Send Voice Button */}
            <button
              type="button"
              onClick={() => stopRecording(true)}
              aria-label="Send voice message"
              title="Send voice message"
              className="w-12 h-12 rounded-full msg-accent-btn text-white flex items-center justify-center shrink-0 shadow-[0_6px_20px_rgba(47,128,237,0.38)] hover:brightness-105 active:scale-90 transition-all cursor-pointer"
            >
              <MsgSendIcon className="w-[21px] h-[21px] mr-0.5" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="text-composer-bar"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.14 }}
            className="w-full flex items-end gap-2 sm:gap-2.5"
          >
            {/* Left "+" Tools Button */}
            <button
              type="button"
              onClick={() => setShowPlusMenu((prev) => !prev)}
              className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                showPlusMenu
                  ? 'msg-new-chat-pill rotate-45'
                  : 'msg-composer-capsule text-zinc-800 dark:text-zinc-200 hover:opacity-85 active:scale-95'
              }`}
              title="More tools & attachments"
            >
              <MsgPlusIcon className="w-[22px] h-[22px]" />
            </button>

            {/* Center Soft Pill Input Capsule */}
            <div
              className={`flex-1 min-w-0 flex msg-composer-capsule rounded-[24px] px-4 transition-all focus-within:ring-2 focus-within:ring-[#2F80ED]/20 ${
                computedRows > 1 ? 'min-h-[48px] py-1.5 items-end' : 'h-12 items-center'
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
                placeholder="Message..."
                className={`ds-liquid-input msg-clean-input flex-1 min-w-0 bg-transparent border-0 text-[15px] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-0 resize-none leading-[22px] overflow-y-auto max-h-[124px] ${
                  computedRows > 1 ? 'py-1.5 min-h-[38px]' : 'py-[8px] h-[38px]'
                }`}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-9 h-9 ml-1 rounded-full flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white active:scale-95 transition shrink-0 cursor-pointer ${
                  computedRows > 1 ? 'mb-0.5' : ''
                }`}
                title="Send photo"
              >
                <MsgImageIcon className="w-[21px] h-[21px]" />
              </button>
            </div>

            {/* Right Primary Button: Send Paper-plane or Voice Mic */}
            {hasContent ? (
              <motion.button
                key="send-btn"
                initial={{ scale: 0.82, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 520, damping: 26 }}
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={onSendMessage}
                disabled={isUploading}
                className="w-12 h-12 rounded-full msg-accent-btn text-white flex items-center justify-center hover:brightness-105 active:scale-90 transition-all shadow-[0_6px_18px_rgba(47,128,237,0.32)] cursor-pointer disabled:opacity-50 shrink-0"
                title="Send message"
              >
                <MsgSendIcon className="w-[21px] h-[21px] mr-0.5" />
              </motion.button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="w-12 h-12 rounded-full msg-composer-capsule flex items-center justify-center text-zinc-800 dark:text-zinc-200 hover:opacity-85 active:scale-90 transition shrink-0 cursor-pointer"
                title="Record voice message"
              >
                <MsgMicIcon className="w-[22px] h-[22px]" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
