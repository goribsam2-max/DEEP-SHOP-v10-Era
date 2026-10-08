import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { Order, OrderStatus } from "../types";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "../lib/utils";
import { useNotify } from "../components/Notifications";
import { useIllustrations } from "../lib/useIllustrations";
import Icon from "../components/Icon";
import { Zap, Smartphone, Sparkles, ShieldCheck, Lock, MapPin, Crown, CheckCircle2, XCircle, Clock, AlertTriangle, RefreshCw, Calendar, Phone, CreditCard } from "lucide-react";
import { SubscriptionRecord } from "../services/subscription";

const StatusIconSmall = ({ status }: { status: OrderStatus }) => {
  const base =
    "w-10 h-10 rounded-full flex items-center justify-center text-xs shadow-inner ";
  switch (status) {
    case OrderStatus.APPROVED:
      return (
        <div className={base + "bg-amber-50 text-amber-600"}>
          <Icon name="check" />
        </div>
      );
    case OrderStatus.CHECKING_PAYMENT:
      return (
        <div className={base + "bg-indigo-50 text-indigo-600"}>
          <Icon name="credit-card" />
        </div>
      );
    case OrderStatus.PROCESSING:
      return (
        <div className={base + "bg-blue-50 text-blue-600"}>
          <Icon name="sync-alt" className="animate-spin" />
        </div>
      );
    case OrderStatus.COMPLETE_PACKAGING:
      return (
        <div className={base + "bg-pink-50 text-pink-600"}>
          <Icon name="box" />
        </div>
      );
    case OrderStatus.DELIVER_ON_COURIER:
    case OrderStatus.SHIPPED_IN_COURIER:
      return (
        <div className={base + "bg-orange-50 text-orange-600"}>
          <Icon name="truck-moving" />
        </div>
      );
    case OrderStatus.RETURNED:
      return (
        <div className={base + "bg-red-50 text-red-600"}>
          <Icon name="times-circle" />
        </div>
      );
    case OrderStatus.ON_THE_WAY:
      return (
        <div className={base + "bg-purple-50 text-purple-600"}>
          <Icon name="motorcycle" />
        </div>
      );
    case OrderStatus.DELIVERED:
      return (
        <div className={base + "bg-green-50 text-green-600"}>
          <Icon name="box-check" />
        </div>
      );
    case OrderStatus.CANCELLED:
      return (
        <div className={base + "bg-red-50 text-red-600"}>
          <Icon name="times" />
        </div>
      );
    default:
      return (
        <div className={base + "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}>
          <Icon name="box" />
        </div>
      );
  }
};

const MyOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [activeTab, setActiveTab] = useState<"Pending" | "Active" | "Subscription" | "Cancelled">("Pending");
  const navigate = useNavigate();
  const illustrations = useIllustrations();
  const notify = useNotify();

  useEffect(() => {
    let unsubscribeOrders: (() => void) | null = null;
    let unsubscribeSubs: (() => void) | null = null;

    // Redirect if not logged in, or link order if logged in
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      const searchParams = new URLSearchParams(window.location.search);
      const pendingOrderId = searchParams.get("guestOrder") || localStorage.getItem("pending_guest_order_id");

      if (!user) {
        navigate(`/auth-selector?redirect=/my-orders${pendingOrderId ? `&guestOrder=${pendingOrderId}` : ""}`);
        return;
      }

      // If user has a pending order, auto-link to their account
      if (pendingOrderId && user.uid) {
        try {
          const ordRef = doc(db, "orders", pendingOrderId);
          await updateDoc(ordRef, {
            userId: user.uid,
            customerEmail: user.email || ""
          });
          localStorage.removeItem("pending_guest_order_id");
          localStorage.removeItem("pending_guest_order_phone");
          notify("আপনার অর্ডারটি অ্যাকাউন্টে যুক্ত করা হয়েছে!", "success");
        } catch (err) {
          console.error("Order linking error:", err);
        }
      }

      // Fetch user's orders
      const uid = user.uid;
      const q = query(collection(db, "orders"), where("userId", "==", uid));
      unsubscribeOrders = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Order,
        );
        data.sort((a, b) => b.createdAt - a.createdAt);
        setOrders(data);
        setLoading(false);
      });

      // Fetch user's subscription records
      const subQ = query(collection(db, "subscriptions"), where("userId", "==", uid));
      unsubscribeSubs = onSnapshot(subQ, (snapshot) => {
        const list: SubscriptionRecord[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as any) });
        });
        list.sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));
        setSubscriptions(list);
      });
    });

    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => {
      unsubscribeAuth();
      if (unsubscribeOrders) unsubscribeOrders();
      if (unsubscribeSubs) unsubscribeSubs();
      clearInterval(timer);
    };
  }, [navigate, notify]);

  const handleCancelOrder = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: OrderStatus.CANCELLED,
      });
      notify("Order has been cancelled.", "info");
    } catch (err) {
      notify("Failed to cancel order.", "error");
    }
  };

  const isCancelable = (order: Order) => {
    if (order.status !== OrderStatus.PENDING) return false;
    const minutesPassed = (currentTime - order.createdAt) / (1000 * 60);
    return minutesPassed <= 5;
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === "Pending") {
      return order.status === OrderStatus.PENDING;
    }
    if (activeTab === "Active") {
      return order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.PENDING;
    }
    if (activeTab === "Cancelled") {
      return order.status === OrderStatus.CANCELLED;
    }
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-[120px] md:pb-12 animate-fade-in min-h-screen bg-zinc-50 dark:bg-zinc-800">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="w-10"></div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">My Orders & Subscriptions</h1>
        <div className="w-10"></div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-zinc-900 rounded-[24px] p-1.5 mb-6 border border-zinc-100 dark:border-zinc-800 shadow-sm gap-1 overflow-x-auto no-scrollbar">
        {[
          { id: "Pending", label: "অপেক্ষমাণ" },
          { id: "Active", label: "সক্রিয়" },
          { id: "Subscription", label: "সাবস্ক্রিপশন (VIP)" },
          { id: "Cancelled", label: "বাতিলকৃত" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`grow shrink-0 min-w-[85px] whitespace-nowrap text-center py-2 px-3 sm:px-4 rounded-full text-xs sm:text-sm font-bold transition-all ${
              activeTab === tab.id
                ? "bg-zinc-900 text-white dark:bg-amber-500 dark:text-black shadow-md"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 bg-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "Subscription" ? (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Crown className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                DEEP SHOP VIP সাবস্ক্রিপশন
              </h2>
            </div>

            <button
              onClick={() => navigate("/subscription")}
              className="px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>নতুন পাস নিন</span>
            </button>
          </div>

          {subscriptions.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-8 sm:p-12 rounded-[28px] text-center space-y-4 shadow-xs">
              <Crown className="w-12 h-12 text-amber-500 mx-auto opacity-70" />
              <div className="space-y-1">
                <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-200">
                  কোনো ভিআইপি সাবস্ক্রিপশন রেকর্ড পাওয়া যায়নি
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                  আপনার অ্যাকাউন্টে কোনো ভিআইপি সাবস্ক্রিপশন চালু নেই। ০ টাকা অগ্রিমে ফুল ক্যাশ অন ডেলিভারিতে যেকোনো পণ্য অর্ডার করতে এখনই DEEP SHOP VIP পাস নিন।
                </p>
              </div>
              <button
                onClick={() => navigate("/subscription")}
                className="px-6 py-2.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-xs shadow-md transition-all hover:scale-105"
              >
                ভিআইপি প্ল্যান দেখুন
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((sub) => {
                const now = Date.now();
                const isExpired = sub.status === "approved" && sub.expiryDate && sub.expiryDate < now;
                const daysRemaining = sub.expiryDate
                  ? Math.max(0, Math.ceil((sub.expiryDate - now) / (1000 * 60 * 60 * 24)))
                  : 0;

                const requestedDateStr = sub.requestedAt
                  ? new Date(sub.requestedAt).toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" })
                  : "N/A";
                const startDateStr = sub.startDate
                  ? new Date(sub.startDate).toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" })
                  : "N/A";
                const expiryDateStr = sub.expiryDate
                  ? new Date(sub.expiryDate).toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" })
                  : "N/A";

                return (
                  <div
                    key={sub.id}
                    className="bg-white dark:bg-zinc-900 p-5 rounded-[28px] border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all overflow-hidden"
                  >
                    {/* Top Header Row */}
                    <div className="flex items-start justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          <span>DEEP SHOP VIP &bull; {sub.durationDays} দিন</span>
                        </span>
                        <h3 className="font-black text-base sm:text-lg text-zinc-900 dark:text-white mt-0.5">
                          {sub.planName}
                        </h3>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                          isExpired
                            ? "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
                            : sub.status === "approved"
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
                            : sub.status === "pending"
                            ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900"
                            : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
                        }`}
                      >
                        {isExpired
                          ? "মেয়াদ শেষ"
                          : sub.status === "approved"
                          ? "👑 সক্রিয় VIP"
                          : sub.status === "pending"
                          ? "⏳ অপেক্ষমাণ"
                          : "❌ বাতিলকৃত"}
                      </span>
                    </div>

                    {/* Status & Timing Banner */}
                    {sub.status === "approved" && !isExpired ? (
                      <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-xs space-y-2">
                        <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-bold">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>ভিআইপি মেম্বারশিপ সক্রিয় আছে</span>
                          </span>
                          <span className="text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded-full font-black">
                            অবশিষ্ট {daysRemaining} দিন
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-600 dark:text-zinc-400 pt-1 border-t border-emerald-200/40 dark:border-emerald-800/40">
                          <div>
                            <span className="text-zinc-400 block">শুরুর তারিখ:</span>
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">{startDateStr}</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 block">মেয়াদ শেষের তারিখ:</span>
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">{expiryDateStr}</span>
                          </div>
                        </div>
                      </div>
                    ) : sub.status === "pending" ? (
                      <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold">
                          <Clock className="w-4 h-4 text-amber-500 animate-spin" />
                          <span>আবেদন ভেরিফিকেশন চলছে</span>
                        </div>
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          আপনার ট্রানজেকশন আইডি (<span className="font-mono font-bold">{sub.trxId}</span>) অ্যাডমিন প্যানেলে যাচাই করা হচ্ছে। সাধারণত ১-৭ ঘণ্টার মধ্যে সাবস্ক্রিপশনটি সক্রিয় করে দেওয়া হয়।
                        </p>
                      </div>
                    ) : sub.status === "rejected" ? (
                      <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 font-bold">
                          <AlertTriangle className="w-4 h-4 text-rose-500" />
                          <span>আবেদনটি বাতিল করা হয়েছে</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-rose-200/50 dark:border-rose-900/30 space-y-0.5">
                          <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider block">
                            বাতিলের কারণ (Admin Reason):
                          </span>
                          <p className="font-bold text-zinc-800 dark:text-zinc-200 text-xs leading-snug">
                            {sub.rejectionReason || sub.notes || "পেমেন্ট তথ্য বা TrxID মিল পাওয়া যায়নি।"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 text-xs space-y-2">
                        <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300 font-bold">
                          <span>মেয়াদ উত্তীর্ণ হয়েছে</span>
                          <button
                            onClick={() => navigate("/subscription")}
                            className="px-3 py-1 rounded-full bg-amber-500 text-zinc-950 font-bold text-[11px] hover:bg-amber-600 transition-all flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>রিনিউ করুন</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Payment Details Footer */}
                    <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80 text-xs space-y-1.5">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div>
                          <span className="text-[10px] text-zinc-400 font-medium block">পেমেন্ট মেথড</span>
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">{sub.paymentMethod}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 font-medium block">সেন্ডার নম্বর</span>
                          <span className="font-bold font-mono text-zinc-800 dark:text-zinc-200">{sub.senderNumber || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 font-medium block">TrxID</span>
                          <span className="font-black font-mono text-amber-600 dark:text-amber-400">{sub.trxId}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50 text-[11px] text-zinc-500">
                        <span>আবেদনের সময়: {requestedDateStr}</span>
                        <span className="font-black text-zinc-900 dark:text-white text-xs">
                          ৳{sub.price?.toLocaleString("en-BD")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        loading ? (
          <div className="space-y-4">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="bg-zinc-50 dark:bg-zinc-800 p-4 pr-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-between mb-4"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-zinc-200/50 dark:bg-zinc-700/50 rounded-full animate-pulse"></div>
                    <div>
                      <div className="h-2 w-16 bg-zinc-200/50 dark:bg-zinc-700/50 rounded mb-1.5 animate-pulse"></div>
                      <div className="h-4 w-24 bg-zinc-200/50 dark:bg-zinc-700/50 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div className="h-4 w-12 bg-zinc-200/50 dark:bg-zinc-700/50 rounded animate-pulse"></div>
                </div>
              ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-40 flex flex-col items-center">
            {illustrations.emptyOrders ? (
              <div className="w-48 h-48 mx-auto mb-6 rounded-[20px] overflow-hidden">
                 <img src={illustrations.emptyOrders} alt="No Orders" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800 rounded-full border border-zinc-100 dark:border-zinc-800 flex items-center justify-center mb-6">
                <Icon name="shopping-bag" className="text-lg text-zinc-300" />
              </div>
            )}
            <p className="text-[11px] font-bold text-zinc-400  tracking-normal mb-8">
              No order history found
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-8 py-3.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-[10px] font-bold  tracking-normal shadow-md hover:bg-zinc-800 transition-all"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const isBorder = Boolean(
                order.isBorderOffer ||
                order.productClassification?.toLowerCase().includes("border") ||
                order.items?.some((i: any) => i.isBorderOffer || i.productType === 'border_offer')
              );
              const firstItem = order.items[0];

              return (
                <motion.div
                  whileTap={{ scale: 0.99 }}
                  key={order.id}
                  className={`bg-white dark:bg-zinc-900 p-5 rounded-[24px] border shadow-sm cursor-pointer transition-all ${
                    isBorder
                      ? "border-amber-500/50 dark:border-amber-500/40 bg-gradient-to-b from-amber-500/[0.03] to-transparent"
                      : "border-zinc-100 dark:border-zinc-800"
                  }`}
                >
                  {/* Distinct Border Offer Header */}
                  {isBorder && (
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-amber-500/20">
                      <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/30">
                        <Zap className="w-3.5 h-3.5 fill-amber-500 stroke-none" />
                        <span>বর্ডার স্টক অফার অর্ডার (Border Offer)</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-4" onClick={() => navigate(`/track-order/${order.id}`)}>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-800 overflow-hidden shrink-0 border border-zinc-100 dark:border-zinc-800 p-2">
                         <img src={firstItem?.image} alt="" className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-base sm:text-lg mb-0.5 tracking-tight line-clamp-1">{firstItem?.name || "Item"}</h4>
                        <p className="text-zinc-500 font-medium text-xs">
                          {formatPrice(order.total)} <span className="mx-1 text-zinc-300">|</span> {order.items.reduce((acc, item) => acc + item.quantity, 0)} Items
                        </p>
                        {order.advanceAmount > 0 && (
                          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                            এডভান্স পরিশোধিত: {formatPrice(order.advanceAmount)} {Math.max(0, order.total - order.advanceAmount) > 0 ? `| বাকি: ${formatPrice(Math.max(0, order.total - order.advanceAmount))}` : "| সম্পূর্ণ পেইড"}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-zinc-400">#{order.id.slice(0, 6).toUpperCase()}</span>
                  </div>

                  {/* Border Offer Dedicated Specs & Address Section */}
                  {isBorder && (
                    <div className="my-3 p-3 bg-amber-500/[0.06] border border-amber-500/20 rounded-2xl space-y-2 text-xs">
                      <div className="flex flex-wrap gap-1.5">
                        {firstItem?.storage && (
                          <span className="inline-flex items-center gap-1 bg-white/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 text-[10px] font-semibold px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                            <Smartphone className="w-3 h-3 text-amber-500" />
                            <span>{firstItem.storage}</span>
                          </span>
                        )}
                        {firstItem?.condition && (
                          <span className="inline-flex items-center gap-1 bg-white/80 dark:bg-zinc-800/80 text-amber-700 dark:text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded-lg border border-amber-500/30">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>{firstItem.condition}</span>
                          </span>
                        )}
                        {firstItem?.warranty && (
                          <span className="inline-flex items-center gap-1 bg-white/80 dark:bg-zinc-800/80 text-blue-700 dark:text-blue-300 text-[10px] font-semibold px-2 py-0.5 rounded-lg border border-blue-500/30">
                            <ShieldCheck className="w-3 h-3 text-blue-500" />
                            <span>{firstItem.warranty}</span>
                          </span>
                        )}
                      </div>

                      {order.shippingAddress && (
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 pt-1 border-t border-amber-500/15">
                          <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                          <span className="truncate">ডেলিভারি ঠিকানা: {order.shippingAddress}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-end mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800" onClick={() => navigate(`/track-order/${order.id}`)}>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-zinc-400">অর্ডার স্ট্যাটাস:</span>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800">{order.status}</span>
                    </div>
                    {order.status === OrderStatus.CANCELLED && (order as any).rejectReason && (
                      <p className="text-[10px] font-bold text-rose-500 max-w-[200px] text-right truncate" title={(order as any).rejectReason}>Reason: {(order as any).rejectReason}</p>
                    )}
                  </div>

                  {order.status === OrderStatus.SHIPPED_IN_COURIER ? (
                    <div className="flex flex-col gap-3">
                      {order.courierName && order.riderNumber && order.courierPaymentStatus === 'completed' ? (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 bg-white dark:bg-emerald-950 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/50 shadow-sm text-center">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 block mb-1">Courier Name</span>
                              <span className="text-sm font-black text-emerald-900 dark:text-emerald-100">{order.courierName}</span>
                            </div>
                            <div className="flex-1 bg-white dark:bg-emerald-950 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/50 shadow-sm text-center">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 block mb-1">Rider Number</span>
                              <span className="text-sm font-black text-emerald-900 dark:text-emerald-100">{order.riderNumber}</span>
                            </div>
                          </div>
                          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 text-center mt-1">
                            Please pay the remaining amount of ৳{Math.max(0, order.total - (order.paymentOption === "Full Payment" ? order.total : (order.advanceAmount !== undefined && order.advanceAmount !== null ? order.advanceAmount : 150)) - (order.courierPaymentDetails?.amount || Math.round(Math.max(0, order.total - (order.paymentOption === "Full Payment" ? order.total : (order.advanceAmount !== undefined && order.advanceAmount !== null ? order.advanceAmount : 150))) * 0.20)))} Tk to the courier.
                          </p>
                        </div>
                      ) : order.courierPaymentStatus === 'checking' ? (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center justify-center gap-2">
                          <Icon name="clock" className="w-5 h-5 text-amber-500" />
                          <span className="text-sm font-bold text-amber-800 dark:text-amber-300">Payment Checking</span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 w-full bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                          <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300 text-center">
                            Due থেকে ২০% পে করে কুরিয়ারের নাম এবং ডেলিভারি ম্যানের নাম্বার নিন।
                          </p>
                          <div className="flex gap-2 w-full">
                            <button 
                              onClick={(e) => { e.stopPropagation(); navigate(`/payment/${order.id}`) }}
                              className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 transition-colors shadow-md rounded-xl font-bold text-[11px] px-2 text-center leading-tight"
                            >
                              <Icon name="lock" className="w-4 h-4 mb-0.5" />
                              কুরিয়ার নাম দেখুন
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); navigate(`/payment/${order.id}`) }}
                              className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 transition-colors shadow-md rounded-xl font-bold text-[11px] px-2 text-center leading-tight"
                            >
                              <Icon name="lock" className="w-4 h-4 mb-0.5" />
                              ডেলিভারি ম্যানের নাম্বার দেখুন
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/e-receipt/${order.id}`) }}
                          className="flex-1 py-3 bg-transparent border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors rounded-full font-bold text-zinc-900 dark:text-zinc-100 text-sm"
                        >
                          Invoice
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/track-order/${order.id}`) }}
                          className="flex-[1.5] py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-md rounded-full font-bold text-sm"
                        >
                          Track Order
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/e-receipt/${order.id}`) }}
                        className="flex-1 py-3.5 bg-transparent border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors rounded-full font-bold text-zinc-900 dark:text-zinc-100 text-sm"
                      >
                        Invoice
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/track-order/${order.id}`) }}
                        className="flex-[1.5] py-3.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-md rounded-full font-bold text-sm"
                      >
                        Track Order
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

export default MyOrders;
