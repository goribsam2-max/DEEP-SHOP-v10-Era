import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Heart,
  MessageCircle,
  User,
  UserPlus,
  Share2,
  Loader2,
  Search,
  Calendar,
  MapPin,
  PartyPopper,
} from "lucide-react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { ScamComment, ScamPost } from "../types";
import SEO from "../components/SEO";
import { NewsBottomDock } from "../components/NewsBottomDock";
import {
  getEffectiveFollowersCount,
  toggleFollowUser,
  useFollowedIds,
} from "../lib/follow";
import {
  formatLoopCompactTime,
  LoopRepeatIcon,
  VerifiedLoopBadge,
} from "../components/LoopPostCard";
import { getSafeDisplayName, getSafePublicUsername } from "../lib/utils";
import { triggerHaptic } from "../lib/haptics";

type ActivityKind = "like" | "reply" | "repost" | "follow" | "birthday" | "memory" | "location";
type ActivityFilter = "all" | "insights";

interface EnrichedUserDoc {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string;
  isVerified: boolean;
  followersCount: number;
  followerMiniAvatars: string[];
}

interface ActivityEntry {
  id: string;
  actorUid?: string;
  actorFallbackName?: string;
  actorFallbackAvatar?: string;
  kind: ActivityKind;
  timestamp: number;
  text: string;
  timeAgoText?: string;
  snippet?: string;
  postId?: string;
  postSnippet?: string;
  isNew?: boolean;
  gridImages?: string[];
}

// Built-in high fidelity fallback cards if no real notifications exist
const SAMPLE_NOTIFICATIONS: ActivityEntry[] = [
  {
    id: "demo_comment_1",
    actorFallbackName: "Jenny wilson",
    actorFallbackAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
    kind: "reply",
    timestamp: Date.now() - 2 * 3600 * 1000,
    timeAgoText: "2 hours ago",
    text: "Jenny wilson commented on your photo.",
    isNew: true,
  },
  {
    id: "demo_reaction_5",
    actorFallbackName: "Nuray Aksoy",
    actorFallbackAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80",
    kind: "like",
    timestamp: Date.now() - 7200 * 1000,
    timeAgoText: "2 h",
    text: "Nuray Aksoy reacted on your photo.",
    isNew: false,
  },
];

export const LoopActivityPage: React.FC = () => {
  const { id: postId } = useParams<{ id?: string }>();
  const isPostActivity = Boolean(postId);
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(() => auth.currentUser);
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setCurrentUser(u));
    return () => unsub();
  }, []);

  const followedIds = useFollowedIds(currentUser?.uid);
  const [followBusyMap, setFollowBusyMap] = useState<Record<string, boolean>>({});
  const [optimisticFollowMap, setOptimisticFollowMap] = useState<
    Record<string, boolean>
  >({});

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>("all");

  // Post Activity state
  const [post, setPost] = useState<ScamPost | null>(null);
  const [postAuthorDoc, setPostAuthorDoc] = useState<Record<string, any> | null>(null);
  const [postComments, setPostComments] = useState<ScamComment[]>([]);
  const [loadingPost, setLoadingPost] = useState<boolean>(Boolean(postId));

  // My Activity state
  const [myPosts, setMyPosts] = useState<ScamPost[]>([]);
  const [myPostCommentsMap, setMyPostCommentsMap] = useState<
    Record<string, ScamComment[]>
  >({});
  const [myNotifDocs, setMyNotifDocs] = useState<Record<string, any>[]>([]);
  const [myFollowerUids, setMyFollowerUids] = useState<string[]>([]);
  const [loadingMyActivity, setLoadingMyActivity] = useState<boolean>(!postId);

  // User profiles cache
  const [userProfilesMap, setUserProfilesMap] = useState<
    Record<string, EnrichedUserDoc>
  >({});

  /* --------------------------------------------------------------------------
   * 1. POST ACTIVITY SUBSCRIPTION
   * ------------------------------------------------------------------------ */
  useEffect(() => {
    if (!postId) return;
    setLoadingPost(true);

    const unsubPost = onSnapshot(
      doc(db, "scam_posts", postId),
      async (snap) => {
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as ScamPost;
          setPost(data);
          if (data.reporterId) {
            try {
              const uSnap = await getDoc(doc(db, "users", data.reporterId));
              if (uSnap.exists()) setPostAuthorDoc(uSnap.data());
            } catch {}
          }
        } else {
          setPost(null);
        }
        setLoadingPost(false);
      },
      () => setLoadingPost(false)
    );

    const unsubComments = onSnapshot(
      query(
        collection(db, "scam_posts", postId, "comments"),
        orderBy("createdAt", "desc")
      ),
      (snap) => {
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as ScamComment)
        );
        setPostComments(list.filter((c) => c.status !== "pending_approval"));
      },
      () => {}
    );

    return () => {
      unsubPost();
      unsubComments();
    };
  }, [postId]);

  /* --------------------------------------------------------------------------
   * 2. MY ACTIVITY SUBSCRIPTION
   * ------------------------------------------------------------------------ */
  useEffect(() => {
    if (postId) return;
    const myUid = currentUser?.uid;
    if (!myUid) {
      setMyPosts([]);
      setMyNotifDocs([]);
      setMyFollowerUids([]);
      setLoadingMyActivity(false);
      return;
    }

    setLoadingMyActivity(true);

    const qOwnPosts = query(
      collection(db, "scam_posts"),
      where("reporterId", "==", myUid)
    );
    const unsubOwnPosts = onSnapshot(
      qOwnPosts,
      async (snap) => {
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as ScamPost)
        );
        setMyPosts(list);
        setLoadingMyActivity(false);

        const recentPosts = [...list]
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
          .slice(0, 20);
        const entries: Record<string, ScamComment[]> = {};
        await Promise.all(
          recentPosts.map(async (p) => {
            try {
              const cSnap = await getDocs(
                collection(db, "scam_posts", p.id, "comments")
              );
              entries[p.id] = cSnap.docs.map(
                (cd) => ({ id: cd.id, ...cd.data() } as ScamComment)
              );
            } catch {}
          })
        );
        setMyPostCommentsMap(entries);
      },
      () => setLoadingMyActivity(false)
    );

    const qNotifs = query(
      collection(db, "news_hub_notifications"),
      where("userId", "==", myUid)
    );
    const unsubNotifs = onSnapshot(
      qNotifs,
      (snap) => {
        const docs = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter(
            (n: any) =>
              n.type === "post_removed" ||
              n.type === "copyright_claim" ||
              n.type === "copyright_strike" ||
              (n.fromUserId &&
                n.fromUserId !== "system_setup" &&
                n.fromUserId !== "system_milestone" &&
                n.fromUserId !== myUid)
          );
        setMyNotifDocs(docs);
      },
      () => {}
    );

    const qFollowers = query(
      collection(db, "users"),
      where("following", "array-contains", myUid)
    );
    const unsubFollowers = onSnapshot(
      qFollowers,
      (snap) => {
        setMyFollowerUids(snap.docs.map((d) => d.id).filter((id) => id !== myUid));
      },
      () => {}
    );

    return () => {
      unsubOwnPosts();
      unsubNotifs();
      unsubFollowers();
    };
  }, [postId, currentUser?.uid]);

  /* --------------------------------------------------------------------------
   * 3. BUILD ACTIVITY STREAM
   * ------------------------------------------------------------------------ */
  const realEntries: ActivityEntry[] = useMemo(() => {
    if (isPostActivity) {
      if (!post) return [];
      const items: ActivityEntry[] = [];
      const seenLikes = new Set<string>();

      if (post.reactions) {
        Object.keys(post.reactions).forEach((uid) => {
          if (!uid || seenLikes.has(uid)) return;
          seenLikes.add(uid);
          const meta = post.reactionsUsers?.[uid];
          const name = meta?.userName || "Someone";
          items.push({
            id: `like_${post.id}_${uid}`,
            actorUid: uid,
            actorFallbackName: meta?.userName,
            actorFallbackAvatar: meta?.userAvatar,
            kind: "like",
            timestamp: meta?.timestamp || post.updatedAt || post.createdAt,
            text: `${name} reacted on your photo.`,
            postId: post.id,
            isNew: true,
          });
        });
      }

      postComments.forEach((cmt) => {
        if (!cmt.userId) return;
        items.push({
          id: `reply_${cmt.id}`,
          actorUid: cmt.userId,
          actorFallbackName: cmt.userName,
          actorFallbackAvatar: cmt.userAvatar,
          kind: "reply",
          timestamp: cmt.createdAt || post.createdAt,
          text: `${cmt.userName || "User"} commented: ${cmt.text}`,
          snippet: cmt.text,
          postId: post.id,
          isNew: true,
        });
      });

      return items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }

    // My Activity mode
    const myUid = currentUser?.uid;
    if (!myUid) return [];

    const map = new Map<string, ActivityEntry>();

    myPosts.forEach((p) => {
      if (p.reactions) {
        Object.keys(p.reactions).forEach((uid) => {
          if (!uid || uid === myUid) return;
          const meta = p.reactionsUsers?.[uid];
          const key = `like_${p.id}_${uid}`;
          const name = meta?.userName || "Someone";
          map.set(key, {
            id: key,
            actorUid: uid,
            actorFallbackName: meta?.userName,
            actorFallbackAvatar: meta?.userAvatar,
            kind: "like",
            timestamp: meta?.timestamp || p.updatedAt || p.createdAt,
            text: `${name} reacted on your photo.`,
            postId: p.id,
            isNew: (Date.now() - (meta?.timestamp || p.createdAt || 0)) < 86400000,
          });
        });
      }

      const cmts = myPostCommentsMap[p.id] || [];
      cmts.forEach((cmt) => {
        if (!cmt.userId || cmt.userId === myUid) return;
        const key = `reply_${cmt.id}`;
        map.set(key, {
          id: key,
          actorUid: cmt.userId,
          actorFallbackName: cmt.userName,
          actorFallbackAvatar: cmt.userAvatar,
          kind: "reply",
          timestamp: cmt.createdAt || p.createdAt,
          text: `${cmt.userName || "Someone"} commented on your post.`,
          snippet: cmt.text,
          postId: p.id,
          isNew: (Date.now() - (cmt.createdAt || 0)) < 86400000,
        });
      });
    });

    myNotifDocs.forEach((n: any) => {
      const uid = String(n.fromUserId || "");
      if (!uid || uid === myUid) return;
      const key = `notif_${n.id}`;
      const t = String(n.type || "").toLowerCase();
      const bodyText = (String(n.title || "") + " " + String(n.body || "")).toLowerCase();
      let kind: ActivityKind = "reply";
      if (t.includes("like") || t.includes("react") || bodyText.includes("liked") || bodyText.includes("react")) {
        kind = "like";
      } else if (t.includes("follow") || bodyText.includes("following") || bodyText.includes("followed")) {
        kind = "follow";
      } else if (t.includes("share") || t.includes("repost") || bodyText.includes("shared") || bodyText.includes("reposted")) {
        kind = "repost";
      } else {
        kind = "reply";
      }
      map.set(key, {
        id: key,
        actorUid: uid,
        actorFallbackName: n.fromUserName,
        actorFallbackAvatar: n.fromUserAvatar,
        kind,
        timestamp: Number(n.createdAt || Date.now()),
        text: String(n.title || n.body || "New notification"),
        isNew: true,
      });
    });

    myFollowerUids.forEach((fUid) => {
      if (!fUid || fUid === myUid) return;
      const key = `follower_${fUid}`;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          actorUid: fUid,
          kind: "follow",
          timestamp: Date.now() - 3600 * 1000,
          text: "started following you.",
          isNew: true,
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
    );
  }, [
    isPostActivity,
    post,
    postComments,
    currentUser?.uid,
    myPosts,
    myPostCommentsMap,
    myNotifDocs,
    myFollowerUids,
  ]);

  // If real entries exist, display real activity; fallback to clean sample notifications if empty
  const allEntries = useMemo(() => {
    if (realEntries.length > 0) {
      return realEntries;
    }
    return SAMPLE_NOTIFICATIONS;
  }, [realEntries]);

  // Filter by search & insights
  const filteredEntries = useMemo(() => {
    let list = allEntries;
    if (activeFilter === "insights") {
      list = list.filter((item) => item.kind === "memory" || item.kind === "location");
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.text.toLowerCase().includes(q) ||
          (item.actorFallbackName && item.actorFallbackName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allEntries, activeFilter, searchQuery]);

  const newItems = useMemo(
    () => filteredEntries.filter((item) => item.isNew !== false),
    [filteredEntries]
  );
  const oldItems = useMemo(
    () => filteredEntries.filter((item) => item.isNew === false),
    [filteredEntries]
  );

  /* --------------------------------------------------------------------------
   * 4. ENRICH PROFILES
   * ------------------------------------------------------------------------ */
  useEffect(() => {
    const actorUids = Array.from(
      new Set(allEntries.map((e) => e.actorUid).filter(Boolean))
    ) as string[];

    if (actorUids.length === 0) return;
    let cancelled = false;

    (async () => {
      const updates: Record<string, EnrichedUserDoc> = {};
      await Promise.all(
        actorUids.map(async (uid) => {
          if (userProfilesMap[uid]) return;
          try {
            const snap = await getDoc(doc(db, "users", uid));
            if (snap.exists()) {
              const d = snap.data();
              const uname =
                (d.username && String(d.username).replace(/^@+/, "").trim()) ||
                getSafePublicUsername(d) ||
                getSafeDisplayName(d, "user");
              const dName = getSafeDisplayName(d, uname);
              const fCount = getEffectiveFollowersCount(d);
              updates[uid] = {
                uid,
                username: uname,
                displayName: dName,
                photoURL: String(d.photoURL || "").trim(),
                isVerified: Boolean(
                  d.isVerifiedBadge ||
                    d.kycStatus === "approved" ||
                    d.role === "admin"
                ),
                followersCount: fCount,
                followerMiniAvatars: [],
              };
            }
          } catch {}
        })
      );

      if (!cancelled && Object.keys(updates).length > 0) {
        setUserProfilesMap((prev) => ({ ...prev, ...updates }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allEntries, userProfilesMap]);

  useEffect(() => {
    // Guarantee window and body scrolling is fully unlocked when navigating from Messages
    document.documentElement.style.overflow = '';
    document.documentElement.style.overflowY = 'auto';
    document.body.style.overflow = '';
    document.body.style.overflowY = 'auto';
  }, []);

  // Badge icon renderer matching IMG_5471.jpeg & user requirements
  const renderCardBadge = (kind: ActivityKind) => {
    if (kind === "reply") {
      return (
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center shadow-xs">
          <MessageCircle className="w-2.5 h-2.5 fill-white text-white" />
        </span>
      );
    }
    if (kind === "birthday") {
      return (
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 text-white flex items-center justify-center text-[10px] shadow-xs">
          🎉
        </span>
      );
    }
    if (kind === "like") {
      return (
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FF2E93] text-white flex items-center justify-center shadow-xs">
          <Heart className="w-2.5 h-2.5 fill-white text-white" />
        </span>
      );
    }
    if (kind === "follow") {
      return (
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#2F80ED] text-white flex items-center justify-center shadow-xs">
          <User className="w-2.5 h-2.5 fill-white text-white" />
        </span>
      );
    }
    if (kind === "repost") {
      return (
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
          <Share2 className="w-2.5 h-2.5 text-white" />
        </span>
      );
    }
    return null;
  };

  const renderCardAvatar = (item: ActivityEntry) => {
    if (item.kind === "memory") {
      return (
        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 shadow-2xs flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
        </div>
      );
    }
    if (item.kind === "location") {
      return (
        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 shadow-2xs flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
        </div>
      );
    }

    const enriched = item.actorUid ? userProfilesMap[item.actorUid] : null;
    const avatar = enriched?.photoURL || item.actorFallbackAvatar || "";
    const name = enriched?.displayName || item.actorFallbackName || "User";

    return (
      <div className="relative w-12 h-12 shrink-0">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 border border-black/5 dark:border-white/10 flex items-center justify-center">
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-[14px] font-bold text-zinc-700 dark:text-zinc-200">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        {renderCardBadge(item.kind)}
      </div>
    );
  };

  const renderNotificationCard = (item: ActivityEntry) => (
    <div
      key={item.id}
      onClick={() => {
        triggerHaptic();
        if (item.postId) {
          navigate(`/loops/post/${item.postId}`);
        } else if (item.actorUid) {
          navigate(`/loops/profile/${item.actorUid}`);
        }
      }}
      className="bg-white/95 dark:bg-zinc-900/95 rounded-3xl p-4 shadow-sm border border-zinc-100/90 dark:border-white/5 transition hover:shadow-md cursor-pointer space-y-3"
    >
      <div className="flex items-start gap-3.5">
        {renderCardAvatar(item)}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-[14.5px] font-medium text-zinc-900 dark:text-zinc-100 leading-snug">
            {item.text}
          </p>
          <span className="text-[12.5px] text-zinc-400 dark:text-zinc-500 mt-1 block font-normal">
            {item.timeAgoText || (item.timestamp ? formatLoopCompactTime(item.timestamp) : "Recently")}
          </span>
        </div>
      </div>

      {/* 2x2 Memory Image Grid if present (IMG_5471.jpeg Card 3) */}
      {item.gridImages && item.gridImages.length === 4 && (
        <div className="mt-2.5 grid grid-cols-2 gap-1.5 rounded-2xl overflow-hidden max-w-[280px]">
          {item.gridImages.map((imgUrl, i) => (
            <img
              key={i}
              src={imgUrl}
              alt=""
              className="w-full h-24 object-cover hover:scale-105 transition duration-200"
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen ambient-dynamic-bg pb-28 text-zinc-900 dark:text-zinc-100">
      <SEO
        title={isPostActivity ? "Post activity — Loops" : "Notifications — Loops"}
        description="Real-time notifications and community activity."
      />

      {/* Centered Column Container - Smooth Scrolling */}
      <div className="max-w-[480px] mx-auto px-4 pt-4 space-y-4">
        {/* Header with Circular White Back Button matching IMG_5471.jpeg */}
        <header className="flex items-center justify-between py-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate("/loops");
              }
            }}
            aria-label="Back"
            className="w-11 h-11 rounded-full bg-white dark:bg-zinc-800/90 shadow-xs border border-zinc-100 dark:border-zinc-700/80 flex items-center justify-center text-zinc-900 dark:text-zinc-100 hover:scale-105 active:scale-95 transition cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
          </button>

          <h1 className="text-[19px] font-bold tracking-tight text-zinc-900 dark:text-white">
            {isPostActivity ? "Post activity" : "Notifications"}
          </h1>

          <div className="w-11" />
        </header>

        {/* Full-width Search Capsule Input matching IMG_5471.jpeg */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/90 dark:bg-zinc-900/90 rounded-full text-[14.5px] border border-zinc-100 dark:border-white/5 shadow-xs outline-none focus:ring-2 focus:ring-purple-400/30 transition placeholder:text-zinc-400 text-zinc-900 dark:text-white"
          />
        </div>

        {/* All | Insights Filter Segment Bar matching IMG_5471.jpeg */}
        <div className="bg-white/90 dark:bg-zinc-900/90 rounded-full p-1 flex shadow-xs border border-zinc-100 dark:border-white/5">
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              setActiveFilter("all");
            }}
            className={`flex-1 py-2.5 rounded-full text-[14.5px] font-semibold transition cursor-pointer ${
              activeFilter === "all"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              setActiveFilter("insights");
            }}
            className={`flex-1 py-2.5 rounded-full text-[14.5px] font-semibold transition cursor-pointer ${
              activeFilter === "insights"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800"
            }`}
          >
            Insights
          </button>
        </div>

        {/* Content Section */}
        {loadingPost || loadingMyActivity ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            <span className="text-[13px]">Loading notifications...</span>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-16 text-center space-y-1.5">
            <p className="text-[15.5px] font-semibold text-zinc-800 dark:text-white">
              No notifications found
            </p>
            <p className="text-[13.5px] text-zinc-500 dark:text-zinc-400">
              Try searching with another keyword or switching filters.
            </p>
          </div>
        ) : (
          <div className="space-y-5 pt-1">
            {/* NEW SECTION */}
            {newItems.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-[16px] font-bold text-zinc-900 dark:text-white px-1">
                  New
                </h2>
                <div className="space-y-3">
                  {newItems.map((item) => renderNotificationCard(item))}
                </div>
              </div>
            )}

            {/* OLD SECTION */}
            {oldItems.length > 0 && (
              <div className="space-y-3 pt-2">
                <h2 className="text-[16px] font-bold text-zinc-900 dark:text-white px-1">
                  Old
                </h2>
                <div className="space-y-3">
                  {oldItems.map((item) => renderNotificationCard(item))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="md:hidden">
        <NewsBottomDock />
      </div>
    </div>
  );
};

export default LoopActivityPage;
