import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Coins,
  Star,
  Handshake,
  Award,
  Wallet,
  Lock,
  Plus,
  Eye,
  Heart,
  ThumbsUp,
  Smile,
  Sparkles,
  Frown,
  AlertCircle,
  MessageCircle,
  Pencil,
  Trash2,
  Save,
  Search,
  FileText,
  ChevronRight,
  ExternalLink,
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
  addDoc,
  query,
  where,
} from "firebase/firestore";
import { useNotify, useConfirm } from "../components/Notifications";
import SEO from "../components/SEO";
import { triggerHaptic } from "../lib/haptics";
import {
  ConfiguredMobileAccount,
  MobileAccountType,
  extractConfiguredMobileAccounts,
  formatDhakaDateTime,
} from "../lib/dhakaTime";
import {
  subscribeToFollowerStats,
  getEffectiveFollowersCount,
} from "../lib/follow";
import { SmoothImage } from "../components/SmoothImage";
import creatorAvatarFallback from "../src/assets/images/story_avatar_creator_1_1792826814910.jpg";

type TabType = "analytics" | "monetise" | "content" | "settings";
type TimeframeType = "7d" | "30d" | "90d" | "all";
type ContentFilterType = "all" | "monetized" | "community" | "scam";
type ContentSortType = "newest" | "views" | "reactions";

const ACCOUNT_TYPES: MobileAccountType[] = ["Personal", "Payment", "Agent"];

const REACTION_BREAKDOWN_ITEMS = [
  {
    key: "love",
    label: "Love",
    Icon: Heart,
    iconColor: "text-rose-500",
    barColor: "bg-rose-500",
  },
  {
    key: "like",
    label: "Like",
    Icon: ThumbsUp,
    iconColor: "text-blue-600 dark:text-blue-400",
    barColor: "bg-blue-600 dark:bg-blue-500",
  },
  {
    key: "haha",
    label: "Haha",
    Icon: Smile,
    iconColor: "text-amber-500",
    barColor: "bg-amber-500",
  },
  {
    key: "wow",
    label: "Wow",
    Icon: Sparkles,
    iconColor: "text-violet-500",
    barColor: "bg-violet-500",
  },
  {
    key: "sad",
    label: "Sad",
    Icon: Frown,
    iconColor: "text-sky-500",
    barColor: "bg-sky-500",
  },
  {
    key: "angry",
    label: "Angry",
    Icon: AlertCircle,
    iconColor: "text-orange-500",
    barColor: "bg-orange-500",
  },
] as const;

function formatCompactMetric(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (n >= 10_000) {
    return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return n.toLocaleString();
}

export const CreatorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const notify = useNotify();
  const confirm = useConfirm();

  const [currentUser, setCurrentUser] = useState<User | null>(
    () => auth.currentUser
  );
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

  const handleSelectTab = (nextTab: TabType) => {
    triggerHaptic();
    setActiveTab(nextTab);
    setSearchParams({ tab: nextTab }, { replace: true });
  };

  // Creator profile, posts & stories state
  const [userData, setUserData] = useState<Record<string, any> | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Analytics & Content tab local UI filters
  const [timeframe, setTimeframe] = useState<TimeframeType>("all");
  const [selectedBucketIdx, setSelectedBucketIdx] = useState<number | null>(
    null
  );
  const [contentQuery, setContentQuery] = useState("");
  const [contentFilter, setContentFilter] =
    useState<ContentFilterType>("all");
  const [contentSort, setContentSort] = useState<ContentSortType>("newest");

  // Multiple bKash & Nagad accounts with Personal / Payment / Agent types
  const [bkashAccounts, setBkashAccounts] = useState<ConfiguredMobileAccount[]>(
    []
  );
  const [nagadAccounts, setNagadAccounts] = useState<ConfiguredMobileAccount[]>(
    []
  );
  const [newBkashNumber, setNewBkashNumber] = useState("");
  const [newBkashType, setNewBkashType] =
    useState<MobileAccountType>("Personal");
  const [newNagadNumber, setNewNagadNumber] = useState("");
  const [newNagadType, setNewNagadType] =
    useState<MobileAccountType>("Personal");
  const [isSavingNumbers, setIsSavingNumbers] = useState(false);

  // Live synced follower count
  const [liveFollowersCount, setLiveFollowersCount] = useState<number | null>(
    null
  );

  // Content Monetization & Program toggles (defaults strictly to OFF until unlocked at 1K & enabled)
  const [contentMonetizationEnabled, setContentMonetizationEnabled] =
    useState<boolean>(false);
  const [monetizationEnabledAt, setMonetizationEnabledAt] =
    useState<number>(0);
  const [partnershipAdsEnabled, setPartnershipAdsEnabled] = useState<boolean>(
    () => localStorage.getItem("creator_partnership_ads") !== "false"
  );
  const [subscriptionEnabled, setSubscriptionEnabled] = useState<boolean>(
    () => localStorage.getItem("creator_subscription_enabled") === "true"
  );
  const [subscriptionFee] = useState<string>(
    () => localStorage.getItem("creator_subscription_fee") || "500"
  );

  // Inline withdrawal drawers
  const [showContentPayoutForm, setShowContentPayoutForm] = useState(false);
  const [contentPayoutMethod, setContentPayoutMethod] = useState<
    "bKash" | "Nagad"
  >("bKash");
  const [contentPayoutPhone, setContentPayoutPhone] = useState("");
  const [isSubmittingContentPayout, setIsSubmittingContentPayout] =
    useState(false);

  const [showStarWithdrawForm, setShowStarWithdrawForm] = useState(false);
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<"bKash" | "Nagad">(
    "bKash"
  );
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

  // Reactive Firebase Auth listener
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
      setAuthChecked(true);
      if (!u) {
        notify(
          "Account required: Please sign in to access Creator Studio.",
          "error"
        );
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
          const isEnabledInDoc = Boolean(
            unlocked && data.contentMonetizationEnabled === true
          );
          let enabledTs = Number(data.monetizationEnabledAt || 0);

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
            localStorage.setItem(
              "creator_monetization_enabled_at",
              String(enabledTs)
            );
          }

          if (typeof data.partnershipAdsEnabled === "boolean") {
            setPartnershipAdsEnabled(data.partnershipAdsEnabled);
          }
          if (typeof data.subscriptionEnabled === "boolean") {
            setSubscriptionEnabled(data.subscriptionEnabled);
          }
        }

        const [postsSnap, storiesSnap] = await Promise.all([
          getDocs(collection(db, "scam_posts")),
          getDocs(
            query(
              collection(db, "stories"),
              where("userId", "==", currentUser.uid)
            )
          ).catch(() => null),
        ]);

        const allPosts: any[] = [];
        postsSnap.forEach((d) => allPosts.push({ id: d.id, ...d.data() }));

        const userPosts = allPosts
          .filter(
            (p) =>
              p.reporterId === currentUser.uid || p.authorId === currentUser.uid
          )
          .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

        setPosts(userPosts);

        if (storiesSnap) {
          const userStories: any[] = [];
          storiesSnap.forEach((s) =>
            userStories.push({ id: s.id, ...s.data() })
          );
          setStories(userStories);
        }
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
      title: "Delete Loop?",
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
        notify("Post deleted", "success");
      },
    });
  };

  const storedFollowerCount = getEffectiveFollowersCount(userData);
  const followerCount =
    liveFollowersCount !== null ? liveFollowersCount : storedFollowerCount;
  const MONETIZATION_MIN_FOLLOWERS = 1000;
  const isMonetizationUnlocked = followerCount >= MONETIZATION_MIN_FOLLOWERS;
  const followerProgressPct = Math.min(
    100,
    Math.round((followerCount / MONETIZATION_MIN_FOLLOWERS) * 100)
  );

  const toggleContentMonetization = async () => {
    triggerHaptic();
    if (!isMonetizationUnlocked) {
      notify(
        `Content Monetization unlocks at 1,000 followers (${followerCount.toLocaleString()} / 1,000).`,
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
      localStorage.setItem(
        "creator_monetization_enabled_at",
        String(nextEnabledAt)
      );
    }
    localStorage.setItem("creator_content_monetization", String(nextVal));

    await persistCreatorSettings({
      contentMonetizationEnabled: nextVal,
      ...(nextVal ? { monetizationEnabledAt: nextEnabledAt } : {}),
    });
    notify(
      nextVal
        ? "Content Monetization enabled. New posts published from now on earn reach & engagement revenue."
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
        ? "Per-Post Sponsorship activated."
        : "Per-Post Sponsorship paused.",
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
        ? `Monthly Subscriptions activated at ৳${subscriptionFee}/month.`
        : "Monthly Subscriptions paused.",
      "success"
    );
  };

  // Add / Remove / Update bKash & Nagad numbers
  const handleAddAccount = (provider: "bKash" | "Nagad") => {
    const rawNum =
      provider === "bKash" ? newBkashNumber.trim() : newNagadNumber.trim();
    const accType = provider === "bKash" ? newBkashType : newNagadType;

    if (!rawNum) {
      notify(`Enter a valid ${provider} number first`, "error");
      return;
    }

    const entry: ConfiguredMobileAccount = {
      id: `${provider.toLowerCase()}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 6)}`,
      provider,
      type: accType,
      number: rawNum,
    };

    if (provider === "bKash") {
      if (
        bkashAccounts.some((a) => a.number === rawNum && a.type === accType)
      ) {
        notify("This bKash number & type is already added", "error");
        return;
      }
      setBkashAccounts((prev) => [...prev, entry]);
      setNewBkashNumber("");
    } else {
      if (
        nagadAccounts.some((a) => a.number === rawNum && a.type === accType)
      ) {
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

    const finalBkash = [...bkashAccounts];
    if (newBkashNumber.trim()) {
      finalBkash.push({
        id: `bkash_${Date.now()}`,
        provider: "bKash",
        type: newBkashType,
        number: newBkashNumber.trim(),
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
        number: newNagadNumber.trim(),
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
        updatedAt: Date.now(),
      };

      await setDoc(doc(db, "users", currentUser.uid), payload, { merge: true });
      setUserData((prev) => ({ ...(prev || {}), ...payload }));

      notify(
        "Payout accounts saved. Configured gateways are now active on your Gift & Sponsorship pages.",
        "success"
      );
    } catch {
      notify("Failed to save payment accounts", "error");
    } finally {
      setIsSavingNumbers(false);
    }
  };

  // Reaction & engagement helpers
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

  const getStoryViewsCount = (s: any): number => {
    if (typeof s?.views === "number") return s.views;
    if (typeof s?.viewsCount === "number") return s.viewsCount;
    if (Array.isArray(s?.viewedBy)) return s.viewedBy.length;
    return 0;
  };

  // Timeframe cutoff
  const timeframeCutoff = useMemo(() => {
    const now = Date.now();
    if (timeframe === "7d") return now - 7 * 24 * 60 * 60 * 1000;
    if (timeframe === "30d") return now - 30 * 24 * 60 * 60 * 1000;
    if (timeframe === "90d") return now - 90 * 24 * 60 * 60 * 1000;
    return 0;
  }, [timeframe]);

  const scopedPosts = useMemo(
    () =>
      timeframeCutoff > 0
        ? posts.filter((p) => Number(p.createdAt || 0) >= timeframeCutoff)
        : posts,
    [posts, timeframeCutoff]
  );

  const scopedStories = useMemo(
    () =>
      timeframeCutoff > 0
        ? stories.filter((s) => Number(s.createdAt || 0) >= timeframeCutoff)
        : stories,
    [stories, timeframeCutoff]
  );

  // Rolling 30-day total views (matches Profile "Your dashboard" card)
  const last30DaysViews = useMemo(() => {
    const cutoff30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const pViews = posts.reduce((acc, p) => {
      const ts = Number(p.createdAt || 0);
      if (ts > 0 && ts < cutoff30) return acc;
      return acc + Number(p.views || 0);
    }, 0);
    const sViews = stories.reduce((acc, s) => {
      const ts = Number(s.createdAt || 0);
      if (ts > 0 && ts < cutoff30) return acc;
      return acc + getStoryViewsCount(s);
    }, 0);
    return pViews + sViews;
  }, [posts, stories]);

  const scopedPostViews = scopedPosts.reduce(
    (acc, p) => acc + Number(p.views || 0),
    0
  );
  const scopedStoryViews = scopedStories.reduce(
    (acc, s) => acc + getStoryViewsCount(s),
    0
  );
  const scopedTotalViews = scopedPostViews + scopedStoryViews;

  const scopedReactions = scopedPosts.reduce(
    (acc, p) => acc + sumReactionsForPost(p),
    0
  );
  const scopedComments = scopedPosts.reduce(
    (acc, p) => acc + Number(p.commentsCount || 0),
    0
  );
  const scopedInteractions = scopedReactions + scopedComments;
  const scopedEngagementRate =
    scopedPostViews > 0
      ? ((scopedInteractions / scopedPostViews) * 100).toFixed(1)
      : "0.0";

  const scopedReactionBreakdown = useMemo(
    () =>
      scopedPosts.reduce(
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
      ),
    [scopedPosts]
  );

  // Build clean 8-bucket Reach & Activity chart series for the active timeframe
  const chartBuckets = useMemo(() => {
    const now = Date.now();
    const bucketCount = 8;
    let startTs = now - 30 * 24 * 60 * 60 * 1000;

    if (timeframe === "7d") {
      startTs = now - 7 * 24 * 60 * 60 * 1000;
    } else if (timeframe === "30d") {
      startTs = now - 30 * 24 * 60 * 60 * 1000;
    } else if (timeframe === "90d") {
      startTs = now - 90 * 24 * 60 * 60 * 1000;
    } else {
      const timestamps = [
        ...posts.map((p) => Number(p.createdAt || 0)).filter((t) => t > 0),
        ...stories.map((s) => Number(s.createdAt || 0)).filter((t) => t > 0),
      ];
      const earliest =
        timestamps.length > 0
          ? Math.min(...timestamps)
          : now - 30 * 24 * 60 * 60 * 1000;
      startTs = Math.min(earliest, now - 7 * 24 * 60 * 60 * 1000);
    }

    const span = Math.max(now - startTs, 24 * 60 * 60 * 1000);
    const step = span / bucketCount;

    const buckets = Array.from({ length: bucketCount }, (_, idx) => {
      const bStart = startTs + idx * step;
      const bEnd = idx === bucketCount - 1 ? now + 1000 : startTs + (idx + 1) * step;
      const d = new Date(bEnd);
      const label = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return {
        label,
        start: bStart,
        end: bEnd,
        views: 0,
        interactions: 0,
        postsCount: 0,
      };
    });

    scopedPosts.forEach((p) => {
      const ts = Number(p.createdAt || 0) || now;
      const rawIdx = Math.floor((ts - startTs) / step);
      const idx = Math.max(0, Math.min(bucketCount - 1, rawIdx));
      buckets[idx].views += Number(p.views || 0);
      buckets[idx].interactions +=
        sumReactionsForPost(p) + Number(p.commentsCount || 0);
      buckets[idx].postsCount += 1;
    });

    scopedStories.forEach((s) => {
      const ts = Number(s.createdAt || 0) || now;
      const rawIdx = Math.floor((ts - startTs) / step);
      const idx = Math.max(0, Math.min(bucketCount - 1, rawIdx));
      buckets[idx].views += getStoryViewsCount(s);
    });

    return buckets;
  }, [scopedPosts, scopedStories, posts, stories, timeframe]);

  useEffect(() => {
    setSelectedBucketIdx(null);
  }, [timeframe]);

  const maxBucketViews = useMemo(
    () => Math.max(1, ...chartBuckets.map((b) => b.views)),
    [chartBuckets]
  );

  // Content Monetization Revenue Calculation (BDT)
  // STRICT RULE: Only posts published AFTER Content Monetization was turned ON (`monetizationEnabledAt`) after reaching 1K followers earn revenue.
  const effectiveContentMonetization =
    isMonetizationUnlocked &&
    contentMonetizationEnabled &&
    monetizationEnabledAt > 0;

  const isPostMonetizationEligible = (p: any): boolean => {
    if (!effectiveContentMonetization || monetizationEnabledAt <= 0)
      return false;
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
    userData?.name ||
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "Creator";
  const creatorHandle = (
    userData?.username ||
    currentUser?.email?.split("@")[0] ||
    "creator"
  )
    .toString()
    .replace(/^@+/, "");
  const creatorAvatar =
    userData?.photoURL || currentUser?.photoURL || creatorAvatarFallback;

  // Top performing posts for Overview
  const topPerformingPosts = useMemo(() => {
    return [...scopedPosts]
      .sort((a, b) => {
        const scoreB =
          Number(b.views || 0) +
          (sumReactionsForPost(b) + Number(b.commentsCount || 0)) * 3;
        const scoreA =
          Number(a.views || 0) +
          (sumReactionsForPost(a) + Number(a.commentsCount || 0)) * 3;
        return scoreB - scoreA;
      })
      .slice(0, 6);
  }, [scopedPosts]);

  // Filtered & sorted posts for Content tab
  const filteredContentPosts = useMemo(() => {
    const q = contentQuery.trim().toLowerCase();
    const list = posts.filter((p) => {
      if (contentFilter === "monetized" && !isPostMonetizationEligible(p)) {
        return false;
      }
      if (contentFilter === "community" && p.postType === "scam") {
        return false;
      }
      if (contentFilter === "scam" && p.postType !== "scam") {
        return false;
      }
      if (q) {
        const hay = `${p.title || ""} ${p.description || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      if (contentSort === "views") {
        return Number(b.views || 0) - Number(a.views || 0);
      }
      if (contentSort === "reactions") {
        return sumReactionsForPost(b) - sumReactionsForPost(a);
      }
      return Number(b.createdAt || 0) - Number(a.createdAt || 0);
    });
  }, [
    posts,
    contentQuery,
    contentFilter,
    contentSort,
    effectiveContentMonetization,
    monetizationEnabledAt,
  ]);

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
        `Minimum ৳500.00 BDT required for Content Monetization payout. Current: ৳${totalContentRevenueBDT.toFixed(
          2
        )}.`,
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
        createdAt: Date.now(),
      });

      notify(
        `Content Monetization payout request of ৳${totalContentRevenueBDT.toFixed(
          2
        )} submitted.`,
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
        createdAt: Date.now(),
      });

      notify(
        `Star withdrawal request of ৳${earnedStars} (${earnedStars} Stars) submitted.`,
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

  const navItems: {
    id: TabType;
    label: string;
    mobileLabel: string;
    Icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    locked?: boolean;
  }[] = [
    {
      id: "analytics",
      label: "Overview",
      mobileLabel: "Overview",
      Icon: BarChart3,
    },
    {
      id: "monetise",
      label: "Monetization",
      mobileLabel: "Monetization",
      Icon: Coins,
      locked: !isMonetizationUnlocked,
    },
    {
      id: "content",
      label: "Published Loops",
      mobileLabel: `Loops (${posts.length})`,
      Icon: FileText,
      badge: String(posts.length),
    },
    {
      id: "settings",
      label: "Payout Accounts",
      mobileLabel: "Payouts",
      Icon: Wallet,
      badge:
        bkashAccounts.length + nagadAccounts.length > 0
          ? String(bkashAccounts.length + nagadAccounts.length)
          : undefined,
    },
  ];

  const activeBucket =
    selectedBucketIdx !== null && chartBuckets[selectedBucketIdx]
      ? chartBuckets[selectedBucketIdx]
      : chartBuckets[chartBuckets.length - 1];

  const contentGatewaySuggestions =
    contentPayoutMethod === "bKash" ? bkashAccounts : nagadAccounts;
  const starGatewaySuggestions =
    withdrawMethod === "bKash" ? bkashAccounts : nagadAccounts;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 font-sans">
      <SEO
        title="Creator Studio • DEEP SHOP"
        description="Track post and story reach, manage Content Monetization, configure bKash and Nagad payout gateways, and grow your Loops audience."
      />

      {/* DESKTOP + MOBILE RESPONSIVE WORKSPACE SHELL */}
      <div className="max-w-[1380px] mx-auto lg:grid lg:grid-cols-[260px_minmax(0,1fr)] min-h-screen">
        {/* DESKTOP STICKY SIDEBAR */}
        <aside className="hidden lg:flex flex-col justify-between h-[100dvh] sticky top-0 border-r border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-5 select-none">
          <div className="space-y-6">
            {/* Back + Studio Identity */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => navigate("/loops/profile")}
                className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Profile</span>
              </button>
            </div>

            {/* Creator Profile Summary */}
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/70 dark:border-zinc-800/80 flex items-center gap-3">
              <SmoothImage
                src={creatorAvatar}
                alt={creatorName}
                eager
                wrapperClassName="w-11 h-11 rounded-full shrink-0 border border-zinc-200 dark:border-zinc-800"
                className="w-full h-full object-cover rounded-full"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-zinc-950 dark:text-white truncate">
                  {creatorName}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  @{creatorHandle} ·{" "}
                  <span className="tabular-nums font-medium">
                    {followerCount.toLocaleString()}
                  </span>{" "}
                  followers
                </p>
              </div>
            </div>

            {/* Vertical Section Navigation */}
            <nav className="space-y-1" aria-label="Creator Studio sections">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                const IconComp = item.Icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full min-h-[42px] px-3.5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-between gap-2.5 transition-colors duration-150 cursor-pointer ${
                      isActive
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-950 dark:hover:text-white"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2.5 min-w-0">
                      <IconComp className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.locked ? (
                      <Lock className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    ) : item.badge ? (
                      <span
                        className={`text-[11px] font-mono tabular-nums ${
                          isActive
                            ? "text-zinc-300 dark:text-zinc-600"
                            : "text-zinc-400 dark:text-zinc-500"
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Sidebar Monetization Progress & Primary Actions */}
          <div className="space-y-3 pt-4 border-t border-zinc-200/70 dark:border-zinc-800/80">
            {!isMonetizationUnlocked ? (
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/70 dark:border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Monetization Goal
                  </span>
                  <span className="font-mono font-bold tabular-nums text-zinc-900 dark:text-white">
                    {followerProgressPct}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all duration-200"
                    style={{ width: `${followerProgressPct}%` }}
                  />
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {followerCount.toLocaleString()} / 1,000 followers
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/70 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">
                    Content Balance
                  </span>
                  <span className="text-sm font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    ৳{totalContentRevenueBDT.toFixed(2)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectTab("monetise")}
                  className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:underline cursor-pointer"
                >
                  Manage
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate("/loops/create")}
              className="w-full min-h-[42px] px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Loop</span>
            </button>
          </div>
        </aside>

        {/* MAIN WORKSPACE COLUMN */}
        <div className="min-w-0 flex flex-col min-h-screen">
          {/* MOBILE / TABLET STICKY HEADER + SINGLE-LINE TABS */}
          <header className="lg:hidden sticky top-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80">
            <div className="px-4 h-14 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => navigate("/loops/profile")}
                  className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-800 dark:text-zinc-200 active:scale-95 transition-transform cursor-pointer shrink-0"
                  aria-label="Back to Profile"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <h1 className="text-[15px] font-bold tracking-tight text-zinc-950 dark:text-white truncate">
                    Creator Studio
                  </h1>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate tabular-nums">
                    @{creatorHandle} · {followerCount.toLocaleString()} followers
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate("/loops/create")}
                  className="min-h-[36px] px-3.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create</span>
                </button>
                <SmoothImage
                  src={creatorAvatar}
                  alt={creatorName}
                  eager
                  wrapperClassName="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 shrink-0"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            </div>

            <div className="px-4 pb-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {navItems.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleSelectTab(tab.id)}
                    className={`min-h-[36px] px-3.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isActive
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                        : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {tab.locked && <Lock className="w-3 h-3 opacity-75" />}
                    <span>{tab.mobileLabel}</span>
                  </button>
                );
              })}
            </div>
          </header>

          {/* DESKTOP STICKY TOP WORKSPACE BAR */}
          <div className="hidden lg:flex items-center justify-between gap-4 px-8 h-16 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md sticky top-0 z-30">
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight text-zinc-950 dark:text-white">
                {activeTab === "analytics" && "Overview & Insights"}
                {activeTab === "monetise" && "Monetization & Star Earnings"}
                {activeTab === "content" && "Published Loops"}
                {activeTab === "settings" && "Payout Accounts"}
              </h1>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {activeTab === "analytics" && (
                <div className="inline-flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
                  {(
                    [
                      { id: "7d", label: "7D" },
                      { id: "30d", label: "30D" },
                      { id: "90d", label: "90D" },
                      { id: "all", label: "All time" },
                    ] as { id: TimeframeType; label: string }[]
                  ).map((tf) => (
                    <button
                      key={tf.id}
                      type="button"
                      onClick={() => setTimeframe(tf.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        timeframe === tf.id
                          ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs"
                          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => navigate("/loops")}
                className="min-h-[36px] px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Open Feed</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* WORKSPACE CONTENT BODY */}
          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-24 lg:pb-12 space-y-6">
            {/* LOADING SKELETON */}
            {loading && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-28 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-4 space-y-3"
                    >
                      <div className="h-3 w-20 rounded bg-zinc-200/80 dark:bg-zinc-800 animate-pulse" />
                      <div className="h-7 w-24 rounded bg-zinc-200/80 dark:bg-zinc-800 animate-pulse" />
                      <div className="h-3 w-28 rounded bg-zinc-100 dark:bg-zinc-800/70 animate-pulse" />
                    </div>
                  ))}
                </div>
                <div className="h-64 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 animate-pulse" />
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 1: OVERVIEW & INSIGHTS                                */}
            {/* ========================================================= */}
            {!loading && activeTab === "analytics" && (
              <div className="space-y-6">
                {/* Mobile Timeframe Selector */}
                <div className="flex lg:hidden items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Performance range
                  </span>
                  <div className="inline-flex items-center p-1 rounded-xl bg-zinc-200/70 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
                    {(
                      [
                        { id: "7d", label: "7D" },
                        { id: "30d", label: "30D" },
                        { id: "90d", label: "90D" },
                        { id: "all", label: "All" },
                      ] as { id: TimeframeType; label: string }[]
                    ).map((tf) => (
                      <button
                        key={tf.id}
                        type="button"
                        onClick={() => setTimeframe(tf.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                          timeframe === tf.id
                            ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs"
                            : "text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4-COLUMN KPI STRIP */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">
                  <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Total Views
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    </div>
                    <p className="text-2xl sm:text-[28px] font-bold tracking-tight text-zinc-950 dark:text-white tabular-nums">
                      {formatCompactMetric(scopedTotalViews)}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums truncate">
                      {last30DaysViews.toLocaleString()} in last 30 days
                    </p>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Followers
                      </span>
                    </div>
                    <p className="text-2xl sm:text-[28px] font-bold tracking-tight text-zinc-950 dark:text-white tabular-nums">
                      {followerCount.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums truncate">
                      {isMonetizationUnlocked
                        ? "1K milestone unlocked"
                        : `${(
                            MONETIZATION_MIN_FOLLOWERS - followerCount
                          ).toLocaleString()} to 1K unlock`}
                    </p>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Interactions
                      </span>
                    </div>
                    <p className="text-2xl sm:text-[28px] font-bold tracking-tight text-zinc-950 dark:text-white tabular-nums">
                      {formatCompactMetric(scopedInteractions)}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums truncate">
                      {scopedEngagementRate}% engagement ·{" "}
                      {scopedComments.toLocaleString()} replies
                    </p>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Est. Revenue
                      </span>
                    </div>
                    <p className="text-2xl sm:text-[28px] font-bold tracking-tight text-zinc-950 dark:text-white tabular-nums">
                      ৳{totalContentRevenueBDT.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums truncate">
                      {earnedStars.toLocaleString()} earned stars (৳
                      {earnedStars.toLocaleString()})
                    </p>
                  </div>
                </div>

                {/* 12-COLUMN ANALYTICAL SPLIT: REACH CHART + VECTOR REACTION BREAKDOWN */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                  {/* Interactive Reach & Activity Chart */}
                  <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex flex-col justify-between space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-bold text-zinc-950 dark:text-white">
                          Reach & Activity Distribution
                        </h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 tabular-nums">
                          {scopedPostViews.toLocaleString()} post views ·{" "}
                          {scopedStoryViews.toLocaleString()} story views
                        </p>
                      </div>

                      {activeBucket && (
                        <div className="text-right">
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">
                            Period ending {activeBucket.label}
                          </span>
                          <span className="text-xs font-semibold text-zinc-900 dark:text-white tabular-nums">
                            {activeBucket.views.toLocaleString()} views ·{" "}
                            {activeBucket.interactions.toLocaleString()}{" "}
                            interactions
                          </span>
                        </div>
                      )}
                    </div>

                    {scopedTotalViews === 0 && scopedPosts.length === 0 ? (
                      <div className="h-44 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center px-4">
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          No post or story views recorded in this period yet.
                        </p>
                        <button
                          type="button"
                          onClick={() => navigate("/loops/create")}
                          className="mt-2.5 text-xs font-semibold text-zinc-900 dark:text-white underline cursor-pointer"
                        >
                          Publish a new Loop
                        </button>
                      </div>
                    ) : (
                      <div className="pt-2">
                        <div className="h-44 grid grid-cols-8 gap-2 sm:gap-3 items-end border-b border-zinc-200/80 dark:border-zinc-800 pb-2">
                          {chartBuckets.map((bucket, idx) => {
                            const heightPct = Math.max(
                              6,
                              Math.round((bucket.views / maxBucketViews) * 100)
                            );
                            const isSelected =
                              selectedBucketIdx === null
                                ? idx === chartBuckets.length - 1
                                : selectedBucketIdx === idx;
                            return (
                              <button
                                key={`${bucket.label}-${idx}`}
                                type="button"
                                onMouseEnter={() => setSelectedBucketIdx(idx)}
                                onClick={() => setSelectedBucketIdx(idx)}
                                className="h-full flex flex-col justify-end items-center group cursor-pointer focus:outline-none"
                                title={`${bucket.label}: ${bucket.views.toLocaleString()} views`}
                              >
                                <div className="w-full h-full flex items-end justify-center">
                                  <div
                                    className={`w-full max-w-[34px] rounded-t-lg transition-all duration-150 ${
                                      isSelected
                                        ? "bg-zinc-900 dark:bg-white"
                                        : "bg-zinc-200/90 dark:bg-zinc-800 group-hover:bg-zinc-400 dark:group-hover:bg-zinc-700"
                                    }`}
                                    style={{ height: `${heightPct}%` }}
                                  />
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="grid grid-cols-8 gap-1 pt-2 text-center">
                          {chartBuckets.map((bucket, idx) => (
                            <span
                              key={`lbl-${idx}`}
                              className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate tabular-nums"
                            >
                              {bucket.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Audience Reactions Breakdown (Clean Vector Icons, Zero Raw Emojis) */}
                  <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h2 className="text-sm font-bold text-zinc-950 dark:text-white">
                          Reactions Breakdown
                        </h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Across {scopedPosts.length} loops in range
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-zinc-900 dark:text-white tabular-nums">
                        {scopedReactions.toLocaleString()} total
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {REACTION_BREAKDOWN_ITEMS.map((item) => {
                        const count = scopedReactionBreakdown[item.key];
                        const sharePct =
                          scopedReactions > 0
                            ? Math.round((count / scopedReactions) * 100)
                            : 0;
                        const IconComp = item.Icon;
                        return (
                          <div key={item.key} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="inline-flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-300">
                                <IconComp
                                  className={`w-3.5 h-3.5 shrink-0 ${item.iconColor}`}
                                />
                                <span>{item.label}</span>
                              </span>
                              <span className="font-mono font-semibold text-zinc-900 dark:text-white tabular-nums">
                                {count.toLocaleString()}{" "}
                                <span className="text-zinc-400 font-normal">
                                  ({sharePct}%)
                                </span>
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${item.barColor} transition-all duration-200`}
                                style={{
                                  width: `${
                                    count > 0 ? Math.max(4, sharePct) : 0
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* MONETIZATION STATUS CALLOUT */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                      {isMonetizationUnlocked ? (
                        <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      )}
                      <span>Content Monetization</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          isMonetizationUnlocked && contentMonetizationEnabled
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-zinc-500 dark:text-zinc-400"
                        }
                      >
                        {!isMonetizationUnlocked
                          ? "Locked (1,000 followers required)"
                          : contentMonetizationEnabled
                          ? "Active"
                          : "Paused"}
                      </span>
                    </div>

                    {isMonetizationUnlocked ? (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {effectiveContentMonetization ? (
                          <>
                            Active since{" "}
                            <span className="font-medium text-zinc-900 dark:text-white">
                              {formatDhakaDateTime(monetizationEnabledAt)}
                            </span>{" "}
                            · Earned{" "}
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                              ৳{totalContentRevenueBDT.toFixed(2)}
                            </span>{" "}
                            across {eligibleMonetizedPosts.length}{" "}
                            post-activation loops. Posts published prior to
                            activation earn ৳0.00.
                          </>
                        ) : (
                          <>
                            Your account meets the 1,000-follower requirement.
                            Enable Content Monetization to earn ৳50 RPM +
                            interaction bonuses on new loops published after
                            activation.
                          </>
                        )}
                      </p>
                    ) : (
                      <div className="space-y-2 pt-0.5">
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          Grow from{" "}
                          <span className="font-mono font-bold text-zinc-900 dark:text-white tabular-nums">
                            {followerCount.toLocaleString()}
                          </span>{" "}
                          to{" "}
                          <span className="font-mono font-bold text-zinc-900 dark:text-white tabular-nums">
                            1,000
                          </span>{" "}
                          followers to unlock feed reach revenue.
                        </p>
                        <div className="max-w-md h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-500 transition-all duration-200"
                            style={{ width: `${followerProgressPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectTab("monetise")}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <span>
                      {isMonetizationUnlocked
                        ? "Open Monetization"
                        : "Check Eligibility"}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* TOP PERFORMING LOOPS */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-bold tracking-tight text-zinc-950 dark:text-white">
                      Top Performing Loops
                    </h2>
                    <button
                      type="button"
                      onClick={() => handleSelectTab("content")}
                      className="text-xs font-semibold text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      View all ({posts.length})
                    </button>
                  </div>

                  {topPerformingPosts.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-center space-y-3">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        No loops published in this timeframe yet. Share updates
                        with your audience to build reach and engagement.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate("/loops/create")}
                        className="min-h-[38px] px-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold cursor-pointer"
                      >
                        Create Loop
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
                      {topPerformingPosts.map((post) => {
                        const firstImg = post.images?.[0] || "";
                        const postViews = Number(post.views || 0);
                        const reactionsSum = sumReactionsForPost(post);
                        const commentsSum = Number(post.commentsCount || 0);
                        const eligibleForEarnings =
                          isPostMonetizationEligible(post);
                        const postEstBDT = eligibleForEarnings
                          ? (
                              (postViews / 1000) * 50 +
                              reactionsSum * 0.25 +
                              commentsSum * 0.5
                            ).toFixed(2)
                          : "0.00";

                        return (
                          <div
                            key={post.id}
                            onClick={() => navigate(`/loops/post/${post.id}`)}
                            className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer flex items-center justify-between gap-3.5"
                          >
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              {firstImg ? (
                                <SmoothImage
                                  src={firstImg}
                                  alt=""
                                  wrapperClassName="w-14 h-14 rounded-xl shrink-0 border border-zinc-200/80 dark:border-zinc-800"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-14 h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-400 shrink-0">
                                  <FileText className="w-5 h-5" />
                                </div>
                              )}

                              <div className="min-w-0 flex-1 space-y-1">
                                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white line-clamp-1">
                                  {post.title ||
                                    post.description ||
                                    "Untitled Loop"}
                                </h3>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                                  {post.postType === "scam"
                                    ? "Scam Alert"
                                    : "Loop"}{" "}
                                  · {formatDhakaDateTime(post.createdAt)}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                                  <span className="inline-flex items-center gap-1">
                                    <Eye className="w-3.5 h-3.5" />
                                    {postViews.toLocaleString()}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <Heart className="w-3.5 h-3.5" />
                                    {reactionsSum.toLocaleString()}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    {commentsSum.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right mr-1">
                                <span
                                  className={`text-xs font-mono font-bold block tabular-nums ${
                                    eligibleForEarnings
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-zinc-400 dark:text-zinc-500"
                                  }`}
                                >
                                  ৳{postEstBDT}
                                </span>
                                <span className="text-[10px] text-zinc-400 block whitespace-nowrap">
                                  {eligibleForEarnings
                                    ? "Monetized"
                                    : monetizationEnabledAt > 0 &&
                                      Number(post.createdAt || 0) <
                                        monetizationEnabledAt
                                    ? "Pre-activation"
                                    : "Standard"}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerHaptic();
                                  navigate(`/loops/edit/${post.id}`);
                                }}
                                className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
                                aria-label="Edit post"
                                title="Edit post"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleDeleteCreatorPost(e, post.id)
                                }
                                className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                                aria-label="Delete post"
                                title="Delete post"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 2: MONETIZATION & STARS                               */}
            {/* ========================================================= */}
            {!loading && activeTab === "monetise" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* PRIMARY COLUMN: CONTENT MONETIZATION + GIFTED STARS */}
                <div className="lg:col-span-7 space-y-5">
                  {/* 1. Content Monetization Program */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isMonetizationUnlocked
                              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                          }`}
                        >
                          {isMonetizationUnlocked ? (
                            <Coins className="w-5 h-5" />
                          ) : (
                            <Lock className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                            <span>Content Monetization</span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                isMonetizationUnlocked &&
                                contentMonetizationEnabled
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : ""
                              }
                            >
                              {!isMonetizationUnlocked
                                ? "Locked"
                                : contentMonetizationEnabled
                                ? "Enabled"
                                : "Paused"}
                            </span>
                          </div>
                          <h2 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white">
                            Feed & Loop Reach Revenue
                          </h2>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            Unlocks at 1,000 followers. Once enabled, new loops
                            published after activation earn ৳50 RPM per 1,000
                            views plus reaction and comment bonuses. Earlier
                            posts earn ৳0.00.
                          </p>
                          {effectiveContentMonetization &&
                            monetizationEnabledAt > 0 && (
                              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 pt-0.5 tabular-nums">
                                Activated{" "}
                                {formatDhakaDateTime(monetizationEnabledAt)} ·{" "}
                                {eligibleMonetizedPosts.length} monetized loops
                                ·{" "}
                                {Math.max(
                                  0,
                                  posts.length - eligibleMonetizedPosts.length
                                )}{" "}
                                pre-activation loops (৳0.00)
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
                          <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                        </label>
                      ) : (
                        <button
                          type="button"
                          onClick={toggleContentMonetization}
                          className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-not-allowed"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Locked</span>
                        </button>
                      )}
                    </div>

                    {!isMonetizationUnlocked && (
                      <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 space-y-2">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-amber-900 dark:text-amber-300">
                            Unlock Requirement: 1,000 Followers
                          </span>
                          <span className="font-mono font-bold text-amber-900 dark:text-amber-300 tabular-nums">
                            {followerCount.toLocaleString()} / 1,000
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-amber-200/60 dark:bg-amber-950 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-500 transition-all duration-200"
                            style={{ width: `${followerProgressPct}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-amber-800 dark:text-amber-400/90">
                          {(
                            MONETIZATION_MIN_FOLLOWERS - followerCount
                          ).toLocaleString()}{" "}
                          more followers needed to activate Content
                          Monetization.
                        </p>
                      </div>
                    )}

                    {/* Revenue Figures */}
                    <div
                      className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${
                        !isMonetizationUnlocked ? "opacity-60" : ""
                      }`}
                    >
                      <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800">
                        <span className="text-[11px] font-medium text-zinc-500 block">
                          Content Balance
                        </span>
                        <span className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5 tabular-nums">
                          ৳{totalContentRevenueBDT.toFixed(2)}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800">
                        <span className="text-[11px] font-medium text-zinc-500 block">
                          Reach (৳50 RPM)
                        </span>
                        <span className="text-lg font-mono font-bold text-zinc-950 dark:text-white block mt-0.5 tabular-nums">
                          ৳{reachRevenueBDT.toFixed(2)}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800">
                        <span className="text-[11px] font-medium text-zinc-500 block">
                          Interaction Bonus
                        </span>
                        <span className="text-lg font-mono font-bold text-zinc-950 dark:text-white block mt-0.5 tabular-nums">
                          ৳{engagementBonusBDT.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Threshold & Withdrawal Drawer */}
                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">
                          Minimum payout threshold: ৳500.00 BDT
                        </span>
                        <span className="font-mono font-bold text-zinc-900 dark:text-white tabular-nums">
                          ৳{totalContentRevenueBDT.toFixed(2)} / ৳500
                        </span>
                      </div>

                      {isMonetizationUnlocked &&
                      totalContentRevenueBDT >= 500 ? (
                        <button
                          type="button"
                          onClick={() => setShowContentPayoutForm((v) => !v)}
                          className="w-full min-h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Wallet className="w-4 h-4" />
                          <span>
                            {showContentPayoutForm
                              ? "Hide Payout Form"
                              : `Withdraw Content Earnings (৳${totalContentRevenueBDT.toFixed(
                                  2
                                )})`}
                          </span>
                        </button>
                      ) : (
                        <div className="flex items-center justify-between gap-3 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 rounded-xl border border-zinc-200/70 dark:border-zinc-800">
                          <span>
                            {isMonetizationUnlocked
                              ? "Publish engaging loops to reach the ৳500 payout threshold."
                              : "Reach 1,000 followers to unlock Content Monetization payouts."}
                          </span>
                          <button
                            type="button"
                            onClick={() => navigate("/loops/create")}
                            className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 font-bold text-[11px] whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Create Loop
                          </button>
                        </div>
                      )}

                      {showContentPayoutForm && (
                        <form
                          onSubmit={handleContentPayoutSubmit}
                          className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3"
                        >
                          <div className="flex items-center gap-2">
                            {(["bKash", "Nagad"] as const).map((method) => (
                              <button
                                key={method}
                                type="button"
                                onClick={() => setContentPayoutMethod(method)}
                                className={`min-h-[34px] px-4 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                  contentPayoutMethod === method
                                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                                    : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800"
                                }`}
                              >
                                {method}
                              </button>
                            ))}
                          </div>

                          {contentGatewaySuggestions.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {contentGatewaySuggestions.map((acc) => (
                                <button
                                  key={acc.id}
                                  type="button"
                                  onClick={() =>
                                    setContentPayoutPhone(acc.number)
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono font-semibold text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 cursor-pointer"
                                >
                                  {acc.number} · {acc.type}
                                </button>
                              ))}
                            </div>
                          )}

                          <input
                            type="tel"
                            placeholder={`Enter your ${contentPayoutMethod} number`}
                            value={contentPayoutPhone}
                            onChange={(e) =>
                              setContentPayoutPhone(e.target.value)
                            }
                            className="w-full min-h-[40px] px-3.5 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none font-mono font-semibold"
                            required
                          />
                          <button
                            type="submit"
                            disabled={isSubmittingContentPayout}
                            className="w-full min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isSubmittingContentPayout
                              ? "Submitting Request..."
                              : `Request Payout (৳${totalContentRevenueBDT.toFixed(
                                  2
                                )})`}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  {/* 2. Star Earnings Card */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-500 shrink-0">
                          <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-zinc-950 dark:text-white truncate">
                            Gifted Star Earnings
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            1 Star = ৳1.00 BDT
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate("/buy-stars")}
                        className="min-h-[36px] px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                      >
                        Buy Stars
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800">
                        <span className="text-[11px] font-medium text-zinc-500 block">
                          Earned (Withdrawable)
                        </span>
                        <div className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mt-0.5 tabular-nums">
                          <span>{earnedStars.toLocaleString()}</span>
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                          <span className="text-xs font-normal text-zinc-500">
                            (৳{earnedStars.toLocaleString()})
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800">
                        <span className="text-[11px] font-medium text-zinc-500 block">
                          Purchased Balance
                        </span>
                        <div className="text-lg font-mono font-bold text-zinc-950 dark:text-white flex items-center gap-1.5 mt-0.5 tabular-nums">
                          <span>{purchasedStars.toLocaleString()}</span>
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                        </div>
                      </div>
                    </div>

                    {earnedStars >= 1000 ? (
                      <button
                        type="button"
                        onClick={() => setShowStarWithdrawForm((v) => !v)}
                        className="w-full min-h-[42px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Wallet className="w-4 h-4" />
                        <span>
                          {showStarWithdrawForm
                            ? "Hide Withdrawal Form"
                            : `Withdraw Earned Stars (৳${earnedStars.toLocaleString()})`}
                        </span>
                      </button>
                    ) : (
                      <div className="px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 flex items-center justify-between gap-2">
                        <span>Minimum 1,000 Stars (৳1,000) to withdraw</span>
                        <span className="font-mono font-bold text-zinc-900 dark:text-white tabular-nums whitespace-nowrap">
                          {earnedStars.toLocaleString()} / 1,000
                        </span>
                      </div>
                    )}

                    {showStarWithdrawForm && (
                      <form
                        onSubmit={handleStarWithdrawSubmit}
                        className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3"
                      >
                        <div className="flex items-center gap-2">
                          {(["bKash", "Nagad"] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setWithdrawMethod(m)}
                              className={`min-h-[34px] px-4 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                withdrawMethod === m
                                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800"
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>

                        {starGatewaySuggestions.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {starGatewaySuggestions.map((acc) => (
                              <button
                                key={acc.id}
                                type="button"
                                onClick={() => setWithdrawPhone(acc.number)}
                                className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono font-semibold text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 cursor-pointer"
                              >
                                {acc.number} · {acc.type}
                              </button>
                            ))}
                          </div>
                        )}

                        <input
                          type="tel"
                          placeholder={`Enter your ${withdrawMethod} mobile number`}
                          value={withdrawPhone}
                          onChange={(e) => setWithdrawPhone(e.target.value)}
                          className="w-full min-h-[40px] px-3.5 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none font-mono font-semibold"
                          required
                        />

                        <button
                          type="submit"
                          disabled={isSubmittingWithdraw}
                          className="w-full min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isSubmittingWithdraw
                            ? "Submitting..."
                            : `Submit Star Withdrawal (৳${earnedStars.toLocaleString()})`}
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {/* SECONDARY COLUMN: SPONSORSHIPS, SUBSCRIPTIONS & GATEWAYS */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Per-Post Sponsorship */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                          <Handshake className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                            Per-Post Investigation Sponsorship
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                            Allow supporters to sponsor dedicated investigations
                            and featured community reports.
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
                        <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                      </label>
                    </div>
                  </div>

                  {/* Monthly Membership Subscription */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                          <Award className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                            Monthly Membership Subscription
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                            Recurring monthly support tiers for your core
                            followers.
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
                        <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                      </label>
                    </div>

                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        Per-post, monthly & annual pricing
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate("/creator/subscription-setup")}
                        className="min-h-[34px] px-3.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Setup Rates
                      </button>
                    </div>
                  </div>

                  {/* Configured Receiving Gateways */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                        Receiving Gateways
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleSelectTab("settings")}
                        className="text-xs font-semibold text-zinc-900 dark:text-white hover:underline cursor-pointer"
                      >
                        Configure
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                      bKash: {bkashAccounts.length} configured · Nagad:{" "}
                      {nagadAccounts.length} configured
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 3: PUBLISHED LOOPS MANAGEMENT                         */}
            {/* ========================================================= */}
            {!loading && activeTab === "content" && (
              <div className="space-y-4">
                {/* Filter & Search Toolbar */}
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="relative flex-1 min-w-0">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={contentQuery}
                      onChange={(e) => setContentQuery(e.target.value)}
                      placeholder="Search your published loops..."
                      className="w-full min-h-[40px] pl-9 pr-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    />
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {(
                      [
                        { id: "all", label: "All" },
                        { id: "monetized", label: "Monetized" },
                        { id: "community", label: "Loops" },
                        { id: "scam", label: "Scam Alerts" },
                      ] as { id: ContentFilterType; label: string }[]
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setContentFilter(f.id)}
                        className={`min-h-[36px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                          contentFilter === f.id
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}

                    <select
                      value={contentSort}
                      onChange={(e) =>
                        setContentSort(e.target.value as ContentSortType)
                      }
                      aria-label="Sort loops"
                      className="min-h-[36px] px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer shrink-0"
                    >
                      <option value="newest">Newest</option>
                      <option value="views">Most Viewed</option>
                      <option value="reactions">Top Reactions</option>
                    </select>
                  </div>
                </div>

                {filteredContentPosts.length === 0 ? (
                  <div className="p-10 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-center space-y-3">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {posts.length === 0
                        ? "You haven't published any loops yet."
                        : "No loops match your current search or filter."}
                    </p>
                    {posts.length === 0 && (
                      <button
                        type="button"
                        onClick={() => navigate("/loops/create")}
                        className="min-h-[38px] px-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold cursor-pointer"
                      >
                        Create First Loop
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {filteredContentPosts.map((p) => {
                      const pBreakdown = getPostReactionBreakdown(p);
                      const pTotalReacts = sumReactionsForPost(p);
                      const pViews = Number(p.views || 0);
                      const pComments = Number(p.commentsCount || 0);
                      const eligible = isPostMonetizationEligible(p);
                      const estBDT = eligible
                        ? (
                            (pViews / 1000) * 50 +
                            pTotalReacts * 0.25 +
                            pComments * 0.5
                          ).toFixed(2)
                        : "0.00";
                      const thumb = p.images?.[0] || "";

                      return (
                        <div
                          key={p.id}
                          onClick={() => navigate(`/loops/post/${p.id}`)}
                          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer flex flex-col justify-between gap-4"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                              <span className="truncate">
                                {p.postType === "scam" ? "Scam Alert" : "Loop"}{" "}
                                ·{" "}
                                {eligible ? (
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                    Monetized (৳{estBDT})
                                  </span>
                                ) : monetizationEnabledAt > 0 &&
                                  Number(p.createdAt || 0) <
                                    monetizationEnabledAt ? (
                                  "Pre-monetization · ৳0.00"
                                ) : (
                                  "৳0.00"
                                )}
                              </span>
                              <span className="shrink-0 tabular-nums">
                                {formatDhakaDateTime(p.createdAt)}
                                {p.isEdited ? " · Edited" : ""}
                              </span>
                            </div>

                            <div className="flex items-start gap-3.5">
                              {thumb ? (
                                <SmoothImage
                                  src={thumb}
                                  alt=""
                                  wrapperClassName="w-16 h-16 rounded-xl shrink-0 border border-zinc-200/80 dark:border-zinc-800"
                                  className="w-full h-full object-cover"
                                />
                              ) : null}
                              <div className="min-w-0 flex-1 space-y-1">
                                <h3 className="text-sm font-bold text-zinc-950 dark:text-white line-clamp-1">
                                  {p.title || "Community Loop"}
                                </h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                                  {p.description || "Media post"}
                                </p>
                              </div>
                            </div>

                            {/* Metrics + Vector Reaction Strip */}
                            <div className="pt-1 space-y-2.5">
                              <div className="flex items-center gap-4 text-xs font-medium text-zinc-600 dark:text-zinc-400 tabular-nums">
                                <span className="inline-flex items-center gap-1.5">
                                  <Eye className="w-3.5 h-3.5 text-zinc-400" />
                                  {pViews.toLocaleString()} views
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                                  {pTotalReacts.toLocaleString()} reactions
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  <MessageCircle className="w-3.5 h-3.5 text-zinc-400" />
                                  {pComments.toLocaleString()} replies
                                </span>
                              </div>

                              <div className="grid grid-cols-6 gap-1.5">
                                {REACTION_BREAKDOWN_ITEMS.map((rx) => {
                                  const RxIcon = rx.Icon;
                                  return (
                                    <div
                                      key={rx.key}
                                      className="py-1.5 px-1 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800 flex flex-col items-center justify-center gap-1"
                                      title={`${rx.label}: ${pBreakdown[rx.key]}`}
                                    >
                                      <RxIcon
                                        className={`w-3.5 h-3.5 ${rx.iconColor}`}
                                      />
                                      <span className="text-[11px] font-mono font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
                                        {pBreakdown[rx.key].toLocaleString()}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerHaptic();
                                navigate(`/loops/edit/${p.id}`);
                              }}
                              className="min-h-[36px] px-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCreatorPost(e, p.id)}
                              className="min-h-[36px] px-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-xs font-semibold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
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

            {/* ========================================================= */}
            {/* TAB 4: PAYOUT ACCOUNTS (BKASH & NAGAD MULTI-ACCOUNT)      */}
            {/* ========================================================= */}
            {!loading && activeTab === "settings" && (
              <form
                onSubmit={handleSavePaymentNumbers}
                className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white">
                    bKash & Nagad Payout Gateways
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Configure Personal, Payment, or Agent numbers for Gift
                    Stars, Sponsorships, and Content Monetization withdrawals.
                    Unconfigured gateways remain hidden on your public pages.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* bKash Column */}
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-pink-600 dark:text-pink-400">
                        bKash Accounts ({bkashAccounts.length})
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="inline-flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80">
                        {ACCOUNT_TYPES.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setNewBkashType(t)}
                            className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                              newBkashType === t
                                ? "bg-pink-600 text-white"
                                : "text-zinc-600 dark:text-zinc-300"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="tel"
                          placeholder={`bKash ${newBkashType} number (01XXXXXXXXX)`}
                          value={newBkashNumber}
                          onChange={(e) => setNewBkashNumber(e.target.value)}
                          className="flex-1 min-w-0 min-h-[42px] px-3.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none font-mono font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddAccount("bKash")}
                          className="min-h-[42px] px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>
                    </div>

                    {bkashAccounts.length === 0 ? (
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">
                        No bKash account configured yet.
                      </p>
                    ) : (
                      <div className="space-y-2 pt-1">
                        {bkashAccounts.map((acc) => (
                          <div
                            key={acc.id}
                            className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <span className="font-mono font-bold text-xs text-zinc-950 dark:text-white block truncate tabular-nums">
                                {acc.number}
                              </span>
                              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                {ACCOUNT_TYPES.map((t) => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() =>
                                      handleUpdateAccountType(
                                        "bKash",
                                        acc.id,
                                        t
                                      )
                                    }
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
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
                              onClick={() =>
                                handleRemoveAccount("bKash", acc.id)
                              }
                              className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 hover:bg-rose-100 transition-colors cursor-pointer"
                              aria-label="Remove bKash number"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Nagad Column */}
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                        Nagad Accounts ({nagadAccounts.length})
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="inline-flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80">
                        {ACCOUNT_TYPES.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setNewNagadType(t)}
                            className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                              newNagadType === t
                                ? "bg-orange-600 text-white"
                                : "text-zinc-600 dark:text-zinc-300"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="tel"
                          placeholder={`Nagad ${newNagadType} number (01XXXXXXXXX)`}
                          value={newNagadNumber}
                          onChange={(e) => setNewNagadNumber(e.target.value)}
                          className="flex-1 min-w-0 min-h-[42px] px-3.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none font-mono font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddAccount("Nagad")}
                          className="min-h-[42px] px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>
                    </div>

                    {nagadAccounts.length === 0 ? (
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">
                        No Nagad account configured yet.
                      </p>
                    ) : (
                      <div className="space-y-2 pt-1">
                        {nagadAccounts.map((acc) => (
                          <div
                            key={acc.id}
                            className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <span className="font-mono font-bold text-xs text-zinc-950 dark:text-white block truncate tabular-nums">
                                {acc.number}
                              </span>
                              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                {ACCOUNT_TYPES.map((t) => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() =>
                                      handleUpdateAccountType(
                                        "Nagad",
                                        acc.id,
                                        t
                                      )
                                    }
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
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
                              onClick={() =>
                                handleRemoveAccount("Nagad", acc.id)
                              }
                              className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 hover:bg-rose-100 transition-colors cursor-pointer"
                              aria-label="Remove Nagad number"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={isSavingNumbers}
                    className="w-full sm:w-auto min-h-[42px] px-6 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {isSavingNumbers
                        ? "Saving Accounts..."
                        : "Save Payment Accounts"}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorDashboard;
