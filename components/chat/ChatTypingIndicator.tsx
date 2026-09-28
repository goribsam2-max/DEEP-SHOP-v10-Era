import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Camera, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ChatActivityType = 'typing' | 'recording' | 'uploading_photo' | 'choosing_gif' | null;

interface ChatTypingIndicatorProps {
  activity: ChatActivityType;
  userName?: string;
  userPhoto?: string;
  className?: string;
}

export const ChatTypingIndicator: React.FC<ChatTypingIndicatorProps> = ({
  activity,
  userName = 'Someone',
  userPhoto,
  className
}) => {
  if (!activity) return null;

  const displayName = userName.split(' ')[0] || userName;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
        className={cn("flex items-end gap-2 my-2 select-none", className)}
      >
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex items-center justify-center shrink-0 shadow-sm border border-zinc-300/60 dark:border-zinc-700/60">
          {userPhoto ? (
            <img src={userPhoto} alt={userName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300">
              {displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>

        {/* Bubble */}
        <div className="px-4 py-2.5 rounded-[20px] rounded-bl-xs bg-[#F0F2F5] dark:bg-[#1E1F24] border border-zinc-200/80 dark:border-zinc-750/70 shadow-xs flex items-center gap-2.5 text-zinc-800 dark:text-zinc-200">
          {/* 1. Typing Animation */}
          {activity === 'typing' && (
            <>
              <div className="flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{
                      y: [0, -5, 0],
                      opacity: [0.4, 1, 0.4],
                    }}
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
                      delay: i * 0.18,
                      ease: 'easeInOut',
                    }}
                    className="w-1.5 h-1.5 rounded-full bg-[#5B51D8] dark:bg-[#7B73F0]"
                  />
                ))}
              </div>
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                {displayName} is typing...
              </span>
            </>
          )}

          {/* 2. Recording Voice Animation */}
          {activity === 'recording' && (
            <>
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center"
              >
                <Mic className="w-3.5 h-3.5" />
              </motion.div>
              {/* Waveform bars */}
              <div className="flex items-center gap-0.5 h-3">
                {[4, 10, 6, 12, 8, 5].map((h, i) => (
                  <motion.span
                    key={i}
                    animate={{ height: [`${h}px`, `${h * 1.5}px`, `${h}px`] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                    className="w-0.5 bg-rose-500 rounded-full"
                  />
                ))}
              </div>
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {displayName} is recording audio...
              </span>
            </>
          )}

          {/* 3. Sending Photo Animation */}
          {activity === 'uploading_photo' && (
            <>
              <motion.div
                animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center"
              >
                <Camera className="w-3.5 h-3.5" />
              </motion.div>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {displayName} is sending a photo...
              </span>
            </>
          )}

          {/* 4. Picking GIF Animation */}
          {activity === 'choosing_gif' && (
            <>
              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 15, -15, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              </motion.div>
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                {displayName} is choosing a GIF...
              </span>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
