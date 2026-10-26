import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  TrendingUp,
  Star,
  Handshake,
  DollarSign,
  Plus,
  Eye,
  Heart,
  MessageCircle,
  Award,
  Save,
  Trash2,
  CheckCircle2,
  Coins,
  BarChart3,
  ChevronRight,
  Wallet,
  Lock,
  Pencil
} from "lucide-react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  addDoc
} from "firebase/firestore";
import { useNotify, useConfirm } from "../components/Notifications";
import SEO from "../components/SEO";
import { triggerHaptic } from "../lib/haptics";
import {
  ConfiguredMobileAccount,
  MobileAccountType,
  extractConfiguredMobileAccounts,
  formatDhakaDateTime
} from "../lib/dhakaTime";
import {
  subscribeToFollowerStats,
  getEffectiveFollowersCount,
} from "../lib/follow";
import creatorAvatarFallback from "../src/assets/images/story_avatar_creator_1_1792826814910.jpg";
import postImageFallback from "../src/assets/images/feed_showcase_park_1792826817616.jpg";

type TabType = "analytics" | "monetise" | "content" | "settings";

const ACCOUNT_TYPES: MobileAccountType[] = ["Personal", "Payment", "Agent"];

const REACTION_BREAKDOWN_ITEMS = [
  { key: "love", emoji: "❤️", label: "Love" },
  { key: "like", emoji: "👍", label: "Like" },
  { key: "haha", emoji: "😆", label: "Haha" },
  { key: "wow", emoji: "😮", label: "Wow" },
  { key: "sad", emoji: "😢", label: "Sad" },
  { key: "angry", emoji: "😡", label: "Angry" },
] as const;

export const CreatorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const notify = useNotify();
  const confirm = useConfirm();

  const [currentUser, setCurrentUser] = useState<User | null>(() => auth.currentUser);
  const [authChecked, setAuthChecked] = useState(false);

  const initialTabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (
      initialTabParam === "monetise" ||
      initialTabParam === "content" ||
      initialTabParam === "settings" ||
      initialTabParam === "analytics"
    ) {
      return initialTabParam;
    }
    return "analytics";
  });

  // Creator profile & posts state
  const [userData, setUserData] = useState<Record<string, any> | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Multiple bKash & Nagad accounts with Personal / Payment / Agent types
  const [bkashAccounts, setBkashAccounts] = useState<ConfiguredMobileAccount[]>([]);
  const [nagadAccounts, setNagadAccounts] = useState<ConfiguredMobileAccount[]>([]);
  const [newBkashNumber, setNewBkashNumber] = useState("");
  const [newBkashType, setNewBkashType] = useState<MobileAccountType>("Personal");
  const [newNagadNumber, setNewNagadNumber] = useState("");
  const [newNagadType, setNewNagadType] = useState<MobileAccountType>("Personal");
  const [isSavingNumbers, setIsSavingNumbers] = useState(false);

  // Live synced follower count
  const [liveFollowersCount, setLiveFollowersCount] = useState<number | null>(null);

  // Content Monetization & Program toggles (defaults strictly to OFF until unlocked at 1K & enabled)
  const [contentMonetizationEnabled, setContentMonetizationEnabled] = useState<boolean>(false);
  const [monetizationEnabledAt, setMonetizationEnabledAt] = useState<number>(0);
  const [partnershipAdsEnabled, setPartnershipAdsEnabled] = useState<boolean>(() => {
    return localStorage.getItem("creator_partnership_ads") !== "false";
  });
  const [subscriptionEnabled, setSubscriptionEnabled] = useState<boolean>(() => {
    return localStorage.getItem("creator_subscription_enabled") === "true";
  });
  const [subscriptionFee] = useState<string>(() => {
    return localStorage.getItem("creator_subscription_fee") || "500";
  });

  // Inline withdrawal drawers (no popups)
  const [showContentPayoutForm, setShowContentPayoutForm] = useState(false);
  const [contentPayoutMethod, setContentPayoutMethod] = useState<"bKash" | "Nagad">("bKash");
  const [contentPayoutPhone, setContentPayoutPhone] = useState("");
  const [isSubmittingContentPayout, setIsSubmittingContentPayout] = useState(false);

  const [showStarWithdrawForm, setShowStarWithdrawForm] = useState(false);
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<"bKash" | "Nagad">("bKash");
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

  // Reactive Firebase Auth listener
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
      setAuthChecked(true);
      if (!u) {
        notify("Account required: Please sign in to access Creator Dashboard!", "error");
        navigate("/signin", { state: { returnTo: "/creator-dashboard" } });
      }
    });
    return unsubAuth;
  }, [navigate, notify]);

  useEffect(() => {
    if (!authChecked || !currentUser) return;
    const unsubFollowStats = subscribeToFollowerStats(
      currentUser.uid,
      currentUser.uid,
      (stats) => {
        setLiveFollowersCount(stats.followersCount);
      }
    );
    return () => unsubFollowStats();
  }, [authChecked, currentUser]);

  useEffect(() => {
    if (!authChecked || !currentUser) return;

    const loadCreatorData = async () => {
      setLoading(true);
      try {
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserData(data);

          const extracted = extractConfiguredMobileAccounts(data);
          setBkashAccounts(extracted.bkash);
          setNagadAccounts(extracted.nagad);

          const docFollowers = getEffectiveFollowersCount(data);
          const unlocked = docFollowers >= 1000;
          const isEnabledInDoc = Boolean(unlocked && data.contentMonetizationEnabled === true);
          let enabledTs = Number(data.monetizationEnabledAt || 0);

          // If previously enabled in doc without an activation timestamp, stamp now so older posts never retroactively earn
          if (isEnabledInDoc && enabledTs <= 0) {
            enabledTs = Date.now();
            await setDoc(
              doc(db, "users", currentUser.uid),
              { monetizationEnabledAt: enabledTs },
              { merge: true }
            ).catch(() => {});
          }

          setContentMonetizationEnabled(isEnabledInDoc);
          setMonetizationEnabledAt(enabledTs);
          localStorage.setItem(
            "creator_content_monetization",
            String(isEnabledInDoc)
          );
          if (enabledTs > 0) {
            localStorage.setItem("creator_monetization_enabled_at", String(enabledTs));
          }

          if (typeof data.partnershipAdsEnabled === "boolean") {
            setPartnershipAdsEnabled(data.partnershipAdsEnabled);
          }
          if (typeof data.subscriptionEnabled === "boolean") {
            setSubscriptionEnabled(data.subscriptionEnabled);
          }
        }

        const postsSnap = await getDocs(collection(db, "scam_posts"));
        const allPosts: any[] = [];
        postsSnap.forEach((d) => allPosts.push({ id: d.id, ...d.data() }));

        const userPosts = allPosts
          .filter(
            (p) =>
              p.reporterId === currentUser.uid || p.authorId === currentUser.uid
          )
          .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

        setPosts(userPosts);
      } catch (err) {
        console.error("Error loading creator data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadCreatorData();
  }, [authChecked, currentUser]);

  const persistCreatorSettings = async (patch: Record<string, any>) => {
    if (!currentUser) return;
    try {
      await setDoc(doc(db, "users", currentUser.uid), patch, { merge: true });
      setUserData((prev) => ({ ...(prev || {}), ...patch }));
    } catch (err) {
      console.error("Failed to persist creator setting:", err);
    }
  };

  const handleDeleteCreatorPost = (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    triggerHaptic();
    confirm({
      title: "Delete Post?",
      message:
        "Are you sure you want to permanently delete this post? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "scam_posts", postId));
        } catch {}
        try {
          const local = JSON.parse(
            localStorage.getItem("scam_posts_local_v1") || "[]"
          );
          if (Array.isArray(local)) {
            localStorage.setItem(
              "scam_posts_local_v1",
              JSON.stringify(local.filter((p: any) => p.id !== postId))
            );
          }
        } catch {}
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        notify("Post deleted successfully", "success");
      },
    });
  };

  const storedFollowerCount = getEffectiveFollowersCount(userData);
  const followerCount =
    liveFollowersCount !== null ? liveFollowersCount : storedFollowerCount;
  const MONETIZATION_MIN_FOLLOWERS = 1000;
  const isMonetizationUnlocked = followerCount >= MONETIZATION_MIN_FOLLOWERS;

  const toggleContentMonetization = async () => {
    triggerHaptic();
    if (!isMonetizationUnlocked) {
      notify(
        `Content Monetization is locked until you reach 1,000 followers (${followerCount.toLocaleString()} / 1,000).`,
        "error"
      );
      return;
    }
    const nextVal = !contentMonetizationEnabled;
    const nextEnabledAt = nextVal
      ? monetizationEnabledAt > 0
        ? monetizationEnabledAt
        : Date.now()
      : monetizationEnabledAt;

    setContentMonetizationEnabled(nextVal);
    if (nextEnabledAt > 0) {
      setMonetizationEnabledAt(nextEnabledAt);
      localStorage.setItem("creator_monetization_enabled_at", String(nextEnabledAt));
    }
    localStorage.setItem("creator_content_monetization", String(nextVal));

    await persistCreatorSettings({
      contentMonetizationEnabled: nextVal,
      ...(nextVal ? { monetizationEnabledAt: nextEnabledAt } : {}),
    });
    notify(
      nextVal
        ? "Content Monetization enabled! New posts published from now on will earn reach & engagement revenue."
        : "Content Monetization paused.",
      "success"
    );
  };

  const togglePartnershipAds = async () => {
    triggerHaptic();
    const nextVal = !partnershipAdsEnabled;
    setPartnershipAdsEnabled(nextVal);
    localStorage.setItem("creator_partnership_ads", String(nextVal));
    await persistCreatorSettings({ partnershipAdsEnabled: nextVal });
    notify(
      nextVal
        ? "Per-Post Sponsorship activated!"
        : "Per-Post Sponsorship turned off.",
      "success"
    );
  };

  const toggleSubscription = async () => {
    triggerHaptic();
    const nextVal = !subscriptionEnabled;
    setSubscriptionEnabled(nextVal);
    localStorage.setItem("creator_subscription_enabled", String(nextVal));
    await persistCreatorSettings({ subscriptionEnabled: nextVal });
    notify(
      nextVal
        ? `Monthly Subscriptions activated at ৳${subscriptionFee}/month!`
        : "Monthly Subscriptions paused.",
      "success"
    );
  };

  // Add / Remove / Update bKash & Nagad numbers
  const handleAddAccount = (provider: "bKash" | "Nagad") => {
    const rawNum = provider === "bKash" ? newBkashNumber.trim() : newNagadNumber.trim();
    const accType = provider === "bKash" ? newBkashType : newNagadType;

    if (!rawNum) {
      notify(`Enter a valid ${provider} number first`, "error");
      return;
    }

    const entry: ConfiguredMobileAccount = {
      id: `${provider.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      provider,
      type: accType,
      number: rawNum
    };

    if (provider === "bKash") {
      if (bkashAccounts.some((a) => a.number === rawNum && a.type === accType)) {
        notify("This bKash number & type is already added", "error");
        return;
      }
      setBkashAccounts((prev) => [...prev, entry]);
      setNewBkashNumber("");
    } else {
      if (nagadAccounts.some((a) => a.number === rawNum && a.type === accType)) {
        notify("This Nagad number & type is already added", "error");
        return;
      }
      setNagadAccounts((prev) => [...prev, entry]);
      setNewNagadNumber("");
    }
    triggerHaptic();
  };

  const handleUpdateAccountType = (
    provider: "bKash" | "Nagad",
    id: string,
    nextType: MobileAccountType
  ) => {
    if (provider === "bKash") {
      setBkashAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, type: nextType } : a))
      );
    } else {
      setNagadAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, type: nextType } : a))
      );
    }
  };

  const handleRemoveAccount = (provider: "bKash" | "Nagad", id: string) => {
    if (provider === "bKash") {
      setBkashAccounts((prev) => prev.filter((a) => a.id !== id));
    } else {
      setNagadAccounts((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const handleSavePaymentNumbers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    // Also include any typed-but-unadded input automatically so user never loses typed numbers
    const finalBkash = [...bkashAccounts];
    if (newBkashNumber.trim()) {
      finalBkash.push({
        id: `bkash_${Date.now()}`,
        provider: "bKash",
        type: newBkashType,
        number: newBkashNumber.trim()
      });
      setBkashAccounts(finalBkash);
      setNewBkashNumber("");
    }

    const finalNagad = [...nagadAccounts];
    if (newNagadNumber.trim()) {
      finalNagad.push({
        id: `nagad_${Date.now()}`,
        provider: "Nagad",
        type: newNagadType,
        number: newNagadNumber.trim()
      });
      setNagadAccounts(finalNagad);
      setNewNagadNumber("");
    }

    setIsSavingNumbers(true);
    triggerHaptic();

    try {
      const payload = {
        bkashAccounts: finalBkash,
        nagadAccounts: finalNagad,
        bkashNumbers: finalBkash.map((a) => a.number),
        nagadNumbers: finalNagad.map((a) => a.number),
        bkashNumber: finalBkash[0]?.number || "",
        bkashAccountType: finalBkash[0]?.type || "Personal",
        nagadNumber: finalNagad[0]?.number || "",
        nagadAccountType: finalNagad[0]?.type || "Personal",
        updatedAt: Date.now()
      };

      await setDoc(doc(db, "users", currentUser.uid), payload, { merge: true });
      setUserData((prev) => ({ ...(prev || {}), ...payload }));

      notify(
        "Payment accounts saved! Only configured gateways will be shown on your Gift & Sponsorship pages.",
        "success"
      );
    } catch (err) {
      notify("Failed to save payment accounts", "error");
    } finally {
      setIsSavingNumbers(false);
    }
  };

  // Real calculated totals across posts
  const earnedStars = Number(userData?.earnedStars || 0);
  const purchasedStars = Number(userData?.purchasedStars || 0);

  const getPostReactionBreakdown = (p: any) => {
    const rc = p?.reactionsCount;
    if (rc && typeof rc === "object" && Object.keys(rc).length > 0) {
      return {
        love: Number(rc.love || 0),
        like: Number(rc.like || 0),
        haha: Number(rc.haha || 0),
        wow: Number(rc.wow || 0),
        sad: Number(rc.sad || 0),
        angry: Number(rc.angry || 0),
      };
    }
    const fallbackVotes = Number(p?.likesCount || p?.votes || 0);
    return {
      love: fallbackVotes,
      like: 0,
      haha: 0,
      wow: 0,
      sad: 0,
      angry: 0,
    };
  };

  const sumReactionsForPost = (p: any): number => {
    const b = getPostReactionBreakdown(p);
    return b.love + b.like + b.haha + b.wow + b.sad + b.angry;
  };

  const overallReactionBreakdown = posts.reduce(
    (acc, p) => {
      const b = getPostReactionBreakdown(p);
      acc.love += b.love;
      acc.like += b.like;
      acc.haha += b.haha;
      acc.wow += b.wow;
      acc.sad += b.sad;
      acc.angry += b.angry;
      return acc;
    },
    { love: 0, like: 0, haha: 0, wow: 0, sad: 0, angry: 0 }
  );

  const totalViews = posts.reduce((acc, p) => acc + Number(p.views || 0), 0);
  const totalReactions = posts.reduce((acc, p) => acc + sumReactionsForPost(p), 0);
  const totalComments = posts.reduce(
    (acc, p) => acc + Number(p.commentsCount || 0),
    0
  );
  const engagementRate =
    totalViews > 0
      ? (((totalReactions + totalComments) / totalViews) * 100).toFixed(1)
      : "0.0";

  // Content Monetization Revenue Calculation (BDT)
  // STRICT RULE: Earnings ONLY count from posts published AFTER Content Monetization was turned ON (`monetizationEnabledAt`) after reaching 1K followers.
  // Any older posts published BEFORE `monetizationEnabledAt` earn ৳0.00.
  const effectiveContentMonetization =
    isMonetizationUnlocked && contentMonetizationEnabled && monetizationEnabledAt > 0;

  const isPostMonetizationEligible = (p: any): boolean => {
    if (!effectiveContentMonetization || monetizationEnabledAt <= 0) return false;
    return Number(p.createdAt || 0) >= monetizationEnabledAt;
  };

  const eligibleMonetizedPosts = effectiveContentMonetization
    ? posts.filter((p) => isPostMonetizationEligible(p))
    : [];

  const monetizedViews = eligibleMonetizedPosts.reduce(
    (acc, p) => acc + Number(p.views || 0),
    0
  );
  const monetizedReactions = eligibleMonetizedPosts.reduce(
    (acc, p) => acc + sumReactionsForPost(p),
    0
  );
  const monetizedComments = eligibleMonetizedPosts.reduce(
    (acc, p) => acc + Number(p.commentsCount || 0),
    0
  );

  const reachRevenueBDT = effectiveContentMonetization
    ? (monetizedViews / 1000) * 50
    : 0;
  const engagementBonusBDT = effectiveContentMonetization
    ? monetizedReactions * 0.25 + monetizedComments * 0.5
    : 0;
  const bonusBalanceBDT = Number(userData?.contentEarningsBDT || 0);
  const totalContentRevenueBDT = effectiveContentMonetization
    ? reachRevenueBDT + engagementBonusBDT + bonusBalanceBDT
    : bonusBalanceBDT;

  const creatorName =
    userData?.displayName ||
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "Creator";
  const creatorAvatar =
    userData?.photoURL || currentUser?.photoURL || creatorAvatarFallback;

  // Submit Content Monetization Payout Request
  const handleContentPayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!isMonetizationUnlocked) {
      notify(
        "Content Monetization unlocks once you reach 1,000 followers.",
        "error"
      );
      return;
    }

    if (totalContentRevenueBDT < 500) {
      notify(
        `Minimum ৳500.00 BDT required for Content Monetization payout. Current: ৳${totalContentRevenueBDT.toFixed(2)}.`,
        "error"
      );
      return;
    }

    if (!contentPayoutPhone.trim()) {
      notify("Please enter your payout mobile number", "error");
      return;
    }

    setIsSubmittingContentPayout(true);
    try {
      await addDoc(collection(db, "star_withdrawals"), {
        userId: currentUser.uid,
        userName: creatorName,
        userEmail: currentUser.email || "",
        payoutType: "content_monetization",
        starsAmount: Math.round(totalContentRevenueBDT),
        amountBDT: Number(totalContentRevenueBDT.toFixed(2)),
        paymentMethod: contentPayoutMethod,
        accountPhone: contentPayoutPhone.trim(),
        status: "pending",
        createdAt: Date.now()
      });

      notify(
        `Content Monetization payout request of ৳${totalContentRevenueBDT.toFixed(2)} submitted!`,
        "success"
      );
      setShowContentPayoutForm(false);
      setContentPayoutPhone("");
    } catch {
      notify("Failed to submit content payout request", "error");
    } finally {
      setIsSubmittingContentPayout(false);
    }
  };

  // Submit Star Earnings Withdrawal Request
  const handleStarWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (earnedStars < 1000) {
      notify(
        `Minimum 1,000 earned stars (৳1,000) required to withdraw. Current: ${earnedStars} stars.`,
        "error"
      );
      return;
    }

    if (!withdrawPhone.trim()) {
      notify("Please enter your bKash or Nagad phone number", "error");
      return;
    }

    setIsSubmittingWithdraw(true);
    try {
      await addDoc(collection(db, "star_withdrawals"), {
        userId: currentUser.uid,
        userName: creatorName,
        userEmail: currentUser.email || "",
        payoutType: "gifted_stars",
        starsAmount: earnedStars,
        amountBDT: earnedStars,
        paymentMethod: withdrawMethod,
        accountPhone: withdrawPhone.trim(),
        status: "pending",
        createdAt: Date.now()
      });

      notify(
        `Star withdrawal request of ৳${earnedStars} (${earnedStars} Stars) submitted!`,
        "success"
      );
      setShowStarWithdrawForm(false);
      setWithdrawPhone("");
    } catch {
      notify("Failed to submit withdrawal request", "error");
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans pb-24">
      <SEO
        title="Creator Studio & Content Monetization • DEEP SHOP"
        description="Track post reach, manage Content Monetization, configure bKash/Nagad payout numbers, and grow your community on DEEP SHOP."
      />

      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate("/news-hub")}
              className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0"
              title="Back to News Hub"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-zinc-900 dark:text-white truncate">
                Creator Dashboard
              </h1>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                {creatorName} · {posts.length} published posts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate("/news-hub/create")}
              className="px-3.5 py-1.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-extrabold whitespace-nowrap shrink-0 hover:opacity-90 transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Post</span>
            </button>
            <img
              src={creatorAvatar}
              alt={creatorName}
              className="w-9 h-9 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 shrink-0 hidden sm:block"
            />
          </div>
        </div>

        {/* SINGLE-LINE SLIM ROUNDED TAB SWITCHER */}
        <div className="max-w-5xl mx-auto px-4 pb-3 overflow-x-auto no-scrollbar flex items-center gap-2">
          {(
            [
              { id: "analytics", label: "Insights" },
              { id: "monetise", label: "Content Monetization" },
              { id: "content", label: `Posts (${posts.length})` },
              { id: "settings", label: "Payment Accounts" }
            ] as { id: TabType; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap shrink-0 transition cursor-pointer inline-flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                  : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              {tab.id === "monetise" && !isMonetizationUnlocked && (
                <Lock className="w-3 h-3 shrink-0 opacity-80" />
              )}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* BODY CONTAINER (div instead of main to avoid global light-mode main override) */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="p-10 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-500">
            Loading Creator Studio metrics...
          </div>
        ) : null}

        {/* TAB 1: INSIGHTS & CONTENT MONETIZATION SUMMARY */}
        {!loading && activeTab === "analytics" && (
          <div className="space-y-6">
            {/* 4 METRIC CARDS - 2x2 on mobile, 4 columns on desktop */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-2">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block whitespace-nowrap">
                  Followers
                </span>
                <span className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white block font-mono">
                  {followerCount.toLocaleString()}
                </span>
                <div className="h-1 w-10 bg-blue-600 rounded-full" />
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-2">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block whitespace-nowrap">
                  Engagement
                </span>
                <span className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white block font-mono">
                  {engagementRate}%
                </span>
                <div className="h-1 w-10 bg-emerald-500 rounded-full" />
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-2">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block whitespace-nowrap">
                  Post Reach
                </span>
                <span className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white block font-mono">
                  {totalViews.toLocaleString()}
                </span>
                <div className="h-1 w-10 bg-amber-500 rounded-full" />
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-2">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block whitespace-nowrap">
                  Reactions
                </span>
                <span className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white block font-mono">
                  {totalReactions.toLocaleString()}
                </span>
                <div className="h-1 w-10 bg-rose-500 rounded-full" />
              </div>
            </div>

            {/* SEPARATE REACTION BREAKDOWN CARD (ONLY IN AUTHOR'S DASHBOARD) */}
            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs sm:text-sm font-extrabold text-zinc-900 dark:text-white">
                  Reactions Breakdown (Across Your Posts)
                </h3>
                <span className="text-[11px] font-bold text-zinc-500 tabular-nums">
                  Total: {totalReactions.toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {REACTION_BREAKDOWN_ITEMS.map((item) => (
                  <div
                    key={item.key}
                    className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200/60 dark:border-zinc-700/60 flex flex-col items-center text-center space-y-1"
                  >
                    <span className="text-lg leading-none">{item.emoji}</span>
                    <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                      {item.label}
                    </span>
                    <span className="text-sm font-black text-zinc-900 dark:text-white font-mono tabular-nums">
                      {overallReactionBreakdown[item.key].toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CONTENT MONETIZATION QUICK OVERVIEW BANNER (ALWAYS VISIBLE ON INSIGHTS) */}
            <div
              className={`p-5 sm:p-6 rounded-3xl bg-white dark:bg-zinc-900 border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                isMonetizationUnlocked
                  ? "border-emerald-500/30 dark:border-emerald-500/30"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div className="space-y-2 min-w-0 flex-1">
                <div
                  className={`flex items-center gap-2 text-xs font-bold ${
                    isMonetizationUnlocked
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {isMonetizationUnlocked ? (
                    <Coins className="w-4 h-4 shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 shrink-0" />
                  )}
                  <span>Content Monetization</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {!isMonetizationUnlocked
                      ? "Locked (1K Followers Required)"
                      : contentMonetizationEnabled
                      ? "Active"
                      : "Paused"}
                  </span>
                </div>

                {isMonetizationUnlocked ? (
                  <>
                    <h2 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white tabular-nums">
                      ৳{totalContentRevenueBDT.toFixed(2)} BDT Estimated Content Revenue
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {effectiveContentMonetization ? (
                        <>
                          Active since {formatDhakaDateTime(monetizationEnabledAt)} · Earned from{" "}
                          {eligibleMonetizedPosts.length} post-activation posts (
                          {monetizedViews.toLocaleString()} views,{" "}
                          {monetizedReactions.toLocaleString()} reactions). Posts published before activation earn ৳0.00.
                        </>
                      ) : (
                        <>
                          Turn ON Content Monetization to start earning from new posts published after activation. Older posts published before activation do not generate earnings.
                        </>
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white">
                      Reach 1,000 Followers to Unlock Content Monetization
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      You currently have{" "}
                      <strong className="font-mono text-zinc-900 dark:text-white">
                        {followerCount.toLocaleString()} / 1,000
                      </strong>{" "}
                      followers (
                      {(MONETIZATION_MIN_FOLLOWERS - followerCount).toLocaleString()}{" "}
                      more needed).
                    </p>
                    <progress
                      value={Math.min(followerCount, MONETIZATION_MIN_FOLLOWERS)}
                      max={MONETIZATION_MIN_FOLLOWERS}
                      className="w-full max-w-sm h-2 rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-zinc-100 dark:[&::-webkit-progress-bar]:bg-zinc-800 [&::-webkit-progress-value]:bg-amber-500 [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:bg-amber-500"
                    />
                  </>
                )}
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab("monetise")}
                  className={`px-4 py-2 rounded-full text-white text-xs font-extrabold whitespace-nowrap shrink-0 transition cursor-pointer flex items-center gap-1.5 ${
                    isMonetizationUnlocked
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-zinc-900 dark:bg-zinc-800 hover:opacity-90"
                  }`}
                >
                  {!isMonetizationUnlocked && <Lock className="w-3.5 h-3.5" />}
                  <span>
                    {isMonetizationUnlocked
                      ? "Open Content Monetization"
                      : "View Eligibility"}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* TOP PERFORMING POSTS */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-extrabold text-zinc-900 dark:text-white tracking-tight">
                  Top Performing Posts
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("content")}
                  className="text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition whitespace-nowrap cursor-pointer"
                >
                  View all ({posts.length})
                </button>
              </div>

              {posts.length === 0 ? (
                <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center space-y-3">
                  <p className="text-xs text-zinc-500">
                    No published posts yet. Publish community updates or scam alerts in News Hub to start earning reach and monetization revenue.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/news-hub/create")}
                    className="px-4 py-1.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-extrabold whitespace-nowrap cursor-pointer"
                  >
                    Create First Post
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {posts.slice(0, 6).map((post) => {
                    const imgUrl = post.images?.[0] || postImageFallback;
                    const postViews = Number(post.views || 0);
                    const reactionsSum = sumReactionsForPost(post);
                    const pEngRate =
                      postViews > 0
                        ? (
                            ((reactionsSum + Number(post.commentsCount || 0)) /
                              postViews) *
                            100
                          ).toFixed(1)
                        : "0.0";
                    const eligibleForEarnings = isPostMonetizationEligible(post);
                    const postEstBDT = eligibleForEarnings
                      ? (
                          (postViews / 1000) * 50 +
                          reactionsSum * 0.25 +
                          Number(post.commentsCount || 0) * 0.5
                        ).toFixed(2)
                      : "0.00";

                    return (
                      <div
                        key={post.id}
                        onClick={() => navigate(`/news-hub/post/${post.id}`)}
                        className="p-3.5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition cursor-pointer flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {post.images?.[0] ? (
                            <img
                              src={imgUrl}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-14 h-14 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-800 shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                              <BarChart3 className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-white line-clamp-1">
                              {post.title || post.description || "Community Post"}
                            </h4>
                            <p className="text-[11px] text-zinc-500 mt-0.5 whitespace-nowrap truncate">
                              {post.postType === "scam" ? "Scam Report" : "Community Post"} ·{" "}
                              {formatDhakaDateTime(post.createdAt)}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 tabular-nums">
                                <Eye className="w-3 h-3" /> {postViews}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 tabular-nums">
                                <Heart className="w-3 h-3" /> {reactionsSum}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 tabular-nums">
                                <MessageCircle className="w-3 h-3" />{" "}
                                {post.commentsCount || 0}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {REACTION_BREAKDOWN_ITEMS.map((rx) => {
                                const rxBreakdown = getPostReactionBreakdown(post);
                                return (
                                  <span
                                    key={rx.key}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 tabular-nums"
                                    title={`${rx.label}: ${rxBreakdown[rx.key]}`}
                                  >
                                    <span>{rx.emoji}</span>
                                    <span>{rxBreakdown[rx.key]}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span
                              className={`text-xs font-black block font-mono tabular-nums whitespace-nowrap ${
                                eligibleForEarnings
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-zinc-400 dark:text-zinc-500"
                              }`}
                            >
                              ৳{postEstBDT}
                            </span>
                            <span className="text-[10px] text-zinc-400 block whitespace-nowrap">
                              {eligibleForEarnings
                                ? `${pEngRate}% · Monetized`
                                : monetizationEnabledAt > 0 &&
                                  Number(post.createdAt || 0) < monetizationEnabledAt
                                ? "Pre-monetization"
                                : `${pEngRate}% eng.`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerHaptic();
                                navigate(`/news-hub/create?edit=${post.id}`);
                              }}
                              className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
                              aria-label="Edit post"
                              title="Edit post"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCreatorPost(e, post.id)}
                              className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center transition cursor-pointer"
                              aria-label="Delete post"
                              title="Delete post"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CONTENT MONETIZATION (DEDICATED FULL VIEW) */}
        {!loading && activeTab === "monetise" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT / PRIMARY COLUMN: CONTENT MONETIZATION & GIFTED STARS */}
            <div className="lg:col-span-7 space-y-5">
              {/* 1. CONTENT MONETIZATION PROGRAM (LOCKED UNTIL 1,000 FOLLOWERS) */}
              <div
                className={`p-5 sm:p-6 rounded-3xl bg-white dark:bg-zinc-900 border shadow-xs space-y-5 ${
                  isMonetizationUnlocked
                    ? "border-emerald-500/30"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                        isMonetizationUnlocked
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      {isMonetizationUnlocked ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <Lock className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`flex items-center gap-2 text-xs font-bold ${
                          isMonetizationUnlocked
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        <span>Content Monetization</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {!isMonetizationUnlocked
                            ? "Locked"
                            : contentMonetizationEnabled
                            ? "Enabled"
                            : "Paused"}
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white mt-0.5">
                        News Hub Feed & Post Reach Revenue
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Unlock at 1,000 followers and switch ON to start earning from new posts published after activation (৳50 RPM / 1K views + reaction & comment bonuses). Posts published before turning monetization ON earn ৳0.00.
                      </p>
                      {effectiveContentMonetization && monetizationEnabledAt > 0 && (
                        <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                          Activated {formatDhakaDateTime(monetizationEnabledAt)} · {eligibleMonetizedPosts.length} monetized posts · {Math.max(0, posts.length - eligibleMonetizedPosts.length)} pre-activation posts (৳0.00)
                        </p>
                      )}
                    </div>
                  </div>

                  {isMonetizationUnlocked ? (
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={contentMonetizationEnabled}
                        onChange={toggleContentMonetization}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                    </label>
                  ) : (
                    <button
                      type="button"
                      onClick={toggleContentMonetization}
                      className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[11px] font-extrabold inline-flex items-center gap-1.5 shrink-0 cursor-not-allowed whitespace-nowrap"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Locked</span>
                    </button>
                  )}
                </div>

                {!isMonetizationUnlocked && (
                  <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-900/50 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span>Unlock Requirement: 1,000 Followers</span>
                      </span>
                      <span className="font-mono font-black text-amber-800 dark:text-amber-300 whitespace-nowrap">
                        {followerCount.toLocaleString()} / 1,000
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400/90 leading-relaxed">
                      Content Monetization will automatically unlock when your profile reaches 1,000 followers. You need{" "}
                      <strong>
                        {(MONETIZATION_MIN_FOLLOWERS - followerCount).toLocaleString()}
                      </strong>{" "}
                      more followers.
                    </p>
                  </div>
                )}

                {/* EARNINGS BREAKDOWN */}
                <div
                  className={`grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 ${
                    !isMonetizationUnlocked ? "opacity-60" : ""
                  }`}
                >
                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800">
                    <span className="text-[11px] font-medium text-zinc-500 block whitespace-nowrap">
                      Content Balance
                    </span>
                    <span className="text-lg font-mono font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
                      ৳{totalContentRevenueBDT.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800">
                    <span className="text-[11px] font-medium text-zinc-500 block whitespace-nowrap">
                      Reach Earnings (৳50 RPM)
                    </span>
                    <span className="text-lg font-mono font-black text-zinc-900 dark:text-white block mt-0.5">
                      ৳{reachRevenueBDT.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800 col-span-2 sm:col-span-1">
                    <span className="text-[11px] font-medium text-zinc-500 block whitespace-nowrap">
                      Engagement Bonus
                    </span>
                    <span className="text-lg font-mono font-black text-zinc-900 dark:text-white block mt-0.5">
                      ৳{engagementBonusBDT.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* PAYOUT ELIGIBILITY & INLINE PAYOUT REQUEST */}
                <div className="pt-1 space-y-3 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 font-medium">
                      Minimum Content Payout Threshold: ৳500.00 BDT
                    </span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                      ৳{totalContentRevenueBDT.toFixed(2)} / ৳500
                    </span>
                  </div>

                  {isMonetizationUnlocked && totalContentRevenueBDT >= 500 ? (
                    <button
                      type="button"
                      onClick={() => setShowContentPayoutForm((v) => !v)}
                      className="w-full py-2.5 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <Wallet className="w-4 h-4" />
                      <span>
                        {showContentPayoutForm
                          ? "Hide Payout Form"
                          : `Withdraw Content Earnings (৳${totalContentRevenueBDT.toFixed(2)})`}
                      </span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 px-4 py-2.5 rounded-2xl border border-zinc-200/70 dark:border-zinc-800">
                      <span>
                        {isMonetizationUnlocked
                          ? "Keep publishing quality posts in News Hub to reach ৳500 payout."
                          : "Grow to 1,000 followers in News Hub to unlock Content Monetization."}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate("/news-hub/create")}
                        className="px-3 py-1 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 font-bold text-[11px] whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Post Now
                      </button>
                    </div>
                  )}

                  {showContentPayoutForm && (
                    <form
                      onSubmit={handleContentPayoutSubmit}
                      className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        {(["bKash", "Nagad"] as const).map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setContentPayoutMethod(method)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                              contentPayoutMethod === method
                                ? "bg-emerald-600 text-white"
                                : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800"
                            }`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>
                      <input
                        type="tel"
                        placeholder={`Enter your ${contentPayoutMethod} number`}
                        value={contentPayoutPhone}
                        onChange={(e) => setContentPayoutPhone(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none font-mono font-bold"
                        required
                      />
                      <button
                        type="submit"
                        disabled={isSubmittingContentPayout}
                        className="w-full py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingContentPayout
                          ? "Submitting Request..."
                          : `Request Payout (৳${totalContentRevenueBDT.toFixed(2)})`}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* 2. STAR EARNINGS & WITHDRAWAL CARD */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-amber-500/30 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 shrink-0">
                      <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-white truncate">
                        Star Earnings (Gifted Stars)
                      </h3>
                      <p className="text-xs text-zinc-500">1 Star = ৳1.00 BDT</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/buy-stars")}
                    className="px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs whitespace-nowrap shrink-0 transition cursor-pointer"
                  >
                    Buy Stars
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800">
                    <span className="text-[11px] font-medium text-zinc-500 block whitespace-nowrap">
                      Earned (Withdrawable)
                    </span>
                    <div className="text-lg font-mono font-black text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                      <span>{earnedStars}</span>
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                      <span className="text-xs font-normal text-zinc-500">
                        (৳{earnedStars})
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800">
                    <span className="text-[11px] font-medium text-zinc-500 block whitespace-nowrap">
                      Purchased Balance
                    </span>
                    <div className="text-lg font-mono font-black text-zinc-900 dark:text-white flex items-center gap-1 mt-0.5">
                      <span>{purchasedStars}</span>
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                    </div>
                  </div>
                </div>

                <div>
                  {earnedStars >= 1000 ? (
                    <button
                      type="button"
                      onClick={() => setShowStarWithdrawForm((v) => !v)}
                      className="w-full py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>
                        {showStarWithdrawForm
                          ? "Hide Star Withdrawal Form"
                          : `Withdraw Earned Stars (৳${earnedStars})`}
                      </span>
                    </button>
                  ) : (
                    <div className="px-4 py-2.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                      <span className="font-medium">Min 1,000 Stars (৳1,000) to withdraw</span>
                      <span className="font-mono font-bold whitespace-nowrap">
                        {earnedStars} / 1,000
                      </span>
                    </div>
                  )}
                </div>

                {showStarWithdrawForm && (
                  <form
                    onSubmit={handleStarWithdrawSubmit}
                    className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      {(["bKash", "Nagad"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setWithdrawMethod(m)}
                          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                            withdrawMethod === m
                              ? "bg-emerald-600 text-white"
                              : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>

                    <input
                      type="tel"
                      placeholder={`Enter your ${withdrawMethod} mobile number`}
                      value={withdrawPhone}
                      onChange={(e) => setWithdrawPhone(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none font-mono font-bold"
                      required
                    />

                    <button
                      type="submit"
                      disabled={isSubmittingWithdraw}
                      className="w-full py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingWithdraw
                        ? "Submitting..."
                        : `Submit Star Withdrawal (৳${earnedStars})`}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: SPONSORSHIPS, SUBSCRIPTIONS & PAYOUT GATEWAY SHORTCUT */}
            <div className="lg:col-span-5 space-y-4">
              <h3 className="text-xs font-extrabold text-zinc-500 uppercase tracking-wider px-1">
                Sponsorship & Subscription Tools
              </h3>

              {/* Per-Post Scam Investigation Sponsorship */}
              <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 shrink-0">
                      <Handshake className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white">
                        Per-Post Investigation Sponsorship
                      </h4>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Allow supporters to sponsor dedicated scam investigations and featured reports.
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={partnershipAdsEnabled}
                      onChange={togglePartnershipAds}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
              </div>

              {/* Monthly Membership Subscription */}
              <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3.5 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white">
                        Monthly Membership Subscription
                      </h4>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Recurring monthly support from your loyal community followers.
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={subscriptionEnabled}
                      onChange={toggleSubscription}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <span className="text-xs text-zinc-500 font-medium truncate">
                    Custom per-post, monthly & yearly tiers
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate("/creator/subscription-setup")}
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Setup Rates →
                  </button>
                </div>
              </div>

              {/* Payment Gateway Status Card */}
              <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white">
                    Receiving Accounts
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab("settings")}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap cursor-pointer"
                  >
                    Configure →
                  </button>
                </div>
                <p className="text-xs text-zinc-500">
                  bKash: {bkashAccounts.length} configured · Nagad: {nagadAccounts.length} configured
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: POSTS LIST */}
        {!loading && activeTab === "content" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-white">
                Published Posts ({posts.length})
              </h3>
              <button
                type="button"
                onClick={() => navigate("/news-hub/create")}
                className="px-4 py-1.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-extrabold text-xs whitespace-nowrap shrink-0 transition cursor-pointer"
              >
                + Create Post
              </button>
            </div>

            {posts.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-500">
                You haven't published any posts in News Hub yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {posts.map((p) => {
                  const pBreakdown = getPostReactionBreakdown(p);
                  const pTotalReacts = sumReactionsForPost(p);
                  return (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/news-hub/post/${p.id}`)}
                      className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition cursor-pointer space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500 whitespace-nowrap">
                        <span>
                          {p.postType === "scam" ? "Scam Report" : "Community Post"} ·{" "}
                          {isPostMonetizationEligible(p)
                            ? `Monetized (৳${(
                                (Number(p.views || 0) / 1000) * 50 +
                                pTotalReacts * 0.25 +
                                Number(p.commentsCount || 0) * 0.5
                              ).toFixed(2)})`
                            : monetizationEnabledAt > 0 &&
                              Number(p.createdAt || 0) < monetizationEnabledAt
                            ? "Pre-monetization · ৳0.00"
                            : "৳0.00"}
                        </span>
                        <span>
                          {formatDhakaDateTime(p.createdAt)}
                          {p.isEdited ? " · Edited" : ""}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-white line-clamp-1">
                        {p.title || "Community Update"}
                      </h4>
                      <p className="text-xs text-zinc-500 line-clamp-2">{p.description}</p>

                      {/* Post Stats & Per-Reaction Breakdown */}
                      <div className="pt-1 space-y-2">
                        <div className="flex items-center gap-3 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Eye className="w-3.5 h-3.5 text-[#1877F2]" />
                            {Number(p.views || 0).toLocaleString()} views
                          </span>
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Heart className="w-3.5 h-3.5 text-rose-500" />
                            {pTotalReacts.toLocaleString()} total
                          </span>
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <MessageCircle className="w-3.5 h-3.5" />
                            {Number(p.commentsCount || 0).toLocaleString()} comments
                          </span>
                        </div>

                        <div className="grid grid-cols-6 gap-1.5">
                          {REACTION_BREAKDOWN_ITEMS.map((rx) => (
                            <div
                              key={rx.key}
                              className="py-1.5 px-1 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 flex flex-col items-center text-center"
                              title={rx.label}
                            >
                              <span className="text-sm leading-none">{rx.emoji}</span>
                              <span className="text-[11px] font-extrabold text-zinc-800 dark:text-zinc-200 font-mono tabular-nums mt-0.5">
                                {pBreakdown[rx.key].toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic();
                            navigate(`/news-hub/create?edit=${p.id}`);
                          }}
                          className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCreatorPost(e, p.id)}
                          className="px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-xs font-bold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MULTIPLE BKASH & NAGAD PAYMENT ACCOUNTS (PERSONAL / PAYMENT / AGENT) */}
        {!loading && activeTab === "settings" && (
          <form
            onSubmit={handleSavePaymentNumbers}
            className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6"
          >
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-white">
                Creator Gift & Sponsorship Payment Numbers
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Add one or more bKash and Nagad numbers with Personal, Payment, or Agent type. Unconfigured gateways stay hidden on your Gift & Sponsorship pages.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* BKASH ACCOUNTS SECTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-pink-600 dark:text-pink-400">
                    bKash Numbers ({bkashAccounts.length})
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {ACCOUNT_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNewBkashType(t)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                          newBkashType === t
                            ? "bg-pink-600 text-white"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      placeholder={`Add bKash ${newBkashType} number (01XXXXXXXXX)`}
                      value={newBkashNumber}
                      onChange={(e) => setNewBkashNumber(e.target.value)}
                      className="flex-1 min-w-0 px-3.5 py-2.5 text-xs rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddAccount("bKash")}
                      className="px-4 py-2.5 rounded-full bg-pink-600 hover:bg-pink-700 text-white text-xs font-extrabold whitespace-nowrap shrink-0 transition cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {bkashAccounts.length === 0 ? (
                  <p className="text-[11px] text-zinc-400">
                    No bKash number set. bKash will stay hidden until you add one.
                  </p>
                ) : (
                  <div className="space-y-2 pt-1">
                    {bkashAccounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white block truncate">
                            {acc.number}
                          </span>
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {ACCOUNT_TYPES.map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => handleUpdateAccountType("bKash", acc.id, t)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap transition cursor-pointer ${
                                  acc.type === t
                                    ? "bg-pink-600 text-white"
                                    : "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveAccount("bKash", acc.id)}
                          className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shrink-0 hover:bg-rose-100 transition cursor-pointer"
                          title="Remove number"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* NAGAD ACCOUNTS SECTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-orange-600 dark:text-orange-400">
                    Nagad Numbers ({nagadAccounts.length})
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {ACCOUNT_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNewNagadType(t)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                          newNagadType === t
                            ? "bg-orange-600 text-white"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      placeholder={`Add Nagad ${newNagadType} number (01XXXXXXXXX)`}
                      value={newNagadNumber}
                      onChange={(e) => setNewNagadNumber(e.target.value)}
                      className="flex-1 min-w-0 px-3.5 py-2.5 text-xs rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddAccount("Nagad")}
                      className="px-4 py-2.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold whitespace-nowrap shrink-0 transition cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {nagadAccounts.length === 0 ? (
                  <p className="text-[11px] text-zinc-400">
                    No Nagad number set. Nagad will stay hidden until you add one.
                  </p>
                ) : (
                  <div className="space-y-2 pt-1">
                    {nagadAccounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white block truncate">
                            {acc.number}
                          </span>
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {ACCOUNT_TYPES.map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => handleUpdateAccountType("Nagad", acc.id, t)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap transition cursor-pointer ${
                                  acc.type === t
                                    ? "bg-orange-600 text-white"
                                    : "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveAccount("Nagad", acc.id)}
                          className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shrink-0 hover:bg-rose-100 transition cursor-pointer"
                          title="Remove number"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSavingNumbers}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingNumbers ? "Saving Accounts..." : "Save Payment Accounts"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreatorDashboard;
