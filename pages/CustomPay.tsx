import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNotify } from "../components/Notifications";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CreditCard, Check, Loader2, Copy, Store } from "lucide-react";
import { formatPrice } from "../lib/utils";
import { APPLE_SPRING_DEFAULT } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

const CustomPay: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const prefersReducedMotion = useReducedMotion();

  const amount = searchParams.get("amount") || "";
  const sellerId = searchParams.get("sellerId") || "";

  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [loadingSeller, setLoadingSeller] = useState(true);
  const [logoError, setLogoError] = useState(false);

  // Form states
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchSeller = async () => {
      if (!sellerId) {
        setLoadingSeller(false);
        return;
      }
      try {
        const docRef = doc(db, "users", sellerId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSellerInfo(docSnap.data());
        }
      } catch (err) {
        console.error("Error fetching seller details:", err);
      } finally {
        setLoadingSeller(false);
      }
    };
    fetchSeller();
  }, [sellerId]);

  const copyToClipboard = (text: string, type: string) => {
    triggerHaptic("light");
    navigator.clipboard.writeText(text);
    notify(`${type} number copied to clipboard!`, "success");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !sellerId) {
      triggerHaptic("error");
      notify("Invalid payment link parameters.", "error");
      return;
    }
    if (!senderNumber || !trxId) {
      triggerHaptic("warning");
      notify("Please fill in all required fields.", "error");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser && (!guestName || !guestEmail)) {
      triggerHaptic("warning");
      notify("Please provide your name and email to proceed.", "error");
      return;
    }

    triggerHaptic("medium");
    setSubmitting(true);
    try {
      await addDoc(collection(db, "custom_payments"), {
        amount: Number(amount),
        sellerId: sellerId,
        userId: currentUser?.uid || "guest",
        userEmail: currentUser?.email || guestEmail,
        userName: currentUser?.displayName || guestName || "Guest User",
        senderNumber: senderNumber,
        trxId: trxId,
        status: "pending",
        createdAt: Date.now(),
      });
      triggerHaptic("success");
      setSubmitted(true);
      notify("Payment details submitted successfully!", "success");
    } catch (err) {
      console.error(err);
      triggerHaptic("error");
      notify("Failed to submit payment details.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSeller) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#000000] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-7 h-7 text-[#0071E3] dark:text-[#0A84FF] animate-spin mb-3" />
        <p className="text-[#6E6E73] dark:text-[#8E8E93] text-sm">Loading custom payment...</p>
      </div>
    );
  }

  if (!amount || !sellerId) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#000000] text-[#1D1D1F] dark:text-[#F5F5F7] flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[28px] p-8 max-w-sm w-full text-center border border-black/[0.06] dark:border-white/[0.1] shadow-sm">
          <p className="text-[#FF3B30] dark:text-[#FF453A] font-bold text-lg mb-2">Invalid Link</p>
          <p className="text-[#6E6E73] dark:text-[#8E8E93] text-xs mb-6">
            This custom payment link is broken or missing parameters.
          </p>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              navigate("/");
            }}
            className="w-full h-11 bg-[#0071E3] dark:bg-[#0A84FF] text-white rounded-full font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const shopName = sellerInfo?.shopName || "Our Shop";
  const shopLogo = sellerInfo?.photoURL || sellerInfo?.avatarUrl || "";

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#000000] text-[#1D1D1F] dark:text-[#F5F5F7] py-8 px-4 flex justify-center items-center transition-colors">
      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div
            key="form"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={prefersReducedMotion ? { duration: 0.15 } : APPLE_SPRING_DEFAULT}
            className="bg-white dark:bg-[#1C1C1E] w-full max-w-md rounded-[28px] shadow-sm border border-black/[0.06] dark:border-white/[0.1] p-6 md:p-8 flex flex-col gap-6"
          >
            {/* Header */}
            <div className="flex items-center gap-3.5 border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
              {shopLogo && !logoError ? (
                <img
                  src={shopLogo}
                  alt={shopName}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="w-12 h-12 rounded-full object-cover border border-black/[0.08] dark:border-white/[0.1]"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#F5F5F7] dark:bg-[#2C2C2E] flex items-center justify-center text-[#0071E3] dark:text-[#0A84FF]">
                  <Store className="w-5 h-5" />
                </div>
              )}
              <div>
                <h2 className="font-bold text-base leading-tight">{shopName}</h2>
                <p className="text-[#6E6E73] dark:text-[#8E8E93] text-xs font-medium">
                  Custom Payment Link
                </p>
              </div>
            </div>

            {/* Amount Banner */}
            <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E]/80 rounded-[22px] p-6 text-center border border-black/[0.05] dark:border-white/[0.08]">
              <span className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-[0.06em] block mb-1">
                Amount to Pay
              </span>
              <span className="text-3xl font-bold tracking-tight tabular-nums">
                {formatPrice(Number(amount))}
              </span>
            </div>

            {/* Merchant Methods */}
            <div className="flex flex-col gap-2.5">
              <h3 className="font-semibold text-xs text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-[0.04em]">
                Merchant Payment Methods
              </h3>

              {sellerInfo?.bkashNumber && (
                <div className="flex items-center justify-between bg-[#F5F5F7] dark:bg-[#2C2C2E]/70 p-3.5 rounded-[18px]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#E2125B]/12 flex items-center justify-center font-bold text-[#E2125B] text-xs">
                      bK
                    </div>
                    <div>
                      <p className="text-xs font-semibold">bKash (Personal)</p>
                      <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] font-mono tabular-nums mt-0.5">
                        {sellerInfo.bkashNumber}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(sellerInfo.bkashNumber, "bKash")}
                    className="ds-apple-icon-btn w-9 h-9 flex items-center justify-center active:scale-95 transition-transform"
                    aria-label="Copy bKash number"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              )}

              {sellerInfo?.nagadNumber && (
                <div className="flex items-center justify-between bg-[#F5F5F7] dark:bg-[#2C2C2E]/70 p-3.5 rounded-[18px]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F57C20]/12 flex items-center justify-center font-bold text-[#F57C20] text-xs font-mono">
                      N
                    </div>
                    <div>
                      <p className="text-xs font-semibold">Nagad (Personal)</p>
                      <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] font-mono tabular-nums mt-0.5">
                        {sellerInfo.nagadNumber}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(sellerInfo.nagadNumber, "Nagad")}
                    className="ds-apple-icon-btn w-9 h-9 flex items-center justify-center active:scale-95 transition-transform"
                    aria-label="Copy Nagad number"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              )}

              {!sellerInfo?.bkashNumber && !sellerInfo?.nagadNumber && (
                <p className="text-xs font-medium text-[#FF3B30] dark:text-[#FF453A] text-center py-3 bg-[#FF3B30]/8 rounded-[16px]">
                  No payment merchant details configured by the seller.
                </p>
              )}
            </div>

            {/* Submission Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <h3 className="font-semibold text-xs text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-[0.04em]">
                Submit Payment Details
              </h3>

              {!auth.currentUser && (
                <div className="flex flex-col gap-3 p-4 bg-[#F5F5F7] dark:bg-[#2C2C2E]/60 rounded-[20px]">
                  <p className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-[0.04em]">
                    Guest Contact Info
                  </p>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93]">
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g., John Doe"
                      className="ds-apple-input w-full h-11 px-3.5 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93]">
                      Your Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="e.g., john@example.com"
                      className="ds-apple-input w-full h-11 px-3.5 text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93]">
                  Sender Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  placeholder="e.g., 017XXXXXXXX"
                  className="ds-apple-input w-full h-11 px-3.5 text-sm tabular-nums"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93]">
                  Transaction ID (TrxID)
                </label>
                <input
                  type="text"
                  required
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  placeholder="e.g., A7B89CF2"
                  className="ds-apple-input w-full h-11 px-3.5 text-sm font-mono uppercase"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 bg-[#0071E3] dark:bg-[#0A84FF] hover:opacity-95 active:scale-[0.98] disabled:opacity-45 text-white font-semibold text-sm rounded-full transition-all flex items-center justify-center gap-2 mt-2"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Submit Custom Payment</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="submitted"
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={prefersReducedMotion ? { duration: 0.15 } : APPLE_SPRING_DEFAULT}
            className="bg-white dark:bg-[#1C1C1E] w-full max-w-md rounded-[28px] shadow-sm border border-black/[0.06] dark:border-white/[0.1] p-8 text-center flex flex-col items-center gap-6"
          >
            <div className="w-16 h-16 bg-[#248A3D]/12 dark:bg-[#30D158]/15 rounded-full flex items-center justify-center text-[#248A3D] dark:text-[#30D158]">
              <Check className="w-8 h-8" />
            </div>

            <div>
              <h2 className="font-bold text-xl">Payment Details Submitted</h2>
              <p className="text-[#6E6E73] dark:text-[#8E8E93] text-sm mt-2 leading-relaxed">
                Your payment verification request of{" "}
                <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                  {formatPrice(Number(amount))}
                </span>{" "}
                has been sent to the seller.
              </p>
              <p className="text-[#8E8E93] text-xs mt-2">
                TrxID: <span className="font-mono font-semibold">{trxId}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                navigate("/orders");
              }}
              className="w-full h-12 bg-[#0071E3] dark:bg-[#0A84FF] text-white rounded-full font-semibold text-sm active:scale-[0.98] transition-transform"
            >
              Go to My Orders
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomPay;
