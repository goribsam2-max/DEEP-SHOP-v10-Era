import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Star, 
  CreditCard, 
  CheckCircle2, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { doc, getDoc, updateDoc, increment, collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNotify } from './Notifications';
import { triggerHaptic } from '../lib/haptics';

interface GiftStarsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId?: string;
  targetUserName?: string;
}

export const GiftStarsModal: React.FC<GiftStarsModalProps> = ({
  isOpen,
  onClose,
  targetUserId,
  targetUserName = "Creator"
}) => {
  const notify = useNotify();
  const currentUser = auth.currentUser;

  // Mode: 'gift' or 'buy'
  const [mode, setMode] = useState<'gift' | 'buy'>('gift');
  const [giftStarsAmount, setGiftStarsAmount] = useState(50);
  const [buyStarsAmount, setBuyStarsAmount] = useState(100);

  // User stars balance
  const [userStarsBalance, setUserStarsBalance] = useState(0);
  const [purchasedStars, setPurchasedStars] = useState(0);

  // Payment form states for buying stars
  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentTxId, setPaymentTxId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const fetchUserStars = async () => {
      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          setUserStarsBalance(data.starsBalance || data.sparks || 0);
          setPurchasedStars(data.purchasedStars || 0);
        } else {
          // Check localStorage fallback
          const localSparks = Number(localStorage.getItem('user_deep_sparks') || '0');
          setUserStarsBalance(localSparks);
        }
      } catch (err) {
        console.warn("Could not fetch stars balance:", err);
      }
    };
    fetchUserStars();
  }, [currentUser, isOpen]);

  // Handle gifting stars to target user
  const handleGiftSubmit = async () => {
    if (!currentUser) {
      notify("Please sign in to gift stars!", "error");
      return;
    }
    if (!targetUserId) {
      notify("Select a creator to gift stars!", "error");
      return;
    }
    if (giftStarsAmount <= 0) {
      notify("Please enter a valid number of stars", "error");
      return;
    }

    if (userStarsBalance < giftStarsAmount) {
      notify(`You need ${giftStarsAmount} stars, but only have ${userStarsBalance} stars. Please buy stars to continue!`, "error");
      setBuyStarsAmount(giftStarsAmount - userStarsBalance > 100 ? giftStarsAmount - userStarsBalance : 100);
      setMode('buy');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Deduct from sender's stars balance
      const newSenderBal = userStarsBalance - giftStarsAmount;
      setUserStarsBalance(newSenderBal);
      localStorage.setItem('user_deep_sparks', String(newSenderBal));

      try {
        await updateDoc(doc(db, "users", currentUser.uid), {
          starsBalance: increment(-giftStarsAmount)
        });
      } catch (e) {}

      // 2. Add to recipient's earned stars balance
      try {
        await updateDoc(doc(db, "users", targetUserId), {
          earnedStars: increment(giftStarsAmount),
          totalStarsReceived: increment(giftStarsAmount)
        });
      } catch (e) {}

      // 3. Record star gift transaction
      await addDoc(collection(db, "star_gifts"), {
        senderUid: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
        recipientUid: targetUserId,
        recipientName: targetUserName,
        starsCount: giftStarsAmount,
        createdAt: Date.now()
      });

      triggerHaptic();
      notify(`Successfully gifted ${giftStarsAmount} ⭐ Stars to ${targetUserName}!`, "success");
      onClose();
    } catch (err) {
      notify("Failed to gift stars", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle purchasing stars via auto-connected payment
  const handleBuySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      notify("Please sign in to buy stars!", "error");
      return;
    }
    if (!paymentPhone || !paymentTxId) {
      notify("Please provide your bKash/Nagad phone number and Transaction ID", "error");
      return;
    }

    setIsSubmitting(true);
    const amountBDT = buyStarsAmount; // 1 Star = 1 BDT

    try {
      await addDoc(collection(db, "star_requests"), {
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
        userEmail: currentUser.email || "",
        starsRequested: buyStarsAmount,
        amountBDT,
        phone: paymentPhone,
        txId: paymentTxId,
        status: "pending",
        createdAt: Date.now()
      });

      triggerHaptic();
      notify(`Star purchase request submitted for ${buyStarsAmount} ⭐ Stars (৳${amountBDT})! Admin will verify your payment.`, "success");
      setPaymentPhone("");
      setPaymentTxId("");
      onClose();
    } catch (err) {
      notify("Failed to submit star purchase request", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 w-full max-w-sm shadow-2xl space-y-4 text-zinc-900 dark:text-zinc-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span className="font-extrabold text-sm">
                {mode === 'gift' ? `Gift Stars to ${targetUserName}` : 'Buy Stars ⭐'}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher Pills */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-xs font-extrabold">
            <button
              type="button"
              onClick={() => setMode('gift')}
              className={`py-2 rounded-xl transition cursor-pointer ${
                mode === 'gift'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              ⭐ Gift Stars
            </button>
            <button
              type="button"
              onClick={() => setMode('buy')}
              className={`py-2 rounded-xl transition cursor-pointer ${
                mode === 'buy'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              💳 Buy Stars
            </button>
          </div>

          {/* Available Stars Balance Indicator */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
            <span className="text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>Your Available Stars Balance:</span>
            </span>
            <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
              {userStarsBalance} ⭐
            </span>
          </div>

          {/* MODE 1: GIFT STARS */}
          {mode === 'gift' && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">
                  Select Stars Amount to Gift:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 50, 100, 500].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setGiftStarsAmount(count)}
                      className={`py-2.5 rounded-xl font-mono text-xs font-black transition cursor-pointer ${
                        giftStarsAmount === count
                          ? "bg-amber-500 text-white shadow-xs"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200"
                      }`}
                    >
                      {count} ⭐
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block mb-1">
                  Custom Stars Quantity:
                </label>
                <input
                  type="number"
                  min={1}
                  value={giftStarsAmount}
                  onChange={(e) => setGiftStarsAmount(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none font-mono font-bold"
                />
              </div>

              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Gifted stars go directly to {targetUserName}'s creator dashboard and can be withdrawn once reaching 1,000 stars (৳1,000).
              </p>

              <button
                type="button"
                onClick={handleGiftSubmit}
                disabled={isSubmitting}
                className="w-full py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : `Send ${giftStarsAmount} ⭐ Stars to ${targetUserName}`}
              </button>
            </div>
          )}

          {/* MODE 2: BUY STARS */}
          {mode === 'buy' && (
            <form onSubmit={handleBuySubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">
                  Select Stars Package (1 Star = ৳1 BDT):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[100, 500, 1000].map((pkg) => (
                    <button
                      key={pkg}
                      type="button"
                      onClick={() => setBuyStarsAmount(pkg)}
                      className={`p-2.5 rounded-xl text-center transition cursor-pointer ${
                        buyStarsAmount === pkg
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <span className="block font-mono font-black text-xs">{pkg} ⭐</span>
                      <span className="block text-[10px] opacity-80">৳{pkg} BDT</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block mb-1">
                  Custom Quantity (Auto BDT Calculation):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    value={buyStarsAmount}
                    onChange={(e) => setBuyStarsAmount(Math.max(10, parseInt(e.target.value) || 0))}
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none font-mono font-bold"
                  />
                  <div className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-mono font-black text-blue-600 dark:text-blue-400">
                    ৳{buyStarsAmount} BDT
                  </div>
                </div>
              </div>

              {/* bKash / Nagad Payment Instructions */}
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-xs space-y-1 font-mono">
                <span className="text-[10px] font-sans font-bold text-blue-800 dark:text-blue-300 block">
                  bKash / Nagad Personal Number:
                </span>
                <strong className="text-blue-600 dark:text-blue-400 text-sm block">01812345678</strong>
                <span className="text-[10px] font-sans text-zinc-500 block">
                  Send Money ৳{buyStarsAmount} then enter details below:
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block mb-1">
                  Your bKash/Nagad Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="017XXXXXXXX"
                  value={paymentPhone}
                  onChange={(e) => setPaymentPhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block mb-1">
                  Transaction ID (TrxID)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9J283HX10"
                  value={paymentTxId}
                  onChange={(e) => setPaymentTxId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none font-mono font-bold uppercase"
                  required
                />
              </div>

              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-600 dark:text-rose-400 leading-snug flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  <strong>Note:</strong> Purchased stars CANNOT be withdrawn. Only earned stars gifted by other users can be withdrawn by creators.
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : `Submit Order for ${buyStarsAmount} ⭐ Stars (৳${buyStarsAmount})`}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default GiftStarsModal;
