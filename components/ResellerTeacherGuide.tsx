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
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { triggerHaptic } from "../lib/haptics";
import { APPLE_SPRING_DEFAULT, APPLE_SPRING_SNAPPY } from "../lib/shoppingRoute";
import { useNotify } from "./Notifications";

interface ResellerTeacherGuideProps {
  user?: any;
  userData?: any;
  onScrollToPlans?: () => void;
  standalone?: boolean;
  onVoiceGuide?: (message: string) => void;
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
  onVoiceGuide,
}) => {
  const navigate = useNavigate();
  const notify = useNotify();
  const prefersReducedMotion = useReducedMotion();

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
    const link = document.createElement("a");
    link.href = `https://api.whatsapp.com/send?text=${text}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
  };

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-clip space-y-6">
      {/* 1. Professional Live Alert Bar (Interactive & Expandable) */}
      <div
        className="w-full min-w-0 max-w-full overflow-hidden rounded-[20px] bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] shadow-[0_4px_18px_rgba(0,0,0,0.03)] dark:shadow-none p-3.5 transition-colors"
        onMouseEnter={() => setIsAlertPaused(true)}
        onMouseLeave={() => setIsAlertPaused(false)}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div
            onClick={() => {
              triggerHaptic("light");
              setSelectedAlertModal(currentAlert);
            }}
            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] shrink-0">
              <Bell className="w-4 h-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#248A3D] dark:text-[#30D158]">
                  {currentAlert.badge}
                </span>
                <span className="text-black/20 dark:text-white/20">&bull;</span>
                <span className="text-[10px] text-[#6E6E73] dark:text-[#A1A1A6] flex items-center gap-1 tabular-nums">
                  <Clock className="w-3 h-3" />
                  {currentAlert.time}
                </span>
                <span className="text-[10px] text-[#86868B] hidden md:inline-block">
                  ({currentAlert.location})
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate group-hover:text-[#0071E3] dark:group-hover:text-[#0A84FF] transition-colors mt-0.5">
                {currentAlert.title}
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[11px] text-[#86868B] group-hover:text-[#0071E3] dark:group-hover:text-[#0A84FF] shrink-0">
              <span>বিস্তারিত</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 border-black/[0.06] dark:border-white/[0.08] pt-2 sm:pt-0 shrink-0">
            <span className="text-[10px] text-[#86868B] font-medium tabular-nums sm:hidden">
              {alertIndex + 1} / {LIVE_ALERTS_DATA.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setAlertIndex((prev) => (prev - 1 + LIVE_ALERTS_DATA.length) % LIVE_ALERTS_DATA.length);
                }}
                className="p-1.5 rounded-full text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
                title="পূর্ববর্তী"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setAlertIndex((prev) => (prev + 1) % LIVE_ALERTS_DATA.length);
                }}
                className="p-1.5 rounded-full text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
                title="পরবর্তী"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Details Modal */}
      <AnimatePresence>
        {selectedAlertModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.12 : 0.18 }}
            className="ds-apple-portal ds-apple-backdrop fixed inset-0 z-50 flex items-center justify-center p-5"
            onClick={() => setSelectedAlertModal(null)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
              transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_DEFAULT}
              onClick={(e) => e.stopPropagation()}
              className="ds-apple-portal ds-apple-modal rounded-[26px] w-full max-w-[380px] px-6 pt-7 pb-6 space-y-4 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#0071E3]/12 text-[#0071E3] dark:bg-[#0A84FF]/15 dark:text-[#0A84FF] text-xs font-semibold uppercase whitespace-nowrap">
                  {selectedAlertModal.badge}
                </span>
                <span className="text-[#6E6E73] dark:text-[#A1A1A6] text-xs tabular-nums">{selectedAlertModal.time}</span>
              </div>

              <div className="space-y-2">
                <h4 className="text-[#1D1D1F] dark:text-[#F5F5F7] text-[19px] font-semibold leading-[1.28] tracking-[-0.02em]">
                  {selectedAlertModal.title}
                </h4>
                <p className="text-[#6E6E73] dark:text-[#A1A1A6] text-[15px] leading-[1.44]">
                  {selectedAlertModal.desc}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs pt-1">
                <div className="p-3 rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.05] dark:border-white/[0.07]">
                  <span className="text-[10px] text-[#6E6E73] dark:text-[#A1A1A6] block">কুরিয়ার মেথড</span>
                  <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate block">{selectedAlertModal.courier}</span>
                </div>
                <div className="p-3 rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.05] dark:border-white/[0.07]">
                  <span className="text-[10px] text-[#6E6E73] dark:text-[#A1A1A6] block">স্ট্যাটাস / ভ্যালু</span>
                  <span className="font-semibold text-[#0071E3] dark:text-[#0A84FF] tabular-nums truncate block">{selectedAlertModal.amount}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  type="button"
                  onPointerDown={() => triggerHaptic("light")}
                  onClick={() => {
                    setSelectedAlertModal(null);
                    if (onScrollToPlans) onScrollToPlans();
                  }}
                  className="ds-apple-btn-primary w-full min-h-[46px] px-5 rounded-full text-[14px] font-semibold flex items-center justify-center gap-2 whitespace-nowrap active:scale-[0.97] transition-transform cursor-pointer"
                >
                  <span className="truncate">ভিআইপি সাবস্ক্রিপশন দেখুন</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
                <button
                  type="button"
                  onPointerDown={() => triggerHaptic("light")}
                  onClick={() => setSelectedAlertModal(null)}
                  className="ds-apple-btn-secondary w-full min-h-[44px] px-5 rounded-full text-[14px] font-semibold flex items-center justify-center whitespace-nowrap active:scale-[0.97] transition-transform cursor-pointer"
                >
                  <span>বন্ধ করুন</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Executive Reseller Masterclass Header */}
      <div className="min-w-0 max-w-full overflow-hidden rounded-[26px] bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] p-4 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-none space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-black/[0.06] dark:border-white/[0.08] pb-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] text-xs font-semibold border border-black/[0.06] dark:border-white/[0.08]">
              <Crown className="w-3.5 h-3.5 text-[#FF9500]" />
              <span>রিসেলার মাস্টারক্লাস ও ব্যবসায়িক নির্দেশিকা</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-[-0.025em] leading-snug">
              রিসেলারদের জন্য <span className="text-[#248A3D] dark:text-[#30D158]">০৳ অগ্রিমে ফুল ক্যাশ অন ডেলিভারি</span> কেন সবচেয়ে লাভজনক?
            </h2>

            <p className="text-xs sm:text-sm text-[#6E6E73] dark:text-[#A1A1A6] leading-relaxed font-normal">
              সাধারণ ক্রেতাদের প্রতি অর্ডারে ১০০-২০০৳ অগ্রিম কুরিয়ার চার্জ দেওয়া লাগে। কিন্তু রিসেলাররা <strong className="text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold">ভিআইপি পাস</strong> সক্রিয় করলে নিজের কোনো টাকা অগ্রিম ছাড়াই যেকোনো কাস্টমারের ঠিকানায় সরাসরি ক্যাশ অনে পার্সেল পাঠাতে পারেন।
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                if (onScrollToPlans) onScrollToPlans();
                else navigate("/subscription");
              }}
              className="px-5 py-2.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] dark:bg-[#0A84FF] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-[0_6px_16px_rgba(0,113,227,0.24)] active:scale-[0.97] transition-all cursor-pointer"
            >
              <Crown className="w-4 h-4 text-white" />
              <span>সাবস্ক্রিপশন কিনুন</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setActiveTab("simulator");
              }}
              className="px-4 py-2 rounded-full bg-[#F5F5F7] hover:bg-black/[0.06] dark:bg-[#2C2C2E] dark:hover:bg-white/[0.12] text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all cursor-pointer"
            >
              <span>লাইভ ডেমো দেখুন</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3. Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {[
            {
              id: "simulator",
              label: "১. লাইভ অর্ডার ডেমো",
              icon: Zap,
              voice: "লাইভ অর্ডার ডেমো। এখানে দেখুন কীভাবে শূন্য টাকা অগ্রিমে কাস্টমারের ঠিকানায় পার্সেল বুক করবেন।",
            },
            {
              id: "blueprint",
              label: "২. বিস্তারিত কর্মপদ্ধতি ও স্ক্রিপ্ট",
              icon: BookOpen,
              voice: "বিস্তারিত কর্মপদ্ধতি ও রেডিমেড কাস্টমার মেসেজিং স্ক্রিপ্ট।",
            },
            {
              id: "calculator",
              label: "৩. লাভ ও আয় ক্যালকুলেটর",
              icon: TrendingUp,
              voice: "লাভ ও আয় ক্যালকুলেটর। প্রতিদিনের অর্ডার এবং প্রফিট মার্জিন অনুযায়ী আপনার সম্ভাব্য মাসিক আয় হিসাব করুন।",
            },
            {
              id: "refer",
              label: "৪. রেফার অ্যান্ড আর্ন (বিনা পুঁজিতে)",
              icon: Gift,
              voice: "রেফার অ্যান্ড আর্ন। আপনার রেফারেল কোড শেয়ার করে বিনা পুঁজিতে আয় করুন।",
            },
            {
              id: "faq",
              label: "৫. সাধারণ প্রশ্নোত্তর (FAQ)",
              icon: Info,
              voice: "ভিআইপি সাবস্ক্রিপশন ও রিসেলিং সম্পর্কে সাধারণ প্রশ্নোত্তর।",
            },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setActiveTab(tab.id as any);
                  onVoiceGuide?.(tab.voice);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-[0.97] cursor-pointer ${
                  isActive
                    ? "bg-[#0071E3] text-white dark:bg-[#0A84FF] shadow-xs"
                    : "bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F] dark:hover:text-white"
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Tab 1: Interactive Live Order Simulator */}
      {activeTab === "simulator" && (
        <motion.div
          key="simulator"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={APPLE_SPRING_SNAPPY}
          className="ds-apple-surface rounded-[26px] p-4 sm:p-7 space-y-6 min-w-0 max-w-full overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-[-0.015em]">
                ইন্টারেক্টিভ রিসেলার লাইভ সিমুলেটর (Live Click-through)
              </h3>
              <p className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-0.5">
                নিচের স্টেপগুলোতে ক্লিক করে নিজের চোখে দেখুন কীভাবে ০৳ অগ্রিমে কাস্টমারের অর্ডার প্লেস হয়:
              </p>
            </div>

            {/* Toggle VIP vs Free Member */}
            <div className="ds-apple-segmented inline-flex flex-wrap max-w-full items-center p-1 rounded-full self-start sm:self-auto text-xs shrink-0">
              <button
                type="button"
                onPointerDown={() => triggerHaptic("selection")}
                onClick={() => setSimPlanType("vip")}
                className={`px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all cursor-pointer active:scale-[0.97] ${
                  simPlanType === "vip"
                    ? "bg-white dark:bg-[#3A3A3C] text-[#248A3D] dark:text-[#30D158] shadow-xs"
                    : "text-[#6E6E73] dark:text-[#98989D]"
                }`}
              >
                <span>👑 VIP (০৳ অগ্রিম)</span>
              </button>
              <button
                type="button"
                onPointerDown={() => triggerHaptic("selection")}
                onClick={() => setSimPlanType("free")}
                className={`px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all cursor-pointer active:scale-[0.97] ${
                  simPlanType === "free"
                    ? "bg-white dark:bg-[#3A3A3C] text-[#D70015] dark:text-[#FF453A] shadow-xs"
                    : "text-[#6E6E73] dark:text-[#98989D]"
                }`}
              >
                <span>ফ্রি (অগ্রিম প্রযোজ্য)</span>
              </button>
            </div>
          </div>

          {/* Step indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { num: 1, title: "১. প্রোডাক্ট সিলেক্ট", desc: "হোলসেল ও লাভ রেট" },
              { num: 2, title: "২. কাস্টমার তথ্য", desc: "ঠিকানা ও ফোন নম্বর" },
              { num: 3, title: "৩. চেকআউট চেক", desc: "অগ্রিম চার্জ ০৳" },
              { num: 4, title: "৪. প্রফিট কালেকশন", desc: "বিকাশে উত্তোলন" },
            ].map((st) => (
              <button
                key={st.num}
                type="button"
                onPointerDown={() => triggerHaptic("light")}
                onClick={() => setSimStep(st.num as any)}
                className={`p-3 rounded-2xl text-left border transition-all active:scale-[0.98] cursor-pointer ${
                  simStep === st.num
                    ? "bg-[#0071E3] text-white dark:bg-[#0A84FF] border-[#0071E3] dark:border-[#0A84FF] shadow-[0_6px_16px_rgba(0,113,227,0.22)]"
                    : "bg-[#F5F5F7] dark:bg-[#2C2C2E] border-black/[0.05] dark:border-white/[0.08] text-[#1D1D1F] dark:text-[#F5F5F7]"
                }`}
              >
                <div className="text-xs font-medium truncate">{st.title}</div>
                <div className={`text-[10px] mt-0.5 truncate ${simStep === st.num ? "text-white/85" : "text-[#6E6E73] dark:text-[#98989D]"}`}>
                  {st.desc}
                </div>
              </button>
            ))}
          </div>

          {/* Simulator Content Area */}
          <div className="p-5 rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E]/70 border border-black/[0.06] dark:border-white/[0.08] space-y-4">
            {simStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] font-medium text-[#248A3D] dark:text-[#30D158] uppercase tracking-wider">
                      ধাপ ১ / প্রোডাক্ট সিলেকশন
                    </span>
                    <h4 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      উদাহরণ: T900 Ultra Smartwatch (অরিজিনাল)
                    </h4>
                    <p className="text-xs text-[#6E6E73] dark:text-[#98989D]">
                      আপনার নিজস্ব কোনো স্টক বা কেনার দরকার নেই। ক্যাটালগ থেকে পছন্দ করে সরাসরি কাস্টমারের কাছে প্রমোট করবেন।
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.1] text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] shrink-0 whitespace-nowrap">
                    স্টক: রেডি
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs tabular-nums">
                  <div className="p-3 rounded-xl bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08]">
                    <span className="text-[#6E6E73] dark:text-[#98989D] text-[10px] block">ভিআইপি হোলসেল মূল্য</span>
                    <span className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">৳৯৫০</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08]">
                    <span className="text-[#6E6E73] dark:text-[#98989D] text-[10px] block">কাস্টমার সেলিং প্রাইস</span>
                    <span className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">৳১,৪৫০</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#248A3D]/10 dark:bg-[#30D158]/15 border border-[#248A3D]/25 dark:border-[#30D158]/30">
                    <span className="text-[#248A3D] dark:text-[#30D158] text-[10px] block font-semibold">আপনার নেট প্রফিট</span>
                    <span className="text-sm font-semibold text-[#248A3D] dark:text-[#30D158]">+৳৫০০</span>
                  </div>
                </div>

                <button
                  type="button"
                  onPointerDown={() => triggerHaptic("light")}
                  onClick={() => setSimStep(2)}
                  className="ds-apple-btn-primary px-5 min-h-[42px] rounded-full text-xs font-semibold flex items-center gap-2 whitespace-nowrap active:scale-[0.97] transition-transform cursor-pointer"
                >
                  <span>পরবর্তী ধাপ: কাস্টমার ঠিকানা দিন</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>
            )}

            {simStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-[#248A3D] dark:text-[#30D158] uppercase tracking-wider">
                    ধাপ ২ / কাস্টমারের ডেলিভারি তথ্য
                  </span>
                  <h4 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    কাস্টমার থেকে নেওয়া তথ্য পূরণ করুন
                  </h4>
                  <p className="text-xs text-[#6E6E73] dark:text-[#98989D]">
                    চেকআউটে গিয়ে আপনি কাস্টমারের নাম, ফোন এবং হোম ডেলিভারি ঠিকানা বসাবেন।
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08]">
                    <span className="text-[#6E6E73] dark:text-[#98989D] text-[10px] block">কাস্টমারের নাম</span>
                    <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">মোঃ রাকিবুল হাসান</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08]">
                    <span className="text-[#6E6E73] dark:text-[#98989D] text-[10px] block">কাস্টমার ফোন</span>
                    <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">01712-XXXXXX</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08]">
                    <span className="text-[#6E6E73] dark:text-[#98989D] text-[10px] block">ডেলিভারি ঠিকানা</span>
                    <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">বাড়ি ১২, রোড ৪, উত্তরা, ঢাকা</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onPointerDown={() => triggerHaptic("light")}
                    onClick={() => setSimStep(1)}
                    className="ds-apple-btn-secondary px-4 min-h-[42px] rounded-full text-xs font-semibold whitespace-nowrap active:scale-[0.97] transition-transform cursor-pointer"
                  >
                    <span>আগের ধাপ</span>
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => triggerHaptic("light")}
                    onClick={() => setSimStep(3)}
                    className="ds-apple-btn-primary px-5 min-h-[42px] rounded-full text-xs font-semibold flex items-center gap-2 whitespace-nowrap active:scale-[0.97] transition-transform cursor-pointer"
                  >
                    <span>পরবর্তী ধাপ: চেকআউট পরীক্ষা করুন</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>
              </div>
            )}

            {simStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-[#248A3D] dark:text-[#30D158] uppercase tracking-wider">
                    ধাপ ৩ / চেকআউটের পার্থক্য
                  </span>
                  <h4 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {simPlanType === "vip"
                      ? "👑 VIP সক্রিয়: কোনো অগ্রিম চার্জ লাগবে না"
                      : "⚠️ ফ্রি একাউন্ট: অগ্রিম চার্জ দিতে হবে"}
                  </h4>
                  <p className="text-xs text-[#6E6E73] dark:text-[#98989D]">
                    ভিআইপি রিসেলাররা ১ পয়সাও না দিয়ে কাস্টমারের নামে অর্ডার কনফার্ম করতে পারেন।
                  </p>
                </div>

                <div
                  className={`p-4 rounded-2xl border text-xs space-y-2 tabular-nums ${
                    simPlanType === "vip"
                      ? "bg-[#248A3D]/10 dark:bg-[#30D158]/12 border-[#248A3D]/25 dark:border-[#30D158]/30 text-[#1D1D1F] dark:text-[#F5F5F7]"
                      : "bg-[#FF3B30]/10 dark:bg-[#FF453A]/15 border-[#FF3B30]/25 dark:border-[#FF453A]/30 text-[#1D1D1F] dark:text-[#F5F5F7]"
                  }`}
                >
                  <div className="flex justify-between items-center font-semibold">
                    <span>প্রোডাক্ট মোট মূল্য:</span>
                    <span>৳১,৪৫০</span>
                  </div>
                  <div className="flex justify-between items-center text-[#6E6E73] dark:text-[#98989D]">
                    <span>কুরিয়ার চার্জ (হোম ডেলিভারি):</span>
                    <span>৳১২০</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-black/[0.06] dark:border-white/[0.1] font-semibold text-sm">
                    <span>অর্ডারের সময় আপনাকে পে করতে হবে:</span>
                    <span
                      className={
                        simPlanType === "vip"
                          ? "text-[#248A3D] dark:text-[#30D158] text-base"
                          : "text-[#D70015] dark:text-[#FF453A]"
                      }
                    >
                      {simPlanType === "vip" ? "০৳ (১০০% ফুল COD)" : "৳১৫০ (অগ্রিম বুকিং ফি)"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onPointerDown={() => triggerHaptic("light")}
                    onClick={() => setSimStep(2)}
                    className="ds-apple-btn-secondary px-4 min-h-[42px] rounded-full text-xs font-semibold whitespace-nowrap active:scale-[0.97] transition-transform cursor-pointer"
                  >
                    <span>আগের ধাপ</span>
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => triggerHaptic("light")}
                    onClick={() => setSimStep(4)}
                    className="ds-apple-btn-primary px-5 min-h-[42px] rounded-full text-xs font-semibold flex items-center gap-2 whitespace-nowrap active:scale-[0.97] transition-transform cursor-pointer"
                  >
                    <span>পরবর্তী ধাপ: লাভ বুঝে নিন</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>
              </div>
            )}

            {simStep === 4 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-[#248A3D] dark:text-[#30D158] uppercase tracking-wider">
                    ধাপ ৪ / প্রফিট কালেকশন ও উত্তোলন
                  </span>
                  <h4 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    কাস্টমার থেকে টাকা কালেকশন ও আপনার লাভ
                  </h4>
                  <p className="text-xs text-[#6E6E73] dark:text-[#98989D]">
                    কুরিয়ারম্যান কাস্টমারকে পণ্য বুঝিয়ে দিয়ে ১,৪৫০৳ ক্যাশ কালেকশন করবে।
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] text-xs space-y-2 tabular-nums">
                  <div className="flex justify-between items-center text-[#6E6E73] dark:text-[#98989D]">
                    <span>কুরিয়ার সংগৃহীত টাকা:</span>
                    <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">৳১,৪৫০</span>
                  </div>
                  <div className="flex justify-between items-center text-[#6E6E73] dark:text-[#98989D]">
                    <span>কোম্পানি প্রোডাক্ট কস্ট:</span>
                    <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">-৳৯৫০</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-black/[0.06] dark:border-white/[0.08] font-semibold text-sm">
                    <span>আপনার ওয়ালেটে সরাসরি জমা:</span>
                    <span className="text-[#248A3D] dark:text-[#30D158] text-base">+৳৫০০ (ইনস্ট্যান্ট)</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#248A3D]/10 dark:bg-[#30D158]/12 border border-[#248A3D]/25 dark:border-[#30D158]/25 text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">
                  🎉 এই ৫০০৳ লাভ আপনি সরাসরি আপনার <strong>বিকাশ, নগদ বা রকেট</strong> নম্বরে কোনো চার্জ ছাড়াই তুলে নিতে পারবেন!
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onPointerDown={() => triggerHaptic("light")}
                    onClick={() => setSimStep(1)}
                    className="ds-apple-btn-secondary px-4 min-h-[42px] rounded-full text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap active:scale-[0.97] transition-transform cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                    <span>পুনরায় ডেমো দেখুন</span>
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => triggerHaptic("light")}
                    onClick={() => {
                      if (onScrollToPlans) onScrollToPlans();
                      else navigate("/subscription");
                    }}
                    className="ds-apple-btn-primary px-5 min-h-[42px] rounded-full text-xs font-semibold flex items-center gap-2 whitespace-nowrap active:scale-[0.97] transition-transform cursor-pointer"
                  >
                    <Crown className="w-4 h-4 shrink-0" />
                    <span>এখনই ভিআইপি কিনুন</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* 5. Tab 2: Blueprint & Customer Script */}
      {activeTab === "blueprint" && (
        <motion.div
          key="blueprint"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={APPLE_SPRING_SNAPPY}
          className="ds-apple-surface rounded-[26px] p-4 sm:p-7 space-y-6 min-w-0 max-w-full overflow-hidden"
        >
          <div className="border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
            <h3 className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              রিসেলারদের জন্য পূর্ণাঙ্গ বাস্তব কর্মপদ্ধতি
            </h3>
            <p className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-0.5">
              সোশ্যাল মিডিয়া থেকে অর্ডার নেওয়া থেকে শুরু করে টাকা পকেটে আসা পর্যন্ত সঠিক ধাপসমূহ:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                step: "ধাপ ১: সোশ্যাল মিডিয়ায় পোস্ট করা",
                title: "প্রোডাক্টের ছবি ও ভিডিও শেয়ার করুন",
                desc: "আমাদের অ্যাপ থেকে গ্যাজেট ও ফোনের হাই-কোয়ালিটি ছবি ও স্পেসিফিকেশন কপি করে ফেসবুক মার্কেটপ্লেস, পেজ, গ্রুপ, টিকটক বা ইনস্টাগ্রামে পোস্ট করুন।",
              },
              {
                step: "ধাপ ২: কাস্টমারকে কী বলবেন?",
                title: "০ টাকা অগ্রিমের সুবিধা ঘোষণা করুন",
                desc: 'কাস্টমারকে স্পষ্টভাবে জানিয়ে দিন: "আপনাকে ১ টাকাও অগ্রিম দিতে হবে না, পার্সেল হাতে পেয়ে পুরো টাকা পরিশোধ করবেন।" এতে কাস্টমারের কোনো সন্দেহ থাকে না এবং সাথে সাথে অর্ডার কনফার্ম করে।',
              },
              {
                step: "ধাপ ৩: অ্যাপে এসে অর্ডার প্লেস করা",
                title: "কাস্টমারের ডেলিভারি ঠিকানায় অর্ডার",
                desc: "প্রোডাক্ট কার্টে নিয়ে কাস্টমারের নাম, ফোন নম্বর ও সম্পূর্ণ ঠিকানা দিয়ে চেকআউট করুন। ভিআইপি থাকায় অগ্রিম চার্জ ০৳ কাটবে।",
              },
              {
                step: "ধাপ ৪: প্রফিট সরাসরি উত্তোলন",
                title: "বিকাশ/নগদে টাকা পেয়ে যাওয়া",
                desc: "কুরিয়ার ডেলিভারি সম্পন্ন হওয়া মাত্র আপনার অ্যাকাউন্টে প্রফিট যোগ হবে। ৫০৳ হলেই বিকাশ, নগদ বা রকেটে উইথড্র দিন।",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="p-4 rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.05] dark:border-white/[0.08] space-y-2"
              >
                <span className="text-xs font-medium text-[#0071E3] dark:text-[#0A84FF]">
                  {item.step}
                </span>
                <h4 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {item.title}
                </h4>
                <p className="text-xs text-[#6E6E73] dark:text-[#98989D] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Copyable Customer Message Template */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF] shrink-0" />
                <h4 className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  কাস্টমার মেসেজিং স্ক্রিপ্ট (১-ক্লিকে কপি করুন)
                </h4>
              </div>
              <button
                type="button"
                onPointerDown={() => triggerHaptic("light")}
                onClick={() =>
                  handleCopyText(
                    `আসসালামু আলাইকুম স্যার/ম্যাম, আমাদের কাছে পণ্যটি ১০০% অরিজিনাল রয়েছে। আপনাকে কোনো প্রকার ডেলিভারি চার্জ বা টাকা অগ্রিম দেওয়া লাগবে না! ডেলিভারিম্যান পার্সেল নিয়ে গেলে চেক করে পুরো টাকা ফুল ক্যাশ অন ডেলিভারিতে পরিশোধ করবেন। অর্ডার নিশ্চিত করতে অনুগ্রহ করে আপনার পূর্ণ নাম, সম্পূর্ণ ঠিকানা ও সচল মোবাইল নম্বর দিন। ধন্যবাদ!`,
                    "script"
                  )
                }
                className="ds-apple-btn-primary px-3.5 min-h-[34px] rounded-full text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap active:scale-[0.97] transition-transform cursor-pointer"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                <span>{copiedScript ? "কপি হয়েছে!" : "স্ক্রিপ্ট কপি"}</span>
              </button>
            </div>

            <p className="text-xs text-[#1D1D1F] dark:text-[#F5F5F7] italic bg-white dark:bg-[#1C1C1E] p-3.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08] leading-relaxed">
              "আসসালামু আলাইকুম স্যার/ম্যাম, আমাদের কাছে পণ্যটি ১০০% অরিজিনাল রয়েছে। আপনাকে কোনো প্রকার ডেলিভারি চার্জ বা টাকা অগ্রিম দেওয়া লাগবে না! ডেলিভারিম্যান পার্সেল নিয়ে গেলে চেক করে পুরো টাকা ফুল ক্যাশ অন ডেলিভারিতে পরিশোধ করবেন। অর্ডার নিশ্চিত করতে অনুগ্রহ করে আপনার পূর্ণ নাম, সম্পূর্ণ ঠিকানা ও সচল মোবাইল নম্বর দিন। ধন্যবাদ!"
            </p>
          </div>
        </motion.div>
      )}

      {/* 6. Tab 3: Calculator Engine */}
      {activeTab === "calculator" && (
        <motion.div
          key="calculator"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={APPLE_SPRING_SNAPPY}
          className="ds-apple-surface rounded-[26px] p-4 sm:p-7 space-y-6 min-w-0 max-w-full overflow-hidden"
        >
          <div className="border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
            <h3 className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              রিসেলার মাসিক নিট লাভ ক্যালকুলেটর
            </h3>
            <p className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-0.5">
              প্রতিদিনের সম্ভাব্য ডেলিভারি এবং প্রতি অর্ডারে মার্জিন টেনে মাসিক নিট ইনকাম দেখুন:
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.05] dark:border-white/[0.08] space-y-5">
              {/* Daily orders */}
              <div className="space-y-2 tabular-nums">
                <div className="flex justify-between text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  <span>প্রতিদিন কাস্টমার ডেলিভারি:</span>
                  <span className="text-[#0071E3] dark:text-[#0A84FF] font-semibold">{dailyOrders} টি / দিন</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={40}
                  value={dailyOrders}
                  onChange={(e) => setDailyOrders(Number(e.target.value))}
                  className="w-full accent-[#0071E3] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#86868B]">
                  <span>১টি</span>
                  <span>২০টি</span>
                  <span>৪০টি</span>
                </div>
              </div>

              {/* Profit margin */}
              <div className="space-y-2 tabular-nums">
                <div className="flex justify-between text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  <span>প্রতি অর্ডারে আপনার লাভ:</span>
                  <span className="text-[#0071E3] dark:text-[#0A84FF] font-semibold">৳{profitMargin}</span>
                </div>
                <input
                  type="range"
                  min={150}
                  max={1200}
                  step={50}
                  value={profitMargin}
                  onChange={(e) => setProfitMargin(Number(e.target.value))}
                  className="w-full accent-[#0071E3] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#86868B]">
                  <span>১৫০৳</span>
                  <span>৬৫০৳</span>
                  <span>১২০০৳</span>
                </div>
              </div>
            </div>

            {/* Calculations Summary Card */}
            <div className="p-5 rounded-2xl bg-[#1D1D1F] text-white dark:bg-[#000000] border border-black/[0.1] dark:border-white/[0.12] flex flex-col justify-between gap-4 tabular-nums">
              <div className="space-y-3">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#30D158]">
                  মাসিক সম্ভাব্য আয় সামারি
                </span>

                <div className="text-3xl font-semibold tracking-tight text-white">
                  ৳{monthlyProfit.toLocaleString("en-BD")}
                  <span className="text-xs text-[#98989D] font-normal ml-1">/ মাস (গ্রস)</span>
                </div>

                <div className="space-y-2 pt-3 border-t border-white/10 text-xs">
                  <div className="flex justify-between text-white/75">
                    <span>মাসে মোট ডেলিভারি:</span>
                    <span className="font-semibold text-white">{monthlyOrders} টি</span>
                  </div>
                  <div className="flex justify-between text-white/75">
                    <span>সংরক্ষিত অগ্রিম ফি (০৳ COD):</span>
                    <span className="font-semibold text-[#30D158]">৳{advanceFeeSaved.toLocaleString("en-BD")}</span>
                  </div>
                  <div className="flex justify-between text-white/75">
                    <span>৩০ দিনের ভিআইপি সাবস্ক্রিপশন ফি:</span>
                    <span className="font-semibold text-[#FF453A]">-৳{subCost.toLocaleString("en-BD")}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-white/10 text-sm font-semibold">
                    <span>আপনার নেট প্রফিট:</span>
                    <span className="text-[#30D158] text-base">
                      ৳{(netEarnings > 0 ? netEarnings : monthlyProfit).toLocaleString("en-BD")}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onPointerDown={() => triggerHaptic("light")}
                onClick={() => {
                  if (onScrollToPlans) onScrollToPlans();
                  else navigate("/subscription");
                }}
                className="ds-apple-btn-primary w-full min-h-[44px] rounded-full font-semibold text-xs flex items-center justify-center gap-2 whitespace-nowrap active:scale-[0.97] transition-transform cursor-pointer"
              >
                <Crown className="w-4 h-4 shrink-0" />
                <span>ভিআইপি সাবস্ক্রিপশন চালু করুন</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* 7. Tab 4: Refer & Earn */}
      {activeTab === "refer" && (
        <motion.div
          key="refer"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={APPLE_SPRING_SNAPPY}
          className="ds-apple-surface rounded-[26px] p-4 sm:p-7 space-y-6 min-w-0 max-w-full overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                রেফার অ্যান্ড আর্ন (বিনা পুঁজিতে নিশ্চিত আয়)
              </h3>
              <p className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-0.5">
                যাঁরা পণ্য বিক্রি বা কুরিয়ার হ্যান্ডেল করতে চান না, তাঁরা কেবল রেফারেল লিংক শেয়ার করে ইনকাম করতে পারেন:
              </p>
            </div>

            <button
              type="button"
              onPointerDown={() => triggerHaptic("light")}
              onClick={() => navigate("/affiliate")}
              className="ds-apple-btn-secondary px-4 min-h-[38px] rounded-full text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-[0.97] transition-transform cursor-pointer"
            >
              <span>অ্যাফিলিয়েট ড্যাশবোর্ড</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { num: "১", title: "লিংক বা কোড শেয়ার", desc: "আপনার রেফারেল লিংক সোশ্যাল মিডিয়ায় ও পরিচিতজনদের কাছে শেয়ার করুন।" },
              { num: "২", title: "জয়েন বা কেনাকাটা", desc: "আপনার লিংকে কেউ সাবস্ক্রিপশন নিলে বা পণ্য অর্ডার করলেই কমিশন যোগ হবে।" },
              { num: "৩", title: "বিকাশে সরাসরি উইথড্র", desc: "৫০৳ হলেই সরাসরি বিকাশ বা নগদে ক্যাশআউট রিকোয়েস্ট পাঠাতে পারবেন।" },
            ].map((step) => (
              <div
                key={step.num}
                className="p-4 rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.05] dark:border-white/[0.08] space-y-1.5"
              >
                <span className="w-6 h-6 rounded-full bg-[#0071E3]/12 dark:bg-[#0A84FF]/18 text-[#0071E3] dark:text-[#0A84FF] text-xs font-medium flex items-center justify-center">
                  {step.num}
                </span>
                <h4 className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{step.title}</h4>
                <p className="text-[11px] text-[#6E6E73] dark:text-[#98989D] leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Referral Link & WhatsApp Share */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                আপনার রেফারেল লিংক
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#6E6E73] dark:text-[#98989D]">কোড:</span>
                <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.1] text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {referralCode}
                </span>
                <button
                  type="button"
                  onPointerDown={() => triggerHaptic("light")}
                  onClick={() => handleCopyText(referralCode, "code")}
                  className="p-1.5 rounded-full text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-white cursor-pointer"
                  title="কোড কপি"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-[#248A3D] dark:text-[#30D158]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                readOnly
                value={shareLink}
                className="ds-apple-input flex-1 min-w-0 px-3.5 py-2.5 text-xs font-medium rounded-xl outline-none select-all"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onPointerDown={() => triggerHaptic("light")}
                  onClick={() => handleCopyText(shareLink, "link")}
                  className="ds-apple-btn-primary px-4 min-h-[40px] rounded-full text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap active:scale-[0.97] transition-transform cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                  <span>{copiedLink ? "কপি হয়েছে!" : "লিংক কপি"}</span>
                </button>
                <button
                  type="button"
                  onPointerDown={() => triggerHaptic("light")}
                  onClick={handleShareWhatsapp}
                  className="ds-apple-btn-secondary px-4 min-h-[40px] rounded-full text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap active:scale-[0.97] transition-transform cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 shrink-0 text-[#248A3D] dark:text-[#30D158]" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 8. Tab 5: FAQ */}
      {activeTab === "faq" && (
        <motion.div
          key="faq"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={APPLE_SPRING_SNAPPY}
          className="ds-apple-surface rounded-[26px] p-4 sm:p-7 space-y-4 min-w-0 max-w-full overflow-hidden"
        >
          <div className="border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
            <h3 className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              রিসেলারদের জরুরি প্রশ্ন ও উত্তর
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {[
              {
                q: "প্র: কাস্টমার কি আসল পাইকারি দাম জানতে পারবে?",
                a: "উ: না। কুরিয়ার ইনভয়েসে কেবল আপনার দেওয়া সেলিং প্রাইস উল্লেখ থাকবে। কোম্পানি বা পাইকারি প্রাইস গোপন রাখা হয়।",
              },
              {
                q: "প্র: পার্সেল রিটার্ন আসলে কি কোনো জরিমানা আছে?",
                a: "উ: না। ভিআইপি রিসেলারদের জন্য কোনো অতিরিক্ত জরিমানা নেই। তবে সঠিক কাস্টমারকে কনফার্ম করে অর্ডার দিলে রিটার্ন রেশিও কমে যায়।",
              },
              {
                q: "প্র: ভিআইপি সাবস্ক্রিপশন কি সাথে সাথেই সক্রিয় হয়?",
                a: "উ: হ্যাঁ। বিকাশ বা নগদে পেমেন্ট করার পর TrxID দিলে স্বয়ংক্রিয়ভাবে ভিআইপি স্ট্যাটাস সাথে সাথে চালু হয়ে যায়।",
              },
              {
                q: "প্র: প্রফিটের টাকা কীভাবে উত্তোলন করব?",
                a: "উ: আপনার ড্যাশবোর্ড থেকে বিকাশ, নগদ বা ব্যাংক অ্যাকাউন্টে সরাসরি রিকোয়েস্ট পাঠালে নির্ধারিত সময়ের মধ্যে টাকা পৌঁছে যাবে।",
              },
            ].map((item) => (
              <div
                key={item.q}
                className="p-3.5 rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.05] dark:border-white/[0.08] space-y-1"
              >
                <h4 className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{item.q}</h4>
                <p className="text-[#6E6E73] dark:text-[#98989D] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ResellerTeacherGuide;
