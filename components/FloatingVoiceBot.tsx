import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, User, Bot, Volume2 } from 'lucide-react';
import VoiceMessageBubble from './ui/voice-message-bubble';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { APPLE_SPRING_DEFAULT } from '../lib/shoppingRoute';
import { triggerHaptic } from '../lib/haptics';

interface BotMessage {
  id: string;
  type: 'text' | 'voice';
  text: string;
  audioSrc?: string;
  duration?: number;
  sender: 'bot' | 'user';
}

interface PreWrittenOption {
  id: string;
  text: string;
  responseAudioSrc: string;
  responseDuration: number;
}

const FALLBACK_OPTIONS = [
  {
    id: "opt1",
    text: "Welcome message sunte chai",
    responseAudioSrc: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    responseDuration: 15
  },
  {
    id: "opt2",
    text: "Apnader service gulo ki ki?",
    responseAudioSrc: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    responseDuration: 10
  }
];

export function FloatingVoiceBot() {
  const [isOpen, setIsOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const [messages, setMessages] = useState<BotMessage[]>([
    {
      id: 'welcome',
      type: 'text',
      text: 'Assalamu Alaikum! Kemon achen? Nicher option theke jekono ekta select korte paren amader voice message shonar jonno.',
      sender: 'bot'
    }
  ]);
  const [options, setOptions] = useState<PreWrittenOption[]>(FALLBACK_OPTIONS);

  useEffect(() => {
    async function fetchBotOptions() {
      try {
        const docRef = doc(db, 'settings', 'voiceBot');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.options && Array.isArray(data.options)) {
            setOptions(data.options);
          }
        }
      } catch (err) {
        console.log("Error loading voice bot settings:", err);
      }
    }
    fetchBotOptions();
  }, []);

  const handleOptionClick = (opt: PreWrittenOption) => {
    triggerHaptic('selection');
    const userMsg: BotMessage = {
      id: Date.now().toString(),
      type: 'text',
      text: opt.text,
      sender: 'user'
    };

    setMessages(prev => [...prev, userMsg]);

    setTimeout(() => {
      const botVoiceMsg: BotMessage = {
        id: (Date.now() + 1).toString(),
        type: 'voice',
        text: '',
        audioSrc: opt.responseAudioSrc,
        duration: opt.responseDuration,
        sender: 'bot'
      };
      setMessages(prev => [...prev, botVoiceMsg]);
    }, 650);
  };

  return (
    <>
      <motion.button
        type="button"
        className="fixed bottom-20 sm:bottom-6 right-6 w-13 h-13 bg-[#0071E3] dark:bg-[#0A84FF] text-white rounded-full shadow-lg flex items-center justify-center z-[99] cursor-pointer"
        whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
        onClick={() => {
          triggerHaptic('selection');
          setIsOpen(true);
        }}
        initial={false}
        animate={{ scale: isOpen ? 0 : 1, opacity: isOpen ? 0 : 1 }}
        transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_DEFAULT}
        aria-label="Open Voice Assistant"
      >
        <Volume2 className="w-5 h-5" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
            transition={prefersReducedMotion ? { duration: 0.16 } : APPLE_SPRING_DEFAULT}
            className="ds-apple-popover fixed bottom-20 sm:bottom-24 right-4 sm:right-6 w-[340px] sm:w-[380px] rounded-[24px] flex flex-col overflow-hidden z-[100]"
          >
            {/* Header */}
            <div className="bg-[#0071E3] dark:bg-[#0A84FF] px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white text-[14px] font-semibold flex items-center gap-2">
                    Voice Assistant
                    <span className="w-2 h-2 bg-[#30D158] rounded-full" />
                  </h3>
                  <p className="text-white/80 text-[11px] text-left">Typically replies instantly</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setIsOpen(false);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/15 text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 p-4 overflow-y-auto max-h-[380px] flex flex-col gap-3.5 bg-[#F5F5F7] dark:bg-black/40">
              {messages.map((msg, index) => (
                <div
                  key={`${msg.id || index}-${index}`}
                  className={`flex gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-7 h-7 rounded-full flex shrink-0 items-center justify-center ${
                    msg.sender === 'user'
                      ? 'bg-[#0071E3]/12 dark:bg-[#0A84FF]/20 text-[#0071E3] dark:text-[#0A84FF]'
                      : 'bg-black/[0.06] dark:bg-white/[0.1] text-[#6E6E73] dark:text-[#98989D]'
                  }`}>
                    {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  <div className={`flex flex-col gap-1 max-w-[80%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    {msg.type === 'text' && (
                      <div className={`px-3.5 py-2.5 rounded-[18px] text-[13px] leading-snug ${
                        msg.sender === 'user'
                          ? 'bg-[#0071E3] dark:bg-[#0A84FF] text-white'
                          : 'bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.05] dark:border-white/[0.08]'
                      }`}>
                        {msg.text}
                      </div>
                    )}

                    {msg.type === 'voice' && msg.audioSrc && (
                      <VoiceMessageBubble
                        audioSrc={msg.audioSrc}
                        duration={msg.duration || 10}
                        bubbleColor={msg.sender === 'user' ? '#0071E3' : 'var(--card)'}
                        waveColor={msg.sender === 'user' ? '#fff' : '#0071E3'}
                        className={msg.sender === 'user' ? '' : 'bg-white dark:bg-[#1C1C1E] border border-black/[0.05] dark:border-white/[0.08] dark:text-white'}
                      />
                    )}
                    <span className="text-[10px] text-[#6E6E73] dark:text-[#98989D] px-1">Just now</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pre-written Options Footer */}
            <div className="p-3.5 bg-white dark:bg-[#1C1C1E] border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-2">
              <p className="text-[11px] text-[#6E6E73] dark:text-[#98989D] font-semibold px-1">
                Frequently asked questions:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleOptionClick(opt)}
                    className="text-left text-[12.5px] font-medium bg-[#0071E3]/8 hover:bg-[#0071E3]/14 dark:bg-[#0A84FF]/14 dark:hover:bg-[#0A84FF]/22 text-[#0071E3] dark:text-[#0A84FF] rounded-[12px] px-3 py-2 transition-colors cursor-pointer active:scale-[0.98]"
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
