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
  targetCreatorId?: string;
  targetCreatorName?: string;
  postId?: string;
}

export const GiftStarsModal: React.FC<GiftStarsModalProps> = ({
  isOpen,
  onClose,
  targetUserId,
  targetUserName,
  targetCreatorId,
  targetCreatorName,
  postId,
}) => {
  const notify = useNotify();
  const currentUser = auth.currentUser;

  const resolvedTargetId = targetUserId || targetCreatorId || "";
  const resolvedTargetName =
    targetUserName || targetCreatorName || "Creator";

  const [mode, setMode] = useState<"gift" | "buy">("gift");
  const [giftStarsAmount, setGiftStarsAmount] = useState(100);
  const [buyStarsAmount, setBuyStarsAmount] = useState(250);
  const [userStarsBalance, setUserStarsBalance] = useState(0);

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
            Number(
              data.starsBalance ?? data.purchasedStars ?? data.sparks ?? 0
            )
          );
        } else {
          const localSparks = Number(
            localStorage.getItem("user_deep_sparks") || "0"
          );
          setUserStarsBalance(localSparks);
        }
      } catch {
        // Ignore read error
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
      notify("Please sign in to gift stars", "error");
      return;
    }
    if (!resolvedTargetId) {
      notify("Select a creator to gift stars", "error");
      return;
    }
    if (giftStarsAmount <= 0) {
      notify("Please enter a valid number of stars", "error");
      return;
    }

    if (userStarsBalance < giftStarsAmount) {
      notify(
        `You need ${giftStarsAmount} Stars (available: ${userStarsBalance}). Top up your balance to continue.`,
        "info"
      );
      setBuyStarsAmount(Math.max(100, giftStarsAmount - userStarsBalance));
      setMode("buy");
      return;
    }

    setIsSubmitting(true);
    try {
      const newSenderBal = userStarsBalance - giftStarsAmount;
      setUserStarsBalance(newSenderBal);
      localStorage.setItem("user_deep_sparks", String(newSenderBal));

      await updateDoc(doc(db, "users", currentUser.uid), {
        starsBalance: increment(-giftStarsAmount),
      }).catch(() => {});

      await updateDoc(doc(db, "users", resolvedTargetId), {
        earnedStars: increment(giftStarsAmount),
        totalStarsReceived: increment(giftStarsAmount),
      }).catch(() => {});

      if (postId) {
        await updateDoc(doc(db, "scam_posts", postId), {
          giftedStarsCount: increment(giftStarsAmount),
        }).catch(() => {});
      }

      await addDoc(collection(db, "star_gifts"), {
        senderUid: currentUser.uid,
        senderName:
          currentUser.displayName ||
          currentUser.email?.split("@")[0] ||
          "Member",
        recipientUid: resolvedTargetId,
        recipientName: resolvedTargetName,
        postId: postId || null,
        starsCount: giftStarsAmount,
        createdAt: Date.now(),
      });

      triggerHaptic();
      notify(
        `Sent ${giftStarsAmount.toLocaleString()} Stars to ${resolvedTargetName}`,
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
      notify("Please sign in to top up stars", "error");
      return;
    }
    if (!activeAccount) {
      notify("No official payment number is configured yet.", "error");
      return;
    }
    if (!paymentPhone.trim() || !paymentTxId.trim()) {
      notify(
        `Enter your ${activeAccount.provider} number and Transaction ID`,
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
          "Member",
        userEmail: currentUser.email || "",
        starsRequested: buyStarsAmount,
        amountBDT,
        paymentMethod: activeAccount.provider.toLowerCase(),
        officialNumber: activeAccount.number,
        officialAccountType: activeAccount.type,
        phone: paymentPhone.trim(),
        txId: paymentTxId.trim().toUpperCase(),
        status: "pending",
        createdAt: Date.now(),
      });

      triggerHaptic();
      notify(
        `Top-up order submitted for ${buyStarsAmount.toLocaleString()} Stars (৳${amountBDT.toLocaleString()})`,
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
      <div
        className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center p-0 sm:p-5 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-[430px] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-zinc-950 border-t sm:border border-zinc-200 dark:border-zinc-800 px-5 sm:px-6 pt-5 pb-7 space-y-4 text-left max-h-[90dvh] overflow-y-auto shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" />
              <h3 className="font-bold text-base sm:text-lg text-zinc-950 dark:text-white truncate">
                {mode === "gift"
                  ? `Gift Stars to ${resolvedTargetName}`
                  : "Top Up Stars"}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode("gift")}
              className={`min-h-[38px] rounded-lg transition cursor-pointer ${
                mode === "gift"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Send Gift
            </button>
            <button
              type="button"
              onClick={() => setMode("buy")}
              className={`min-h-[38px] rounded-lg transition cursor-pointer ${
                mode === "buy"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Top Up Balance
            </button>
          </div>

          {/* Available Balance */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs sm:text-sm">
            <span className="text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Available balance</span>
            </span>
            <span className="font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {userStarsBalance.toLocaleString()} ★
            </span>
          </div>

          {mode === "gift" ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-2">
                  Select Stars amount
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[50, 100, 250, 500].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setGiftStarsAmount(count)}
                      className={`min-h-[42px] rounded-xl text-xs font-bold tabular-nums border transition cursor-pointer ${
                        giftStarsAmount === count
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      {count} ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1.5">
                  Custom quantity (1 Star = ৳1 BDT)
                </label>
                <input
                  type="number"
                  min={1}
                  value={giftStarsAmount}
                  onChange={(e) =>
                    setGiftStarsAmount(
                      Math.max(1, parseInt(e.target.value, 10) || 1)
                    )
                  }
                  className="w-full h-11 px-3.5 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none font-bold tabular-nums text-zinc-950 dark:text-white"
                />
              </div>

              <div className="pt-1 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleGiftSubmit}
                  disabled={isSubmitting}
                  className="w-full min-h-[48px] px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition active:scale-[0.99] cursor-pointer disabled:opacity-50 tabular-nums whitespace-nowrap"
                >
                  {isSubmitting
                    ? "Sending..."
                    : `Send ${giftStarsAmount.toLocaleString()} Stars · ৳${giftStarsAmount.toLocaleString()}`}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full min-h-[44px] px-5 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold text-sm cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleBuySubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-2">
                  Select package (1 Star = ৳1 BDT)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[100, 500, 1000].map((pkg) => (
                    <button
                      key={pkg}
                      type="button"
                      onClick={() => setBuyStarsAmount(pkg)}
                      className={`p-2.5 rounded-xl text-center border transition cursor-pointer ${
                        buyStarsAmount === pkg
                          ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white"
                          : "bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      <span className="block font-bold tabular-nums text-xs">
                        {pkg} ★
                      </span>
                      <span className="block text-[11px] opacity-80 tabular-nums">
                        ৳{pkg}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {!hasBkash && !hasNagad ? (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
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
                        className={`min-h-[40px] px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
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
                        className={`min-h-[40px] px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
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
                    <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs space-y-2">
                      <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block">
                        Official {activeAccount.provider} ({activeAccount.type})
                        · {getMobileActionLabel(activeAccount.type)} ৳
                        {buyStarsAmount.toLocaleString()}
                      </span>
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-zinc-950 dark:text-white text-sm font-mono tabular-nums">
                          {activeAccount.number}
                        </strong>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(activeAccount.number);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="min-h-[34px] px-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          {copied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copied ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                      Your {activeAccount?.provider || "Mobile"} Number
                    </label>
                    <input
                      type="tel"
                      placeholder="01XXXXXXXXX"
                      value={paymentPhone}
                      onChange={(e) => setPaymentPhone(e.target.value)}
                      className="w-full h-11 px-3.5 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none font-mono tabular-nums"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                      Transaction ID (TrxID)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9J283HX10"
                      value={paymentTxId}
                      onChange={(e) => setPaymentTxId(e.target.value)}
                      className="w-full h-11 px-3.5 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none font-mono uppercase"
                      required
                    />
                  </div>

                  <div className="pt-1 flex flex-col gap-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || !activeAccount}
                      className="w-full min-h-[48px] px-5 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold text-sm transition active:scale-[0.99] cursor-pointer disabled:opacity-50 tabular-nums"
                    >
                      {isSubmitting
                        ? "Submitting..."
                        : `Submit Top-Up · ৳${buyStarsAmount.toLocaleString()}`}
                    </button>
                  </div>
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
