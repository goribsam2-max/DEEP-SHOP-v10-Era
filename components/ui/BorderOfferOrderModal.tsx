import React, { useState } from "react";
import { Product } from "../../types";
import { formatPrice } from "../../lib/utils";
import { X, Zap, ShieldCheck, Lock, ArrowRight, Smartphone, MapPin, Phone, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNotify } from "../Notifications";
import { triggerHaptic } from "../../lib/haptics";

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

  const [customerName, setCustomerName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [altNumber, setAltNumber] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [district, setDistrict] = useState("Dhaka");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !product) return null;

  const displayPrice = product.offerPrice && product.offerPrice < product.price ? product.offerPrice : product.price;
  const deliveryFee = district.toLowerCase().includes("dhaka") ? 80 : 130;
  const grandTotal = displayPrice + deliveryFee;

  const dedicatedAdvance = (product.borderOfferAdvanceAmount !== undefined && product.borderOfferAdvanceAmount !== null && Number(product.borderOfferAdvanceAmount) > 0)
    ? Number(product.borderOfferAdvanceAmount)
    : ((product.advanceAmount !== undefined && product.advanceAmount !== null && Number(product.advanceAmount) > 0)
        ? Number(product.advanceAmount)
        : grandTotal);

  const payableAdvance = Math.min(grandTotal, dedicatedAdvance);
  const dueAmount = Math.max(0, grandTotal - payableAdvance);
  const isFullAdvance = payableAdvance >= grandTotal;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();

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
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#141416] text-white rounded-t-[28px] sm:rounded-[28px] border border-amber-500/30 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col font-inter">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-amber-950/80 via-zinc-900 to-amber-950/80 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4 fill-amber-400 stroke-none" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-amber-300">
                বর্ডার স্টক ফোন অফার বুকিং
              </h3>
              <p className="text-[10px] text-zinc-400">
                ১০০% ফুল এডভান্স পেমেন্ট অর্ডারের মাধ্যমে বুক করুন
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmitOrder} className="p-4 overflow-y-auto space-y-4 text-xs no-scrollbar">
          
          {/* Selected Product Summary Card */}
          <div className="bg-zinc-900/90 border border-amber-500/30 rounded-2xl p-3 flex items-center gap-3">
            <img
              src={product.image}
              alt={product.name}
              className="w-16 h-16 object-contain bg-zinc-950 rounded-xl p-1 border border-zinc-800"
            />
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider">
                BORDER PHONE OFFER
              </span>
              <h4 className="font-bold text-sm text-zinc-100 truncate mt-0.5">
                {product.name}
              </h4>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-black text-amber-400 text-sm">
                  {formatPrice(displayPrice)}
                </span>
                <span className="text-[10px] text-zinc-500">
                  + ডেলিভারি ৳{deliveryFee}
                </span>
              </div>
            </div>
          </div>

          {/* Advance Mandatory Alert Box */}
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{isFullAdvance ? "১০০% ফুল এডভান্স প্রযোজ্য" : "অফার বুকিং এডভান্স প্রযোজ্য"}</span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              {isFullAdvance
                ? `বর্ডার স্টক লিমিটেড ফোন অফারের ক্ষেত্রে সম্পূর্ণ ${formatPrice(payableAdvance)} টাকা এডভান্স পেমেন্ট করতে হবে। পেমেন্ট সম্পন্ন হওয়ার পর ডেলিভারি নিশ্চিত করা হবে।`
                : `বর্ডার স্টক অফার কনফার্মেশনের জন্য নির্ধারিত ${formatPrice(payableAdvance)} টাকা এডভান্স পেমেন্ট করতে হবে। বাকি ${formatPrice(dueAmount)} টাকা ডেলিভারির সময় প্রদেয় হবে।`}
            </p>
          </div>

          {/* User Address Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-zinc-300 font-bold mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>আপনার নাম *</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="উদাহরণ: তানজিম আহমেদ"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/80"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-300 font-bold mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>ফোন নম্বর *</span>
                </label>
                <input
                  type="tel"
                  required
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/80"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">
                  বিকল্প ফোন নম্বর (ঐচ্ছিক)
                </label>
                <input
                  type="tel"
                  value={altNumber}
                  onChange={(e) => setAltNumber(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/80"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 font-bold mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>সম্পুর্ন ডেলিভারি ঠিকানা *</span>
              </label>
              <textarea
                rows={2}
                required
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="বাসা/হোল্ডিং নং, রোড নং, এরিয়া, থানা..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/80 resize-none"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-bold mb-1">
                জেলা / বিভাগ সিলেক্ট করুন
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/80 cursor-pointer"
              >
                <option value="Dhaka">ঢাকার ভেতরে (ডেলিভারি চার্জ ৳৮০)</option>
                <option value="Outside Dhaka">ঢাকার বাহিরে (ডেলিভারি চার্জ ৳১৩০)</option>
              </select>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="bg-zinc-900/60 rounded-2xl p-3 border border-zinc-800 space-y-1.5 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>ফোনের দাম:</span>
              <span>{formatPrice(displayPrice)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>ডেলিভারি চার্জ:</span>
              <span>৳{deliveryFee}</span>
            </div>
            <div className="flex justify-between text-zinc-400 pt-1 border-t border-zinc-800/80">
              <span>সর্বমোট মূল্য:</span>
              <span>{formatPrice(grandTotal)}</span>
            </div>
            <div className="flex justify-between font-black text-amber-400 text-sm pt-1 border-t border-zinc-800">
              <span>প্রদেয় এডভান্স টাকা:</span>
              <span>{formatPrice(payableAdvance)}</span>
            </div>
            {dueAmount > 0 && (
              <div className="flex justify-between text-zinc-400 text-[11px]">
                <span>বাকি (ডেলিভারির সময় প্রদেয়):</span>
                <span>{formatPrice(dueAmount)}</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-110 text-black font-black text-xs shadow-lg shadow-amber-500/20 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            <span>পেমেন্ট পেইজে যান (এডভান্স {formatPrice(payableAdvance)})</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </form>

      </div>
    </div>
  );
};
