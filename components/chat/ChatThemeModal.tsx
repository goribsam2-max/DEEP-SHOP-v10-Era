import React from 'react';
import { X, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export interface ChatTheme {
  id: string;
  name: string;
  gradient: string;
  bubbleClass: string;
  bgClass: string;
}

export const CHAT_THEMES: ChatTheme[] = [
  {
    id: 'default',
    name: 'Default',
    gradient: 'from-indigo-500 to-blue-600',
    bubbleClass: 'bg-[#5B51D8] text-white shadow-sm',
    bgClass: 'bg-[#F2F4F7] dark:bg-[#0E0F12]',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    gradient: 'from-fuchsia-500 via-purple-600 to-cyan-500',
    bubbleClass: 'bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white shadow-md',
    bgClass: 'bg-[#181126] dark:bg-[#0D0B14]',
  },
  {
    id: 'lavender',
    name: 'Lavender Bloom',
    gradient: 'from-purple-400 to-pink-400',
    bubbleClass: 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md',
    bgClass: 'bg-[#F3E8FF] dark:bg-[#1E122B]',
  },
  {
    id: 'emerald',
    name: 'Emerald Forest',
    gradient: 'from-emerald-400 to-teal-500',
    bubbleClass: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md',
    bgClass: 'bg-[#ECFDF5] dark:bg-[#0A2016]',
  },
  {
    id: 'sunset',
    name: 'Sunset Glow',
    gradient: 'from-orange-500 via-amber-500 to-rose-500',
    bubbleClass: 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md',
    bgClass: 'bg-[#FFF7ED] dark:bg-[#25130D]',
  },
  {
    id: 'midnight',
    name: 'Midnight Ocean',
    gradient: 'from-indigo-600 to-slate-900',
    bubbleClass: 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md',
    bgClass: 'bg-[#0F172A] dark:bg-[#080D1A]',
  },
];

interface ChatThemeModalProps {
  isOpen: boolean;
  activeThemeId: string;
  onClose: () => void;
  onSelectTheme: (theme: ChatTheme) => void;
}

export const ChatThemeModal: React.FC<ChatThemeModalProps> = ({
  isOpen,
  activeThemeId,
  onClose,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10015] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="w-full max-w-md bg-white dark:bg-[#1E1F24] rounded-t-3xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-750 shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto my-3" />

        <div className="px-5 pb-3 flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <h3 className="font-bold text-base text-zinc-900 dark:text-white">Chat Themes</h3>
          <div className="w-9" />
        </div>

        <div className="p-4 space-y-2.5 max-h-[60vh] overflow-y-auto no-scrollbar">
          {CHAT_THEMES.map((theme) => {
            const isSelected = activeThemeId === theme.id;
            return (
              <div
                key={theme.id}
                onClick={() => {
                  onSelectTheme(theme);
                  onClose();
                }}
                className={`p-3.5 rounded-2xl flex items-center justify-between border cursor-pointer transition ${
                  isSelected
                    ? 'border-[#5B51D8] bg-indigo-50/60 dark:bg-indigo-950/40 shadow-xs'
                    : 'border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl bg-gradient-to-br ${theme.gradient} shadow-md shrink-0 border border-white/20`}
                  />
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {theme.name}
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {theme.id === 'default' ? 'Classic message view' : 'Custom gradient bubbles & background'}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-[#5B51D8] text-white flex items-center justify-center shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
