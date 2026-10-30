import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
  Plus,
  Minus,
  MessageSquare,
  ShieldCheck,
  FileText,
  Wallet,
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
import { getSafeDisplayName, getSafePublicUsername } from "../lib/utils";
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
  tagline: string;
  tierNote: string;
}

const GIFT_TIERS: GiftTier[] = [
  {
    id: "starter",
    name: "Appreciation",
    stars: 50,
    tagline: "Quick thank-you for a helpful post",
    tierNote: "Popular",
  },
  {
    id: "spark",
    name: "Golden Star",
    stars: 100,
    tagline: "Highlight great reporting & reels",
    tierNote: "Recommended",
  },
  {
    id: "boost",
    name: "Creator Boost",
    stars: 250,
    tagline: "Fuel independent community updates",
    tierNote: "Supporter",
  },
  {
    id: "super",
    name: "Super Star",
    stars: 500,
    tagline: "Standout recognition on Loops",
    tierNote: "Featured",
  },
  {
    id: "patron",
    name: "Crown Patron",
    stars: 1000,
    tagline: "Major backing for creator work",
    tierNote: "Patron",
  },
  {
    id: "legend",
    name: "Vanguard",
    stars: 5000,
    tagline: "Top-tier community backing",
    tierNote: "Vanguard",
  },
];

const TOPUP_PACKAGES = [100, 250, 500, 1000, 2500, 5000];

export const GiftStarsPage: React.FC = () => {
  const { creatorId } = useParams<{ creatorId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const notify = useNotify();

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const postId = searchParams.get("postId")?.trim() || "";

  const [creator, setCreator] = useState<any>(null);
  const [postContext, setPostContext] = useState<Record<string, any> | null>(
    null
  );
  const [currentUser, setCurrentUser] = useState<any>(() => auth.currentUser);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<"gift" | "buy">("gift");
  const [selectedTierId, setSelectedTierId] = useState<string>("spark");
  const [giftStarsAmount, setGiftStarsAmount] = useState<number>(100);
  const [cheerNote, setCheerNote] = useState<string>("");
  const [buyStarsAmount, setBuyStarsAmount] = useState<number>(250);

  const [userStarsBalance, setUserStarsBalance] = useState<number>(0);

  const [selectedProvider, setSelectedProvider] = useState<"bKash" | "Nagad">(
    "bKash"
  );
  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentTxId, setPaymentTxId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [giftSuccessDone, setGiftSuccessDone] = useState(false);

  const [platformData, setPlatformData] = useState<Record<string, any> | null>(
    null
  );
  const [platformFallbackData, setPlatformFallbackData] = useState<Record<
    string,
    any
  > | null>(null);
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
              Number(
                data.starsBalance ??
                  data.purchasedStars ??
                  data.sparks ??
                  0
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
              displayName: "Community Creator",
              username: "",
              photoURL: "",
            });
          }
          setLoading(false);
        },
        () => {
          setCreator({
            id: creatorId,
            displayName: "Community Creator",
            username: "",
            photoURL: "",
          });
          setLoading(false);
        }
      );
    } else {
      setLoading(false);
    }

    let unsubPost: (() => void) | undefined;
    if (postId) {
      unsubPost = onSnapshot(
        doc(db, "scam_posts", postId),
        (pSnap) => {
          if (pSnap.exists()) {
            setPostContext({ id: pSnap.id, ...pSnap.data() });
          }
        },
        () => {}
      );
    }

    const unsubPayments = onSnapshot(
      doc(db, "settings", "payments"),
      (snap) => setPlatformData(snap.exists() ? snap.data() : null),
      () => setPlatformData(null)
    );

    const unsubPlatform = onSnapshot(
      doc(db, "settings", "platform"),
      (snap) => setPlatformFallbackData(snap.exists() ? snap.data() : null),
      () => setPlatformFallbackData(null)
    );

    return () => {
      unsubAuth();
      if (unsubCreator) unsubCreator();
      if (unsubPost) unsubPost();
      unsubPayments();
      unsubPlatform();
    };
  }, [creatorId, postId]);

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

  const creatorName = getSafeDisplayName(
    creator,
    postContext?.reporterName || "Creator"
  );
  const creatorHandle = getSafePublicUsername(creator);
  const creatorAvatar =
    (creator?.photoURL && String(creator.photoURL).trim()) ||
    (creator?.avatarUrl && String(creator.avatarUrl).trim()) ||
    (postContext?.reporterAvatar && String(postContext.reporterAvatar).trim()) ||
    "";
  const creatorInitial = (creatorName || "C").trim().charAt(0).toUpperCase();
  const totalReceived = Number(
    creator?.totalStarsReceived || creator?.earnedStars || 0
  );

  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    triggerHaptic();
    notify(`${label} number copied`, "success");
    setTimeout(() => setCopiedKey(null), 2400);
  };

  const handleSelectTier = (tier: GiftTier) => {
    triggerHaptic();
    setSelectedTierId(tier.id);
    setGiftStarsAmount(tier.stars);
  };

  const handleGiftSubmit = async () => {
    if (!currentUser) {
      notify("Please sign in to gift stars", "error");
      const returnUrl = postId
        ? `/gift-stars/${creatorId}?postId=${encodeURIComponent(postId)}`
        : `/gift-stars/${creatorId}`;
      navigate("/signin", {
        state: { returnTo: returnUrl, from: "/loops" },
      });
      return;
    }
    if (!creatorId) return;

    if (giftStarsAmount <= 0) {
      notify("Please enter a valid star quantity", "error");
      return;
    }

    if (userStarsBalance < giftStarsAmount) {
      const shortfall = Math.max(100, giftStarsAmount - userStarsBalance);
      notify(
        `You need ${giftStarsAmount.toLocaleString()} Stars (available: ${userStarsBalance.toLocaleString()}). Top up your balance to continue.`,
        "info"
      );
      setBuyStarsAmount(shortfall);
      setMode("buy");
      return;
    }

    setIsSubmitting(true);
    triggerHaptic();

    try {
      const newSenderBal = userStarsBalance - giftStarsAmount;
      setUserStarsBalance(newSenderBal);
      localStorage.setItem("user_deep_sparks", String(newSenderBal));

      await updateDoc(doc(db, "users", currentUser.uid), {
        starsBalance: increment(-giftStarsAmount),
      }).catch(() => {});

      await updateDoc(doc(db, "users", creatorId), {
        earnedStars: increment(giftStarsAmount),
        totalStarsReceived: increment(giftStarsAmount),
      }).catch(() => {});

      if (postId) {
        await updateDoc(doc(db, "scam_posts", postId), {
          giftedStarsCount: increment(giftStarsAmount),
        }).catch(() => {});
      }

      const senderLabel = getSafeDisplayName(
        currentUser,
        currentUser.email?.split("@")[0] || "Member"
      );

      const giftDoc = await addDoc(collection(db, "star_gifts"), {
        senderUid: currentUser.uid,
        senderName: senderLabel,
        senderAvatar: currentUser.photoURL || "",
        recipientUid: creatorId,
        recipientName: creatorName,
        postId: postId || null,
        starsCount: giftStarsAmount,
        note: cheerNote.trim(),
        createdAt: Date.now(),
      });

      const targetLink = postId
        ? `/loops/post/${postId}`
        : `/loops/profile/${creatorId}`;

      addDoc(collection(db, "news_hub_notifications"), {
        recipientId: creatorId,
        userId: creatorId,
        senderId: currentUser.uid,
        fromUserId: currentUser.uid,
        senderName: senderLabel,
        fromUserName: senderLabel,
        senderAvatar: currentUser.photoURL || "",
        fromUserAvatar: currentUser.photoURL || "",
        type: "star_gift",
        title: `Gifted ${giftStarsAmount} Stars`,
        text: cheerNote.trim()
          ? `sent ${giftStarsAmount} Stars: "${cheerNote.trim().slice(0, 60)}"`
          : postId
          ? `sent ${giftStarsAmount} Stars on your post`
          : `sent you ${giftStarsAmount} Stars on Loops`,
        body: cheerNote.trim()
          ? `sent ${giftStarsAmount} Stars: "${cheerNote.trim().slice(0, 60)}"`
          : `sent you ${giftStarsAmount} Stars on Loops`,
        targetId: giftDoc.id,
        postId: postId || null,
        isRead: false,
        read: false,
        createdAt: Date.now(),
        link: targetLink,
      }).catch(() => {});

      setGiftSuccessDone(true);
      notify(
        `Sent ${giftStarsAmount.toLocaleString()} Stars to ${creatorName}`,
        "success"
      );

      setTimeout(() => {
        if (postId) {
          navigate(`/loops/post/${postId}`, { replace: true });
        } else {
          navigate(`/loops/profile/${creatorId}`, { replace: true });
        }
      }, 1100);
    } catch {
      notify("Could not send stars right now. Please try again.", "error");
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
      notify("No payment account configured yet.", "error");
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
    triggerHaptic();

    try {
      await addDoc(collection(db, "star_requests"), {
        userId: currentUser.uid,
        userName: getSafeDisplayName(
          currentUser,
          currentUser.email?.split("@")[0] || "Member"
        ),
        userEmail: currentUser.email || "",
        starsRequested: buyStarsAmount,
        amountBDT: buyStarsAmount,
        paymentMethod: activeAccount.provider.toLowerCase(),
        officialNumber: activeAccount.number,
        officialAccountType: activeAccount.type,
        phone: paymentPhone.trim(),
        txId: paymentTxId.trim().toUpperCase(),
        status: "pending",
        createdAt: Date.now(),
      });

      notify(
        `Top-up order for ${buyStarsAmount.toLocaleString()} Stars (৳${buyStarsAmount.toLocaleString()}) submitted for verification`,
        "success"
      );
      setPaymentPhone("");
      setPaymentTxId("");
      setMode("gift");
    } catch {
      notify("Failed to submit star top-up order", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !creator) {
    return <ProfileSettingsPageSkeleton />;
  }

  const postSnippet =
    (postContext?.title && String(postContext.title).trim()) ||
    (postContext?.description && String(postContext.description).trim()) ||
    "";

  const hasEnoughBalance = userStarsBalance >= giftStarsAmount;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#090A0D] text-zinc-900 dark:text-zinc-100 font-sans pb-24">
      <SEO
        title={`Gift Stars to ${creatorName} · DEEP SHOP`}
        description={`Support ${creatorName} with Stars on DEEP SHOP Loops.`}
      />

      {/* TOP BAR */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#090A0D]/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200 transition cursor-pointer shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-950 dark:text-white truncate">
                Gift Stars
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate hidden sm:block">
                Direct creator appreciation · 1 Star = ৳1 BDT
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              setMode((m) => (m === "gift" ? "buy" : "gift"));
            }}
            className="min-h-[40px] px-3.5 rounded-xl bg-amber-500/12 hover:bg-amber-500/20 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs sm:text-sm font-semibold transition flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 tabular-nums"
          >
            <Star className="w-4 h-4 fill-amber-500 text-amber-500 shrink-0" />
            <span>{userStarsBalance.toLocaleString()} Stars</span>
            <span className="text-amber-600/70 dark:text-amber-400/70">·</span>
            <span className="underline underline-offset-2">
              {mode === "gift" ? "Top up" : "Send gift"}
            </span>
          </button>
        </div>
      </header>

      {/* MAIN RESPONSIVE CONTAINER */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: RECIPIENT & WALLET SUMMARY */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
            {/* Creator Summary Card */}
            <section className="rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 p-5 space-y-4 shadow-2xs">
              <div className="flex items-center gap-3.5">
                <div className="relative shrink-0">
                  {creatorAvatar ? (
                    <img
                      src={creatorAvatar}
                      alt={creatorName}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                    />
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center justify-center text-xl font-bold">
                      {creatorInitial}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center ring-2 ring-white dark:ring-zinc-900">
                    <Star className="w-3.5 h-3.5 fill-white" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white truncate">
                      {creatorName}
                    </h2>
                    <CheckCircle2 className="w-4 h-4 text-[#0095F6] shrink-0" />
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 truncate">
                    {creatorHandle ? `@${creatorHandle}` : "Verified Member"} ·{" "}
                    <span className="tabular-nums font-medium text-zinc-700 dark:text-zinc-300">
                      {totalReceived.toLocaleString()} Stars received
                    </span>
                  </p>
                </div>
              </div>

              {/* Contextual Post Banner when gifting from a normal post */}
              {postId && (
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200/80 dark:border-zinc-800/80 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
                      <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Gifting on post</span>
                    </span>
                    {Number(postContext?.giftedStarsCount || 0) > 0 && (
                      <span className="tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                        {Number(postContext?.giftedStarsCount || 0).toLocaleString()} ★ on post
                      </span>
                    )}
                  </div>
                  {postSnippet ? (
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                      {postSnippet}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Your Stars will appear directly on this post&apos;s counter.
                    </p>
                  )}
                </div>
              )}

              {/* Wallet Balance Strip */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
                      Available wallet balance
                    </span>
                    <span className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white tabular-nums">
                      {userStarsBalance.toLocaleString()} Stars
                    </span>
                  </div>
                </div>

                {mode === "gift" ? (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setMode("buy");
                    }}
                    className="min-h-[38px] px-3.5 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold hover:opacity-90 transition whitespace-nowrap cursor-pointer"
                  >
                    Add Stars
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setMode("gift");
                    }}
                    className="min-h-[38px] px-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold hover:opacity-90 transition whitespace-nowrap cursor-pointer"
                  >
                    Back to Gift
                  </button>
                )}
              </div>
            </section>

            {/* Creator Payout Assurance */}
            <section className="rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 p-4 sm:p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Instant Creator Credit</span>
              </div>
              <p className="text-xs sm:text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                Every Star you send is credited immediately to {creatorName}
                &apos;s creator balance at a fixed 1 Star = ৳1.00 BDT rate, with
                an instant notification on Loops.
              </p>
            </section>
          </div>

          {/* RIGHT COLUMN: INTERACTIVE FLOW */}
          <div className="lg:col-span-7 space-y-5">
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-zinc-200/70 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setMode("gift");
                }}
                className={`min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                  mode === "gift"
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                <Star
                  className={`w-4 h-4 shrink-0 ${
                    mode === "gift"
                      ? "fill-amber-500 text-amber-500"
                      : "text-current"
                  }`}
                />
                <span>Send Gift</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setMode("buy");
                }}
                className={`min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                  mode === "buy"
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                <CreditCard className="w-4 h-4 shrink-0" />
                <span>Top Up Balance</span>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {mode === "gift" ? (
                <motion.div
                  key="gift-panel"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                  className="space-y-5"
                >
                  {/* Tier Grid Card */}
                  <section className="rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 p-4 sm:p-6 space-y-4 shadow-2xs">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white">
                        Select a Star bundle
                      </h3>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                        1 Star = ৳1 BDT
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {GIFT_TIERS.map((tier) => {
                        const isSelected =
                          selectedTierId === tier.id &&
                          giftStarsAmount === tier.stars;
                        return (
                          <button
                            key={tier.id}
                            type="button"
                            onClick={() => handleSelectTier(tier)}
                            className={`p-3.5 sm:p-4 rounded-2xl border text-left transition flex flex-col justify-between gap-3 cursor-pointer active:scale-[0.99] ${
                              isSelected
                                ? "bg-amber-500/[0.08] dark:bg-amber-500/[0.12] border-amber-500 ring-1 ring-amber-500"
                                : "bg-zinc-50/70 dark:bg-zinc-950/50 border-zinc-200/90 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                  isSelected
                                    ? "bg-amber-500 text-white"
                                    : "bg-amber-500/12 text-amber-600 dark:text-amber-400"
                                }`}
                              >
                                <Star className="w-4 h-4 fill-current" />
                              </div>
                              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                {tier.tierNote}
                              </span>
                            </div>

                            <div className="space-y-0.5">
                              <div className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white tabular-nums">
                                {tier.stars.toLocaleString()}{" "}
                                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                                  Stars
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                {tier.name} ·{" "}
                                <span className="tabular-nums text-zinc-500 dark:text-zinc-400 font-normal">
                                  ৳{tier.stars.toLocaleString()}
                                </span>
                              </p>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 pt-0.5">
                                {tier.tagline}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Quantity Stepper */}
                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="custom-star-qty"
                          className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300"
                        >
                          Custom Star amount
                        </label>
                        <span className="text-xs sm:text-sm font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                          Value: ৳{giftStarsAmount.toLocaleString()} BDT
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setGiftStarsAmount((v) => Math.max(10, v - 50));
                          }}
                          aria-label="Decrease stars by 50"
                          className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200 active:scale-95 transition cursor-pointer shrink-0"
                        >
                          <Minus className="w-4 h-4" />
                        </button>

                        <input
                          id="custom-star-qty"
                          type="number"
                          min={1}
                          value={giftStarsAmount}
                          onChange={(e) => {
                            const val = Math.max(
                              1,
                              parseInt(e.target.value, 10) || 1
                            );
                            setGiftStarsAmount(val);
                          }}
                          className="flex-1 h-11 px-4 text-center font-bold text-base sm:text-lg tabular-nums rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-amber-500 outline-none text-zinc-950 dark:text-white"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setGiftStarsAmount((v) => v + 50);
                          }}
                          aria-label="Increase stars by 50"
                          className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200 active:scale-95 transition cursor-pointer shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* Cheer Note + Submit Section */}
                  <section className="rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 p-4 sm:p-6 space-y-4 shadow-2xs">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="gift-cheer-note"
                          className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5"
                        >
                          <MessageSquare className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>Add a message (optional)</span>
                        </label>
                        <span className="text-xs text-zinc-400 tabular-nums">
                          {cheerNote.length}/160
                        </span>
                      </div>
                      <textarea
                        id="gift-cheer-note"
                        rows={2}
                        maxLength={160}
                        value={cheerNote}
                        onChange={(e) => setCheerNote(e.target.value)}
                        placeholder={`Write an encouraging note for ${creatorName}...`}
                        className="w-full p-3.5 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-amber-500 text-zinc-950 dark:text-white placeholder:text-zinc-400 outline-none resize-none"
                      />
                    </div>

                    {!hasEnoughBalance && (
                      <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3.5 flex items-center justify-between gap-3 text-xs sm:text-sm">
                        <span className="text-amber-800 dark:text-amber-300">
                          You need{" "}
                          <strong className="tabular-nums">
                            {(giftStarsAmount - userStarsBalance).toLocaleString()}
                          </strong>{" "}
                          more Stars for this gift.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setBuyStarsAmount(
                              Math.max(100, giftStarsAmount - userStarsBalance)
                            );
                            setMode("buy");
                          }}
                          className="min-h-[36px] px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold whitespace-nowrap cursor-pointer shrink-0"
                        >
                          Top Up Now
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleGiftSubmit}
                      disabled={isSubmitting || giftSuccessDone}
                      className="w-full min-h-[50px] px-5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white font-bold text-sm sm:text-base transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      {giftSuccessDone ? (
                        <>
                          <Check className="w-5 h-5 shrink-0" />
                          <span>Stars Sent!</span>
                        </>
                      ) : isSubmitting ? (
                        <span>Sending Stars...</span>
                      ) : (
                        <>
                          <Sparkles className="w-4.5 h-4.5 shrink-0" />
                          <span className="tabular-nums">
                            Send {giftStarsAmount.toLocaleString()} Stars · ৳
                            {giftStarsAmount.toLocaleString()}
                          </span>
                        </>
                      )}
                    </button>
                  </section>
                </motion.div>
              ) : (
                <motion.form
                  key="buy-panel"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                  onSubmit={handleBuySubmit}
                  className="rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 p-4 sm:p-6 space-y-5 shadow-2xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white">
                        Choose top-up package
                      </h3>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                        1 Star = ৳1.00 BDT
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {TOPUP_PACKAGES.map((pkg) => {
                        const active = buyStarsAmount === pkg;
                        return (
                          <button
                            key={pkg}
                            type="button"
                            onClick={() => {
                              triggerHaptic();
                              setBuyStarsAmount(pkg);
                            }}
                            className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                              active
                                ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white"
                                : "bg-zinc-50 dark:bg-zinc-950/60 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                            }`}
                          >
                            <span className="block text-sm sm:text-base font-bold tabular-nums">
                              {pkg.toLocaleString()} ★
                            </span>
                            <span
                              className={`block text-xs mt-0.5 tabular-nums ${
                                active
                                  ? "text-zinc-300 dark:text-zinc-600"
                                  : "text-zinc-500 dark:text-zinc-400"
                              }`}
                            >
                              ৳{pkg.toLocaleString()} BDT
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-1">
                      <label
                        htmlFor="topup-custom-amount"
                        className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1.5"
                      >
                        Or enter custom Star quantity (min 50)
                      </label>
                      <div className="flex items-center gap-2.5">
                        <input
                          id="topup-custom-amount"
                          type="number"
                          min={50}
                          value={buyStarsAmount}
                          onChange={(e) =>
                            setBuyStarsAmount(
                              Math.max(50, parseInt(e.target.value, 10) || 50)
                            )
                          }
                          className="flex-1 h-11 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-bold tabular-nums outline-none focus:border-zinc-900 dark:focus:border-white"
                        />
                        <div className="h-11 px-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center text-sm font-bold tabular-nums text-zinc-900 dark:text-white whitespace-nowrap">
                          ৳{buyStarsAmount.toLocaleString()} BDT
                        </div>
                      </div>
                    </div>
                  </div>

                  {!hasBkash && !hasNagad ? (
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs sm:text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">
                          Payment gateway not configured yet
                        </p>
                        <p className="text-xs opacity-85 mt-0.5 leading-relaxed">
                          Official bKash or Nagad numbers appear automatically
                          once configured in platform payment settings.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {hasBkash && hasNagad && (
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic();
                              setSelectedProvider("bKash");
                            }}
                            className={`min-h-[48px] p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                              selectedProvider === "bKash"
                                ? "bg-pink-50/80 dark:bg-pink-950/30 border-[#E2125B] ring-1 ring-[#E2125B]"
                                : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                            }`}
                          >
                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm font-bold text-[#E2125B] block whitespace-nowrap">
                                bKash · {rotatedBkash?.type || "Personal"}
                              </span>
                              <span className="text-[11px] text-zinc-500 block whitespace-nowrap">
                                {getMobileActionLabel(rotatedBkash?.type)}
                              </span>
                            </div>
                            <div
                              className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 ${
                                selectedProvider === "bKash"
                                  ? "border-[#E2125B] bg-[#E2125B] text-white"
                                  : "border-zinc-300 dark:border-zinc-700"
                              }`}
                            >
                              {selectedProvider === "bKash" && (
                                <Check className="w-3 h-3 stroke-[3]" />
                              )}
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic();
                              setSelectedProvider("Nagad");
                            }}
                            className={`min-h-[48px] p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                              selectedProvider === "Nagad"
                                ? "bg-orange-50/80 dark:bg-orange-950/30 border-[#F57C20] ring-1 ring-[#F57C20]"
                                : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                            }`}
                          >
                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm font-bold text-[#F57C20] block whitespace-nowrap">
                                Nagad · {rotatedNagad?.type || "Personal"}
                              </span>
                              <span className="text-[11px] text-zinc-500 block whitespace-nowrap">
                                {getMobileActionLabel(rotatedNagad?.type)}
                              </span>
                            </div>
                            <div
                              className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 ${
                                selectedProvider === "Nagad"
                                  ? "border-[#F57C20] bg-[#F57C20] text-white"
                                  : "border-zinc-300 dark:border-zinc-700"
                              }`}
                            >
                              {selectedProvider === "Nagad" && (
                                <Check className="w-3 h-3 stroke-[3]" />
                              )}
                            </div>
                          </button>
                        </div>
                      )}

                      {activeAccount && (
                        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                              Official {selectedProvider} ({activeAccount.type})
                            </span>
                            <span className="text-zinc-500 dark:text-zinc-400">
                              {getMobileActionLabel(activeAccount.type)} · ৳
                              {buyStarsAmount.toLocaleString()}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                            <span className="text-base sm:text-lg font-bold font-mono tabular-nums tracking-wider text-zinc-950 dark:text-white truncate">
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
                              className="min-h-[38px] px-3.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                            >
                              {copiedKey === activeAccount.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {copiedKey === activeAccount.id
                                  ? "Copied"
                                  : "Copy"}
                              </span>
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                            Sender {activeAccount?.provider || "Mobile"} Number
                          </label>
                          <input
                            type="tel"
                            placeholder="01XXXXXXXXX"
                            value={paymentPhone}
                            onChange={(e) => setPaymentPhone(e.target.value)}
                            className="w-full h-11 px-3.5 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-zinc-900 dark:focus:border-white outline-none font-mono tabular-nums"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                            Transaction ID (TrxID)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 9J283HX10"
                            value={paymentTxId}
                            onChange={(e) => setPaymentTxId(e.target.value)}
                            className="w-full h-11 px-3.5 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-zinc-900 dark:focus:border-white outline-none font-mono uppercase"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting || !activeAccount}
                        className="w-full min-h-[50px] px-5 rounded-xl bg-zinc-950 dark:bg-white hover:opacity-90 text-white dark:text-zinc-950 font-bold text-sm sm:text-base transition active:scale-[0.99] cursor-pointer disabled:opacity-50 whitespace-nowrap tabular-nums"
                      >
                        {isSubmitting
                          ? "Submitting verification..."
                          : `Confirm Top-Up · ${buyStarsAmount.toLocaleString()} Stars (৳${buyStarsAmount.toLocaleString()})`}
                      </button>
                    </>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GiftStarsPage;
