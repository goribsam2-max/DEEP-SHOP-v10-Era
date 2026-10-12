import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Crown,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  ShoppingBag,
  Gift,
  Coins,
  ChevronRight,
  MessageCircle,
  Wallet,
  Bell,
  Clock,
  ExternalLink,
  ChevronLeft,
  BookOpen,
  Info,
  Truck,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { triggerHaptic } from "../lib/haptics";
import { useNotify } from "./Notifications";

interface ResellerTeacherGuideProps {
  user?: any;
  userData?: any;
  onScrollToPlans?: () => void;
  standalone?: boolean;
}

// Live interactive alerts with full details
const LIVE_ALERTS_DATA = [
  {
    id: 1,
    badge: "পরামর্শ",
    title: "০৳ অগ্রিমে আনলিমিটেড পার্সেল বুকিং",
    desc: "ভিআইপি রিসেলাররা কাস্টমারের অর্ডারে কোনো প্রকার অগ্রিম বুকিং ফি ছাড়াই সরাসরি পার্সেল পাঠাতে পারেন।",
    location: "ঢাকা",
    courier: "Steadfast Courier",
    amount: "০৳ অগ্রিম",
    time: "এইমাত্র",
  },
  {
    id: 2,
    badge: "সাকসেস",
    title: "সুমন হোসেন (চট্টগ্রাম) ৮টি ফুল ক্যাশ অন ডেলিভারি অর্ডার দিয়েছেন",
    desc: "কাস্টমার থেকে কোনো অগ্রিম না নিয়েই কাস্টমারের ঠিকানায় পার্সেল বুক করা হয়েছে। আনুমানিক প্রফিট ৩,২০০৳।",
    location: "চট্টগ্রাম",
    courier: "RedX Delivery",
    amount: "+৩,২০০৳ প্রফিট",
    time: "৩ মিনিট আগে",
  },
  {
    id: 3,
    badge: "উইথড্র",
    title: "তানভীর আহমেদ (সিলেট) প্রফিট উইথড্র করেছেন",
    desc: "রিসেলিং ও রেফারেল ওয়ালেট থেকে বিকাশ অ্যাকাউন্টে ২,৮০০৳ ইনস্ট্যান্ট ট্রান্সফার সম্পন্ন হয়েছে।",
    location: "সিলেট",
    courier: "bKash Transfer",
    amount: "২,৮০০৳ উত্তোলিত",
    time: "৬ মিনিট আগে",
  },
  {
    id: 4,
    badge: "টিপস",
    title: "কোনো প্রোডাক্টের স্টক বা গোডাউন রাখার প্রয়োজন নেই",
    desc: "কাস্টমার কনফার্ম করার পর সাইটে কাস্টমারের ঠিকানা দিলেই কোম্পানি পার্সেল প্যাক করে কুরিয়ারে দিয়ে দেয়।",
    location: "রাজশাহী",
    courier: "Auto Dispatch",
    amount: "০% ইনভেস্টমেন্ট",
    time: "৯ মিনিট আগে",
  },
  {
    id: 5,
    badge: "অ্যাক্টিভেশন",
    title: "নাসরিন সুলতানা (খুলনা) ৩০ দিনের ভিআইপি পাস চালু করেছেন",
    desc: "বিকাশ পেমেন্টের মাধ্যমে তৎক্ষণাৎ ভিআইপি স্ট্যাটাস সক্রিয় হয়েছে। আনলিমিটেড ক্যাশ অন সুবিধা আনলক।",
    location: "খুলনা",
    courier: "VIP Activated",
    amount: "৩০ দিন আনলিমিটেড",
    time: "১২ মিনিট আগে",
  },
];

export const ResellerTeacherGuide: React.FC<ResellerTeacherGuideProps> = ({
  user,
  userData,
  onScrollToPlans,
}) => {
  const navigate = useNavigate();
  const { notify } = useNotify();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"simulator" | "blueprint" | "calculator" | "refer" | "faq">("simulator");

  // Alert rotation
  const [alertIndex, setAlertIndex] = useState(0);
  const [isAlertPaused, setIsAlertPaused] = useState(false);
  const [selectedAlertModal, setSelectedAlertModal] = useState<any | null>(null);

  // Copy states
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Interactive Live Simulator State
  const [simStep, setSimStep] = useState<1 | 2 | 3 | 4>(1);
  const [simPlanType, setSimPlanType] = useState<"vip" | "free">("vip");

  // Profit Calculator State
  const [dailyOrders, setDailyOrders] = useState(6);
  const [profitMargin, setProfitMargin] = useState(350);

  // Auto rotate alerts
  useEffect(() => {
    if (isAlertPaused) return;
    const interval = setInterval(() => {
      setAlertIndex((prev) => (prev + 1) % LIVE_ALERTS_DATA.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isAlertPaused]);

  // Metrics
  const monthlyOrders = dailyOrders * 30;
  const monthlyProfit = monthlyOrders * profitMargin;
  const subCost = 13000;
  const netEarnings = monthlyProfit - subCost;
  const advanceFeeSaved = monthlyOrders * 150;

  // Referral info
  const referralCode =
    userData?.affiliateCode ||
    (user?.uid ? `VIP-${user.uid.substring(0, 6).toUpperCase()}` : "VIP-DEEPSHOP");
  const shareLink = `${window.location.origin}/?ref=${referralCode}`;

  const currentAlert = LIVE_ALERTS_DATA[alertIndex];

  const handleCopyText = async (text: string, type: "script" | "link" | "code") => {
    triggerHaptic();
    try {
      await navigator.clipboard.writeText(text);
      if (type === "script") {
        setCopiedScript(true);
        notify("কাস্টমার মেসেজিং স্ক্রিপ্ট কপি হয়েছে!", "success");
        setTimeout(() => setCopiedScript(false), 2500);
      } else if (type === "link") {
        setCopiedLink(true);
        notify("রেফারেল লিংক কপি হয়েছে!", "success");
        setTimeout(() => setCopiedLink(false), 2500);
      } else {
        setCopiedCode(true);
        notify("রেফারেল কোড কপি হয়েছে!", "success");
        setTimeout(() => setCopiedCode(false), 2500);
      }
    } catch {
      notify("কপি করা সম্ভব হয়নি", "error");
    }
  };

  const handleShareWhatsapp = () => {
    triggerHaptic();
    const text = encodeURIComponent(
      `ঘরে বসেই ০ টাকা অগ্রিমে আনলিমিটেড প্রোডাক্ট রিসেলিং ও ইনকাম করুন! আমার রেফারেল কোড "${referralCode}" ব্যবহার করে আজই শুরু করুন: ${shareLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <div className="w-full space-y-6">
      {/* 1. Professional Live Alert Bar (Interactive & Expandable) */}
      <div
        className="w-full rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs p-3 transition-colors"
        onMouseEnter={() => setIsAlertPaused(true)}
        onMouseLeave={() => setIsAlertPaused(false)}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div
            onClick={() => setSelectedAlertModal(currentAlert)}
            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shrink-0">
              <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  {currentAlert.badge}
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">&bull;</span>
                <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {currentAlert.time}
                </span>
                <span className="text-[10px] text-zinc-400 hidden md:inline-block">
                  ({currentAlert.location})
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors mt-0.5">
                {currentAlert.title}
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 shrink-0">
              <span>বিস্তারিত</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/80 pt-2 sm:pt-0 shrink-0">
            <span className="text-[10px] text-zinc-500 font-medium sm:hidden">
              {alertIndex + 1} / {LIVE_ALERTS_DATA.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setAlertIndex((prev) => (prev - 1 + LIVE_ALERTS_DATA.length) % LIVE_ALERTS_DATA.length)
                }
                className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="পূর্ববর্তী"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setAlertIndex((prev) => (prev + 1) % LIVE_ALERTS_DATA.length)}
                className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="পরবর্তী"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Details Modal */}
      {selectedAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase">
                  {selectedAlertModal.badge}
                </span>
                <span className="text-xs text-zinc-400">{selectedAlertModal.time}</span>
              </div>
              <button
                onClick={() => setSelectedAlertModal(null)}
                className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-xs font-bold p-1"
              >
                বন্ধ করুন ✕
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white leading-snug">
                {selectedAlertModal.title}
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {selectedAlertModal.desc}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">কুরিয়ার মেথড</span>
                <span className="font-bold text-zinc-900 dark:text-white">{selectedAlertModal.courier}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">স্ট্যাটাস / ভ্যালু</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedAlertModal.amount}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedAlertModal(null);
                if (onScrollToPlans) onScrollToPlans();
              }}
              className="w-full py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold flex items-center justify-center gap-2"
            >
              <span>ভিআইপি সাবস্ক্রিপশন দেখুন</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Executive Reseller Masterclass Header */}
      <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-zinc-100 dark:border-zinc-800 pb-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold border border-zinc-200 dark:border-zinc-700">
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span>রিসেলার মাস্টারক্লাস ও ব্যবসায়িক নির্দেশিকা</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-snug">
              রিসেলারদের জন্য <span className="text-emerald-600 dark:text-emerald-400">০৳ অগ্রিমে ফুল ক্যাশ অন ডেলিভারি</span> কেন সবচেয়ে লাভজনক?
            </h2>

            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              সাধারণ ক্রেতাদের প্রতি অর্ডারে ১০০-২০০৳ অগ্রিম কুরিয়ার চার্জ দেওয়া লাগে। কিন্তু রিসেলাররা <strong className="text-zinc-900 dark:text-white font-bold">ভিআইপি পাস</strong> সক্রিয় করলে নিজের কোনো টাকা অগ্রিম ছাড়াই যেকোনো কাস্টমারের ঠিকানায় সরাসরি ক্যাশ অনে পার্সেল পাঠাতে পারেন।
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
            <button
              onClick={() => {
                triggerHaptic();
                if (onScrollToPlans) onScrollToPlans();
                else navigate("/subscription");
              }}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Crown className="w-4 h-4 text-amber-500" />
              <span>সাবস্ক্রিপশন কিনুন</span>
            </button>
            <button
              onClick={() => {
                triggerHaptic();
                setActiveTab("simulator");
              }}
              className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>লাইভ ডেমো দেখুন</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3. Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {[
            { id: "simulator", label: "১. লাইভ অর্ডার ডেমো", icon: Zap },
            { id: "blueprint", label: "২. বিস্তারিত কর্মপদ্ধতি ও স্ক্রিপ্ট", icon: BookOpen },
            { id: "calculator", label: "৩. লাভ ও আয় ক্যালকুলেটর", icon: TrendingUp },
            { id: "refer", label: "৪. রেফার অ্যান্ড আর্ন (বিনা পুঁজিতে)", icon: Gift },
            { id: "faq", label: "৫. সাধারণ প্রশ্নোত্তর (FAQ)", icon: Info },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  triggerHaptic();
                  setActiveTab(tab.id as any);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                    : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Tab 1: Interactive Live Order Simulator (বাস্তব লাইভ অর্ডার ডেমো) */}
      {activeTab === "simulator" && (
        <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 space-y-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  ইন্টারেক্টিভ রিসেলার লাইভ সিমুলেটর (Live Click-through)
                </h3>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                নিচের স্টেপগুলোতে ক্লিক করে নিজের চোখে দেখুন কীভাবে ০৳ অগ্রিমে কাস্টমারের অর্ডার প্লেস হয়:
              </p>
            </div>

            {/* Toggle VIP vs Free Member in simulator */}
            <div className="flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 self-start sm:self-auto text-xs">
              <button
                onClick={() => {
                  triggerHaptic();
                  setSimPlanType("vip");
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  simPlanType === "vip"
                    ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-2xs"
                    : "text-zinc-500"
                }`}
              >
                👑 VIP মেম্বার (০৳ অগ্রিম)
              </button>
              <button
                onClick={() => {
                  triggerHaptic();
                  setSimPlanType("free");
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  simPlanType === "free"
                    ? "bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-2xs"
                    : "text-zinc-500"
                }`}
              >
                ফ্রি ইউজার (অগ্রিম প্রযোজ্য)
              </button>
            </div>
          </div>

          {/* Step indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { num: 1, title: "১. প্রোডাক্ট সিলেক্ট", desc: "হোলসেল ও লাভ রেট" },
              { num: 2, title: "২. কাস্টমার তথ্য", desc: "ঠিকানা ও ফোন নম্বর" },
              { num: 3, title: "৩. চেকআউট চেক", desc: "অগ্রিম চার্জ ০৳" },
              { num: 4, title: "৪. প্রফিট কালেকশন", desc: "বিকাশে উত্তোলন" },
            ].map((st) => (
              <button
                key={st.num}
                onClick={() => {
                  triggerHaptic();
                  setSimStep(st.num as any);
                }}
                className={`p-3 rounded-2xl text-left border transition-all ${
                  simStep === st.num
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-2xs"
                    : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                }`}
              >
                <div className="text-xs font-bold">{st.title}</div>
                <div className="text-[10px] opacity-80 mt-0.5">{st.desc}</div>
              </button>
            ))}
          </div>

          {/* Simulator Content Area */}
          <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
            {simStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      ধাপ ১ / প্রোডাক্ট সিলেকশন
                    </span>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                      উদাহরণ: T900 Ultra Smartwatch (অরিজিনাল)
                    </h4>
                    <p className="text-xs text-zinc-500">
                      আপনার নিজস্ব কোনো স্টক বা কেনার দরকার নেই। ক্যাটালগ থেকে পছন্দ করে সরাসরি কাস্টমারের কাছে প্রমোট করবেন।
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200 shrink-0">
                    স্টক: রেডি
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-400 text-[10px] block">ভিআইপি হোলসেল মূল্য</span>
                    <span className="text-sm font-black text-zinc-900 dark:text-white">৳৯৫০</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-400 text-[10px] block">কাস্টমার সেলিং প্রাইস</span>
                    <span className="text-sm font-black text-zinc-900 dark:text-white">৳১,৪৫০</span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-emerald-600 dark:text-emerald-400 text-[10px] block font-bold">আপনার নেট প্রফিট</span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">+৳৫০০</span>
                  </div>
                </div>

                <button
                  onClick={() => setSimStep(2)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold flex items-center gap-2"
                >
                  <span>পরবর্তী ধাপ: কাস্টমার ঠিকানা দিন</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {simStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    ধাপ ২ / কাস্টমারের ডেলিভারি তথ্য
                  </span>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                    কাস্টমার থেকে নেওয়া তথ্য পূরণ করুন
                  </h4>
                  <p className="text-xs text-zinc-500">
                    চেকআউটে গিয়ে আপনি কাস্টমারের নাম, ফোন এবং হোম ডেলিভারি ঠিকানা বসাবেন।
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-400 text-[10px] block">কাস্টমারের নাম</span>
                    <span className="font-bold text-zinc-900 dark:text-white">মোঃ রাকিবুল হাসান</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-400 text-[10px] block">কাস্টমার ফোন</span>
                    <span className="font-bold text-zinc-900 dark:text-white">01712-XXXXXX</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-400 text-[10px] block">ডেলিভারি ঠিকানা</span>
                    <span className="font-bold text-zinc-900 dark:text-white">বাড়ি ১২, রোড ৪, উত্তরা, ঢাকা</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSimStep(1)}
                    className="px-3.5 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold"
                  >
                    আগের ধাপ
                  </button>
                  <button
                    onClick={() => setSimStep(3)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold flex items-center gap-2"
                  >
                    <span>পরবর্তী ধাপ: চেকআউট পরীক্ষা করুন</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {simStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    ধাপ ৩ / চেকআউটের পার্থক্য
                  </span>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                    {simPlanType === "vip"
                      ? "👑 VIP সক্রিয়: কোনো অগ্রিম চার্জ লাগবে না"
                      : "⚠️ ফ্রি একাউন্ট: অগ্রিম চার্জ দিতে হবে"}
                  </h4>
                  <p className="text-xs text-zinc-500">
                    ভিআইপি রিসেলাররা ১ পয়সাও না দিয়ে কাস্টমারের নামে অর্ডার কনফার্ম করতে পারেন।
                  </p>
                </div>

                <div
                  className={`p-4 rounded-2xl border text-xs space-y-2 ${
                    simPlanType === "vip"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100"
                  }`}
                >
                  <div className="flex justify-between items-center font-bold">
                    <span>প্রোডাক্ট মোট মূল্য:</span>
                    <span>৳১,৪৫০</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>কুরিয়ার চার্জ (হোম ডেলিভারি):</span>
                    <span>৳১২০</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-200 dark:border-zinc-700/60 font-black text-sm">
                    <span>অর্ডারের সময় আপনাকে পে করতে হবে:</span>
                    <span
                      className={
                        simPlanType === "vip"
                          ? "text-emerald-600 dark:text-emerald-400 text-base"
                          : "text-rose-600 dark:text-rose-400"
                      }
                    >
                      {simPlanType === "vip" ? "০৳ (১০০% ফুল ক্যাশ অন ডেলিভারি)" : "৳১৫০ (অগ্রিম বুকিং ফি)"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSimStep(2)}
                    className="px-3.5 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold"
                  >
                    আগের ধাপ
                  </button>
                  <button
                    onClick={() => setSimStep(4)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold flex items-center gap-2"
                  >
                    <span>পরবর্তী ধাপ: লাভ বুঝে নিন</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {simStep === 4 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    ধাপ ৪ / প্রফিট কালেকশন ও উত্তোলন
                  </span>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                    কাস্টমার থেকে টাকা কালেকশন ও আপনার লাভ
                  </h4>
                  <p className="text-xs text-zinc-500">
                    কুরিয়ারম্যান কাস্টমারকে পণ্য বুঝিয়ে দিয়ে ১,৪৫০৳ ক্যাশ কালেকশন করবে।
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs space-y-2">
                  <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-300">
                    <span>কুরিয়ার সংগৃহীত টাকা:</span>
                    <span className="font-bold text-zinc-900 dark:text-white">৳১,৪৫০</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-300">
                    <span>কোম্পানি প্রোডাক্ট কস্ট:</span>
                    <span className="font-bold text-zinc-900 dark:text-white">-৳৯৫০</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-100 dark:border-zinc-800 font-black text-sm">
                    <span>আপনার ওয়ালেটে সরাসরি জমা:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 text-base">+৳৫০০ (ইনস্ট্যান্ট)</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-200">
                  🎉 এই ৫০০৳ লাভ আপনি সরাসরি আপনার <strong>বিকাশ, নগদ বা রকেট</strong> নম্বরে কোনো চার্জ ছাড়াই তুলে নিতে পারবেন!
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSimStep(1)}
                    className="px-3.5 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>পুনরায় ডেমো দেখুন</span>
                  </button>
                  <button
                    onClick={() => {
                      if (onScrollToPlans) onScrollToPlans();
                      else navigate("/subscription");
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs"
                  >
                    <Crown className="w-4 h-4" />
                    <span>এখনই ভিআইপি মেম্বারশিপ কিনুন</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Tab 2: বিস্তারিত কর্মপদ্ধতি ও স্ক্রিপ্ট (Blueprint & Customer Script) */}
      {activeTab === "blueprint" && (
        <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 space-y-6 shadow-2xs">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              রিসেলারদের জন্য পূর্ণাঙ্গ বাস্তব কর্মপদ্ধতি
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              সোশ্যাল মিডিয়া থেকে অর্ডার নেওয়া থেকে শুরু করে টাকা পকেটে আসা পর্যন্ত সঠিক ধাপসমূহ:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                ধাপ ১: সোশ্যাল মিডিয়ায় পোস্ট করা
              </span>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                প্রোডাক্টের ছবি ও ভিডিও শেয়ার করুন
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                আমাদের অ্যাপ থেকে গ্যাজেট ও ফোনের হাই-কোয়ালিটি ছবি ও স্পেসিফিকেশন কপি করে ফেসবুক মার্কেটপ্লেস, পেজ, গ্রুপ, টিকটক বা ইনস্টাগ্রামে পোস্ট করুন।
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                ধাপ ২: কাস্টমারকে কী বলবেন?
              </span>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                ০ টাকা অগ্রিমের সুবিধা ঘোষণা করুন
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                কাস্টমারকে স্পষ্টভাবে জানিয়ে দিন: "আপনাকে ১ টাকাও অগ্রিম দিতে হবে না, পার্সেল হাতে পেয়ে পুরো টাকা পরিশোধ করবেন।" এতে কাস্টমারের কোনো সন্দেহ থাকে না এবং সাথে সাথে অর্ডার কনফার্ম করে।
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                ধাপ ৩: অ্যাপে এসে অর্ডার প্লেস করা
              </span>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                কাস্টমারের ডেলিভারি ঠিকানায় অর্ডার
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                প্রোডাক্ট কার্টে নিয়ে কাস্টমারের নাম, ফোন নম্বর ও সম্পূর্ণ ঠিকানা দিয়ে চেকআউট করুন। ভিআইপি থাকায় অগ্রিম চার্জ ০৳ কাটবে।
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                ধাপ ৪: প্রফিট সরাসরি উত্তোলন
              </span>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                বিকাশ/নগদে টাকা পেয়ে যাওয়া
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                কুরিয়ার ডেলিভারি সম্পন্ন হওয়া মাত্র আপনার অ্যাকাউন্টে প্রফিট যোগ হবে। ৫০৳ হলেই বিকাশ, নগদ বা রকেটে উইথড্র দিন।
              </p>
            </div>
          </div>

          {/* Copyable Customer Message Template */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                  কাস্টমার মেসেজিং স্ক্রিপ্ট (১-ক্লিকে কপি করুন)
                </h4>
              </div>
              <button
                onClick={() =>
                  handleCopyText(
                    `আসসালামু আলাইকুম স্যার/ম্যাম, আমাদের কাছে পণ্যটি ১০০% অরিজিনাল রয়েছে। আপনাকে কোনো প্রকার ডেলিভারি চার্জ বা টাকা অগ্রিম দেওয়া লাগবে না! ডেলিভারিম্যান পার্সেল নিয়ে গেলে চেক করে পুরো টাকা ফুল ক্যাশ অন ডেলিভারিতে পরিশোধ করবেন। অর্ডার নিশ্চিত করতে অনুগ্রহ করে আপনার পূর্ণ নাম, সম্পূর্ণ ঠিকানা ও সচল মোবাইল নম্বর দিন। ধন্যবাদ!`,
                    "script"
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript ? "কপি হয়েছে!" : "স্ক্রিপ্ট কপি"}</span>
              </button>
            </div>

            <p className="text-xs text-zinc-700 dark:text-zinc-300 italic bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 leading-relaxed">
              "আসসালামু আলাইকুম স্যার/ম্যাম, আমাদের কাছে পণ্যটি ১০০% অরিজিনাল রয়েছে। আপনাকে কোনো প্রকার ডেলিভারি চার্জ বা টাকা অগ্রিম দেওয়া লাগবে না! ডেলিভারিম্যান পার্সেল নিয়ে গেলে চেক করে পুরো টাকা ফুল ক্যাশ অন ডেলিভারিতে পরিশোধ করবেন। অর্ডার নিশ্চিত করতে অনুগ্রহ করে আপনার পূর্ণ নাম, সম্পূর্ণ ঠিকানা ও সচল মোবাইল নম্বর দিন। ধন্যবাদ!"
            </p>
          </div>
        </div>
      )}

      {/* 6. Tab 3: লাভ ও আয় ক্যালকুলেটর (Clean Calculator Engine) */}
      {activeTab === "calculator" && (
        <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 space-y-6 shadow-2xs">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              রিসেলার মাসিক নিট লাভ ক্যালকুলেটর
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              প্রতিদিনের সম্ভাব্য ডেলিভারি এবং প্রতি অর্ডারে মার্জিন টেনে মাসিক নিট ইনকাম দেখুন:
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-5">
              {/* Daily orders */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  <span>প্রতিদিন কাস্টমার ডেলিভারি:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">{dailyOrders} টি / দিন</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={40}
                  value={dailyOrders}
                  onChange={(e) => setDailyOrders(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>১টি</span>
                  <span>২০টি</span>
                  <span>৪০টি</span>
                </div>
              </div>

              {/* Profit margin */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  <span>প্রতি অর্ডারে আপনার লাভ:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">৳{profitMargin}</span>
                </div>
                <input
                  type="range"
                  min={150}
                  max={1200}
                  step={50}
                  value={profitMargin}
                  onChange={(e) => setProfitMargin(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>১৫০৳</span>
                  <span>৬৫০৳</span>
                  <span>১২০০৳</span>
                </div>
              </div>
            </div>

            {/* Calculations Card */}
            <div className="p-5 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-950 border border-zinc-800 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  মাসিক সম্ভাব্য আয় সামারি
                </span>

                <div className="text-3xl font-black tracking-tight text-white">
                  ৳{monthlyProfit.toLocaleString("en-BD")}
                  <span className="text-xs text-zinc-400 font-normal ml-1">/ মাস (গ্রস প্রফিট)</span>
                </div>

                <div className="space-y-2 pt-3 border-t border-zinc-800 text-xs">
                  <div className="flex justify-between text-zinc-300">
                    <span>মাসে মোট ডেলিভারি:</span>
                    <span className="font-bold text-white">{monthlyOrders} টি</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>সংরক্ষিত অগ্রিম ফি (০৳ COD তে বাঁচল):</span>
                    <span className="font-bold text-emerald-400">৳{advanceFeeSaved.toLocaleString("en-BD")}</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>৩০ দিনের ভিআইপি সাবস্ক্রিপশন ফি:</span>
                    <span className="font-bold text-rose-400">-৳{subCost.toLocaleString("en-BD")}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-zinc-800 text-sm font-black">
                    <span>আপনার নেট প্রফিট:</span>
                    <span className="text-emerald-400 text-base">
                      ৳{(netEarnings > 0 ? netEarnings : monthlyProfit).toLocaleString("en-BD")}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (onScrollToPlans) onScrollToPlans();
                  else navigate("/subscription");
                }}
                className="w-full py-2.5 rounded-xl bg-white text-zinc-900 font-bold text-xs flex items-center justify-center gap-2 hover:bg-zinc-100 transition-colors"
              >
                <Crown className="w-4 h-4 text-amber-500" />
                <span>ভিআইপি সাবস্ক্রিপশন চালু করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Tab 4: রেফার অ্যান্ড আর্ন (বিনা পুঁজিতে ইনকাম) */}
      {activeTab === "refer" && (
        <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 space-y-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                রেফার অ্যান্ড আর্ন (বিনা পুঁজিতে নিশ্চিত আয়)
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                যাঁরা পণ্য বিক্রি বা কুরিয়ার হ্যান্ডেল করতে চান না, তাঁরা কেবল রেফারেল লিংক শেয়ার করে ইনকাম করতে পারেন:
              </p>
            </div>

            <button
              onClick={() => navigate("/affiliate")}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold flex items-center gap-1.5 hover:bg-zinc-200"
            >
              <span>অ্যাফিলিয়েট ড্যাশবোর্ড</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
              <span className="w-6 h-6 rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center justify-center">
                ১
              </span>
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white">লিংক বা কোড শেয়ার</h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                আপনার রেফারেল লিংক সোশ্যাল মিডিয়ায় ও পরিচিতজনদের কাছে শেয়ার করুন।
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
              <span className="w-6 h-6 rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center justify-center">
                ২
              </span>
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white">জয়েন বা কেনাকাটা</h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                আপনার লিংকে কেউ সাবস্ক্রিপশন নিলে বা পণ্য অর্ডার করলেই কমিশন যোগ হবে।
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
              <span className="w-6 h-6 rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center justify-center">
                ৩
              </span>
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white">বিকাশে সরাসরি উইথড্র</h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                ৫০৳ হলেই সরাসরি বিকাশ বা নগদে ক্যাশআউট রিকোয়েস্ট পাঠাতে পারবেন।
              </p>
            </div>
          </div>

          {/* Referral Link & WhatsApp Share */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-zinc-900 dark:text-white">
                আপনার রেফারেল লিংক
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-zinc-500">কোড:</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                  {referralCode}
                </span>
                <button
                  onClick={() => handleCopyText(referralCode, "code")}
                  className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  title="কোড কপি"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                readOnly
                value={shareLink}
                className="flex-1 px-3 py-2 text-xs font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none select-all text-zinc-800 dark:text-zinc-200"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyText(shareLink, "link")}
                  className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? "কপি হয়েছে!" : "লিংক কপি"}</span>
                </button>
                <button
                  onClick={handleShareWhatsapp}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp শেয়ার</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Tab 5: সাধারণ প্রশ্নোত্তর (FAQ) */}
      {activeTab === "faq" && (
        <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 space-y-4 shadow-2xs">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              রিসেলারদের জরুরি প্রশ্ন ও উত্তর
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
              <h4 className="font-bold text-zinc-900 dark:text-white">
                প্র: কাস্টমার কি আসল পাইকারি দাম জানতে পারবে?
              </h4>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                উ: না। কুরিয়ার ইনভয়েসে কেবল আপনার দেওয়া সেলিং প্রাইস উল্লেখ থাকবে। কোম্পানি বা পাইকারি প্রাইস গোপন রাখা হয়।
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
              <h4 className="font-bold text-zinc-900 dark:text-white">
                প্র: পার্সেল রিটার্ন আসলে কি কোনো জরিমানা আছে?
              </h4>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                উ: না। ভিআইপি রিসেলারদের জন্য কোনো অতিরিক্ত জরিমানা নেই। তবে সঠিক কাস্টমারকে কনফার্ম করে অর্ডার দিলে রিটার্ন রেশিও কমে যায়।
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
              <h4 className="font-bold text-zinc-900 dark:text-white">
                প্র: ভিআইপি সাবস্ক্রিপশন কি সাথে সাথেই সক্রিয় হয়?
              </h4>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                উ: হ্যাঁ। বিকাশ বা নগদে পেমেন্ট করার পর TrxID দিলে স্বয়ংক্রিয়ভাবে ভিআইপি স্ট্যাটাস সাথে সাথে চালু হয়ে যায়।
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
              <h4 className="font-bold text-zinc-900 dark:text-white">
                প্র: প্রফিটের টাকা কীভাবে উত্তোলন করব?
              </h4>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                উ: আপনার ড্যাশবোর্ড থেকে বিকাশ, নগদ বা ব্যাংক অ্যাকাউন্টে সরাসরি রিকোয়েস্ট পাঠালে নির্ধারিত সময়ের মধ্যে টাকা পৌঁছে যাবে।
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResellerTeacherGuide;
