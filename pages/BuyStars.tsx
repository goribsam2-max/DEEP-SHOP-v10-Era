import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Star,
  Check,
  Copy,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  onSnapshot,
} from "firebase/firestore";
import { useNotify } from "../components/Notifications";
import { triggerHaptic } from "../lib/haptics";
import SEO from "../components/SEO";
import {
  extractConfiguredMobileAccounts,
  getMobileActionLabel,
  getNextRefreshSeed,
  pickAccountBySeed,
} from "../lib/dhakaTime";

const STAR_PACKAGES = [
  { stars: 50, bdt: 50, popular: false },
  { stars: 100, bdt: 100, popular: false },
  { stars: 250, bdt: 250, popular: true, bonus: "5 Free XP" },
  { stars: 500, bdt: 500, popular: false, bonus: "15 Free XP" },
  { stars: 1000, bdt: 1000, popular: true, bonus: "Supporter Badge" },
  { stars: 2000, bdt: 2000, popular: false, bonus: "VIP Star Aura" },
];

export const BuyStars: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentStars, setCurrentStars] = useState<number>(0);
  const [selectedStars, setSelectedStars] = useState<number>(250);
  const [customStars, setCustomStars] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"bkash" | "nagad">(
    "bkash"
  );

  // Payment form states
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Admin Dashboard official payment settings ONLY
  const [paymentsDoc, setPaymentsDoc] = useState<Record<string, any> | null>(
    null
  );
  const [platformDoc, setPlatformDoc] = useState<Record<string, any> | null>(
    null
  );

  // Rotates to the next number on every page refresh when multiple numbers exist
  const [refreshSeed] = useState<number>(() => getNextRefreshSeed("buy_stars"));

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (u) => {
      setCurrentUser(u);
      if (u) {
        try {
          const userDoc = await getDoc(doc(db, "users", u.uid));
          if (userDoc.exists()) {
            setCurrentStars(
              userDoc.data().purchasedStars || userDoc.data().stars || 0
            );
          }
        } catch {}
      }
    });

    const unsubPayments = onSnapshot(
      doc(db, "settings", "payments"),
      (snap) => {
        setPaymentsDoc(snap.exists() ? snap.data() : null);
      },
      () => setPaymentsDoc(null)
    );

    const unsubPlatform = onSnapshot(
      doc(db, "settings", "platform"),
      (snap) => {
        setPlatformDoc(snap.exists() ? snap.data() : null);
      },
      () => setPlatformDoc(null)
    );

    return () => {
      unsubAuth();
      unsubPayments();
      unsubPlatform();
    };
  }, []);

  const configuredAccounts = useMemo(() => {
    const fromPayments = extractConfiguredMobileAccounts(paymentsDoc);
    const fromPlatform = extractConfiguredMobileAccounts(platformDoc);
    return {
      bkash:
        fromPayments.bkash.length > 0
          ? fromPayments.bkash
          : fromPlatform.bkash,
      nagad:
        fromPayments.nagad.length > 0
          ? fromPayments.nagad
          : fromPlatform.nagad,
    };
  }, [paymentsDoc, platformDoc]);

  // Pick ONLY ONE number per refresh (never show all numbers simultaneously)
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
    if (paymentMethod === "bkash" && !hasBkash && hasNagad) {
      setPaymentMethod("nagad");
    } else if (paymentMethod === "nagad" && !hasNagad && hasBkash) {
      setPaymentMethod("bkash");
    }
  }, [hasBkash, hasNagad, paymentMethod]);

  const activeAccount =
    paymentMethod === "bkash" ? rotatedBkash : rotatedNagad;

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

    if (!activeAccount) {
      notify("No official payment number is currently configured.", "error");
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
        userName:
          currentUser.displayName ||
          currentUser.email?.split("@")[0] ||
          "User",
        userEmail: currentUser.email || "",
        stars: totalAmount,
        amountBDT: totalAmount,
        paymentMethod,
        senderNumber,
        trxId: trxId.trim().toUpperCase(),
        officialNumber: activeAccount.number,
        officialAccountType: activeAccount.type,
        status: "pending",
        createdAt: Date.now(),
      });

      const existing = JSON.parse(
        localStorage.getItem("pending_star_orders") || "[]"
      );
      existing.unshift({
        id: "star_req_" + Date.now(),
        stars: totalAmount,
        amountBDT: totalAmount,
        trxId: trxId.trim().toUpperCase(),
        paymentMethod,
        createdAt: Date.now(),
      });
      localStorage.setItem("pending_star_orders", JSON.stringify(existing));

      notify(
        `Star purchase request of ${totalAmount} Stars (৳${totalAmount}) submitted! Admin will credit stars once verified.`,
        "success"
      );
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
              <h1 className="text-base font-extrabold text-zinc-900 dark:text-white truncate">
                Buy Stars
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-extrabold whitespace-nowrap font-mono">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>{currentStars.toLocaleString()} Stars</span>
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-5">
        {/* HERO PROMO CARD */}
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
            Gift stars to scam victims and community reporters. Purchased stars
            are permanently stored in your account to tip creators.
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
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-1 block">
                      +{pkg.bonus}
                    </span>
                  )}
                  <div className="flex items-center gap-1 text-sm font-black text-zinc-900 dark:text-white">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                    <span>{pkg.stars} Stars</span>
                  </div>
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-2 block font-mono">
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

        {/* STEP 2: ADMIN DASHBOARD PAYMENT NUMBERS (Single rotated number per refresh) */}
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Step 2: Payment Method & Details
          </h3>

          {!hasBkash && !hasNagad ? (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                No official payment number configured in Admin Dashboard yet.
              </span>
            </div>
          ) : (
            <>
              <div
                className={`grid gap-2.5 ${
                  hasBkash && hasNagad ? "grid-cols-2" : "grid-cols-1"
                }`}
              >
                {hasBkash && rotatedBkash && (
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
                      <span className="text-xs font-black text-rose-600 block whitespace-nowrap">
                        bKash ({rotatedBkash.type})
                      </span>
                      <span className="text-[10px] text-zinc-400 whitespace-nowrap">
                        {getMobileActionLabel(rotatedBkash.type)}
                      </span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        paymentMethod === "bkash"
                          ? "border-rose-600 bg-rose-600 text-white"
                          : "border-zinc-300"
                      }`}
                    >
                      {paymentMethod === "bkash" && (
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      )}
                    </div>
                  </button>
                )}

                {hasNagad && rotatedNagad && (
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
                      <span className="text-xs font-black text-orange-600 block whitespace-nowrap">
                        Nagad ({rotatedNagad.type})
                      </span>
                      <span className="text-[10px] text-zinc-400 whitespace-nowrap">
                        {getMobileActionLabel(rotatedNagad.type)}
                      </span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        paymentMethod === "nagad"
                          ? "border-orange-600 bg-orange-600 text-white"
                          : "border-zinc-300"
                      }`}
                    >
                      {paymentMethod === "nagad" && (
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      )}
                    </div>
                  </button>
                )}
              </div>

              {activeAccount && (
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-zinc-500">
                      Official {activeAccount.provider} ({activeAccount.type})
                      Number:
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {getMobileActionLabel(activeAccount.type)}
                    </span>
                  </div>

                  {/* Single active rotated number */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                    <span className="text-base sm:text-lg font-black font-mono tracking-wider text-zinc-900 dark:text-white">
                      {activeAccount.number}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          activeAccount.number,
                          activeAccount.id,
                          `${activeAccount.provider} (${activeAccount.type})`
                        )
                      }
                      className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-xs font-bold flex items-center gap-1.5 hover:bg-zinc-200 transition cursor-pointer whitespace-nowrap"
                    >
                      {copiedKey === activeAccount.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {copiedKey === activeAccount.id ? "Copied" : "Copy"}
                      </span>
                    </button>
                  </div>

                  <div className="text-[11px] text-zinc-500 space-y-1">
                    <p>
                      • Open your {activeAccount.provider} App and choose{" "}
                      <strong className="text-zinc-900 dark:text-white">
                        {getMobileActionLabel(activeAccount.type)}
                      </strong>
                      .
                    </p>
                    <p>
                      • Send exact amount:{" "}
                      <strong className="text-zinc-900 dark:text-white">
                        ৳{totalAmount} BDT
                      </strong>
                    </p>
                    <p>
                      • Enter your sender phone number & Transaction ID below to
                      verify.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* STEP 3: TRANSACTION SUBMISSION */}
        {(hasBkash || hasNagad) && (
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

            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold border-t border-zinc-200 dark:border-zinc-800 pt-3">
                <span>Total Payable Amount:</span>
                <span className="text-base font-black text-zinc-900 dark:text-white">
                  ৳{totalAmount} BDT ({totalAmount} Stars)
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || totalAmount < 10 || !activeAccount}
                className="w-full py-3.5 rounded-full bg-black dark:bg-white text-white dark:text-black font-extrabold text-xs shadow-xl hover:opacity-90 active:scale-98 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <Star className="w-4 h-4 fill-current shrink-0" />
                <span>
                  {isSubmitting
                    ? "Submitting Request..."
                    : `Confirm & Buy ${totalAmount} Stars`}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default BuyStars;
