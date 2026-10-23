import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Handshake,
  Check,
  Copy,
  Star,
  ShieldCheck,
  Sparkles,
  Award,
  AlertCircle
} from "lucide-react";
import { auth, db } from "../firebase";
import { doc, getDoc, addDoc, collection, onSnapshot } from "firebase/firestore";
import { useNotify } from "../components/Notifications";
import { triggerHaptic } from "../lib/haptics";
import SEO from "../components/SEO";

export const SponsorCreator: React.FC = () => {
  const { creatorId } = useParams<{ creatorId: string }>();
  const navigate = useNavigate();
  const notify = useNotify();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Sponsorship options
  const [tierType, setTierType] = useState<"monthly" | "yearly" | "per_post" | "custom">("monthly");
  const [selectedAmount, setSelectedAmount] = useState<number>(300);
  const [customAmount, setCustomAmount] = useState<string>("");

  // Payment form states
  const [paymentMethod, setPaymentMethod] = useState<"bkash" | "nagad">("bkash");
  const [senderPhone, setSenderPhone] = useState("");
  const [trxId, setTrxId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Official payment numbers
  const [bkashNumber, setBkashNumber] = useState("01812345678");
  const [nagadNumber, setNagadNumber] = useState("01912345678");

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => {
      setCurrentUser(u);
    });

    const fetchCreator = async () => {
      if (!creatorId) return;
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "users", creatorId));
        if (snap.exists()) {
          setCreator({ id: snap.id, ...snap.data() });
        } else {
          // Fallback demo creator
          setCreator({
            id: creatorId,
            displayName: creatorId.includes("jen") ? "Jenny Wilson" : creatorId.includes("samir") ? "Samir K." : "Community Reporter",
            username: creatorId.includes("jen") ? "jenwesh" : "reporter_bd",
            photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
            bio: "Verified Community Reporter & Incident Investigator on DEEP SHOP."
          });
        }
      } catch (e) {
        console.warn("Could not load creator:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchCreator();

    // Fetch official numbers
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
  }, [creatorId]);

  const activeAmount = customAmount ? Number(customAmount) || 0 : selectedAmount;

  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    triggerHaptic();
    notify(`${label} number copied!`, "success");
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSponsorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      notify("Please sign in to sponsor creators", "error");
      navigate("/signin", { state: { returnTo: `/sponsor/${creatorId}` } });
      return;
    }

    if (activeAmount < 50) {
      notify("Minimum sponsorship amount is ৳50", "error");
      return;
    }

    if (!senderPhone || !trxId) {
      notify("Please enter your payment phone number and TrxID", "error");
      return;
    }

    setIsSubmitting(true);
    triggerHaptic();

    try {
      await addDoc(collection(db, "sponsor_requests"), {
        sponsorUserId: currentUser.uid,
        sponsorName: currentUser.displayName || currentUser.email?.split("@")[0] || "Supporter",
        sponsorEmail: currentUser.email || "",
        creatorUserId: creatorId,
        creatorName: creator?.displayName || "Creator",
        tierType,
        amountBDT: activeAmount,
        paymentMethod,
        senderPhone,
        trxId: trxId.trim().toUpperCase(),
        officialNumber: paymentMethod === "bkash" ? bkashNumber : nagadNumber,
        status: "pending",
        createdAt: Date.now()
      });

      notify(`Sponsorship request of ৳${activeAmount} for ${creator?.displayName} submitted! Admin will verify and activate your sponsor badge.`, "success");
      navigate(`/author/${creatorId}`);
    } catch (err) {
      console.error(err);
      notify("Failed to submit sponsorship request. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !creator) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-zinc-500">Loading creator details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans pb-24">
      <SEO
        title={`Sponsor ${creator.displayName} • DEEP SHOP`}
        description={`Sponsor ${creator.displayName} on DEEP SHOP to support verified incident reporting and investigative coverage.`}
      />

      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 transition cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <Handshake className="w-5 h-5 text-emerald-600 shrink-0" />
              <h1 className="text-base font-extrabold text-zinc-900 dark:text-white truncate">Sponsor Creator</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-5 space-y-5">
        {/* CREATOR PROFILE CARD */}
        <div className="p-4 sm:p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3.5">
          <img
            src={creator.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"}
            alt={creator.displayName}
            className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500 shadow-sm shrink-0"
          />
          <div className="min-w-0">
            <h2 className="text-base font-black text-zinc-900 dark:text-white truncate">
              {creator.displayName}
            </h2>
            <p className="text-xs font-mono text-zinc-400">@{creator.username || "creator"}</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
              {creator.bio || "Community Reporter & Incident Investigator"}
            </p>
          </div>
        </div>

        {/* STEP 1: SPONSORSHIP TIER */}
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Step 1: Choose Sponsorship Tier
          </h3>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: "monthly", title: "Monthly Supporter", bdt: 300, desc: "৳300 / month recurring" },
              { id: "yearly", title: "Yearly VIP Patron", bdt: 3000, desc: "৳3,000 / year (Save 15%)" },
              { id: "per_post", title: "Per-Post Sponsor", bdt: 500, desc: "৳500 / sponsored report" },
              { id: "custom", title: "Custom Contribution", bdt: 1000, desc: "Enter your own amount" }
            ].map((pkg) => {
              const isSelected = tierType === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setTierType(pkg.id as any);
                    if (pkg.id !== "custom") {
                      setSelectedAmount(pkg.bdt);
                      setCustomAmount("");
                    }
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <div>
                    <span className="text-xs font-black text-zinc-900 dark:text-white block">{pkg.title}</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-0.5">{pkg.desc}</span>
                  </div>
                  <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2 block">
                    {pkg.id === "custom" ? "Custom" : `৳${pkg.bdt}`}
                  </span>
                </button>
              );
            })}
          </div>

          {tierType === "custom" && (
            <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Custom Amount (BDT):</span>
              <input
                type="number"
                min="50"
                placeholder="e.g. 1500"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-32 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-bold font-mono outline-none"
              />
            </div>
          )}
        </div>

        {/* STEP 2: PAYMENT METHOD & NUMBERS */}
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Step 2: Payment Gateway (Site Official Account)
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
              onClick={() => {
                triggerHaptic();
                setPaymentMethod("nagad");
              }}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
                paymentMethod === "nagad"
                  ? "bg-orange-50 dark:bg-orange-950/40 border-orange-500 ring-1 ring-orange-500"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div>
                <span className="text-xs font-black text-orange-600 block">Nagad Personal</span>
                <span className="text-[10px] text-zinc-400">Send Money</span>
              </div>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                paymentMethod === "nagad" ? "border-orange-600 bg-orange-600 text-white" : "border-zinc-300"
              }`}>
                {paymentMethod === "nagad" && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </div>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500">
                Send to {paymentMethod === "bkash" ? "bKash" : "Nagad"} Number:
              </span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                Official Account
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
              <p>• Send exactly: <strong className="text-zinc-900 dark:text-white">৳{activeAmount} BDT</strong></p>
              <p>• Enter your phone number & Transaction ID below to verify.</p>
            </div>
          </div>
        </div>

        {/* STEP 3: SUBMIT FORM */}
        <form onSubmit={handleSponsorSubmit} className="space-y-4">
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
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
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

          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold border-t border-zinc-200 dark:border-zinc-800 pt-3">
              <span>Total Payable Amount:</span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">৳{activeAmount} BDT</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || activeAmount < 50}
              className="w-full py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xl transition active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <Handshake className="w-4 h-4 shrink-0" />
              <span>{isSubmitting ? "Submitting Sponsorship..." : `Confirm Sponsorship (৳${activeAmount})`}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default SponsorCreator;
