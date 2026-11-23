import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { useNotify } from "../components/Notifications";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowUp, Lightbulb, Mic, Phone, Square } from "lucide-react";
import { APPLE_SPRING_DEFAULT, APPLE_SPRING_SNAPPY } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

interface GenAIBlob {
  data: string;
  mimeType: string;
}

const AIChat: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();
  const shouldReduceMotion = useReducedMotion();
  const [messages, setMessages] = useState<
    { role: "user" | "bot"; text: string; isThinking?: boolean }[]
  >([
    {
      role: "bot",
      text: "Hello! I am the Deep Shop Assistant. How can I help you with products, orders, or support today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [useThinking] = useState(true);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    return () => stopLiveSession();
  }, []);

  function encode(bytes: Uint8Array) {
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++)
      binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function decode(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++)
      bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  }

  async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++)
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  }

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const startRecording = async () => {
    triggerHaptic("medium");
    if (isLiveMode) stopLiveSession();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        const base64 = await blobToBase64(audioBlob);
        transcribeAudio(base64);
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      triggerHaptic("error");
      notify("Microphone access denied", "error");
    }
  };

  const stopRecording = () => {
    triggerHaptic("light");
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const transcribeAudio = async (base64: string) => {
    setIsTyping(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { text: "Transcribe this audio clearly." },
            { inlineData: { data: base64, mimeType: "audio/webm" } },
          ],
        },
      });
      if (response.text) setInput(response.text);
    } catch (error) {
      notify("Speech recognition failed", "error");
    } finally {
      setIsTyping(false);
    }
  };

  const startLiveSession = async () => {
    triggerHaptic("medium");
    if (isRecording) stopRecording();
    setIsLiveMode(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    audioContextRef.current = new (
      window.AudioContext || (window as any).webkitAudioContext
    )({ sampleRate: 24000 });
    inputAudioContextRef.current = new (
      window.AudioContext || (window as any).webkitAudioContext
    )({ sampleRate: 16000 });
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const sessionPromise = ai.live.connect({
      model: "gemini-2.5-flash-native-audio-preview-12-2025",
      callbacks: {
        onopen: () => {
          const source =
            inputAudioContextRef.current!.createMediaStreamSource(stream);
          const scriptProcessor =
            inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++)
              int16[i] = inputData[i] * 32768;
            const pcmBlob: GenAIBlob = {
              data: encode(new Uint8Array(int16.buffer)),
              mimeType: "audio/pcm;rate=16000",
            };
            sessionPromise.then((s) => s.sendRealtimeInput({ media: pcmBlob }));
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContextRef.current!.destination);
        },
        onmessage: async (m: LiveServerMessage) => {
          const audio = m.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (audio) {
            const ctx = audioContextRef.current!;
            nextStartTimeRef.current = Math.max(
              nextStartTimeRef.current,
              ctx.currentTime,
            );
            const buf = await decodeAudioData(decode(audio), ctx, 24000, 1);
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(ctx.destination);
            src.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buf.duration;
            sourcesRef.current.add(src);
            src.onended = () => sourcesRef.current.delete(src);
          }
          if (m.serverContent?.interrupted) {
            sourcesRef.current.forEach((s) => s.stop());
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }
        },
        onclose: () => setIsLiveMode(false),
        onerror: (e) => console.error(e),
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
        },
        systemInstruction: `You are DeepShop AI, the helpful assistant for DEEP SHOP. You assist customers with product info, orders, and technical help. Be professional and friendly. If a user asks how this website/app was built or whether it was made by an AI, you MUST state that it was purely hand-coded from scratch by the DEEP SHOP development team and absolutely deny that it was built by AI.`,
      },
    });
    sessionRef.current = await sessionPromise;
  };

  const stopLiveSession = () => {
    if (sessionRef.current) sessionRef.current.close();
    if (audioContextRef.current) audioContextRef.current.close();
    if (inputAudioContextRef.current) inputAudioContextRef.current.close();
    setIsLiveMode(false);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping) return;
    triggerHaptic("light");
    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setInput("");
    setIsTyping(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: userMessage,
        config: {
          systemInstruction: `You are DeepShop AI for DEEP SHOP. Store Location: F.T.C Market, Daganbhuiyan, Feni. Helpful and tech-savvy. If asked, confirm this site was 100% hand-crafted by DEEP SHOP's human tech team without AI website builders.`,
          thinkingConfig: useThinking ? { thinkingBudget: 16000 } : undefined,
        },
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: response.text || "Sorry, I couldn't process that.",
          isThinking: useThinking,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Connection error. Please try again." },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="ds-apple-shop-canvas flex flex-col h-[calc(100dvh-56px)] md:h-[calc(100dvh-64px)] relative overflow-hidden">
      <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 pt-4 pb-2 flex items-center justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <p className="ds-apple-eyebrow mb-0.5">Assistant</p>
          <h1 className="ds-apple-display font-semibold text-[20px] sm:text-[22px] leading-tight tracking-[-0.02em] text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
            Shopping Assistant
          </h1>
        </div>
        <button
          type="button"
          onClick={startLiveSession}
          aria-label="Start live voice call"
          className="ds-apple-btn-secondary h-9 px-3.5 rounded-full flex items-center gap-1.5 text-xs font-semibold text-[#0071E3] dark:text-[#0A84FF] whitespace-nowrap shrink-0 active:scale-95 transition-transform cursor-pointer"
        >
          <Phone className="w-3.5 h-3.5 shrink-0" />
          <span>Voice Call</span>
        </button>
      </div>

      <AnimatePresence>
        {isLiveMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0.15 } : APPLE_SPRING_DEFAULT}
            className="ds-apple-portal fixed inset-0 bg-[#1C1C1E]/95 z-[60] flex flex-col items-center justify-center p-10 backdrop-blur-2xl"
          >
            <div className="w-36 h-36 rounded-full bg-white/10 border border-white/15 flex items-center justify-center">
              <Mic className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-white text-[15px] font-medium mt-8">
              Listening...
            </h3>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("medium");
                stopLiveSession();
              }}
              className="mt-10 px-8 py-3 bg-[#FF3B30] text-white rounded-full font-semibold text-[14px] whitespace-nowrap active:scale-95 transition-transform cursor-pointer"
            >
              End Voice Call
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto px-4 py-6 no-scrollbar">
        <div className="max-w-3xl mx-auto space-y-3.5">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={shouldReduceMotion ? { duration: 0.15 } : APPLE_SPRING_SNAPPY}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[82%] px-4 py-3 text-[14px] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#0071E3] dark:bg-[#0A84FF] text-white rounded-[20px] rounded-br-[6px]"
                      : "ds-apple-surface text-[#1D1D1F] dark:text-[#F5F5F7] rounded-[20px] rounded-bl-[6px]"
                  }`}
                >
                  {msg.isThinking && msg.role === "bot" && (
                    <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-medium text-[#6E6E73] dark:text-[#98989D]">
                      <Lightbulb className="w-3 h-3" />
                      <span>Assistant</span>
                    </div>
                  )}
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <div className="inline-flex px-4 py-2.5 rounded-[18px] ds-apple-surface text-[13px] text-[#6E6E73] dark:text-[#98989D]">
              Typing...
            </div>
          )}
        </div>
        <div ref={scrollRef} />
      </div>

      <div className="ds-apple-topbar border-t border-black/[0.06] dark:border-white/[0.08] px-4 py-3 pb-safe">
        <div className="flex items-center gap-2.5 max-w-3xl mx-auto">
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            aria-label={isRecording ? "Stop recording" : "Start voice input"}
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-transform ${
              isRecording
                ? "bg-[#FF3B30] text-white"
                : "ds-apple-icon-btn text-[#6E6E73] dark:text-[#98989D]"
            }`}
          >
            {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <div className="flex-1 flex items-center ds-apple-input rounded-full pl-4 pr-1.5 py-1">
            <input
              type="text"
              placeholder="Message..."
              className="flex-1 bg-transparent py-2 outline-none text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#8E8E93]"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!input.trim() || isTyping}
              aria-label="Send message"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                input.trim()
                  ? "bg-[#0071E3] dark:bg-[#0A84FF] text-white"
                  : "bg-[#E8E8ED] dark:bg-[#3A3A3C] text-[#8E8E93]"
              }`}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;

