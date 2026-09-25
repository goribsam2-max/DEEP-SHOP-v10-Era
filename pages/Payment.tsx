import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, addDoc, collection, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { auth, db } from "../firebase";
import { 
  Copy, 
  Check, 
  ArrowLeft, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Headphones, 
  Globe, 
  Clock, 
  Sparkles,
  Smartphone,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useNotify } from "../components/Notifications";
import { formatPrice, isForbiddenNumber } from "@/lib/utils";
import { sendOrderToTelegram } from "../services/telegram";
import { OrderStatus } from "../types";

// High-fidelity bKash Logo SVG
const BkashLogo: React.FC<{ className?: string }> = ({ className = "h-8" }) => (
  <svg viewBox="0 0 200 70" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M72.4 46.5H57.7V17h14.7c6.2 0 10.5 4 10.5 14.7s-4.3 14.8-10.5 14.8zm-9.3-5.4h9.3c3 0 5-2.2 5-9.4s-2-9.4-5-9.4h-9.3v18.8z" fill="#E2125B" />
    <path d="M86.8 46.5V17h5.4v16.7l13.6-16.7h6.8l-12.8 15.3 13.7 14.2h-7.1l-10.6-11.4-3.6 4.3v7.1h-5.4z" fill="#E2125B" />
    <path d="M125.7 46.5l-1.3-4.5h-10.6l-1.3 4.5h-5.6l9.6-29.5h5.4l9.5 29.5h-5.7zm-6.6-22.3l-4 13.4h7.9l-3.9-13.4z" fill="#E2125B" />
    <path d="M149.9 27.8c-2.3-1.2-5-1.9-7.5-1.9-4.2 0-6.9 2.1-6.9 5.3 0 3.1 2.3 4.6 6.3 5.4l3.5.7c5.8 1.2 8.7 4.1 8.7 9.1 0 6.4-5.3 10.6-12.6 10.6-3.8 0-7.3-1-10.2-2.9l2.4-4.5c2.3 1.5 5.5 2.5 8 2.5 4.3 0 7.2-2.1 7.2-5.4 0-3.3-2.4-4.7-6.5-5.5l-3.3-.7c-5.7-1.1-8.5-4.2-8.5-8.9 0-6.4 5.3-10.3 12.1-10.3 3.4 0 6.6.8 9 2.1l-1.7 4.4z" fill="#E2125B" />
    <path d="M172.9 46.5V33.4c0-4-2.5-6.5-6.5-6.5-3.8 0-6.5 2.5-6.5 6.5v13.1h-5.4V17h5.4v10.5c1.8-2.6 4.6-4.1 8-4.1 6.5 0 10.4 4.5 10.4 10.8v12.3h-5.4z" fill="#E2125B" />
    {/* Iconic Origami Bird Symbol */}
    <g transform="translate(10, 10)">
      <polygon points="12,32 30,12 24,38" fill="#E2125B" />
      <polygon points="30,12 42,28 24,38" fill="#D12053" />
      <polygon points="30,12 46,14 42,28" fill="#C2185B" />
      <polygon points="12,32 6,24 24,38" fill="#E91E63" />
    </g>
  </svg>
);

// High-fidelity Nagad Logo SVG
const NagadLogo: React.FC<{ className?: string }> = ({ className = "h-8" }) => (
  <svg viewBox="0 0 160 55" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g transform="translate(6, 6)">
      {/* Nagad Swirl/Flame icon */}
      <circle cx="21" cy="21" r="19" fill="#F57C20" opacity="0.1" />
      <path d="M12 28C14 20 22 13 28 10C24 16 28 22 32 24C30 30 24 34 18 34C14 34 12 31 12 28Z" fill="#F57C20" />
      <path d="M19 14C23 18 25 24 22 28C26 25 28 19 25 15C23 13 21 13 19 14Z" fill="#ED1C24" />
    </g>
    <text x="56" y="36" fontFamily="sans-serif" fontSize="26" fontWeight="900" fill="#F57C20" letterSpacing="-0.5">
      Nagad
    </text>
  </svg>
);

const Payment: React.FC = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();

  // Multi-step Payment Gateway Flow (IMG_3928 -> IMG_3929 -> IMG_3930)
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedMethod, setSelectedMethod] = useState<"bkash" | "nagad">("bkash");
  const [activeTab, setActiveTab] = useState<"all" | "mfs">("all");
  const [showAmountDropdown, setShowAmountDropdown] = useState(false);
  const [showTrxAccordion, setShowTrxAccordion] = useState(false);

  // Data states
  const [order, setOrder] = useState<any>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form states
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Dynamic numbers rotated per page load/refresh
  const [activeBkashNumber, setActiveBkashNumber] = useState("");
  const [activeNagadNumber, setActiveNagadNumber] = useState("");

  // Live 15-Minute Countdown Timer (e.g. "14m 58s পর মেয়াদ শেষ হবে")
  const [secondsLeft, setSecondsLeft] = useState<number>(14 * 60 + 58);
  const [successCountdown, setSuccessCountdown] = useState<number>(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 30s Auto-redirect to My Orders or Account Creation after payment submission
  useEffect(() => {
    if (!paymentSuccess) return;
    setSuccessCountdown(30);
    const interval = setInterval(() => {
      setSuccessCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          const activeUser = auth?.currentUser || (typeof window !== "undefined" ? getAuth()?.currentUser : null);
          if (!activeUser) {
            navigate(`/auth-selector?redirect=/my-orders&guestOrder=${orderId || ""}`);
          } else {
            navigate("/my-orders");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [paymentSuccess, navigate, orderId]);

  const formatCountdown = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  // Copy helper with feedback
  const handleCopy = (text: string, key: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    notify(`${label} কপি হয়েছে!`, "success");
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Fetch Order & Payment Settings
  useEffect(() => {
    if (!orderId) {
      navigate("/");
      return;
    }

    const unsubOrder = onSnapshot(doc(db, "orders", orderId), async (snap) => {
      if (snap.exists()) {
        const orderData = { id: snap.id, ...snap.data() };
        setOrder(orderData);

        // Pre-fill sender number or trxId if present
        if (orderData.senderNumber || orderData.accountNameSender) {
          setSenderNumber(orderData.senderNumber || orderData.accountNameSender);
        }
        if (orderData.transactionId) {
          setTrxId(orderData.transactionId);
        }

        // Fetch seller details if order belongs to a seller
        const firstSellerId = orderData.items?.find((i: any) => i.sellerId)?.sellerId;
        if (firstSellerId) {
          try {
            const sellerSnap = await getDoc(doc(db, "users", firstSellerId));
            if (sellerSnap.exists()) {
              setSellerProfile(sellerSnap.data());
            }
          } catch (e) {
            console.error("Error fetching seller:", e);
          }
        }
      }
      setLoading(false);
    });

    const unsubPayments = onSnapshot(doc(db, "settings", "payments"), (docSnap) => {
      if (docSnap.exists()) {
        setPaymentSettings(docSnap.data());
      }
    });

    return () => {
      unsubOrder();
      unsubPayments();
    };
  }, [orderId, navigate]);

  // ROTATE bKash and Nagad numbers DYNAMICALLY on load / refresh
  // Distributes different numbers to different users concurrently, and cycles through them per refresh
  useEffect(() => {
    // 1. Rotate bKash Number
    let bPool: string[] = [];
    if (Array.isArray(sellerProfile?.bkashNumbers) && sellerProfile.bkashNumbers.length > 0) {
      bPool = sellerProfile.bkashNumbers;
    } else if (sellerProfile?.bkashNumber) {
      bPool = [sellerProfile.bkashNumber];
    } else if (Array.isArray(paymentSettings?.bkashNumbers) && paymentSettings.bkashNumbers.length > 0) {
      bPool = paymentSettings.bkashNumbers;
    } else if (paymentSettings?.bkashNumber) {
      bPool = [paymentSettings.bkashNumber];
    } else if (paymentSettings?.npsbNumber) {
      bPool = [paymentSettings.npsbNumber];
    }
    const cleanBkash = bPool.filter((n) => n && !isForbiddenNumber(n));

    // 2. Rotate Nagad Number
    let nPool: string[] = [];
    if (Array.isArray(sellerProfile?.nagadNumbers) && sellerProfile.nagadNumbers.length > 0) {
      nPool = sellerProfile.nagadNumbers;
    } else if (sellerProfile?.nagadNumber) {
      nPool = [sellerProfile.nagadNumber];
    } else if (Array.isArray(paymentSettings?.nagadNumbers) && paymentSettings.nagadNumbers.length > 0) {
      nPool = paymentSettings.nagadNumbers;
    } else if (paymentSettings?.nagadNumber) {
      nPool = [paymentSettings.nagadNumber];
    } else if (paymentSettings?.pathaoPayNumber) {
      nPool = [paymentSettings.pathaoPayNumber];
    }
    const cleanNagad = nPool.filter((n) => n && !isForbiddenNumber(n));

    // Calculate seed from orderId + session refresh salt so different orders/users
    // get different numbers concurrently, and every refresh picks another available number
    const sessionSalt = Math.floor(Math.random() * 1000);
    const orderHash = (orderId || "").split("").reduce((acc, c, idx) => acc + c.charCodeAt(0) * (idx + 3), 0);
    const seed = orderHash + sessionSalt;

    if (cleanBkash.length > 0) {
      const picked = cleanBkash[seed % cleanBkash.length];
      setActiveBkashNumber(picked);
    } else {
      setActiveBkashNumber("01700000000");
    }

    if (cleanNagad.length > 0) {
      const picked = cleanNagad[(seed + 1) % cleanNagad.length];
      setActiveNagadNumber(picked);
    } else {
      setActiveNagadNumber("01800000000");
    }
  }, [sellerProfile, paymentSettings, orderId]);

  // Financial Calculations
  const calculations = useMemo(() => {
    if (!order) return { amountToPay: 0, subtotal: 0, advance: 0, dueOnDelivery: 0, deliveryFee: 0 };
    const isCourierPayment = order.status === "Shipped in Courier" || order.status === "shipped_in_courier";
    const prevPaid = order.paymentOption === "Full Payment" 
      ? order.total 
      : (order.advanceAmount !== undefined && order.advanceAmount !== null ? order.advanceAmount : 150);
    const remainingDue = Math.max(0, (order.total || 0) - prevPaid);
    const amountToPay = isCourierPayment ? Math.round(remainingDue * 0.20) : (prevPaid || order.total || 0);

    return {
      amountToPay,
      subtotal: order.subTotal || order.total || amountToPay,
      advance: amountToPay,
      dueOnDelivery: order.dueAmount !== undefined ? order.dueAmount : Math.max(0, (order.total || amountToPay) - amountToPay),
      deliveryFee: order.deliveryFee || 120,
      isCourierPayment
    };
  }, [order]);

  // Current active payment number based on selected method
  const currentReceiverNumber = selectedMethod === "bkash" ? activeBkashNumber : activeNagadNumber;
  const storeName = sellerProfile?.shopName || "Deep Shop";
  const displayTrxRef = `TRX-${orderId?.slice(0, 8).toUpperCase()}`;

  // Step 2 Submission -> validates Sender Number and proceeds to Step 3
  const handleProceedToStep3 = () => {
    const cleaned = senderNumber.trim().replace(/\D/g, "");
    if (!cleaned || cleaned.length < 11) {
      return notify("অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর লিখুন।", "error");
    }
    if (isForbiddenNumber(cleaned)) {
      return notify("01778953114 নম্বরটি সিস্টেমে অনুমোদিত নয়।", "error");
    }
    setStep(3);
  };

  // Step 3 Final Verification Submission
  const handleConfirmFinalPayment = async () => {
    if (!senderNumber.trim()) {
      notify("অনুগ্রহ করে প্রেরক নম্বর লিখুন।", "error");
      setStep(2);
      return;
    }
    if (!trxId.trim() || trxId.trim().length < 4) {
      notify("অনুগ্রহ করে TrxID অথবা ট্রানজেকশনের শেষ ৪টি ডিজিট লিখুন।", "error");
      setShowTrxAccordion(true);
      return;
    }
    if (isForbiddenNumber(senderNumber) || isForbiddenNumber(trxId)) {
      notify("01778953114 নম্বরটি সিস্টেমে অনুমোদিত নয়।", "error");
      return;
    }

    setSubmitting(true);
    try {
      if (orderId) {
        const orderRef = doc(db, "orders", orderId);
        const updatePayload: any = {
          accountNameSender: senderNumber.trim(),
          senderNumber: senderNumber.trim(),
          transactionId: trxId.trim(),
          lastDigits: trxId.trim(),
          paymentMethod: selectedMethod === "bkash" ? "bKash" : "Nagad",
          receiverNumber: currentReceiverNumber,
          paymentStatus: "paid_pending",
          updatedAt: Date.now()
        };

        if (calculations.isCourierPayment) {
          updatePayload.status = "Courier Verification Pending";
        } else {
          updatePayload.status = OrderStatus.CHECKING_PAYMENT || "checking_payment";
        }
        updatePayload.checkingEstimatedTime = "1-7 hours";

        await updateDoc(orderRef, updatePayload);

        // Notify seller via push & notification collection
        try {
          const uniqueSellerIds = Array.from(
            new Set((order?.items || []).map((item: any) => item.sellerId).filter(Boolean))
          );
          uniqueSellerIds.forEach((sId: any) => {
            fetch("/api/send-push-user", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: sId,
                title: "Payment Received! 💳",
                body: `${order.customerName || "Customer"} submitted payment of ৳${calculations.amountToPay} for Order #${orderId?.slice(0, 8)}.`,
                link: "/seller/dashboard"
              })
            }).catch(console.error);

            addDoc(collection(db, "notifications"), {
              userId: sId,
              title: "Payment Received! 💳",
              message: `Payment submitted for Order #${orderId?.slice(0, 8)} by ${order.customerName || "Customer"}.`,
              createdAt: Date.now(),
              isRead: false,
              type: "order",
              link: "/seller/dashboard"
            }).catch(console.error);
          });

          // Notify admins
          fetch("/api/send-push-admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: "Customer Submitted Payment 💳",
              body: `Order #${orderId?.slice(0, 8)}: ৳${calculations.amountToPay} paid via ${selectedMethod.toUpperCase()} (TrxID: ${trxId.trim()}).`,
              link: "/admin/orders"
            })
          }).catch(console.error);
        } catch (e) {
          console.error("Notification trigger error:", e);
        }

        // Send detailed notification to Telegram
        try {
          await sendOrderToTelegram({
            ...order,
            id: orderId,
            accountNameSender: senderNumber.trim(),
            senderNumber: senderNumber.trim(),
            transactionId: trxId.trim(),
            paymentMethod: selectedMethod === "bkash" ? "bKash" : "Nagad",
            receiverNumber: currentReceiverNumber,
            status: "pending"
          });
        } catch (tgErr) {
          console.error("Telegram broadcast error:", tgErr);
        }

        // Save guest order reference to localStorage for automatic account linking
        if (orderId) {
          try {
            localStorage.setItem("pending_guest_order_id", orderId);
            if (senderNumber) {
              localStorage.setItem("pending_guest_order_phone", senderNumber.trim());
            }
          } catch (storageErr) {
            console.error("Storage error:", storageErr);
          }
        }

        setPaymentSuccess(true);
        notify("পেমেন্ট সফলভাবে সাবমিট হয়েছে!", "success");
      }
    } catch (e) {
      console.error(e);
      notify("পেমেন্ট সাবমিট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-black flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-zinc-500">সুরক্ষিত পেমেন্ট গেটওয়ে লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-black flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl text-center max-w-md shadow-sm border border-zinc-200 dark:border-zinc-800 space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">অর্ডার পাওয়া যায়নি</h2>
          <p className="text-xs text-zinc-500">আপনার অর্ডার লিংকটি সঠিক নয় অথবা অর্ডারটি বাতিল করা হয়েছে।</p>
          <Button onClick={() => navigate("/")} className="w-full rounded-xl bg-zinc-900 text-white">
            হোমে ফিরে যান
          </Button>
        </div>
      </div>
    );
  }

  // Success & Verification Pending View (1-7 hours checking notice + 30s countdown redirect to My Orders / Account Creation)
  if (paymentSuccess) {
    const activeUser = auth?.currentUser || (typeof window !== "undefined" ? getAuth()?.currentUser : null);
    const isGuest = !activeUser;

    return (
      <div className="min-h-screen bg-[#F4F6F8] dark:bg-[#090A0C] flex items-center justify-center p-4 font-sans text-zinc-900 dark:text-zinc-100">
        <div className="w-full max-w-md bg-white dark:bg-[#121316] rounded-3xl p-5 sm:p-7 text-center shadow-xl border border-zinc-200/80 dark:border-zinc-800 space-y-5 animate-in fade-in zoom-in-95 duration-300">
          {/* Animated Hourglass / Clock Verification Icon */}
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
            <div className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner relative z-10">
              <Clock className="w-7 h-7 animate-spin" style={{ animationDuration: "8s" }} />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-500/20 whitespace-nowrap">
              <span>⏳ যাচাইকরণ প্রক্রিয়া শুরু হয়েছে</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white whitespace-nowrap">
              পেমেন্ট চেক করা হচ্ছে...
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-snug font-medium">
              আপনার প্রেরিত পেমেন্ট তথ্য ম্যানুয়ালি যাচাই করা হচ্ছে। এতে <strong className="text-indigo-600 dark:text-indigo-400 font-bold whitespace-nowrap">১-৭ ঘণ্টা</strong> সময় লাগতে পারে।
            </p>
          </div>

          {/* Account Creation Prompt if user is a guest / not logged in */}
          {isGuest && (
            <div className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 p-4 rounded-2xl text-left space-y-2">
              <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 font-bold text-xs sm:text-sm whitespace-nowrap">
                <span>🔐</span>
                <span className="truncate">আপনার কোনো অ্যাকাউন্ট খোলা নেই!</span>
              </div>
              <p className="text-[11px] sm:text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                নতুন একটি পেজে অ্যাকাউন্ট খুলে আপনার <strong>My Orders</strong>-এ অর্ডারের সব তথ্য দেখুন। অ্যাকাউন্ট খোলার সাথে সাথেই এই অর্ডারটি স্বয়ংক্রিয়ভাবে আপনার অ্যাকাউন্টে যুক্ত হয়ে যাবে।
              </p>
            </div>
          )}

          {/* 30-Second Auto-redirect countdown */}
          <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 p-3.5 rounded-2xl text-left space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
              <span className="truncate">{isGuest ? "অ্যাকাউন্ট পেজে যাচ্ছি..." : "My Orders পেজে যাচ্ছি..."}</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full text-xs font-black shrink-0">
                {successCountdown}s বাকি
              </span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${(successCountdown / 30) * 100}%` }}
              />
            </div>
            <p className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug whitespace-nowrap truncate">
              {isGuest
                ? "৩০ সেকেন্ড পর স্বয়ংক্রিয়ভাবে অ্যাকাউন্ট খোলার পেজে নিয়ে যাওয়া হবে"
                : "৩০ সেকেন্ড পর স্বয়ংক্রিয়ভাবে My Orders পেজে নিয়ে যাওয়া হবে"}
            </p>
          </div>

          {/* Payment Summary - Strictly Single Line */}
          <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3.5 rounded-2xl text-left space-y-1.5 border border-zinc-200/80 dark:border-zinc-800 text-xs">
            <div className="flex justify-between items-center whitespace-nowrap">
              <span className="text-zinc-500 text-[11px]">Order ID:</span>
              <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 text-xs">#{orderId?.slice(0, 10)}</span>
            </div>
            <div className="flex justify-between items-center whitespace-nowrap">
              <span className="text-zinc-500 text-[11px]">পরিশোধিত অর্থ:</span>
              <span className="font-bold text-emerald-600 text-xs sm:text-sm">৳{calculations.amountToPay}</span>
            </div>
            <div className="flex justify-between items-center whitespace-nowrap">
              <span className="text-zinc-500 text-[11px]">পেমেন্ট মেথড:</span>
              <span className="font-bold uppercase text-zinc-800 dark:text-zinc-200 text-xs">{selectedMethod}</span>
            </div>
            <div className="flex justify-between items-center whitespace-nowrap">
              <span className="text-zinc-500 text-[11px]">আপনার প্রেরক নম্বর:</span>
              <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 text-xs">{senderNumber}</span>
            </div>
            <div className="flex justify-between items-center whitespace-nowrap">
              <span className="text-zinc-500 text-[11px]">Transaction ID:</span>
              <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 text-xs truncate max-w-[150px]">{trxId}</span>
            </div>
          </div>

          {/* Action button */}
          {isGuest ? (
            <Button
              onClick={() => navigate(`/auth-selector?redirect=/my-orders&guestOrder=${orderId}`)}
              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md whitespace-nowrap"
            >
              নতুন অ্যাকাউন্ট খুলুন ও অর্ডার দেখুন →
            </Button>
          ) : (
            <Button
              onClick={() => navigate("/my-orders")}
              className="w-full h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-xs sm:text-sm shadow-md whitespace-nowrap"
            >
              এখনই My Orders পেজে যান
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] dark:bg-[#090A0C] flex flex-col justify-between font-sans text-zinc-900 dark:text-zinc-100 antialiased selection:bg-pink-500 selection:text-white">
      {/* Top Main Container */}
      <div className="w-full max-w-lg mx-auto px-4 py-4 sm:py-6 flex-1 flex flex-col justify-center">
        
        {/* ============================================================== */}
        {/* STEP 1: PAYMENT METHOD SELECTION (MATCHING IMG_3928.png) */}
        {/* ============================================================== */}
        {step === 1 && (
          <div className="bg-white dark:bg-[#121316] rounded-3xl p-4 sm:p-6 shadow-sm border border-zinc-200/80 dark:border-zinc-800 space-y-5">
            
            {/* Header: Shop Avatar, Name, Trx ID, Countdown, Amount Dropdown */}
            <div className="flex items-start justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0 overflow-hidden">
                  {sellerProfile?.photoURL || sellerProfile?.avatarUrl ? (
                    <img src={sellerProfile.photoURL || sellerProfile.avatarUrl} alt="Store" className="w-full h-full object-cover" />
                  ) : (
                    storeName.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <h1 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white leading-tight truncate max-w-[140px] sm:max-w-xs whitespace-nowrap">
                    {storeName}
                  </h1>
                  <p className="text-[10px] sm:text-[11px] font-mono text-zinc-400 mt-0.5 whitespace-nowrap">
                    Trx ID: {displayTrxRef}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 font-medium mt-0.5 whitespace-nowrap">
                    <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="whitespace-nowrap">{formatCountdown(secondsLeft)} পর মেয়াদ শেষ হবে</span>
                  </p>
                </div>
              </div>

              {/* Amount Badge with Dropdown toggle */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAmountDropdown(!showAmountDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 rounded-full text-xs font-bold text-zinc-800 dark:text-zinc-200 transition whitespace-nowrap"
                >
                  <span className="whitespace-nowrap">{calculations.amountToPay} BDT</span>
                  {showAmountDropdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {/* Amount Breakdown Popover */}
                {showAmountDropdown && (
                  <div className="absolute right-0 top-10 w-64 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-4 z-50 text-xs space-y-2 animate-in fade-in zoom-in-95">
                    <div className="flex justify-between text-zinc-500 whitespace-nowrap">
                      <span>পণ্যের মোট মূল্য:</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">৳{calculations.subtotal}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500 whitespace-nowrap">
                      <span>ডেলিভারি চার্জ:</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">৳{calculations.deliveryFee}</span>
                    </div>
                    {order.discount > 0 && (
                      <div className="flex justify-between text-emerald-600 whitespace-nowrap">
                        <span>ডিসকাউন্ট:</span>
                        <span className="font-semibold">-৳{order.discount}</span>
                      </div>
                    )}
                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2 flex justify-between font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                      <span>অগ্রিম প্রদেয়:</span>
                      <span className="text-[#E2125B]">৳{calculations.amountToPay}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-zinc-400 whitespace-nowrap">
                      <span>বাকি প্রদেয় (ডেলিভারিতে):</span>
                      <span className="font-semibold">৳{calculations.dueOnDelivery}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Courier Warning Banner if Courier Payment */}
            {calculations.isCourierPayment && (
              <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 px-3 py-2 rounded-2xl text-[10.5px] sm:text-xs font-semibold text-rose-600 dark:text-rose-400 animate-pulse text-center whitespace-nowrap truncate">
                বিস্তারিত দেখতে পে করুন, না হলে ১ দিনের মধ্যে রিটার্ন চলে যাবে
              </div>
            )}

            {/* Top Tabs: [ সব পদ্ধতি ] [ মোবাইল ব্যাংকিং ] */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeTab === "all"
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                }`}
              >
                <span>⊞</span>
                <span className="whitespace-nowrap">সব পদ্ধতি</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("mfs")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeTab === "mfs"
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                }`}
              >
                <span>📱</span>
                <span className="whitespace-nowrap">মোবাইল ব্যাংকিং</span>
              </button>
            </div>

            {/* Payment Method Cards Grid (bKash & Nagad) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* bKash Card */}
              <button
                type="button"
                onClick={() => setSelectedMethod("bkash")}
                className={`flex flex-col items-center justify-between p-3.5 rounded-2xl border-2 transition-all bg-white dark:bg-zinc-900 cursor-pointer relative h-32 ${
                  selectedMethod === "bkash"
                    ? "border-[#E2125B] ring-2 ring-[#E2125B]/20 shadow-md"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-pink-300"
                }`}
              >
                <div className="flex-1 flex items-center justify-center w-full">
                  <BkashLogo className="h-8 w-auto" />
                </div>
                <div className="w-full pt-1.5 border-t border-zinc-100 dark:border-zinc-800 text-center">
                  <span className="text-[11px] sm:text-xs font-bold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                    bKash Personal
                  </span>
                </div>
                {selectedMethod === "bkash" && (
                  <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#E2125B] text-white flex items-center justify-center text-[10px]">
                    ✓
                  </span>
                )}
              </button>

              {/* Nagad Card */}
              <button
                type="button"
                onClick={() => setSelectedMethod("nagad")}
                className={`flex flex-col items-center justify-between p-3.5 rounded-2xl border-2 transition-all bg-white dark:bg-zinc-900 cursor-pointer relative h-32 ${
                  selectedMethod === "nagad"
                    ? "border-[#F57C20] ring-2 ring-[#F57C20]/20 shadow-md"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-orange-300"
                }`}
              >
                <div className="flex-1 flex items-center justify-center w-full">
                  <NagadLogo className="h-8 w-auto" />
                </div>
                <div className="w-full pt-1.5 border-t border-zinc-100 dark:border-zinc-800 text-center">
                  <span className="text-[11px] sm:text-xs font-bold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                    Nagad Personal
                  </span>
                </div>
                {selectedMethod === "nagad" && (
                  <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#F57C20] text-white flex items-center justify-center text-[10px]">
                    ✓
                  </span>
                )}
              </button>
            </div>

            {/* Primary Action Button: "5000 BDT পেমেন্ট করুন" */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => setStep(2)}
                className={`w-full h-12 rounded-full font-bold text-sm sm:text-base text-white shadow-lg transition-transform active:scale-[0.99] flex items-center justify-center gap-2 whitespace-nowrap ${
                  selectedMethod === "bkash"
                    ? "bg-[#E2125B] hover:bg-[#c20e4d]"
                    : "bg-[#F57C20] hover:bg-[#d96714]"
                }`}
              >
                <span className="whitespace-nowrap">{calculations.amountToPay} BDT পেমেন্ট করুন</span>
              </button>

              {/* Cancel & Return Link */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate("/my-orders")}
                  className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition whitespace-nowrap"
                >
                  বাতিল করে মার্চেন্টে ফিরে যান
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 2: SENDER PHONE INPUT (MATCHING IMG_3929.jpeg) */}
        {/* ============================================================== */}
        {step === 2 && (
          <div className="bg-white dark:bg-[#121316] rounded-3xl p-4 sm:p-6 shadow-sm border border-zinc-200/80 dark:border-zinc-800 space-y-5">
            
            {/* Header: Store Info, Amount (No back button) */}
            <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-sm">
                  {sellerProfile?.photoURL || sellerProfile?.avatarUrl ? (
                    <img src={sellerProfile.photoURL || sellerProfile.avatarUrl} alt="Store" className="w-full h-full object-cover" />
                  ) : (
                    storeName.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block font-medium whitespace-nowrap">পেমেন্ট গ্রহণকারী</span>
                  <h3 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white leading-tight truncate max-w-[130px] whitespace-nowrap">
                    {storeName}
                  </h3>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-zinc-400 block font-medium whitespace-nowrap">মোট দিতে হবে</span>
                <span className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white whitespace-nowrap">
                  {calculations.amountToPay} BDT ˅
                </span>
              </div>
            </div>

            {/* Selected Method Pill / Logo */}
            <div className="flex items-center gap-2">
              {selectedMethod === "bkash" ? (
                <BkashLogo className="h-5 w-auto" />
              ) : (
                <NagadLogo className="h-5 w-auto" />
              )}
            </div>

            {/* The Signature Magenta / Orange Card (as in IMG_3929.jpeg) */}
            <div
              className={`p-4 sm:p-5 rounded-2xl text-white shadow-md space-y-3 ${
                selectedMethod === "bkash" ? "bg-[#d8125a]" : "bg-[#f57c20]"
              }`}
            >
              <div className="text-center space-y-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-normal text-white/80 block whitespace-nowrap">
                  আপনার প্রেরক মোবাইল নম্বর
                </span>
                <p className="text-[11px] sm:text-xs font-semibold text-center whitespace-nowrap truncate text-white/95">
                  যে {selectedMethod === "bkash" ? "বিকাশ" : "নগদ"} নম্বর থেকে টাকা পাঠাবেন, সেটি লিখুন:
                </p>
              </div>

              {/* Large Centered White Input */}
              <div className="bg-white rounded-2xl p-1.5 shadow-inner">
                <input
                  type="tel"
                  inputMode="numeric"
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleProceedToStep3();
                    }
                  }}
                  placeholder="01XXXXXXXXX"
                  className="w-full h-11 text-center text-lg sm:text-xl font-black font-mono tracking-wider text-zinc-900 outline-none bg-transparent placeholder:text-zinc-400 placeholder:text-xs"
                  autoFocus
                />
              </div>
            </div>

            {/* Bottom Actions: [ জমা দিন ] (No back/cancel button) */}
            <div>
              <button
                type="button"
                onClick={handleProceedToStep3}
                className="w-full h-11 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer whitespace-nowrap"
              >
                জমা দিন (পরবর্তী ধাপে যান)
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 3: SEND MONEY DETAILS & VERIFICATION (MATCHING IMG_3930.jpeg) */}
        {/* ============================================================== */}
        {step === 3 && (
          <div className="bg-white dark:bg-[#121316] rounded-3xl p-4 sm:p-6 shadow-sm border border-zinc-200/80 dark:border-zinc-800 space-y-4">
            
            {/* Header: Store Info, Amount (No back button) */}
            <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-sm">
                  {sellerProfile?.photoURL || sellerProfile?.avatarUrl ? (
                    <img src={sellerProfile.photoURL || sellerProfile.avatarUrl} alt="Store" className="w-full h-full object-cover" />
                  ) : (
                    storeName.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block font-medium whitespace-nowrap">পেমেন্ট গ্রহণকারী</span>
                  <h3 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white leading-tight truncate max-w-[130px] whitespace-nowrap">
                    {storeName}
                  </h3>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-zinc-400 block font-medium whitespace-nowrap">মোট দিতে হবে</span>
                <span className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white whitespace-nowrap">
                  {calculations.amountToPay} BDT ˅
                </span>
              </div>
            </div>

            {/* Selected Method Subheader */}
            <div className="flex items-center gap-2">
              {selectedMethod === "bkash" ? (
                <BkashLogo className="h-5 w-auto" />
              ) : (
                <NagadLogo className="h-5 w-auto" />
              )}
            </div>

            {/* Instruction Card - Single Line */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl text-[11px] sm:text-xs font-medium text-zinc-700 dark:text-zinc-300 text-center whitespace-nowrap truncate">
              {selectedMethod === "bkash" ? "bKash" : "Nagad"} অ্যাপে <strong>Send Money</strong> করে ঠিক <strong>{calculations.amountToPay} BDT</strong> পাঠান
            </div>

            {/* Account Number Card (SEND MONEY করুন এই নম্বরে) */}
            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-1">
              <span className="text-[10px] sm:text-[11px] font-bold text-zinc-500 uppercase tracking-normal block whitespace-nowrap">
                SEND MONEY করুন এই নম্বরে
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg sm:text-xl font-black font-mono text-zinc-900 dark:text-white tracking-wider whitespace-nowrap">
                  {currentReceiverNumber || "01700000000"}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(currentReceiverNumber, "phone", "নম্বর")}
                  className="px-3.5 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-full text-xs font-bold transition flex items-center gap-1 shrink-0 whitespace-nowrap"
                >
                  {copiedKey === "phone" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="whitespace-nowrap">{copiedKey === "phone" ? "কপি হয়েছে!" : "কপি"}</span>
                </button>
              </div>
            </div>

            {/* Amount Card (ঠিক এই পরিমাণ পাঠান) */}
            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-1">
              <span className="text-[10px] sm:text-[11px] font-bold text-zinc-500 uppercase tracking-normal block whitespace-nowrap">
                ঠিক এই পরিমাণ পাঠান
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg sm:text-xl font-black text-[#1a73e8] tracking-wider whitespace-nowrap">
                  {calculations.amountToPay} BDT
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(String(calculations.amountToPay), "amount", "পরিমাণ")}
                  className="px-3.5 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-full text-xs font-bold transition flex items-center gap-1 shrink-0 whitespace-nowrap"
                >
                  {copiedKey === "amount" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="whitespace-nowrap">{copiedKey === "amount" ? "কপি হয়েছে!" : "কপি"}</span>
                </button>
              </div>
            </div>

            {/* Live Waiting Status Banner - Single Line */}
            <div className="p-3 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/40 rounded-2xl space-y-1">
              <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs font-bold text-sky-800 dark:text-sky-300 whitespace-nowrap">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                  </span>
                  <span className="truncate">আপনার পেমেন্টের জন্য অপেক্ষা করছি...</span>
                </div>
                <span className="font-mono text-sky-600 dark:text-sky-400 shrink-0">
                  {formatCountdown(secondsLeft)} বাকি
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 pl-3.5 whitespace-nowrap truncate">
                টাকা পাঠানো সম্পন্ন হলে নিচে TrxID দিয়ে নিশ্চিত করুন
              </p>
            </div>

            {/* Verification / TrxID Section (Manual / Automatic) */}
            <div className="space-y-2.5 pt-0.5">
              <button
                type="button"
                onClick={() => setShowTrxAccordion(!showTrxAccordion)}
                className="w-full flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline py-0.5 whitespace-nowrap"
              >
                <span className="truncate whitespace-nowrap">দেরি হচ্ছে? TrxID সাবমিট করে ভেরিফাই করুন</span>
                {showTrxAccordion ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
              </button>

              {/* Expandable or Default Trx Input */}
              <div className={`space-y-2.5 transition-all ${showTrxAccordion ? "block" : "block"}`}>
                <div className="space-y-1">
                  <label className="text-[11px] sm:text-xs font-bold text-zinc-700 dark:text-zinc-300 block whitespace-nowrap">
                    Transaction ID (TrxID)
                  </label>
                  <Input
                    type="text"
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    placeholder="যেমন: 9J4K2LX9 অথবা শেষ ৪ ডিজিট"
                    className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm font-mono uppercase"
                  />
                  <p className="text-[10px] sm:text-[11px] text-zinc-400 whitespace-nowrap truncate">
                    এসএমএস বা অ্যাপ থেকে পাওয়া TrxID অথবা শেষ ৪টি ডিজিট লিখুন
                  </p>
                </div>

                <Button
                  onClick={handleConfirmFinalPayment}
                  disabled={submitting}
                  className={`w-full h-12 rounded-2xl text-white font-bold text-sm sm:text-base shadow-md transition whitespace-nowrap ${
                    selectedMethod === "bkash"
                      ? "bg-[#E2125B] hover:bg-[#c20e4d]"
                      : "bg-[#F57C20] hover:bg-[#d96714]"
                  }`}
                >
                  <span className="whitespace-nowrap">{submitting ? "যাচাই করা হচ্ছে..." : "পেমেন্ট নিশ্চিত করুন ✓"}</span>
                </Button>
              </div>
            </div>

            {/* Number rotation note */}
            <p className="text-[9.5px] sm:text-[10px] text-zinc-400 text-center flex items-center justify-center gap-1 pt-0.5 whitespace-nowrap truncate">
              <span>🔄</span>
              <span className="truncate">নিরাপত্তার স্বার্থে প্রতিবার রিফ্রেশ করলে নম্বর পরিবর্তিত হতে পারে</span>
            </p>
          </div>
        )}

      </div>

      {/* Footer Bar (matching IMG_3928.png) */}
      <footer className="w-full max-w-lg mx-auto px-6 py-3 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-200/60 dark:border-zinc-800/60 whitespace-nowrap">
        <a
          href="https://wa.me/8801700000000"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-white transition font-medium whitespace-nowrap"
        >
          <Headphones className="w-4 h-4 text-emerald-600" />
          <span>সাপোর্ট</span>
        </a>

        <div className="flex items-center gap-1.5 font-medium whitespace-nowrap">
          <Globe className="w-4 h-4 text-zinc-400" />
          <span>বাংলা</span>
        </div>
      </footer>
    </div>
  );
};

export default Payment;
