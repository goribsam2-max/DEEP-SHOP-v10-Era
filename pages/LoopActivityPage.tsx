import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Heart,
  MessageCircle,
  UserPlus,
  Loader2,
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

type ActivityKind = "like" | "reply" | "repost" | "follow";
type ActivityFilter = "all" | "likes" | "replies" | "reposts" | "follows";

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
  actorUid: string;
  actorFallbackName?: string;
  actorFallbackAvatar?: string;
  kind: ActivityKind;
  timestamp: number;
  snippet?: string;
  postId?: string;
  postSnippet?: string;
}

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

  // Post Activity state
  const [post, setPost] = useState<ScamPost | null>(null);
  const [postAuthorDoc, setPostAuthorDoc] = useState<Record<string, any> | null>(
    null
  );
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
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>("all");

  // Enriched user profile cache
  const [userProfilesMap, setUserProfilesMap] = useState<
    Record<string, EnrichedUserDoc>
  >({});

  /* --------------------------------------------------------------------------
   * 1. POST ACTIVITY SUBSCRIPTION (`/loops/post/:id/activity`)
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
   * 2. MY ACTIVITY SUBSCRIPTION (`/loops/activity`)
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

        // Fetch comments across the user's recent posts
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
              n.fromUserId &&
              n.fromUserId !== "system_setup" &&
              n.fromUserId !== "system_milestone" &&
              n.fromUserId !== myUid
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
   * 3. BUILD REAL DYNAMIC ACTIVITY STREAM (ZERO DEMO CONTENT)
   * ------------------------------------------------------------------------ */
  const rawEntries: ActivityEntry[] = useMemo(() => {
    if (isPostActivity) {
      if (!post) return [];
      const items: ActivityEntry[] = [];
      const seenLikes = new Set<string>();

      // Real reactions from post.reactions & post.reactionsUsers
      if (post.reactions) {
        Object.keys(post.reactions).forEach((uid) => {
          if (!uid || seenLikes.has(uid)) return;
          seenLikes.add(uid);
          const meta = post.reactionsUsers?.[uid];
          items.push({
            id: `like_${post.id}_${uid}`,
            actorUid: uid,
            actorFallbackName: meta?.userName,
            actorFallbackAvatar: meta?.userAvatar,
            kind: "like",
            timestamp: meta?.timestamp || post.updatedAt || post.createdAt,
            postId: post.id,
          });
        });
      }
      if (Array.isArray(post.votedUserIds)) {
        post.votedUserIds.forEach((uid) => {
          if (!uid || seenLikes.has(uid)) return;
          seenLikes.add(uid);
          const meta = post.reactionsUsers?.[uid];
          items.push({
            id: `vote_${post.id}_${uid}`,
            actorUid: uid,
            actorFallbackName: meta?.userName,
            actorFallbackAvatar: meta?.userAvatar,
            kind: "like",
            timestamp: meta?.timestamp || post.updatedAt || post.createdAt,
            postId: post.id,
          });
        });
      }

      // Real reposts
      if (Array.isArray(post.repostedByUserIds)) {
        post.repostedByUserIds.filter(Boolean).forEach((uid) => {
          items.push({
            id: `repost_${post.id}_${uid}`,
            actorUid: uid,
            kind: "repost",
            timestamp: post.updatedAt || post.createdAt,
            postId: post.id,
          });
        });
      }

      // Real replies/comments
      postComments.forEach((cmt) => {
        if (!cmt.userId) return;
        items.push({
          id: `reply_${cmt.id}`,
          actorUid: cmt.userId,
          actorFallbackName: cmt.userName,
          actorFallbackAvatar: cmt.userAvatar,
          kind: "reply",
          timestamp: cmt.createdAt || post.createdAt,
          snippet: cmt.text,
          postId: post.id,
        });
      });

      return items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }

    // My Activity mode
    const myUid = currentUser?.uid;
    if (!myUid) return [];

    const map = new Map<string, ActivityEntry>();

    // Interactions across own posts
    myPosts.forEach((p) => {
      const pSnippet = (p.description || p.title || "Loop").slice(0, 72);
      if (p.reactions) {
        Object.keys(p.reactions).forEach((uid) => {
          if (!uid || uid === myUid) return;
          const meta = p.reactionsUsers?.[uid];
          const key = `like_${p.id}_${uid}`;
          map.set(key, {
            id: key,
            actorUid: uid,
            actorFallbackName: meta?.userName,
            actorFallbackAvatar: meta?.userAvatar,
            kind: "like",
            timestamp: meta?.timestamp || p.updatedAt || p.createdAt,
            postId: p.id,
            postSnippet: pSnippet,
          });
        });
      }
      if (Array.isArray(p.repostedByUserIds)) {
        p.repostedByUserIds.forEach((uid) => {
          if (!uid || uid === myUid) return;
          const key = `repost_${p.id}_${uid}`;
          map.set(key, {
            id: key,
            actorUid: uid,
            kind: "repost",
            timestamp: p.updatedAt || p.createdAt,
            postId: p.id,
            postSnippet: pSnippet,
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
          snippet: cmt.text,
          postId: p.id,
          postSnippet: pSnippet,
        });
      });
    });

    // Real notifications (follows, mentions, comment likes)
    myNotifDocs.forEach((n: any) => {
      const uid = String(n.fromUserId || "");
      if (!uid || uid === myUid) return;
      const rawType = String(n.type || "").toLowerCase();
      let kind: ActivityKind = "like";
      if (rawType.includes("follow")) kind = "follow";
      else if (rawType.includes("comment") || rawType.includes("reply") || rawType.includes("mention"))
        kind = "reply";
      else if (rawType.includes("repost")) kind = "repost";

      const key =
        kind === "follow"
          ? `follow_${uid}`
          : `${kind}_${n.targetId || n.id}_${uid}`;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          actorUid: uid,
          actorFallbackName: n.fromUserName,
          actorFallbackAvatar: n.fromUserAvatar,
          kind,
          timestamp: Number(n.createdAt || Date.now()),
          snippet:
            kind === "reply" && n.body && !String(n.body).startsWith("commented")
              ? String(n.body)
              : undefined,
          postId: kind !== "follow" ? n.targetId : undefined,
        });
      }
    });

    // Real followers from `users` where `following` contains `myUid`
    myFollowerUids.forEach((uid) => {
      if (!uid || uid === myUid) return;
      const key = `follow_${uid}`;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          actorUid: uid,
          kind: "follow",
          timestamp: 0,
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

  /* --------------------------------------------------------------------------
   * 4. ENRICH ALL ACTOR PROFILES + REAL FOLLOWER MINI AVATARS
   * ------------------------------------------------------------------------ */
  useEffect(() => {
    const actorUids = Array.from(
      new Set(rawEntries.map((e) => e.actorUid).filter(Boolean))
    ).filter((uid) => !userProfilesMap[uid]);

    if (actorUids.length === 0) return;
    let cancelled = false;

    (async () => {
      const updates: Record<string, EnrichedUserDoc> = {};
      await Promise.all(
        actorUids.map(async (uid) => {
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
              const followerIds: string[] = Array.isArray(d.followers)
                ? d.followers.filter((fid: string) => Boolean(fid) && fid !== uid).slice(0, 2)
                : [];
              const miniAvatars: string[] = [];
              for (const fid of followerIds) {
                try {
                  const fSnap = await getDoc(doc(db, "users", fid));
                  if (fSnap.exists()) {
                    const fUrl = String(fSnap.data()?.photoURL || "").trim();
                    if (fUrl) miniAvatars.push(fUrl);
                  }
                } catch {}
              }
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
                followerMiniAvatars: miniAvatars,
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
  }, [rawEntries, userProfilesMap]);

  const filteredEntries = useMemo(() => {
    if (isPostActivity || activeFilter === "all") return rawEntries;
    return rawEntries.filter((item) => {
      if (activeFilter === "likes") return item.kind === "like";
      if (activeFilter === "replies") return item.kind === "reply";
      if (activeFilter === "reposts") return item.kind === "repost";
      if (activeFilter === "follows") return item.kind === "follow";
      return true;
    });
  }, [isPostActivity, activeFilter, rawEntries]);

  const handleToggleFollow = async (
    e: React.MouseEvent,
    targetUid: string,
    targetName: string,
    currentlyFollowing: boolean
  ) => {
    e.stopPropagation();
    triggerHaptic();
    if (!currentUser?.uid) {
      navigate("/signin");
      return;
    }
    if (!targetUid || targetUid === currentUser.uid || followBusyMap[targetUid]) {
      return;
    }

    const next = !currentlyFollowing;
    setOptimisticFollowMap((prev) => ({ ...prev, [targetUid]: next }));
    setFollowBusyMap((prev) => ({ ...prev, [targetUid]: true }));
    try {
      const res = await toggleFollowUser({
        targetUid,
        targetName,
        currentUser,
        currentlyFollowing,
      });
      if (!res.ok) {
        setOptimisticFollowMap((prev) => ({
          ...prev,
          [targetUid]: currentlyFollowing,
        }));
      } else {
        setOptimisticFollowMap((prev) => ({
          ...prev,
          [targetUid]: res.isFollowing,
        }));
        if (typeof res.followersCount === "number") {
          setUserProfilesMap((prev) =>
            prev[targetUid]
              ? {
                  ...prev,
                  [targetUid]: {
                    ...prev[targetUid],
                    followersCount: res.followersCount!,
                  },
                }
              : prev
          );
        }
      }
    } catch {
      setOptimisticFollowMap((prev) => ({
        ...prev,
        [targetUid]: currentlyFollowing,
      }));
    } finally {
      setFollowBusyMap((prev) => ({ ...prev, [targetUid]: false }));
    }
  };

  const renderBadgeIcon = (kind: ActivityKind) => {
    if (kind === "like") {
      return (
        <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#FF2D55] ring-2 ring-white dark:ring-[#0a0a0a] flex items-center justify-center">
          <Heart className="w-2.5 h-2.5 fill-white text-white" />
        </span>
      );
    }
    if (kind === "repost") {
      return (
        <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#00BA7C] ring-2 ring-white dark:ring-[#0a0a0a] flex items-center justify-center">
          <LoopRepeatIcon className="w-2.5 h-2.5 text-white" />
        </span>
      );
    }
    if (kind === "reply") {
      return (
        <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#0095F6] ring-2 ring-white dark:ring-[#0a0a0a] flex items-center justify-center">
          <MessageCircle className="w-2.5 h-2.5 fill-white text-white" />
        </span>
      );
    }
    return (
      <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#7C3AED] ring-2 ring-white dark:ring-[#0a0a0a] flex items-center justify-center">
        <UserPlus className="w-2.5 h-2.5 text-white" />
      </span>
    );
  };

  const postPreviewUsername =
    (postAuthorDoc?.username &&
      String(postAuthorDoc.username).replace(/^@+/, "").trim()) ||
    getSafePublicUsername(postAuthorDoc) ||
    post?.reporterName ||
    "user";

  const postPreviewAvatar =
    String(postAuthorDoc?.photoURL || post?.reporterAvatar || "").trim();

  const postPreviewSnippet =
    (post?.description || post?.title || "").trim() ||
    (post?.images?.length
      ? "Shared a photo"
      : post?.videoUrl
      ? "Shared a video"
      : post?.audioUrl
      ? "Shared a voice note"
      : "Loop");

  const isLoading = isPostActivity ? loadingPost : loadingMyActivity;

  return (
    <div className="min-h-screen loops-surface pb-28">
      <SEO
        title={isPostActivity ? "Post activity — Loops" : "Activity — Loops"}
        description="Real-time community activity on Loops."
      />

      {/* Centered Column Container */}
      <div className="max-w-[620px] mx-auto min-h-screen sm:border-x loops-divider">
        {/* Sticky Top Header matching IMG_5093 */}
        <header className="sticky top-0 z-30 loops-surface/95 backdrop-blur-xl border-b loops-divider h-14 px-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              if (window.history.length > 1) {
                navigate(-1);
              } else if (postId) {
                navigate(`/loops/post/${postId}`);
              } else {
                navigate("/loops");
              }
            }}
            aria-label="Back"
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#0f0f0f] dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.1]" />
          </button>

          <h1 className="text-[16.5px] font-bold tracking-tight text-[#0f0f0f] dark:text-white">
            {isPostActivity ? "Post activity" : "Activity"}
          </h1>

          <div className="w-10" />
        </header>

        {/* Top Rounded Post Preview Card in Post Activity Mode (IMG_5093) */}
        {isPostActivity && post && (
          <div className="px-4 pt-3.5 pb-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                navigate(`/loops/post/${post.id}`);
              }}
              className="w-full p-3.5 rounded-2xl border border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#111113] flex items-center gap-2.5 text-left hover:bg-zinc-50/80 dark:hover:bg-zinc-900/80 transition cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0 flex items-center justify-center">
                {postPreviewAvatar ? (
                  <img
                    src={postPreviewAvatar}
                    alt={postPreviewUsername}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200">
                    {postPreviewUsername.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <span className="text-[14px] font-semibold text-[#0f0f0f] dark:text-white shrink-0 max-w-[130px] truncate">
                {postPreviewUsername}
              </span>

              <span className="text-[13.5px] text-zinc-400 shrink-0">
                {formatLoopCompactTime(post.createdAt)}
              </span>

              <span className="text-[14px] text-zinc-600 dark:text-zinc-300 truncate flex-1">
                {postPreviewSnippet}
              </span>

              {post.images?.[0] && (
                <img
                  src={post.images[0]}
                  alt=""
                  className="w-8 h-8 rounded-lg object-cover shrink-0 border border-black/5 dark:border-white/10"
                />
              )}
            </button>
          </div>
        )}

        {/* Filter Pills in My Activity Mode */}
        {!isPostActivity && currentUser && (
          <div className="px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar border-b loops-divider">
            {(
              [
                { id: "all", label: "All" },
                { id: "likes", label: "Likes" },
                { id: "replies", label: "Replies" },
                { id: "reposts", label: "Reposts" },
                { id: "follows", label: "Follows" },
              ] as { id: ActivityFilter; label: string }[]
            ).map((tab) => {
              const active = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setActiveFilter(tab.id);
                  }}
                  className={`px-4 py-1.5 rounded-xl text-[13.5px] font-semibold shrink-0 transition cursor-pointer ${
                    active
                      ? "loops-follow-btn"
                      : "loops-following-btn opacity-80 hover:opacity-100"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Content Stream */}
        {!isPostActivity && !currentUser ? (
          <div className="px-6 py-20 text-center space-y-4">
            <p className="text-[16px] font-semibold text-[#0f0f0f] dark:text-white">
              Sign in to view your Loops activity
            </p>
            <p className="text-[14px] text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
              Likes, replies, reposts, and new followers on your Loops will appear here in real time.
            </p>
            <button
              type="button"
              onClick={() => navigate("/signin")}
              className="loops-follow-btn px-6 py-2.5 rounded-xl text-[14px] font-semibold cursor-pointer"
            >
              Sign in
            </button>
          </div>
        ) : isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-[13px]">Loading activity...</span>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="px-6 py-20 text-center space-y-1.5">
            <p className="text-[15.5px] font-semibold text-[#0f0f0f] dark:text-white">
              No activity yet
            </p>
            <p className="text-[14px] text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
              {isPostActivity
                ? "When people like, reply to, or repost this Loop, they'll appear here."
                : "When people interact with your Loops or follow you, you'll see them here."}
            </p>
          </div>
        ) : (
          <div className="divide-y loops-divider">
            {filteredEntries.map((entry) => {
              const enriched = userProfilesMap[entry.actorUid];
              const username =
                enriched?.username ||
                (entry.actorFallbackName || "user")
                  .trim()
                  .replace(/^@+/, "");
              const displayName =
                enriched?.displayName ||
                entry.actorFallbackName ||
                username;
              const avatar =
                enriched?.photoURL || entry.actorFallbackAvatar || "";
              const followersCount = enriched?.followersCount ?? 0;
              const miniAvatars = enriched?.followerMiniAvatars || [];
              const isSelf = Boolean(
                currentUser?.uid && entry.actorUid === currentUser.uid
              );

              const isFollowing =
                optimisticFollowMap[entry.actorUid] !== undefined
                  ? optimisticFollowMap[entry.actorUid]
                  : followedIds.includes(entry.actorUid);

              return (
                <div
                  key={entry.id}
                  onClick={() => {
                    triggerHaptic();
                    if (!isPostActivity && entry.postId && entry.kind !== "follow") {
                      navigate(`/loops/post/${entry.postId}`);
                    } else if (entry.actorUid) {
                      navigate(`/loops/profile/${entry.actorUid}`);
                    }
                  }}
                  className="px-4 py-3.5 flex items-start gap-3.5 hover:bg-zinc-50/60 dark:hover:bg-white/[0.02] transition cursor-pointer"
                >
                  {/* 44px Avatar + Action Badge (IMG_5093) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic();
                      if (entry.actorUid) {
                        navigate(`/loops/profile/${entry.actorUid}`);
                      }
                    }}
                    className="relative w-11 h-11 shrink-0 mt-0.5 cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-black/[0.06] dark:border-white/10 flex items-center justify-center">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={username}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[15px] font-bold text-zinc-700 dark:text-zinc-200">
                          {username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {renderBadgeIcon(entry.kind)}
                  </button>

                  {/* Center 3-line Profile & Activity Details (IMG_5093) */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {/* Line 1: Username + Verified + Relative Time */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[15px] font-semibold text-[#0f0f0f] dark:text-white truncate">
                            {username}
                          </span>
                          {enriched?.isVerified && (
                            <VerifiedLoopBadge className="w-3.5 h-3.5" />
                          )}
                          {entry.timestamp > 0 && (
                            <span className="text-[14px] text-zinc-400 dark:text-zinc-500 shrink-0">
                              {formatLoopCompactTime(entry.timestamp)}
                            </span>
                          )}
                        </div>

                        {/* Line 2: Display Name (or Reply Text) */}
                        <p className="text-[14px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                          {entry.kind === "reply" && entry.snippet
                            ? entry.snippet
                            : displayName}
                        </p>

                        {/* Optional target Loop reference in My Activity */}
                        {!isPostActivity && entry.postSnippet && (
                          <p className="text-[12.5px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                            on: {entry.postSnippet}
                          </p>
                        )}

                        {/* Line 3: Overlapping Follower Avatars + Real Follower Count */}
                        <div className="flex items-center gap-1.5 mt-1.5 text-[13.5px] text-zinc-500 dark:text-zinc-400">
                          {miniAvatars.length > 0 && (
                            <div className="flex items-center -space-x-1.5 shrink-0">
                              {miniAvatars.map((mUrl, mIdx) => (
                                <img
                                  key={mIdx}
                                  src={mUrl}
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  className="w-4 h-4 rounded-full object-cover ring-1 ring-white dark:ring-[#0a0a0a]"
                                />
                              ))}
                            </div>
                          )}
                          <span>
                            {followersCount.toLocaleString()}{" "}
                            {followersCount === 1 ? "follower" : "followers"}
                          </span>
                        </div>
                      </div>

                      {/* Right Follow / Following Pill Button (IMG_5093) */}
                      {!isSelf && entry.actorUid && (
                        <button
                          type="button"
                          disabled={Boolean(followBusyMap[entry.actorUid])}
                          onClick={(e) =>
                            handleToggleFollow(
                              e,
                              entry.actorUid,
                              username,
                              isFollowing
                            )
                          }
                          className={`shrink-0 px-5 py-1.5 rounded-xl text-[14px] font-semibold transition active:scale-95 cursor-pointer ${
                            isFollowing
                              ? "loops-following-btn"
                              : "loops-follow-btn"
                          }`}
                        >
                          {isFollowing ? "Following" : "Follow"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
