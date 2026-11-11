import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import Icon from '../Icon';
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
                <Icon name="bookmark" className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
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
                <Icon name="pencil" className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
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
                <Icon name="smile" className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                <span>Stickers</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Composer Bar (Stays visible at top even while Listening panel is open, matching IMG_5472) */}
      <div className="w-full flex items-center gap-2 sm:gap-2.5">
        {/* Left Pure Black Circular "+" Button matching IMG_5472 */}
        <button
          type="button"
          onClick={() => {
            if (isRecording) return;
            setShowPlusMenu((prev) => !prev);
          }}
          className={cn(
            'w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer',
            showPlusMenu
              ? 'bg-zinc-800 text-white rotate-45'
              : 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950'
          )}
          title="More tools & attachments"
          aria-label="Add tools"
        >
          <MsgPlusIcon className="w-5 h-5" />
        </button>

        {/* Center Pure White Input Capsule with X Clear button matching IMG_5472 */}
        <div
          className={cn(
            'flex-1 min-w-0 flex items-center bg-white dark:bg-zinc-800 rounded-full px-4 sm:px-4.5 py-1.5 shadow-[0_4px_20px_rgba(120,90,160,0.07)] transition-all focus-within:ring-2 focus-within:ring-[#F246F5]/25',
            computedRows > 1 ? 'min-h-[46px]' : 'h-11 sm:h-12'
          )}
        >
          <textarea
            ref={textareaRef}
            value={isRecording ? (newMessage || `Listening (${formattedRecTime})...`) : newMessage}
            rows={computedRows}
            readOnly={isRecording}
            onChange={(e) => {
              if (isRecording) return;
              if (onInputChange) {
                onInputChange(e);
              } else {
                setNewMessage(e.target.value);
              }
              if (showPlusMenu) setShowPlusMenu(false);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            className="ds-liquid-input msg-clean-input flex-1 min-w-0 bg-transparent border-0 text-[14px] sm:text-[14.5px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-0 resize-none leading-[20px] overflow-y-auto max-h-[120px] py-[6px]"
          />

          <button
            type="button"
            onClick={() => {
              if (isRecording) {
                cancelRecording();
              } else {
                setNewMessage('');
              }
            }}
            className={cn(
              'w-6 h-6 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 shrink-0 ml-1 transition cursor-pointer',
              !isRecording && !newMessage.trim() && 'opacity-45 hover:opacity-100'
            )}
            title={isRecording ? 'Cancel voice recording' : 'Clear text'}
          >
            <MsgCloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Magenta-Pink Circular Send / Mic Button matching IMG_5472 */}
        {isRecording ? (
          <motion.button
            key="voice-send-btn"
            initial={{ scale: 0.88, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            type="button"
            onClick={() => stopRecording(true)}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#F246F5] text-white flex items-center justify-center hover:brightness-105 active:scale-92 transition-all cursor-pointer shrink-0"
            title="Send voice message"
          >
            <MsgSendIcon className="w-[20px] h-[20px] mr-0.5" />
          </motion.button>
        ) : hasContent ? (
          <motion.button
            key="send-btn"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={onSendMessage}
            disabled={isUploading}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#F246F5] text-white flex items-center justify-center hover:brightness-105 active:scale-92 transition-all cursor-pointer disabled:opacity-50 shrink-0"
            title="Send message"
          >
            <MsgSendIcon className="w-[20px] h-[20px] mr-0.5" />
          </motion.button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#F246F5] text-white flex items-center justify-center hover:brightness-105 active:scale-92 transition-all shrink-0 cursor-pointer"
            title="Speak / Voice message"
          >
            <MsgMicIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Bottom White Rounded "Listening..." Panel with Pastel Fluid Pearl Orb (IMG_5472) */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            key="voice-listening-panel"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="overflow-hidden"
          >
            <div className="w-full flex flex-col items-center justify-center bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-[28px] px-6 pt-5 pb-7 shadow-[0_6px_28px_rgba(120,90,160,0.06)] relative">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-[18px] font-bold text-zinc-950 dark:text-white tracking-tight">
                  Listening...
                </h3>
                <span className="text-[11px] font-mono font-semibold text-zinc-400 dark:text-zinc-500 tabular-nums">
                  {formattedRecTime}
                </span>
              </div>

              {/* Bright Pearl Sphere with Flowing Pastel Blue / Lavender / Pink Ribbons (IMG_5472) */}
              <div className="relative w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center my-1">
                <div
                  className="w-36 h-36 sm:w-40 sm:h-40 rounded-full relative overflow-hidden flex items-center justify-center shadow-[0_12px_36px_rgba(147,197,253,0.35),inset_0_0_24px_rgba(255,255,255,0.95)]"
                  style={{
                    background:
                      'radial-gradient(circle at 35% 30%, #ffffff 0%, #f5f3ff 42%, #ede9fe 72%, #fce7f3 100%)',
                  }}
                >
                  {/* Sweeping Blue-Indigo-Pink Siri Wave Ribbon 1 */}
                  <motion.div
                    animate={{
                      rotate: [0, 360],
                      scale: [1, 1.12, 0.96, 1],
                    }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="w-40 h-20 rounded-full blur-md opacity-85"
                    style={{
                      background:
                        'linear-gradient(90deg, rgba(192,132,252,0.85) 0%, rgba(96,165,250,0.9) 48%, rgba(59,130,246,0.9) 70%, rgba(244,114,182,0.8) 100%)',
                    }}
                  />
                  {/* Sweeping Pastel Magenta-Cyan Highlight Ribbon 2 */}
                  <motion.div
                    animate={{
                      rotate: [360, 0],
                      x: [-8, 10, -8],
                      y: [6, -6, 6],
                    }}
                    transition={{
                      duration: 4.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="absolute w-32 h-14 rounded-full blur-md opacity-75"
                    style={{
                      background:
                        'linear-gradient(120deg, rgba(240,171,252,0.85) 0%, rgba(167,139,250,0.8) 55%, rgba(56,189,248,0.85) 100%)',
                    }}
                  />
                  {/* Soft White Gloss Pearl Shell Overlay */}
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(circle at 30% 22%, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.22) 45%, rgba(255,255,255,0.5) 100%)',
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
