import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Star,
  Sparkles,
  CreditCard,
  CheckCircle2,
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
import { useNotify } from "../components/Notifications";
import { triggerHaptic } from "../lib/haptics";
import SEO from "../components/SEO";
import creatorAvatar1 from "../src/assets/images/story_avatar_creator_1_1792826814910.jpg";
import {
  extractConfiguredMobileAccounts,
  getMobileActionLabel,
  getNextRefreshSeed,
  pickAccountBySeed,
} from "../lib/dhakaTime";

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
  const [selectedProvider, setSelectedProvider] = useState<"bKash" | "Nagad">("bKash");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentTxId, setPaymentTxId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin Dashboard payment accounts ONLY for buying stars (rotates 1 number per refresh)
  const [platformData, setPlatformData] = useState<Record<string, any> | null>(null);
  const [platformFallbackData, setPlatformFallbackData] = useState<Record<string, any> | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [refreshSeed] = useState<number>(() =>
    getNextRefreshSeed(`gift_buy_stars_${creatorId || "default"}`)
  );

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (u) => {
      setCurrentUser(u);
      if (u) {
        try {
          const uSnap = await getDoc(doc(db, "users", u.uid));
          if (uSnap.exists()) {
            setUserStarsBalance(
              uSnap.data().starsBalance ||
                uSnap.data().purchasedStars ||
                uSnap.data().sparks ||
                0
            );
          } else {
            const localSparks = Number(
              localStorage.getItem("user_deep_sparks") || "0"
            );
            setUserStarsBalance(localSparks);
          }
        } catch {
          // Ignore transient read error
        }
      }
    });

    let unsubCreator: (() => void) | undefined;
    if (creatorId) {
      setLoading(true);
      unsubCreator = onSnapshot(
        doc(db, "users", creatorId),
        (cSnap) => {
          if (cSnap.exists()) {
            setCreator({ id: cSnap.id, ...cSnap.data() });
          } else {
            setCreator({
              id: creatorId,
              displayName: "Creator Member",
              username: "creator",
              photoURL: creatorAvatar1,
            });
          }
          setLoading(false);
        },
        () => {
          setCreator({
            id: creatorId,
            displayName: "Creator Member",
            username: "creator",
            photoURL: creatorAvatar1,
          });
          setLoading(false);
        }
      );
    } else {
      setLoading(false);
    }

    const unsubPayments = onSnapshot(
      doc(db, "settings", "payments"),
      (snap) => {
        if (snap.exists()) {
          setPlatformData(snap.data());
        } else {
          setPlatformData(null);
        }
      },
      () => {
        setPlatformData(null);
      }
    );

    const unsubPlatform = onSnapshot(
      doc(db, "settings", "platform"),
      (snap) => {
        setPlatformFallbackData(snap.exists() ? snap.data() : null);
      },
      () => {
        setPlatformFallbackData(null);
      }
    );

    return () => {
      unsubAuth();
      if (unsubCreator) unsubCreator();
      unsubPayments();
      unsubPlatform();
    };
  }, [creatorId]);

  // Resolve Admin Dashboard bKash and Nagad accounts ONLY (never creator fallback for buying stars)
  const configuredAccounts = useMemo(() => {
    const fromPayments = extractConfiguredMobileAccounts(platformData);
    const fromPlatform = extractConfiguredMobileAccounts(platformFallbackData);

    return {
      bkash:
        fromPayments.bkash.length > 0 ? fromPayments.bkash : fromPlatform.bkash,
      nagad:
        fromPayments.nagad.length > 0 ? fromPayments.nagad : fromPlatform.nagad,
    };
  }, [platformData, platformFallbackData]);

  // Pick ONLY 1 rotated number per refresh for each active gateway
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

  // Ensure selectedProvider always points to an actually configured provider
  useEffect(() => {
    if (selectedProvider === "bKash" && !hasBkash && hasNagad) {
      setSelectedProvider("Nagad");
    } else if (selectedProvider === "Nagad" && !hasNagad && hasBkash) {
      setSelectedProvider("bKash");
    }
  }, [hasBkash, hasNagad, selectedProvider]);

  const activeAccount =
    selectedProvider === "bKash" ? rotatedBkash : rotatedNagad;

  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
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
      setBuyStarsAmount(
        giftStarsAmount - userStarsBalance > 100
          ? giftStarsAmount - userStarsBalance
          : 100
      );
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
          starsBalance: increment(-giftStarsAmount),
        });
      } catch {
        // Ignore if balance stored in sparks/purchasedStars
      }

      try {
        await updateDoc(doc(db, "users", creatorId), {
          earnedStars: increment(giftStarsAmount),
          totalStarsReceived: increment(giftStarsAmount),
        });
      } catch {
        // Non-fatal
      }

      await addDoc(collection(db, "star_gifts"), {
        senderUid: currentUser.uid,
        senderName:
          currentUser.displayName ||
          currentUser.email?.split("@")[0] ||
          "User",
        recipientUid: creatorId,
        recipientName: creator?.displayName || "Creator",
        starsCount: giftStarsAmount,
        createdAt: Date.now(),
      });

      notify(
        `Successfully gifted ${giftStarsAmount} Stars to ${
          creator?.displayName || "Creator"
        }!`,
        "success"
      );
      navigate(`/author/${creatorId}`);
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
      notify("No payment account is currently configured.", "error");
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
    triggerHaptic();

    try {
      await addDoc(collection(db, "star_requests"), {
        userId: currentUser.uid,
        userName:
          currentUser.displayName ||
          currentUser.email?.split("@")[0] ||
          "User",
        userEmail: currentUser.email || "",
        starsRequested: buyStarsAmount,
        amountBDT: buyStarsAmount,
        paymentMethod: activeAccount.provider.toLowerCase(),
        officialNumber: activeAccount.number,
        officialAccountType: activeAccount.type,
        phone: paymentPhone,
        txId: paymentTxId.trim().toUpperCase(),
        status: "pending",
        createdAt: Date.now(),
      });

      notify(
        `Star purchase request submitted for ${buyStarsAmount} Stars (৳${buyStarsAmount})! Admin will verify payment shortly.`,
        "success"
      );
      setPaymentPhone("");
      setPaymentTxId("");
      setMode("gift");
    } catch {
      notify("Failed to submit star purchase request", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !creator) {
    return (
      <div className="min-h-screen bg-[#F5F9FF] dark:bg-black flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-zinc-500">
          Loading creator details...
        </p>
      </div>
    );
  }

  const getInstructionAction = (type: string) => {
    if (type === "Payment") return "Make Payment";
    if (type === "Agent") return "Cash Out";
    return "Send Money";
  };

  return (
    <div className="relative min-h-screen bg-[#F5F9FF] dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans pb-24 overflow-x-hidden">
      <SEO
        title={`Gift Stars to ${creator.displayName} • DEEP SHOP`}
        description={`Support ${creator.displayName} on DEEP SHOP by gifting stars.`}
      />

      {/* Ambient Sky Gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-gradient-to-b from-[#6BB2F8]/65 via-[#DCEEFF]/50 to-transparent dark:from-transparent dark:via-transparent dark:to-transparent z-0"
      />

      {/* DEDICATED PAGE TOP BAR (Site Header Hidden) */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-200/70 dark:border-zinc-800">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 transition cursor-pointer shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
              <h1 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white truncate whitespace-nowrap">
                Gift Stars to {creator.displayName}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* CREATOR CARD */}
        <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-center gap-3.5 shadow-xs">
          <img
            src={creator.photoURL || creator.avatarUrl || creatorAvatar1}
            alt={creator.displayName}
            referrerPolicy="no-referrer"
            className="w-12 h-12 rounded-full object-cover border-2 border-amber-500 shadow-xs shrink-0"
          />
          <div className="min-w-0">
            <h2 className="text-sm font-black text-zinc-900 dark:text-white truncate flex items-center gap-1.5">
              <span className="truncate">{creator.displayName}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-500 shrink-0" />
            </h2>
            <p className="text-[11px] font-mono text-zinc-400 truncate">
              @{creator.username || "creator"}
            </p>
          </div>
        </div>

        {/* MODE SWITCHER */}
        <div className="grid grid-cols-2 p-1.5 rounded-full bg-white dark:bg-zinc-900 text-xs font-extrabold border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
          <button
            type="button"
            onClick={() => setMode("gift")}
            className={`py-2 px-3 rounded-full transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              mode === "gift"
                ? "bg-amber-500 text-white shadow-xs font-black"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current shrink-0" />
            <span>Gift Stars</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("buy")}
            className={`py-2 px-3 rounded-full transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              mode === "buy"
                ? "bg-[#1877F2] text-white shadow-xs font-black"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 shrink-0" />
            <span>Buy Stars</span>
          </button>
        </div>

        {/* BALANCE INDICATOR */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
          <span className="text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1.5 whitespace-nowrap">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Available Stars Balance:</span>
          </span>
          <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm whitespace-nowrap">
            {userStarsBalance} ★
          </span>
        </div>

        {/* MODE 1: GIFT STARS */}
        {mode === "gift" && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
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
                    className={`py-2.5 px-2 rounded-full font-mono text-xs font-black transition cursor-pointer whitespace-nowrap ${
                      giftStarsAmount === count
                        ? "bg-amber-500 text-white shadow-sm ring-2 ring-amber-400"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200"
                    }`}
                  >
                    {count} ★
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
                onChange={(e) =>
                  setGiftStarsAmount(Math.max(1, parseInt(e.target.value) || 0))
                }
                className="w-full px-4 py-3 text-xs rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono font-bold outline-none"
              />
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Stars gifted directly support {creator.displayName}&apos;s posts
              and community work. 1 Star = ৳1.00 BDT.
            </p>

            <button
              type="button"
              onClick={handleGiftSubmit}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-lg transition active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Star className="w-4 h-4 fill-white shrink-0" />
              <span>
                {isSubmitting
                  ? "Processing..."
                  : `Send ${giftStarsAmount} Stars`}
              </span>
            </button>
          </div>
        )}

        {/* MODE 2: BUY STARS (Shows ONLY configured payment gateways & numbers) */}
        {mode === "buy" && (
          <form
            onSubmit={handleBuySubmit}
            className="bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4"
          >
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
                        ? "bg-[#1877F2] text-white border-[#1877F2] shadow-sm"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    <span className="block font-mono font-black text-xs whitespace-nowrap">
                      {pkg} ★
                    </span>
                    <span className="block text-[10px] opacity-80 mt-0.5 whitespace-nowrap">
                      ৳{pkg} BDT
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {!hasBkash && !hasNagad ? (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">No payment number configured yet</p>
                  <p className="text-[11px] opacity-85 mt-0.5">
                    Payment numbers will appear automatically once configured in
                    Seller / Payment Settings.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Provider Tabs — ONLY render providers that actually have configured numbers */}
                {hasBkash && hasNagad && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        setSelectedProvider("bKash");
                      }}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
                        selectedProvider === "bKash"
                          ? "bg-pink-50 dark:bg-pink-950/40 border-[#E2125B] ring-1 ring-[#E2125B]"
                          : "bg-zinc-50 dark:bg-zinc-800/70 border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-black text-[#E2125B] block whitespace-nowrap">
                          bKash ({rotatedBkash?.type || "Personal"})
                        </span>
                        <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                          {getMobileActionLabel(rotatedBkash?.type)}
                        </span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          selectedProvider === "bKash"
                            ? "border-[#E2125B] bg-[#E2125B] text-white"
                            : "border-zinc-300"
                        }`}
                      >
                        {selectedProvider === "bKash" && (
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        setSelectedProvider("Nagad");
                      }}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
                        selectedProvider === "Nagad"
                          ? "bg-orange-50 dark:bg-orange-950/40 border-[#F57C20] ring-1 ring-[#F57C20]"
                          : "bg-zinc-50 dark:bg-zinc-800/70 border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-black text-[#F57C20] block whitespace-nowrap">
                          Nagad ({rotatedNagad?.type || "Personal"})
                        </span>
                        <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                          {getMobileActionLabel(rotatedNagad?.type)}
                        </span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          selectedProvider === "Nagad"
                            ? "border-[#F57C20] bg-[#F57C20] text-white"
                            : "border-zinc-300"
                        }`}
                      >
                        {selectedProvider === "Nagad" && (
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        )}
                      </div>
                    </button>
                  </div>
                )}

                {/* Single Rotated Official Number for Active Provider */}
                {activeAccount && (
                  <div
                    className={`p-3.5 rounded-2xl border text-xs space-y-2.5 ${
                      selectedProvider === "bKash"
                        ? "bg-pink-50/70 dark:bg-pink-950/25 border-pink-200 dark:border-pink-900/50"
                        : "bg-orange-50/70 dark:bg-orange-950/25 border-orange-200 dark:border-orange-900/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`font-extrabold whitespace-nowrap ${
                          selectedProvider === "bKash"
                            ? "text-[#E2125B] dark:text-pink-300"
                            : "text-[#F57C20] dark:text-orange-300"
                        }`}
                      >
                        Official {selectedProvider} ({activeAccount.type}) Number:
                      </span>
                      <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                        {getMobileActionLabel(activeAccount.type)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xs">
                      <span className="text-sm sm:text-base font-black font-mono tracking-wider text-zinc-900 dark:text-white truncate">
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
                        className="px-2.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        {copiedKey === activeAccount.id ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>
                          {copiedKey === activeAccount.id ? "Copied" : "Copy"}
                        </span>
                      </button>
                    </div>

                    <span className="text-[11px] text-zinc-600 dark:text-zinc-400 block">
                      Open {activeAccount.provider} and{" "}
                      <strong>{getInstructionAction(activeAccount.type)}</strong>{" "}
                      ৳{buyStarsAmount} BDT to the {activeAccount.type} number
                      above, then enter your details below:
                    </span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Your {activeAccount?.provider || "Mobile"} Number *
                    </label>
                    <input
                      type="tel"
                      placeholder="01XXXXXXXXX"
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
                  disabled={isSubmitting || !activeAccount}
                  className="w-full py-3.5 rounded-full bg-[#1877F2] hover:bg-[#1465D6] text-white font-extrabold text-xs shadow-lg transition active:scale-98 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {isSubmitting
                    ? "Submitting..."
                    : `Confirm Order for ${buyStarsAmount} Stars (৳${buyStarsAmount})`}
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default GiftStarsPage;
