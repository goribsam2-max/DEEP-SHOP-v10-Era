import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  Copy,
  Check,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Headphones,
  Globe,
  Clock,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Zap,
  CreditCard,
  Lock,
  ShoppingBag,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useNotify } from "../components/Notifications";
import { formatPrice } from "@/lib/utils";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { triggerHaptic } from "../lib/haptics";
import { APPLE_SPRING_DEFAULT, APPLE_SPRING_SNAPPY } from "../lib/shoppingRoute";
import { validateBangladeshiPhone, detectAbuse, recordAbuseStrike } from "../src/lib/abuseProtection";
import AuthVoiceToggle from "../components/AuthVoiceToggle";
import { isAuthVoiceMuted, playAuthVoice } from "../lib/authVoiceAndValidation";
import { sendOrderToTelegram } from "../services/telegram";
import { OrderStatus } from "../types";
import { isSuperAdminOrAdmin } from "../lib/admin";
import {
  ConfiguredMobileAccount,
  extractConfiguredMobileAccounts,
  getMobileActionLabel,
  getNextRefreshSeed,
  pickAccountBySeed,
} from "../lib/dhakaTime";

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
  const shouldReduceMotion = useReducedMotion();

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
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form states
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Deterministic per-refresh rotation seed + single active bKash & Nagad account
  const [refreshSeed] = useState<number>(() =>
    getNextRefreshSeed(`payment_${orderId || "default"}`)
  );
  const [activeBkashAccount, setActiveBkashAccount] =
    useState<ConfiguredMobileAccount | null>(null);
  const [activeNagadAccount, setActiveNagadAccount] =
    useState<ConfiguredMobileAccount | null>(null);
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
    triggerHaptic("light");
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    notify(`${label} copied!`, "success");
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Fetch Order, Seller Profile & Payment Settings
  useEffect(() => {
    if (!orderId) {
      navigate("/");
      return;
    }

    let unsubSeller: (() => void) | null = null;
    let currentSubscribedSellerId: string | null = null;

    const unsubOrder = onSnapshot(doc(db, "orders", orderId), async (snap) => {
      if (snap.exists()) {
        const orderData: any = { id: snap.id, ...snap.data() };
        setOrder(orderData);

        // Pre-fill sender number or trxId if present
        if (orderData.senderNumber || orderData.accountNameSender) {
          setSenderNumber(orderData.senderNumber || orderData.accountNameSender);
        }
        if (orderData.transactionId) {
          setTrxId(orderData.transactionId);
        }

        // Resolve sellerId from top-level order.sellerId, order.items[].sellerId, or fallback lookup on products/{productId}
        let resolvedSellerId: string | null =
          orderData.sellerId ||
          orderData.items?.find((i: any) => i?.sellerId)?.sellerId ||
          null;

        if (!resolvedSellerId && Array.isArray(orderData.items)) {
          for (const item of orderData.items) {
            const pid = item?.productId || item?.id;
            if (!pid) continue;
            try {
              const pSnap = await getDoc(doc(db, "products", String(pid)));
              if (pSnap.exists() && pSnap.data()?.sellerId) {
                resolvedSellerId = String(pSnap.data().sellerId);
                break;
              }
            } catch {
              // Ignore product lookup failure
            }
          }
        }

        if (resolvedSellerId) {
          if (currentSubscribedSellerId !== resolvedSellerId) {
            if (unsubSeller) unsubSeller();
            currentSubscribedSellerId = resolvedSellerId;
            unsubSeller = onSnapshot(
              doc(db, "users", resolvedSellerId),
              (sellerSnap) => {
                if (sellerSnap.exists()) {
                  setSellerProfile({ id: sellerSnap.id, ...sellerSnap.data() });
                } else {
                  setSellerProfile(null);
                }
              },
              (err) => {
                console.error("Error listening to seller profile:", err);
              }
            );
          }
        } else {
          if (unsubSeller) {
            unsubSeller();
            unsubSeller = null;
            currentSubscribedSellerId = null;
          }
          setSellerProfile(null);
        }
      } else {
        try {
          const cached = localStorage.getItem("order_" + orderId);
          if (cached) {
            setOrder(JSON.parse(cached));
          }
        } catch {
          // Ignore cache parse error
        }
      }
      setLoading(false);
    });

    const unsubPayments = onSnapshot(doc(db, "settings", "payments"), (docSnap) => {
      if (docSnap.exists()) {
        setPaymentSettings(docSnap.data());
      } else {
        setPaymentSettings({});
      }
    });

    const unsubPlatform = onSnapshot(doc(db, "settings", "platform"), (docSnap) => {
      if (docSnap.exists()) {
        setPlatformSettings(docSnap.data());
      } else {
        setPlatformSettings({});
      }
    });

    return () => {
      unsubOrder();
      unsubPayments();
      unsubPlatform();
      if (unsubSeller) unsubSeller();
    };
  }, [orderId, navigate]);

  // Rotate bKash and Nagad numbers deterministically per refresh:
  // - Non-admin seller products -> strictly use ONLY that seller's configured numbers (no Admin fallback)
  // - Main Admin products (e.g. deepshop@gmail.com) or platform products -> use Admin Dashboard settings/payments
  useEffect(() => {
    const isNonAdminSellerOrder = Boolean(
      sellerProfile && !isSuperAdminOrAdmin(sellerProfile)
    );

    let extracted = {
      bkash: [] as ConfiguredMobileAccount[],
      nagad: [] as ConfiguredMobileAccount[],
    };

    if (isNonAdminSellerOrder) {
      extracted = extractConfiguredMobileAccounts(sellerProfile);
    } else {
      const mergedAdminSettings = {
        ...(platformSettings || {}),
        ...(paymentSettings || {}),
      };
      extracted = extractConfiguredMobileAccounts(mergedAdminSettings);
      if (
        extracted.bkash.length === 0 &&
        extracted.nagad.length === 0 &&
        sellerProfile
      ) {
        extracted = extractConfiguredMobileAccounts(sellerProfile);
      }
    }

    const pickedBkash = pickAccountBySeed(extracted.bkash, refreshSeed);
    const pickedNagad = pickAccountBySeed(extracted.nagad, refreshSeed + 1);

    setActiveBkashAccount(pickedBkash);
    setActiveBkashNumber(pickedBkash?.number || "");
    setActiveNagadAccount(pickedNagad);
    setActiveNagadNumber(pickedNagad?.number || "");
  }, [sellerProfile, paymentSettings, platformSettings, refreshSeed]);

  const hasBkashNumber = Boolean(activeBkashNumber);
  const hasNagadNumber = Boolean(activeNagadNumber);

  // Automatically switch to available method if current one is unavailable
  useEffect(() => {
    if (hasBkashNumber && !hasNagadNumber && selectedMethod === "nagad") {
      setSelectedMethod("bkash");
    } else if (!hasBkashNumber && hasNagadNumber && selectedMethod === "bkash") {
      setSelectedMethod("nagad");
    }
  }, [hasBkashNumber, hasNagadNumber, selectedMethod]);

  // Financial Calculations
  const calculations = useMemo(() => {
    if (!order) return { amountToPay: 0, subtotal: 0, advance: 0, dueOnDelivery: 0, deliveryFee: 0, isBorderOffer: false, isCourierPayment: false };
    const isCourierPayment = order.status === "Shipped in Courier" || order.status === "shipped_in_courier";
    const isBorderOffer = Boolean(order.isBorderOffer || order.productClassification?.toLowerCase().includes("border") || order.items?.some((i: any) => i.isBorderOffer || i.productType === 'border_offer'));
    
    let prevPaid: number;
    if (order.advanceAmount !== undefined && order.advanceAmount !== null && Number(order.advanceAmount) > 0) {
      prevPaid = Number(order.advanceAmount);
    } else if (order.paymentOption === "Full Payment") {
      prevPaid = order.total;
    } else {
      prevPaid = 150;
    }

    const remainingDue = Math.max(0, (order.total || 0) - prevPaid);
    const amountToPay = isCourierPayment ? Math.round(remainingDue * 0.20) : (prevPaid || order.total || 0);

    return {
      amountToPay,
      subtotal: order.subTotal || order.total || amountToPay,
      advance: amountToPay,
      dueOnDelivery: order.dueAmount !== undefined ? order.dueAmount : Math.max(0, (order.total || amountToPay) - amountToPay),
      deliveryFee: order.deliveryFee || 120,
      isCourierPayment,
      isBorderOffer,
    };
  }, [order]);

  // Current active payment account & action label based on selected method
  const currentActiveAccount =
    selectedMethod === "bkash" ? activeBkashAccount : activeNagadAccount;
  const currentReceiverNumber =
    selectedMethod === "bkash" ? activeBkashNumber : activeNagadNumber;
  const currentActionLabel = getMobileActionLabel(currentActiveAccount?.type);
  const currentAccountTypeLabel = currentActiveAccount?.type || "Personal";
  const storeName =
    sellerProfile?.shopName || sellerProfile?.displayName || "Deep Shop";
  const displayTrxRef = `TRX-${orderId?.slice(0, 8).toUpperCase()}`;

  const speakPaymentStep = (targetStep: 1 | 2 | 3) => {
    if (isAuthVoiceMuted()) return;
    if (targetStep === 1) {
      playAuthVoice("বিকাশ অথবা নগদ পেমেন্ট মাধ্যম নির্বাচন করে পরবর্তী ধাপে যান।");
    } else if (targetStep === 2) {
      playAuthVoice("যে মোবাইল নম্বর থেকে টাকা পাঠাবেন সেই ১১ ডিজিটের নম্বরটি লিখুন।");
    } else if (targetStep === 3) {
      playAuthVoice("প্রদর্শিত নম্বরে নির্ধারিত টাকা পাঠিয়ে ট্রানজেকশন আইডি লিখে পেমেন্ট নিশ্চিত করুন।");
    }
  };

  // Step 2 Submission -> validates Sender Number and proceeds to Step 3
  const handleProceedToStep3 = async () => {
    // Abuse check
    const abuseCheck = detectAbuse(senderNumber);
    if (abuseCheck.hasAbuse) {
      const strikeRes = await recordAbuseStrike("Payment sender number abusive text");
      notify(strikeRes.message, "error");
      return;
    }

    const phoneValidation = validateBangladeshiPhone(senderNumber);
    if (!phoneValidation.isValid) {
      triggerHaptic("error");
      return notify(phoneValidation.error || "Please enter a valid 11-digit Bangladeshi mobile number.", "error");
    }
    triggerHaptic("selection");
    setSenderNumber(phoneValidation.normalized);
    setStep(3);
    speakPaymentStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const jumpToPaymentStep = (targetStep: 1 | 2 | 3) => {
    if (targetStep === step) return;
    if (targetStep === 1) {
      triggerHaptic("light");
      setStep(1);
      speakPaymentStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (targetStep === 2) {
      if (selectedMethod === "bkash" && !hasBkashNumber) {
        triggerHaptic("error");
        notify("bKash number is currently unavailable.", "error");
        return;
      }
      if (selectedMethod === "nagad" && !hasNagadNumber) {
        triggerHaptic("error");
        notify("Nagad number is currently unavailable.", "error");
        return;
      }
      triggerHaptic("selection");
      setStep(2);
      speakPaymentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (targetStep === 3 && step === 2) {
      handleProceedToStep3();
    }
  };

  // Step 3 Final Verification Submission
  const handleConfirmFinalPayment = async () => {
    // Abuse check
    const abuseCheckSender = detectAbuse(senderNumber);
    const abuseCheckTrx = detectAbuse(trxId);
    if (abuseCheckSender.hasAbuse || abuseCheckTrx.hasAbuse) {
      const strikeRes = await recordAbuseStrike("Payment TrxID or note abusive text");
      notify(strikeRes.message, "error");
      return;
    }

    const phoneValidation = validateBangladeshiPhone(senderNumber);
    if (!phoneValidation.isValid) {
      triggerHaptic("error");
      notify(phoneValidation.error || "Please enter a valid sender mobile number.", "error");
      setStep(2);
      return;
    }
    const cleanTrx = trxId.trim();
    if (!cleanTrx || cleanTrx.length < 4) {
      triggerHaptic("warning");
      notify("Please enter the TrxID or the last 4 digits of your transaction.", "error");
      setShowTrxAccordion(true);
      return;
    }
    triggerHaptic("medium");

    setSubmitting(true);
    try {
      if (orderId) {
        const orderRef = doc(db, "orders", orderId);
        const updatePayload: any = {
          accountNameSender: phoneValidation.normalized,
          senderNumber: phoneValidation.normalized,
          transactionId: cleanTrx,
          lastDigits: cleanTrx,
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

        // If this is a subscription order, also record in subscriptions collection using orderId as doc key
        if (order.type === "subscription") {
          try {
            await setDoc(
              doc(db, "subscriptions", orderId),
              {
                orderId: orderId,
                userId: order.userId || (typeof window !== "undefined" ? auth?.currentUser?.uid : "") || "",
                userName: order.customerName || auth?.currentUser?.displayName || "Customer",
                userEmail: order.customerEmail || auth?.currentUser?.email || "",
                userPhone: phoneValidation.normalized,
                planId: order.planId || "30days",
                planName: order.planName || "VIP Pass",
                durationDays: Number(order.durationDays || 30),
                price: Number(calculations.amountToPay || order.total || 0),
                paymentMethod: selectedMethod === "bkash" ? "bKash" : "Nagad",
                senderNumber: phoneValidation.normalized,
                trxId: cleanTrx,
                status: "pending",
                requestedAt: Date.now(),
                notes: `Order #${orderId} subscription payment`,
              },
              { merge: true }
            );
          } catch (subErr) {
            console.error("Error creating subscription record from payment:", subErr);
          }
        }

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
        notify("Payment submitted successfully!", "success");
      }
    } catch (e) {
      console.error(e);
      notify("Failed to submit payment. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="ds-apple-shop-canvas w-full min-h-[calc(100vh-56px)] py-6 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="ds-apple-surface rounded-[22px] p-5 flex items-center justify-between gap-4">
            <div className="h-7 w-44 rounded-full ds-skeleton" />
            <div className="h-10 w-64 rounded-full ds-skeleton hidden sm:block" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
            <div className="lg:col-span-7 ds-apple-surface rounded-[26px] p-6 space-y-4">
              <div className="h-6 w-48 rounded-full ds-skeleton" />
              <div className="h-28 w-full rounded-2xl ds-skeleton" />
              <div className="h-28 w-full rounded-2xl ds-skeleton" />
            </div>
            <div className="hidden lg:block lg:col-span-5 ds-apple-surface rounded-[26px] p-6 space-y-4">
              <div className="h-6 w-40 rounded-full ds-skeleton" />
              <div className="h-24 w-full rounded-2xl ds-skeleton" />
              <div className="h-32 w-full rounded-2xl ds-skeleton" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="ds-apple-shop-canvas w-full min-h-[calc(100vh-56px)] flex items-center justify-center p-4">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0.16 } : APPLE_SPRING_DEFAULT}
          className="ds-apple-surface rounded-[28px] p-7 sm:p-9 text-center max-w-md w-full space-y-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#FF3B30]/10 dark:bg-[#FF453A]/15 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-[#FF3B30] dark:text-[#FF453A]" />
          </div>
          <h2 className="ds-apple-display text-xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
            Order Not Found
          </h2>
          <p className="text-xs sm:text-sm text-[#6E6E73] dark:text-[#98989D] leading-relaxed">
            Your order link is invalid or the order has been cancelled.
          </p>
          <button
            type="button"
            onPointerDown={() => triggerHaptic("light")}
            onClick={() => navigate("/")}
            className="w-full ds-apple-btn-primary rounded-full px-6 py-3 text-sm font-semibold cursor-pointer whitespace-nowrap active:scale-[0.97] transition-transform"
          >
            Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  // Success & Verification Pending View (Apple Studio Neutral & Optical Layout)
  if (paymentSuccess) {
    const activeUser =
      auth?.currentUser ||
      (typeof window !== "undefined" ? getAuth()?.currentUser : null);
    const isGuest = !activeUser;

    return (
      <div className="ds-apple-shop-canvas w-full min-h-[calc(100vh-56px)] py-6 sm:py-10 px-3.5 sm:px-6 flex items-center justify-center">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={shouldReduceMotion ? { duration: 0.16 } : APPLE_SPRING_DEFAULT}
          className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          {/* Left / Main Verification Status Card */}
          <div className="lg:col-span-7 ds-apple-surface rounded-[28px] p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 flex items-center justify-center text-[#0071E3] dark:text-[#0A84FF] shrink-0">
                <Clock className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[#FF9500] dark:text-[#FF9F0A]">
                  Verification in Progress · 1–7 Hours
                </p>
                <h2 className="ds-apple-display text-xl sm:text-2xl font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                  Payment Details Submitted
                </h2>
                <p className="text-xs sm:text-sm text-[#6E6E73] dark:text-[#98989D] leading-relaxed">
                  Your transaction is being manually verified. Order status typically updates within{" "}
                  <strong className="text-[#1D1D1F] dark:text-[#F5F5F7]">1–7 hours</strong>.
                </p>
              </div>
            </div>

            {isGuest && (
              <div className="rounded-2xl bg-[#FF9500]/10 dark:bg-[#FF9F0A]/12 border border-[#FF9500]/20 p-4 space-y-1.5">
                <p className="text-xs sm:text-sm font-medium text-[#9A5B00] dark:text-[#FFD60A]">
                  Create an Account to Track Your Order
                </p>
                <p className="text-xs text-[#7D4B00] dark:text-[#FFE57F] leading-relaxed">
                  You don&apos;t have an account yet. Once you sign up, this order will automatically appear in your{" "}
                  <strong>My Orders</strong> list.
                </p>
              </div>
            )}

            {/* 30-Second Auto-redirect countdown */}
            <div className="rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-nowrap">
                <span className="truncate">
                  {isGuest ? "Redirecting to account setup..." : "Redirecting to My Orders..."}
                </span>
                <span className="font-mono tabular-nums text-[#0071E3] dark:text-[#0A84FF] shrink-0">
                  {successCountdown}s left
                </span>
              </div>
              <div className="w-full bg-black/[0.08] dark:bg-white/[0.12] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#0071E3] dark:bg-[#0A84FF] h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${(successCountdown / 30) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-[#6E6E73] dark:text-[#98989D]">
                You will be redirected automatically after 30 seconds.
              </p>
            </div>

            {/* Action CTA */}
            <div className="pt-1">
              {isGuest ? (
                <button
                  type="button"
                  onPointerDown={() => triggerHaptic("light")}
                  onClick={() =>
                    navigate(`/auth-selector?redirect=/my-orders&guestOrder=${orderId}`)
                  }
                  className="w-full ds-apple-btn-primary rounded-full px-6 py-3.5 text-sm font-semibold cursor-pointer whitespace-nowrap active:scale-[0.97] transition-transform"
                >
                  Create Account &amp; View Order
                </button>
              ) : (
                <button
                  type="button"
                  onPointerDown={() => triggerHaptic("light")}
                  onClick={() => navigate("/my-orders")}
                  className="w-full ds-apple-btn-primary rounded-full px-6 py-3.5 text-sm font-semibold cursor-pointer whitespace-nowrap active:scale-[0.97] transition-transform"
                >
                  Go to My Orders Now
                </button>
              )}
            </div>
          </div>

          {/* Right / Receipt Breakdown Card */}
          <div className="lg:col-span-5 ds-apple-surface rounded-[28px] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-3.5">
              <div>
                <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  Payment Receipt Summary
                </h3>
                <p className="text-[11px] text-[#6E6E73] dark:text-[#98989D] font-mono tabular-nums mt-0.5">
                  #{orderId?.slice(0, 10).toUpperCase()}
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-[#248A3D] dark:text-[#30D158] shrink-0" />
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#6E6E73] dark:text-[#98989D]">Recipient Store</span>
                <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate max-w-[180px]">
                  {storeName}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#6E6E73] dark:text-[#98989D]">Amount Paid</span>
                <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                  {formatPrice(calculations.amountToPay)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#6E6E73] dark:text-[#98989D]">Payment Method</span>
                <span className="font-semibold uppercase text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {selectedMethod === "bkash" ? "bKash" : "Nagad"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#6E6E73] dark:text-[#98989D]">Sender Number</span>
                <span className="font-mono font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                  {senderNumber}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#6E6E73] dark:text-[#98989D]">Transaction ID</span>
                <span className="font-mono font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] uppercase truncate max-w-[170px]">
                  {trxId}
                </span>
              </div>
              {calculations.dueOnDelivery > 0 && (
                <div className="pt-2.5 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-2 text-xs">
                  <span className="text-[#6E6E73] dark:text-[#98989D]">Due on Delivery</span>
                  <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                    {formatPrice(calculations.dueOnDelivery)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const orderItemsList = Array.isArray(order?.items) ? order.items : [];
  const totalOrderQty = orderItemsList.reduce(
    (sum: number, item: any) => sum + (Number(item?.quantity) || 1),
    0
  );

  const paymentStepsMeta: {
    stepNum: 1 | 2 | 3;
    shortLabel: string;
    fullLabel: string;
    icon: React.ElementType;
  }[] = [
    { stepNum: 1, shortLabel: "1. Method", fullLabel: "01. Select Method", icon: CreditCard },
    { stepNum: 2, shortLabel: "2. Number", fullLabel: "02. Sender Number", icon: Smartphone },
    { stepNum: 3, shortLabel: "3. TrxID", fullLabel: "03. Verify Transaction", icon: ShieldCheck },
  ];

  // Shared Price Breakdown Rows for Mobile Drawer & Desktop Sticky Console
  const renderOrderFinancialBreakdown = () => (
    <div className="space-y-2.5 text-xs sm:text-sm">
      <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
        <span>Items Subtotal {totalOrderQty > 0 ? `(${totalOrderQty})` : ""}</span>
        <span className="font-semibold text-zinc-900 dark:text-white tabular-nums">
          {formatPrice(calculations.subtotal)}
        </span>
      </div>
      {order.type !== "subscription" && (
        <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
          <span>Delivery Charge</span>
          <span className="font-semibold text-zinc-900 dark:text-white tabular-nums">
            {formatPrice(calculations.deliveryFee)}
          </span>
        </div>
      )}
      {Number(order.discount) > 0 && (
        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
          <span>Discount</span>
          <span className="tabular-nums">-{formatPrice(order.discount)}</span>
        </div>
      )}

      <div className="pt-3 border-t border-slate-900/[0.08] dark:border-white/[0.1] flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-zinc-900 dark:text-white">
          Payable Now
        </span>
        <span className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white tabular-nums">
          {formatPrice(calculations.amountToPay)}
        </span>
      </div>

      <div className="pt-0.5 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
        <span>
          Order Total:{" "}
          <strong className="text-zinc-800 dark:text-zinc-200">
            {formatPrice(order.total || calculations.amountToPay)}
          </strong>
        </span>
        <span>·</span>
        <span>
          Due on Delivery:{" "}
          <strong className="text-zinc-800 dark:text-zinc-200">
            {formatPrice(calculations.dueOnDelivery)}
          </strong>
        </span>
      </div>
    </div>
  );

  return (
    <div className="ds-apple-shop-canvas w-full min-h-[calc(100vh-56px)] py-4 sm:py-7 lg:py-9 px-3.5 sm:px-6 pb-16">
      <div className="max-w-6xl mx-auto space-y-5 lg:space-y-7">
        {/* =====================================================================
            DESKTOP APPLE TRANSLUCENT TOP BAR (lg and up)
           ===================================================================== */}
        <div className="hidden lg:flex items-center justify-between gap-6 ds-apple-topbar rounded-[22px] px-7 py-4">
          <div className="min-w-0">
            <h1 className="ds-apple-display text-xl font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-nowrap">
              Secure Payment Gateway
            </h1>
            <p className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-0.5 tabular-nums">
              {storeName} · Ref {displayTrxRef} · Session expires in {formatCountdown(secondsLeft)}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="ds-apple-segmented p-1 rounded-full flex items-center gap-1">
              {paymentStepsMeta.map(({ stepNum, fullLabel, icon: StepIcon }) => {
                const isActive = step === stepNum;
                const isDone = step > stepNum;
                const isDisabled = stepNum === 3 && step === 1;
                return (
                  <button
                    key={stepNum}
                    type="button"
                    disabled={isDisabled}
                    onPointerDown={() => {
                      if (!isDisabled) triggerHaptic("light");
                    }}
                    onClick={() => jumpToPaymentStep(stepNum)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed ${
                      isActive
                        ? "bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-2xs"
                        : isDone
                          ? "text-[#0071E3] dark:text-[#0A84FF] hover:opacity-80"
                          : "text-[#6E6E73] dark:text-[#98989D]"
                    }`}
                  >
                    {isDone ? (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : (
                      <StepIcon className="w-3.5 h-3.5" />
                    )}
                    <span>{fullLabel}</span>
                  </button>
                );
              })}
            </div>

            <AuthVoiceToggle isInline />
          </div>
        </div>

        {/* =====================================================================
            MOBILE & TABLET HEADER + COLLAPSIBLE RECEIPT (< lg)
           ===================================================================== */}
        <div className="flex lg:hidden flex-col gap-3">
          {/* Mobile Title + Countdown + Voice Row */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="min-w-0">
              <h1 className="ds-apple-display text-lg sm:text-xl font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                Payment Gateway
              </h1>
              <p className="text-[11px] text-[#6E6E73] dark:text-[#98989D] flex items-center gap-1.5 tabular-nums">
                <Clock className="w-3 h-3 text-[#FF9500] shrink-0" />
                <span>{formatCountdown(secondsLeft)} left · Step {step}/3</span>
              </p>
            </div>
            <AuthVoiceToggle isInline />
          </div>

          {/* Mobile 3-Segment Stepper */}
          <div className="ds-apple-segmented rounded-full p-1 grid grid-cols-3 gap-1">
            {paymentStepsMeta.map(({ stepNum, shortLabel, icon: StepIcon }) => {
              const isActive = step === stepNum;
              const isDone = step > stepNum;
              const isDisabled = stepNum === 3 && step === 1;
              return (
                <button
                  key={stepNum}
                  type="button"
                  disabled={isDisabled}
                  onPointerDown={() => {
                    if (!isDisabled) triggerHaptic("light");
                  }}
                  onClick={() => jumpToPaymentStep(stepNum)}
                  className={`py-2 px-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed ${
                    isActive
                      ? "bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-2xs"
                      : isDone
                        ? "text-[#0071E3] dark:text-[#0A84FF]"
                        : "text-[#6E6E73] dark:text-[#98989D]"
                  }`}
                >
                  {isDone ? (
                    <Check className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                  ) : (
                    <StepIcon className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile Collapsible Merchant & Amount Receipt Sheet */}
          <div className="ds-apple-surface rounded-[22px] overflow-hidden">
            <button
              type="button"
              onPointerDown={() => triggerHaptic("light")}
              onClick={() => setShowAmountDropdown((prev) => !prev)}
              className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center font-medium text-xs text-[#1D1D1F] dark:text-[#F5F5F7] shrink-0 overflow-hidden">
                  {sellerProfile?.photoURL || sellerProfile?.avatarUrl ? (
                    <img
                      src={sellerProfile.photoURL || sellerProfile.avatarUrl}
                      alt={storeName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    storeName.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                    {storeName}
                  </div>
                  <div className="text-[11px] text-[#6E6E73] dark:text-[#98989D] font-mono tabular-nums truncate">
                    {displayTrxRef} · Breakdown
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-sm sm:text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                  {formatPrice(calculations.amountToPay)}
                </span>
                {showAmountDropdown ? (
                  <ChevronUp className="w-4 h-4 text-[#6E6E73]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#6E6E73]" />
                )}
              </div>
            </button>

            {showAmountDropdown && (
              <div className="px-4 pb-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] space-y-3">
                {orderItemsList.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {orderItemsList.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2.5 text-xs rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] p-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                            {item.name || item.title || "Item"}
                          </p>
                          <p className="text-[11px] text-[#6E6E73] dark:text-[#98989D] tabular-nums">
                            Qty: {item.quantity || 1}
                          </p>
                        </div>
                        <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums shrink-0">
                          {formatPrice((Number(item.price) || 0) * (Number(item.quantity) || 1))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {renderOrderFinancialBreakdown()}
              </div>
            )}
          </div>
        </div>

        {/* =====================================================================
            MAIN WORKSPACE GRID
            Mobile: Single focused Liquid Glass stage
            Desktop (lg+): 7-Col Active Payment Stage + 5-Col Sticky Receipt Console
           ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-7 items-start">
          {/* LEFT COLUMN: ACTIVE PAYMENT GATEWAY STAGE (7 cols on lg+) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Special Order Callouts (Courier / Border Offer) */}
            {calculations.isCourierPayment && (
              <div className="ds-liquid-callout-rose px-4 py-3 flex items-center gap-2.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>
                  Complete payment now to confirm courier booking; otherwise, the parcel may be returned within 1 day.
                </span>
              </div>
            )}

            {calculations.isBorderOffer && (
              <div className="ds-liquid-callout-amber px-4 py-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-semibold text-amber-900 dark:text-amber-200 block truncate">
                      Border Stock Offer Special Advance
                    </span>
                    <span className="text-[11px] text-amber-800/80 dark:text-amber-300/80 tabular-nums">
                      Pay now {formatPrice(calculations.amountToPay)}
                      {calculations.dueOnDelivery > 0
                        ? ` · Due on delivery ${formatPrice(calculations.dueOnDelivery)}`
                        : " · Full Payment"}
                    </span>
                  </div>
                </div>
                <span className="font-semibold text-amber-700 dark:text-amber-300 text-sm tabular-nums shrink-0 whitespace-nowrap">
                  {formatPrice(calculations.amountToPay)}
                </span>
              </div>
            )}

            {/* ==============================================================
                STEP 1: PAYMENT METHOD SELECTION
               ============================================================== */}
            <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="payment-step-1"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={shouldReduceMotion ? { duration: 0.14 } : APPLE_SPRING_SNAPPY}
                className="ds-apple-surface rounded-[26px] p-5 sm:p-7 space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
                  <div>
                    <h2 className="ds-apple-display text-base sm:text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                      Select Payment Method
                    </h2>
                    <p className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-0.5">
                      Choose your preferred mobile banking account
                    </p>
                  </div>

                  {/* Category Filter Dock */}
                  <div className="ds-apple-segmented rounded-full p-1 flex items-center gap-1 self-start sm:self-auto">
                    <button
                      type="button"
                      onPointerDown={() => triggerHaptic("light")}
                      onClick={() => setActiveTab("all")}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === "all"
                          ? "bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-2xs"
                          : "text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]"
                      }`}
                    >
                      All Methods
                    </button>
                    <button
                      type="button"
                      onPointerDown={() => triggerHaptic("light")}
                      onClick={() => setActiveTab("mfs")}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === "mfs"
                          ? "bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-2xs"
                          : "text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]"
                      }`}
                    >
                      Mobile Banking
                    </button>
                  </div>
                </div>

                {/* bKash & Nagad Refractive Method Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  {/* bKash Option */}
                  <button
                    type="button"
                    disabled={!hasBkashNumber}
                    onPointerDown={() => {
                      if (hasBkashNumber) triggerHaptic("light");
                    }}
                    onClick={() => {
                      if (!hasBkashNumber) {
                        notify("No bKash payment number is configured right now.", "error");
                        return;
                      }
                      setSelectedMethod("bkash");
                    }}
                    className={`p-5 rounded-[22px] text-left transition-all relative flex flex-col justify-between min-h-[132px] active:scale-[0.98] ${
                      !hasBkashNumber
                        ? "bg-[#F5F5F7] dark:bg-[#2C2C2E] opacity-45 cursor-not-allowed"
                        : selectedMethod === "bkash"
                          ? "ds-liquid-method-bkash cursor-pointer"
                          : "bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] hover:opacity-95 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <BkashLogo className="h-8 w-auto" />
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                          hasBkashNumber && selectedMethod === "bkash"
                            ? "bg-[#E2125B] text-white shadow-sm"
                            : "border border-slate-900/15 dark:border-white/20 text-transparent"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                        bKash Payment
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {hasBkashNumber
                          ? `${getMobileActionLabel(activeBkashAccount?.type)} · ${activeBkashAccount?.type || "Personal"} Number`
                          : "Currently unavailable"}
                      </p>
                    </div>
                  </button>

                  {/* Nagad Option */}
                  <button
                    type="button"
                    disabled={!hasNagadNumber}
                    onPointerDown={() => {
                      if (hasNagadNumber) triggerHaptic("light");
                    }}
                    onClick={() => {
                      if (!hasNagadNumber) {
                        notify("No Nagad payment number is configured right now.", "error");
                        return;
                      }
                      setSelectedMethod("nagad");
                    }}
                    className={`p-5 rounded-[22px] text-left transition-all relative flex flex-col justify-between min-h-[132px] active:scale-[0.98] ${
                      !hasNagadNumber
                        ? "bg-[#F5F5F7] dark:bg-[#2C2C2E] opacity-45 cursor-not-allowed"
                        : selectedMethod === "nagad"
                          ? "ds-liquid-method-nagad cursor-pointer"
                          : "bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] hover:opacity-95 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <NagadLogo className="h-8 w-auto" />
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                          hasNagadNumber && selectedMethod === "nagad"
                            ? "bg-[#F57C20] text-white shadow-sm"
                            : "border border-slate-900/15 dark:border-white/20 text-transparent"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                        Nagad Payment
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {hasNagadNumber
                          ? `${getMobileActionLabel(activeNagadAccount?.type)} · ${activeNagadAccount?.type || "Personal"} Number`
                          : "Currently unavailable"}
                      </p>
                    </div>
                  </button>
                </div>

                {!hasBkashNumber && !hasNagadNumber && (
                  <div className="ds-liquid-callout-rose p-3.5 text-xs font-semibold text-rose-700 dark:text-rose-300 text-center">
                    No bKash or Nagad number is active right now. Please contact the admin or seller.
                  </div>
                )}

                {/* Primary Proceed Action */}
                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    disabled={
                      (!hasBkashNumber && selectedMethod === "bkash") ||
                      (!hasNagadNumber && selectedMethod === "nagad")
                    }
                    onPointerDown={() => triggerHaptic("medium")}
                    onClick={() => {
                      if (selectedMethod === "bkash" && !hasBkashNumber) {
                        notify("bKash number is currently unavailable.", "error");
                        return;
                      }
                      if (selectedMethod === "nagad" && !hasNagadNumber) {
                        notify("Nagad number is currently unavailable.", "error");
                        return;
                      }
                      setStep(2);
                      speakPaymentStep(2);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`w-full rounded-full px-6 py-3.5 text-sm sm:text-base font-semibold flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed tabular-nums active:scale-[0.98] transition-transform ${
                      selectedMethod === "bkash"
                        ? "ds-liquid-btn-bkash"
                        : "ds-liquid-btn-nagad"
                    }`}
                  >
                    <span>Start Payment {formatPrice(calculations.amountToPay)}</span>
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onPointerDown={() => triggerHaptic("light")}
                      onClick={() => navigate("/my-orders")}
                      className="text-xs font-semibold text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Cancel &amp; Return to My Orders
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ==============================================================
                STEP 2: SENDER PHONE INPUT
               ============================================================== */}
            {step === 2 && (
              <motion.div
                key="payment-step-2"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={shouldReduceMotion ? { duration: 0.14 } : APPLE_SPRING_SNAPPY}
                className="ds-apple-surface rounded-[26px] p-5 sm:p-7 space-y-6"
              >
                <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
                  <div className="flex items-center gap-3">
                    {selectedMethod === "bkash" ? (
                      <BkashLogo className="h-7 w-auto" />
                    ) : (
                      <NagadLogo className="h-7 w-auto" />
                    )}
                    <span className="text-xs text-[#86868B]">·</span>
                    <span className="text-xs sm:text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-nowrap">
                      Verify Sender Number
                    </span>
                  </div>

                  <button
                    type="button"
                    onPointerDown={() => triggerHaptic("light")}
                    onClick={() => jumpToPaymentStep(1)}
                    className="px-3.5 py-1.5 ds-apple-btn-secondary rounded-full !min-h-0 !text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap active:scale-[0.97] transition-transform"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change Method</span>
                  </button>
                </div>

                {/* Brand-Tinted Phone Input Well */}
                <div
                  className={`p-5 sm:p-6 rounded-[22px] space-y-4 ${
                    selectedMethod === "bkash"
                      ? "ds-liquid-method-bkash"
                      : "ds-liquid-method-nagad"
                  }`}
                >
                  <div className="space-y-1 text-center">
                    <label
                      htmlFor="sender-phone-input"
                      className="text-xs font-medium uppercase tracking-wider text-[#6E6E73] dark:text-[#98989D] block"
                    >
                      Your Sender Mobile Number
                    </label>
                    <p className="text-xs sm:text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                      Enter the {selectedMethod === "bkash" ? "bKash" : "Nagad"} number you will send money from
                    </p>
                  </div>

                  <input
                    id="sender-phone-input"
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
                    className="ds-apple-input w-full h-13 px-4 rounded-2xl text-center text-lg sm:text-2xl font-semibold font-mono tabular-nums tracking-wider outline-none"
                    autoFocus
                  />

                  <p className="text-[11px] text-center text-[#6E6E73] dark:text-[#98989D]">
                    Your transaction will be matched against this number during verification
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onPointerDown={() => triggerHaptic("light")}
                    onClick={() => jumpToPaymentStep(1)}
                    className="sm:w-40 px-5 py-3 ds-apple-btn-secondary rounded-full text-xs sm:text-sm font-semibold cursor-pointer whitespace-nowrap active:scale-[0.97] transition-transform"
                  >
                    Previous Step
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => triggerHaptic("medium")}
                    onClick={handleProceedToStep3}
                    className="flex-1 px-6 py-3 ds-apple-btn-primary rounded-full text-sm sm:text-base font-semibold cursor-pointer whitespace-nowrap active:scale-[0.98] transition-transform"
                  >
                    Continue to Payment Details
                  </button>
                </div>
              </motion.div>
            )}

            {/* ==============================================================
                STEP 3: SEND MONEY DETAILS & TRXID VERIFICATION
               ============================================================== */}
            {step === 3 && (
              <motion.div
                key="payment-step-3"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={shouldReduceMotion ? { duration: 0.14 } : APPLE_SPRING_SNAPPY}
                className="ds-apple-surface rounded-[26px] p-5 sm:p-7 space-y-5"
              >
                <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {selectedMethod === "bkash" ? (
                      <BkashLogo className="h-7 w-auto shrink-0" />
                    ) : (
                      <NagadLogo className="h-7 w-auto shrink-0" />
                    )}
                    <span className="text-xs text-[#86868B]">·</span>
                    <span className="text-xs sm:text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                      Send Money &amp; Confirm TrxID
                    </span>
                  </div>

                  <button
                    type="button"
                    onPointerDown={() => triggerHaptic("light")}
                    onClick={() => jumpToPaymentStep(2)}
                    className="px-3.5 py-1.5 ds-apple-btn-secondary rounded-full !min-h-0 !text-xs flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap active:scale-[0.97] transition-transform"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change Number</span>
                  </button>
                </div>

                {/* Clear Action Instruction Well */}
                <div
                  className={`p-4 text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-100 leading-relaxed ${
                    selectedMethod === "bkash"
                      ? "ds-liquid-method-bkash"
                      : "ds-liquid-method-nagad"
                  }`}
                >
                  Open your <strong>{selectedMethod === "bkash" ? "bKash" : "Nagad"}</strong> app, choose{" "}
                  <strong>{currentActionLabel}</strong> ({currentAccountTypeLabel}), and send exactly{" "}
                  <strong className="tabular-nums">{formatPrice(calculations.amountToPay)}</strong> to the number below.
                </div>

                {/* 2-Column Copyable Receiver Number & Exact Amount Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Receiver Number Card */}
                  <div className="rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] p-4 flex flex-col justify-between gap-2.5">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[#6E6E73] dark:text-[#98989D]">
                      <span>{currentActionLabel} Number</span>
                      <span>{currentAccountTypeLabel}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-lg sm:text-xl font-semibold font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7] tracking-wide">
                        {currentReceiverNumber}
                      </span>
                      <button
                        type="button"
                        onPointerDown={() => triggerHaptic("light")}
                        onClick={() => handleCopy(currentReceiverNumber, "phone", "Number")}
                        className="px-3.5 py-1.5 ds-apple-btn-secondary rounded-full !min-h-0 !text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap active:scale-[0.96] transition-transform"
                      >
                        {copiedKey === "phone" ? (
                          <Check className="w-3.5 h-3.5 text-[#248A3D] dark:text-[#30D158]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedKey === "phone" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Exact Amount Card */}
                  <div className="rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] p-4 flex flex-col justify-between gap-2.5">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[#6E6E73] dark:text-[#98989D]">
                      <span>Amount to Send</span>
                      <span>Exact Amount</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-lg sm:text-xl font-semibold tabular-nums text-[#0071E3] dark:text-[#0A84FF] tracking-tight">
                        {formatPrice(calculations.amountToPay)}
                      </span>
                      <button
                        type="button"
                        onPointerDown={() => triggerHaptic("light")}
                        onClick={() =>
                          handleCopy(String(calculations.amountToPay), "amount", "Amount")
                        }
                        className="px-3.5 py-1.5 ds-apple-btn-secondary rounded-full !min-h-0 !text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap active:scale-[0.96] transition-transform"
                      >
                        {copiedKey === "amount" ? (
                          <Check className="w-3.5 h-3.5 text-[#248A3D] dark:text-[#30D158]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedKey === "amount" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Confirmed Sender Number Summary Row */}
                <div className="rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] px-4 py-3 flex items-center justify-between gap-2 text-xs">
                  <span className="text-[#6E6E73] dark:text-[#98989D]">
                    Your Sender Number:{" "}
                    <strong className="font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7] ml-1">
                      {senderNumber}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onPointerDown={() => triggerHaptic("light")}
                    onClick={() => jumpToPaymentStep(2)}
                    className="text-[#0071E3] dark:text-[#0A84FF] font-semibold hover:underline cursor-pointer whitespace-nowrap"
                  >
                    Change
                  </button>
                </div>

                {/* TrxID Input & Final Submit */}
                <div className="rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] p-4 sm:p-5 space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="trx-id-input"
                      className="text-xs sm:text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]"
                    >
                      Transaction ID (TrxID)
                    </label>
                    <span className="text-[11px] font-mono tabular-nums text-[#6E6E73] dark:text-[#98989D]">
                      {formatCountdown(secondsLeft)} left
                    </span>
                  </div>

                  <Input
                    id="trx-id-input"
                    type="text"
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !submitting) {
                        e.preventDefault();
                        handleConfirmFinalPayment();
                      }
                    }}
                    placeholder="e.g., 9J4K2LX9 or last 4 digits"
                    className="h-12 px-4 rounded-xl text-sm sm:text-base font-mono uppercase ds-apple-input"
                  />

                  <p className="text-[11px] text-[#6E6E73] dark:text-[#98989D] leading-relaxed">
                    Enter the TrxID or the last 4 digits from your confirmation SMS or app inbox after sending money.
                  </p>

                  <button
                    type="button"
                    onPointerDown={() => triggerHaptic("medium")}
                    onClick={handleConfirmFinalPayment}
                    disabled={submitting}
                    className={`w-full rounded-full px-6 py-3.5 text-sm sm:text-base font-semibold flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform ${
                      selectedMethod === "bkash"
                        ? "ds-liquid-btn-bkash"
                        : "ds-liquid-btn-nagad"
                    }`}
                  >
                    <span>
                      {submitting ? "Verifying Payment..." : "Confirm Payment"}
                    </span>
                  </button>
                </div>

                {/* Rotation Security Note */}
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#6E6E73] dark:text-[#98989D] text-center">
                  <RefreshCw className="w-3 h-3 shrink-0" />
                  <span>
                    For security reasons, the payment number may rotate when you refresh the page
                  </span>
                </div>
              </motion.div>
            )}
            </AnimatePresence>

            {/* Mobile Support Bar (< lg) */}
            <div className="flex lg:hidden items-center justify-between px-4 py-3 ds-apple-surface rounded-[20px] text-xs text-[#6E6E73] dark:text-[#98989D]">
              <button
                type="button"
                onPointerDown={() => triggerHaptic("light")}
                onClick={() => navigate("/help-center")}
                className="flex items-center gap-1.5 font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] hover:text-[#0071E3] dark:hover:text-[#0A84FF] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Headphones className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />
                <span>Support Center</span>
              </button>
              <div className="flex items-center gap-1.5 text-[#6E6E73] dark:text-[#98989D] whitespace-nowrap">
                <Lock className="w-3.5 h-3.5" />
                <span>Secure Gateway</span>
              </div>
            </div>
          </div>

          {/* ==============================================================
              RIGHT COLUMN: STICKY DESKTOP ORDER & RECEIPT CONSOLE (lg+)
             ============================================================== */}
          <aside className="hidden lg:block lg:col-span-5 lg:sticky lg:top-24 space-y-5">
            <div className="ds-apple-surface rounded-[26px] p-6 space-y-5">
              {/* Recipient Store Identity */}
              <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7] shrink-0 overflow-hidden">
                    {sellerProfile?.photoURL || sellerProfile?.avatarUrl ? (
                      <img
                        src={sellerProfile.photoURL || sellerProfile.avatarUrl}
                        alt={storeName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      storeName.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] text-[#6E6E73] dark:text-[#98989D] block">
                      Recipient Store
                    </span>
                    <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                      {storeName}
                    </h3>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] text-[#6E6E73] dark:text-[#98989D] block">
                    Reference
                  </span>
                  <span className="text-xs font-mono font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                    {displayTrxRef}
                  </span>
                </div>
              </div>

              {/* Order Items / Subscription Plan Preview */}
              {order.type === "subscription" ? (
                <div className="rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                      {order.planName || "VIP Pass Subscription"}
                    </p>
                    <p className="text-[11px] text-[#6E6E73] dark:text-[#98989D] tabular-nums">
                      Duration: {order.durationDays || 30} days
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums shrink-0">
                    {formatPrice(calculations.amountToPay)}
                  </span>
                </div>
              ) : (
                orderItemsList.length > 0 && (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#6E6E73] dark:text-[#98989D]">
                      <span className="flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Ordered Items</span>
                      </span>
                      <span className="tabular-nums">{totalOrderQty} {totalOrderQty === 1 ? "item" : "items"}</span>
                    </div>
                    {orderItemsList.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] p-3 flex items-center gap-3"
                      >
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name || "Product"}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-xl object-contain bg-white dark:bg-[#1C1C1E] p-1 shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-white dark:bg-[#1C1C1E] flex items-center justify-center shrink-0">
                            <ShoppingBag className="w-4 h-4 text-[#86868B]" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] line-clamp-1">
                            {item.name || item.title || "Item"}
                          </p>
                          <p className="text-[11px] text-[#6E6E73] dark:text-[#98989D] tabular-nums mt-0.5">
                            {item.quantity || 1} × {formatPrice(Number(item.price) || 0)}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums shrink-0">
                          {formatPrice((Number(item.price) || 0) * (Number(item.quantity) || 1))}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* Financial Breakdown */}
              <div className="rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] p-4">
                {renderOrderFinancialBreakdown()}
              </div>

              {/* Trust & Support Footer inside Desktop Console */}
              <div className="pt-1 flex items-center justify-between gap-3 text-xs text-[#6E6E73] dark:text-[#98989D]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF] shrink-0" />
                  <span>Verification takes 1–7 hours</span>
                </div>
                <button
                  type="button"
                  onPointerDown={() => triggerHaptic("light")}
                  onClick={() => navigate("/help-center")}
                  className="flex items-center gap-1.5 font-semibold text-[#0071E3] dark:text-[#0A84FF] hover:underline cursor-pointer whitespace-nowrap"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>Support Center</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Payment;
