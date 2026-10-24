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
  MapPin,
  LayoutDashboard,
  TrendingUp,
  Search,
  Edit3,
  Trash2,
  Eye,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { ScamPost, ReactionType } from "../types";
import { NewsPostMedia, isScamPostRecord } from "../components/NewsPostMedia";
import {
  NewsRichText,
  NewsLinkPreviewCards,
} from "../components/NewsRichText";
import { NewsBottomDock } from "../components/NewsBottomDock";
import {
  loadFeedPreferences,
  FeedPreferencesData,
  DEFAULT_FEED_PREFERENCES,
  FEED_THEMES,
  getFeedThemeMeta,
} from "./FeedPersonalization";
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
import { toggleFollowUser, useFollowedIds } from "../lib/follow";

import defaultAvatarImg from "../src/assets/images/story_avatar_creator_1_1792826814910.jpg";

const REACTION_ITEMS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "love", emoji: "❤️", label: "Love" },
  { type: "like", emoji: "👍", label: "Like" },
  { type: "haha", emoji: "😆", label: "Haha" },
  { type: "wow", emoji: "😮", label: "Wow" },
  { type: "sad", emoji: "😢", label: "Sad" },
  { type: "angry", emoji: "😡", label: "Angry" },
];

const formatCompactCount = (n: number): string => {
  if (!n || n <= 0) return "0";
  if (n >= 1000) {
    const val = (n / 1000).toFixed(1);
    return `${val.endsWith(".0") ? val.slice(0, -2) : val}K`;
  }
  return String(n);
};

const formatFeedTimestamp = (ts: number): string => {
  return formatDhakaFeedTime(ts);
};

export const NewsHub: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotify();
  const confirm = useConfirm();

  const [currentUser, setCurrentUser] = useState<any>(() => auth.currentUser);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isStaffDoc, setIsStaffDoc] = useState(false);
  const [firestorePosts, setFirestorePosts] = useState<ScamPost[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const followedIds = useFollowedIds(currentUser?.uid);

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
        name: String(rawLabel).split(" ")[0],
        avatar:
          data.userAvatar ||
          data.sellerLogo ||
          data.sellerAvatar ||
          data.mediaUrl ||
          defaultAvatarImg,
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
      const sorted = Array.from(mergedMap.values()).sort(
        (a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)
      );
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

  // Apply Feed Personalization & Scam Shield Toggle
  const visiblePosts = React.useMemo(() => {
    const cp = prefs.contentPreferences;
    const allThemesSelected =
      prefs.selectedThemes.length >= FEED_THEMES.length ||
      prefs.selectedThemes.length === 0;

    return allPosts.filter((post) => {
      const isScam = isScamPostRecord(post);

      if (scamOnlyMode) {
        return isScam;
      }

      if (isScam && !cp.scamAlerts) {
        return false;
      }

      if (!isScam) {
        const hasAudio = Boolean(post.audioUrl);
        const hasVideo = Boolean(post.videoUrl);
        const hasImages = Boolean(post.images && post.images.length > 0);
        const isAffirmation =
          post.contentType === "affirmation" || post.textStyle === "quote";

        if (hasAudio && !cp.voiceNotes) return false;
        if (hasVideo && !cp.videos) return false;
        if (hasImages && !cp.images) return false;
        if (isAffirmation && !cp.affirmations) return false;
        if (!hasAudio && !hasVideo && !hasImages && !isAffirmation && !cp.texts)
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
  }, [allPosts, prefs, scamOnlyMode]);

  const handleReaction = async (post: ScamPost, chosenType: ReactionType) => {
    triggerHaptic();
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

    setFirestorePosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              reactions: updatedReactionsMap,
              reactionsCount: baseCounts,
            }
          : p
      )
    );

    try {
      await updateDoc(doc(db, "scam_posts", post.id), {
        reactions: updatedReactionsMap,
        reactionsCount: baseCounts,
      });
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
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#1464D6] to-[#4DA3FF] flex items-center justify-center text-white shadow-sm shrink-0">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                  >
                    <path d="M3 14c3.5-4 6.5-4 10 0s6.5 4 8-1" />
                  </svg>
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
                  className="w-9 h-9 rounded-full bg-gradient-to-b from-[#2A85FF] to-[#1360DA] flex items-center justify-center shadow-[0_4px_12px_rgba(19,96,218,0.35)] relative overflow-hidden cursor-pointer shrink-0"
                  aria-label="Feed Home"
                >
                  <svg
                    viewBox="0 0 32 32"
                    className="w-8 h-8 text-white"
                    fill="none"
                  >
                    <path
                      d="M2 19C8 19 10 11 17 11C23 11 25 7 30 7"
                      stroke="currentColor"
                      strokeWidth="3.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M2 24C9 24 12 16 19 16C25 16 27 13 30 13"
                      stroke="white"
                      strokeOpacity="0.55"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                <h1 className="text-[22px] sm:text-[24px] font-bold tracking-tight text-zinc-900 dark:text-white whitespace-nowrap truncate">
                  {scamOnlyMode ? "Scam Alerts" : "Feed"}
                </h1>
              </div>

              {/* Right Circular Buttons: Creator Dashboard + Unfilled Outline Shield + Unfilled Outline Palette */}
              <div className="flex items-center gap-2 shrink-0">
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
                  <LayoutDashboard fill="none" className="w-5 h-5 stroke-[1.9]" />
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
                    <ShieldAlert fill="none" className="w-5 h-5 stroke-[1.9]" />
                  ) : (
                    <Shield fill="none" className="w-5 h-5 stroke-[1.9]" />
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
                  <Palette fill="none" className="w-5 h-5 stroke-[1.9]" />
                  {isPersonalizedActive && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#1877F2]" />
                  )}
                </button>
              </div>
            </header>

            {/* 2. Horizontal Circular Stories Row (Everyone can add a story in News Hub + Real Community Stories) */}
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
                  navigate("/add-story?from=news-hub");
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
                  <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-zinc-900 dark:bg-[#1877F2] text-white border-2 border-white dark:border-zinc-900 flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5 stroke-[2.8]" />
                  </span>
                </div>
                <span className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100">
                  Your Story
                </span>
              </button>

              {/* Real Community Stories from Firestore */}
              {stories.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    navigate(`/news-hub/story/${st.id}`);
                  }}
                  className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
                >
                  <div className="w-[68px] h-[68px] rounded-full p-[2.5px] bg-gradient-to-tr from-[#1877F2] to-[#38BDF8] shadow-[0_4px_12px_rgba(15,23,42,0.08)]">
                    <img
                      src={st.avatar}
                      alt={st.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full rounded-full object-cover border-2 border-white dark:border-zinc-900 group-hover:scale-[1.03] transition-transform"
                    />
                  </div>
                  <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300 max-w-[68px] truncate">
                    {st.name}
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
              <div className="space-y-4">
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className="bg-white dark:bg-zinc-900 rounded-[28px] p-5 space-y-4 animate-pulse"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-zinc-800" />
                      <div className="space-y-2 flex-1">
                        <div className="w-32 h-3.5 rounded-full bg-slate-200 dark:bg-zinc-800" />
                        <div className="w-24 h-2.5 rounded-full bg-slate-100 dark:bg-zinc-800" />
                      </div>
                    </div>
                    <div className="w-full h-56 rounded-[22px] bg-slate-200 dark:bg-zinc-800" />
                  </div>
                ))}
              </div>
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
                {visiblePosts.map((post) => {
                  const isScam = isScamPostRecord(post);
                  const uid = currentUser?.uid || "guest_local";
                  const myReaction =
                    post.reactions?.[uid] ||
                    localUserReactions[post.id] ||
                    null;

                  const totalReactions = post.reactionsCount
                    ? (Object.values(post.reactionsCount) as number[]).reduce(
                        (sum, val) => sum + (val || 0),
                        0
                      )
                    : post.votes || 0;

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

                  return (
                    <article
                      key={post.id}
                      onClick={() => navigate(`/news-hub/post/${post.id}`)}
                      className="bg-white dark:bg-zinc-900 rounded-[28px] p-4 shadow-[0_8px_28px_rgba(15,23,42,0.05)] space-y-3.5 transition hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)] cursor-pointer"
                    >
                      {/* Post Card Header */}
                      <div className="flex items-center justify-between gap-3">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic();
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
                            <div className="flex items-center gap-2">
                              <h2 className="text-[15.5px] font-bold text-zinc-900 dark:text-white truncate">
                                {post.reporterName}
                              </h2>
                              {isScam && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-[10px] font-bold shrink-0">
                                  Scam Report
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 text-[11.5px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap overflow-hidden">
                              <span className="truncate">{formatFeedTimestamp(post.createdAt)}</span>
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
                                onClick={(e) => handleFollowFromCard(e, post)}
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
                                  navigate(`/news-hub/post/${post.id}`);
                                }}
                                className="w-full px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2 text-left cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
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
                                <span>{saved ? "Remove Saved" : "Save Post"}</span>
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
                              ? "rounded-[22px] bg-[#F6F8FB] dark:bg-zinc-800/70 p-4 border-l-4 border-[#1877F2]"
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

                      {/* Scam Incident Summary Pill — ONLY on Scam Posts */}
                      {isScam &&
                        (post.scamLocation ||
                          post.scammerName ||
                          post.scammerPhone) && (
                          <div className="rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                            <div className="min-w-0 space-y-0.5">
                              {post.scamLocation && (
                                <p className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1 truncate">
                                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                                  <span>Happened on: {post.scamLocation}</span>
                                </p>
                              )}
                              {(post.scammerName || post.scammerPhone) && (
                                <p className="text-zinc-600 dark:text-zinc-300 truncate">
                                  Reported:{" "}
                                  <span className="font-semibold">
                                    {post.scammerName || "Seller"}
                                  </span>
                                  {post.scammerPhone
                                    ? ` · ${post.scammerPhone}`
                                    : ""}
                                </p>
                              )}
                            </div>
                            {post.scammedAmount ? (
                              <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white font-bold tabular-nums shrink-0">
                                ৳{post.scammedAmount.toLocaleString()}
                              </span>
                            ) : null}
                          </div>
                        )}

                      {/* Post Media */}
                      <NewsPostMedia
                        post={post}
                        onOpenImage={(imgIdx) =>
                          navigate(`/news-hub/photo/${post.id}/${imgIdx}`)
                        }
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
                              onClick={() => handleReaction(post, item.type)}
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
                        className="flex items-center justify-between gap-2 pt-0.5"
                      >
                        <div className="flex items-center gap-2">
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
                            className={`h-9 px-3.5 rounded-full flex items-center gap-1.5 text-[13px] font-semibold tabular-nums transition active:scale-95 cursor-pointer ${
                              myReaction
                                ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                                : "bg-[#F5F6F8] dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-[#EBEEF2]"
                            }`}
                          >
                            {activeReactionMeta && myReaction !== "love" ? (
                              <span className="text-sm leading-none">
                                {activeReactionMeta.emoji}
                              </span>
                            ) : (
                              <Heart
                                className={`w-4 h-4 ${
                                  myReaction
                                    ? "fill-current text-rose-500"
                                    : "stroke-[2]"
                                }`}
                              />
                            )}
                            <span>{formatCompactCount(totalReactions)}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setOpenReactionPostId((prev) =>
                                prev === post.id ? null : post.id
                              )
                            }
                            className="w-8 h-9 rounded-full bg-[#F5F6F8] dark:bg-zinc-800 hover:bg-[#EBEEF2] flex items-center justify-center text-zinc-600 dark:text-zinc-300 text-xs cursor-pointer"
                            title="More reactions"
                            aria-label="Choose reaction"
                          >
                            <Smile className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/news-hub/post/${post.id}#comments`)
                            }
                            className="h-9 px-3.5 rounded-full bg-[#F5F6F8] dark:bg-zinc-800 hover:bg-[#EBEEF2] flex items-center gap-1.5 text-[13px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-100 transition active:scale-95 cursor-pointer"
                          >
                            <MessageCircle className="w-4 h-4 stroke-[2]" />
                            <span>
                              {formatCompactCount(post.commentsCount || 0)}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/news-hub/share/${post.id}`)
                            }
                            className="h-9 px-3.5 rounded-full bg-[#F5F6F8] dark:bg-zinc-800 hover:bg-[#EBEEF2] flex items-center gap-1.5 text-[13px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-100 transition active:scale-95 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5 stroke-[2]" />
                            <span>
                              {formatCompactCount(post.sharesCount || 0)}
                            </span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleSave(post)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer ${
                            saved
                              ? "bg-[#1877F2]/12 text-[#1877F2]"
                              : "bg-[#F5F6F8] dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-[#EBEEF2]"
                          }`}
                          aria-label={saved ? "Unsave post" : "Save post"}
                          title={saved ? "Saved" : "Save post"}
                        >
                          <Bookmark
                            className={`w-4 h-4 ${
                              saved ? "fill-current" : "stroke-[2]"
                            }`}
                          />
                        </button>
                      </div>
                    </article>
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
    </div>
  );
};

export default NewsHub;
