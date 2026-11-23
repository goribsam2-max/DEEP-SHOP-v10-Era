import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { auth, db } from "../firebase";
import {
  doc,
  onSnapshot,
  collection,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import {
  Crown,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  History,
  Loader2,
  Truck,
  ArrowDown,
  BadgeCheck,
  Headphones,
  ChevronDown,
  Zap,
  PackageCheck,
  HelpCircle,
  CalendarClock,
  BookOpen,
} from "lucide-react";
import Pricing6, {
  Plan6,
  INDIVIDUALS_PLANS,
  TEAMS_PLANS,
} from "../components/ui/components-pricings-pricing-6";
import { DEEP_SHOP_LOGO_DATA_URI } from "../lib/useFooterLogo";
import {
  TIER_COMPARISONS,
  getSubscriptionStatus,
  SubscriptionRecord,
} from "../services/subscription";
import { useNotify } from "../components/Notifications";
import BillingWarningAlertDialog from "../components/ui/billing-warning-alert-dialog";
import ResellerTeacherGuide from "../components/ResellerTeacherGuide";
import AuthVoiceToggle from "../components/AuthVoiceToggle";
import SEO from "../components/SEO";
import {
  isAuthVoiceMuted,
  playAuthVoice,
  stopAuthVoice,
} from "../lib/authVoiceAndValidation";
import { APPLE_SPRING_SNAPPY } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

const VIP_FAQS = [
  {
    q: "ভিআইপি পাস সক্রিয় করলে কি সত্যিই ১ টাকাও অগ্রিম দিতে হবে না?",
    a: "হ্যাঁ। আপনার ভিআইপি সাবস্ক্রিপশন সক্রিয় থাকা অবস্থায় চেকআউট পেজে স্বয়ংক্রিয়ভাবে ‘৳০ অগ্রিম — ১০০% ফুল ক্যাশ অন ডেলিভারি’ অপশনটি আনলক হয়ে যাবে। পণ্য হাতে পেয়ে ডেলিভারি ম্যানের সামনে যাচাই করে মূল্য পরিশোধ করতে পারবেন।",
  },
  {
    q: "রিসেলার হিসেবে কাস্টমারের ঠিকানায় কীভাবে পার্সেল পাঠাবো?",
    a: "অর্ডার করার সময় শিপিং ঠিকানায় সরাসরি আপনার কাস্টমারের নাম, মোবাইল নম্বর ও ঠিকানা দিন। আমাদের টিম কোনো অগ্রিম বুকিং মানি ছাড়াই পার্সেল প্যাক করে কুরিয়ারে পাঠিয়ে দেবে।",
  },
  {
    q: "পেমেন্ট করার কতক্ষণের মধ্যে ভিআইপি মেম্বারশিপ চালু হয়?",
    a: "বিকাশ, নগদ বা রকেটের মাধ্যমে পেমেন্ট সম্পন্ন ও ভেরিফাই হওয়ার সাথে সাথেই আপনার অ্যাকাউন্টে ভিআইপি ব্যাজ ও সব সুবিধা সক্রিয় হয়ে যায়।",
  },
  {
    q: "বর্তমান মেয়াদ শেষ হওয়ার আগে নতুন প্ল্যান নিলে কি আগের দিনগুলো যুক্ত থাকবে?",
    a: "হ্যাঁ, আপনার বর্তমান ভিআইপি মেয়াদের বাকি দিনগুলোর সাথে নতুন প্ল্যানের মেয়াদ স্বয়ংক্রিয়ভাবে যোগ হয়ে যাবে—কোনো দিন নষ্ট হবে না।",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "০১",
    title: "পছন্দের পাস নির্বাচন করুন",
    desc: "৩ দিন থেকে ১ বছর—আপনার প্রয়োজন অনুযায়ী যেকোনো একটি ভিআইপি প্ল্যান বেছে নিয়ে সুরক্ষিত পেমেন্ট সম্পন্ন করুন।",
    icon: Crown,
  },
  {
    step: "০২",
    title: "তাৎক্ষণিক ভিআইপি অ্যাক্টিভেশন",
    desc: "অ্যাকাউন্টে ভিআইপি স্ট্যাটাস চালু হয়ে চেকআউটে ০৳ অগ্রিম বুকিং এবং ফ্রি এক্সপ্রেস ডেলিভারি আনলক হবে।",
    icon: Zap,
  },
  {
    step: "০৩",
    title: "আনলিমিটেড অর্ডার ও রিসেলিং",
    desc: "নিজের জন্য অথবা সরাসরি কাস্টমারের ঠিকানায় শতভাগ ক্যাশ অন ডেলিভারিতে যত খুশি অর্ডার বুক করুন।",
    icon: PackageCheck,
  },
];

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const prefersReducedMotion = useReducedMotion();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // User subscription history
  const [myHistory, setMyHistory] = useState<SubscriptionRecord[]>([]);

  // Warning Dialog State
  const [showWarningModal, setShowWarningModal] = useState(false);
  const pricingRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const hasPlayedWelcomeRef = useRef(false);
  const skipStopOnUnmountRef = useRef(false);

  // Track auth state & user profile
  useEffect(() => {
    let unsubUser: (() => void) | null = null;
    let unsubSubs: (() => void) | null = null;

    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (unsubUser) {
        unsubUser();
        unsubUser = null;
      }
      if (unsubSubs) {
        unsubSubs();
        unsubSubs = null;
      }

      setCurrentUser(user);
      if (!user) {
        setUserData(null);
        setMyHistory([]);
        setLoading(false);
        return;
      }

      unsubUser = onSnapshot(
        doc(db, "users", user.uid),
        (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
          setLoading(false);
        },
        () => {
          setLoading(false);
        }
      );

      try {
        const q = query(
          collection(db, "subscriptions"),
          where("userId", "==", user.uid)
        );
        unsubSubs = onSnapshot(
          q,
          (snap) => {
            const list: SubscriptionRecord[] = [];
            snap.forEach((d) => {
              list.push({ id: d.id, ...(d.data() as any) });
            });
            list.sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));
            setMyHistory(list);
          },
          () => {}
        );
      } catch (err) {
        console.error("Error fetching subscriptions:", err);
      }
    });

    return () => {
      unsubAuth();
      if (unsubUser) unsubUser();
      if (unsubSubs) unsubSubs();
      if (!skipStopOnUnmountRef.current) {
        stopAuthVoice();
      }
    };
  }, []);

  const subStatus = getSubscriptionStatus(userData);

  // Play Bengali Male Voiceover Welcome once user status loads
  useEffect(() => {
    if (loading || hasPlayedWelcomeRef.current) return;
    hasPlayedWelcomeRef.current = true;
    if (isAuthVoiceMuted()) return;

    if (subStatus.isSubscribed) {
      playAuthVoice(
        `ডিপশপ ভিআইপি মেম্বারশিপ পেজে স্বাগতম। আপনার ভিআইপি সাবস্ক্রিপশন বর্তমানে সক্রিয় আছে এবং আপনি শূন্য টাকা অগ্রিমে ফুল ক্যাশ অন ডেলিভারি সুবিধা পাচ্ছেন। মেয়াদ বাড়াতে নিচের যেকোনো প্ল্যান বেছে নিতে পারেন।`
      );
    } else {
      playAuthVoice(
        `ডিপশপ ভিআইপি সাবস্ক্রিপশন পেজে স্বাগতম। ভিআইপি মেম্বার হলে কোনো অগ্রিম টাকা ছাড়াই শতভাগ ক্যাশ অন ডেলিভারিতে আনলিমিটেড অর্ডার এবং ফ্রি এক্সপ্রেস ডেলিভারি সুবিধা পাবেন। নিচের প্ল্যানগুলো থেকে আপনার পছন্দের পাসটি বেছে নিন।`
      );
    }
  }, [loading, subStatus.isSubscribed]);

  const speakIfUnmuted = (msg: string) => {
    if (!isAuthVoiceMuted()) {
      playAuthVoice(msg);
    }
  };

  // Handle plan purchase -> directly creates order and redirects to Payment page
  const handleSelectPlan = async (plan: Plan6) => {
    triggerHaptic("medium");
    const activeUser = auth.currentUser || currentUser;
    if (!activeUser) {
      speakIfUnmuted(
        "ভিআইপি প্ল্যানটি চালু করতে অনুগ্রহ করে প্রথমে আপনার অ্যাকাউন্টে লগইন করুন।"
      );
      skipStopOnUnmountRef.current = true;
      notify("প্ল্যানটি নিতে অনুগ্রহ করে প্রথমে সাইন-ইন করুন।", "info");
      navigate("/signin");
      return;
    }

    speakIfUnmuted(
      `আপনি ${plan.name} নির্বাচন করেছেন। সুরক্ষিত পেমেন্ট পেজে নিয়ে যাওয়া হচ্ছে।`
    );
    skipStopOnUnmountRef.current = true;

    const priceMap: Record<string, { price: number; days: number }> = {
      "3days": { price: 5000, days: 3 },
      "1week": { price: 8000, days: 7 },
      "30days": { price: 13000, days: 30 },
      "3months": { price: 15000, days: 90 },
      "6months": { price: 20000, days: 180 },
      "1year": { price: 30000, days: 365 },
    };

    const config = priceMap[plan.id] || { price: 13000, days: 30 };
    setCreatingOrder(plan.id);

    try {
      const newOrderRef = doc(collection(db, "orders"));
      const orderId = newOrderRef.id;

      const orderPayload: any = {
        id: orderId,
        type: "subscription",
        userId: activeUser.uid || "guest",
        planId: plan.id,
        planName: plan.name,
        durationDays: config.days,
        total: config.price,
        subTotal: config.price,
        amountToPay: config.price,
        advanceAmount: config.price,
        paymentOption: "Full Payment",
        paymentMethod: "",
        deliveryFee: 0,
        dueAmount: 0,
        customerName: userData?.name || activeUser.displayName || "VIP Member",
        customerEmail: activeUser.email || "",
        customerPhone: userData?.phone || "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: "pending_payment",
        paymentStatus: "unpaid",
        items: [
          {
            id: plan.id,
            productId: plan.id,
            name: plan.name,
            title: plan.name,
            price: config.price,
            priceAtPurchase: config.price,
            quantity: 1,
            image: DEEP_SHOP_LOGO_DATA_URI,
            isSubscription: true,
          },
        ],
        shippingAddress: {
          name: userData?.name || activeUser.displayName || "VIP Member",
          phone: userData?.phone || "",
          address: "VIP Subscription Service",
          city: "Dhaka",
          division: "Dhaka",
        },
      };

      // 1. Immediately cache in localStorage for instant rendering in Payment.tsx
      try {
        localStorage.setItem("order_" + orderId, JSON.stringify(orderPayload));
      } catch (e) {}

      // 2. Persist to Firestore
      try {
        await setDoc(newOrderRef, orderPayload);
      } catch (dbErr) {
        console.warn("Firestore setDoc warning:", dbErr);
      }

      // 3. Navigate directly to payment page
      navigate(`/payment/${orderId}`);
    } catch (err: any) {
      console.error("Error creating subscription order:", err);
      const fallbackId = "sub_" + Date.now();
      const fallbackPayload: any = {
        id: fallbackId,
        type: "subscription",
        userId: activeUser.uid || "guest",
        planId: plan.id,
        planName: plan.name,
        durationDays: config.days,
        total: config.price,
        subTotal: config.price,
        amountToPay: config.price,
        advanceAmount: config.price,
        paymentOption: "Full Payment",
        paymentMethod: "",
        deliveryFee: 0,
        dueAmount: 0,
        customerName: userData?.name || activeUser.displayName || "VIP Member",
        customerEmail: activeUser.email || "",
        customerPhone: userData?.phone || "",
        createdAt: Date.now(),
        status: "pending_payment",
        items: [
          {
            id: plan.id,
            name: plan.name,
            price: config.price,
            quantity: 1,
            isSubscription: true,
          },
        ],
      };
      try {
        localStorage.setItem(
          "order_" + fallbackId,
          JSON.stringify(fallbackPayload)
        );
      } catch (e) {}
      navigate(`/payment/${fallbackId}`);
    } finally {
      setCreatingOrder(null);
    }
  };

  const scrollToPlans = () => {
    triggerHaptic("medium");
    speakIfUnmuted(
      "নিচের তালিকা থেকে আপনার পছন্দের ভিআইপি সাবস্ক্রিপশন প্ল্যানটি বেছে নিন।"
    );
    pricingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToGuide = () => {
    triggerHaptic("selection");
    speakIfUnmuted(
      "রিসেলার মাস্টারক্লাস এবং লাইভ অর্ডার ডেমো নিচে দেখানো হলো।"
    );
    guideRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const memberDisplayName =
    userData?.name ||
    userData?.displayName ||
    currentUser?.displayName ||
    (currentUser?.email ? currentUser.email.split("@")[0] : "Guest Visitor");

  const formattedExpiry = subStatus.expiryDate
    ? new Date(subStatus.expiryDate).toLocaleDateString("bn-BD", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="ds-apple-shop-canvas min-h-screen pb-28 overflow-x-clip">
      <SEO
        title="VIP Subscription & Reseller Pass — DEEP SHOP"
        description="Activate 0 Taka Advance 100% Cash on Delivery, Free Express Shipping across Bangladesh, and Reseller Masterclass benefits on DEEP SHOP."
        canonical="/subscription"
      />

      {/* Expiry Warning Alert Dialog */}
      {subStatus.isExpiringSoon && (
        <BillingWarningAlertDialog
          open={showWarningModal}
          onOpenChange={setShowWarningModal}
          planName={subStatus.plan?.nameBn || "ভিআইপি পাস"}
          daysRemaining={subStatus.daysRemaining}
          expiryDate={subStatus.expiryDate || undefined}
          isExpired={false}
          onRenew={() => {
            setShowWarningModal(false);
            scrollToPlans();
          }}
          onDismiss={() => setShowWarningModal(false)}
        />
      )}

      <div className="max-w-6xl w-full min-w-0 mx-auto px-3.5 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6 sm:space-y-9 overflow-x-clip">
        {/* Responsive Asymmetric 12-Column Hero & Live Membership Pass */}
        <section className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-12 gap-5 lg:gap-6 items-stretch min-w-0">
          {/* Left 7 Cols: Editorial Value Proposition */}
          <div className="ds-apple-surface lg:col-span-7 relative overflow-hidden rounded-[28px] p-5 sm:p-8 lg:p-9 flex flex-col justify-between min-w-0">
            <div className="space-y-4 sm:space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#B26A00] dark:text-[#FFD60A] min-w-0">
                  <Crown className="w-4 h-4 text-[#FF9F0A] shrink-0" />
                  <span>Deep Shop VIP Membership</span>
                  <span aria-hidden="true" className="ds-apple-muted">
                    &middot;
                  </span>
                  <span className="ds-apple-muted font-medium">
                    সারা দেশে ৬৪ জেলায় প্রযোজ্য
                  </span>
                </div>
                <div className="shrink-0">
                  <AuthVoiceToggle isInline />
                </div>
              </div>

              <h1 className="ds-apple-display text-[21px] sm:text-[26px] lg:text-[31px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] leading-[1.2]">
                ০ টাকা অগ্রিমে আনলিমিটেড ফুল ক্যাশ অন ডেলিভারি ও ভিআইপি রিসেলার পাস
              </h1>

              <p className="text-sm sm:text-[15.5px] ds-apple-muted leading-relaxed max-w-[62ch]">
                কোনো অগ্রিম ডেলিভারি চার্জ বা বুকিং মানি ছাড়াই নিজের জন্য অর্ডার করুন অথবা রিসেলার হিসেবে সরাসরি কাস্টমারের ঠিকানায় পার্সেল পাঠান। পণ্য হাতে পেয়ে যাচাই করে মূল্য পরিশোধের শতভাগ সুবিধা।
              </p>
            </div>

            <div className="pt-6 mt-6 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={scrollToPlans}
                className="ds-apple-btn-primary min-h-[46px] px-6 py-2.5 rounded-full text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <span>প্ল্যানসমূহ দেখুন</span>
                <ArrowDown className="w-4 h-4 shrink-0" />
              </button>

              <button
                type="button"
                onClick={scrollToGuide}
                className="ds-apple-btn-secondary min-h-[46px] px-5 py-2.5 rounded-full text-sm font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer whitespace-nowrap"
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>রিসেলার মাস্টারক্লাস</span>
              </button>
            </div>
          </div>

          {/* Right 5 Cols: Live Membership Entitlement Ledger */}
          <div className="ds-apple-surface lg:col-span-5 rounded-[28px] p-5 sm:p-7 flex flex-col justify-between divide-y divide-black/[0.06] dark:divide-white/[0.08] min-w-0">
            <div className="pb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-medium ds-apple-muted block">
                  অ্যাকাউন্ট স্ট্যাটাস
                </span>
                <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] truncate mt-0.5">
                  {memberDisplayName}
                </h2>
              </div>

              <div
                className={`text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap pt-0.5 ${
                  subStatus.isSubscribed
                    ? "text-[#248A3D] dark:text-[#30D158]"
                    : "ds-apple-muted"
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  {subStatus.isSubscribed ? "VIP সক্রিয়" : "ফ্রি মেম্বার"}
                </span>
              </div>
            </div>

            {subStatus.isSubscribed ? (
              <div className="py-4 space-y-3 tabular-nums">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="ds-apple-muted">সক্রিয় প্ল্যান</span>
                  <span className="text-sm font-semibold text-[#248A3D] dark:text-[#30D158]">
                    {subStatus.plan?.nameBn || "ভিআইপি মেম্বারশিপ"}
                  </span>
                </div>

                <div className="flex items-end justify-between gap-3 pt-1">
                  <div>
                    <span className="text-xs ds-apple-muted block">
                      অবশিষ্ট মেয়াদ
                    </span>
                    <span className="text-2xl font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {subStatus.daysRemaining} দিন
                    </span>
                  </div>
                  {formattedExpiry && (
                    <div className="text-right">
                      <span className="text-xs ds-apple-muted block">
                        মেয়াদ শেষ
                      </span>
                      <span className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] inline-flex items-center gap-1">
                        <CalendarClock className="w-3.5 h-3.5 text-[#248A3D] dark:text-[#30D158]" />
                        {formattedExpiry}
                      </span>
                    </div>
                  )}
                </div>

                {subStatus.isExpiringSoon && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("warning");
                      setShowWarningModal(true);
                    }}
                    className="w-full min-h-[42px] px-4 py-2 rounded-full bg-[#FF9F0A]/15 hover:bg-[#FF9F0A]/25 text-[#B26A00] dark:text-[#FFD60A] text-xs font-semibold transition-transform active:scale-[0.98] cursor-pointer"
                  >
                    মেয়াদ শীঘ্রই শেষ হচ্ছে — রিনিউ সতর্কবার্তা দেখুন
                  </button>
                )}
              </div>
            ) : (
              <div className="py-4 space-y-2.5 tabular-nums text-xs sm:text-[13px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="ds-apple-muted">বর্তমান চেকআউট শর্ত</span>
                  <span className="font-semibold text-[#FF3B30] dark:text-[#FF453A]">
                    ১২০৳–২০০৳ অগ্রিম চার্জ
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#1D1D1F] dark:text-[#F5F5F7] font-medium">
                    VIP চালু করলে
                  </span>
                  <span className="font-semibold text-[#248A3D] dark:text-[#30D158]">
                    ৳০ অগ্রিম &middot; ১০০% COD
                  </span>
                </div>
              </div>
            )}

            <div className="pt-4 grid grid-cols-2 gap-4 text-xs tabular-nums">
              <div>
                <span className="ds-apple-muted block">ডেলিভারি কভারেজ</span>
                <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5 block">
                  ৬৪ জেলা ফ্রি শিপমেন্ট
                </span>
              </div>
              <div>
                <span className="ds-apple-muted block">অর্ডার লিমিট</span>
                <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5 block">
                  আনলিমিটেড পার্সেল
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Responsive 4-Column VIP Value Metrics Strip */}
        <section className="ds-apple-surface rounded-[24px] grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-black/[0.06] dark:divide-white/[0.08] min-w-0 max-w-full overflow-hidden">
          <div className="p-5 flex items-start gap-3.5">
            <BadgeCheck className="w-5 h-5 text-[#248A3D] dark:text-[#30D158] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                ৳০ অগ্রিম বুকিং
              </p>
              <p className="text-xs ds-apple-muted mt-1 leading-relaxed">
                অগ্রিম ১ টাকাও ছাড়া ১০০% ক্যাশ অন ডেলিভারি
              </p>
            </div>
          </div>

          <div className="p-5 flex items-start gap-3.5">
            <Truck className="w-5 h-5 text-[#0071E3] dark:text-[#0A84FF] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                ফ্রি এক্সপ্রেস ডেলিভারি
              </p>
              <p className="text-xs ds-apple-muted mt-1 leading-relaxed">
                সারা দেশে অগ্রাধিকার ভিত্তিতে দ্রুত শিপমেন্ট
              </p>
            </div>
          </div>

          <div className="p-5 flex items-start gap-3.5">
            <PackageCheck className="w-5 h-5 text-[#FF9F0A] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                রিসেলার ড্রপশিপিং
              </p>
              <p className="text-xs ds-apple-muted mt-1 leading-relaxed">
                নিজস্ব স্টক ছাড়াই কাস্টমারের ঠিকানায় ডেলিভারি
              </p>
            </div>
          </div>

          <div className="p-5 flex items-start gap-3.5">
            <Headphones className="w-5 h-5 text-[#0071E3] dark:text-[#0A84FF] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                ২৪/৭ ভিআইপি সাপোর্ট
              </p>
              <p className="text-xs ds-apple-muted mt-1 leading-relaxed">
                সরাসরি অর্ডার ভেরিফিকেশন ও ডেডিকেটেড হেল্পলাইন
              </p>
            </div>
          </div>
        </section>

        {/* Pricing6 Component */}
        <div id="vip-plans" ref={pricingRef} className="relative scroll-mt-20 w-full min-w-0">
          {creatingOrder && (
            <div className="ds-apple-backdrop absolute inset-0 z-30 flex items-center justify-center rounded-3xl">
              <div className="ds-apple-popover flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                <Loader2 className="w-5 h-5 animate-spin text-[#0071E3] dark:text-[#0A84FF]" />
                <span>পেমেন্ট পেজ প্রস্তুত হচ্ছে...</span>
              </div>
            </div>
          )}

          <Pricing6
            individualPlans={INDIVIDUALS_PLANS}
            teamsPlans={TEAMS_PLANS}
            title="প্ল্যান বেছে নিন ও পেমেন্ট করুন"
            subtitle="ক্লিক করলে সরাসরি চেকআউটের সুরক্ষিত পেমেন্ট পেজে নিয়ে যাওয়া হবে।"
            onSelectPlan={handleSelectPlan}
            onTabChange={(tab) => {
              triggerHaptic("selection");
              if (tab === "individuals") {
                speakIfUnmuted(
                  "স্বল্পমেয়াদী ভিআইপি প্ল্যানসমূহ। এখানে তিন দিন, এক সপ্তাহ এবং এক মাসের পাস রয়েছে।"
                );
              } else {
                speakIfUnmuted(
                  "দীর্ঘমেয়াদী ভিআইপি প্ল্যানসমূহ। এখানে তিন মাস, ছয় মাস এবং এক বছরের আল্ট্রা পাস রয়েছে।"
                );
              }
            }}
            onListenPlan={(plan) => {
              triggerHaptic("selection");
              speakIfUnmuted(
                `${plan.name}। মূল্য ${plan.price}। ${plan.description}`
              );
            }}
          />
        </div>

        {/* How VIP Works */}
        <section className="ds-apple-surface rounded-[24px] overflow-hidden min-w-0 max-w-full">
          <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-black/[0.06] dark:border-white/[0.08]">
            <h2 className="text-lg sm:text-xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
              মাত্র ৩টি সহজ ধাপে ভিআইপি সুবিধা শুরু করুন
            </h2>
            <p className="text-xs sm:text-sm ds-apple-muted mt-1">
              জটিল কোনো ফর্ম বা কাগজপত্র ছাড়াই তাৎক্ষণিক অ্যাক্টিভেশন
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-black/[0.06] dark:divide-white/[0.08]">
            {WORKFLOW_STEPS.map((item) => {
              const StepIcon = item.icon;
              return (
                <div
                  key={item.step}
                  className="p-5 sm:p-7 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center shrink-0">
                      <StepIcon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold ds-apple-muted tabular-nums">
                      {item.step}. ধাপ
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-sm sm:text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-[13.5px] ds-apple-muted leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Reseller Masterclass & Interactive Profit Tools */}
        <div ref={guideRef} className="scroll-mt-20 min-w-0 w-full max-w-full overflow-x-clip">
          <ResellerTeacherGuide
            user={currentUser}
            userData={userData}
            onVoiceGuide={speakIfUnmuted}
            onScrollToPlans={scrollToPlans}
          />
        </div>

        {/* Free vs VIP Comparison Matrix */}
        <section className="ds-apple-surface rounded-[24px] overflow-hidden min-w-0 max-w-full">
          <div className="px-5 sm:px-7 py-5 border-b border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                ফ্রি মেম্বার বনাম ভিআইপি মেম্বার তুলনা
              </h2>
              <p className="text-xs sm:text-sm ds-apple-muted mt-0.5">
                সাধারণ অ্যাকাউন্ট এবং ভিআইপি মেম্বারশিপের সুবিধাসমূহের স্পষ্ট পার্থক্য
              </p>
            </div>
            <button
              type="button"
              onClick={scrollToPlans}
              className="ds-apple-btn-primary self-start sm:self-auto min-h-[40px] px-5 py-2 rounded-full text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              ভিআইপিতে আপগ্রেড করুন
            </button>
          </div>

          {/* Desktop 12-Col Matrix (md+) */}
          <div className="hidden md:block">
            <div className="ds-apple-surface-subtle grid grid-cols-12 px-7 py-3.5 border-b border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold ds-apple-muted">
              <div className="col-span-4">সুবিধার ধরন</div>
              <div className="col-span-4">ফ্রি মেম্বার</div>
              <div className="col-span-4 text-[#248A3D] dark:text-[#30D158] flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-[#FF9F0A] shrink-0" />
                <span>Deep Shop VIP</span>
              </div>
            </div>

            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
              {TIER_COMPARISONS.map((row, idx) => (
                <div
                  key={idx}
                  className="px-7 py-4 grid grid-cols-12 gap-5 items-center hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className="col-span-4 font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {row.feature}
                  </div>

                  <div className="col-span-4 flex items-start gap-2 text-[13px] ds-apple-muted">
                    <XCircle className="w-4 h-4 text-[#FF3B30] dark:text-[#FF453A] shrink-0 mt-0.5" />
                    <span>{row.free}</span>
                  </div>

                  <div className="col-span-4 flex items-start gap-2 text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    <CheckCircle2 className="w-4 h-4 text-[#248A3D] dark:text-[#30D158] shrink-0 mt-0.5" />
                    <span>{row.vip}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Responsive Hairline-Divided Comparison (< md) */}
          <div className="md:hidden divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            {TIER_COMPARISONS.map((row, idx) => (
              <div key={idx} className="p-4 sm:p-5 space-y-2.5 min-w-0">
                <div className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {row.feature}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-1 min-w-0">
                  <div className="space-y-1 min-w-0">
                    <span className="text-xs font-semibold text-[#FF3B30] dark:text-[#FF453A] flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>ফ্রি মেম্বার</span>
                    </span>
                    <p className="text-xs ds-apple-muted leading-relaxed break-words">
                      {row.free}
                    </p>
                  </div>

                  <div className="space-y-1 border-l border-black/[0.06] dark:border-white/[0.08] pl-3 sm:pl-3.5 min-w-0">
                    <span className="text-xs font-semibold text-[#248A3D] dark:text-[#30D158] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>VIP মেম্বার</span>
                    </span>
                    <p className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] leading-relaxed break-words">
                      {row.vip}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Common VIP Questions Accordion */}
        <section className="ds-apple-surface rounded-[24px] overflow-hidden">
          <div className="px-5 sm:px-8 py-5 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 text-[#0071E3] dark:text-[#0A84FF] shrink-0" />
            <div>
              <h2 className="text-base sm:text-xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                ভিআইপি মেম্বারশিপ সম্পর্কে সচরাচর জিজ্ঞাসিত প্রশ্ন
              </h2>
              <p className="text-xs ds-apple-muted mt-0.5">
                কেনার আগে গুরুত্বপূর্ণ বিষয়গুলো জেনে নিন
              </p>
            </div>
          </div>

          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            {VIP_FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => {
                      triggerHaptic("selection");
                      setOpenFaqIndex(isOpen ? null : idx);
                    }}
                    className="w-full min-h-[54px] px-5 sm:px-8 py-4 text-left flex items-center justify-between gap-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <span className="text-xs sm:text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] leading-snug">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 ds-apple-muted shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                        transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_SNAPPY}
                        className="overflow-hidden"
                      >
                        <div className="px-5 sm:px-8 pb-4 pt-0 text-xs sm:text-[13.5px] ds-apple-muted leading-relaxed max-w-[75ch]">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* User's Previous Subscriptions History Ledger */}
        {myHistory.length > 0 && (
          <section className="ds-apple-surface rounded-[24px] overflow-hidden">
            <div className="px-5 sm:px-7 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-3">
              <h3 className="text-sm sm:text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-2 truncate">
                <History className="w-4 h-4 ds-apple-muted shrink-0" />
                <span>আপনার পূর্ববর্তী সাবস্ক্রিপশন ইতিহাস</span>
              </h3>
              <span className="text-xs ds-apple-muted font-medium tabular-nums shrink-0">
                মোট {myHistory.length} টি
              </span>
            </div>

            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08] tabular-nums">
              {myHistory.map((item) => {
                const dateStr = item.requestedAt
                  ? new Date(item.requestedAt).toLocaleDateString("bn-BD")
                  : "N/A";
                return (
                  <div
                    key={item.id}
                    className="px-5 sm:px-7 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                        {item.planName} &middot; ৳{item.price.toLocaleString("en-BD")}
                      </div>
                      <div className="text-xs ds-apple-muted truncate mt-0.5">
                        মেথড: {item.paymentMethod || "Online"} &middot; TrxID:{" "}
                        {item.trxId || "Pending"} &middot; {dateStr}
                      </div>
                    </div>

                    <span
                      className={`text-xs font-semibold shrink-0 whitespace-nowrap ${
                        item.status === "approved"
                          ? "text-[#248A3D] dark:text-[#30D158]"
                          : item.status === "pending"
                          ? "text-[#B26A00] dark:text-[#FFD60A]"
                          : "ds-apple-muted"
                      }`}
                    >
                      {item.status === "approved"
                        ? "সক্রিয়"
                        : item.status === "pending"
                        ? "পেন্ডিং"
                        : "বাতিল"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
