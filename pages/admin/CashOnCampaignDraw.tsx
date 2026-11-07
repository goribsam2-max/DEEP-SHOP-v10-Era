import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { triggerHaptic } from "../../lib/haptics";
import { useNotify } from "../../components/Notifications";
import SEO from "../../components/SEO";
import {
  RefreshCw,
  Trophy,
  Sparkles,
  ChevronLeft,
  CheckCircle2,
  Gift,
  Zap,
  ShoppingBag,
  UserCheck,
} from "lucide-react";

interface DemoWinner {
  id: string;
  name: string;
  email: string;
  phone: string;
  tiktokUsername: string;
  avatar: string;
  location: string;
}

const DEMO_WINNERS_POOL: DemoWinner[] = [
  {
    id: "winner_1",
    name: "Tasmia Rahman",
    email: "tasmia29837@gmail.com",
    phone: "01789-432109",
    tiktokUsername: "@tasmia_official",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    location: "Dhaka, Bangladesh",
  },
  {
    id: "winner_2",
    name: "Sabbir Hossain",
    email: "sabbir84729@gmail.com",
    phone: "01812-987654",
    tiktokUsername: "@sabbir_vlogs",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80",
    location: "Chittagong, Bangladesh",
  },
  {
    id: "winner_3",
    name: "Nusrat Jahan Tanha",
    email: "tanha49215@gmail.com",
    phone: "01955-123456",
    tiktokUsername: "@tanha_style",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80",
    location: "Sylhet, Bangladesh",
  },
  {
    id: "winner_4",
    name: "Mahmudul Hasan",
    email: "mahmud81734@gmail.com",
    phone: "01633-876543",
    tiktokUsername: "@mahmud_tech",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80",
    location: "Rajshahi, Bangladesh",
  },
  {
    id: "winner_5",
    name: "Anika Tabassum",
    email: "anika58193@gmail.com",
    phone: "01522-345678",
    tiktokUsername: "@anika_tabassum",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80",
    location: "Khulna, Bangladesh",
  },
];

export default function CashOnCampaignDraw() {
  const navigate = useNavigate();
  const notify = useNotify();

  const [isDrawing, setIsDrawing] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [tickerIndex, setTickerIndex] = useState(0);

  const [revealedWinners, setRevealedWinners] = useState<DemoWinner[]>([]);
  const [latestWinner, setLatestWinner] = useState<DemoWinner | null>(null);

  useEffect(() => {
    let timer: any;
    let ticker: any;

    if (isDrawing) {
      // 10-second countdown timer
      setCountdown(10);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Shuffling ticker effect
      ticker = setInterval(() => {
        setTickerIndex((prev) => (prev + 1) % DEMO_WINNERS_POOL.length);
      }, 120);
    }

    return () => {
      clearInterval(timer);
      clearInterval(ticker);
    };
  }, [isDrawing]);

  // When countdown hits 0, finish selection
  useEffect(() => {
    if (isDrawing && countdown === 0) {
      setIsDrawing(false);

      // Pick next unrevealed winner or loop
      const nextIndex = revealedWinners.length % DEMO_WINNERS_POOL.length;
      const winner = DEMO_WINNERS_POOL[nextIndex];

      setLatestWinner(winner);
      setRevealedWinners((prev) => [winner, ...prev.filter((w) => w.id !== winner.id)]);
      triggerHaptic();
      notify(`🎉 Winner Selected: ${winner.name}!`, "success");
    }
  }, [countdown, isDrawing, revealedWinners.length]);

  const handleStartDraw = () => {
    if (isDrawing) return;
    triggerHaptic();
    setLatestWinner(null);
    setIsDrawing(true);
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#0E1017] text-zinc-900 dark:text-zinc-100 p-4 sm:p-6 font-sans">
      <SEO title="Random Winner Draw — Cash on Campaign" description="Official winner selection system" />

      {/* Header */}
      <header className="max-w-4xl mx-auto flex items-center justify-center pb-6 border-b border-zinc-200/80 dark:border-white/10 text-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            <span>Random Winner Draw</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Cash on Campaign Official Selection System
          </p>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto py-8 space-y-8">
        {/* Selection Stage Box */}
        <div className="bg-white dark:bg-[#141720] border border-zinc-200/80 dark:border-white/10 rounded-[36px] p-6 sm:p-10 text-center space-y-6 relative overflow-hidden shadow-sm">
          {/* Shuffling Screen Animation */}
          {isDrawing ? (
            <div className="space-y-6 py-6">
              <div className="w-24 h-24 rounded-full bg-pink-500/10 border-2 border-pink-500 p-1 mx-auto flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-zinc-50 dark:bg-[#141720] flex items-center justify-center text-3xl font-black text-amber-500">
                  {countdown}s
                </div>
              </div>

              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 text-xs font-bold border border-pink-500/20 animate-pulse">
                  Selecting Random Winner ...
                </span>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  {DEMO_WINNERS_POOL[tickerIndex].name}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  {DEMO_WINNERS_POOL[tickerIndex].tiktokUsername}
                </div>
              </div>

              <div className="w-full max-w-xs mx-auto bg-zinc-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-pink-500 h-full transition-all duration-1000"
                  style={{ width: `${((10 - countdown) / 10) * 100}%` }}
                />
              </div>
            </div>
          ) : latestWinner ? (
            /* Revealed Winner Stage */
            <div className="space-y-5 py-4 animate-in fade-in zoom-in duration-300">
              <div className="w-24 h-24 rounded-full p-1 bg-amber-400 mx-auto relative shadow-md">
                <img
                  src={latestWinner.avatar}
                  alt={latestWinner.name}
                  className="w-full h-full rounded-full object-cover"
                />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center font-bold text-xs shadow-sm">
                  <Trophy className="w-4.5 h-4.5" />
                </div>
              </div>

              <div>
                <span className="px-3.5 py-1 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-400 border border-amber-400/30 text-xs font-bold">
                  Selected Winner 🎉
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mt-2">
                  {latestWinner.name}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{latestWinner.email} · {latestWinner.phone}</p>
                <p className="text-xs font-mono text-pink-500 mt-0.5">{latestWinner.tiktokUsername}</p>
              </div>

              {/* 1-Click Cash on Delivery Trigger */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  notify(`Cash on Delivery Access Granted to ${latestWinner.name}!`, "success");
                }}
                className="px-6 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 mx-auto hover:bg-emerald-700 active:scale-95 transition cursor-pointer shadow-sm"
              >
                <UserCheck className="w-4.5 h-4.5" />
                <span>1-Click Cash on Delivery Order Granted</span>
              </button>
            </div>
          ) : (
            /* Default Ready Stage */
            <div className="space-y-4 py-8">
              <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center mx-auto text-amber-500">
                <Sparkles className="w-9 h-9" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                Ready to Select Winner
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                ১০ সেকেন্ডের এনিমেশনের মাধ্যমে যেকোনো ১ জন বিজয়ী নির্বাচন করতে নিচের বাটনে চাপ দিন।
              </p>
            </div>
          )}

          {/* Large "Select Winner 🎲" Button */}
          <button
            type="button"
            onClick={handleStartDraw}
            disabled={isDrawing}
            className="w-full py-4 sm:py-5 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold text-base sm:text-lg flex items-center justify-center gap-3 shadow-md hover:bg-zinc-800 dark:hover:bg-zinc-100 active:scale-98 transition duration-200 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isDrawing ? "animate-spin" : ""}`} />
            <span>{isDrawing ? "Selecting Random Winner..." : "Select Winner 🎲"}</span>
          </button>
        </div>

        {/* Selected Winners Stream */}
        {revealedWinners.length > 0 && (
          <div className="bg-white dark:bg-[#141720] border border-zinc-200/80 dark:border-white/10 rounded-[32px] p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Selected Campaign Winners ({revealedWinners.length} / 5)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {revealedWinners.map((winner, idx) => (
                <div
                  key={winner.id}
                  className="bg-zinc-50 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 rounded-2xl p-3.5 flex items-center gap-3"
                >
                  <img
                    src={winner.avatar}
                    alt={winner.name}
                    className="w-12 h-12 rounded-full object-cover border border-amber-400 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate">{winner.name}</h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{winner.email}</p>
                    <span className="text-[10px] font-mono text-pink-500">{winner.tiktokUsername}</span>
                  </div>
                  <span className="px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold shrink-0">
                    COD Active
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
