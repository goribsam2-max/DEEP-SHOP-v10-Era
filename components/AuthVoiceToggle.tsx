import React, { useEffect, useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AuthVoiceState,
  getAuthVoiceState,
  playAuthVoice,
  subscribeAuthVoiceState,
  toggleAuthVoiceMute,
} from "../lib/authVoiceAndValidation";

const AnimatedManVoiceEmoji: React.FC<{
  muted: boolean;
  isSpeaking: boolean;
}> = ({ muted, isSpeaking }) => {
  const uid = useId().replace(/:/g, "");
  const faceGradId = `manFaceGrad_${uid}`;
  const hairGradId = `manHairGrad_${uid}`;
  const handGradId = `manHandGrad_${uid}`;
  const bgGradId = `manBgGrad_${uid}`;

  const activelyTalking = !muted && isSpeaking;

  return (
    <div className="relative w-8 h-8 shrink-0 select-none flex items-center justify-center">
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-8 h-8 overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={bgGradId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={muted ? "#E2E8F0" : "#DBEAFE"} />
            <stop offset="100%" stopColor={muted ? "#CBD5E1" : "#BFDBFE"} />
          </linearGradient>
          <linearGradient id={faceGradId} x1="32" y1="12" x2="32" y2="54" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFE1B8" />
            <stop offset="65%" stopColor="#F9C793" />
            <stop offset="100%" stopColor="#EEAC72" />
          </linearGradient>
          <linearGradient id={hairGradId} x1="16" y1="8" x2="48" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3B2822" />
            <stop offset="100%" stopColor="#1E1310" />
          </linearGradient>
          <linearGradient id={handGradId} x1="20" y1="34" x2="46" y2="54" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFE4BF" />
            <stop offset="100%" stopColor="#EDA96E" />
          </linearGradient>
        </defs>

        {/* Soft circular avatar backdrop (no blinking) */}
        <circle cx="32" cy="32" r="30" fill={`url(#${bgGradId})`} />

        {/* Male Shirt & Collar */}
        <path
          d="M14 56C16.8 49.5 23.4 46.5 32 46.5C40.6 46.5 47.2 49.5 50 56C45.2 60.4 38.9 62 32 62C25.1 62 18.8 60.4 14 56Z"
          fill={muted ? "#64748B" : "#0064E0"}
        />
        <path
          d="M26.5 46.8L32 52.5L37.5 46.8"
          fill="#FFFFFF"
          opacity="0.92"
        />

        {/* Animated Head Group (gentle natural speaking motion only while talking; never blinks) */}
        <motion.g
          animate={
            activelyTalking
              ? {
                  y: [0, -1.1, 0.4, -0.8, 0],
                  rotate: [0, -1.3, 1.1, -0.7, 0],
                }
              : { y: 0, rotate: 0 }
          }
          transition={
            activelyTalking
              ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.2 }
          }
          style={{ originX: "32px", originY: "36px" }}
        >
          {/* Neck */}
          <rect x="27" y="42" width="10" height="8" rx="4" fill="#E9A66B" />

          {/* Ears */}
          <circle cx="13.5" cy="33.5" r="4.2" fill="#F3B882" />
          <circle cx="50.5" cy="33.5" r="4.2" fill="#F3B882" />

          {/* Male Head */}
          <rect
            x="14.5"
            y="13"
            width="35"
            height="36.5"
            rx="16.5"
            fill={`url(#${faceGradId})`}
          />

          {/* Warm Cheek Tint */}
          <ellipse cx="21" cy="36.5" rx="3.4" ry="2" fill="#F48B7B" opacity="0.28" />
          <ellipse cx="43" cy="36.5" rx="3.4" ry="2" fill="#F48B7B" opacity="0.28" />

          {/* Expressive Male Eyebrows */}
          <motion.g
            animate={
              muted
                ? { y: -1.2 }
                : activelyTalking
                ? { y: [0, -1.3, 0, -0.9, 0] }
                : { y: 0 }
            }
            transition={
              activelyTalking
                ? { duration: 0.75, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.2 }
            }
          >
            <path
              d="M20.5 26.8C22.4 25.3 25.5 25.2 27.6 26.3"
              stroke="#2A1B17"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <path
              d="M36.4 26.3C38.5 25.2 41.6 25.3 43.5 26.8"
              stroke="#2A1B17"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </motion.g>

          {/* Steady Friendly Eyes (Explicitly NO blinking) */}
          <g>
            <circle cx="24.2" cy="31.2" r="2.5" fill="#1F1614" />
            <circle cx="25" cy="30.4" r="0.85" fill="#FFFFFF" />
            <circle cx="39.8" cy="31.2" r="2.5" fill="#1F1614" />
            <circle cx="40.6" cy="30.4" r="0.85" fill="#FFFFFF" />
          </g>

          {/* Subtle Nose */}
          <path
            d="M32 32.2V35.8C32 36.7 31.1 37.2 30.3 36.9"
            stroke="#D58E56"
            strokeWidth="1.9"
            strokeLinecap="round"
          />

          {/* Mouth: Animated talking mouth when speaking, friendly smile when idle */}
          {activelyTalking ? (
            <motion.g
              animate={{
                scaleY: [0.35, 1.12, 0.45, 1.22, 0.38, 0.98, 0.35],
                scaleX: [1, 0.9, 1.05, 0.88, 1.03, 0.93, 1],
              }}
              transition={{
                duration: 0.62,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ originX: "32px", originY: "41.5px" }}
            >
              {/* Open Mouth Cavity */}
              <rect
                x="26.2"
                y="38.2"
                width="11.6"
                height="7.2"
                rx="3.6"
                fill="#5B1919"
              />
              {/* Upper Teeth */}
              <path
                d="M27.6 38.5H36.4C36.4 39.8 35.6 40.3 32 40.3C28.4 40.3 27.6 39.8 27.6 38.5Z"
                fill="#FFFFFF"
              />
              {/* Tongue */}
              <ellipse cx="32" cy="44" rx="3.8" ry="1.9" fill="#EA6379" />
            </motion.g>
          ) : (
            <path
              d={
                muted
                  ? "M27.5 41.5H36.5"
                  : "M26.5 40.5C28.2 43.3 35.8 43.3 37.5 40.5"
              }
              stroke="#7A3426"
              strokeWidth="2.3"
              strokeLinecap="round"
            />
          )}

          {/* Stylish Male Parted Haircut */}
          <path
            d="M13.8 27.5C13.2 17.2 20.5 9.8 32 9.8C43.5 9.8 50.8 17.2 50.2 27.5C49.2 23.2 46.8 19.8 42.5 18.6C38.5 17.5 33.5 19.2 27.2 19.4C21.5 19.6 16.5 21.8 13.8 27.5Z"
            fill={`url(#${hairGradId})`}
          />
          {/* Classic Male Side-Sweep Forelock */}
          <path
            d="M19 15.2C24.5 11.2 35.8 10.6 43.2 14.8C38.4 15.8 31.8 18.5 23.5 18.2C20.8 18.1 19.4 16.8 19 15.2Z"
            fill="#4A342D"
            opacity="0.7"
          />
        </motion.g>

        {/* Hand Covering Mouth when Muted ("হাত দিয়ে মুখ বন্ধ করে রাখবে") */}
        <AnimatePresence>
          {muted && (
            <motion.g
              key="hand-over-mouth"
              initial={{ y: 15, x: 5, rotate: 14, opacity: 0 }}
              animate={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
              exit={{ y: 15, x: 5, rotate: 14, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              style={{ originX: "32px", originY: "44px" }}
            >
              {/* Subtle drop shadow behind hand on mouth */}
              <rect
                x="19.5"
                y="36.8"
                width="25"
                height="12.5"
                rx="6"
                fill="#000000"
                opacity="0.14"
              />
              {/* Palm & Fingers Pressing Across Mouth */}
              <path
                d="M20 42.5C20 39.2 22.6 36.8 26 36.8H40.5C42.7 36.8 44.5 38.4 44.5 40.5C44.5 41.3 44.2 42 43.6 42.5C44.3 43 44.7 43.8 44.5 44.7C44.3 45.8 43.2 46.6 41.8 46.7C42 47.7 41.1 48.8 39.6 48.9H26.5C22.8 48.9 20 46.2 20 42.5Z"
                fill={`url(#${handGradId})`}
                stroke="#C98249"
                strokeWidth="1.2"
              />
              {/* Thumb tucked on left cheek */}
              <path
                d="M21.2 38.5C20.2 36.6 21.3 34.6 23.2 34.8C24.8 35 25.8 36.5 25.8 38.2"
                fill={`url(#${handGradId})`}
                stroke="#C98249"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              {/* Finger separation lines for clear hand readability */}
              <path
                d="M33.5 39.8H42.5M33.5 43.1H42.8M33.5 46.2H40.5"
                stroke="#C98249"
                strokeWidth="1.15"
                strokeLinecap="round"
              />
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
};

export const AuthVoiceToggle: React.FC<{
  className?: string;
  isInline?: boolean;
}> = ({ className, isInline = false }) => {
  const [voiceState, setVoiceState] = useState<AuthVoiceState>(() =>
    getAuthVoiceState()
  );

  useEffect(() => {
    return subscribeAuthVoiceState((nextState) => {
      setVoiceState(nextState);
    });
  }, []);

  const { muted, isSpeaking } = voiceState;

  const handleToggle = () => {
    const nextMuted = toggleAuthVoiceMute();
    if (!nextMuted) {
      playAuthVoice("ভয়েস গাইড চালু করা হয়েছে।", true);
    }
  };

  const containerClass = isInline
    ? "relative inline-flex items-center shrink-0"
    : className || "fixed top-3.5 right-4 z-[200]";

  return (
    <div className={containerClass}>
      <button
        type="button"
        data-auth-voice-toggle="true"
        onClick={handleToggle}
        aria-pressed={!muted}
        title={
          muted
            ? "মুখ থেকে হাত সরিয়ে ভয়েস চালু করুন"
            : "হাত দিয়ে মুখ বন্ধ করে ভয়েস থামান"
        }
        className={`min-h-[42px] pl-1.5 pr-3.5 py-1 rounded-full border shadow-2xs flex items-center gap-2 transition-colors duration-200 cursor-pointer active:scale-[0.97] select-none ${
          muted
            ? "bg-[#f3f5f8] dark:bg-zinc-800/95 text-[#475467] dark:text-zinc-300 border-[#d5dce4] dark:border-zinc-700 hover:bg-[#e9edf2] dark:hover:bg-zinc-700/90"
            : "bg-[#eaf3ff] dark:bg-[#13253a] text-[#0056c1] dark:text-[#66adff] border-[#0064e0]/35 dark:border-[#4599ff]/40 hover:bg-[#dcebff] dark:hover:bg-[#19304b]"
        }`}
      >
        <AnimatedManVoiceEmoji muted={muted} isSpeaking={isSpeaking} />

        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-bold tracking-tight whitespace-nowrap">
            {muted ? "ভয়েস বন্ধ" : isSpeaking ? "বলছি..." : "ভয়েস চালু"}
          </span>

          {/* Smooth non-blinking voice equalizer bars ONLY while speaking */}
          {!muted && isSpeaking && (
            <span className="inline-flex items-end gap-[2px] h-3 ml-0.5" aria-hidden="true">
              <motion.span
                animate={{ height: ["4px", "11px", "5px", "10px", "4px"] }}
                transition={{ duration: 0.65, repeat: Infinity, ease: "easeInOut" }}
                className="w-[2.5px] rounded-full bg-[#0064e0] dark:bg-[#66adff]"
              />
              <motion.span
                animate={{ height: ["9px", "4px", "12px", "6px", "9px"] }}
                transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut" }}
                className="w-[2.5px] rounded-full bg-[#0064e0] dark:bg-[#66adff]"
              />
              <motion.span
                animate={{ height: ["5px", "10px", "4px", "11px", "5px"] }}
                transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
                className="w-[2.5px] rounded-full bg-[#0064e0] dark:bg-[#66adff]"
              />
            </span>
          )}
        </div>
      </button>
    </div>
  );
};

export default AuthVoiceToggle;
