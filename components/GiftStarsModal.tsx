import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Star,
  Sparkles,
  AlertCircle,
  Check,
  Copy,
} from "lucide-react";
import {
  doc,
  getDoc,
  updateDoc,
  increment,
  collection,
  addDoc,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNotify } from "./Notifications";
import { triggerHaptic } from "../lib/haptics";
import {
  extractConfiguredMobileAccounts,
  getMobileActionLabel,
  getNextRefreshSeed,
  pickAccountBySeed,
} from "../lib/dhakaTime";

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
  targetUserName = "Creator",
}) => {
  const notify = useNotify();
  const currentUser = auth.currentUser;

  const [mode, setMode] = useState<"gift" | "buy">("gift");
  const [giftStarsAmount, setGiftStarsAmount] = useState(50);
  const [buyStarsAmount, setBuyStarsAmount] = useState(100);

  const [userStarsBalance, setUserStarsBalance] = useState(0);

  // Admin Dashboard payment accounts ONLY (rotates 1 number per refresh/open)
  const [paymentsDoc, setPaymentsDoc] = useState<Record<string, any> | null>(
    null
  );
  const [platformDoc, setPlatformDoc] = useState<Record<string, any> | null>(
    null
  );
  const [selectedProvider, setSelectedProvider] = useState<"bKash" | "Nagad">(
    "bKash"
  );
  const [refreshSeed, setRefreshSeed] = useState<number>(() =>
    getNextRefreshSeed("modal_buy_stars")
  );
  const [copied, setCopied] = useState(false);

  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentTxId, setPaymentTxId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRefreshSeed(getNextRefreshSeed("modal_buy_stars"));
    }
  }, [isOpen]);

  useEffect(() => {
    const unsubPay = onSnapshot(
      doc(db, "settings", "payments"),
      (snap) => setPaymentsDoc(snap.exists() ? snap.data() : null),
      () => setPaymentsDoc(null)
    );
    const unsubPlat = onSnapshot(
      doc(db, "settings", "platform"),
      (snap) => setPlatformDoc(snap.exists() ? snap.data() : null),
      () => setPlatformDoc(null)
    );
    return () => {
      unsubPay();
      unsubPlat();
    };
  }, []);

  useEffect(() => {
    if (!currentUser || !isOpen) return;
    const fetchUserStars = async () => {
      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          setUserStarsBalance(
            data.starsBalance || data.purchasedStars || data.sparks || 0
          );
        } else {
          const localSparks = Number(
            localStorage.getItem("user_deep_sparks") || "0"
          );
          setUserStarsBalance(localSparks);
        }
      } catch (err) {
        console.warn("Could not fetch stars balance:", err);
      }
    };
    fetchUserStars();
  }, [currentUser, isOpen]);

  const configuredAccounts = useMemo(() => {
    const fromPay = extractConfiguredMobileAccounts(paymentsDoc);
    const fromPlat = extractConfiguredMobileAccounts(platformDoc);
    return {
      bkash: fromPay.bkash.length > 0 ? fromPay.bkash : fromPlat.bkash,
      nagad: fromPay.nagad.length > 0 ? fromPay.nagad : fromPlat.nagad,
    };
  }, [paymentsDoc, platformDoc]);

  const rotatedBkash = useMemo(
    () => pickAccountBySeed(configuredAccounts.bkash, refreshSeed),
    [configuredAccounts.bkash, refreshSeed]
  );
  const rotatedNagad = useMemo(
    () => pickAccountBySeed(configuredAccounts.nagad, refreshSeed),
    [configuredAccounts.nagad, refreshSeed]
  );

  const hasBkash = Boolean(rotatedBkash);
  const hasNagad = Boolean(rotatedNagad);

  useEffect(() => {
    if (selectedProvider === "bKash" && !hasBkash && hasNagad) {
      setSelectedProvider("Nagad");
    } else if (selectedProvider === "Nagad" && !hasNagad && hasBkash) {
      setSelectedProvider("bKash");
    }
  }, [hasBkash, hasNagad, selectedProvider]);

  const activeAccount =
    selectedProvider === "bKash" ? rotatedBkash : rotatedNagad;

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
      notify(
        `You need ${giftStarsAmount} stars, but only have ${userStarsBalance} stars. Please buy stars to continue!`,
        "error"
      );
      setBuyStarsAmount(
        giftStarsAmount - userStarsBalance > 100
          ? giftStarsAmount - userStarsBalance
          : 100
      );
      setMode("buy");
      return;
    }

    setIsSubmitting(true);
    try {
      const newSenderBal = userStarsBalance - giftStarsAmount;
      setUserStarsBalance(newSenderBal);
      localStorage.setItem("user_deep_sparks", String(newSenderBal));

      try {
        await updateDoc(doc(db, "users", currentUser.uid), {
          starsBalance: increment(-giftStarsAmount),
        });
      } catch {}

      try {
        await updateDoc(doc(db, "users", targetUserId), {
          earnedStars: increment(giftStarsAmount),
          totalStarsReceived: increment(giftStarsAmount),
        });
      } catch {}

      await addDoc(collection(db, "star_gifts"), {
        senderUid: currentUser.uid,
        senderName:
          currentUser.displayName ||
          currentUser.email?.split("@")[0] ||
          "User",
        recipientUid: targetUserId,
        recipientName: targetUserName,
        starsCount: giftStarsAmount,
        createdAt: Date.now(),
      });

      triggerHaptic();
      notify(
        `Successfully gifted ${giftStarsAmount} Stars to ${targetUserName}!`,
        "success"
      );
      onClose();
    } catch {
      notify("Failed to gift stars", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      notify("Please sign in to buy stars!", "error");
      return;
    }
    if (!activeAccount) {
      notify("No official payment number is configured yet.", "error");
      return;
    }
    if (!paymentPhone || !paymentTxId) {
      notify(
        `Please provide your ${activeAccount.provider} number and Transaction ID`,
        "error"
      );
      return;
    }

    setIsSubmitting(true);
    const amountBDT = buyStarsAmount;

    try {
      await addDoc(collection(db, "star_requests"), {
        userId: currentUser.uid,
        userName:
          currentUser.displayName ||
          currentUser.email?.split("@")[0] ||
          "User",
        userEmail: currentUser.email || "",
        starsRequested: buyStarsAmount,
        amountBDT,
        paymentMethod: activeAccount.provider.toLowerCase(),
        officialNumber: activeAccount.number,
        officialAccountType: activeAccount.type,
        phone: paymentPhone,
        txId: paymentTxId.trim().toUpperCase(),
        status: "pending",
        createdAt: Date.now(),
      });

      triggerHaptic();
      notify(
        `Star purchase request submitted for ${buyStarsAmount} Stars (৳${amountBDT})! Admin will verify your payment.`,
        "success"
      );
      setPaymentPhone("");
      setPaymentTxId("");
      onClose();
    } catch {
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
                {mode === "gift"
                  ? `Gift Stars to ${targetUserName}`
                  : "Buy Stars"}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-xs font-extrabold">
            <button
              type="button"
              onClick={() => setMode("gift")}
              className={`py-2 rounded-xl transition cursor-pointer ${
                mode === "gift"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              Gift Stars
            </button>
            <button
              type="button"
              onClick={() => setMode("buy")}
              className={`py-2 rounded-xl transition cursor-pointer ${
                mode === "buy"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              Buy Stars
            </button>
          </div>

          {/* Available Stars Balance */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
            <span className="text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>Available Stars Balance:</span>
            </span>
            <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
              {userStarsBalance} ★
            </span>
          </div>

          {/* MODE 1: GIFT STARS */}
          {mode === "gift" && (
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
                      {count} ★
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
                  onChange={(e) =>
                    setGiftStarsAmount(
                      Math.max(1, parseInt(e.target.value) || 0)
                    )
                  }
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none font-mono font-bold"
                />
              </div>

              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Gifted stars go directly to {targetUserName}&apos;s creator
                dashboard and can be withdrawn once reaching 1,000 stars
                (৳1,000).
              </p>

              <button
                type="button"
                onClick={handleGiftSubmit}
                disabled={isSubmitting}
                className="w-full py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting
                  ? "Processing..."
                  : `Send ${giftStarsAmount} Stars to ${targetUserName}`}
              </button>
            </div>
          )}

          {/* MODE 2: BUY STARS (Strictly Admin Dashboard single rotated number) */}
          {mode === "buy" && (
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
                      <span className="block font-mono font-black text-xs">
                        {pkg} ★
                      </span>
                      <span className="block text-[10px] opacity-80">
                        ৳{pkg} BDT
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block mb-1">
                  Custom Quantity:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    value={buyStarsAmount}
                    onChange={(e) =>
                      setBuyStarsAmount(
                        Math.max(10, parseInt(e.target.value) || 0)
                      )
                    }
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none font-mono font-bold"
                  />
                  <div className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-mono font-black text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    ৳{buyStarsAmount} BDT
                  </div>
                </div>
              </div>

              {!hasBkash && !hasNagad ? (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>No official payment number configured yet.</span>
                </div>
              ) : (
                <>
                  {hasBkash && hasNagad && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedProvider("bKash")}
                        className={`py-2 px-3 rounded-xl text-xs font-black border transition cursor-pointer ${
                          selectedProvider === "bKash"
                            ? "border-[#E2125B] bg-pink-50 dark:bg-pink-950/30 text-[#E2125B]"
                            : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        bKash
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedProvider("Nagad")}
                        className={`py-2 px-3 rounded-xl text-xs font-black border transition cursor-pointer ${
                          selectedProvider === "Nagad"
                            ? "border-[#F57C20] bg-orange-50 dark:bg-orange-950/30 text-[#F57C20]"
                            : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        Nagad
                      </button>
                    </div>
                  )}

                  {activeAccount && (
                    <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-xs space-y-1.5">
                      <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 block">
                        Official {activeAccount.provider} ({activeAccount.type})
                        Number:
                      </span>
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-blue-600 dark:text-blue-400 text-sm font-mono">
                          {activeAccount.number}
                        </strong>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(activeAccount.number);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {copied ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copied ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                      <span className="text-[10px] text-zinc-500 block">
                        {getMobileActionLabel(activeAccount.type)} ৳
                        {buyStarsAmount} then enter details below:
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block mb-1">
                      Your {activeAccount?.provider || "Mobile"} Number
                    </label>
                    <input
                      type="tel"
                      placeholder="01XXXXXXXXX"
                      value={paymentPhone}
                      onChange={(e) => setPaymentPhone(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none font-mono"
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

                  <button
                    type="submit"
                    disabled={isSubmitting || !activeAccount}
                    className="w-full py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting
                      ? "Submitting..."
                      : `Submit Order for ${buyStarsAmount} Stars (৳${buyStarsAmount})`}
                  </button>
                </>
              )}
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default GiftStarsModal;
