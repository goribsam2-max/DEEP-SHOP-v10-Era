import React, { useState } from "react";
import { Product } from "../../types";
import { formatPrice } from "../../lib/utils";
import { X, Zap, Lock, ArrowRight, MapPin, Phone, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { collection, addDoc } from "firebase/firestore";
import { useNotify } from "../Notifications";
import { triggerHaptic } from "../../lib/haptics";
import { getProductDisplayImage } from "../../src/lib/phonePartsArt";
import { AnimatePresence, motion, PanInfo, useReducedMotion } from "framer-motion";
import { APPLE_SPRING_DEFAULT, projectMomentum } from "../../lib/shoppingRoute";

interface BorderOfferOrderModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BorderOfferOrderModal: React.FC<BorderOfferOrderModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const notify = useNotify();
  const prefersReducedMotion = useReducedMotion();

  const [customerName, setCustomerName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [altNumber, setAltNumber] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [district, setDistrict] = useState("Dhaka");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !product) return null;

  const displayPrice =
    product.offerPrice && product.offerPrice < product.price
      ? product.offerPrice
      : product.price;
  const deliveryFee = district.toLowerCase().includes("dhaka") ? 80 : 130;
  const grandTotal = displayPrice + deliveryFee;

  const dedicatedAdvance =
    product.borderOfferAdvanceAmount !== undefined &&
    product.borderOfferAdvanceAmount !== null &&
    Number(product.borderOfferAdvanceAmount) > 0
      ? Number(product.borderOfferAdvanceAmount)
      : product.advanceAmount !== undefined &&
          product.advanceAmount !== null &&
          Number(product.advanceAmount) > 0
        ? Number(product.advanceAmount)
        : grandTotal;

  const payableAdvance = Math.min(grandTotal, dedicatedAdvance);
  const dueAmount = Math.max(0, grandTotal - payableAdvance);
  const isFullAdvance = payableAdvance >= grandTotal;

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const projectedY = info.offset.y + projectMomentum(info.velocity.y, 0.994);
    if (projectedY > 110 || info.velocity.y > 420) {
      triggerHaptic("light");
      onClose();
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic("medium");

    if (!customerName.trim()) {
      notify("অনুগ্রহ করে আপনার নাম লিখুন", "error");
      return;
    }
    if (!contactNumber.trim() || contactNumber.length < 11) {
      notify("সঠিক ১১ ডিজিটের ফোন নম্বর দিন", "error");
      return;
    }
    if (!shippingAddress.trim()) {
      notify("অনুগ্রহ করে আপনার ঠিকানা লিখুন", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const user = auth.currentUser;
      const orderPayload = {
        userId: user?.uid || "guest",
        customerName: customerName.trim(),
        contactNumber: contactNumber.trim(),
        altNumber: altNumber.trim() || "",
        shippingAddress: `${shippingAddress.trim()}, ${district}`,
        items: [
          {
            productId: product.id,
            name: product.name,
            quantity: 1,
            priceAtPurchase: displayPrice,
            price: displayPrice,
            image: product.image,
            isBorderOffer: true,
            productType: "border_offer",
            storage: product.storage || "",
            condition: product.condition || "",
            warranty: product.warranty || "",
            borderOfferAdvanceAmount: payableAdvance,
          },
        ],
        subTotal: displayPrice,
        deliveryFee: deliveryFee,
        total: grandTotal,
        advanceAmount: payableAdvance,
        dueAmount: dueAmount,
        status: "Checking Payment",
        paymentMethod: "bKash / Nagad / Rocket",
        paymentOption: isFullAdvance ? "Full Payment" : "Custom Advance",
        productClassification: "Border Stock Phone Offer",
        isBorderOffer: true,
        createdAt: Date.now(),
      };

      const docRef = await addDoc(collection(db, "orders"), orderPayload);
      notify("বর্ডার স্টক অফার অর্ডার পেমেন্ট পেইজে রিডাইরেক্ট করা হচ্ছে...", "info");
      onClose();
      navigate(`/payment/${docRef.id}`);
    } catch (err: any) {
      console.error("Order creation error:", err);
      notify("অর্ডার প্রক্রিয়াকরণে সমস্যা হয়েছে", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="ds-apple-portal fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-5">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.14 : 0.18 }}
          onClick={() => {
            triggerHaptic("light");
            onClose();
          }}
          className="ds-apple-backdrop fixed inset-0"
        />

        <motion.div
          role="dialog"
          aria-modal="true"
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.97 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
          transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_DEFAULT}
          drag={prefersReducedMotion ? false : "y"}
          dragConstraints={{ top: 0 }}
          dragElastic={{ top: 0.06, bottom: 0.5 }}
          onDragEnd={handleDragEnd}
          onClick={(e) => e.stopPropagation()}
          className="ds-apple-sheet relative z-10 w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] overflow-hidden max-h-[90dvh] flex flex-col"
        >
          {/* Mobile Grabber */}
          <div className="sm:hidden flex justify-center pt-2.5 pb-1">
            <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
          </div>

          {/* Header */}
          <div className="px-5 py-4 border-b border-black/8 dark:border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/12 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <div className="min-w-0">
                <h3 className="ds-apple-display font-bold text-[15px] text-[#1d1d1f] dark:text-[#f5f5f7] truncate">
                  বর্ডার স্টক ফোন অফার বুকিং
                </h3>
                <p className="text-[11px] text-[#6e6e73] dark:text-[#98989d] truncate">
                  ১০০% নিরাপদ এডভান্স পেমেন্ট অর্ডারের মাধ্যমে বুক করুন
                </p>
              </div>
            </div>

            <button
              type="button"
              onPointerDown={() => triggerHaptic("light")}
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full bg-black/[0.06] dark:bg-white/[0.1] hover:bg-black/[0.1] dark:hover:bg-white/[0.16] text-[#1d1d1f] dark:text-[#f5f5f7] flex items-center justify-center transition-transform active:scale-95 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmitOrder}
            className="p-5 overflow-y-auto space-y-4 text-xs hide-scrollbar"
          >
            {/* Selected Product Summary Card */}
            <div className="rounded-2xl bg-[#f5f5f7] dark:bg-[#2c2c2e] border border-black/[0.06] dark:border-white/[0.08] p-3 flex items-center gap-3">
              <img
                src={getProductDisplayImage(product)}
                alt={product.name}
                className="w-16 h-16 object-contain bg-white dark:bg-[#1c1c1e] rounded-xl p-1.5 border border-black/[0.06] dark:border-white/[0.08] shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className="inline-block text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/12 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Border Offer
                </span>
                <h4 className="font-bold text-[14px] text-[#1d1d1f] dark:text-[#f5f5f7] truncate mt-1">
                  {product.name}
                </h4>
                <div className="flex items-baseline gap-2 mt-0.5 tabular-nums">
                  <span className="font-bold text-[#0071E3] dark:text-[#0A84FF] text-[15px]">
                    {formatPrice(displayPrice)}
                  </span>
                  <span className="text-[11px] text-[#6e6e73] dark:text-[#98989d]">
                    + ডেলিভারি ৳{deliveryFee}
                  </span>
                </div>
              </div>
            </div>

            {/* Advance Notice */}
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-xs">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isFullAdvance ? "১০০% ফুল এডভান্স প্রযোজ্য" : "অফার বুকিং এডভান্স প্রযোজ্য"}
                </span>
              </div>
              <p className="text-[11px] text-[#6e6e73] dark:text-[#d1d1d6] leading-relaxed">
                {isFullAdvance
                  ? `বর্ডার স্টক লিমিটেড ফোন অফারের ক্ষেত্রে সম্পূর্ণ ${formatPrice(payableAdvance)} টাকা এডভান্স পেমেন্ট করতে হবে। পেমেন্ট সম্পন্ন হওয়ার পর ডেলিভারি নিশ্চিত করা হবে।`
                  : `বর্ডার স্টক অফার কনফার্মেশনের জন্য নির্ধারিত ${formatPrice(payableAdvance)} টাকা এডভান্স পেমেন্ট করতে হবে। বাকি ${formatPrice(dueAmount)} টাকা ডেলিভারির সময় প্রদেয় হবে।`}
              </p>
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-[#1d1d1f] dark:text-[#f5f5f7] font-semibold mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#0A84FF]" />
                  <span>আপনার নাম *</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="উদাহরণ: তানজিম আহমেদ"
                  className="ds-apple-input w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#1d1d1f] dark:text-[#f5f5f7] font-semibold mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#0A84FF]" />
                    <span>ফোন নম্বর *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="ds-apple-input w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-[#6e6e73] dark:text-[#98989d] font-medium mb-1.5">
                    বিকল্প ফোন নম্বর (ঐচ্ছিক)
                  </label>
                  <input
                    type="tel"
                    value={altNumber}
                    onChange={(e) => setAltNumber(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="ds-apple-input w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#1d1d1f] dark:text-[#f5f5f7] font-semibold mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#0A84FF]" />
                  <span>সম্পূর্ণ ডেলিভারি ঠিকানা *</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="বাসা/হোল্ডিং নং, রোড নং, এরিয়া, থানা..."
                  className="ds-apple-input w-full rounded-xl p-3 text-[13px] outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[#1d1d1f] dark:text-[#f5f5f7] font-semibold mb-1.5">
                  জেলা / বিভাগ সিলেক্ট করুন
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="ds-apple-input w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none cursor-pointer"
                >
                  <option value="Dhaka">ঢাকার ভেতরে (ডেলিভারি চার্জ ৳৮০)</option>
                  <option value="Outside Dhaka">ঢাকার বাহিরে (ডেলিভারি চার্জ ৳১৩০)</option>
                </select>
              </div>
            </div>

            {/* Pricing Summary */}
            <div className="bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-2xl p-3.5 border border-black/[0.06] dark:border-white/[0.08] space-y-1.5 text-xs tabular-nums">
              <div className="flex justify-between text-[#6e6e73] dark:text-[#98989d]">
                <span>ফোনের দাম:</span>
                <span>{formatPrice(displayPrice)}</span>
              </div>
              <div className="flex justify-between text-[#6e6e73] dark:text-[#98989d]">
                <span>ডেলিভারি চার্জ:</span>
                <span>৳{deliveryFee}</span>
              </div>
              <div className="flex justify-between text-[#1d1d1f] dark:text-[#f5f5f7] pt-1.5 border-t border-black/[0.06] dark:border-white/[0.08]">
                <span>সর্বমোট মূল্য:</span>
                <span className="font-semibold">{formatPrice(grandTotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-[#0071E3] dark:text-[#0A84FF] text-[14px] pt-1.5 border-t border-black/[0.06] dark:border-white/[0.08]">
                <span>প্রদেয় এডভান্স টাকা:</span>
                <span>{formatPrice(payableAdvance)}</span>
              </div>
              {dueAmount > 0 && (
                <div className="flex justify-between text-[#6e6e73] dark:text-[#98989d] text-[11px]">
                  <span>বাকি (ডেলিভারির সময় প্রদেয়):</span>
                  <span>{formatPrice(dueAmount)}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              onPointerDown={() => triggerHaptic("light")}
              className="ds-apple-btn-primary w-full min-h-[48px] rounded-full font-semibold text-[14px] active:scale-[0.97] transition-transform flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 pb-[env(safe-area-inset-bottom,0px)]"
            >
              <span>পেমেন্ট পেইজে যান (এডভান্স {formatPrice(payableAdvance)})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
