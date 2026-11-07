import React, { useState, useEffect } from "react";
import { Volume2, VolumeX, Sparkles } from "lucide-react";

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

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    window.speechSynthesis.cancel(); // Stop ongoing speech

    const utterance = new SpeechSynthesisUtterance(messageToRead);
    utterance.lang = "bn-BD"; // Bengali language locale
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Pick Bengali voice if available
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
    <div className="bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 dark:from-pink-900/20 dark:via-purple-900/20 dark:to-indigo-900/20 border border-pink-500/20 dark:border-pink-500/30 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="text-left min-w-0">
          <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
            <span>ভয়েস নির্দেশিকা (Bangla Voice Guide)</span>
            <span className="px-1.5 py-0.5 rounded-md bg-pink-500/15 text-pink-600 dark:text-pink-400 text-[10px] font-bold">
              AI Audio
            </span>
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
            ফর্ম পূরণের নিয়ম বাংলায় শুনতে স্পিকার বাটনে চাপুন
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={toggleSpeech}
        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95 cursor-pointer shrink-0 ${
          isPlaying
            ? "bg-rose-500 text-white shadow-md shadow-rose-500/25"
            : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90"
        }`}
      >
        {isPlaying ? (
          <>
            <VolumeX className="w-4 h-4 animate-bounce" />
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
