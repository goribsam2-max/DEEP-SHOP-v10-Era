import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Order } from "../types";
import { useNotify } from "../components/Notifications";
import Icon from "../components/Icon";
import { CreditCard, ShieldCheck, Clock } from "lucide-react";
import { formatPrice } from "../lib/utils";
import { CartCheckoutPageSkeleton } from "../components/PageSkeletons";
import { motion, useReducedMotion } from "framer-motion";
import { APPLE_SPRING_DEFAULT } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

export default function CourierPayment() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const prefersReducedMotion = useReducedMotion();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    const fetchOrder = async () => {
      try {
        const docRef = doc(db, "orders", orderId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
        } else {
          notify("Order not found", "error");
          navigate(-1);
        }
      } catch (err) {
        notify("Failed to load order", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return <CartCheckoutPageSkeleton />;
  }

  if (!order) return null;

  const totalAmount = order.totalAmount || 0;
  const payAmount = Math.ceil(totalAmount * 0.2); // 20%

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderNumber.trim() || !trxId.trim()) {
      triggerHaptic("warning");
      notify("Please fill all required fields", "error");
      return;
    }

    triggerHaptic("medium");
    setSubmitting(true);
    try {
      await updateDoc(doc(db, "orders", order.id), {
        courierPaymentStatus: "checking",
        courierPaymentDetails: {
          senderNumber: senderNumber.trim(),
          trxId: trxId.trim(),
          amount: payAmount,
          date: Date.now(),
        },
      });
      triggerHaptic("success");
      notify("Payment details submitted successfully!", "success");
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              courierPaymentStatus: "checking",
              courierPaymentDetails: {
                senderNumber: senderNumber.trim(),
                trxId: trxId.trim(),
                amount: payAmount,
                date: Date.now(),
              },
            }
          : prev
      );
    } catch (err) {
      triggerHaptic("error");
      notify("Failed to submit payment", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ds-apple-shop-canvas min-h-screen bg-[#F5F5F7] dark:bg-[#000000] text-[#1D1D1F] dark:text-[#F5F5F7] flex flex-col transition-colors">
      <div className="flex-1 p-4 max-w-lg w-full mx-auto pb-24 pt-5 sm:pt-7">
        <div className="mb-5 px-1">
          <h1 className="ds-apple-display text-[24px] font-bold tracking-tight">
            Courier Processing
          </h1>
          <p className="text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] tabular-nums mt-0.5">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        {order.courierPaymentStatus === "completed" ? (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={prefersReducedMotion ? { duration: 0.15 } : APPLE_SPRING_DEFAULT}
            className="bg-white dark:bg-[#1C1C1E] border border-[#248A3D]/25 dark:border-[#30D158]/25 rounded-[28px] p-6 sm:p-8 text-center shadow-sm"
          >
            <div className="w-16 h-16 bg-[#248A3D]/12 dark:bg-[#30D158]/15 rounded-full flex items-center justify-center mx-auto mb-4 text-[#248A3D] dark:text-[#30D158]">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
              Payment Verified
            </h2>
            <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93] mb-6">
              Your courier payment has been verified. Here are the delivery details:
            </p>
            <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-[20px] p-4 text-left space-y-3">
              <div>
                <p className="text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93]">
                  Courier Name
                </p>
                <p className="text-sm font-semibold mt-0.5">{order.courierName || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93]">
                  Delivery Rider Number
                </p>
                <p className="text-sm font-semibold text-[#0071E3] dark:text-[#0A84FF] tabular-nums mt-0.5">
                  {order.riderNumber || "N/A"}
                </p>
              </div>
            </div>
          </motion.div>
        ) : order.courierPaymentStatus === "checking" ? (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={prefersReducedMotion ? { duration: 0.15 } : APPLE_SPRING_DEFAULT}
            className="bg-white dark:bg-[#1C1C1E] border border-[#FF9500]/25 dark:border-[#FF9F0A]/25 rounded-[28px] p-6 sm:p-8 text-center shadow-sm"
          >
            <div className="w-16 h-16 bg-[#FF9500]/12 dark:bg-[#FF9F0A]/15 rounded-full flex items-center justify-center mx-auto mb-4 text-[#FF9500] dark:text-[#FF9F0A]">
              <Clock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold mb-2">Payment Verification Pending</h2>
            <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93]">
              We are currently verifying your courier payment. This usually completes within minutes.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0.15 } : APPLE_SPRING_DEFAULT}
            className="space-y-5"
          >
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[24px] p-5 sm:p-6 border border-black/[0.06] dark:border-white/[0.1] shadow-sm">
              <div className="flex items-center gap-3 mb-3.5">
                <div className="w-11 h-11 bg-[#FF3B30]/10 dark:bg-[#FF453A]/15 rounded-2xl flex items-center justify-center text-[#FF3B30] dark:text-[#FF453A] shrink-0">
                  <Icon name="alert-circle" className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold leading-tight">Action Required</h2>
                  <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                    Please clear your courier balance
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-[#3A3A3C] dark:text-[#D1D1D6]">
                দয়া করে বকেয়া টাকার{" "}
                <span className="text-[#FF3B30] dark:text-[#FF453A] font-bold tabular-nums">
                  ২০% ({formatPrice(payAmount)})
                </span>{" "}
                পেমেন্ট করুন।{" "}
                <span className="text-[#FF3B30] dark:text-[#FF453A] font-semibold">
                  পেমেন্ট না করলে ১ দিনের মধ্যে কুরিয়ার থেকে প্রোডাক্ট রিটার্ন চলে যাবে।
                </span>
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="bg-white dark:bg-[#1C1C1E] rounded-[24px] p-5 sm:p-6 border border-black/[0.06] dark:border-white/[0.1] shadow-sm space-y-5"
            >
              <div className="flex items-center justify-between p-4 bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-[18px] tabular-nums">
                <span className="text-sm font-medium text-[#6E6E73] dark:text-[#8E8E93]">
                  Payable Amount
                </span>
                <span className="text-xl font-bold text-[#0071E3] dark:text-[#0A84FF]">
                  {formatPrice(payAmount)}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#6E6E73] dark:text-[#8E8E93] block mb-2">
                  Sender Number *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Icon name="phone" className="w-4 h-4 text-[#8E8E93]" />
                  </div>
                  <input
                    type="tel"
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                    required
                    placeholder="e.g. 01700000000"
                    className="ds-apple-input w-full pl-11 pr-4 py-3.5 text-sm font-medium tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#6E6E73] dark:text-[#8E8E93] block mb-2">
                  Transaction ID (TrxID) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Icon name="hash" className="w-4 h-4 text-[#8E8E93]" />
                  </div>
                  <input
                    type="text"
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    required
                    placeholder="e.g. 8A7B6C5D4E"
                    className="ds-apple-input w-full pl-11 pr-4 py-3.5 text-sm font-mono font-semibold uppercase"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !senderNumber.trim() || !trxId.trim()}
                className="w-full h-12 bg-[#0071E3] dark:bg-[#0A84FF] hover:opacity-95 active:scale-[0.98] disabled:opacity-45 text-white rounded-full font-semibold text-[15px] transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span className="w-28 h-4 rounded-full bg-white/30 animate-pulse inline-block" />
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Submit Payment</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
