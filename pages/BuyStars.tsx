import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Star,
  Check,
  Copy,
  CreditCard,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Clock,
  ExternalLink
} from "lucide-react";
import { auth, db } from "../firebase";
import { doc, getDoc, addDoc, collection, onSnapshot } from "firebase/firestore";
import { useNotify } from "../components/Notifications";
import { triggerHaptic } from "../lib/haptics";
import SEO from "../components/SEO";

const STAR_PACKAGES = [
  { stars: 50, bdt: 50, popular: false },
  { stars: 100, bdt: 100, popular: false },
  { stars: 250, bdt: 250, popular: true, bonus: "5 Free XP" },
  { stars: 500, bdt: 500, popular: false, bonus: "15 Free XP" },
  { stars: 1000, bdt: 1000, popular: true, bonus: "Supporter Badge" },
  { stars: 2000, bdt: 2000, popular: false, bonus: "VIP Star Aura" }
];

export const BuyStars: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentStars, setCurrentStars] = useState<number>(0);
  const [selectedStars, setSelectedStars] = useState<number>(250);
  const [customStars, setCustomStars] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"bkash" | "nagad">("bkash");

  // Payment form states
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Dynamic official payment numbers
  const [bkashNumber, setBkashNumber] = useState("01812345678");
  const [nagadNumber, setNagadNumber] = useState("01912345678");

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (u) => {
      setCurrentUser(u);
      if (u) {
        try {
          const userDoc = await getDoc(doc(db, "users", u.uid));
          if (userDoc.exists()) {
            setCurrentStars(userDoc.data().purchasedStars || userDoc.data().stars || 0);
          }
        } catch (e) {}
      }
    });

    // Load official payment numbers from settings
    const unsubPayments = onSnapshot(doc(db, "settings", "payments"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.bkashNumber) setBkashNumber(data.bkashNumber);
        else if (data.bkashAccounts?.[0]?.number) setBkashNumber(data.bkashAccounts[0].number);

        if (data.nagadNumber) setNagadNumber(data.nagadNumber);
        else if (data.nagadAccounts?.[0]?.number) setNagadNumber(data.nagadAccounts[0].number);
      }
    });

    return () => {
      unsubAuth();
      unsubPayments();
    };
  }, []);

  const totalAmount = customStars ? Number(customStars) || 0 : selectedStars;

  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    triggerHaptic();
    notify(`${label} number copied!`, "success");
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      notify("Please sign in to buy stars", "error");
      navigate("/signin", { state: { returnTo: "/buy-stars" } });
      return;
    }

    if (totalAmount < 10) {
      notify("Minimum star purchase is 10 Stars (৳10)", "error");
      return;
    }

    if (!senderNumber || !trxId) {
      notify("Please enter your payment phone number and TrxID", "error");
      return;
    }

    setIsSubmitting(true);
    triggerHaptic();

    try {
      await addDoc(collection(db, "star_purchase_requests"), {
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email?.split("@")[0] || "User",
        userEmail: currentUser.email || "",
        stars: totalAmount,
        amountBDT: totalAmount,
        paymentMethod,
        senderNumber,
        trxId: trxId.trim().toUpperCase(),
        officialNumber: paymentMethod === "bkash" ? bkashNumber : nagadNumber,
        status: "pending",
        createdAt: Date.now()
      });

      // Save locally to display pending order
      const existing = JSON.parse(localStorage.getItem("pending_star_orders") || "[]");
      existing.unshift({
        id: "star_req_" + Date.now(),
        stars: totalAmount,
        amountBDT: totalAmount,
        trxId: trxId.trim().toUpperCase(),
        paymentMethod,
        createdAt: Date.now()
      });
      localStorage.setItem("pending_star_orders", JSON.stringify(existing));

      notify(`Star purchase request of ${totalAmount} Stars (৳${totalAmount}) submitted! Admin will credit stars once verified.`, "success");
      setSenderNumber("");
      setTrxId("");
      navigate("/creator-dashboard");
    } catch (err) {
      console.error(err);
      notify("Failed to submit star request. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans pb-24">
      <SEO
        title="Buy Stars • DEEP SHOP"
        description="Buy Stars to gift community creators, upvote verified scam reports, and unlock creator perks on DEEP SHOP."
      />

      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" />
              <h1 className="text-base font-extrabold text-zinc-900 dark:text-white truncate">Buy Stars</h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 text-xs font-bold whitespace-nowrap">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>Balance: {currentStars.toLocaleString()} Stars</span>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-5 space-y-5">
        {/* HERO PROMO CARD (Strictly single line subtitle) */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Official Star Gateway
            </span>
            <span className="text-[11px] font-mono font-bold text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
              1 Star = ৳1.00 BDT
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Gift stars to scam victims and community reporters. Purchased stars are permanently stored in your account to tip creators.
          </p>
        </div>

        {/* STEP 1: SELECT PACKAGE */}
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Step 1: Choose Star Package
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {STAR_PACKAGES.map((pkg) => {
              const isSelected = !customStars && selectedStars === pkg.stars;
              return (
                <button
                  key={pkg.stars}
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setSelectedStars(pkg.stars);
                    setCustomStars("");
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 shadow-sm ring-1 ring-amber-500"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                  }`}
                >
                  {pkg.bonus && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-500 text-white">
                      {pkg.bonus}
                    </span>
                  )}
                  <div className="flex items-center gap-1 text-sm font-black text-zinc-900 dark:text-white">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                    <span>{pkg.stars} Stars</span>
                  </div>
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-2 block">
                    ৳{pkg.bdt} BDT
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom Stars Input */}
          <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
              Or Enter Custom Stars:
            </span>
            <div className="flex items-center gap-1.5 max-w-[150px]">
              <input
                type="number"
                min="10"
                placeholder="e.g. 750"
                value={customStars}
                onChange={(e) => {
                  setCustomStars(e.target.value);
                  setSelectedStars(0);
                }}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-bold font-mono outline-none"
              />
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
            </div>
          </div>
        </div>

        {/* STEP 2: PAYMENT METHOD & NUMBERS */}
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Step 2: Payment Method & Details
          </h3>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setPaymentMethod("bkash");
              }}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
                paymentMethod === "bkash"
                  ? "bg-rose-50 dark:bg-rose-950/40 border-rose-500 ring-1 ring-rose-500"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div>
                <span className="text-xs font-black text-rose-600 block">bKash Personal</span>
                <span className="text-[10px] text-zinc-400">Send Money</span>
              </div>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                paymentMethod === "bkash" ? "border-rose-600 bg-rose-600 text-white" : "border-zinc-300"
              }`}>
                {paymentMethod === "bkash" && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </div>
            </button>

            <button
              type="button"
              disabled
              title="Nagad account currently not configured"
              className="p-3 rounded-2xl border text-left transition opacity-50 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-zinc-400 block">Nagad</span>
                  <span className="text-[9px] font-bold px-1 py-0.2 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 rounded">Unavailable</span>
                </div>
                <span className="text-[10px] text-zinc-400">Not configured</span>
              </div>
              <div className="w-4 h-4 rounded-full border border-zinc-300 flex items-center justify-center" />
            </button>
          </div>

          {/* Official Payment Number Box */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500">
                Official {paymentMethod === "bkash" ? "bKash" : "Nagad"} Number:
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                Verified
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              <span className="text-base font-black font-mono tracking-wider text-zinc-900 dark:text-white">
                {paymentMethod === "bkash" ? bkashNumber : nagadNumber}
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    paymentMethod === "bkash" ? bkashNumber : nagadNumber,
                    paymentMethod,
                    paymentMethod.toUpperCase()
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-xs font-bold flex items-center gap-1.5 hover:bg-zinc-200 transition cursor-pointer"
              >
                {copiedKey === paymentMethod ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === paymentMethod ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <div className="text-[11px] text-zinc-500 space-y-1">
              <p>• Open your {paymentMethod === "bkash" ? "bKash" : "Nagad"} App and select <strong>Send Money</strong>.</p>
              <p>• Send exact amount: <strong className="text-zinc-900 dark:text-white">৳{totalAmount} BDT</strong></p>
              <p>• Enter your sender phone number & Transaction ID below to verify.</p>
            </div>
          </div>
        </div>

        {/* STEP 3: TRANSACTION SUBMISSION */}
        <form onSubmit={handlePurchaseSubmit} className="space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Step 3: Verification
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Your Payment Phone Number *
              </label>
              <input
                type="tel"
                required
                placeholder="01XXXXXXXXX"
                value={senderNumber}
                onChange={(e) => setSenderNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Transaction ID (TrxID) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 9J283HX10"
                value={trxId}
                onChange={(e) => setTrxId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none font-mono uppercase"
              />
            </div>
          </div>

          {/* TOTAL & SUBMIT BUTTON */}
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold border-t border-zinc-200 dark:border-zinc-800 pt-3">
              <span>Total Payable Amount:</span>
              <span className="text-base font-black text-zinc-900 dark:text-white">৳{totalAmount} BDT ({totalAmount} Stars)</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || totalAmount < 10}
              className="w-full py-3.5 rounded-full bg-black dark:bg-white text-white dark:text-black font-extrabold text-xs shadow-xl hover:opacity-90 active:scale-98 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <Star className="w-4 h-4 fill-current shrink-0" />
              <span>{isSubmitting ? "Submitting Request..." : `Confirm & Buy ${totalAmount} Stars`}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default BuyStars;
