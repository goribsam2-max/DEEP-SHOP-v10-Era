import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Star,
  Sparkles,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Check,
  Copy,
  Heart,
  Send,
  Plus,
  Minus,
  MessageSquare,
  ShieldCheck,
  Zap,
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
import { ProfileSettingsPageSkeleton } from "../components/PageSkeletons";
import creatorAvatar1 from "../src/assets/images/story_avatar_creator_1_1792826814910.jpg";
import {
  extractConfiguredMobileAccounts,
  getMobileActionLabel,
  getNextRefreshSeed,
  pickAccountBySeed,
} from "../lib/dhakaTime";

interface GiftTier {
  id: string;
  name: string;
  stars: number;
  emoji: string;
  tagline: string;
  badge: string;
  colorBg: string;
  colorBorder: string;
  colorText: string;
}

const GIFT_TIERS: GiftTier[] = [
  {
    id: "rose",
    name: "Rose Token",
    stars: 50,
    emoji: "🌹",
    tagline: "A sweet token of appreciation",
    badge: "Popular",
    colorBg: "bg-rose-500/10 dark:bg-rose-950/40",
    colorBorder: "border-rose-400/40 dark:border-rose-500/50",
    colorText: "text-rose-600 dark:text-rose-400",
  },
  {
    id: "sparkler",
    name: "Golden Sparkler",
    stars: 100,
    emoji: "✨",
    tagline: "Keep shining on Loops!",
    badge: "Featured",
    colorBg: "bg-amber-500/10 dark:bg-amber-950/40",
    colorBorder: "border-amber-400/40 dark:border-amber-500/50",
    colorText: "text-amber-600 dark:text-amber-400",
  },
  {
    id: "heart",
    name: "Super Heart",
    stars: 500,
    emoji: "❤️",
    tagline: "Huge fan of your content",
    badge: "Hot",
    colorBg: "bg-red-500/10 dark:bg-red-950/40",
    colorBorder: "border-red-400/40 dark:border-red-500/50",
    colorText: "text-red-600 dark:text-red-400",
  },
  {
    id: "crown",
    name: "Diamond Crown",
    stars: 1000,
    emoji: "👑",
    tagline: "VIP Royal Patron status",
    badge: "Royal",
    colorBg: "bg-blue-500/10 dark:bg-blue-950/40",
    colorBorder: "border-blue-400/40 dark:border-blue-500/50",
    colorText: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "rocket",
    name: "Rocket Launch",
    stars: 5000,
    emoji: "🚀",
    tagline: "To the moon & beyond",
    badge: "Superstar",
    colorBg: "bg-indigo-500/10 dark:bg-indigo-950/40",
    colorBorder: "border-indigo-400/40 dark:border-indigo-500/50",
    colorText: "text-indigo-600 dark:text-indigo-400",
  },
  {
    id: "castle",
    name: "Galaxy Castle",
    stars: 10000,
    emoji: "🏰",
    tagline: "Legendary Creator Supporter",
    badge: "Legendary",
    colorBg: "bg-purple-500/10 dark:bg-purple-950/40",
    colorBorder: "border-purple-400/40 dark:border-purple-500/50",
    colorText: "text-purple-600 dark:text-purple-400",
  },
];

export const GiftStarsPage: React.FC = () => {
  const { creatorId } = useParams<{ creatorId: string }>();
  const navigate = useNavigate();
  const notify = useNotify();

  const [creator, setCreator] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Mode: 'gift' or 'buy'
  const [mode, setMode] = useState<"gift" | "buy">("gift");
  const [selectedTierId, setSelectedTierId] = useState<string>("sparkler");
  const [giftStarsAmount, setGiftStarsAmount] = useState(100);
  const [cheerNote, setCheerNote] = useState("");
  const [buyStarsAmount, setBuyStarsAmount] = useState(100);

  // User balances
  const [userStarsBalance, setUserStarsBalance] = useState(0);

  // Payment form states for buying stars
  const [selectedProvider, setSelectedProvider] = useState<"bKash" | "Nagad">("bKash");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentTxId, setPaymentTxId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  // Admin Dashboard payment accounts ONLY for buying stars
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
            const data = uSnap.data();
            setUserStarsBalance(
              data.starsBalance ??
                data.purchasedStars ??
                data.sparks ??
                0
            );
          } else {
            const localSparks = Number(
              localStorage.getItem("user_deep_sparks") || "0"
            );
            setUserStarsBalance(localSparks);
          }
        } catch {
          // Fallback
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
        setPlatformData(snap.exists() ? snap.data() : null);
      },
      () => setPlatformData(null)
    );

    const unsubPlatform = onSnapshot(
      doc(db, "settings", "platform"),
      (snap) => {
        setPlatformFallbackData(snap.exists() ? snap.data() : null);
      },
      () => setPlatformFallbackData(null)
    );

    return () => {
      unsubAuth();
      if (unsubCreator) unsubCreator();
      unsubPayments();
      unsubPlatform();
    };
  }, [creatorId]);

  // Resolve Admin Dashboard payment accounts
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

  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    triggerHaptic();
    notify(`${label} number copied!`, "success");
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSelectTier = (tier: GiftTier) => {
    triggerHaptic();
    setSelectedTierId(tier.id);
    setGiftStarsAmount(tier.stars);
  };

  const handleGiftSubmit = async () => {
    if (!currentUser) {
      notify("Please sign in to gift stars!", "error");
      navigate("/signin", {
        state: { returnTo: `/gift-stars/${creatorId}`, from: "/loops" },
      });
      return;
    }
    if (!creatorId) return;

    if (giftStarsAmount <= 0) {
      notify("Please enter a valid star amount", "error");
      return;
    }

    if (userStarsBalance < giftStarsAmount) {
      notify(
        `You need ${giftStarsAmount} stars, but only have ${userStarsBalance} stars. Top up to continue!`,
        "info"
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
    setShowParticles(true);
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
        // Fallback
      }

      try {
        await updateDoc(doc(db, "users", creatorId), {
          earnedStars: increment(giftStarsAmount),
          totalStarsReceived: increment(giftStarsAmount),
        });
      } catch {
        // Non-fatal
      }

      const giftDoc = await addDoc(collection(db, "star_gifts"), {
        senderUid: currentUser.uid,
        senderName:
          currentUser.displayName ||
          currentUser.email?.split("@")[0] ||
          "Member",
        senderAvatar: currentUser.photoURL || "",
        recipientUid: creatorId,
        recipientName: creator?.displayName || "Creator",
        starsCount: giftStarsAmount,
        note: cheerNote.trim(),
        createdAt: Date.now(),
      });

      // Post notification to creator's feed
      addDoc(collection(db, "news_hub_notifications"), {
        userId: creatorId,
        fromUserId: currentUser.uid,
        fromUserName:
          currentUser.displayName ||
          currentUser.email?.split("@")[0] ||
          "Supporter",
        fromUserAvatar: currentUser.photoURL || "",
        type: "star_gift",
        title: `Gifted ${giftStarsAmount} Stars! 🌟`,
        body: cheerNote.trim()
          ? `sent ${giftStarsAmount} Stars with note: "${cheerNote.trim().slice(0, 50)}"`
          : `sent you ${giftStarsAmount} Stars on Loops!`,
        targetId: giftDoc.id,
        isRead: false,
        read: false,
        createdAt: Date.now(),
        link: `/loops/profile/${creatorId}`,
      }).catch(() => {});

      notify(
        `Successfully gifted ${giftStarsAmount} Stars to ${
          creator?.displayName || "Creator"
        }! 🎉`,
        "success"
      );

      setTimeout(() => {
        navigate(`/loops/profile/${creatorId}`);
      }, 1400);
    } catch {
      notify("Failed to gift stars", "error");
      setIsSubmitting(false);
      setShowParticles(false);
    }
  };

  const handleBuySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      notify("Please sign in to buy stars!", "error");
      return;
    }
    if (!activeAccount) {
      notify("No payment account configured yet.", "error");
      return;
    }
    if (!paymentPhone || !paymentTxId) {
      notify(
        `Please enter your ${activeAccount.provider} number and Transaction ID`,
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
        `Star order submitted for ${buyStarsAmount} Stars (৳${buyStarsAmount})! Admin will confirm payment shortly.`,
        "success"
      );
      setPaymentPhone("");
      setPaymentTxId("");
      setMode("gift");
    } catch {
      notify("Failed to submit star order", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !creator) {
    return <ProfileSettingsPageSkeleton />;
  }

  const activeTier = GIFT_TIERS.find((t) => t.id === selectedTierId) || GIFT_TIERS[1];

  return (
    <div className="relative min-h-screen bg-[#F5F9FF] dark:bg-[#090A0E] text-zinc-900 dark:text-zinc-100 font-sans pb-28 overflow-x-hidden selection:bg-amber-500/30">
      <SEO
        title={`Support ${creator.displayName} with Stars • DEEP SHOP`}
        description={`Gift stars to support ${creator.displayName}'s work and content on DEEP SHOP Loops.`}
      />

      {/* Floating Particle Fireworks */}
      <AnimatePresence>
        {showParticles && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          >
            {Array.from({ length: 24 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                animate={{
                  scale: [0, 1.4, 1],
                  x: (Math.random() - 0.5) * 420,
                  y: (Math.random() - 0.5) * 520,
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="absolute text-2xl"
              >
                {i % 3 === 0 ? "🌟" : i % 3 === 1 ? "✨" : "❤️"}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient Top Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-amber-400/25 via-amber-200/10 to-transparent dark:from-amber-500/15 dark:via-amber-500/5 dark:to-transparent z-0 blur-2xl"
      />

      {/* STICKY HEADER */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-[#111319]/85 backdrop-blur-xl border-b border-zinc-200/80 dark:border-white/10 shadow-xs">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <Star className="w-4.5 h-4.5 text-amber-500 fill-amber-500 shrink-0" />
              <h1 className="text-base font-black text-zinc-950 dark:text-white truncate">
                Gift Stars
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMode((m) => (m === "gift" ? "buy" : "gift"))}
            className="px-3.5 py-1.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{userStarsBalance} ★</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-lg mx-auto px-4 pt-5 space-y-5">
        {/* CREATOR HERO CARD */}
        <div className="relative overflow-hidden rounded-[28px] bg-white/90 dark:bg-[#14161E]/90 backdrop-blur-xl p-5 border border-zinc-200/80 dark:border-white/10 shadow-xl space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <img
                src={creator.photoURL || creator.avatarUrl || creatorAvatar1}
                alt={creator.displayName}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-full object-cover ring-4 ring-amber-500/30 shadow-md"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Star className="w-3.5 h-3.5 fill-white" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-black text-zinc-950 dark:text-white truncate">
                  {creator.displayName}
                </h2>
                <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500 shrink-0" />
              </div>
              <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 truncate">
                @{creator.username || creator.shopName?.toLowerCase().replace(/\s+/g, "_") || "creator"}
              </p>

              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11.5px] font-bold">
                <Zap className="w-3 h-3 fill-current" />
                <span>
                  {(creator.totalStarsReceived || creator.earnedStars || 0).toLocaleString()} Stars Received
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-white/80 dark:bg-[#14161E]/80 backdrop-blur-md border border-zinc-200/80 dark:border-white/10 text-xs font-extrabold shadow-xs">
          <button
            type="button"
            onClick={() => setMode("gift")}
            className={`py-2.5 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
              mode === "gift"
                ? "bg-amber-500 text-white shadow-md font-black"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
            }`}
          >
            <Star className="w-4 h-4 fill-current shrink-0" />
            <span>Send Gift</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("buy")}
            className={`py-2.5 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
              mode === "buy"
                ? "bg-[#1877F2] text-white shadow-md font-black"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            <span>Top Up Stars</span>
          </button>
        </div>

        {/* MODE 1: GIFT STARS TIERS */}
        {mode === "gift" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                Choose Gift Tier:
              </h3>
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                1 Star = ৳1.00 BDT
              </span>
            </div>

            {/* GIFT TIER GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {GIFT_TIERS.map((tier) => {
                const isSelected = selectedTierId === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => handleSelectTier(tier)}
                    className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 active:scale-[0.98] ${
                      isSelected
                        ? `${tier.colorBg} ${tier.colorBorder} ring-2 ring-amber-500 shadow-lg scale-[1.02]`
                        : "bg-white dark:bg-[#14161E] border-zinc-200/80 dark:border-white/10 hover:border-amber-400/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-3xl">{tier.emoji}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isSelected
                            ? "bg-amber-500 text-white"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        {tier.badge}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-zinc-950 dark:text-white">
                        {tier.name}
                      </p>
                      <p className={`text-sm font-black font-mono ${tier.colorText}`}>
                        {tier.stars} ★
                      </p>
                      <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                        {tier.tagline}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* CUSTOM STARS AMOUNT STEPPER */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#14161E] border border-zinc-200/80 dark:border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Custom Star Quantity:
                </label>
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                  ৳{giftStarsAmount} BDT
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setGiftStarsAmount((v) => Math.max(1, v - 50));
                  }}
                  className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-800 dark:text-zinc-200 active:scale-90 transition cursor-pointer shrink-0"
                >
                  <Minus className="w-4 h-4 stroke-[2.5]" />
                </button>

                <input
                  type="number"
                  min={1}
                  value={giftStarsAmount}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 1);
                    setGiftStarsAmount(val);
                  }}
                  className="flex-1 h-11 px-4 text-center font-mono font-black text-lg rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 outline-none text-zinc-950 dark:text-white"
                />

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setGiftStarsAmount((v) => v + 50);
                  }}
                  className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-800 dark:text-zinc-200 active:scale-90 transition cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* ENCOURAGING NOTE / MESSAGE INPUT */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#14161E] border border-zinc-200/80 dark:border-white/10 space-y-2">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                <span>Add Support Note (Optional):</span>
              </label>
              <textarea
                rows={2}
                value={cheerNote}
                onChange={(e) => setCheerNote(e.target.value)}
                placeholder="Write an encouraging note to show your appreciation..."
                className="w-full p-3 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-950 dark:text-white placeholder:text-zinc-400 outline-none resize-none"
              />
            </div>

            {/* SEND GIFT SUBMIT BUTTON */}
            <button
              type="button"
              onClick={handleGiftSubmit}
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm shadow-xl active:scale-[0.98] transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Star className="w-5 h-5 fill-white shrink-0" />
              <span>
                Send {activeTier.emoji} {giftStarsAmount} Stars to {creator.displayName}
              </span>
            </button>
          </div>
        )}

        {/* MODE 2: TOP UP / BUY STARS */}
        {mode === "buy" && (
          <form
            onSubmit={handleBuySubmit}
            className="p-5 rounded-3xl bg-white dark:bg-[#14161E] border border-zinc-200/80 dark:border-white/10 shadow-xl space-y-4"
          >
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-2">
                Select Top-Up Package (1 Star = ৳1.00 BDT):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[100, 500, 1000, 5000].map((pkg) => (
                  <button
                    key={pkg}
                    type="button"
                    onClick={() => setBuyStarsAmount(pkg)}
                    className={`p-3 rounded-2xl text-center transition cursor-pointer border ${
                      buyStarsAmount === pkg
                        ? "bg-[#1877F2] text-white border-[#1877F2] shadow-md ring-2 ring-blue-400"
                        : "bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    <span className="block font-mono font-black text-xs whitespace-nowrap">
                      {pkg} ★
                    </span>
                    <span className="block text-[11px] opacity-90 mt-0.5 whitespace-nowrap font-bold">
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
                    Official bKash / Nagad numbers will appear automatically once configured in Seller Payment Settings.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* PROVIDER TABS */}
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
                          : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
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
                          : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
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

                {/* OFFICIAL PAYMENT NUMBER */}
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
                      <span className="text-base font-black font-mono tracking-wider text-zinc-950 dark:text-white truncate">
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
                        className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
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
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 outline-none font-mono"
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
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 outline-none font-mono uppercase"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !activeAccount}
                  className="w-full py-4 rounded-2xl bg-[#1877F2] hover:bg-[#1465D6] text-white font-black text-sm shadow-xl transition active:scale-[0.98] cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  Confirm Star Order for {buyStarsAmount} Stars (৳{buyStarsAmount})
                </button>
              </>
            )}
          </form>
        )}
      </main>
    </div>
  );
};

export default GiftStarsPage;
