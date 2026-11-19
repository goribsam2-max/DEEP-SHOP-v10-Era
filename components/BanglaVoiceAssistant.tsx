import React, { useState, useEffect } from "react";
import { Volume2, VolumeX, Sparkles } from "lucide-react";
import { triggerHaptic } from "../lib/haptics";

interface BanglaVoiceAssistantProps {
  customMessage?: string;
}

export const BanglaVoiceAssistant: React.FC<BanglaVoiceAssistantProps> = ({
  customMessage,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  const defaultInstructions =
    "ক্যাশ অন ক্যাম্পেইনে আপনাকে স্বাগতম। এই ফর্মে আপনার নাম, মোবাইল নম্বর, ঠিকানা এবং টিকটক ইউজারনেম দিন। চার টি স্ক্রিনশট আপলোড করুন - প্রথমত টিকটক ফলো স্ক্রিনশট এবং ৩ টি ভিডিওতে লাইক ও কমেন্টের স্ক্রিনশট। তারপর সাবমিট বাটনে চাপ দিন।";

  const messageToRead = customMessage || defaultInstructions;

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setSpeechSupported(false);
    }
  }, []);

  const toggleSpeech = () => {
    if (!speechSupported || !("speechSynthesis" in window)) return;
    triggerHaptic("selection");

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(messageToRead);
    utterance.lang = "bn-BD";
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const bnVoice = voices.find(
      (v) => v.lang.includes("bn") || v.name.toLowerCase().includes("bengali")
    );
    if (bnVoice) {
      utterance.voice = bnVoice;
    }

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  return (
    <div className="bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] rounded-[20px] p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-[#0071E3]/12 dark:bg-[#0A84FF]/16 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="text-left min-w-0">
          <h4 className="text-[13px] sm:text-[14px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-1.5">
            <span>ভয়েস নির্দেশিকা (Bangla Voice Guide)</span>
            <span className="px-1.5 py-0.5 rounded-md bg-[#0071E3]/10 dark:bg-[#0A84FF]/16 text-[#0071E3] dark:text-[#0A84FF] text-[10px] font-semibold">
              Audio
            </span>
          </h4>
          <p className="text-[12px] text-[#6E6E73] dark:text-[#98989D] truncate mt-0.5">
            ফর্ম পূরণের নিয়ম বাংলায় শুনতে স্পিকার বাটনে চাপুন
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={toggleSpeech}
        className={`px-4 py-2 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-transform active:scale-[0.96] cursor-pointer shrink-0 ${
          isPlaying
            ? "bg-[#FF3B30] dark:bg-[#FF453A] text-white"
            : "bg-[#0071E3] dark:bg-[#0A84FF] text-white hover:opacity-95"
        }`}
      >
        {isPlaying ? (
          <>
            <VolumeX className="w-4 h-4" />
            <span>থামুন (Stop)</span>
          </>
        ) : (
          <>
            <Volume2 className="w-4 h-4" />
            <span>শুনুন (Listen)</span>
          </>
        )}
      </button>
    </div>
  );
};
