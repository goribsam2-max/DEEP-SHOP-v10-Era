import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Star,
  Sparkles,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Check,
  Copy
} from "lucide-react";
import { doc, getDoc, updateDoc, increment, collection, addDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNotify } from "../components/Notifications";
import { triggerHaptic } from "../lib/haptics";
import SEO from "../components/SEO";

export const GiftStarsPage: React.FC = () => {
  const { creatorId } = useParams<{ creatorId: string }>();
  const navigate = useNavigate();
  const notify = useNotify();

  const [creator, setCreator] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Mode: 'gift' or 'buy'
  const [mode, setMode] = useState<"gift" | "buy">("gift");
  const [giftStarsAmount, setGiftStarsAmount] = useState(50);
  const [buyStarsAmount, setBuyStarsAmount] = useState(100);

  // User balances
  const [userStarsBalance, setUserStarsBalance] = useState(0);

  // Payment form states for buying stars
  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentTxId, setPaymentTxId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Official bKash/Nagad numbers
  const [bkashNumber, setBkashNumber] = useState("01812345678");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => {
      setCurrentUser(u);
    });

    const fetchCreatorAndUser = async () => {
      setLoading(true);
      try {
        if (creatorId) {
          const cSnap = await getDoc(doc(db, "users", creatorId));
          if (cSnap.exists()) {
            setCreator({ id: cSnap.id, ...cSnap.data() });
          } else {
            setCreator({
              id: creatorId,
              displayName: creatorId.includes("jen") ? "Jenny Wilson" : "Creator Member",
              username: creatorId.includes("jen") ? "jenny_w" : "creator",
              photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
            });
          }
        }

        const u = auth.currentUser;
        if (u) {
          const uSnap = await getDoc(doc(db, "users", u.uid));
          if (uSnap.exists()) {
            setUserStarsBalance(uSnap.data().starsBalance || uSnap.data().sparks || 0);
          } else {
            const localSparks = Number(localStorage.getItem("user_deep_sparks") || "0");
            setUserStarsBalance(localSparks);
          }
        }
      } catch (e) {
        console.warn("Could not load details:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchCreatorAndUser();

    const unsubPayments = onSnapshot(doc(db, "settings", "payments"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.bkashNumber) setBkashNumber(data.bkashNumber);
        else if (data.bkashAccounts?.[0]?.number) setBkashNumber(data.bkashAccounts[0].number);
      }
    });

    return () => {
      unsubAuth();
      unsubPayments();
    };
  }, [creatorId]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    triggerHaptic();
    notify(`${label} number copied!`, "success");
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleGiftSubmit = async () => {
    if (!currentUser) {
      notify("Please sign in to gift stars!", "error");
      navigate("/signin", { state: { returnTo: `/gift-stars/${creatorId}` } });
      return;
    }
    if (!creatorId) return;

    if (giftStarsAmount <= 0) {
      notify("Please enter a valid number of stars", "error");
      return;
    }

    if (userStarsBalance < giftStarsAmount) {
      notify(
        `You need ${giftStarsAmount} stars, but only have ${userStarsBalance} stars. Buy stars to continue!`,
        "error"
      );
      setBuyStarsAmount(giftStarsAmount - userStarsBalance > 100 ? giftStarsAmount - userStarsBalance : 100);
      setMode("buy");
      return;
    }

    setIsSubmitting(true);
    triggerHaptic();

    try {
      const newSenderBal = userStarsBalance - giftStarsAmount;
      setUserStarsBalance(newSenderBal);
      localStorage.setItem("user_deep_sparks", String(newSenderBal));

      try {
        await updateDoc(doc(db, "users", currentUser.uid), {
          starsBalance: increment(-giftStarsAmount)
        });
      } catch (e) {}

      try {
        await updateDoc(doc(db, "users", creatorId), {
          earnedStars: increment(giftStarsAmount),
          totalStarsReceived: increment(giftStarsAmount)
        });
      } catch (e) {}

      await addDoc(collection(db, "star_gifts"), {
        senderUid: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email?.split("@")[0] || "User",
        recipientUid: creatorId,
        recipientName: creator?.displayName || "Creator",
        starsCount: giftStarsAmount,
        createdAt: Date.now()
      });

      notify(`Successfully gifted ${giftStarsAmount} ⭐ Stars to ${creator?.displayName || "Creator"}!`, "success");
      navigate(`/author/${creatorId}`);
    } catch (err) {
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
    if (!paymentPhone || !paymentTxId) {
      notify("Please provide your bKash/Nagad phone number and Transaction ID", "error");
      return;
    }

    setIsSubmitting(true);
    triggerHaptic();

    try {
      await addDoc(collection(db, "star_requests"), {
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email?.split("@")[0] || "User",
        userEmail: currentUser.email || "",
        starsRequested: buyStarsAmount,
        amountBDT: buyStarsAmount,
        phone: paymentPhone,
        txId: paymentTxId.trim().toUpperCase(),
        status: "pending",
        createdAt: Date.now()
      });

      notify(
        `Star purchase request submitted for ${buyStarsAmount} ⭐ Stars (৳${buyStarsAmount})! Admin will verify payment shortly.`,
        "success"
      );
      setPaymentPhone("");
      setPaymentTxId("");
      setMode("gift");
    } catch (err) {
      notify("Failed to submit star purchase request", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !creator) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-zinc-500">Loading creator details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans pb-24">
      <SEO
        title={`Gift Stars to ${creator.displayName} • DEEP SHOP`}
        description={`Support ${creator.displayName} on DEEP SHOP by gifting stars.`}
      />

      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-md mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <h1 className="text-base font-black text-zinc-900 dark:text-white truncate">
                Gift Stars to {creator.displayName}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-5 space-y-5">
        {/* CREATOR CARD */}
        <div className="p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3.5 shadow-xs">
          <img
            src={creator.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"}
            alt={creator.displayName}
            className="w-12 h-12 rounded-full object-cover border-2 border-amber-500 shadow-sm shrink-0"
          />
          <div className="min-w-0">
            <h2 className="text-sm font-black text-zinc-900 dark:text-white truncate flex items-center gap-1.5">
              <span>{creator.displayName}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-500 text-white inline" />
            </h2>
            <p className="text-[11px] font-mono text-zinc-400">@{creator.username || "creator"}</p>
          </div>
        </div>

        {/* MODE SWITCHER */}
        <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-xs font-extrabold border border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setMode("gift")}
            className={`py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === "gift"
                ? "bg-amber-500 text-white shadow-xs font-black"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>Gift Stars</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("buy")}
            className={`py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === "buy"
                ? "bg-blue-600 text-white shadow-xs font-black"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Buy Stars</span>
          </button>
        </div>

        {/* BALANCE INDICATOR */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
          <span className="text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span>Available Stars Balance:</span>
          </span>
          <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
            {userStarsBalance} ⭐
          </span>
        </div>

        {/* MODE 1: GIFT STARS */}
        {mode === "gift" && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-2">
                Select Stars Package:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 50, 100, 500].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setGiftStarsAmount(count)}
                    className={`py-3 rounded-2xl font-mono text-xs font-black transition cursor-pointer ${
                      giftStarsAmount === count
                        ? "bg-amber-500 text-white shadow-md ring-2 ring-amber-400"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200"
                    }`}
                  >
                    {count} ⭐
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1">
                Custom Stars Quantity:
              </label>
              <input
                type="number"
                min={1}
                value={giftStarsAmount}
                onChange={(e) => setGiftStarsAmount(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-3 text-xs rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono font-bold outline-none"
              />
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Stars gifted directly support {creator.displayName}'s investigative coverage. 1 Star = ৳1.00 BDT.
            </p>

            <button
              type="button"
              onClick={handleGiftSubmit}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-xl transition active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Star className="w-4 h-4 fill-white" />
              <span>{isSubmitting ? "Processing..." : `Send ${giftStarsAmount} ⭐ Stars`}</span>
            </button>
          </div>
        )}

        {/* MODE 2: BUY STARS */}
        {mode === "buy" && (
          <form onSubmit={handleBuySubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-2">
                Select Stars Package (1 Star = ৳1 BDT):
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[100, 500, 1000].map((pkg) => (
                  <button
                    key={pkg}
                    type="button"
                    onClick={() => setBuyStarsAmount(pkg)}
                    className={`p-3 rounded-2xl text-center transition cursor-pointer border ${
                      buyStarsAmount === pkg
                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    <span className="block font-mono font-black text-xs">{pkg} ⭐</span>
                    <span className="block text-[10px] opacity-80 mt-0.5">৳{pkg} BDT</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-800 dark:text-blue-300">
                  bKash / Nagad Personal Number:
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(bkashNumber, "bKash")}
                  className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === "bKash" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === "bKash" ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <strong className="text-blue-600 dark:text-blue-400 text-base block font-mono">
                {bkashNumber}
              </strong>
              <span className="text-[11px] text-zinc-500 block">
                Send Money ৳{buyStarsAmount} then enter details below:
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Your bKash/Nagad Mobile Number *
                </label>
                <input
                  type="tel"
                  placeholder="017XXXXXXXX"
                  value={paymentPhone}
                  onChange={(e) => setPaymentPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Transaction ID (TrxID) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9J283HX10"
                  value={paymentTxId}
                  onChange={(e) => setPaymentTxId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none font-mono uppercase"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-xl transition active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : `Confirm Order for ${buyStarsAmount} ⭐ Stars (৳${buyStarsAmount})`}
            </button>
          </form>
        )}
      </main>
    </div>
  );
};

export default GiftStarsPage;
