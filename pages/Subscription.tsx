import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  doc,
  onSnapshot,
  collection,
  addDoc,
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
  ArrowRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import Pricing6, {
  Plan6,
  INDIVIDUALS_PLANS,
  TEAMS_PLANS,
} from "../components/ui/components-pricings-pricing-6";
import {
  TIER_COMPARISONS,
  getSubscriptionStatus,
  SubscriptionRecord,
} from "../services/subscription";
import { useNotify } from "../components/Notifications";
import BillingWarningAlertDialog from "../components/ui/billing-warning-alert-dialog";

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { notify } = useNotify();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState<string | null>(null);

  // User subscription history
  const [myHistory, setMyHistory] = useState<SubscriptionRecord[]>([]);

  // Warning Dialog State
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Track auth state & user profile
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (!user) {
        setLoading(false);
        return;
      }

      // Listen to user doc
      const unsubUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
        setLoading(false);
      });

      // Listen to user's subscription records
      try {
        const q = query(
          collection(db, "subscriptions"),
          where("userId", "==", user.uid)
        );
        const unsubSubs = onSnapshot(q, (snap) => {
          const list: SubscriptionRecord[] = [];
          snap.forEach((d) => {
            list.push({ id: d.id, ...(d.data() as any) });
          });
          list.sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));
          setMyHistory(list);
        });

        return () => {
          unsubUser();
          unsubSubs();
        };
      } catch (err) {
        console.error("Error fetching subscriptions:", err);
      }
    });

    return () => unsubAuth();
  }, []);

  const subStatus = getSubscriptionStatus(userData);

  // Handle plan purchase -> directly creates order and redirects to Payment page
  const handleSelectPlan = async (plan: Plan6) => {
    const activeUser = auth.currentUser || currentUser;
    if (!activeUser) {
      notify("প্ল্যানটি নিতে অনুগ্রহ করে প্রথমে সাইন-ইন করুন।", "info");
      navigate("/signin");
      return;
    }

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
        paymentMethod: "bKash or Nagad",
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
            image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80",
            isSubscription: true,
          },
        ],
        shippingAddress: {
          name: userData?.name || activeUser.displayName || "VIP Member",
          phone: userData?.phone || "01700000000",
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
      // Fallback redirection with local cache so user is never blocked
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
        paymentMethod: "bKash or Nagad",
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
        localStorage.setItem("order_" + fallbackId, JSON.stringify(fallbackPayload));
      } catch (e) {}
      navigate(`/payment/${fallbackId}`);
    } finally {
      setCreatingOrder(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50/70 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 py-6 sm:py-10 px-3 sm:px-6 pb-28">
      {/* Expiry Warning Alert Dialog */}
      {subStatus.isExpiringSoon && (
        <BillingWarningAlertDialog
          open={showWarningModal}
          onOpenChange={setShowWarningModal}
          planName={subStatus.plan?.nameBn || "ভিআইপি পাস"}
          daysRemaining={subStatus.daysRemaining}
          expiryDate={subStatus.expiryDate || undefined}
          isExpired={false}
          onRenew={() => setShowWarningModal(false)}
          onDismiss={() => setShowWarningModal(false)}
        />
      )}

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Minimal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold">
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span className="truncate">DEEP SHOP VIP</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white truncate">
              ০ টাকা অগ্রিমে ফুল ক্যাশ অন ডেলিভারি
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 truncate">
              কোনো অগ্রিম চার্জ বা বুকিং মানি ছাড়াই যেকোনো পণ্য আনলিমিটেড অর্ডার করার সুবিধা।
            </p>
          </div>

          {/* Current Status Pill */}
          <div className="flex items-center gap-2 self-start sm:self-auto px-3.5 py-2 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                subStatus.isSubscribed
                  ? "bg-emerald-500 ring-2 ring-emerald-500/20"
                  : "bg-zinc-400"
              }`}
            />
            <div className="text-xs font-medium">
              <span className="text-zinc-500 dark:text-zinc-400 mr-1.5">স্ট্যাটাস:</span>
              <span className="font-bold text-zinc-900 dark:text-white">
                {subStatus.isSubscribed
                  ? `${subStatus.plan?.nameBn || "ভিআইপি অ্যাক্টিভ"} (${subStatus.daysRemaining} দিন বাকি)`
                  : "ফ্রি মেম্বার (Free)"}
              </span>
            </div>
            {subStatus.isExpiringSoon && (
              <button
                onClick={() => setShowWarningModal(true)}
                className="text-[11px] text-amber-600 dark:text-amber-400 font-bold underline ml-1"
              >
                সতর্কবার্তা
              </button>
            )}
          </div>
        </div>

        {/* Pricing6 Component */}
        <div className="relative">
          {creatingOrder && (
            <div className="absolute inset-0 z-30 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center rounded-3xl">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-200">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-900 dark:text-white" />
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
          />
        </div>

        {/* Minimal Mobile/Desktop Friendly Free vs VIP Comparison */}
        <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-6 shadow-2xs space-y-4 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white leading-tight">
                ফ্রি বনাম ভিআইপি মেম্বার পার্থক্য
              </h3>
              <p className="text-[11px] sm:text-xs text-zinc-500 leading-relaxed mt-0.5">
                ফ্রি টিয়ারে কী কী বাধ্যবাধকতা থাকে এবং ভিআইপিতে কী কী সুবিধা পাবেন।
              </p>
            </div>
            <span className="self-start sm:self-auto text-[10px] sm:text-[11px] font-black px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0 whitespace-nowrap">
              সুবিধা তালিকা
            </span>
          </div>

          <div className="space-y-3">
            {TIER_COMPARISONS.map((row, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80 space-y-2.5"
              >
                <div className="font-bold text-zinc-900 dark:text-white text-xs sm:text-sm flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{row.feature}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Free tier status */}
                  <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-900/40 flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1 text-[11px] leading-snug">
                      <span className="font-bold text-rose-700 dark:text-rose-400 block mb-0.5">ফ্রি মেম্বার</span>
                      <span className="text-zinc-600 dark:text-zinc-300 font-medium break-words">{row.free}</span>
                    </div>
                  </div>

                  {/* VIP tier status */}
                  <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1 text-[11px] leading-snug">
                      <span className="font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mb-0.5">
                        <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span>DEEP SHOP VIP</span>
                      </span>
                      <span className="text-zinc-800 dark:text-zinc-100 font-bold break-words">{row.vip}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User's Previous Subscriptions History */}
        {myHistory.length > 0 && (
          <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 truncate">
                <History className="w-4 h-4 text-zinc-400" />
                <span>আপনার পূর্ববর্তী সাবস্ক্রিপশন আবেদনসমূহ</span>
              </h3>
              <span className="text-[11px] text-zinc-400 font-medium">
                {myHistory.length} টি
              </span>
            </div>

            <div className="space-y-2">
              {myHistory.map((item) => {
                const dateStr = item.requestedAt
                  ? new Date(item.requestedAt).toLocaleDateString("bn-BD")
                  : "N/A";
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-zinc-900 dark:text-white truncate">
                        {item.planName} &bull; ৳{item.price.toLocaleString("en-BD")}
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                        মেথড: {item.paymentMethod} &bull; TrxID: {item.trxId} &bull; {dateStr}
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        item.status === "approved"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                          : item.status === "pending"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
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
          </div>
        )}
      </div>
    </div>
  );
}
