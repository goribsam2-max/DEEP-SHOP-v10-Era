import React, { useState, useEffect, useMemo } from "react";
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
import { useNotify, useConfirm } from "../components/Notifications";
import { useIllustrations } from "../lib/useIllustrations";
import Icon from "../components/Icon";
import {
  Zap,
  Smartphone,
  Sparkles,
  ShieldCheck,
  MapPin,
  Crown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Truck,
  Store,
  Calendar,
  FileText,
  ExternalLink,
  Copy,
  X,
  Package,
  CreditCard,
  Phone,
  Lock,
} from "lucide-react";
import { SubscriptionRecord } from "../services/subscription";

type OrderTab = "Pending" | "Active" | "Subscription" | "Cancelled";
type QuickFilter = "all" | "cod" | "advance" | "border" | "delivered";

const EmptyOrdersGraphic: React.FC<{ customImage?: string }> = ({ customImage }) => {
  if (customImage) {
    return (
      <div className="w-40 h-40 mx-auto mb-5 rounded-[24px] overflow-hidden">
        <img src={customImage} alt="No orders found" className="w-full h-full object-contain" />
      </div>
    );
  }

  return (
    <div className="relative w-44 h-36 mx-auto mb-4 flex items-center justify-center select-none">
      <svg viewBox="0 0 200 165" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Sparkles */}
        <path
          d="M156 54L159.5 63.5L169 67L159.5 70.5L156 80L152.5 70.5L143 67L152.5 63.5L156 54Z"
          fill="#FACC15"
        />
        <path
          d="M52 108L54 113.5L59.5 115.5L54 117.5L52 123L50 117.5L44.5 115.5L50 113.5L52 108Z"
          fill="#38BDF8"
        />
        {/* Soft shadow */}
        <ellipse cx="100" cy="142" rx="54" ry="10" fill="#E5E7EB" className="dark:opacity-20" />
        {/* Playful legs diving into book/box matching IMG_5387 */}
        <path
          d="M78 36L83 78L98 78L94 42L78 36Z"
          fill="#F1F5F9"
          stroke="#CBD5E1"
          strokeWidth="1.5"
        />
        <path
          d="M74 26C74 23.5 77 22 80 23L89 27L86 38L74 35V26Z"
          fill="#0D6EFD"
        />
        <path
          d="M95 56L114 42L128 74L109 84L95 56Z"
          fill="#FFFFFF"
          stroke="#CBD5E1"
          strokeWidth="1.5"
        />
        {/* 3D Isometric Blue Book / Parcel Box */}
        <path
          d="M54 88L104 68L148 88L98 110L54 88Z"
          fill="#0D6EFD"
        />
        <ellipse cx="101" cy="86" rx="22" ry="9" fill="#084298" />
        <path
          d="M54 88L98 110V128L54 106V88Z"
          fill="#0B5ED7"
        />
        <path
          d="M98 110L148 88V106L98 128V110Z"
          fill="#EFF6FF"
          stroke="#0D6EFD"
          strokeWidth="2"
        />
        <line x1="103" y1="113" x2="143" y2="95" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
        <line x1="103" y1="119" x2="143" y2="101" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
};

const getStatusDotColor = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s.includes("deliver") && !s.includes("on")) return "bg-emerald-500";
  if (s.includes("cancel") || s.includes("return")) return "bg-rose-500";
  if (s.includes("ship") || s.includes("way") || s.includes("courier")) return "bg-blue-500";
  if (s.includes("approv") || s.includes("process") || s.includes("pack")) return "bg-indigo-500";
  return "bg-slate-600 dark:bg-slate-300";
};

const safeTimestampMillis = (ts: any): number => {
  if (!ts) return 0;
  if (typeof ts === "number") return Number.isFinite(ts) ? ts : 0;
  if (ts instanceof Date) {
    const t = ts.getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  if (typeof ts?.toMillis === "function") {
    const t = ts.toMillis();
    return Number.isFinite(t) ? t : 0;
  }
  if (typeof ts?.toDate === "function") {
    const d = ts.toDate();
    const t = d instanceof Date ? d.getTime() : NaN;
    return Number.isNaN(t) ? 0 : t;
  }
  if (typeof ts === "object" && typeof ts.seconds === "number") {
    return ts.seconds * 1000 + Math.floor((ts.nanoseconds || 0) / 1e6);
  }
  if (typeof ts === "string") {
    const parsed = new Date(ts).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const formatOrderCardDate = (timestamp?: any) => {
  const ms = safeTimestampMillis(timestamp);
  if (!ms) return "Recent order";
  return new Date(ms).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const formatAddressLine = (addr: any): string => {
  if (!addr) return "";
  if (typeof addr === "string") return addr;
  return [addr.address, addr.upazila, addr.district || addr.city, addr.division]
    .filter(Boolean)
    .join(", ");
};

const MyOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [activeTab, setActiveTab] = useState<OrderTab>("Pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [mobileDetailOrder, setMobileDetailOrder] = useState<Order | null>(null);

  const navigate = useNavigate();
  const illustrations = useIllustrations();
  const notify = useNotify();
  const confirm = useConfirm();

  useEffect(() => {
    let unsubscribeOrders: (() => void) | null = null;
    let unsubscribeSubs: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      const searchParams = new URLSearchParams(window.location.search);
      const pendingOrderId =
        searchParams.get("guestOrder") || localStorage.getItem("pending_guest_order_id");

      if (!user) {
        navigate(
          `/auth-selector?redirect=/my-orders${
            pendingOrderId ? `&guestOrder=${pendingOrderId}` : ""
          }`
        );
        return;
      }

      if (pendingOrderId && user.uid) {
        try {
          const ordRef = doc(db, "orders", pendingOrderId);
          await updateDoc(ordRef, {
            userId: user.uid,
            customerEmail: user.email || "",
          });
          localStorage.removeItem("pending_guest_order_id");
          localStorage.removeItem("pending_guest_order_phone");
          notify("আপনার অর্ডারটি অ্যাকাউন্টে যুক্ত করা হয়েছে!", "success");
        } catch (err) {
          console.error("Order linking error:", err);
        }
      }

      const uid = user.uid;
      const q = query(collection(db, "orders"), where("userId", "==", uid));
      unsubscribeOrders = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Order
        );
        data.sort(
          (a, b) => safeTimestampMillis(b.createdAt) - safeTimestampMillis(a.createdAt)
        );
        setOrders(data);
        setLoading(false);
      });

      const subQ = query(collection(db, "subscriptions"), where("userId", "==", uid));
      unsubscribeSubs = onSnapshot(subQ, (snapshot) => {
        const list: SubscriptionRecord[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) });
        });
        list.sort(
          (a, b) => safeTimestampMillis(b.requestedAt) - safeTimestampMillis(a.requestedAt)
        );
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

  // Keep selectedOrder synced with live Firestore updates
  useEffect(() => {
    if (selectedOrder) {
      const updated = orders.find((o) => o.id === selectedOrder.id);
      if (updated) setSelectedOrder(updated);
    }
    if (mobileDetailOrder) {
      const updatedMob = orders.find((o) => o.id === mobileDetailOrder.id);
      if (updatedMob) setMobileDetailOrder(updatedMob);
    }
  }, [orders]);

  const isCancelable = (order: Order) => {
    if (order.status !== OrderStatus.PENDING && order.status !== "Pending") return false;
    const createdMs = safeTimestampMillis(order.createdAt);
    if (!createdMs) return false;
    const minutesPassed = (currentTime - createdMs) / (1000 * 60);
    return minutesPassed <= 5;
  };

  const handleCancelOrder = async (orderId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const ok = await confirm({
      title: "Cancel Order?",
      message: "Are you sure you want to cancel this pending order?",
      confirmText: "Yes",
      cancelText: "No",
    });
    if (!ok) return;

    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: OrderStatus.CANCELLED,
      });
      notify("Order has been cancelled.", "info");
      setMobileDetailOrder(null);
    } catch {
      notify("Failed to cancel order.", "error");
    }
  };

  const tabCounts = useMemo(() => {
    const pending = orders.filter(
      (o) => o.status === OrderStatus.PENDING || o.status === "Pending"
    ).length;
    const cancelled = orders.filter(
      (o) =>
        o.status === OrderStatus.CANCELLED ||
        o.status === OrderStatus.RETURNED ||
        o.status === "Cancelled"
    ).length;
    const active = orders.filter(
      (o) =>
        o.status !== OrderStatus.PENDING &&
        o.status !== "Pending" &&
        o.status !== OrderStatus.CANCELLED &&
        o.status !== OrderStatus.RETURNED &&
        o.status !== "Cancelled"
    ).length;
    return {
      Pending: pending,
      Active: active,
      Subscription: subscriptions.length,
      Cancelled: cancelled,
    };
  }, [orders, subscriptions]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Tab match
      if (activeTab === "Pending") {
        if (order.status !== OrderStatus.PENDING && order.status !== "Pending") return false;
      } else if (activeTab === "Active") {
        if (
          order.status === OrderStatus.PENDING ||
          order.status === "Pending" ||
          order.status === OrderStatus.CANCELLED ||
          order.status === OrderStatus.RETURNED ||
          order.status === "Cancelled"
        ) {
          return false;
        }
      } else if (activeTab === "Cancelled") {
        if (
          order.status !== OrderStatus.CANCELLED &&
          order.status !== OrderStatus.RETURNED &&
          order.status !== "Cancelled"
        ) {
          return false;
        }
      }

      // 2. Quick filter match
      if (quickFilter === "cod") {
        const pm = (order.paymentMethod || "").toLowerCase();
        if (!pm.includes("cod") && !pm.includes("cash")) return false;
      } else if (quickFilter === "advance") {
        if (!order.advanceAmount || order.advanceAmount <= 0) return false;
      } else if (quickFilter === "border") {
        const isBorder = Boolean(
          order.isBorderOffer ||
            order.productClassification?.toLowerCase().includes("border") ||
            order.items?.some((i: any) => i.isBorderOffer || i.productType === "border_offer")
        );
        if (!isBorder) return false;
      } else if (quickFilter === "delivered") {
        if (order.status !== OrderStatus.DELIVERED && order.status !== "Delivered") return false;
      }

      // 3. Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = order.id?.toLowerCase().includes(q);
        const itemMatch = order.items?.some((it: any) =>
          (it.name || "").toLowerCase().includes(q)
        );
        const sellerMatch = (
          (order as any).sellerName ||
          (order.items?.[0] as any)?.sellerName ||
          "deep shop"
        )
          .toLowerCase()
          .includes(q);
        const statusMatch = String(order.status || "").toLowerCase().includes(q);
        if (!idMatch && !itemMatch && !sellerMatch && !statusMatch) return false;
      }

      return true;
    });
  }, [orders, activeTab, quickFilter, searchQuery]);

  // Auto-select first order on desktop when switching tabs
  useEffect(() => {
    if (activeTab === "Subscription") {
      setSelectedOrder(null);
      return;
    }
    if (filteredOrders.length > 0) {
      if (!selectedOrder || !filteredOrders.some((o) => o.id === selectedOrder.id)) {
        setSelectedOrder(filteredOrders[0]);
      }
    } else {
      setSelectedOrder(null);
    }
  }, [activeTab, filteredOrders.length]);

  const totalSpent = useMemo(
    () =>
      orders
        .filter((o) => o.status !== OrderStatus.CANCELLED && o.status !== "Cancelled")
        .reduce((acc, o) => acc + Number(o.total || 0), 0),
    [orders]
  );

  const tabs: { id: OrderTab; label: string; count: number }[] = [
    { id: "Pending", label: "অপেক্ষমাণ", count: tabCounts.Pending },
    { id: "Active", label: "সক্রিয়", count: tabCounts.Active },
    { id: "Subscription", label: "সাবস্ক্রিপশন (VIP)", count: tabCounts.Subscription },
    { id: "Cancelled", label: "বাতিলকৃত", count: tabCounts.Cancelled },
  ];

  const handleOpenOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileDetailOrder(order);
    }
  };

  const renderOrderInspectorContent = (order: Order, isMobileSheet = false) => {
    const isBorder = Boolean(
      order.isBorderOffer ||
        order.productClassification?.toLowerCase().includes("border") ||
        order.items?.some((i: any) => i.isBorderOffer || i.productType === "border_offer")
    );
    const addressStr = formatAddressLine(order.shippingAddress);
    const totalItems = order.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 1;
    const paidAdv = Number(order.advanceAmount || (order as any).advancePaid || 0);
    const dueAmt = Math.max(
      0,
      order.paymentOption === "Full Payment" ? 0 : Number(order.total || 0) - paidAdv
    );

    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
              Order Summary
            </span>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white mt-0.5">
              #{order.id.slice(0, 10).toUpperCase()}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {formatOrderCardDate(order.createdAt)} &bull; {totalItems}{" "}
              {totalItems === 1 ? "item" : "items"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(order.id);
                notify("Order ID copied!", "success");
              }}
              className="px-2.5 py-1.5 rounded-full orders-v2-status-pill text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>Copy ID</span>
            </button>
            {isMobileSheet && (
              <button
                type="button"
                onClick={() => setMobileDetailOrder(null)}
                className="w-8 h-8 rounded-full orders-v2-status-pill flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Status & Payment Strip */}
        <div className="orders-v2-seller-box rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Status</span>
            <span className="orders-v2-status-pill px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(String(order.status))}`} />
              {order.status}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Total Amount</span>
            <span className="text-sm font-extrabold text-zinc-900 dark:text-white">
              {formatPrice(order.total)}
            </span>
          </div>
          {paidAdv > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 dark:text-zinc-400">Advance Paid</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatPrice(paidAdv)} {dueAmt > 0 ? `(Due: ${formatPrice(dueAmt)})` : "(Fully Paid)"}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">Payment Method</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {order.paymentMethod || "Home Delivery"}
            </span>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
          {order.items?.map((item: any, idx: number) => (
            <div
              key={`${item.productId || item.id || idx}`}
              onClick={() => {
                if (item.productId || item.id) {
                  navigate(`/product/${item.productId || item.id}`);
                }
              }}
              className="flex items-center gap-3 p-2.5 rounded-2xl orders-v2-seller-box cursor-pointer hover:opacity-90 transition"
            >
              <div className="w-12 h-14 rounded-xl bg-white dark:bg-zinc-800 overflow-hidden border border-black/5 shrink-0">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-zinc-900 dark:text-white line-clamp-1">
                  {item.name}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Qty: {item.quantity || 1}
                  {item.size ? ` • ${item.size}` : ""}
                  {item.storage ? ` • ${item.storage}` : ""}
                </p>
              </div>
              <span className="text-xs font-bold text-zinc-900 dark:text-white shrink-0">
                {formatPrice((item.price || item.priceAtPurchase || 0) * (item.quantity || 1))}
              </span>
            </div>
          ))}
        </div>

        {/* Border Offer / Delivery Info */}
        {(isBorder || addressStr) && (
          <div className="orders-v2-seller-box rounded-2xl p-3.5 space-y-2 text-xs">
            {isBorder && (
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                <Zap className="w-3.5 h-3.5" />
                <span>Border Stock Offer Order</span>
              </div>
            )}
            {addressStr && (
              <div className="flex items-start gap-2 text-zinc-600 dark:text-zinc-300">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-zinc-400" />
                <span className="leading-snug">{addressStr}</span>
              </div>
            )}
            {order.contactNumber && (
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                <Phone className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                <span className="font-mono">{order.contactNumber}</span>
              </div>
            )}
          </div>
        )}

        {/* Rejection Reason if Cancelled */}
        {order.status === OrderStatus.CANCELLED && (order as any).rejectReason && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300">
            <span className="font-bold block mb-0.5">Cancellation Reason:</span>
            {(order as any).rejectReason}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-1 space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => navigate(`/e-receipt/${order.id}`)}
              className="py-2.5 px-4 rounded-full orders-v2-status-pill font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90 transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Invoice</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/track-order/${order.id}`)}
              className="py-2.5 px-4 rounded-full orders-v2-btn-explore font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-95 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Track Order</span>
            </button>
          </div>

          {isCancelable(order) && (
            <button
              type="button"
              onClick={(e) => handleCancelOrder(order.id, e)}
              className="w-full py-2.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/70 dark:border-rose-900/50 font-semibold text-xs cursor-pointer hover:bg-rose-100 transition"
            >
              Cancel Order (Available within 5 mins)
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderSubscriptionSection = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
            <Crown className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
              DEEP SHOP VIP সাবস্ক্রিপশন
            </h2>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              ০ টাকা অগ্রিমে ক্যাশ অন ডেলিভারি সুবিধা
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/subscription")}
          className="px-3.5 py-2 rounded-full orders-v2-btn-explore font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
        >
          <Crown className="w-3.5 h-3.5" />
          <span>নতুন পাস নিন</span>
        </button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="orders-v2-card p-8 sm:p-12 rounded-[24px] text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <Crown className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-base text-zinc-900 dark:text-white">
              কোনো ভিআইপি সাবস্ক্রিপশন রেকর্ড পাওয়া যায়নি
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
              আপনার অ্যাকাউন্টে কোনো ভিআইপি সাবস্ক্রিপশন চালু নেই। ০ টাকা অগ্রিমে ফুল ক্যাশ অন ডেলিভারিতে যেকোনো পণ্য অর্ডার করতে এখনই DEEP SHOP VIP পাস নিন।
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/subscription")}
            className="px-7 py-2.5 rounded-full orders-v2-btn-explore font-semibold text-xs cursor-pointer transition-transform active:scale-95"
          >
            ভিআইপি প্ল্যান দেখুন
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {subscriptions.map((sub) => {
            const now = Date.now();
            const reqMs = safeTimestampMillis(sub.requestedAt);
            const startMs = safeTimestampMillis(sub.startDate);
            const expMs = safeTimestampMillis(sub.expiryDate);
            const isExpired =
              sub.status === "approved" && expMs > 0 && expMs < now;
            const daysRemaining = expMs
              ? Math.max(0, Math.ceil((expMs - now) / (1000 * 60 * 60 * 24)))
              : 0;

            const requestedDateStr = reqMs
              ? new Date(reqMs).toLocaleDateString("bn-BD", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "N/A";
            const startDateStr = startMs
              ? new Date(startMs).toLocaleDateString("bn-BD", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "N/A";
            const expiryDateStr = expMs
              ? new Date(expMs).toLocaleDateString("bn-BD", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "N/A";

            return (
              <div
                key={sub.id}
                className="orders-v2-card p-5 rounded-[24px] space-y-4 overflow-hidden"
              >
                <div className="flex items-start justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      <span>DEEP SHOP VIP &bull; {sub.durationDays} দিন</span>
                    </span>
                    <h3 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-white mt-0.5">
                      {sub.planName}
                    </h3>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                      isExpired
                        ? "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                        : sub.status === "approved"
                        ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                        : sub.status === "pending"
                        ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
                        : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                    }`}
                  >
                    {isExpired
                      ? "মেয়াদ শেষ"
                      : sub.status === "approved"
                      ? "সক্রিয় VIP"
                      : sub.status === "pending"
                      ? "অপেক্ষমাণ"
                      : "বাতিলকৃত"}
                  </span>
                </div>

                {sub.status === "approved" && !isExpired ? (
                  <div className="p-3.5 rounded-2xl orders-v2-seller-box text-xs space-y-2">
                    <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>ভিআইপি মেম্বারশিপ সক্রিয় আছে</span>
                      </span>
                      <span className="text-[11px] bg-emerald-500/15 px-2.5 py-0.5 rounded-full font-bold">
                        অবশিষ্ট {daysRemaining} দিন
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-600 dark:text-zinc-400 pt-1.5 border-t border-zinc-200/60 dark:border-zinc-700/50">
                      <div>
                        <span className="text-zinc-400 block">শুরুর তারিখ:</span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">
                          {startDateStr}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block">মেয়াদ শেষের তারিখ:</span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">
                          {expiryDateStr}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : sub.status === "pending" ? (
                  <div className="p-3.5 rounded-2xl orders-v2-seller-box text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>আবেদন ভেরিফিকেশন চলছে</span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      আপনার ট্রানজেকশন আইডি (
                      <span className="font-mono font-bold">{sub.trxId}</span>) যাচাই করা হচ্ছে। সাধারণত ১-৭ ঘণ্টার মধ্যে সাবস্ক্রিপশনটি সক্রিয় করে দেওয়া হয়।
                    </p>
                  </div>
                ) : sub.status === "rejected" ? (
                  <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold">
                      <AlertTriangle className="w-4 h-4" />
                      <span>আবেদনটি বাতিল করা হয়েছে</span>
                    </div>
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs leading-snug">
                      {sub.rejectionReason || sub.notes || "পেমেন্ট তথ্য বা TrxID মিল পাওয়া যায়নি।"}
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl orders-v2-seller-box text-xs flex items-center justify-between">
                    <span className="font-bold text-zinc-600 dark:text-zinc-300">
                      মেয়াদ উত্তীর্ণ হয়েছে
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate("/subscription")}
                      className="px-3 py-1 rounded-full orders-v2-btn-explore font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>রিনিউ করুন</span>
                    </button>
                  </div>
                )}

                <div className="p-3.5 rounded-2xl orders-v2-seller-box text-xs space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-zinc-400 block">পেমেন্ট মেথড</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        {sub.paymentMethod}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">সেন্ডার নম্বর</span>
                      <span className="font-bold font-mono text-zinc-800 dark:text-zinc-200">
                        {sub.senderNumber || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">TrxID</span>
                      <span className="font-bold font-mono text-amber-600 dark:text-amber-400">
                        {sub.trxId}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-700/50 text-[11px] text-zinc-500">
                    <span>আবেদনের সময়: {requestedDateStr}</span>
                    <span className="font-extrabold text-zinc-900 dark:text-white text-xs">
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
  );

  const renderOrderCard = (order: Order) => {
    const isBorder = Boolean(
      order.isBorderOffer ||
        order.productClassification?.toLowerCase().includes("border") ||
        order.items?.some((i: any) => i.isBorderOffer || i.productType === "border_offer")
    );
    const firstItem: any = order.items?.[0] || {};
    const sellerName =
      (order as any).sellerName ||
      firstItem?.sellerName ||
      firstItem?.brand ||
      "DEEP SHOP Official";
    const sellerLogo =
      (order as any).shopLogo ||
      firstItem?.shopLogo ||
      firstItem?.image ||
      "";
    const deliveryLabel =
      (order as any).courierName
        ? `${(order as any).courierName} delivery`
        : "Home delivery";
    const addressLine = formatAddressLine(order.shippingAddress);
    const isSelectedDesktop = selectedOrder?.id === order.id;

    return (
      <motion.div
        whileTap={{ scale: 0.992 }}
        key={order.id}
        onClick={() => handleOpenOrderDetail(order)}
        className={`orders-v2-card rounded-[22px] p-4 sm:p-5 transition-all cursor-pointer ${
          isSelectedDesktop
            ? "lg:ring-2 lg:ring-[#0D6EFD]/50"
            : ""
        }`}
      >
        {/* Top Row: Date + Total Price on Left, Item Cover Thumbnails on Right (IMG_5387) */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 pt-0.5">
            <p className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
              {formatOrderCardDate(order.createdAt)}
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-[17px] sm:text-[18px] font-extrabold text-zinc-900 dark:text-white tracking-tight">
                {formatPrice(order.total)}
              </span>
              <span className="text-[11px] font-semibold uppercase text-zinc-400">
                BDT
              </span>
            </div>
          </div>

          {/* Right Compact Thumbnails Row (up to 4 items like IMG_5387) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {(order.items || []).slice(0, 4).map((item: any, idx: number) => {
              const extraCount = (order.items?.length || 0) - 4;
              const showOverflow = idx === 3 && extraCount > 0;
              return (
                <div
                  key={`${order.id}-thumb-${idx}`}
                  className="relative w-10 h-13 sm:w-11 sm:h-14 rounded-[8px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-black/5 dark:border-white/10 shrink-0"
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name || "Order item"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-4 h-4 text-zinc-400" />
                    </div>
                  )}
                  {showOverflow && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-bold text-white">
                      +{extraCount}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Inner Gray Seller & Context Box (IMG_5387) */}
        <div className="orders-v2-seller-box rounded-[16px] p-3 mt-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/10 flex items-center justify-center shrink-0">
              {sellerLogo ? (
                <img
                  src={sellerLogo}
                  alt={sellerName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Store className="w-4 h-4 text-zinc-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-[13.5px] font-bold text-zinc-900 dark:text-white truncate">
                {sellerName}
              </h4>
              <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400">
                Seller
              </p>
            </div>
            {isCancelable(order) && (
              <button
                type="button"
                onClick={(e) => handleCancelOrder(order.id, e)}
                className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-semibold shrink-0 cursor-pointer hover:bg-rose-500/20 transition"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Connected Event / Border Offer / Item Timeline Node (like 2nd card in IMG_5387) */}
          {(isBorder || (firstItem?.name && (order.items?.length || 0) > 0)) && (
            <>
              <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-700 ml-5 my-1" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/10 flex items-center justify-center shrink-0">
                  {isBorder ? (
                    <Zap className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Calendar className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-zinc-900 dark:text-white truncate">
                    {firstItem?.name || "Order Package"}
                    {(order.items?.length || 0) > 1
                      ? ` + ${(order.items?.length || 1) - 1} more`
                      : ""}
                  </p>
                  <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400 truncate">
                    {isBorder
                      ? [
                          "Border Stock Offer",
                          firstItem?.storage,
                          firstItem?.condition,
                        ]
                          .filter(Boolean)
                          .join(" • ")
                      : addressLine || `#${order.id.slice(0, 8).toUpperCase()}`}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Courier 20% Unlock / Rider Info (Preserved Business Logic) */}
        {order.status === OrderStatus.SHIPPED_IN_COURIER && (
          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
            {order.courierName &&
            order.riderNumber &&
            (order as any).courierPaymentStatus === "completed" ? (
              <div className="orders-v2-seller-box rounded-2xl p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-black/5">
                    <span className="text-[10px] font-bold uppercase text-zinc-400 block">
                      Courier
                    </span>
                    <span className="text-xs font-extrabold text-zinc-900 dark:text-white">
                      {order.courierName}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-black/5">
                    <span className="text-[10px] font-bold uppercase text-zinc-400 block">
                      Rider Phone
                    </span>
                    <span className="text-xs font-extrabold font-mono text-zinc-900 dark:text-white">
                      {order.riderNumber}
                    </span>
                  </div>
                </div>
              </div>
            ) : (order as any).courierPaymentStatus === "checking" ? (
              <div className="orders-v2-seller-box rounded-2xl p-3 flex items-center justify-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
                <span>Courier 20% Payment Verification in Progress</span>
              </div>
            ) : (
              <div className="orders-v2-seller-box rounded-2xl p-3 space-y-2">
                <p className="text-[11.5px] font-semibold text-zinc-700 dark:text-zinc-300 text-center">
                  Due থেকে ২০% পে করে কুরিয়ারের নাম এবং ডেলিভারি ম্যানের নাম্বার আনলক করুন।
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/payment/${order.id}`)}
                    className="py-2 px-2.5 rounded-xl orders-v2-btn-explore text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>কুরিয়ার নাম</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/payment/${order.id}`)}
                    className="py-2 px-2.5 rounded-xl orders-v2-btn-explore text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>রাইডার নাম্বার</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Delivery Method + Status Pill Row (IMG_5387) */}
        <div className="flex items-center justify-between gap-2 mt-3.5 px-0.5">
          <div className="flex items-center gap-2 text-[12.5px] font-medium text-zinc-600 dark:text-zinc-300">
            <Truck className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
            <span>{deliveryLabel}</span>
          </div>

          <span className="orders-v2-status-pill px-2.5 py-1 rounded-full text-[11.5px] font-semibold inline-flex items-center gap-1.5 shrink-0">
            <span
              className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(
                String(order.status)
              )}`}
            />
            <span>{order.status}</span>
          </span>
        </div>

        {/* Full-Width Soft Blue "View detail" Pill CTA (IMG_5387) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (typeof window !== "undefined" && window.innerWidth >= 1024) {
              setSelectedOrder(order);
              navigate(`/track-order/${order.id}`);
            } else {
              setMobileDetailOrder(order);
            }
          }}
          className="mt-3.5 w-full py-2.5 px-4 rounded-full orders-v2-btn-soft-blue text-[13.5px] font-semibold text-center transition cursor-pointer"
        >
          View detail
        </button>
      </motion.div>
    );
  };

  return (
    <div className="orders-v2-shell min-h-screen pb-[120px] lg:pb-16">
      <div className="max-w-md lg:max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 lg:pt-8">
        {/* Top Editorial Header + Desktop Summary Strip */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-5 lg:mb-7">
          <div>
            <h1 className="font-serif text-[30px] sm:text-[34px] lg:text-[38px] font-bold tracking-tight text-zinc-900 dark:text-white leading-none">
              Orders
            </h1>
            <p className="hidden lg:block text-sm text-zinc-500 dark:text-zinc-400 mt-2">
              Track active deliveries, inspect e-receipts, and manage your VIP pass in one place.
            </p>
          </div>

          {/* Desktop-only KPI Strip */}
          <div className="hidden lg:grid grid-cols-3 gap-3 shrink-0">
            <div className="orders-v2-card rounded-2xl px-4 py-3 min-w-[140px]">
              <span className="text-[11px] font-medium text-zinc-400 block">
                Total Orders
              </span>
              <span className="text-lg font-extrabold text-zinc-900 dark:text-white mt-0.5 block">
                {orders.length}
              </span>
            </div>
            <div className="orders-v2-card rounded-2xl px-4 py-3 min-w-[140px]">
              <span className="text-[11px] font-medium text-zinc-400 block">
                In Progress
              </span>
              <span className="text-lg font-extrabold text-zinc-900 dark:text-white mt-0.5 block">
                {tabCounts.Pending + tabCounts.Active}
              </span>
            </div>
            <div className="orders-v2-card rounded-2xl px-4 py-3 min-w-[160px]">
              <span className="text-[11px] font-medium text-zinc-400 block">
                Total Value
              </span>
              <span className="text-lg font-extrabold text-zinc-900 dark:text-white mt-0.5 block">
                {formatPrice(totalSpent)}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Segmented Pill Tabs (IMG_5387 style, preserving the 4 existing tabs) */}
        <div className="lg:hidden orders-v2-track rounded-full p-1 mb-4 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 shrink-0 whitespace-nowrap py-2 px-3.5 rounded-full text-[12.5px] font-semibold transition-all cursor-pointer ${
                  active
                    ? "orders-v2-tab-active"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Mobile Search + Filter Row (IMG_5387) */}
        {activeTab !== "Subscription" && (orders.length > 0 || searchQuery || quickFilter !== "all") && (
          <div className="lg:hidden mb-5 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="orders-v2-search flex-1 h-11 rounded-[14px] px-3.5 flex items-center gap-2.5">
                <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search sellers, items, orders"
                  className="w-full text-[13.5px] outline-none border-none text-zinc-900 dark:text-white placeholder:text-zinc-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                aria-label="Filter orders"
                className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 transition cursor-pointer ${
                  showFilters || quickFilter !== "all"
                    ? "orders-v2-btn-explore"
                    : "orders-v2-search"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>

            {showFilters && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {(
                  [
                    { id: "all", label: "All orders" },
                    { id: "cod", label: "Home delivery" },
                    { id: "advance", label: "Advance paid" },
                    { id: "border", label: "Border offer" },
                    { id: "delivered", label: "Delivered" },
                  ] as { id: QuickFilter; label: string }[]
                ).map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setQuickFilter(chip.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition ${
                      quickFilter === chip.id
                        ? "orders-v2-btn-explore"
                        : "orders-v2-status-pill"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Responsive Multi-Column Desktop Workspace + Mobile Feed */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-7 items-start">
          {/* Desktop Left Sidebar Rail (Distinct Desktop Architecture) */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-24 space-y-4">
            <div className="orders-v2-card rounded-[22px] p-3 space-y-1">
              <p className="px-3 pt-1.5 pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Order Categories
              </p>
              {tabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[13.5px] font-semibold transition cursor-pointer ${
                      active
                        ? "orders-v2-btn-soft-blue"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="orders-v2-status-pill px-2 py-0.5 rounded-full text-[11px] font-bold">
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {activeTab !== "Subscription" && (
              <div className="orders-v2-card rounded-[22px] p-4 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Quick Filter
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: "all", label: "All" },
                      { id: "cod", label: "Home delivery" },
                      { id: "advance", label: "Advance paid" },
                      { id: "border", label: "Border offer" },
                      { id: "delivered", label: "Delivered" },
                    ] as { id: QuickFilter; label: string }[]
                  ).map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setQuickFilter(chip.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition ${
                        quickFilter === chip.id
                          ? "orders-v2-btn-explore"
                          : "orders-v2-status-pill"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="orders-v2-card rounded-[22px] p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
                <Crown className="w-4 h-4" />
                <span>DEEP SHOP VIP Pass</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Unlock zero-advance Cash on Delivery across eligible store items.
              </p>
              <button
                type="button"
                onClick={() => navigate("/subscription")}
                className="w-full py-2 rounded-full orders-v2-btn-soft-blue text-xs font-semibold cursor-pointer"
              >
                Explore VIP Plans
              </button>
            </div>
          </aside>

          {/* Center Main Content */}
          <div
            className={
              activeTab === "Subscription" || filteredOrders.length === 0
                ? "lg:col-span-9"
                : selectedOrder
                ? "lg:col-span-5"
                : "lg:col-span-9"
            }
          >
            {/* Desktop Search Bar */}
            {activeTab !== "Subscription" && (
              <div className="hidden lg:flex items-center gap-3 mb-4">
                <div className="orders-v2-search flex-1 h-11 rounded-[14px] px-4 flex items-center gap-3">
                  <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search sellers, products, or order ID..."
                    className="w-full text-sm outline-none border-none text-zinc-900 dark:text-white placeholder:text-zinc-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeTab === "Subscription" ? (
              renderSubscriptionSection()
            ) : loading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="orders-v2-card rounded-[22px] p-5 space-y-4"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="h-3 w-24 rounded-full ds-skeleton" />
                        <div className="h-5 w-32 rounded-full ds-skeleton" />
                      </div>
                      <div className="flex gap-1.5">
                        <div className="w-10 h-13 rounded-lg ds-skeleton" />
                        <div className="w-10 h-13 rounded-lg ds-skeleton" />
                      </div>
                    </div>
                    <div className="h-16 rounded-2xl ds-skeleton" />
                    <div className="h-10 rounded-full ds-skeleton" />
                  </div>
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              /* Empty State matching IMG_5387 Left Screen */
              <div className="py-16 sm:py-24 flex flex-col items-center justify-center text-center px-4">
                <EmptyOrdersGraphic customImage={illustrations.emptyOrders} />
                <h2 className="text-[18px] font-bold text-zinc-900 dark:text-white tracking-tight">
                  No orders found
                </h2>
                <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1 mb-6 max-w-[240px]">
                  {searchQuery || quickFilter !== "all"
                    ? "Try clearing your search or filter criteria"
                    : "Browse featured products or verified stores"}
                </p>
                {searchQuery || quickFilter !== "all" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setQuickFilter("all");
                    }}
                    className="orders-v2-btn-explore px-8 py-3 rounded-full text-[14px] font-semibold cursor-pointer transition-transform active:scale-95"
                  >
                    Reset filters
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="orders-v2-btn-explore px-9 py-3 rounded-full text-[14px] font-semibold cursor-pointer transition-transform active:scale-95"
                  >
                    Explore
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => renderOrderCard(order))}
              </div>
            )}
          </div>

          {/* Desktop Right Sticky Order Inspector Panel */}
          {activeTab !== "Subscription" && selectedOrder && filteredOrders.length > 0 && (
            <aside className="hidden lg:block lg:col-span-4 sticky top-24">
              <div className="orders-v2-card rounded-[24px] p-5">
                {renderOrderInspectorContent(selectedOrder, false)}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Mobile Order Detail Sheet when tapping "View detail" */}
      <AnimatePresence>
        {mobileDetailOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileDetailOrder(null)}
            className="lg:hidden fixed inset-0 z-[1000] bg-black/50 backdrop-blur-xs flex items-end justify-center"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="orders-v2-shell w-full max-w-lg rounded-t-[28px] p-5 pb-8 max-h-[88vh] overflow-y-auto shadow-2xl border-t border-zinc-200/70 dark:border-zinc-800"
            >
              <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mb-4" />
              {renderOrderInspectorContent(mobileDetailOrder, true)}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyOrders;
