import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Shield,
  ShieldAlert,
  Palette,
  Plus,
  Smile,
  SlidersHorizontal,
  Image as ImageIcon,
  Sparkles,
  Video,
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
  ChevronRight,
} from "lucide-react";
import { DottedGhostCatIcon } from "../components/ComposerLiquidGlassSheets";
import {
  LiquidGlassShareModal,
  LiquidGlassActivityModal,
} from "../components/LiquidGlassPostInteractions";

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
} from "firebase/firestore";
import { ScamPost, ReactionType } from "../types";
import { NewsPostMedia, isScamPostRecord } from "../components/NewsPostMedia";
import {
  NewsRichText,
  NewsLinkPreviewCards,
} from "../components/NewsRichText";
import { resolvePostVideoSource } from "../lib/videoEmbed";
import { NewsBottomDock } from "../components/NewsBottomDock";
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
  getDismissedProfileIds,
  dismissSuggestedProfileId,
  getDismissedPostIds,
  dismissSuggestedPostId,
  seededDiscoveryNoise,
} from "../lib/feedAlgorithm";

import defaultAvatarImg from "../src/assets/images/story_avatar_creator_1_1792826814910.jpg";
import deepShopLogoFallback from "../src/assets/images/deep_shop_logo_1783442733929.jpg";

const REACTION_ITEMS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "love", emoji: "❤️", label: "Love" },
  { type: "like", emoji: "👍", label: "Like" },
  { type: "haha", emoji: "😆", label: "Haha" },
  { type: "wow", emoji: "😮", label: "Wow" },
  { type: "sad", emoji: "😢", label: "Sad" },
  { type: "angry", emoji: "😡", label: "Angry" },
];

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
  const [expandedPostIds, setExpandedPostIds] = useState<
    Record<string, boolean>
  >({});
  const [openReactionPostId, setOpenReactionPostId] = useState<string | null>(
    null
  );
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [shareModalPost, setShareModalPost] = useState<Partial<ScamPost> | null>(null);
  const [activityModalPost, setActivityModalPost] = useState<Partial<ScamPost> | null>(null);
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
          data.mediaUrl ||
          defaultAvatarImg,
        isCloseFriends: Boolean(data.isCloseFriends),
        closeFriendIds: Array.isArray(data.closeFriendIds)
          ? data.closeFriendIds
          : [],
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
      const sorted = Array.from(mergedMap.values())
        .filter((s) => {
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

      if (scamOnlyMode) {
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
  }, [allPosts, prefs, scamOnlyMode, currentUser?.uid]);

  const visiblePosts = React.useMemo(() => {
    return rankFeedPostsSmart(filteredPosts, {
      currentUid: currentUser?.uid,
      followedIds,
      sessionSeed,
      dismissedPostIds,
    });
  }, [filteredPosts, currentUser?.uid, followedIds, sessionSeed, dismissedPostIds]);

  // Build real Suggested Profiles STRICTLY from real users who have published posts (zero demo/non-posting users)
  const suggestedProfiles = React.useMemo<SuggestedCreatorProfile[]>(() => {
    const userMap = new Map<string, any>();
    communityUsers.forEach((u) => {
      const uid = u.uid || u.id;
      if (uid) userMap.set(uid, u);
    });

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

  const handleReaction = async (post: ScamPost, chosenType: ReactionType) => {
    triggerHaptic();
    recordPostClick(post);
    const uid = currentUser?.uid || "guest_local";
    const prevType =
      post.reactions?.[uid] || localUserReactions[post.id] || null;
    const isRemoving = prevType === chosenType;

    const updatedLocal = { ...localUserReactions };
    if (isRemoving) {
      delete updatedLocal[post.id];
    } else {
      updatedLocal[post.id] = chosenType;
    }
    setLocalUserReactions(updatedLocal);
    localStorage.setItem("deep_post_reactions", JSON.stringify(updatedLocal));
    setOpenReactionPostId(null);

    const baseCounts: Record<ReactionType, number> = {
      like: post.reactionsCount?.like || 0,
      love: post.reactionsCount?.love || 0,
      haha: post.reactionsCount?.haha || 0,
      wow: post.reactionsCount?.wow || 0,
      sad: post.reactionsCount?.sad || 0,
      angry: post.reactionsCount?.angry || 0,
    };

    if (prevType && baseCounts[prevType] > 0) {
      baseCounts[prevType] = Math.max(0, baseCounts[prevType] - 1);
    }
    if (!isRemoving) {
      baseCounts[chosenType] = (baseCounts[chosenType] || 0) + 1;
    }

    const updatedReactionsMap = { ...(post.reactions || {}) };
    if (isRemoving) {
      delete updatedReactionsMap[uid];
    } else {
      updatedReactionsMap[uid] = chosenType;
    }

    const nextTotalVotes = Object.values(baseCounts).reduce(
      (a, b) => a + (Number(b) || 0),
      0
    );

    setFirestorePosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              reactions: updatedReactionsMap,
              reactionsCount: baseCounts,
              votes: nextTotalVotes,
            }
          : p
      )
    );

    try {
      await updateDoc(doc(db, "scam_posts", post.id), {
        reactions: updatedReactionsMap,
        reactionsCount: baseCounts,
        votes: nextTotalVotes,
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
              fromUserName: "News Hub",
              fromUserUsername: "",
              fromUserAvatar: "",
              type: "milestone",
              milestoneKind: "reactions",
              totalCount: nextTotalVotes,
              title: "Congratulations! 🎉",
              body: `Congratulations! Your post now has ${nextTotalVotes.toLocaleString()} total reactions.`,
              mediaThumbnail: post.images?.[0] || "",
              targetId: post.id,
              isRead: false,
              read: false,
              createdAt: Date.now(),
              link: `/news-hub/post/${post.id}`,
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
            title: "New Reaction",
            body: `reacted to your post: "${(post.description || post.title || "").slice(0, 30)}..."`,
            mediaThumbnail: post.images?.[0] || "",
            targetId: post.id,
            isRead: false,
            read: false,
            createdAt: Date.now(),
            link: `/news-hub/post/${post.id}`,
          }).catch(() => {});
        }
      }
    } catch {}
  };

  const handleToggleSave = async (post: ScamPost) => {
    triggerHaptic();
    const next = await toggleSavePostHelper(post, currentUser?.uid);
    setSavedIds(getSavedPostIdsLocal());
    notify(
      next ? "Post saved to bookmarks" : "Removed from saved posts",
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

  const isAdmin =
    hasImmediateAdminOrStaffRole(userProfile, currentUser) || isStaffDoc;
  const userAvatar = userProfile?.photoURL || currentUser?.photoURL || defaultAvatarImg;
  const isPersonalizedActive =
    prefs.selectedThemes.length < FEED_THEMES.length ||
    Object.values(prefs.contentPreferences).some((v) => !v);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#6BB2F8]/85 via-[#DCEEFF]/55 via-22% to-transparent dark:from-transparent dark:via-transparent dark:to-transparent text-zinc-900 dark:text-zinc-100 font-sans pb-32">
      <SEO
        title="Feed — Community & Updates"
        description="Explore stories, photos, voice notes, links, hashtags, and verified community reports."
      />

      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 pt-4 sm:pt-6 bg-transparent">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start bg-transparent">
          {/* Desktop Left Quick Navigation Rail */}
          <aside className="hidden lg:flex lg:col-span-3 flex-col gap-4 sticky top-6">
            <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-[28px] p-5 shadow-[0_6px_24px_rgba(15,23,42,0.05)] space-y-2 border border-white/80 dark:border-zinc-800">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-white dark:bg-zinc-800 ring-1 ring-slate-200/80 dark:ring-zinc-700 shadow-sm shrink-0 flex items-center justify-center">
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
                <span className="text-lg font-bold tracking-tight whitespace-nowrap">
                  News Hub
                </span>
              </div>

              <button
                type="button"
                onClick={() => navigate("/news-hub/create")}
                className="w-full py-2.5 px-4 rounded-full bg-[#1877F2] hover:bg-[#1465D8] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Create a Post</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/creator-dashboard")}
                className="w-full py-2.5 px-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 hover:bg-blue-100/80 dark:hover:bg-blue-900/40 text-sm font-bold text-[#1877F2] dark:text-[#58A6FF] flex items-center gap-3 text-left cursor-pointer whitespace-nowrap"
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Creator Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/news-hub/search")}
                className="w-full py-2.5 px-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm font-medium flex items-center gap-3 text-left cursor-pointer whitespace-nowrap"
              >
                <Search className="w-4 h-4 text-[#1877F2] shrink-0" />
                <span>Explore & Search</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/news-hub/personalization")}
                className="w-full py-2.5 px-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm font-medium flex items-center gap-3 text-left cursor-pointer whitespace-nowrap"
              >
                <Palette className="w-4 h-4 text-[#1877F2] shrink-0" />
                <span>Feed Personalization</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/news-hub/saved")}
                className="w-full py-2.5 px-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm font-medium flex items-center gap-3 text-left cursor-pointer whitespace-nowrap"
              >
                <Bookmark className="w-4 h-4 text-[#1877F2] shrink-0" />
                <span>Saved Posts ({savedIds.length})</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/")}
                className="w-full py-2.5 px-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm font-medium flex items-center gap-3 text-left cursor-pointer whitespace-nowrap"
              >
                <ShoppingBag className="w-4 h-4 text-[#1877F2] shrink-0" />
                <span>Back to Shop</span>
              </button>
            </div>
          </aside>

          {/* CENTER FEED COLUMN (Uses transparent div instead of <main> so global CSS never injects white box) */}
          <div className="lg:col-span-6 max-w-[600px] w-full mx-auto space-y-4 bg-transparent">
            {/* 1. Top Feed Header */}
            <header className="flex items-center justify-between px-1 pt-1 bg-transparent">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setScamOnlyMode(false);
                  }}
                  className="w-9 h-9 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center shadow-[0_4px_12px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/80 dark:ring-zinc-800 relative overflow-hidden cursor-pointer shrink-0"
                  aria-label="Feed Home"
                >
                  <img
                    src={footerLogo}
                    alt="DEEP SHOP"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = deepShopLogoFallback;
                    }}
                    className="w-full h-full object-cover rounded-full"
                  />
                </button>
                <h1 className="text-[22px] sm:text-[24px] font-bold tracking-tight text-zinc-900 dark:text-white whitespace-nowrap truncate">
                  {scamOnlyMode ? "Scam Alerts" : "Feed"}
                </h1>
              </div>

              {/* Right Circular Buttons: Notifications + Creator Dashboard + Unfilled Outline Shield + Unfilled Outline Palette */}
              <div className="flex items-center gap-2 shrink-0">

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    navigate("/news-hub/notifications");
                  }}
                  title="Notifications"
                  aria-label="Notifications"
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shadow-[0_4px_14px_rgba(15,23,42,0.08)] active:scale-95 transition cursor-pointer relative"
                >
                  <Icon name="bell" className="w-5 h-5 stroke-[2.2]" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    navigate("/creator-dashboard");
                  }}
                  title="Creator Dashboard"
                  aria-label="Creator Dashboard"
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shadow-[0_4px_14px_rgba(15,23,42,0.08)] active:scale-95 transition cursor-pointer"
                >
                  <Icon name="layout" className="w-5 h-5 stroke-[2.2]" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setScamOnlyMode((prev) => !prev);
                    notify(
                      !scamOnlyMode
                        ? "Showing Scam Reports only"
                        : "Showing all Feed posts",
                      "info"
                    );
                  }}
                  title="Toggle Scam Reports Filter"
                  aria-label="Toggle Scam Reports Filter"
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shadow-[0_4px_14px_rgba(15,23,42,0.08)] transition active:scale-95 cursor-pointer ${
                    scamOnlyMode
                      ? "bg-rose-600 text-white"
                      : "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  {scamOnlyMode ? (
                    <Icon name="shield-alert" className="w-5 h-5 stroke-[2.2]" />
                  ) : (
                    <Icon name="shield" className="w-5 h-5 stroke-[2.2]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    navigate("/news-hub/personalization");
                  }}
                  title="Feed Personalization"
                  aria-label="Feed Personalization"
                  className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shadow-[0_4px_14px_rgba(15,23,42,0.08)] active:scale-95 transition cursor-pointer"
                >
                  <Icon name="palette" className="w-5 h-5 stroke-[2.2]" />
                  {isPersonalizedActive && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#1877F2]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    navigate("/news-hub/profile");
                  }}
                  title="My Profile"
                  aria-label="My Profile"
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shadow-[0_4px_14px_rgba(15,23,42,0.08)] active:scale-95 transition cursor-pointer overflow-hidden ring-2 ring-blue-500/30"
                >
                  <img
                    src={userAvatar}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </button>
              </div>
            </header>

            {/* 2. Horizontal Circular Stories Row */}
            <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-1 px-0.5 bg-transparent">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  if (!currentUser) {
                    notify("Please sign in to share your story!", "info");
                    navigate("/signin");
                    return;
                  }
                  navigate("/news-hub/create-story?from=news-hub");
                }}
                className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
              >
                <div className="relative w-[68px] h-[68px] rounded-full p-[2.5px] bg-white dark:bg-zinc-900 shadow-[0_4px_12px_rgba(15,23,42,0.08)]">
                  <img
                    src={userAvatar}
                    alt="Your Story"
                    referrerPolicy="no-referrer"
                    className="w-full h-full rounded-full object-cover group-hover:scale-[1.03] transition-transform"
                  />
                  <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#1877F2] text-white border-2 border-white dark:border-zinc-900 flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5 stroke-[2.8]" />
                  </span>
                </div>
                <span className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                  Your story
                </span>
              </button>

              {/* Real Community Stories grouped by User */}
              {loading && stories.length === 0 &&
                Array.from({ length: 4 }).map((_, sIdx) => (
                  <div
                    key={`story_skel_${sIdx}`}
                    className="flex flex-col items-center gap-1.5 shrink-0"
                  >
                    <div className="w-[68px] h-[68px] rounded-full ds-skeleton" />
                    <div className="h-3 w-12 rounded-md ds-skeleton" />
                  </div>
                ))}
              {Array.from(
                stories.reduce((acc, st) => {
                  const uid = st.userId;
                  if (!acc.has(uid)) {
                    acc.set(uid, {
                      ...st,
                      storyIds: [st.id],
                    });
                  } else {
                    const existing = acc.get(uid);
                    existing.storyIds.push(st.id);
                    // Keep the oldest story as the representative for initial navigation
                    if ((st.createdAtMs || 0) < (existing.createdAtMs || 0)) {
                       acc.set(uid, { ...st, storyIds: existing.storyIds });
                    }
                  }
                  return acc;
                }, new Map()).values()
              ).map((group: any) => (
                <button
                  key={group.userId}
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    // Navigate to first story in group
                    navigate(`/news-hub/story/${group.id}`);
                  }}
                  className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
                >
                  <div
                    className={`w-[68px] h-[68px] rounded-full p-[2.5px] shadow-[0_4px_12px_rgba(15,23,42,0.08)] ${
                      group.isCloseFriends
                        ? "bg-gradient-to-tr from-green-500 to-emerald-400"
                        : "bg-gradient-to-tr from-[#1877F2] to-[#38BDF8]"
                    }`}
                  >
                    <img
                      src={group.avatar}
                      alt={group.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full rounded-full object-cover border-2 border-white dark:border-zinc-900 group-hover:scale-[1.03] transition-transform"
                    />
                  </div>
                  <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300 max-w-[68px] truncate">
                    {group.name}
                  </span>
                </button>
              ))}
            </div>

            {/* 3. Composer Card */}
            <section className="bg-white dark:bg-zinc-900 rounded-[28px] p-4 shadow-[0_8px_28px_rgba(15,23,42,0.05)] space-y-3.5">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  className="w-11 h-11 rounded-full p-[2px] border-[1.5px] border-dashed border-[#3B82F6] shrink-0 cursor-pointer"
                >
                  <img
                    src={userAvatar}
                    alt="Profile"
                    referrerPolicy="no-referrer"
                    className="w-full h-full rounded-full object-cover"
                  />
                </button>

                <div
                  onClick={() => {
                    triggerHaptic();
                    navigate("/news-hub/create");
                  }}
                  className="flex-1 h-11 rounded-full bg-[#F4F5F7] dark:bg-zinc-800 pl-4 pr-1.5 flex items-center justify-between cursor-pointer hover:bg-[#ECEEF2] dark:hover:bg-zinc-700/80 transition"
                >
                  <span className="text-[13.5px] text-zinc-500 dark:text-zinc-400 truncate">
                    Upload your photo...
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic();
                      navigate("/news-hub/create");
                    }}
                    className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-900 dark:text-zinc-100 shadow-2xs cursor-pointer"
                    aria-label="Create post"
                  >
                    <Smile className="w-4 h-4 stroke-[2]" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    navigate("/news-hub/personalization");
                  }}
                  className="w-11 h-11 rounded-full bg-[#F4F5F7] dark:bg-zinc-800 hover:bg-[#ECEEF2] flex items-center justify-center text-zinc-900 dark:text-zinc-100 shrink-0 transition cursor-pointer"
                  aria-label="Customize feed"
                >
                  <SlidersHorizontal className="w-4 h-4 stroke-[2]" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      navigate("/news-hub/create?tab=photo");
                    }}
                    className="px-3 py-1.5 rounded-full bg-[#F4F5F7] dark:bg-zinc-800 hover:bg-[#EAECEF] text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 shrink-0 whitespace-nowrap transition cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5 stroke-[2] shrink-0" />
                    <span>Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      navigate("/news-hub/create?tab=voice");
                    }}
                    className="px-3 py-1.5 rounded-full bg-[#F4F5F7] dark:bg-zinc-800 hover:bg-[#EAECEF] text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 shrink-0 whitespace-nowrap transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 stroke-[2] shrink-0" />
                    <span>Voice</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      navigate("/news-hub/create?tab=video");
                    }}
                    className="px-3 py-1.5 rounded-full bg-[#F4F5F7] dark:bg-zinc-800 hover:bg-[#EAECEF] text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 shrink-0 whitespace-nowrap transition cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5 stroke-[2] shrink-0" />
                    <span>Video</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      navigate("/creator-dashboard");
                    }}
                    className="px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-xs font-semibold text-[#1877F2] dark:text-[#58A6FF] flex items-center gap-1.5 shrink-0 whitespace-nowrap transition cursor-pointer"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 stroke-[2] shrink-0" />
                    <span>Creator Studio</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    navigate("/news-hub/create");
                  }}
                  className="px-4.5 py-1.5 rounded-full bg-[#1877F2] hover:bg-[#1465D8] text-white text-xs font-semibold shadow-[0_4px_12px_rgba(24,119,242,0.32)] active:scale-95 transition shrink-0 whitespace-nowrap cursor-pointer"
                >
                  Post
                </button>
              </div>
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

            {/* 4. Feed Stream */}
            {loading && visiblePosts.length === 0 ? (
              <NewsPostCardSkeleton count={4} />
            ) : visiblePosts.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 rounded-[28px] p-10 text-center space-y-3 shadow-xs">
                <p className="text-base font-bold">
                  {scamOnlyMode || isPersonalizedActive
                    ? "No posts match your current filter"
                    : "No posts published yet"}
                </p>
                <p className="text-xs text-zinc-500">
                  {scamOnlyMode || isPersonalizedActive
                    ? "Reset your filter or customize your feed preferences."
                    : "Create the first post with photos, voice notes, links, or #hashtags!"}
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  {(scamOnlyMode || isPersonalizedActive) && (
                    <button
                      type="button"
                      onClick={() => navigate("/news-hub/personalization")}
                      className="px-4 py-2 rounded-full bg-[#F4F5F7] dark:bg-zinc-800 text-xs font-semibold cursor-pointer"
                    >
                      Personalize
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate("/news-hub/create")}
                    className="px-5 py-2 rounded-full bg-[#1877F2] text-white text-xs font-semibold cursor-pointer"
                  >
                    Create a Post
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* If very few posts exist, show Suggested Profiles right away */}
                {visiblePosts.length < 2 && suggestedProfiles.length > 0 && (
                  <section className="bg-white dark:bg-zinc-900 rounded-[28px] p-4 shadow-[0_8px_28px_rgba(15,23,42,0.05)] space-y-3">
                    <div className="flex items-center justify-between px-0.5">
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                        Suggested for you
                      </h3>
                      <button
                        type="button"
                        onClick={() => navigate("/news-hub/search")}
                        className="text-xs font-semibold text-[#1877F2] hover:underline cursor-pointer whitespace-nowrap"
                      >
                        See all
                      </button>
                    </div>
                    <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar pb-1">
                      {suggestedProfiles.map((prof) => (
                        <div
                          key={prof.uid}
                          onClick={() => navigate(`/author/${prof.uid}`)}
                          className="relative w-36 shrink-0 rounded-2xl bg-[#F5F6F8] dark:bg-zinc-800/80 border border-slate-200/70 dark:border-zinc-700/60 p-3 flex flex-col items-center text-center justify-between gap-2 cursor-pointer"
                        >
                          <button
                            type="button"
                            onClick={(e) =>
                              handleDismissSuggestedProfile(e, prof.uid)
                            }
                            className="absolute top-2 right-2 w-6 h-6 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-600 cursor-pointer"
                            aria-label="Dismiss suggestion"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <div className="flex flex-col items-center gap-1.5 w-full pt-1">
                            <img
                              src={prof.avatar}
                              alt={prof.name}
                              referrerPolicy="no-referrer"
                              className="w-14 h-14 rounded-full object-cover border border-white dark:border-zinc-700"
                            />
                            <p className="text-xs font-bold text-zinc-900 dark:text-white truncate w-full">
                              {prof.name}
                            </p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate w-full tabular-nums">
                              {formatCompactCount(prof.followersCount)} followers
                              {prof.postsCount > 0
                                ? ` · ${prof.postsCount} posts`
                                : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) =>
                              handleFollowSuggestedProfile(e, prof)
                            }
                            className="w-full py-1.5 rounded-lg bg-[#1877F2] hover:bg-[#1465D8] text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                          >
                            Follow
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {visiblePosts.map((post, postIndex) => {
                  const isScam = isScamPostRecord(post);
                  const uid = currentUser?.uid || "guest_local";
                  const myReaction =
                    post.reactions?.[uid] ||
                    localUserReactions[post.id] ||
                    null;

                  const totalReactions = getTotalPostReactions(post);

                  const saved =
                    savedIds.includes(post.id) ||
                    Boolean(
                      currentUser?.uid &&
                        post.savedByUserIds?.includes(currentUser.uid)
                    );

                  const rawBody = post.description || post.title || "";
                  const isLongText = rawBody.length > 180;
                  const isExpanded = Boolean(expandedPostIds[post.id]);
                  const displayedBody =
                    isLongText && !isExpanded
                      ? `${rawBody.slice(0, 170).trimEnd()}... `
                      : rawBody;

                  const activeReactionMeta = REACTION_ITEMS.find(
                    (r) => r.type === myReaction
                  );

                  const isSuggestedPost = Boolean(
                    !scamOnlyMode &&
                      post.reporterId &&
                      post.reporterId !== currentUser?.uid &&
                      post.reporterId !== "member_local" &&
                      !followedIds.includes(post.reporterId)
                  );

                  return (
                    <React.Fragment key={post.id}>
                      <PostImpressionTracker postId={post.id}>
                        <article
                          onClick={() => {
                            recordPostClick(post);
                            navigate(`/news-hub/post/${post.id}`);
                          }}
                          className="bg-white dark:bg-zinc-900 rounded-[28px] p-4 shadow-[0_8px_28px_rgba(15,23,42,0.05)] space-y-3.5 transition hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)] cursor-pointer"
                        >
                          {/* Subtle Suggested Post Header Kicker */}
                          {isSuggestedPost && (
                            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800/80 text-xs text-zinc-500 dark:text-zinc-400">
                              <div className="flex items-center gap-1.5 min-w-0 truncate">
                                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                  Suggested for you
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="truncate">
                                  Popular in community
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleDismissSuggestedPost(e, post.id)
                                }
                                className="w-6 h-6 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 shrink-0 cursor-pointer"
                                aria-label="Hide suggested post"
                                title="Hide suggestion"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Post Card Header */}
                          <div className="flex items-center justify-between gap-3">
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerHaptic();
                                recordPostClick(post);
                                navigate(`/author/${post.reporterId}`);
                              }}
                              className="flex items-center gap-3 min-w-0 cursor-pointer"
                            >
                              <div className="w-11 h-11 rounded-full p-[2px] border border-dashed border-slate-300 dark:border-zinc-700 shrink-0">
                                <img
                                  src={post.reporterAvatar || defaultAvatarImg}
                                  alt={post.reporterName}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full rounded-full object-cover"
                                />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h2 className="text-[15.5px] font-bold text-zinc-900 dark:text-white truncate">
                                    {post.reporterName}
                                  </h2>
                                  {post.postTag && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        triggerHaptic();
                                        navigate(
                                          `/news-hub/search?q=${encodeURIComponent(
                                            post.postTag || ""
                                          )}`
                                        );
                                      }}
                                      className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-[#1877F2] dark:text-[#58A6FF] hover:underline cursor-pointer shrink-0"
                                    >
                                      <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                                      <span>{post.postTag}</span>
                                    </button>
                                  )}
                                  {isScam && (
                                    <span className="text-rose-600 dark:text-rose-400 text-[11px] font-bold shrink-0">
                                      · Scam Report
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 text-[11.5px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap overflow-hidden">
                                  <span className="truncate">
                                    {formatFeedTimestamp(post.createdAt)}
                                  </span>
                                  {(() => {
                                    const primaryTheme = getFeedThemeMeta(
                                      post.themes?.[0] || post.category
                                    );
                                    return primaryTheme ? (
                                      <>
                                        <span className="shrink-0">·</span>
                                        <span className="truncate font-medium text-zinc-600 dark:text-zinc-300">
                                          {primaryTheme.label}
                                        </span>
                                      </>
                                    ) : null;
                                  })()}
                                  {post.isEdited && (
                                    <>
                                      <span className="shrink-0">·</span>
                                      <span className="shrink-0">Edited</span>
                                    </>
                                  )}
                                  <span className="shrink-0">·</span>
                                  <Globe className="w-3 h-3 stroke-[2] shrink-0" />
                                </div>

                                {(post.isAiGenerated ||
                                  post.locationTag ||
                                  post.isGhostPost ||
                                  Boolean(
                                    post.scheduledAt &&
                                      post.scheduledAt > Date.now()
                                  )) && (
                                  <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[11px] font-medium text-zinc-500 dark:text-zinc-400 leading-tight">
                                    {post.isAiGenerated && (
                                      <span className="inline-flex items-center gap-1">
                                        <Sparkles className="w-3 h-3 text-[#1877F2] shrink-0" />
                                        <span>AI generated</span>
                                      </span>
                                    )}
                                    {post.locationTag && (
                                      <span className="inline-flex items-center gap-0.5 text-zinc-600 dark:text-zinc-300">
                                        <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                                        <span className="truncate max-w-[140px]">
                                          {post.locationTag}
                                        </span>
                                      </span>
                                    )}
                                    {post.isGhostPost && (
                                      <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400">
                                        <DottedGhostCatIcon className="w-3 h-3 shrink-0" />
                                        <span>Ghost · 24h</span>
                                      </span>
                                    )}
                                    {post.scheduledAt &&
                                      post.scheduledAt > Date.now() && (
                                        <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                                          <Clock className="w-3 h-3 shrink-0" />
                                          <span>Scheduled</span>
                                        </span>
                                      )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="relative shrink-0 flex items-center gap-1.5"
                            >
                              {post.reporterId &&
                                post.reporterId !== "member_local" &&
                                currentUser?.uid !== post.reporterId && (
                                  <button
                                    type="button"
                                    onClick={(e) =>
                                      handleFollowFromCard(e, post)
                                    }
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0 ${
                                      followedIds.includes(post.reporterId)
                                        ? "bg-[#F4F5F7] dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
                                        : "bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] dark:text-[#58A6FF]"
                                    }`}
                                  >
                                    {followedIds.includes(post.reporterId) ? (
                                      <>
                                        <UserCheck className="w-3.5 h-3.5 shrink-0" />
                                        <span>Following</span>
                                      </>
                                    ) : (
                                      <>
                                        <UserPlus className="w-3.5 h-3.5 shrink-0" />
                                        <span>Follow</span>
                                      </>
                                    )}
                                  </button>
                                )}

                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic();
                                  setOpenMenuPostId((prev) =>
                                    prev === post.id ? null : post.id
                                  );
                                }}
                                className="w-10 h-10 rounded-full bg-[#F6F7F9] dark:bg-zinc-800 hover:bg-[#ECEEF2] dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0 cursor-pointer"
                                aria-label="Post options"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {openMenuPostId === post.id && (
                                <div className="absolute right-0 top-11 z-30 w-44 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-[0_12px_32px_rgba(15,23,42,0.14)] p-1.5 space-y-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuPostId(null);
                                      recordPostClick(post);
                                      navigate(`/news-hub/post/${post.id}`);
                                    }}
                                    className="w-full px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2 text-left cursor-pointer"
                                  >
                                    <EyeIcon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                    <span>View Post</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuPostId(null);
                                      handleToggleSave(post);
                                    }}
                                    className="w-full px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2 text-left cursor-pointer"
                                  >
                                    <Bookmark className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                    <span>
                                      {saved ? "Remove Saved" : "Save Post"}
                                    </span>
                                  </button>

                                  {(isAdmin ||
                                    Boolean(
                                      currentUser?.uid &&
                                        currentUser.uid === post.reporterId
                                    )) && (
                                    <>
                                      <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuPostId(null);
                                          navigate(`/news-hub/edit/${post.id}`);
                                        }}
                                        className="w-full px-3 py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-semibold text-[#1877F2] flex items-center gap-2 text-left cursor-pointer"
                                      >
                                        <Edit3 className="w-3.5 h-3.5 shrink-0" />
                                        <span>Edit Post</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleDeletePost(post)}
                                        className="w-full px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold text-rose-600 flex items-center gap-2 text-left cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                        <span>Delete Post</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Caption / Body Text with Clickable Blue #Hashtags & Stylish Inline Links */}
                          {rawBody && (
                            <div
                              className={
                                post.textStyle === "quote"
                                  ? "rounded-[22px] bg-[#F6F8FB] dark:bg-zinc-800/70 p-4 border border-slate-200/70 dark:border-zinc-700/60"
                                  : ""
                              }
                            >
                              <p
                                className={`whitespace-pre-line break-words ${
                                  post.textStyle === "large"
                                    ? "text-[19px] font-bold leading-snug text-zinc-900 dark:text-white"
                                    : post.textStyle === "quote"
                                    ? "text-[15.5px] italic font-medium leading-relaxed text-zinc-800 dark:text-zinc-100"
                                    : "text-[14.5px] leading-[1.5] text-zinc-700 dark:text-zinc-200"
                                }`}
                              >
                                <NewsRichText text={displayedBody} />
                                {isLongText && !isExpanded && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      recordPostClick(post);
                                      setExpandedPostIds((prev) => ({
                                        ...prev,
                                        [post.id]: true,
                                      }));
                                    }}
                                    className="font-bold text-zinc-900 dark:text-white hover:underline cursor-pointer"
                                  >
                                    See More...
                                  </button>
                                )}
                              </p>
                            </div>
                          )}

                          {/* Auto Stylish Link Preview Cards when post contains URLs */}
                          <NewsLinkPreviewCards text={rawBody} />

                          {isScam &&
                            (post.scamLocation ||
                              post.scammerName ||
                              post.scammerPhone) && (
                              <div className="rounded-full bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50 px-3 py-1.5 flex items-center justify-between gap-2 text-[11px] w-full overflow-hidden whitespace-nowrap">
                                <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                                  <Icon
                                    name="shield-alert"
                                    className="w-3.5 h-3.5 text-rose-600 shrink-0"
                                  />
                                  <span className="font-bold text-rose-700 dark:text-rose-300 shrink-0">
                                    Verified Scam Report
                                  </span>
                                  <span className="text-rose-300 dark:text-rose-700 shrink-0">
                                    ·
                                  </span>
                                  <span className="truncate font-semibold text-rose-600 dark:text-rose-400 min-w-0">
                                    {post.scamLocation || "Online Marketplace"}
                                  </span>
                                </div>
                                {post.scammedAmount ? (
                                  <span className="font-bold text-rose-700 dark:text-rose-300 tabular-nums shrink-0 ml-1">
                                    ৳{post.scammedAmount.toLocaleString()}
                                  </span>
                                ) : null}
                              </div>
                            )}

                          {/* Post Media */}
                          <NewsPostMedia
                            post={post}
                            onOpenImage={(imgIdx) => {
                              recordPostClick(post);
                              navigate(`/news-hub/photo/${post.id}/${imgIdx}`);
                            }}
                          />

                          {/* Inline Reaction Bar */}
                          {openReactionPostId === post.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center justify-between gap-1 px-3 py-2 rounded-full bg-[#F5F6F8] dark:bg-zinc-800 border border-slate-200/70 dark:border-zinc-700"
                            >
                              {REACTION_ITEMS.map((item) => (
                                <button
                                  key={item.type}
                                  type="button"
                                  onClick={() =>
                                    handleReaction(post, item.type)
                                  }
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm transition hover:scale-110 cursor-pointer ${
                                    myReaction === item.type
                                      ? "bg-white dark:bg-zinc-900 shadow-2xs font-bold"
                                      : ""
                                  }`}
                                  title={item.label}
                                >
                                  <span className="text-lg">{item.emoji}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Bottom Engagement Row */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center justify-between gap-1 sm:gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800/80"
                          >
                            {/* 1. Love / Reaction */}
                            <button
                              type="button"
                              onClick={() => {
                                if (openReactionPostId === post.id) {
                                  setOpenReactionPostId(null);
                                } else if (!myReaction) {
                                  handleReaction(post, "love");
                                } else {
                                  setOpenReactionPostId(post.id);
                                }
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setOpenReactionPostId((prev) =>
                                  prev === post.id ? null : post.id
                                );
                              }}
                              className={`h-8 sm:h-9 px-2 sm:px-3 rounded-full flex items-center gap-1 text-xs font-semibold tabular-nums transition active:scale-95 cursor-pointer shrink-0 ${
                                myReaction
                                  ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                                  : "bg-[#F5F6F8] dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-[#EBEEF2]"
                              }`}
                            >
                              {activeReactionMeta && myReaction !== "love" ? (
                                <span className="text-xs sm:text-sm leading-none">
                                  {activeReactionMeta.emoji}
                                </span>
                              ) : (
                                <Heart
                                  className={`w-3.5 h-3.5 ${
                                    myReaction
                                      ? "fill-current text-rose-500"
                                      : "stroke-[2]"
                                  }`}
                                />
                              )}
                              <span>
                                {isScam
                                  ? `Confirm (${formatCompactCount(totalReactions)})`
                                  : formatCompactCount(totalReactions)}
                              </span>
                            </button>

                            {/* 2. Comment */}
                            <button
                              type="button"
                              onClick={() => {
                                recordPostClick(post);
                                navigate(
                                  `/news-hub/post/${post.id}#comments`
                                );
                              }}
                              className="h-8 sm:h-9 px-2 sm:px-3 rounded-full bg-[#F5F6F8] dark:bg-zinc-800 hover:bg-[#EBEEF2] flex items-center gap-1 text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-100 transition active:scale-95 cursor-pointer shrink-0"
                            >
                              <MessageCircle className="w-3.5 h-3.5 stroke-[2]" />
                              <span>
                                {formatCompactCount(post.commentsCount || 0)}
                              </span>
                            </button>

                            {/* 3. Share */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                recordPostClick(post);
                                triggerHaptic();
                                setShareModalPost(post);
                              }}
                              className="h-8 sm:h-9 px-2 sm:px-3 rounded-full bg-[#F5F6F8] dark:bg-zinc-800 hover:bg-[#EBEEF2] flex items-center gap-1 text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-100 transition active:scale-95 cursor-pointer shrink-0"
                            >
                              <Send className="w-3.5 h-3.5 stroke-[2]" />
                              <span>
                                {formatCompactCount(post.sharesCount || 0)}
                              </span>
                            </button>

                            {/* 4. Repost */}
                            <button
                              type="button"
                              onClick={async () => {
                                if (!currentUser) {
                                  notify("Please sign in to repost!", "error");
                                  navigate("/signin");
                                  return;
                                }
                                if (post.reporterId === currentUser.uid) {
                                  notify("You cannot repost your own post!", "info");
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
                                try {
                                  await updateDoc(doc(db, "scam_posts", post.id), {
                                    repostedByUserIds: updated,
                                    repostsCount: nextCount,
                                  });
                                  if (!isR && post.reporterId && post.reporterId !== currentUser.uid) {
                                    const actorIsAdmin =
                                      hasImmediateAdminOrStaffRole(userProfile, currentUser) || isStaffDoc;
                                    if (actorIsAdmin) {
                                      setDoc(
                                        doc(db, "news_hub_notifications", `milestone_reposts_${post.id}`),
                                        {
                                          userId: post.reporterId,
                                          fromUserId: "system_milestone",
                                          fromUserName: "News Hub",
                                          fromUserUsername: "",
                                          fromUserAvatar: "",
                                          type: "milestone",
                                          milestoneKind: "reposts",
                                          totalCount: nextCount,
                                          title: "Congratulations! 🎉",
                                          body: `Congratulations! Your post now has ${nextCount.toLocaleString()} total reposts.`,
                                          mediaThumbnail: post.images?.[0] || "",
                                          targetId: post.id,
                                          isRead: false,
                                          read: false,
                                          createdAt: Date.now(),
                                          link: `/news-hub/post/${post.id}`,
                                        },
                                        { merge: true }
                                      ).catch(() => {});
                                    } else {
                                      addDoc(collection(db, "news_hub_notifications"), {
                                        userId: post.reporterId,
                                        fromUserId: currentUser.uid,
                                        fromUserName: getSafeDisplayName(userProfile || currentUser, "Someone"),
                                        fromUserUsername: getSafePublicUsername(userProfile || currentUser),
                                        fromUserAvatar: userProfile?.photoURL || currentUser.photoURL || "",
                                        type: "repost",
                                        title: "New Repost",
                                        body: `reposted your post: "${(post.description || post.title || "").slice(0, 30)}..."`,
                                        mediaThumbnail: post.images?.[0] || "",
                                        targetId: post.id,
                                        isRead: false,
                                        read: false,
                                        createdAt: Date.now(),
                                        link: `/news-hub/post/${post.id}`,
                                      }).catch(() => {});
                                    }
                                  }
                                  notify(isR ? "Repost removed" : "Post reposted to your feed!", "success");
                                } catch {}
                              }}
                              className={`h-8 sm:h-9 px-1.5 sm:px-2.5 rounded-full flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-semibold tabular-nums transition active:scale-95 cursor-pointer shrink-0 ${
                                post.repostedByUserIds?.includes(currentUser?.uid)
                                  ? "bg-blue-50 dark:bg-blue-950/40 text-[#1877F2]"
                                  : "bg-[#F5F6F8] dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-[#EBEEF2]"
                              }`}
                              title="Repost"
                            >
                              <RepeatIcon className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                              <span>{formatCompactCount(post.repostsCount || 0)}</span>
                            </button>

                            {/* Author-Only Views Count */}
                            {Boolean(
                              currentUser?.uid &&
                                (post.reporterId === currentUser.uid ||
                                  (post as any).authorId === currentUser.uid)
                            ) && (
                              <span
                                className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-full bg-[#F5F6F8] dark:bg-zinc-800 flex items-center gap-1 text-[10px] sm:text-xs font-semibold tabular-nums text-zinc-600 dark:text-zinc-300 shrink-0"
                                title="Views (only visible to you)"
                              >
                                <EyeIcon className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                                <span>{formatCompactCount(post.views || 0)}</span>
                              </span>
                            )}

                            {/* 5. Save Bookmark */}
                            <button
                              type="button"
                              onClick={() => handleToggleSave(post)}
                              className={`w-8 sm:w-9 h-8 sm:h-9 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer shrink-0 ${
                                saved
                                  ? "bg-[#1877F2]/12 text-[#1877F2]"
                                  : "bg-[#F5F6F8] dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-[#EBEEF2]"
                              }`}
                              aria-label={saved ? "Unsave post" : "Save post"}
                              title={saved ? "Saved" : "Save post"}
                            >
                              <Bookmark
                                className={`w-3 sm:w-3.5 h-3 sm:h-3.5 ${
                                  saved ? "fill-current" : "stroke-[2]"
                                }`}
                              />
                            </button>
                          </div>
                        </article>
                      </PostImpressionTracker>

                      {/* Injected Suggested Profiles Carousel after 2nd post */}
                      {postIndex === 1 && suggestedProfiles.length > 0 && (
                        <section className="bg-white dark:bg-zinc-900 rounded-[28px] p-4 shadow-[0_8px_28px_rgba(15,23,42,0.05)] space-y-3">
                          <div className="flex items-center justify-between px-0.5">
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                              Suggested profiles
                            </h3>
                            <button
                              type="button"
                              onClick={() => navigate("/news-hub/search")}
                              className="text-xs font-semibold text-[#1877F2] hover:underline cursor-pointer whitespace-nowrap"
                            >
                              See all
                            </button>
                          </div>
                          <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar pb-1">
                            {suggestedProfiles.map((prof) => (
                              <div
                                key={prof.uid}
                                onClick={() => navigate(`/author/${prof.uid}`)}
                                className="relative w-36 shrink-0 rounded-2xl bg-[#F5F6F8] dark:bg-zinc-800/80 border border-slate-200/70 dark:border-zinc-700/60 p-3 flex flex-col items-center text-center justify-between gap-2 cursor-pointer"
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
                                    className="w-14 h-14 rounded-full object-cover border border-white dark:border-zinc-700"
                                  />
                                  <p className="text-xs font-bold text-zinc-900 dark:text-white truncate w-full">
                                    {prof.name}
                                  </p>
                                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate w-full tabular-nums">
                                    {formatCompactCount(prof.followersCount)}{" "}
                                    followers
                                    {prof.postsCount > 0
                                      ? ` · ${prof.postsCount} posts`
                                      : ""}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleFollowSuggestedProfile(e, prof)
                                  }
                                  className="w-full py-1.5 rounded-lg bg-[#1877F2] hover:bg-[#1465D8] text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                                >
                                  Follow
                                </button>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* Injected Suggested Posts Discovery Shelf after 5th post */}
                      {postIndex === 4 && suggestedDiscoveryPosts.length >= 2 && (
                        <section className="bg-white dark:bg-zinc-900 rounded-[28px] p-4 shadow-[0_8px_28px_rgba(15,23,42,0.05)] space-y-3">
                          <div className="flex items-center justify-between px-0.5">
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                              Suggested posts
                            </h3>
                            <button
                              type="button"
                              onClick={() => navigate("/news-hub/search")}
                              className="text-xs font-semibold text-[#1877F2] hover:underline cursor-pointer whitespace-nowrap"
                            >
                              Explore more
                            </button>
                          </div>
                          <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar pb-1">
                            {suggestedDiscoveryPosts.slice(0, 5).map((sp) => (
                              <div
                                key={`sug_${sp.id}`}
                                onClick={() => {
                                  recordPostClick(sp);
                                  navigate(`/news-hub/post/${sp.id}`);
                                }}
                                className="w-56 shrink-0 rounded-2xl bg-[#F5F6F8] dark:bg-zinc-800/80 border border-slate-200/70 dark:border-zinc-700/60 overflow-hidden flex flex-col justify-between cursor-pointer hover:border-[#1877F2]/40 transition"
                              >
                                {sp.images?.[0] ? (
                                  <div className="h-28 w-full bg-zinc-200 dark:bg-zinc-900 overflow-hidden">
                                    <img
                                      src={sp.images[0]}
                                      alt={sp.title || sp.reporterName}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="h-28 w-full p-3 bg-gradient-to-br from-[#1877F2]/10 to-sky-500/10 flex items-center">
                                    <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 line-clamp-3">
                                      {sp.description || sp.title || "Community post"}
                                    </p>
                                  </div>
                                )}
                                <div className="p-3 space-y-1.5">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <img
                                      src={sp.reporterAvatar || defaultAvatarImg}
                                      alt={sp.reporterName}
                                      referrerPolicy="no-referrer"
                                      className="w-5 h-5 rounded-full object-cover shrink-0"
                                    />
                                    <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                      {sp.reporterName}
                                    </span>
                                  </div>
                                  {sp.images?.[0] && (
                                    <p className="text-[11px] text-zinc-600 dark:text-zinc-300 line-clamp-2">
                                      {sp.description || sp.title || "Tap to view post"}
                                    </p>
                                  )}
                                  <p className="text-[10.5px] text-zinc-400 tabular-nums">
                                    {formatCompactCount(getTotalPostReactions(sp))}{" "}
                                    reactions
                                    {Number(sp.commentsCount || 0) > 0
                                      ? ` · ${formatCompactCount(
                                          Number(sp.commentsCount || 0)
                                        )} comments`
                                      : ""}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop Right Studio & Personalization Rail */}
          <aside className="hidden lg:flex lg:col-span-3 flex-col gap-4 sticky top-6">
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
              <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-[28px] p-5 shadow-[0_6px_24px_rgba(15,23,42,0.05)] space-y-3 border border-white/80 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">Suggested Profiles</h3>
                  <button
                    type="button"
                    onClick={() => navigate("/news-hub/search")}
                    className="text-xs font-semibold text-[#1877F2] hover:underline cursor-pointer"
                  >
                    See all
                  </button>
                </div>
                <div className="space-y-2.5">
                  {suggestedProfiles.slice(0, 4).map((prof) => (
                    <div
                      key={`rail_${prof.uid}`}
                      onClick={() => navigate(`/author/${prof.uid}`)}
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
                          <p className="text-xs font-bold text-zinc-900 dark:text-white truncate group-hover:text-[#1877F2] transition-colors">
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
                        className="px-3 py-1 rounded-full bg-[#1877F2]/10 hover:bg-[#1877F2] text-[#1877F2] hover:text-white text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        Follow
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-[28px] p-5 shadow-[0_6px_24px_rgba(15,23,42,0.05)] space-y-3 border border-white/80 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">Active Themes</h3>
                <button
                  type="button"
                  onClick={() => navigate("/news-hub/personalization")}
                  className="text-xs font-semibold text-[#1877F2] hover:underline cursor-pointer"
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
                      <span>{theme.emoji}</span>
                      <span>{theme.label}</span>
                    </span>
                  ))}
              </div>
            </div>

            <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-[28px] p-5 shadow-[0_6px_24px_rgba(15,23,42,0.05)] space-y-2.5 border border-white/80 dark:border-zinc-800">
              <h3 className="text-sm font-bold">Community Safety</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Need to warn shoppers about a fraudulent page or number? Switch
                to Scam Report inside the post composer to stamp verified
                incident location details.
              </p>
              <button
                type="button"
                onClick={() => navigate("/news-hub/create?tab=scam")}
                className="w-full py-2.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Report a Scam</span>
              </button>
            </div>
          </aside>
        </div>
      </div>

      <NewsBottomDock />

      {/* Share and Activity Modals */}
      <LiquidGlassShareModal
        isOpen={Boolean(shareModalPost)}
        post={shareModalPost || {}}
        onClose={() => setShareModalPost(null)}
        onRepost={() => {
          notify("Reposted to News Hub!", "success");
        }}
        onQuotePost={() => {
          if (shareModalPost?.id) {
            navigate(`/news-hub/create?quotePostId=${shareModalPost.id}`);
          }
        }}
      />

      <LiquidGlassActivityModal
        isOpen={Boolean(activityModalPost)}
        post={activityModalPost || {}}
        onClose={() => setActivityModalPost(null)}
      />
    </div>
  );
};

export default NewsHub;
