import React, { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import {
  isAuthVoiceMuted,
  toggleAuthVoiceMute,
  playAuthVoice,
} from "../lib/authVoiceAndValidation";

import React, { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import {
  isAuthVoiceMuted,
  toggleAuthVoiceMute,
  playAuthVoice,
} from "../lib/authVoiceAndValidation";

export const AuthVoiceToggle: React.FC<{
  className?: string;
  isInline?: boolean;
}> = ({ className, isInline = false }) => {
  const [muted, setMuted] = useState<boolean>(true);

  useEffect(() => {
    setMuted(isAuthVoiceMuted());
  }, []);

  const handleToggle = () => {
    const nextMuted = toggleAuthVoiceMute();
    setMuted(nextMuted);
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
        onClick={handleToggle}
        title={muted ? "ভয়েস চালু করুন" : "ভয়েস বন্ধ করুন"}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-xl shadow-xs border transition cursor-pointer active:scale-95 ${
          muted
            ? "bg-zinc-100 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200/70 dark:hover:bg-zinc-700"
            : "bg-[#0064e0] text-white border-[#0052b8] shadow-blue-500/20 animate-pulse"
        }`}
      >
        {muted ? (
          <VolumeX className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <Volume2 className="w-3.5 h-3.5 shrink-0" />
        )}
        <span className="text-[11px] font-bold tracking-tight whitespace-nowrap">
          {muted ? "ভয়েস বন্ধ" : "ভয়েস চালু"}
        </span>
      </button>
    </div>
  );
};

export default AuthVoiceToggle;
