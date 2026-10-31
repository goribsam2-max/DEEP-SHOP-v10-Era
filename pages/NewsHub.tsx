import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Shield,
  ShieldAlert,
  Palette,
  Plus,
  Smile,
  SlidersHorizontal,
  Image as ImageIcon,
  Sparkles,
  MoreVertical,
  Globe,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  ShoppingBag,
  LayoutDashboard,
  TrendingUp,
  Search,
  Edit3,
  Trash2,
  Eye as EyeIcon,
  UserPlus,
  UserCheck,
  X,
  User as UserIcon,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Star,
  Users,
} from "lucide-react";
import { CreateChooserModal } from "../components/CreateChooserModal";
import { DottedGhostCatIcon } from "../components/ComposerLiquidGlassSheets";
import {
  LiquidGlassShareModal,
  LiquidGlassActivityModal,
} from "../components/LiquidGlassPostInteractions";
import { AdPlacementSlot } from "../components/AdPlacementSlot";
import { preloadImageUrl } from "../components/SmoothImage";

const RepeatIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 2l4 4-4 4"></path>
    <path d="M3 11v-1a4 4 0 0 1 4-4h14"></path>
    <path d="M7 22l-4-4 4-4"></path>
    <path d="M21 13v1a4 4 0 0 1-4 4H3"></path>
  </svg>
);
import { auth, db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  where,
} from "firebase/firestore";
import { ScamPost, ReactionType } from "../types";
import { NewsPostMedia, isScamPostRecord } from "../components/NewsPostMedia";
import {
  NewsRichText,
  NewsLinkPreviewCards,
} from "../components/NewsRichText";
import { resolvePostVideoSource } from "../lib/videoEmbed";
import { NewsBottomDock } from "../components/NewsBottomDock";
import { NewsHubDrawer } from "../components/NewsHubDrawer";
import { LoopPostCard, LoopHeartIcon } from "../components/LoopPostCard";
import { LoopsReelsView } from "../components/LoopsReelsView";
import {
  LoopsAlgorithmPrefs,
  LOOPS_ALGORITHM_CHANGED_EVENT,
  applyUserAlgorithmToPosts,
  loadLocalAlgorithmPrefs,
  syncAlgorithmPrefsFromFirestore,
} from "../lib/loopsAlgorithmPrefs";
import {
  loadFeedPreferences,
  FeedPreferencesData,
  DEFAULT_FEED_PREFERENCES,
} from "./FeedPersonalization";
import { 
  FEED_THEMES, 
  getFeedThemeMeta 
} from "../lib/feed-themes";
import Icon from "../components/Icon";
import {
  getSavedPostIdsLocal,
  toggleSavePostHelper,
} from "./NewsHubSubPages";
import { useNotify, useConfirm } from "../components/Notifications";
import { triggerHaptic } from "../lib/haptics";
import SEO from "../components/SEO";
import { formatDhakaFeedTime } from "../lib/dhakaTime";
import {
  hasImmediateAdminOrStaffRole,
  checkStaffRecord,
} from "../lib/admin";
import {
  toggleFollowUser,
  useFollowedIds,
  getEffectiveFollowersCount,
} from "../lib/follow";
import { NewsPostCardSkeleton } from "../components/PageSkeletons";
import { useFooterLogo } from "../lib/useFooterLogo";
import {
  formatCompactNumber,
  getSafeDisplayName,
  getSafePublicUsername,
} from "../lib/utils";
import {
  rankFeedPostsSmart,
  recordPostImpression,
  recordPostClick,
  getTotalPostReactions,
  computeNextPostReactionState,
  getDismissedProfileIds,
  dismissSuggestedProfileId,
  getDismissedPostIds,
  dismissSuggestedPostId,
  seededDiscoveryNoise,
} from "../lib/feedAlgorithm";

const defaultAvatarImg = "";
const deepShopLogoFallback = "";

const TwoLineMenuIcon: React.FC<{ className?: string }> = ({
  className = "w-6 h-6",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.1"
    strokeLinecap="round"
  >
    <line x1="4" y1="8.5" x2="20" y2="8.5" />
    <line x1="4" y1="15.5" x2="14.5" y2="15.5" />
  </svg>
);

const formatCompactCount = (n: number): string => {
  return formatCompactNumber(n);
};

const formatFeedTimestamp = (ts: number): string => {
  return formatDhakaFeedTime(ts);
};

const PostImpressionTracker: React.FC<{
  postId: string;
  children: React.ReactNode;
}> = ({ postId, children }) => {
  const ref = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !postId) return;

    let timer: number | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          timer = window.setTimeout(() => {
            recordPostImpression(postId);
          }, 600);
        } else if (timer !== null) {
          window.clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: 0.55 }
    );

    observer.observe(el);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [postId]);

  return <div ref={ref}>{children}</div>;
};

interface SuggestedCreatorProfile {
  uid: string;
  name: string;
  avatar: string;
  followersCount: number;
  postsCount: number;
  totalEngagement: number;
}

export const NewsHub: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotify();
  const confirm = useConfirm();
  const footerLogo = useFooterLogo();

  const [sessionSeed] = useState<number>(() =>
    Math.floor(Math.random() * 1_000_000_000)
  );
  const [currentUser, setCurrentUser] = useState<any>(() => auth.currentUser);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authInitializing, setAuthInitializing] = useState(true);
  const [isStaffDoc, setIsStaffDoc] = useState(false);
  const [firestorePosts, setFirestorePosts] = useState<ScamPost[]>([]);
  const [communityUsers, setCommunityUsers] = useState<Record<string, any>[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const followedIds = useFollowedIds(currentUser?.uid);
  const [dismissedProfileIds, setDismissedProfileIds] = useState<string[]>(() =>
    getDismissedProfileIds()
  );
  const [dismissedPostIds, setDismissedPostIds] = useState<string[]>(() =>
    getDismissedPostIds()
  );

  const [scamOnlyMode, setScamOnlyMode] = useState(() =>
    location.pathname.includes("scam-alert")
  );
  const [prefs, setPrefs] = useState<FeedPreferencesData>(() =>
    loadFeedPreferences()
  );
  const [savedIds, setSavedIds] = useState<string[]>(() =>
    getSavedPostIdsLocal()
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [feedMenuOpen, setFeedMenuOpen] = useState(false);
  const [showGhostIntroSheet, setShowGhostIntroSheet] = useState(false);
  const [moderationTick, setModerationTick] = useState(0);
  const [algorithmPrefs, setAlgorithmPrefs] = useState<LoopsAlgorithmPrefs>(() =>
    loadLocalAlgorithmPrefs()
  );
  const [reelsOverlayOpen, setReelsOverlayOpen] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const feedMenuRef = useRef<HTMLDivElement | null>(null);

  const activeFeedFilter = React.useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const f = (sp.get("filter") || "").trim().toLowerCase();
    const tab = (sp.get("tab") || "").trim().toLowerCase();
    if (f === "video" || f === "reels" || tab === "reels") {
      return "video";
    }
    return f;
  }, [location.search]);

  const targetReelPostId = React.useMemo(() => {
    const sp = new URLSearchParams(location.search);
    return (sp.get("postId") || "").trim();
  }, [location.search]);

  useEffect(() => {
    if (activeFeedFilter !== "video") {
      setReelsOverlayOpen(false);
    }
  }, [activeFeedFilter]);

  useEffect(() => {
    let active = true;
    syncAlgorithmPrefsFromFirestore(currentUser?.uid).then((synced) => {
      if (active) setAlgorithmPrefs(synced);
    });
    return () => {
      active = false;
    };
  }, [currentUser?.uid]);

  useEffect(() => {
    const onAlgoChanged = (ev: Event) => {
      const detail = (ev as CustomEvent<LoopsAlgorithmPrefs>).detail;
      if (detail) {
        setAlgorithmPrefs(detail);
      } else {
        setAlgorithmPrefs(loadLocalAlgorithmPrefs());
      }
    };
    window.addEventListener(LOOPS_ALGORITHM_CHANGED_EVENT, onAlgoChanged);
    return () =>
      window.removeEventListener(LOOPS_ALGORITHM_CHANGED_EVENT, onAlgoChanged);
  }, []);

  useEffect(() => {
    if (activeFeedFilter === "scam") {
      setScamOnlyMode(true);
    } else if (!location.pathname.includes("scam-alert")) {
      setScamOnlyMode(false);
    }
    if (activeFeedFilter === "ghost") {
      try {
        if (!sessionStorage.getItem("loops_ghost_intro_seen")) {
          sessionStorage.setItem("loops_ghost_intro_seen", "1");
          setShowGhostIntroSheet(true);
        }
      } catch {
        setShowGhostIntroSheet(true);
      }
    } else {
      setShowGhostIntroSheet(false);
    }
  }, [activeFeedFilter, location.pathname]);

  useEffect(() => {
    const syncModeration = () => {
      setDismissedPostIds(getDismissedPostIds());
      setSavedIds(getSavedPostIdsLocal());
      setModerationTick((t) => t + 1);
    };
    window.addEventListener("loopsModerationUpdated", syncModeration);
    return () =>
      window.removeEventListener("loopsModerationUpdated", syncModeration);
  }, []);

  useEffect(() => {
    if (!feedMenuOpen) return;
    const onPointerDown = (ev: MouseEvent | TouchEvent) => {
      const target = ev.target as Node | null;
      if (
        feedMenuRef.current &&
        target &&
        !feedMenuRef.current.contains(target)
      ) {
        setFeedMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [feedMenuOpen]);

  const [expandedPostIds, setExpandedPostIds] = useState<
    Record<string, boolean>
  >({});
  const [openReactionPostId, setOpenReactionPostId] = useState<string | null>(
    null
  );
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [shareModalPost, setShareModalPost] = useState<Partial<ScamPost> | null>(null);
  const [activityModalPost, setActivityModalPost] = useState<Partial<ScamPost> | null>(null);
  const [unreadNewsNotifications, setUnreadNewsNotifications] = useState<number>(0);
  const [localUserReactions, setLocalUserReactions] = useState<
    Record<string, ReactionType>
  >(() => {
    try {
      return JSON.parse(localStorage.getItem("deep_post_reactions") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!currentUser?.uid) {
      setUnreadNewsNotifications(0);
      return;
    }
    const q = query(
      collection(db, "news_hub_notifications"),
      where("userId", "==", currentUser.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const count = snap.docs.filter((d) => {
          const data = d.data();
          return !data.isRead && !data.read;
        }).length;
        setUnreadNewsNotifications(count);
      },
      () => {}
    );
    return () => unsub();
  }, [currentUser?.uid]);

  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;
    const unsub = auth.onAuthStateChanged((u) => {
      setCurrentUser(u);
      setAuthInitializing(false);
      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }
      if (!u) {
        setUserProfile(null);
        setIsStaffDoc(false);
        return;
      }
      unsubUserDoc = onSnapshot(
        doc(db, "users", u.uid),
        (snap) => {
          setUserProfile(snap.exists() ? snap.data() : null);
        },
        () => {}
      );
      checkStaffRecord(u.email).then((res) => setIsStaffDoc(res.isStaff));
    });
    return () => {
      unsub();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  // Auth Protection: Wait until auth initialization completes before any redirect!
  useEffect(() => {
    if (authInitializing) return;
    if (!currentUser && location.pathname.includes("/profile")) {
      notify("Please sign in to access profile", "info");
      navigate("/signin");
    }
  }, [authInitializing, currentUser, navigate, notify, location.pathname]);

  useEffect(() => {
    if (!openMenuPostId) return;
    const closeMenu = () => setOpenMenuPostId(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, [openMenuPostId]);

  useEffect(() => {
    const syncPrefs = () => setPrefs(loadFeedPreferences());
    window.addEventListener("feedPreferencesUpdated", syncPrefs);
    return () => window.removeEventListener("feedPreferencesUpdated", syncPrefs);
  }, []);

  // Purge any legacy demo showcase items from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("deep_scam_posts");
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const cleaned = list.filter(
            (p) => p?.id && !String(p.id).startsWith("showcase_")
          );
          if (cleaned.length !== list.length) {
            localStorage.setItem("deep_scam_posts", JSON.stringify(cleaned));
          }
        }
      }
    } catch {}
  }, []);

  // Real-time Firestore feed listener (ONLY real posts — zero demo posts)
  useEffect(() => {
    const q = query(collection(db, "scam_posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ScamPost, "id">),
        }));
        setFirestorePosts(list);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Load real community user profiles for Suggested Profiles discovery
  useEffect(() => {
    let mounted = true;
    getDocs(collection(db, "users"))
      .then((snap) => {
        if (!mounted) return;
        setCommunityUsers(
          snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
        );
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Real-time Firestore stories listener (merges `stories` + community `creator_videos` stories)
  useEffect(() => {
    let mainStories: any[] = [];
    let communityStories: any[] = [];

    const mapStoryDoc = (id: string, data: Record<string, any>) => {
      const rawLabel =
        data.userName || data.sellerName || data.category || "Story";
      const createdAtMs =
        typeof data.createdAtMs === "number"
          ? data.createdAtMs
          : data.createdAt
          ? new Date(data.createdAt).getTime() || 0
          : 0;
      return {
        id,
        userId: data.userId || data.sellerId || "",
        name: String(rawLabel).split(" ")[0],
        avatar:
          data.userAvatar ||
          data.sellerLogo ||
          data.sellerAvatar ||
          (data.type !== "video" &&
          data.mediaType !== "video" &&
          !/\.(?:mp4|webm|mov|m4v)(?:$|[?#])/i.test(String(data.mediaUrl || ""))
            ? data.mediaUrl
            : "") ||
          defaultAvatarImg,
        isCloseFriends: Boolean(data.isCloseFriends),
        closeFriendIds: Array.isArray(data.closeFriendIds)
          ? data.closeFriendIds
          : [],
        isArchived: Boolean(data.isArchived),
        createdAtMs,
      };
    };

    const emitMergedStories = () => {
      const mergedMap = new Map<string, any>();
      mainStories.forEach((s) => mergedMap.set(s.id, s));
      communityStories.forEach((s) => mergedMap.set(s.id, s));
      try {
        const localStories = JSON.parse(
          localStorage.getItem("deep_news_stories_local") || "[]"
        );
        if (Array.isArray(localStories)) {
          localStories.forEach((ls: any) => {
            if (ls?.id && !mergedMap.has(ls.id)) {
              mergedMap.set(ls.id, mapStoryDoc(ls.id, ls));
            }
          });
        }
      } catch {}
      const uid = auth.currentUser?.uid || "";
      const isAdm = hasImmediateAdminOrStaffRole(null, auth.currentUser);
      const nowMs = Date.now();
      const STORY_TTL_MS = 24 * 60 * 60 * 1000;
      const sorted = Array.from(mergedMap.values())
        .filter((s) => {
          if (s.isArchived) return false;
          if (s.createdAtMs > 0 && nowMs - s.createdAtMs > STORY_TTL_MS) {
            return false;
          }
          if (s.isCloseFriends && s.closeFriendIds.length > 0) {
            return isAdm || s.userId === uid || s.closeFriendIds.includes(uid);
          }
          return true;
        })
        .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      setStories(sorted);
    };

    const unsubStories = onSnapshot(
      collection(db, "stories"),
      (snap) => {
        mainStories = snap.docs.map((d) => mapStoryDoc(d.id, d.data()));
        emitMergedStories();
      },
      () => emitMergedStories()
    );

    const unsubCommunityStories = onSnapshot(
      collection(db, "creator_videos"),
      (snap) => {
        communityStories = snap.docs
          .filter((d) => d.data()?.kind === "news_story")
          .map((d) => mapStoryDoc(d.id, d.data()));
        emitMergedStories();
      },
      () => emitMergedStories()
    );

    return () => {
      unsubStories();
      unsubCommunityStories();
    };
  }, []);

  // Merge real Firestore posts + real user-created offline fallback posts only
  const allPosts = React.useMemo(() => {
    const map = new Map<string, ScamPost>();
    firestorePosts.forEach((p) => {
      if (
        p.status === "under_review" &&
        p.reporterId !== currentUser?.uid
      ) {
        return;
      }
      map.set(p.id, p);
    });

    try {
      const localList: ScamPost[] = JSON.parse(
        localStorage.getItem("deep_scam_posts") || "[]"
      );
      localList.forEach((p) => {
        if (
          p?.id &&
          !String(p.id).startsWith("showcase_") &&
          !map.has(p.id)
        ) {
          map.set(p.id, p);
        }
      });
    } catch {}

    return Array.from(map.values()).sort(
      (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
    );
  }, [firestorePosts, currentUser?.uid]);

  // Apply Feed Personalization, Scam Shield Toggle & Smart Engagement + Discovery Ranking
  const filteredPosts = React.useMemo(() => {
    const cp = prefs.contentPreferences;
    const allThemesSelected =
      prefs.selectedThemes.length >= FEED_THEMES.length ||
      prefs.selectedThemes.length === 0;

    const nowMs = Date.now();

    return allPosts.filter((post) => {
      if (targetReelPostId && post.id === targetReelPostId) {
        return true;
      }

      // Hide expired 24-hour Ghost posts automatically
      if (post.expiresAt && post.expiresAt <= nowMs) {
        return false;
      }

      // Hide future scheduled posts from everyone except the author
      if (
        post.scheduledAt &&
        post.scheduledAt > nowMs &&
        post.reporterId !== currentUser?.uid
      ) {
        return false;
      }

      const isScam = isScamPostRecord(post);

      // URL Feed Mode Filters (?filter=following | favourites | ghost | video | scam)
      if (activeFeedFilter === "ghost") {
        return Boolean(post.isGhostPost);
      }
      if (activeFeedFilter === "following") {
        return Boolean(
          post.reporterId &&
            (followedIds.includes(post.reporterId) ||
              post.reporterId === currentUser?.uid)
        );
      }
      if (activeFeedFilter === "favourites") {
        return Boolean(
          savedIds.includes(post.id) ||
            (currentUser?.uid && post.savedByUserIds?.includes(currentUser.uid)) ||
            (post.reporterId && followedIds.includes(post.reporterId))
        );
      }
      if (activeFeedFilter === "video") {
        return Boolean(resolvePostVideoSource(post));
      }
      if (scamOnlyMode || activeFeedFilter === "scam") {
        return isScam;
      }

      if (isScam && !cp.scamAlerts) {
        return false;
      }

      if (!isScam) {
        const hasAudio = Boolean(post.audioUrl);
        const hasVideo = Boolean(resolvePostVideoSource(post));
        const hasImages = Boolean(
          (post.images && post.images.length > 0) ||
            post.gifUrl ||
            (post.stickers && post.stickers.length > 0)
        );
        const hasInteractiveExtra = Boolean(
          post.poll ||
            post.snippet ||
            post.quoteBlock ||
            post.music ||
            (post.threadItems && post.threadItems.length > 0)
        );
        const isAffirmation =
          post.contentType === "affirmation" ||
          post.textStyle === "quote" ||
          Boolean(post.quoteBlock);

        if (hasAudio && !cp.voiceNotes) return false;
        if (hasVideo && !cp.videos) return false;
        if (hasImages && !cp.images) return false;
        if (isAffirmation && !cp.affirmations) return false;
        if (
          !hasAudio &&
          !hasVideo &&
          !hasImages &&
          !hasInteractiveExtra &&
          !isAffirmation &&
          !cp.texts
        )
          return false;
      }

      if (!allThemesSelected) {
        const validIds = new Set(FEED_THEMES.map((t) => t.id));
        const rawPostThemes = [
          ...(Array.isArray(post.themes) ? post.themes : []),
          ...(post.category ? [post.category] : []),
        ].filter((t): t is string => Boolean(t) && validIds.has(t));

        if (rawPostThemes.length > 0) {
          const matchesTheme = rawPostThemes.some((t) =>
            prefs.selectedThemes.includes(t)
          );
          if (!matchesTheme) return false;
        }
      }

      return true;
    });
  }, [
    allPosts,
    prefs,
    scamOnlyMode,
    activeFeedFilter,
    followedIds,
    savedIds,
    currentUser?.uid,
    targetReelPostId,
  ]);

  const visiblePosts = React.useMemo(() => {
    const effectiveDismissed = targetReelPostId
      ? dismissedPostIds.filter((id) => id !== targetReelPostId)
      : dismissedPostIds;
    const ranked = rankFeedPostsSmart(filteredPosts, {
      currentUid: currentUser?.uid,
      followedIds,
      sessionSeed,
      dismissedPostIds: effectiveDismissed,
    });
    const algoPosts = applyUserAlgorithmToPosts(ranked, algorithmPrefs);
    if (targetReelPostId) {
      const targetPost =
        algoPosts.find((p) => p.id === targetReelPostId) ||
        allPosts.find((p) => p.id === targetReelPostId);
      if (targetPost) {
        return [
          targetPost,
          ...algoPosts.filter((p) => p.id !== targetReelPostId),
        ];
      }
    }
    return algoPosts;
  }, [
    filteredPosts,
    allPosts,
    currentUser?.uid,
    followedIds,
    sessionSeed,
    dismissedPostIds,
    moderationTick,
    algorithmPrefs,
    targetReelPostId,
  ]);

  const communityUserMap = React.useMemo(() => {
    const m = new Map<string, any>();
    communityUsers.forEach((u) => {
      const uid = u.uid || u.id;
      if (uid) m.set(uid, u);
    });
    return m;
  }, [communityUsers]);

  // Build real Suggested Profiles STRICTLY from real users who have published posts (zero demo/non-posting users)
  const suggestedProfiles = React.useMemo<SuggestedCreatorProfile[]>(() => {
    const userMap = communityUserMap;

    const map = new Map<string, SuggestedCreatorProfile>();

    allPosts.forEach((p) => {
      const uid = p.reporterId;
      if (
        !uid ||
        !p.id ||
        String(p.id).startsWith("showcase_") ||
        String(p.id).startsWith("demo_") ||
        uid === currentUser?.uid ||
        uid === "member_local" ||
        uid === "author_demo" ||
        uid === "system" ||
        String(uid).startsWith("demo_") ||
        followedIds.includes(uid) ||
        dismissedProfileIds.includes(uid)
      ) {
        return;
      }

      const uDoc = userMap.get(uid);
      if (uDoc?.isBanned || uDoc?.isDemo) return;

      const resolvedName =
        uDoc?.shopName ||
        uDoc?.displayName ||
        p.reporterName ||
        "";
      if (!resolvedName || /^community member$/i.test(resolvedName.trim())) {
        if (!p.reporterName) return;
      }

      const followersCount = getEffectiveFollowersCount(uDoc);
      const resolvedAvatar =
        uDoc?.shopLogo ||
        uDoc?.photoURL ||
        p.reporterAvatar ||
        defaultAvatarImg;

      const postEng =
        Number(p.views || 0) +
        getTotalPostReactions(p) * 4 +
        Number(p.commentsCount || 0) * 5;

      const existing = map.get(uid);
      if (existing) {
        existing.postsCount += 1;
        existing.totalEngagement += postEng;
        if (existing.avatar === defaultAvatarImg && p.reporterAvatar) {
          existing.avatar = p.reporterAvatar;
        }
      } else if (resolvedName) {
        map.set(uid, {
          uid,
          name: resolvedName,
          avatar: resolvedAvatar,
          followersCount,
          postsCount: 1,
          totalEngagement: postEng + followersCount * 2,
        });
      }
    });

    return Array.from(map.values())
      .filter((prof) => prof.postsCount >= 1)
      .sort((a, b) => {
        const scoreA =
          Math.log1p(a.totalEngagement + a.postsCount * 10) +
          seededDiscoveryNoise(a.uid, sessionSeed) * 3.5;
        const scoreB =
          Math.log1p(b.totalEngagement + b.postsCount * 10) +
          seededDiscoveryNoise(b.uid, sessionSeed) * 3.5;
        return scoreB - scoreA;
      })
      .slice(0, 10);
  }, [
    communityUsers,
    allPosts,
    currentUser?.uid,
    followedIds,
    dismissedProfileIds,
    sessionSeed,
  ]);

  // Curated Suggested Posts shelf (high-engagement posts from unfollowed creators)
  const suggestedDiscoveryPosts = React.useMemo<ScamPost[]>(() => {
    return visiblePosts
      .filter(
        (p) =>
          p.reporterId &&
          p.reporterId !== currentUser?.uid &&
          !followedIds.includes(p.reporterId) &&
          !dismissedPostIds.includes(p.id)
      )
      .slice(0, 6);
  }, [visiblePosts, currentUser?.uid, followedIds, dismissedPostIds]);

  // Background preload active story media & first visible post photos for zero-scanline instant opening
  useEffect(() => {
    stories.slice(0, 8).forEach((st: any) => {
      if (st?.mediaUrl && st?.mediaType !== "video") {
        preloadImageUrl(st.mediaUrl);
      }
    });
  }, [stories]);

  useEffect(() => {
    visiblePosts.slice(0, 4).forEach((p) => {
      if (Array.isArray(p.images) && p.images[0]) {
        preloadImageUrl(p.images[0]);
      }
    });
  }, [visiblePosts]);

  const handleFollowSuggestedProfile = async (
    e: React.MouseEvent,
    profile: SuggestedCreatorProfile
  ) => {
    e.stopPropagation();
    triggerHaptic();
    if (!currentUser?.uid) {
      notify("Please sign in to follow creators!", "error");
      navigate("/signin");
      return;
    }
    const isNowFollowed = followedIds.includes(profile.uid);
    const res = await toggleFollowUser({
      targetUid: profile.uid,
      targetName: profile.name,
      currentUser,
      currentlyFollowing: isNowFollowed,
    });
    if (res.ok) {
      notify(
        res.isFollowing
          ? `Following ${profile.name}`
          : `Unfollowed ${profile.name}`,
        res.isFollowing ? "success" : "info"
      );
    }
  };

  const handleDismissSuggestedProfile = (e: React.MouseEvent, uid: string) => {
    e.stopPropagation();
    triggerHaptic();
    setDismissedProfileIds(dismissSuggestedProfileId(uid));
  };

  const handleDismissSuggestedPost = (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    triggerHaptic();
    setDismissedPostIds(dismissSuggestedPostId(postId));
    notify("Post hidden from suggestions", "info");
  };

  const handleReaction = async (post: ScamPost, chosenType: ReactionType = "love") => {
    triggerHaptic();
    recordPostClick(post);
    if (!currentUser?.uid) {
      notify("Please sign in to like Loops.", "info");
      navigate("/signin");
      return;
    }
    const uid = currentUser.uid;
    const nextState = computeNextPostReactionState(
      post,
      uid,
      {
        userName: getSafeDisplayName(userProfile || currentUser, "Member"),
        userAvatar: userProfile?.photoURL || currentUser?.photoURL || "",
      },
      chosenType,
      localUserReactions[post.id] || null
    );

    const isRemoving = nextState.isRemoving;
    const nextTotalVotes = nextState.votes;

    const updatedLocal = { ...localUserReactions };
    if (isRemoving) {
      delete updatedLocal[post.id];
    } else {
      updatedLocal[post.id] = chosenType;
    }
    setLocalUserReactions(updatedLocal);
    setOpenReactionPostId(null);

    setFirestorePosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              reactions: nextState.reactions,
              reactionsCount: nextState.reactionsCount,
              reactionsUsers: nextState.reactionsUsers,
              votedUserIds: nextState.votedUserIds,
              votes: nextState.votes,
            }
          : p
      )
    );

    try {
      await updateDoc(doc(db, "scam_posts", post.id), {
        reactions: nextState.reactions,
        reactionsCount: nextState.reactionsCount,
        reactionsUsers: nextState.reactionsUsers,
        votedUserIds: nextState.votedUserIds,
        votes: nextState.votes,
      });

      if (!isRemoving && post.reporterId && post.reporterId !== uid) {
        const actorIsAdmin =
          hasImmediateAdminOrStaffRole(userProfile, currentUser) || isStaffDoc;

        if (actorIsAdmin) {
          setDoc(
            doc(db, "news_hub_notifications", `milestone_reactions_${post.id}`),
            {
              userId: post.reporterId,
              fromUserId: "system_milestone",
              fromUserName: "Loops",
              fromUserUsername: "",
              fromUserAvatar: "",
              type: "milestone",
              milestoneKind: "reactions",
              totalCount: nextTotalVotes,
              title: "Congratulations!",
              body: `Your Loop now has ${nextTotalVotes.toLocaleString()} total likes.`,
              mediaThumbnail: post.images?.[0] || "",
              targetId: post.id,
              isRead: false,
              read: false,
              createdAt: Date.now(),
              link: `/loops/post/${post.id}`,
            },
            { merge: true }
          ).catch(() => {});
        } else {
          const authorName = getSafeDisplayName(
            userProfile || currentUser,
            "Someone"
          );
          const authorAvatar =
            userProfile?.photoURL || currentUser?.photoURL || "";
          const authorUsername = getSafePublicUsername(
            userProfile || currentUser
          );

          addDoc(collection(db, "news_hub_notifications"), {
            userId: post.reporterId,
            fromUserId: uid,
            fromUserName: authorName,
            fromUserUsername: authorUsername,
            fromUserAvatar: authorAvatar,
            type: "like",
            title: "New Like",
            body: `liked your Loop: "${(post.description || post.title || "").slice(0, 36)}"`,
            mediaThumbnail: post.images?.[0] || "",
            targetId: post.id,
            isRead: false,
            read: false,
            createdAt: Date.now(),
            link: `/loops/post/${post.id}`,
          }).catch(() => {});
        }
      }
    } catch {}
  };

  const handleToggleRepost = async (post: ScamPost) => {
    if (!currentUser?.uid) {
      notify("Please sign in to repost!", "info");
      navigate("/signin");
      return;
    }
    triggerHaptic();
    const isR = post.repostedByUserIds?.includes(currentUser.uid);
    const updated = isR
      ? (post.repostedByUserIds || []).filter((u: string) => u !== currentUser.uid)
      : Array.from(new Set([...(post.repostedByUserIds || []), currentUser.uid]));
    const nextCount = isR
      ? Math.max(0, (post.repostsCount || 1) - 1)
      : (post.repostsCount || 0) + 1;
    const reposterHandle =
      getSafePublicUsername(userProfile || currentUser) ||
      getSafeDisplayName(userProfile || currentUser, "Member");

    setFirestorePosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              repostedByUserIds: updated,
              repostsCount: nextCount,
              ...(isR ? {} : { repostedByUserName: reposterHandle }),
            }
          : p
      )
    );

    try {
      await updateDoc(doc(db, "scam_posts", post.id), {
        repostedByUserIds: updated,
        repostsCount: nextCount,
        ...(isR ? {} : { repostedByUserName: reposterHandle }),
      });
      if (!isR && post.reporterId && post.reporterId !== currentUser.uid) {
        addDoc(collection(db, "news_hub_notifications"), {
          userId: post.reporterId,
          fromUserId: currentUser.uid,
          fromUserName: getSafeDisplayName(userProfile || currentUser, "Someone"),
          fromUserUsername: reposterHandle,
          fromUserAvatar: userProfile?.photoURL || currentUser.photoURL || "",
          type: "repost",
          title: "Reposted your Loop",
          body: `reposted your Loop: "${(post.description || post.title || "").slice(0, 36)}"`,
          mediaThumbnail: post.images?.[0] || "",
          targetId: post.id,
          isRead: false,
          read: false,
          createdAt: Date.now(),
          link: `/loops/post/${post.id}`,
        }).catch(() => {});
      }
      notify(isR ? "Repost removed" : "Reposted to Loops!", "success");
    } catch {}
  };

  const handleCopyPostLink = async (postId: string) => {
    triggerHaptic();
    const url = `${window.location.origin}/loops/post/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      notify("Link copied to clipboard", "success");
    } catch {
      notify("Could not copy link", "error");
    }
  };

  const handleToggleSave = async (post: ScamPost) => {
    triggerHaptic();
    const next = await toggleSavePostHelper(post, currentUser?.uid);
    setSavedIds(getSavedPostIdsLocal());
    notify(
      next ? "Saved to Loops" : "Removed from saved",
      "info"
    );
  };

  const handleDeletePost = async (post: ScamPost) => {
    triggerHaptic();
    setOpenMenuPostId(null);
    const ok = await confirm({
      title: "Delete Post?",
      message: "Are you sure you want to permanently delete this post?",
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;

    try {
      if (!post.id.startsWith("showcase_")) {
        await deleteDoc(doc(db, "scam_posts", post.id));
      }
      setFirestorePosts((prev) => prev.filter((p) => p.id !== post.id));
      try {
        const existing = JSON.parse(
          localStorage.getItem("deep_scam_posts") || "[]"
        );
        localStorage.setItem(
          "deep_scam_posts",
          JSON.stringify(existing.filter((p: any) => p.id !== post.id))
        );
      } catch {}
      notify("Post deleted", "info");
    } catch {
      notify("Could not delete post", "error");
    }
  };

  const handleFollowFromCard = async (
    e: React.MouseEvent,
    post: ScamPost
  ) => {
    e.stopPropagation();
    triggerHaptic();
    if (!currentUser?.uid) {
      notify("Please sign in to follow users!", "error");
      navigate("/signin");
      return;
    }
    if (!post.reporterId || post.reporterId === currentUser.uid) return;
    const isNowFollowed = followedIds.includes(post.reporterId);
    const res = await toggleFollowUser({
      targetUid: post.reporterId,
      targetName: post.reporterName,
      currentUser,
      currentlyFollowing: isNowFollowed,
    });
    if (res.ok) {
      notify(
        res.isFollowing
          ? `Following ${post.reporterName}`
          : `Unfollowed ${post.reporterName}`,
        res.isFollowing ? "success" : "info"
      );
    }
  };

  const handleToggleFollowCreator = async (
    targetUid: string,
    targetName: string
  ) => {
    triggerHaptic();
    if (!currentUser?.uid) {
      notify("Please sign in to follow creators!", "error");
      navigate("/signin");
      return;
    }
    if (!targetUid || targetUid === currentUser.uid) return;
    const isNowFollowed = followedIds.includes(targetUid);
    const res = await toggleFollowUser({
      targetUid,
      targetName,
      currentUser,
      currentlyFollowing: isNowFollowed,
    });
    if (res.ok) {
      notify(
        res.isFollowing
          ? `Following ${targetName}`
          : `Unfollowed ${targetName}`,
        res.isFollowing ? "success" : "info"
      );
    }
  };

  const handleDismissReelPost = (postId: string) => {
    setDismissedPostIds(dismissSuggestedPostId(postId));
  };

  const handleCommentCountDelta = (postId: string, delta: number) => {
    setFirestorePosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              commentsCount: Math.max(0, Number(p.commentsCount || 0) + delta),
            }
          : p
      )
    );
  };

  const isAdmin =
    hasImmediateAdminOrStaffRole(userProfile, currentUser) || isStaffDoc;
  const userAvatar = userProfile?.photoURL || currentUser?.photoURL || "";
  const isPersonalizedActive =
    prefs.selectedThemes.length < FEED_THEMES.length ||
    Object.values(prefs.contentPreferences).some((v) => !v);

  // Full-Screen Immersive Vertical Autoplay Reels Mode (?filter=video)
  if (activeFeedFilter === "video") {
    return (
      <>
        <SEO
          title="Reels — Loops"
          description="Watch community Reels, embedded social clips, and live discussions on Loops."
          exactTitle
        />

        {loading && allPosts.length === 0 ? (
          <div className="fixed inset-0 z-40 bg-black flex items-center justify-center">
            <div className="w-9 h-9 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          </div>
        ) : (
          <LoopsReelsView
            posts={visiblePosts}
            allPosts={allPosts}
            currentUser={currentUser}
            userProfile={userProfile}
            userAvatar={userAvatar}
            communityUserMap={communityUserMap}
            followedIds={followedIds}
            savedIds={savedIds}
            localUserReactions={localUserReactions}
            algorithmPrefs={algorithmPrefs}
            onChangeAlgorithmPrefs={setAlgorithmPrefs}
            onToggleReaction={(post, chosenType) =>
              handleReaction(post, chosenType)
            }
            onToggleRepost={(post) => handleToggleRepost(post)}
            onToggleSave={(post) => handleToggleSave(post)}
            onToggleFollowCreator={handleToggleFollowCreator}
            onOpenShareModal={(post) => {
              recordPostClick(post);
              setShareModalPost(post);
            }}
            onDismissPost={handleDismissReelPost}
            onCommentCountDelta={handleCommentCountDelta}
            onOverlayOpenChange={setReelsOverlayOpen}
            onOpenCreate={() => setChooserOpen(true)}
          />
        )}

        {!reelsOverlayOpen && !shareModalPost && !chooserOpen && (
          <NewsBottomDock variant="reels" />
        )}

        <LiquidGlassShareModal
          isOpen={Boolean(shareModalPost)}
          post={shareModalPost || {}}
          onClose={() => setShareModalPost(null)}
          onRepost={() => {
            if (shareModalPost?.id) {
              const target = allPosts.find((p) => p.id === shareModalPost.id);
              if (target) handleToggleRepost(target);
            }
          }}
          onQuotePost={() => {
            if (shareModalPost?.id) {
              navigate(`/loops/create?quotePostId=${shareModalPost.id}`);
            }
          }}
        />

        <CreateChooserModal
          isOpen={chooserOpen}
          onClose={() => setChooserOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      {/* NewsHub Side Drawer (Fixed on the Left) */}
      <NewsHubDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        userData={userProfile}
      />

      {/* Shifting Main Feed Container — pure Framer Motion x transform for zero-lag push-drawer */}
      <motion.div
        animate={{ x: drawerOpen ? 300 : 0 }}
        transition={{ type: "spring", damping: 32, stiffness: 340, mass: 0.85 }}
        onClick={() => {
          if (drawerOpen) setDrawerOpen(false);
        }}
        className="min-h-screen loops-surface sm:bg-[#F8F9FA] sm:dark:bg-[#08090C] text-zinc-950 dark:text-zinc-100 font-sans pb-32 overflow-x-hidden will-change-transform"
      >
        <SEO
          title="Loops — Community & Conversations"
          description="Join real-time community Loops, stories, discussions, topics, and verified updates."
          exactTitle
        />

        <div className="max-w-7xl mx-auto px-0 sm:px-6 pt-2 sm:pt-6 bg-transparent">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start bg-transparent">
            {/* Desktop Left Quick Navigation Rail */}
            <aside className="hidden lg:flex lg:col-span-3 flex-col gap-4 sticky top-6">
              <div className="loops-surface rounded-[28px] p-5 shadow-[0_6px_24px_rgba(15,23,42,0.04)] space-y-2 border loops-divider">
                <div className="flex items-center gap-2.5 pb-3 border-b loops-divider">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-white dark:bg-zinc-800 ring-1 ring-slate-200/80 dark:ring-zinc-700 shadow-xs shrink-0 flex items-center justify-center">
                    <img
                      src={footerLogo}
                      alt="DEEP SHOP"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = deepShopLogoFallback;
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="loops-wordmark text-[22px] text-zinc-950 dark:text-white whitespace-nowrap">
                    Loops
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setChooserOpen(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-sm font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Create a Loop</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/loops/activity")}
                  className="w-full py-2.5 px-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm font-semibold flex items-center justify-between gap-3 text-left cursor-pointer whitespace-nowrap"
                >
                  <span className="flex items-center gap-3">
                    <Heart className="w-4 h-4 text-[#FF3040] shrink-0" />
                    <span>My Activity</span>
                  </span>
                  {unreadNewsNotifications > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#FF3040] text-white text-[11px] font-bold">
                      {unreadNewsNotifications > 99 ? "99+" : unreadNewsNotifications}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/creator-dashboard")}
                  className="w-full py-2.5 px-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 hover:bg-blue-100/80 dark:hover:bg-blue-900/40 text-sm font-bold text-[#0095F6] flex items-center gap-3 text-left cursor-pointer whitespace-nowrap"
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span>Creator Dashboard</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/loops/search")}
                  className="w-full py-2.5 px-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm font-medium flex items-center gap-3 text-left cursor-pointer whitespace-nowrap"
                >
                  <Search className="w-4 h-4 text-[#0095F6] shrink-0" />
                  <span>Explore & Search</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/loops/personalization")}
                  className="w-full py-2.5 px-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm font-medium flex items-center gap-3 text-left cursor-pointer whitespace-nowrap"
                >
                  <Palette className="w-4 h-4 text-[#0095F6] shrink-0" />
                  <span>Feed Personalization</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/loops/saved")}
                  className="w-full py-2.5 px-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm font-medium flex items-center gap-3 text-left cursor-pointer whitespace-nowrap"
                >
                  <Bookmark className="w-4 h-4 text-[#0095F6] shrink-0" />
                  <span>Saved Loops ({savedIds.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="w-full py-2.5 px-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm font-medium flex items-center gap-3 text-left cursor-pointer whitespace-nowrap"
                >
                  <ShoppingBag className="w-4 h-4 text-[#0095F6] shrink-0" />
                  <span>Back to Shop</span>
                </button>
              </div>
            </aside>

            {/* CENTER LOOPS COLUMN */}
            <div className="lg:col-span-6 max-w-[620px] w-full mx-auto space-y-1.5 sm:space-y-4 bg-transparent">

            {/* 1. Clean 3-Slot Loops Header (IMG_5123, IMG_5124, IMG_5108) */}
            {activeFeedFilter === "ghost" ? (
              <header className="flex items-center justify-between px-4 sm:px-2 py-2 bg-transparent">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    navigate("/loops");
                  }}
                  className="w-10 h-10 -ml-1.5 rounded-full flex items-center justify-center text-zinc-950 dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:scale-95 transition cursor-pointer"
                  aria-label="Back to Loops"
                >
                  <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setShowGhostIntroSheet(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-[17px] font-bold text-zinc-950 dark:text-white cursor-pointer"
                >
                  <DottedGhostCatIcon className="w-5 h-5" />
                  <span>Ghost posts</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    navigate("/loops/create?ghost=1");
                  }}
                  className="w-9 h-9 rounded-full loops-gray-pill flex items-center justify-center text-zinc-950 dark:text-white active:scale-95 transition cursor-pointer"
                  aria-label="Create Ghost post"
                >
                  <Plus className="w-5 h-5 stroke-[2.2]" />
                </button>
              </header>
            ) : (
              <header className="relative flex items-center justify-between px-4 sm:px-2 py-1.5 bg-transparent">
                {/* Left: Clean Two-Line Menu Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic();
                    setFeedMenuOpen(false);
                    setDrawerOpen((prev) => !prev);
                  }}
                  className="w-10 h-10 -ml-1.5 rounded-full flex items-center justify-center text-zinc-950 dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:scale-95 transition cursor-pointer shrink-0"
                  aria-label="Open Feeds Menu"
                  title="Feeds Menu"
                >
                  <TwoLineMenuIcon className="w-[23px] h-[23px]" />
                </button>

                {/* Center: Cursive "Loops ⌄" Wordmark + Liquid Popover Dropdown (IMG_5123 & IMG_5124) */}
                <div className="relative" ref={feedMenuRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic();
                      setFeedMenuOpen((prev) => !prev);
                    }}
                    className="inline-flex flex-col items-center justify-center px-3 py-0.5 rounded-2xl hover:bg-black/[0.03] dark:hover:bg-white/[0.05] active:scale-95 transition cursor-pointer select-none"
                    aria-label="Choose feed or visit shop"
                  >
                    <span className="inline-flex items-center gap-1">
                      <span className="loops-script-logo text-[34px] sm:text-[36px] text-zinc-950 dark:text-white">
                        Loops
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-zinc-900 dark:text-zinc-200 stroke-[2.3] mt-1 transition-transform duration-200 ${
                          feedMenuOpen ? "rotate-180" : ""
                        }`}
                      />
                    </span>
                    {(activeFeedFilter || scamOnlyMode) && (
                      <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 -mt-1">
                        {scamOnlyMode || activeFeedFilter === "scam"
                          ? "Scam Alerts"
                          : activeFeedFilter === "following"
                          ? "Following"
                          : activeFeedFilter === "favourites"
                          ? "Favourites"
                          : activeFeedFilter === "video"
                          ? "Videos"
                          : "For you"}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {feedMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.94, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: -6 }}
                        transition={{ type: "spring", stiffness: 430, damping: 30 }}
                        onClick={(e) => e.stopPropagation()}
                        className="loops-liquid-popover absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-50 w-[224px] rounded-[26px] py-2 px-1.5 space-y-0.5"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setFeedMenuOpen(false);
                            setScamOnlyMode(false);
                            navigate("/loops");
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-[18px] hover:bg-black/[0.045] dark:hover:bg-white/[0.08] text-[15.5px] font-semibold text-zinc-950 dark:text-white cursor-pointer"
                        >
                          <span>For you</span>
                          {!activeFeedFilter && !scamOnlyMode ? (
                            <Check className="w-[19px] h-[19px] text-zinc-950 dark:text-white stroke-[2.3]" />
                          ) : (
                            <Globe className="w-[19px] h-[19px] text-zinc-700 dark:text-zinc-300 stroke-[1.9]" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setFeedMenuOpen(false);
                            setScamOnlyMode(false);
                            navigate("/loops?filter=following");
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-[18px] hover:bg-black/[0.045] dark:hover:bg-white/[0.08] text-[15.5px] font-semibold text-zinc-950 dark:text-white cursor-pointer"
                        >
                          <span>Following</span>
                          {activeFeedFilter === "following" ? (
                            <Check className="w-[19px] h-[19px] text-zinc-950 dark:text-white stroke-[2.3]" />
                          ) : (
                            <Users className="w-[19px] h-[19px] text-zinc-700 dark:text-zinc-300 stroke-[1.9]" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setFeedMenuOpen(false);
                            setScamOnlyMode(false);
                            navigate("/loops?filter=favourites");
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-[18px] hover:bg-black/[0.045] dark:hover:bg-white/[0.08] text-[15.5px] font-semibold text-zinc-950 dark:text-white cursor-pointer"
                        >
                          <span>Favourites</span>
                          {activeFeedFilter === "favourites" ? (
                            <Check className="w-[19px] h-[19px] text-zinc-950 dark:text-white stroke-[2.3]" />
                          ) : (
                            <Star className="w-[19px] h-[19px] text-zinc-700 dark:text-zinc-300 stroke-[1.9]" />
                          )}
                        </button>

                        <div className="my-1 border-t loops-divider mx-2" />

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setFeedMenuOpen(false);
                            navigate("/");
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-[18px] hover:bg-black/[0.045] dark:hover:bg-white/[0.08] text-[15.5px] font-semibold text-zinc-950 dark:text-white cursor-pointer"
                        >
                          <span>Visit Shop</span>
                          <ShoppingBag className="w-[19px] h-[19px] text-zinc-700 dark:text-zinc-300 stroke-[1.9]" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Right: Create (+) & Heart Activity Icons */}
                <div className="flex items-center gap-0.5 -mr-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setChooserOpen(true);
                    }}
                    title="Create"
                    aria-label="Create"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-950 dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:scale-95 transition cursor-pointer"
                  >
                    <Plus className="w-[23px] h-[23px] stroke-[2]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      navigate("/loops/activity");
                    }}
                    title="Activity"
                    aria-label="Activity"
                    className="relative w-9 h-9 rounded-full flex items-center justify-center text-zinc-950 dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:scale-95 transition cursor-pointer"
                  >
                    <LoopHeartIcon className="w-[22px] h-[22px]" />
                    {unreadNewsNotifications > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#FF3040] ring-2 ring-white dark:ring-[#101010]" />
                    )}
                  </button>
                </div>
              </header>
            )}

            {/* Top Banner Ad Placement Slot */}
            <AdPlacementSlot slot="header_top" />

            {/* 2. Horizontal Circular Stories Row */}
            <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-1 px-4 sm:px-0.5 bg-transparent">
              {(() => {
                const myActiveStories = currentUser?.uid
                  ? stories
                      .filter((st) => st.userId === currentUser.uid)
                      .slice()
                      .sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0))
                  : [];
                const hasMyStory = myActiveStories.length > 0;
                const myHasCloseFriends = myActiveStories.some(
                  (st) => st.isCloseFriends
                );

                return (
                  <div className="flex flex-col items-center gap-1.5 shrink-0 group">
                    <div className="relative w-[64px] h-[64px]">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          if (!currentUser) {
                            notify("Please sign in to share your story!", "info");
                            navigate("/signin");
                            return;
                          }
                          if (hasMyStory) {
                            navigate(`/loops/story/${myActiveStories[0].id}`);
                          } else {
                            navigate("/loops/create-story?from=loops");
                          }
                        }}
                        className={`w-full h-full rounded-full p-[2px] flex items-center justify-center cursor-pointer ${
                          hasMyStory
                            ? myHasCloseFriends
                              ? "bg-gradient-to-tr from-green-500 to-emerald-400"
                              : "bg-gradient-to-tr from-[#0095F6] to-[#38BDF8]"
                            : "loops-surface border loops-divider"
                        }`}
                        aria-label={hasMyStory ? "View your story" : "Create story"}
                      >
                        {userAvatar ? (
                          <img
                            src={userAvatar}
                            alt="Your Story"
                            referrerPolicy="no-referrer"
                            className={`w-full h-full rounded-full object-cover group-hover:scale-[1.03] transition-transform ${
                              hasMyStory
                                ? "border-2 border-white dark:border-zinc-900"
                                : ""
                            }`}
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                            <UserIcon className="w-6 h-6" />
                          </div>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic();
                          if (!currentUser) {
                            notify("Please sign in to share your story!", "info");
                            navigate("/signin");
                            return;
                          }
                          navigate("/loops/create-story?from=loops");
                        }}
                        className="loops-plus-badge absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer z-10"
                        aria-label="Add to your story"
                      >
                        <Plus className="w-3 h-3 stroke-[3]" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        if (!currentUser) {
                          navigate("/signin");
                          return;
                        }
                        if (hasMyStory) {
                          navigate(`/loops/story/${myActiveStories[0].id}`);
                        } else {
                          navigate("/loops/create-story?from=loops");
                        }
                      }}
                      className="text-[11.5px] font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap cursor-pointer"
                    >
                      Your story
                    </button>
                  </div>
                );
              })()}

              {loading && stories.length === 0 &&
                Array.from({ length: 4 }).map((_, sIdx) => (
                  <div
                    key={`story_skel_${sIdx}`}
                    className="flex flex-col items-center gap-1.5 shrink-0"
                  >
                    <div className="w-[64px] h-[64px] rounded-full ds-skeleton" />
                    <div className="h-3 w-12 rounded-md ds-skeleton" />
                  </div>
                ))}
              {Array.from(
                stories
                  .filter((st) => !currentUser?.uid || st.userId !== currentUser.uid)
                  .reduce((acc, st) => {
                    const uid = st.userId;
                    if (!acc.has(uid)) {
                      acc.set(uid, {
                        ...st,
                        storyIds: [st.id],
                      });
                    } else {
                      const existing = acc.get(uid);
                      existing.storyIds.push(st.id);
                      if ((st.createdAtMs || 0) < (existing.createdAtMs || 0)) {
                        acc.set(uid, { ...st, storyIds: existing.storyIds });
                      }
                    }
                    return acc;
                  }, new Map())
                  .values()
              ).map((group: any) => (
                <button
                  key={group.userId}
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    navigate(`/loops/story/${group.id}`);
                  }}
                  className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
                >
                  <div
                    className={`w-[64px] h-[64px] rounded-full p-[2px] ${
                      group.isCloseFriends
                        ? "bg-gradient-to-tr from-green-500 to-emerald-400"
                        : "bg-gradient-to-tr from-[#0095F6] to-[#38BDF8]"
                    }`}
                  >
                    <img
                      src={group.avatar}
                      alt={group.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full rounded-full object-cover border-2 border-white dark:border-zinc-900 group-hover:scale-[1.03] transition-transform"
                    />
                  </div>
                  <span className="text-[11.5px] font-medium text-zinc-700 dark:text-zinc-300 max-w-[64px] truncate">
                    {group.name}
                  </span>
                </button>
              ))}
            </div>

            {/* 3. Subtle Divider below Stories matching IMG_5123 */}
            <div className="border-b loops-divider sm:hidden" />

            {/* Desktop Inline Composer Bar */}
            <section className="hidden sm:flex loops-surface rounded-[24px] border loops-divider px-4 py-3.5 items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/loops/profile")}
                className="w-10 h-10 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border loops-divider flex items-center justify-center shrink-0 cursor-pointer"
              >
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt="Profile"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-5 h-5 text-zinc-400" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setChooserOpen(true);
                }}
                className="flex-1 text-left cursor-pointer min-w-0"
              >
                <span className="block text-[14.5px] font-semibold text-zinc-950 dark:text-white truncate">
                  {getSafePublicUsername(userProfile || currentUser) ||
                    getSafeDisplayName(userProfile || currentUser, "Start a Loop")}
                </span>
                <span className="block text-[14px] text-zinc-400 dark:text-zinc-500 truncate">
                  What&apos;s new?
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setChooserOpen(true);
                }}
                className="px-4 py-1.5 rounded-full border loops-divider text-[13.5px] font-semibold text-zinc-950 dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition shrink-0 cursor-pointer"
              >
                Create
              </button>
            </section>

            {/* Active Filter Indicator Strip */}
            {(scamOnlyMode || isPersonalizedActive) && (
              <div className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-full bg-white/85 dark:bg-zinc-900/90 backdrop-blur-md text-xs font-medium shadow-2xs">
                <span className="text-zinc-700 dark:text-zinc-300 truncate">
                  {scamOnlyMode
                    ? "Filtering: Verified Scam Reports"
                    : "Personalized Feed preferences active"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setScamOnlyMode(false);
                    localStorage.setItem(
                      "vibe_feed_preferences",
                      JSON.stringify(DEFAULT_FEED_PREFERENCES)
                    );
                    setPrefs(DEFAULT_FEED_PREFERENCES);
                  }}
                  className="text-[#1877F2] font-bold shrink-0 cursor-pointer"
                >
                  Show All
                </button>
              </div>
            )}

            {/* 4. Loops Hairline Stream (IMG_5089 & IMG_5090) */}
            {loading && visiblePosts.length === 0 ? (
              <div className="px-4 sm:px-0">
                <NewsPostCardSkeleton count={4} />
              </div>
            ) : visiblePosts.length === 0 ? (
              <div className="loops-surface sm:rounded-[28px] border-y sm:border loops-divider p-10 text-center space-y-3">
                <p className="text-base font-bold">
                  {scamOnlyMode || isPersonalizedActive
                    ? "No Loops match your current filter"
                    : "No Loops published yet"}
                </p>
                <p className="text-xs text-zinc-500">
                  {scamOnlyMode || isPersonalizedActive
                    ? "Reset your filter or customize your feed preferences."
                    : "Start the first Loop with photos, voice notes, links, or #hashtags!"}
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  {(scamOnlyMode || isPersonalizedActive) && (
                    <button
                      type="button"
                      onClick={() => navigate("/loops/personalization")}
                      className="px-4 py-2 rounded-full border loops-divider text-xs font-semibold cursor-pointer"
                    >
                      Personalize
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setChooserOpen(true);
                    }}
                    className="px-5 py-2 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold cursor-pointer"
                  >
                    Create a Loop
                  </button>
                </div>
              </div>
            ) : (
              <div className="loops-surface rounded-none sm:border loops-divider overflow-hidden">
                {visiblePosts.map((post, postIndex) => {
                  const saved =
                    savedIds.includes(post.id) ||
                    Boolean(
                      currentUser?.uid &&
                        post.savedByUserIds?.includes(currentUser.uid)
                    );
                  const canManagePost =
                    isAdmin ||
                    Boolean(
                      currentUser?.uid && currentUser.uid === post.reporterId
                    );
                  const authorProf = communityUserMap.get(post.reporterId) || null;

                  return (
                    <React.Fragment key={post.id}>
                      {postIndex > 0 && postIndex % 4 === 0 && (
                        <div className="border-b loops-divider px-4 py-2">
                          <AdPlacementSlot slot="feed_in_feed" postIndex={postIndex} />
                        </div>
                      )}

                      <PostImpressionTracker postId={post.id}>
                        <LoopPostCard
                          post={post}
                          authorProfile={authorProf}
                          currentUser={currentUser}
                          isFollowingAuthor={Boolean(
                            post.reporterId &&
                              followedIds.includes(post.reporterId)
                          )}
                          isSaved={saved}
                          canManage={canManagePost}
                          onToggleLike={(p) => handleReaction(p, "love")}
                          onToggleRepost={(p) => handleToggleRepost(p)}
                          onOpenShare={(p) => {
                            recordPostClick(p);
                            setShareModalPost(p);
                          }}
                          onToggleSave={() => handleToggleSave(post)}
                          onCopyLink={(pid) => handleCopyPostLink(pid)}
                          onEditPost={(p) => navigate(`/loops/edit/${p.id}`)}
                          onDeletePost={(p) => handleDeletePost(p)}
                          onRequireAuth={() => {
                            notify("Please sign in to continue.", "info");
                            navigate("/signin");
                          }}
                        />
                      </PostImpressionTracker>

                      {/* Suggested Profiles Shelf after 2nd Loop */}
                      {postIndex === 1 && suggestedProfiles.length > 0 && (
                        <section className="border-b loops-divider p-4 space-y-3">
                          <div className="flex items-center justify-between px-0.5">
                            <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                              Suggested for you
                            </h3>
                            <button
                              type="button"
                              onClick={() => navigate("/loops/search")}
                              className="text-xs font-semibold text-[#0095F6] hover:underline cursor-pointer whitespace-nowrap"
                            >
                              See all
                            </button>
                          </div>
                          <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar pb-1">
                            {suggestedProfiles.map((prof) => (
                              <div
                                key={prof.uid}
                                onClick={() =>
                                  navigate(`/loops/profile/${prof.uid}`)
                                }
                                className="relative w-36 shrink-0 rounded-2xl border loops-divider p-3 flex flex-col items-center text-center justify-between gap-2 cursor-pointer"
                              >
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleDismissSuggestedProfile(e, prof.uid)
                                  }
                                  className="absolute top-2 right-2 w-6 h-6 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-600 cursor-pointer"
                                  aria-label="Dismiss profile"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                                <div className="flex flex-col items-center gap-1.5 w-full pt-1">
                                  <img
                                    src={prof.avatar}
                                    alt={prof.name}
                                    referrerPolicy="no-referrer"
                                    className="w-14 h-14 rounded-full object-cover border loops-divider"
                                  />
                                  <p className="text-xs font-bold text-zinc-950 dark:text-white truncate w-full">
                                    {prof.name}
                                  </p>
                                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate w-full tabular-nums">
                                    {formatCompactCount(prof.followersCount)}{" "}
                                    followers
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleFollowSuggestedProfile(e, prof)
                                  }
                                  className="loops-follow-btn w-full py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                                >
                                  Follow
                                </button>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}
                    </React.Fragment>
                  );
                })}
                <div className="p-4">
                  <AdPlacementSlot slot="multiplex_grid" />
                </div>
              </div>
            )}
          </div>

          {/* Desktop Right Studio & Personalization Rail */}
          <aside className="hidden lg:flex lg:col-span-3 flex-col gap-4 sticky top-6">
            <AdPlacementSlot slot="sidebar_right" />
            {/* Creator Dashboard & Content Monetization Card */}
            <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-[28px] p-5 shadow-[0_6px_24px_rgba(15,23,42,0.05)] space-y-3 border border-white/80 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#1877F2] flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold truncate">Creator Studio</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold whitespace-nowrap">
                  Monetize
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Track post views, enable Content Monetization, manage Stars &
                Sponsorships, and set payout numbers.
              </p>
              <button
                type="button"
                onClick={() => navigate("/creator-dashboard")}
                className="w-full py-2.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                <span>Open Creator Dashboard</span>
              </button>
            </div>

            {suggestedProfiles.length > 0 && (
              <div className="loops-surface rounded-[28px] p-5 shadow-[0_6px_24px_rgba(15,23,42,0.04)] space-y-3 border loops-divider">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">Suggested Profiles</h3>
                  <button
                    type="button"
                    onClick={() => navigate("/loops/search")}
                    className="text-xs font-semibold text-[#0095F6] hover:underline cursor-pointer"
                  >
                    See all
                  </button>
                </div>
                <div className="space-y-2.5">
                  {suggestedProfiles.slice(0, 4).map((prof) => (
                    <div
                      key={`rail_${prof.uid}`}
                      onClick={() => navigate(`/loops/profile/${prof.uid}`)}
                      className="flex items-center justify-between gap-2.5 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={prof.avatar}
                          alt={prof.name}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-900 dark:text-white truncate group-hover:text-[#0095F6] transition-colors">
                            {prof.name}
                          </p>
                          <p className="text-[11px] text-zinc-500 truncate tabular-nums">
                            {formatCompactCount(prof.followersCount)} followers
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleFollowSuggestedProfile(e, prof)}
                        className="loops-follow-btn px-3.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        Follow
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="loops-surface rounded-[28px] p-5 shadow-[0_6px_24px_rgba(15,23,42,0.04)] space-y-3 border loops-divider">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">Active Themes</h3>
                <button
                  type="button"
                  onClick={() => navigate("/loops/personalization")}
                  className="text-xs font-semibold text-[#0095F6] hover:underline cursor-pointer"
                >
                  Edit
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FEED_THEMES.filter((t) =>
                  prefs.selectedThemes.includes(t.id)
                )
                  .slice(0, 8)
                  .map((theme) => (
                    <span
                      key={theme.id}
                      className="px-2.5 py-1 rounded-full bg-[#F4F5F7] dark:bg-zinc-800 text-xs font-medium flex items-center gap-1 whitespace-nowrap"
                    >
                      <span>{theme.label}</span>
                    </span>
                  ))}
              </div>
            </div>

            <div className="loops-surface rounded-[28px] p-5 shadow-[0_6px_24px_rgba(15,23,42,0.04)] space-y-2.5 border loops-divider">
              <h3 className="text-sm font-bold">Community Safety</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Need to warn shoppers about a fraudulent page or number? Switch
                to Scam Report inside the composer to stamp verified incident
                location details.
              </p>
              <button
                type="button"
                onClick={() => navigate("/loops/create?tab=scam")}
                className="w-full py-2.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Report a Scam</span>
              </button>
            </div>
          </aside>
        </div>
      </div>
    </motion.div>

      {!drawerOpen && <NewsBottomDock />}

      {/* Share and Activity Modals (outside transformed motion container) */}
      <LiquidGlassShareModal
        isOpen={Boolean(shareModalPost)}
        post={shareModalPost || {}}
        onClose={() => setShareModalPost(null)}
        onRepost={() => {
          if (shareModalPost?.id) {
            const target = firestorePosts.find((p) => p.id === shareModalPost.id);
            if (target) handleToggleRepost(target);
          }
        }}
        onQuotePost={() => {
          if (shareModalPost?.id) {
            navigate(`/loops/create?quotePostId=${shareModalPost.id}`);
          }
        }}
      />

      <LiquidGlassActivityModal
        isOpen={Boolean(activityModalPost)}
        post={activityModalPost || {}}
        onClose={() => setActivityModalPost(null)}
      />

      {/* Ghost Posts Intro Bottom Sheet (IMG_5113) */}
      <AnimatePresence>
        {showGhostIntroSheet && (
          <div className="fixed inset-0 z-[120] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGhostIntroSheet(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 390, damping: 34 }}
              className="loops-surface relative z-[121] w-full max-w-[460px] mx-auto rounded-t-[34px] px-6 pt-3 pb-8 text-center space-y-5 shadow-2xl border-t loops-divider"
            >
              <div className="w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto" />
              <div className="pt-2 flex justify-center text-zinc-950 dark:text-white">
                <DottedGhostCatIcon className="w-16 h-16" />
              </div>
              <div className="space-y-2 max-w-[320px] mx-auto">
                <h2 className="text-[22px] font-bold leading-snug text-zinc-950 dark:text-white">
                  Share posts that don&apos;t last forever
                </h2>
                <p className="text-[14.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Ghost posts are archived after 24 hours. You can choose to get
                  replies as messages or see them on your post.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setShowGhostIntroSheet(false);
                  navigate("/loops/create?ghost=1");
                }}
                className="w-full py-4 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-[15.5px] font-bold active:scale-[0.98] transition cursor-pointer"
              >
                Try It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <CreateChooserModal
        isOpen={chooserOpen}
        onClose={() => setChooserOpen(false)}
      />
    </>
  );
};

export default NewsHub;
