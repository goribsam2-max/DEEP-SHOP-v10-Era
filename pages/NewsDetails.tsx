import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Bell,
  BellRing,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  ShieldAlert,
  MapPin,
  Phone,
  CreditCard,
  Copy,
  Check,
  Image as ImageIcon,
  Edit3,
  Trash2,
  ThumbsUp,
  Plus,
  PlusCircle,
  CheckCircle2,
  User as UserIcon,
  X,
  Sparkles,
  Clock,
  Lock,
  BarChart2,
  Link2,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import {
  MoreCircleDotsIcon,
  StickerPeelSmileIcon,
  GifBadgeOutlineIcon,
  DottedGhostCatIcon,
  StickersBottomSheet,
  GiphyBottomSheet,
  PostOptionsBottomSheet,
} from "../components/ComposerLiquidGlassSheets";
import {
  formatLoopCompactTime,
  formatLoopCount,
  VerifiedLoopBadge,
  LoopHeartIcon,
  LoopCommentIcon,
  LoopRepeatIcon,
  LoopSendIcon,
  LoopPostMenuLinesIcon,
} from "../components/LoopPostCard";
import {
  LiquidGlassShareModal,
  LoopPostOptionsSheet,
} from "../components/LiquidGlassPostInteractions";
import { SmoothImage, preloadImageUrl } from "../components/SmoothImage";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  increment,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import {
  ScamPost,
  ScamComment,
  ReactionType,
  ReplyPermissionMode,
  UserProfile,
} from "../types";
import { NewsPostMedia, isScamPostRecord } from "../components/NewsPostMedia";
import {
  NewsRichText,
  NewsLinkPreviewCards,
  extractHashtagsFromText,
} from "../components/NewsRichText";
import {
  resolvePostById,
  getSavedPostIdsLocal,
  toggleSavePostHelper,
} from "./NewsHubSubPages";
import {
  applyWatermarkToImage,
  processCleanImage,
} from "../lib/watermark";
import { uploadDataUrlToImgbb } from "../services/imgbb";
import { useNotify, useConfirm } from "../components/Notifications";
import { triggerHaptic } from "../lib/haptics";
import SEO from "../components/SEO";
import {
  NewsPostDetailPageSkeleton,
  CommentListSkeleton,
} from "../components/PageSkeletons";
import { hasImmediateAdminOrStaffRole, checkStaffRecord } from "../lib/admin";
import {
  recordPostDetailView,
  getTotalPostReactions,
  hasUserReactedToPost,
  computeNextPostReactionState,
} from "../lib/feedAlgorithm";
import { getLocalFollowedIds, toggleFollowUser } from "../lib/follow";
import { getSafePublicUsername, getSafeDisplayName } from "../lib/utils";

const DiagonalExpandIcon: React.FC<{ className?: string }> = ({
  className = "w-[19px] h-[19px]",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 4 20 4 20 9" />
    <polyline points="9 20 4 20 4 15" />
    <line x1="20" y1="4" x2="13.5" y2="10.5" />
    <line x1="4" y1="20" x2="10.5" y2="13.5" />
  </svg>
);

const GenericPersonAvatar: React.FC<{
  src?: string | null;
  name?: string;
  sizeClass?: string;
}> = ({ src, sizeClass = "w-9 h-9" }) => {
  const [imgErr, setImgErr] = useState(false);

  if (src && !imgErr) {
    return (
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setImgErr(true)}
        className={`${sizeClass} rounded-full object-cover bg-zinc-100 dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08]`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 flex items-center justify-center border border-black/[0.05] dark:border-white/[0.08] overflow-hidden`}
    >
      <UserIcon className="w-[56%] h-[56%] fill-current stroke-[1.6]" />
    </div>
  );
};

export const NewsDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotify();
  const confirm = useConfirm();

  const commentInputRef = useRef<HTMLInputElement | null>(null);
  const expandedTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const commentFileRef = useRef<HTMLInputElement | null>(null);
  const submittingCommentRef = useRef(false);
  const headerMenuRef = useRef<HTMLDivElement | null>(null);
  const sortPopoverRef = useRef<HTMLDivElement | null>(null);
  const avatarPopoverRef = useRef<HTMLDivElement | null>(null);

  const [post, setPost] = useState<ScamPost | null>(() => {
    if (typeof window !== "undefined") {
      const initial = (window as any).__INITIAL_POST_DATA__;
      if (initial && (!id || initial.id === id)) {
        return initial as ScamPost;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined") {
      const initial = (window as any).__INITIAL_POST_DATA__;
      if (initial && (!id || initial.id === id)) {
        return false;
      }
    }
    return true;
  });

  const [currentUser, setCurrentUser] = useState<any>(() => auth.currentUser);
  const [viewerProfile, setViewerProfile] = useState<Partial<UserProfile> | null>(null);
  const [postAuthorProfile, setPostAuthorProfile] = useState<Partial<UserProfile> | null>(null);
  const [commentProfilesMap, setCommentProfilesMap] = useState<
    Record<string, Partial<UserProfile>>
  >({});
  const [isAdmin, setIsAdmin] = useState(false);

  const [comments, setComments] = useState<ScamComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [processingCommentImg, setProcessingCommentImg] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    userName: string;
  } | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [savingCommentEdit, setSavingCommentEdit] = useState(false);
  const [activeCommentMenuId, setActiveCommentMenuId] = useState<string | null>(
    null
  );

  const [sortMode, setSortMode] = useState<"top" | "recent">("top");
  const [showSortPopover, setShowSortPopover] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showAvatarPopover, setShowAvatarPopover] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const [savedIds, setSavedIds] = useState<string[]>(() =>
    getSavedPostIdsLocal()
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [authorFollowsViewer, setAuthorFollowsViewer] = useState(false);
  const [localReaction, setLocalReaction] = useState<ReactionType | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const [showStickersSheet, setShowStickersSheet] = useState(false);
  const [showGiphySheet, setShowGiphySheet] = useState(false);
  const [showExpandedComposer, setShowExpandedComposer] = useState(false);
  const [showPostOptionsSheet, setShowPostOptionsSheet] = useState(false);

  const [postWatchEnabled, setPostWatchEnabled] = useState<boolean>(() => {
    if (!id) return false;
    try {
      const list = JSON.parse(
        localStorage.getItem("loops_watched_posts") || "[]"
      );
      return Array.isArray(list) && list.includes(id);
    } catch {
      return false;
    }
  });

  const [topicPostCount, setTopicPostCount] = useState<number>(1);
  const [detailCarouselIdx, setDetailCarouselIdx] = useState(0);
  const detailTouchStartXRef = useRef<number | null>(null);

  const totalReactions = useMemo(
    () => getTotalPostReactions(post),
    [
      post?.reactions,
      post?.reactionsCount,
      post?.reactionsUsers,
      post?.votedUserIds,
      post?.votes,
    ]
  );

  // Close popovers on outside click
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        showSortPopover &&
        sortPopoverRef.current &&
        !sortPopoverRef.current.contains(target)
      ) {
        setShowSortPopover(false);
      }
      if (
        showAvatarPopover &&
        avatarPopoverRef.current &&
        !avatarPopoverRef.current.contains(target)
      ) {
        setShowAvatarPopover(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showHeaderMenu, showSortPopover, showAvatarPopover]);

  // Auth & Admin check + Viewer profile load
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setCurrentUser(u);
      if (!u) {
        setViewerProfile(null);
        setIsAdmin(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        const uData = snap.exists() ? (snap.data() as Partial<UserProfile>) : null;
        setViewerProfile(uData);
        if (hasImmediateAdminOrStaffRole(uData, u)) {
          setIsAdmin(true);
          return;
        }
        const staffRes = await checkStaffRecord(uData?.email || u.email);
        setIsAdmin(staffRes.isStaff);
      } catch {
        setIsAdmin(hasImmediateAdminOrStaffRole(null, u));
      }
    });
    return unsub;
  }, []);

  // Load Post (Real-time Firestore)
  useEffect(() => {
    if (!id) return;
    setDetailCarouselIdx(0);
    setPost((prev) => {
      if (prev && prev.id === id) return prev;
      setLoading(true);
      return null;
    });
    recordPostDetailView(id);

    try {
      const watched = JSON.parse(
        localStorage.getItem("loops_watched_posts") || "[]"
      );
      setPostWatchEnabled(Array.isArray(watched) && watched.includes(id));
    } catch {}

    try {
      const localReactionMap = JSON.parse(
        localStorage.getItem("deep_post_reactions") || "{}"
      );
      setLocalReaction(localReactionMap[id] || null);
    } catch {}

    let unsubDoc: (() => void) | null = null;

    if (!id.startsWith("showcase_")) {
      unsubDoc = onSnapshot(
        doc(db, "scam_posts", id),
        async (snap) => {
          if (snap.exists()) {
            setPost({ id: snap.id, ...(snap.data() as Omit<ScamPost, "id">) });
            setLoading(false);
          } else {
            const fallback = await resolvePostById(id);
            setPost(fallback);
            setLoading(false);
          }
        },
        async () => {
          const fallback = await resolvePostById(id);
          setPost(fallback);
          setLoading(false);
        }
      );
    } else {
      resolvePostById(id).then((found) => {
        setPost(found);
        setLoading(false);
      });
    }

    return () => {
      if (unsubDoc) unsubDoc();
    };
  }, [id]);

  // Increment real post views once per session when signed in
  useEffect(() => {
    if (!id || !post?.id || id.startsWith("showcase_") || id.startsWith("post_")) {
      return;
    }
    try {
      const viewedKey = "loops_viewed_posts";
      const raw = sessionStorage.getItem(viewedKey);
      const parsed: string[] = raw ? JSON.parse(raw) : [];
      if (parsed.includes(id)) return;
      const next = [...parsed, id];
      sessionStorage.setItem(viewedKey, JSON.stringify(next));

      if (auth.currentUser) {
        updateDoc(doc(db, "scam_posts", id), {
          views: increment(1),
        }).catch(() => {});
      }
    } catch {}
  }, [id, post?.id, currentUser?.uid]);

  // Load real author profile from `users/{reporterId}`
  useEffect(() => {
    if (!post?.reporterId) {
      setPostAuthorProfile(null);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "users", post.reporterId),
      (snap) => {
        if (snap.exists()) {
          setPostAuthorProfile({
            uid: snap.id,
            ...(snap.data() as Partial<UserProfile>),
          });
        } else {
          setPostAuthorProfile(null);
        }
      },
      () => {
        setPostAuthorProfile(null);
      }
    );
    return () => unsub();
  }, [post?.reporterId]);

  // Dynamic Topic Search count from real `scam_posts`
  const activeTopic = useMemo(() => {
    if (!post) return "";
    const tag = (post.postTag || "").trim();
    if (tag) return tag;
    const extracted = extractHashtagsFromText(post.description || "");
    return extracted[0] || "";
  }, [post?.postTag, post?.description]);

  useEffect(() => {
    if (!activeTopic) {
      setTopicPostCount(0);
      return;
    }
    let cancelled = false;
    const needle = activeTopic.toLowerCase();
    getDocs(collection(db, "scam_posts"))
      .then((snap) => {
        if (cancelled) return;
        let matches = 0;
        snap.docs.forEach((d) => {
          const data = d.data() as Partial<ScamPost>;
          const pTag = (data.postTag || "").trim().toLowerCase();
          const desc = (data.description || "").toLowerCase();
          const title = (data.title || "").toLowerCase();
          if (
            pTag === needle ||
            desc.includes(`#${needle}`) ||
            desc.includes(needle) ||
            title.includes(needle)
          ) {
            matches += 1;
          }
        });
        setTopicPostCount(Math.max(1, matches));
      })
      .catch(() => {
        if (!cancelled) setTopicPostCount(1);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTopic]);

  // Load Comments (Real-time Firestore subcollection + unsynced local fallback)
  useEffect(() => {
    if (!id) return;
    setCommentsLoading(true);

    const loadLocalComments = (): ScamComment[] => {
      try {
        const all = JSON.parse(
          localStorage.getItem("deep_post_comments") || "{}"
        );
        return Array.isArray(all[id]) ? all[id] : [];
      } catch {
        return [];
      }
    };

    const saveLocalCommentsForPost = (nextList: ScamComment[]) => {
      try {
        const all = JSON.parse(
          localStorage.getItem("deep_post_comments") || "{}"
        );
        if (nextList.length === 0) {
          delete all[id];
        } else {
          all[id] = nextList;
        }
        localStorage.setItem("deep_post_comments", JSON.stringify(all));
      } catch {}
    };

    if (id.startsWith("showcase_") || id.startsWith("post_")) {
      setComments(loadLocalComments());
    }

    const q = query(
      collection(db, "scam_posts", id, "comments"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const remote = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ScamComment, "id">),
        }));
        const local = loadLocalComments();
        const map = new Map<string, ScamComment>();
        remote.forEach((c) => map.set(c.id, c));

        const unsyncedLocal: ScamComment[] = [];
        let localChanged = false;
        local.forEach((lc) => {
          if (map.has(lc.id)) {
            localChanged = true;
            return;
          }
          const isLegacyDuplicate =
            String(lc.id).startsWith("cmt_") &&
            remote.some(
              (rc) =>
                rc.userId === lc.userId &&
                (rc.text || "") === (lc.text || "") &&
                Math.abs((rc.createdAt || 0) - (lc.createdAt || 0)) < 25000
            );
          if (isLegacyDuplicate) {
            localChanged = true;
            return;
          }
          unsyncedLocal.push(lc);
          map.set(lc.id, lc);
        });

        if (localChanged) {
          saveLocalCommentsForPost(unsyncedLocal);
        }

        setComments(
          Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt)
        );
        setCommentsLoading(false);
      },
      () => {
        setComments(loadLocalComments());
        setCommentsLoading(false);
      }
    );

    return () => unsub();
  }, [id]);

  // Enrich comment authors from `users/{uid}`
  useEffect(() => {
    const missingUids = Array.from(
      new Set(
        comments
          .map((c) => c.userId)
          .filter(
            (uidVal) =>
              Boolean(uidVal) &&
              uidVal !== "guest_local" &&
              !commentProfilesMap[uidVal]
          )
      )
    );
    if (missingUids.length === 0) return;

    let cancelled = false;
    Promise.all(
      missingUids.map(async (uidVal) => {
        try {
          const snap = await getDoc(doc(db, "users", uidVal));
          if (snap.exists()) {
            return [uidVal, { uid: snap.id, ...(snap.data() as Partial<UserProfile>) }] as const;
          }
        } catch {}
        return [uidVal, {} as Partial<UserProfile>] as const;
      })
    ).then((entries) => {
      if (cancelled) return;
      setCommentProfilesMap((prev) => {
        const next = { ...prev };
        entries.forEach(([k, v]) => {
          next[k] = v;
        });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [comments]);

  // Scroll/focus reply input if hash #comments present
  useEffect(() => {
    if (!loading && location.hash === "#comments") {
      window.setTimeout(() => {
        commentInputRef.current?.focus();
      }, 220);
    }
  }, [loading, location.hash]);

  // Follow state & author-follows-viewer check
  useEffect(() => {
    if (!post?.reporterId) return;
    const localIds = getLocalFollowedIds(currentUser?.uid);
    const viewerFollowingArr = Array.isArray((viewerProfile as any)?.following)
      ? ((viewerProfile as any).following as string[])
      : [];
    setIsFollowing(
      localIds.includes(post.reporterId) ||
        viewerFollowingArr.includes(post.reporterId)
    );

    if (currentUser?.uid && post.reporterId !== currentUser.uid) {
      const authorFollowingArr = Array.isArray(
        (postAuthorProfile as any)?.following
      )
        ? ((postAuthorProfile as any).following as string[])
        : [];
      if (authorFollowingArr.includes(currentUser.uid)) {
        setAuthorFollowsViewer(true);
      } else {
        getDoc(doc(db, "users", currentUser.uid, "followers", post.reporterId))
          .then((snap) => setAuthorFollowsViewer(snap.exists()))
          .catch(() => setAuthorFollowsViewer(false));
      }
    } else {
      setAuthorFollowsViewer(false);
    }
  }, [
    post?.reporterId,
    currentUser?.uid,
    viewerProfile,
    postAuthorProfile,
  ]);

  const handleToggleFollowAuthor = async () => {
    if (!post?.reporterId) return;
    triggerHaptic();
    if (!currentUser?.uid) {
      setShowAvatarPopover(false);
      notify("Please sign in to follow profiles.", "info");
      navigate("/signin");
      return;
    }
    if (followBusy) return;
    setFollowBusy(true);
    try {
      const res = await toggleFollowUser({
        targetUid: post.reporterId,
        targetName: post.reporterName,
        currentUser: {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          email: currentUser.email,
          photoURL: currentUser.photoURL,
        },
        currentlyFollowing: isFollowing,
      });
      if (res.ok) {
        setIsFollowing(res.isFollowing);
      }
    } catch {
    } finally {
      setFollowBusy(false);
      setShowAvatarPopover(false);
    }
  };

  const handleToggleWatchPost = () => {
    if (!id) return;
    triggerHaptic();
    try {
      const raw = localStorage.getItem("loops_watched_posts") || "[]";
      const list: string[] = Array.isArray(JSON.parse(raw))
        ? JSON.parse(raw)
        : [];
      const nextVal = !postWatchEnabled;
      const updated = nextVal
        ? Array.from(new Set([...list, id]))
        : list.filter((x) => x !== id);
      localStorage.setItem("loops_watched_posts", JSON.stringify(updated));
      setPostWatchEnabled(nextVal);
      notify(
        nextVal
          ? "Post notifications turned on"
          : "Post notifications turned off",
        "info"
      );
    } catch {}
  };

  const handleCopyField = async (label: string, val: string) => {
    triggerHaptic();
    try {
      await navigator.clipboard.writeText(val);
      setCopiedField(label);
      notify(`${label} copied`, "success");
      window.setTimeout(() => setCopiedField(null), 1800);
    } catch {}
  };

  const handleCopyPostLink = async () => {
    if (!post) return;
    triggerHaptic();
    const url = `${window.location.origin}/loops/post/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      notify("Link copied to clipboard", "success");
    } catch {
      notify("Could not copy link", "error");
    }
  };

  const handleReaction = async (chosen: ReactionType = "love") => {
    if (!post) return;
    if (!currentUser) {
      notify("Please sign in to like this Loop.", "info");
      navigate("/signin");
      return;
    }
    triggerHaptic();
    const uid = currentUser.uid;
    const nextState = computeNextPostReactionState(
      post,
      uid,
      {
        userName: getSafeDisplayName(viewerProfile || currentUser, "Member"),
        userAvatar:
          (viewerProfile as any)?.photoURL || currentUser.photoURL || "",
      },
      chosen,
      localReaction
    );

    const removing = nextState.isRemoving;
    const nextTotalVotes = nextState.votes;
    setLocalReaction(nextState.activeReaction);

    setPost((prev) =>
      prev
        ? {
            ...prev,
            reactions: nextState.reactions,
            reactionsCount: nextState.reactionsCount,
            reactionsUsers: nextState.reactionsUsers,
            votedUserIds: nextState.votedUserIds,
            votes: nextState.votes,
          }
        : null
    );

    if (!post.id.startsWith("showcase_")) {
      try {
        await updateDoc(doc(db, "scam_posts", post.id), {
          reactions: nextState.reactions,
          reactionsCount: nextState.reactionsCount,
          reactionsUsers: nextState.reactionsUsers,
          votedUserIds: nextState.votedUserIds,
          votes: nextState.votes,
        });

        if (!removing && post.reporterId && post.reporterId !== uid) {
          const actorIsAdmin =
            isAdmin || hasImmediateAdminOrStaffRole(null, currentUser);

          if (actorIsAdmin) {
            setDoc(
              doc(
                db,
                "news_hub_notifications",
                `milestone_reactions_${post.id}`
              ),
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
              viewerProfile || currentUser,
              "Someone"
            );
            const authorAvatar =
              (viewerProfile as any)?.photoURL || currentUser?.photoURL || "";
            const authorUsername = getSafePublicUsername(
              viewerProfile || currentUser
            );

            addDoc(collection(db, "news_hub_notifications"), {
              userId: post.reporterId,
              fromUserId: uid,
              fromUserName: authorName,
              fromUserUsername: authorUsername,
              fromUserAvatar: authorAvatar,
              type: "like",
              title: "New Like",
              body: `liked your Loop: "${(
                post.description ||
                post.title ||
                ""
              ).slice(0, 36)}"`,
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
    }
  };

  const handleToggleRepost = async () => {
    if (!post) return;
    if (!currentUser?.uid) {
      notify("Please sign in to repost.", "info");
      navigate("/signin");
      return;
    }
    triggerHaptic();
    const uid = currentUser.uid;
    const currentList = Array.isArray(post.repostedByUserIds)
      ? post.repostedByUserIds
      : [];
    const alreadyReposted = currentList.includes(uid);
    const nextList = alreadyReposted
      ? currentList.filter((x) => x !== uid)
      : [...currentList, uid];
    const nextCount = Math.max(
      0,
      Number(post.repostsCount || currentList.length || 0) +
        (alreadyReposted ? -1 : 1)
    );
    const reposterHandle =
      getSafePublicUsername(viewerProfile || currentUser) ||
      getSafeDisplayName(viewerProfile || currentUser, "Member");

    setPost((prev) =>
      prev
        ? {
            ...prev,
            repostedByUserIds: nextList,
            repostsCount: nextCount,
            repostedByUserName: alreadyReposted
              ? prev.repostedByUserName
              : reposterHandle,
          }
        : null
    );

    if (!post.id.startsWith("showcase_")) {
      try {
        await updateDoc(doc(db, "scam_posts", post.id), {
          repostedByUserIds: alreadyReposted
            ? arrayRemove(uid)
            : arrayUnion(uid),
          repostsCount: nextCount,
          ...(alreadyReposted ? {} : { repostedByUserName: reposterHandle }),
        });

        if (!alreadyReposted && post.reporterId && post.reporterId !== uid) {
          addDoc(collection(db, "news_hub_notifications"), {
            userId: post.reporterId,
            fromUserId: uid,
            fromUserName: getSafeDisplayName(
              viewerProfile || currentUser,
              "Someone"
            ),
            fromUserUsername: reposterHandle,
            fromUserAvatar:
              (viewerProfile as any)?.photoURL || currentUser.photoURL || "",
            type: "repost",
            title: "Reposted your Loop",
            body: `reposted your Loop: "${(
              post.description ||
              post.title ||
              ""
            ).slice(0, 36)}"`,
            mediaThumbnail: post.images?.[0] || "",
            targetId: post.id,
            isRead: false,
            read: false,
            createdAt: Date.now(),
            link: `/loops/post/${post.id}`,
          }).catch(() => {});
        }
      } catch {}
    }

    notify(
      alreadyReposted ? "Removed repost" : "Reposted to Loops",
      "success"
    );
  };

  const handleConfirmScamVote = async () => {
    if (!post) return;
    triggerHaptic();
    const uid = currentUser?.uid || "guest_local";
    const alreadyVoted = post.votedUserIds?.includes(uid);
    const nextVotes = Math.max(0, (post.votes || 0) + (alreadyVoted ? -1 : 1));
    const nextVoters = alreadyVoted
      ? (post.votedUserIds || []).filter((x) => x !== uid)
      : [...(post.votedUserIds || []), uid];

    setPost((prev) =>
      prev ? { ...prev, votes: nextVotes, votedUserIds: nextVoters } : null
    );

    if (!post.id.startsWith("showcase_")) {
      try {
        await updateDoc(doc(db, "scam_posts", post.id), {
          votes: increment(alreadyVoted ? -1 : 1),
          votedUserIds: alreadyVoted ? arrayRemove(uid) : arrayUnion(uid),
        });
      } catch {}
    }
    notify(
      alreadyVoted ? "Removed report confirmation" : "Confirmed scam report!",
      "success"
    );
  };

  const handleToggleSave = async () => {
    if (!post) return;
    triggerHaptic();
    const next = await toggleSavePostHelper(post, currentUser?.uid);
    setSavedIds(getSavedPostIdsLocal());
    notify(next ? "Saved to Loops" : "Removed from saved", "info");
  };

  const handleUpdateReplySettings = async (
    nextMode: ReplyPermissionMode,
    nextReview: boolean
  ) => {
    if (!post) return;
    setPost((prev) =>
      prev
        ? {
            ...prev,
            replyPermission: nextMode,
            reviewApproveReplies: nextReview,
          }
        : null
    );
    if (!post.id.startsWith("showcase_")) {
      try {
        await updateDoc(doc(db, "scam_posts", post.id), {
          replyPermission: nextMode,
          reviewApproveReplies: nextReview,
        });
      } catch {}
    }
  };

  const handleCommentPhotoPick = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !post) return;
    setProcessingCommentImg(true);
    triggerHaptic();
    try {
      const scam = isScamPostRecord(post);
      const res = scam
        ? await applyWatermarkToImage(file, {
            watermarkText: "SCAM ALERT • DEEP SHOP",
            scamLocation: post.scamLocation || "Comment Evidence",
          })
        : await processCleanImage(file);
      const hostedUrl = await uploadDataUrlToImgbb(
        res.dataUrl,
        `comment-${Date.now()}.jpg`,
        { requireRemote: true }
      );
      setCommentImage(hostedUrl);
    } catch {
      notify("Failed to attach image", "error");
    } finally {
      setProcessingCommentImg(false);
      e.target.value = "";
    }
  };

  const handleSubmitComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      notify("Please sign in to reply.", "info");
      navigate("/signin");
      return;
    }
    if (submittingCommentRef.current) return;
    if (!post || (!commentText.trim() && !commentImage)) return;

    submittingCommentRef.current = true;
    setIsSubmittingComment(true);
    triggerHaptic();

    const authorName = getSafeDisplayName(
      viewerProfile || currentUser,
      "Community Member"
    );
    const authorAvatar =
      (viewerProfile as any)?.photoURL || currentUser?.photoURL || "";
    const isLocalOnlyPost =
      post.id.startsWith("showcase_") || post.id.startsWith("post_");

    const commentRef = !isLocalOnlyPost
      ? doc(collection(db, "scam_posts", post.id, "comments"))
      : null;
    const commentId = commentRef ? commentRef.id : `cmt_${Date.now()}`;

    const isPostOwnerOrAdmin =
      isAdmin || Boolean(currentUser?.uid && currentUser.uid === post.reporterId);
    const requiresModeration = Boolean(
      post.reviewApproveReplies && !isPostOwnerOrAdmin
    );

    const newCommentObj: Omit<ScamComment, "id"> = {
      postId: post.id,
      userId: currentUser?.uid || "guest_local",
      userName: authorName,
      userAvatar: authorAvatar,
      text: commentText.trim(),
      ...(commentImage ? { imageUrl: commentImage } : {}),
      ...(replyingTo
        ? {
            replyToCommentId: replyingTo.commentId,
            replyToUserName: replyingTo.userName,
          }
        : {}),
      status: requiresModeration ? "pending_approval" : "approved",
      createdAt: Date.now(),
    };

    const fullComment: ScamComment = { id: commentId, ...newCommentObj };

    setComments((prev) =>
      prev.some((c) => c.id === commentId) ? prev : [...prev, fullComment]
    );
    if (!requiresModeration) {
      setPost((prev) =>
        prev ? { ...prev, commentsCount: (prev.commentsCount || 0) + 1 } : null
      );
    } else {
      notify("Reply submitted for author review & approval.", "info");
    }
    setCommentText("");
    setCommentImage(null);
    setReplyingTo(null);
    setShowExpandedComposer(false);

    try {
      if (commentRef) {
        await setDoc(commentRef, newCommentObj);
        if (!requiresModeration) {
          await updateDoc(doc(db, "scam_posts", post.id), {
            commentsCount: increment(1),
          });
        }
        if (post.reporterId && post.reporterId !== currentUser?.uid) {
          addDoc(collection(db, "news_hub_notifications"), {
            userId: post.reporterId,
            fromUserId: currentUser?.uid || "guest",
            fromUserName: authorName,
            fromUserUsername:
              getSafePublicUsername(viewerProfile || currentUser) || authorName,
            fromUserAvatar: authorAvatar,
            type: "comment",
            title: `${authorName} replied to your Loop`,
            body: newCommentObj.text.slice(0, 80) || "Sent an attachment",
            mediaThumbnail: post.images?.[0] || "",
            targetId: post.id,
            createdAt: Date.now(),
            read: false,
            isRead: false,
            link: `/loops/post/${post.id}#comments`,
          }).catch(() => {});
        }
      } else {
        const allLocal = JSON.parse(
          localStorage.getItem("deep_post_comments") || "{}"
        );
        const list: ScamComment[] = Array.isArray(allLocal[post.id])
          ? allLocal[post.id]
          : [];
        if (!list.some((c) => c.id === commentId)) {
          list.push(fullComment);
        }
        allLocal[post.id] = list;
        localStorage.setItem("deep_post_comments", JSON.stringify(allLocal));
      }
    } catch {
      try {
        const allLocal = JSON.parse(
          localStorage.getItem("deep_post_comments") || "{}"
        );
        const list: ScamComment[] = Array.isArray(allLocal[post.id])
          ? allLocal[post.id]
          : [];
        if (!list.some((c) => c.id === commentId)) {
          list.push(fullComment);
        }
        allLocal[post.id] = list;
        localStorage.setItem("deep_post_comments", JSON.stringify(allLocal));
      } catch {}
    } finally {
      submittingCommentRef.current = false;
      setIsSubmittingComment(false);
    }
  };

  const handleCommentReaction = async (
    cmt: ScamComment,
    emoji: ReactionType = "love"
  ) => {
    if (!currentUser) {
      notify("Please sign in to like replies.", "info");
      navigate("/signin");
      return;
    }
    if (!post) return;
    triggerHaptic();

    const uid = currentUser.uid;
    const currentReaction = cmt.reactions?.[uid];
    const isRemoving = Boolean(currentReaction);

    const updatedReactions = { ...(cmt.reactions || {}) };
    if (isRemoving) {
      delete updatedReactions[uid];
    } else {
      updatedReactions[uid] = emoji;
    }

    const counts: Record<string, number> = { ...(cmt.reactionsCount || {}) };
    if (currentReaction && counts[currentReaction]) {
      counts[currentReaction] = Math.max(0, counts[currentReaction] - 1);
    }
    if (!isRemoving) {
      counts[emoji] = (counts[emoji] || 0) + 1;
    }

    setComments((prev) =>
      prev.map((c) =>
        c.id === cmt.id
          ? { ...c, reactions: updatedReactions, reactionsCount: counts }
          : c
      )
    );

    if (!post.id.startsWith("showcase_") && !String(cmt.id).startsWith("cmt_")) {
      try {
        await updateDoc(
          doc(db, "scam_posts", post.id, "comments", cmt.id),
          {
            reactions: updatedReactions,
            reactionsCount: counts,
          }
        );

        if (!isRemoving && cmt.userId && cmt.userId !== uid) {
          const authorName = getSafeDisplayName(
            viewerProfile || currentUser,
            "Someone"
          );
          const authorAvatar =
            (viewerProfile as any)?.photoURL || currentUser.photoURL || "";
          const authorUsername =
            getSafePublicUsername(viewerProfile || currentUser) || authorName;

          addDoc(collection(db, "news_hub_notifications"), {
            userId: cmt.userId,
            fromUserId: uid,
            fromUserName: authorName,
            fromUserUsername: authorUsername,
            fromUserAvatar: authorAvatar,
            type: "like",
            title: "Liked your reply",
            body: `liked your reply: "${(cmt.text || "").slice(0, 40)}"`,
            targetId: post.id,
            isRead: false,
            read: false,
            createdAt: Date.now(),
            link: `/loops/post/${post.id}#comments`,
          }).catch(() => {});
        }
      } catch {}
    }
  };

  const handleStartEditComment = (cmt: ScamComment) => {
    triggerHaptic();
    setActiveCommentMenuId(null);
    setEditingCommentId(cmt.id);
    setEditingCommentText(cmt.text || "");
  };

  const handleSaveCommentEdit = async (cmt: ScamComment) => {
    if (!post) return;
    const trimmed = editingCommentText.trim();
    if (!trimmed && !cmt.imageUrl) {
      notify("Reply cannot be empty", "error");
      return;
    }
    setSavingCommentEdit(true);
    triggerHaptic();
    const updatedAt = Date.now();

    setComments((prev) =>
      prev.map((item) =>
        item.id === cmt.id
          ? { ...item, text: trimmed, isEdited: true, updatedAt }
          : item
      )
    );
    setEditingCommentId(null);
    setEditingCommentText("");

    try {
      const allLocal = JSON.parse(
        localStorage.getItem("deep_post_comments") || "{}"
      );
      if (Array.isArray(allLocal[post.id])) {
        allLocal[post.id] = allLocal[post.id].map((item: ScamComment) =>
          item.id === cmt.id
            ? { ...item, text: trimmed, isEdited: true, updatedAt }
            : item
        );
        localStorage.setItem("deep_post_comments", JSON.stringify(allLocal));
      }
    } catch {}

    if (!post.id.startsWith("showcase_") && !String(cmt.id).startsWith("cmt_")) {
      try {
        await updateDoc(doc(db, "scam_posts", post.id, "comments", cmt.id), {
          text: trimmed,
          isEdited: true,
          updatedAt,
        });
      } catch {
        notify("Could not sync reply edit", "error");
      }
    }
    setSavingCommentEdit(false);
    notify("Reply updated", "success");
  };

  const handleDeleteComment = async (cmt: ScamComment) => {
    if (!post) return;
    triggerHaptic();
    setActiveCommentMenuId(null);
    const ok = await confirm({
      title: "Delete Reply?",
      message: "Are you sure you want to delete this reply?",
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;

    setComments((prev) => prev.filter((item) => item.id !== cmt.id));
    setPost((prev) =>
      prev
        ? { ...prev, commentsCount: Math.max(0, (prev.commentsCount || 1) - 1) }
        : null
    );
    if (editingCommentId === cmt.id) {
      setEditingCommentId(null);
      setEditingCommentText("");
    }

    try {
      const allLocal = JSON.parse(
        localStorage.getItem("deep_post_comments") || "{}"
      );
      if (Array.isArray(allLocal[post.id])) {
        allLocal[post.id] = allLocal[post.id].filter(
          (item: ScamComment) => item.id !== cmt.id
        );
        localStorage.setItem("deep_post_comments", JSON.stringify(allLocal));
      }
    } catch {}

    if (!post.id.startsWith("showcase_") && !String(cmt.id).startsWith("cmt_")) {
      try {
        await deleteDoc(doc(db, "scam_posts", post.id, "comments", cmt.id));
        await updateDoc(doc(db, "scam_posts", post.id), {
          commentsCount: increment(-1),
        });
      } catch {}
    }
    notify("Reply deleted", "info");
  };

  const handleApproveComment = async (cmt: ScamComment) => {
    if (!post) return;
    triggerHaptic();
    setActiveCommentMenuId(null);
    setComments((prev) =>
      prev.map((item) =>
        item.id === cmt.id ? { ...item, status: "approved" } : item
      )
    );
    setPost((prev) =>
      prev ? { ...prev, commentsCount: (prev.commentsCount || 0) + 1 } : null
    );

    if (!post.id.startsWith("showcase_") && !String(cmt.id).startsWith("cmt_")) {
      try {
        await updateDoc(doc(db, "scam_posts", post.id, "comments", cmt.id), {
          status: "approved",
        });
        await updateDoc(doc(db, "scam_posts", post.id), {
          commentsCount: increment(1),
        });
      } catch {}
    }
    notify("Reply approved and published!", "success");
  };

  const handleDeletePost = async () => {
    if (!post) return;
    triggerHaptic();
    setShowHeaderMenu(false);
    const ok = await confirm({
      title: "Delete Loop?",
      message: "This Loop and its replies will be permanently removed.",
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;

    try {
      if (!post.id.startsWith("showcase_")) {
        await deleteDoc(doc(db, "scam_posts", post.id));
      }
      const existing = JSON.parse(
        localStorage.getItem("deep_scam_posts") || "[]"
      );
      localStorage.setItem(
        "deep_scam_posts",
        JSON.stringify(existing.filter((p: any) => p.id !== post.id))
      );
      notify("Loop deleted", "info");
      navigate("/loops");
    } catch {
      notify("Could not delete Loop", "error");
    }
  };

  if (loading) {
    return (
      <>
        <SEO
          title="Loop — Loops"
          description="Read this community post on Loops."
          exactTitle
        />
        <NewsPostDetailPageSkeleton />
      </>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen loops-surface flex items-center justify-center p-6">
        <SEO
          title="Loop Not Found — Loops"
          description="This Loop is no longer available."
          exactTitle
        />
        <div className="rounded-3xl border loops-divider p-8 max-w-md w-full text-center space-y-4">
          <p className="text-base font-bold text-zinc-900 dark:text-white">
            Loop not found
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            It may have been removed or expired.
          </p>
          <button
            type="button"
            onClick={() => navigate("/loops")}
            className="px-6 py-2.5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold cursor-pointer"
          >
            Back to Loops
          </button>
        </div>
      </div>
    );
  }

  const isScam = isScamPostRecord(post);
  const uid = currentUser?.uid || "guest_local";
  const myReaction = hasUserReactedToPost(post, currentUser?.uid, localReaction)
    ? post.reactions?.[uid] || localReaction || "love"
    : null;
  const isReposted = Boolean(
    currentUser?.uid && post.repostedByUserIds?.includes(currentUser.uid)
  );
  const repostCount = Number(
    post.repostsCount ?? post.repostedByUserIds?.length ?? 0
  );
  const shareCount = Number(post.sharesCount || 0);
  const saved =
    savedIds.includes(post.id) ||
    Boolean(currentUser?.uid && post.savedByUserIds?.includes(currentUser.uid));
  const canManage =
    isAdmin || Boolean(currentUser?.uid && currentUser.uid === post.reporterId);

  const authorHandle =
    getSafePublicUsername(postAuthorProfile, post.reporterName) ||
    getSafeDisplayName(postAuthorProfile, post.reporterName || "member");
  const authorAvatarUrl =
    (postAuthorProfile as any)?.photoURL || post.reporterAvatar || "";
  const isAuthorVerified = Boolean(
    postAuthorProfile?.isVerifiedBadge ||
      postAuthorProfile?.isCreator ||
      postAuthorProfile?.role === "admin" ||
      postAuthorProfile?.role === "seller"
  );

  const viewerAvatarUrl =
    (viewerProfile as any)?.photoURL || currentUser?.photoURL || "";

  const replyMode = post.replyPermission || "anyone";
  const viewerUsername = getSafePublicUsername(
    viewerProfile || currentUser
  ).toLowerCase();
  const viewerDisplayName = getSafeDisplayName(
    viewerProfile || currentUser,
    ""
  ).toLowerCase();
  const captionLower = (post.description || "").toLowerCase();
  const isViewerMentioned = Boolean(
    (viewerUsername && captionLower.includes(`@${viewerUsername}`)) ||
      (viewerDisplayName && captionLower.includes(`@${viewerDisplayName}`))
  );

  const canCurrentUserReply =
    canManage ||
    replyMode === "anyone" ||
    (replyMode === "followers" && isFollowing) ||
    (replyMode === "following" && authorFollowsViewer) ||
    (replyMode === "mentioned" && isViewerMentioned);

  const replyRestrictionText =
    replyMode === "followers"
      ? `Only followers of ${authorHandle} can reply.`
      : replyMode === "following"
      ? `Only profiles ${authorHandle} follows can reply.`
      : replyMode === "mentioned"
      ? "Only profiles mentioned in this Loop can reply."
      : "";

  const visibleComments = comments.filter((cmt) => {
    const statusStr = String(cmt.status || "approved");
    if (statusStr === "pending_approval") {
      return (
        canManage || Boolean(currentUser?.uid && cmt.userId === currentUser.uid)
      );
    }
    return statusStr !== "hidden";
  });

  // Build Threaded Comment Hierarchy (Root comments + Nested Replies)
  const visibleIdsSet = new Set(visibleComments.map((c) => c.id));
  const repliesByParentId = new Map<string, ScamComment[]>();
  const rootCommentsRaw: ScamComment[] = [];

  visibleComments.forEach((cmt) => {
    if (cmt.replyToCommentId && visibleIdsSet.has(cmt.replyToCommentId)) {
      const arr = repliesByParentId.get(cmt.replyToCommentId) || [];
      arr.push(cmt);
      repliesByParentId.set(cmt.replyToCommentId, arr);
    } else {
      rootCommentsRaw.push(cmt);
    }
  });

  const getCommentLikesCount = (c: ScamComment): number => {
    if (c.reactionsCount) {
      return Object.values(c.reactionsCount).reduce(
        (acc, v) => acc + (Number(v) || 0),
        0
      );
    }
    return c.reactions ? Object.keys(c.reactions).length : 0;
  };

  const sortedRootComments = [...rootCommentsRaw].sort((a, b) => {
    if (sortMode === "recent") {
      return (b.createdAt || 0) - (a.createdAt || 0);
    }
    const aScore =
      getCommentLikesCount(a) * 2 +
      (repliesByParentId.get(a.id)?.length || 0) * 3;
    const bScore =
      getCommentLikesCount(b) * 2 +
      (repliesByParentId.get(b.id)?.length || 0) * 3;
    if (bScore !== aScore) return bScore - aScore;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  const totalViewsDisplay = Math.max(0, Number(post.views || 0)).toLocaleString();

  const renderSingleCommentBody = (
    cmt: ScamComment,
    opts: {
      isReply: boolean;
      rootParentId: string;
      directReplyCount: number;
    }
  ) => {
    const cmtProfile = commentProfilesMap[cmt.userId];
    const cmtHandle =
      getSafePublicUsername(cmtProfile, cmt.userName) ||
      getSafeDisplayName(cmtProfile, cmt.userName || "member");
    const cmtVerified = Boolean(
      cmtProfile?.isVerifiedBadge ||
        cmtProfile?.isCreator ||
        cmtProfile?.role === "admin" ||
        cmtProfile?.role === "seller"
    );
    const isCommentByPostAuthor = Boolean(
      post.reporterId && cmt.userId === post.reporterId
    );
    const likedByPostAuthor = Boolean(
      post.reporterId && cmt.reactions?.[post.reporterId]
    );
    const viewerLikedComment = Boolean(
      currentUser?.uid && cmt.reactions?.[currentUser.uid]
    );
    const cmtLikes = getCommentLikesCount(cmt);

    const isCommentOwner = Boolean(
      currentUser?.uid && currentUser.uid === cmt.userId
    );
    const canDeleteCmt =
      isCommentOwner ||
      isAdmin ||
      Boolean(currentUser?.uid && currentUser.uid === post.reporterId);
    const isPending = String(cmt.status) === "pending_approval";
    const isEditingThis = editingCommentId === cmt.id;

    return (
      <div className="flex-1 min-w-0">
        {/* Top Row: Username + Verified + Author Badge + Time --- Right: Author-Liked Avatar+Heart & More menu */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <button
              type="button"
              onClick={() => {
                if (cmt.userId && cmt.userId !== "guest_local") {
                  triggerHaptic();
                  navigate(`/loops/profile/${cmt.userId}`);
                }
              }}
              className="text-[14.5px] font-semibold text-zinc-950 dark:text-white hover:underline truncate cursor-pointer"
            >
              {cmtHandle}
            </button>
            {cmtVerified && <VerifiedLoopBadge className="w-3.5 h-3.5" />}
            {isCommentByPostAuthor && (
              <span className="px-2 py-0.5 rounded-full bg-[#E8F4FF] dark:bg-[#0095F6]/20 text-[#0095F6] text-[11px] font-semibold leading-none">
                Author
              </span>
            )}
            <span className="text-[13.5px] text-zinc-400 dark:text-zinc-500 tabular-nums shrink-0">
              {formatLoopCompactTime(cmt.createdAt)}
            </span>
            {cmt.isEdited && (
              <span className="text-[12px] text-zinc-400 dark:text-zinc-500">
                · Edited
              </span>
            )}
            {isPending && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10.5px] font-semibold">
                Pending review
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 relative">
            {/* Author-Liked Mini Avatar + Red Heart Badge (IMG_5091 & IMG_5094) */}
            {likedByPostAuthor && (
              <div
                className="relative flex items-center"
                title={`Liked by ${authorHandle}`}
              >
                <GenericPersonAvatar
                  src={authorAvatarUrl}
                  name={authorHandle}
                  sizeClass="w-[19px] h-[19px]"
                />
                <span className="absolute -left-1.5 -bottom-0.5 w-3.5 h-3.5 rounded-full bg-white dark:bg-[#0D0E12] flex items-center justify-center">
                  <Heart className="w-2.5 h-2.5 fill-[#FF3040] text-[#FF3040]" />
                </span>
              </div>
            )}

            {(isCommentOwner || canDeleteCmt || (isPending && canManage)) && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setActiveCommentMenuId((prev) =>
                      prev === cmt.id ? null : cmt.id
                    )
                  }
                  className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
                  aria-label="Reply options"
                >
                  <span className="text-[15px] leading-none tracking-widest font-bold -mt-1">
                    ···
                  </span>
                </button>
                <AnimatePresence>
                  {activeCommentMenuId === cmt.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.94, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.94, y: -4 }}
                      transition={{ duration: 0.14 }}
                      className="loops-liquid-popover absolute right-0 top-8 z-30 min-w-[156px] rounded-2xl py-1.5 px-1.5"
                    >
                      {isPending && canManage && (
                        <button
                          type="button"
                          onClick={() => handleApproveComment(cmt)}
                          className="w-full px-3 py-2 rounded-xl flex items-center gap-2 text-[13px] font-semibold text-emerald-600 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve</span>
                        </button>
                      )}
                      {isCommentOwner && (
                        <button
                          type="button"
                          onClick={() => handleStartEditComment(cmt)}
                          className="w-full px-3 py-2 rounded-xl flex items-center gap-2 text-[13px] font-medium text-zinc-900 dark:text-zinc-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                      )}
                      {canDeleteCmt && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(cmt)}
                          className="w-full px-3 py-2 rounded-xl flex items-center gap-2 text-[13px] font-medium text-[#FF3040] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Comment Body or Inline Edit */}
        {isEditingThis ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={editingCommentText}
              onChange={(e) => setEditingCommentText(e.target.value)}
              rows={2}
              className="w-full rounded-2xl border loops-divider bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-[14.5px] outline-none resize-none"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={savingCommentEdit}
                onClick={() => handleSaveCommentEdit(cmt)}
                className="px-3.5 py-1.5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold cursor-pointer"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingCommentId(null);
                  setEditingCommentText("");
                }}
                className="px-3.5 py-1.5 rounded-full border loops-divider text-xs font-medium text-zinc-600 dark:text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {cmt.text && (
              <p className="mt-0.5 text-[15px] leading-[1.42] text-zinc-900 dark:text-zinc-100 whitespace-pre-line break-words">
                <NewsRichText text={cmt.text} />
              </p>
            )}
            {cmt.imageUrl && (
              <div className="mt-2 max-w-[260px] rounded-2xl overflow-hidden border loops-divider">
                <SmoothImage
                  src={cmt.imageUrl}
                  alt="Reply attachment"
                  wrapperClassName="w-full min-h-[120px]"
                  className="w-full h-auto max-h-64 object-cover"
                />
              </div>
            )}
          </>
        )}

        {/* Per-Comment 4-Icon Action Bar (IMG_5111) */}
        <div className="mt-2.5 flex items-center gap-5 text-zinc-900 dark:text-zinc-100">
          <button
            type="button"
            onClick={() => handleCommentReaction(cmt, "love")}
            className={`inline-flex items-center gap-1.5 text-[13px] tabular-nums transition active:scale-90 cursor-pointer ${
              viewerLikedComment
                ? "text-[#FF3040]"
                : "text-zinc-800 dark:text-zinc-200 hover:text-[#FF3040]"
            }`}
            aria-label="Like reply"
          >
            <LoopHeartIcon
              className="w-[18px] h-[18px]"
              filled={Boolean(viewerLikedComment)}
            />
            {cmtLikes > 0 && <span>{formatLoopCount(cmtLikes)}</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              setReplyingTo({
                commentId: opts.rootParentId,
                userName: cmtHandle,
              });
              commentInputRef.current?.focus();
            }}
            className="inline-flex items-center gap-1.5 text-[13px] tabular-nums text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition active:scale-90 cursor-pointer"
            aria-label="Reply to comment"
          >
            <LoopCommentIcon className="w-[18px] h-[18px]" />
            {!opts.isReply && opts.directReplyCount > 0 && (
              <span>{formatLoopCount(opts.directReplyCount)}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              navigate(`/loops/create?quotePostId=${post.id}`);
            }}
            className="inline-flex items-center gap-1.5 text-[13px] text-zinc-800 dark:text-zinc-200 hover:text-[#00BA7C] transition active:scale-90 cursor-pointer"
            aria-label="Quote in Loop"
          >
            <LoopRepeatIcon className="w-[18px] h-[18px]" />
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              setShowShareModal(true);
            }}
            className="inline-flex items-center gap-1.5 text-[13px] text-zinc-800 dark:text-zinc-200 hover:text-[#0095F6] transition active:scale-90 cursor-pointer"
            aria-label="Share reply link"
          >
            <LoopSendIcon className="w-[17.5px] h-[17.5px]" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen loops-surface text-zinc-950 dark:text-zinc-100 font-sans pb-36">
      <SEO
        title={
          (post.title && post.title !== "Feed Post" ? post.title.trim() : "") ||
          post.description?.trim().split(/\r?\n/)[0]?.slice(0, 80) ||
          `${authorHandle} on Loops`
        }
        description={
          post.description?.trim() ||
          (post.title && post.title !== "Feed Post" ? post.title.trim() : "") ||
          `Loop shared by ${authorHandle} on Loops.`
        }
        image={post.images?.[0] || authorAvatarUrl || undefined}
        type="article"
        exactTitle
      />

      {/* Centered Loops Column */}
      <div className="max-w-[620px] mx-auto min-h-screen sm:border-x loops-divider">
        {/* Sticky Top Header (IMG_5091: < | Loop + N views | Bell + Circle More) */}
        <header className="sticky top-0 z-30 loops-surface/95 backdrop-blur-md border-b loops-divider px-3 sm:px-4 h-[56px] flex items-center justify-between">
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
            className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-zinc-950 dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
            aria-label="Back"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.1]" />
          </button>

          <div className="flex flex-col items-center justify-center leading-tight select-none">
            <span className="loops-wordmark text-[16px] text-zinc-950 dark:text-white">
              Loop
            </span>
            <span className="text-[12px] text-zinc-400 dark:text-zinc-500 tabular-nums">
              {totalViewsDisplay} {Number(post.views || 0) === 1 ? "view" : "views"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 relative" ref={headerMenuRef}>
            <button
              type="button"
              onClick={handleToggleWatchPost}
              className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-950 dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
              aria-label="Toggle Loop notifications"
              title="Loop notifications"
            >
              {postWatchEnabled ? (
                <BellRing className="w-[21px] h-[21px] fill-current" />
              ) : (
                <Bell className="w-[21px] h-[21px] stroke-[1.9]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setShowHeaderMenu(true);
              }}
              className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-950 dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
              aria-label="About this post and options"
            >
              <LoopPostMenuLinesIcon className="w-[22px] h-[22px]" />
            </button>
          </div>
        </header>

        {/* MAIN LOOP POST BLOCK (IMG_5091) */}
        <article className="px-4 pt-3.5 pb-3 space-y-3">
          {/* Author Row with Avatar + Popover (NO Threads logo or watermark) */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0" ref={avatarPopoverRef}>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    if (
                      currentUser?.uid &&
                      currentUser.uid === post.reporterId
                    ) {
                      navigate(`/loops/profile/${post.reporterId}`);
                    } else {
                      setShowAvatarPopover((s) => !s);
                    }
                  }}
                  className="relative block rounded-full cursor-pointer"
                  aria-label={authorHandle}
                >
                  <GenericPersonAvatar
                    src={authorAvatarUrl}
                    name={authorHandle}
                    sizeClass="w-10 h-10"
                  />
                  {(!currentUser?.uid ||
                    currentUser.uid !== post.reporterId) && (
                    <span className="loops-plus-badge absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-xs">
                      {isFollowing ? (
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      ) : (
                        <Plus className="w-2.5 h-2.5 stroke-[3]" />
                      )}
                    </span>
                  )}
                </button>

                {/* Liquid Glass Follow + Visit Profile Popover (IMG_5090) */}
                <AnimatePresence>
                  {showAvatarPopover && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.92, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, y: 4 }}
                      transition={{ duration: 0.16 }}
                      className="loops-liquid-popover absolute left-0 top-12 z-40 w-[230px] rounded-[28px] p-2.5 space-y-1"
                    >
                      <button
                        type="button"
                        disabled={followBusy}
                        onClick={handleToggleFollowAuthor}
                        className="w-full px-3.5 py-2.5 rounded-2xl flex items-center gap-3 text-[16px] font-medium text-zinc-950 dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
                      >
                        {isFollowing ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 stroke-[1.9] shrink-0" />
                            <span>Following</span>
                          </>
                        ) : (
                          <>
                            <PlusCircle className="w-5 h-5 stroke-[1.9] shrink-0" />
                            <span>Follow</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowAvatarPopover(false);
                          navigate(`/loops/profile/${post.reporterId}`);
                        }}
                        className="w-full px-3.5 py-2.5 rounded-2xl flex items-center gap-3 text-[16px] font-medium text-zinc-950 dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
                      >
                        <UserIcon className="w-5 h-5 stroke-[1.9] shrink-0" />
                        <span>Visit profile</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/loops/profile/${post.reporterId}`)
                    }
                    className="text-[15px] font-semibold text-zinc-950 dark:text-white hover:underline truncate cursor-pointer"
                  >
                    {authorHandle}
                  </button>
                  {isAuthorVerified && (
                    <VerifiedLoopBadge className="w-3.5 h-3.5" />
                  )}
                  {post.postTag && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/loops/search?q=${encodeURIComponent(
                            post.postTag || ""
                          )}`
                        )
                      }
                      className="inline-flex items-center gap-0.5 text-[14px] font-semibold text-[#0095F6] hover:underline cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{post.postTag}</span>
                    </button>
                  )}
                  <span className="text-[14px] text-zinc-400 dark:text-zinc-500 tabular-nums">
                    {formatLoopCompactTime(post.createdAt)}
                  </span>
                </div>

                {(post.isAiGenerated ||
                  post.locationTag ||
                  post.isGhostPost ||
                  Boolean(
                    post.scheduledAt && post.scheduledAt > Date.now()
                  )) && (
                  <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[11.5px] text-zinc-400 dark:text-zinc-500">
                    {post.locationTag && (
                      <span className="inline-flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{post.locationTag}</span>
                      </span>
                    )}
                    {post.isAiGenerated && (
                      <span className="inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#0095F6] shrink-0" />
                        <span>AI label</span>
                      </span>
                    )}
                    {post.isGhostPost && (
                      <span className="inline-flex items-center gap-1">
                        <DottedGhostCatIcon className="w-3 h-3 shrink-0" />
                        <span>Ghost · 24h</span>
                      </span>
                    )}
                    {post.scheduledAt && post.scheduledAt > Date.now() && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>Scheduled</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Full-Width Post Body */}
          {post.description && (
            <div
              className={
                post.textStyle === "quote"
                  ? "rounded-2xl bg-zinc-50 dark:bg-zinc-900 p-3.5 border-l-3 border-zinc-900 dark:border-white"
                  : ""
              }
            >
              <p
                className={`whitespace-pre-line break-words text-zinc-950 dark:text-zinc-100 ${
                  post.textStyle === "large"
                    ? "text-[18px] font-semibold leading-snug"
                    : post.textStyle === "quote"
                    ? "text-[15.5px] italic leading-relaxed"
                    : "text-[15.5px] leading-[1.46]"
                }`}
              >
                <NewsRichText text={post.description} />
              </p>
            </div>
          )}

          {/* Link Previews */}
          <NewsLinkPreviewCards text={post.description} />

          {/* Post Media — Full-bleed edge-to-edge zero-radius photos & carousel matching Post Card 1:1 */}
          {Array.isArray(post.images) && post.images.length === 1 && (
            <div
              onClick={() => {
                triggerHaptic();
                navigate(`/loops/photo/${post.id}/0`);
              }}
              className="loops-edge-media -mx-4 rounded-none bg-zinc-100 dark:bg-zinc-900 overflow-hidden cursor-pointer"
            >
              <SmoothImage
                src={post.images[0]}
                alt={post.title || authorHandle}
                eager
                wrapperClassName="w-full rounded-none"
                className="w-full max-h-[640px] object-cover block rounded-none"
              />
            </div>
          )}

          {Array.isArray(post.images) && post.images.length > 1 && (
            <div className="-mx-4">
              <div
                onTouchStart={(e) => {
                  detailTouchStartXRef.current = e.touches[0]?.clientX ?? null;
                }}
                onTouchEnd={(e) => {
                  if (detailTouchStartXRef.current === null || !post.images) return;
                  const endX =
                    e.changedTouches[0]?.clientX ?? detailTouchStartXRef.current;
                  const delta = detailTouchStartXRef.current - endX;
                  detailTouchStartXRef.current = null;
                  if (Math.abs(delta) > 40) {
                    triggerHaptic();
                    if (
                      delta > 0 &&
                      detailCarouselIdx < post.images.length - 1
                    ) {
                      preloadImageUrl(post.images[detailCarouselIdx + 2]);
                      setDetailCarouselIdx((i) => i + 1);
                    } else if (delta < 0 && detailCarouselIdx > 0) {
                      setDetailCarouselIdx((i) => i - 1);
                    }
                  }
                }}
                className="loops-edge-media relative w-full rounded-none bg-zinc-100 dark:bg-zinc-900 overflow-hidden group"
              >
                <SmoothImage
                  src={post.images[detailCarouselIdx] || post.images[0]}
                  alt={`${authorHandle} slide ${detailCarouselIdx + 1}`}
                  eager
                  onLoad={() => {
                    if (post.images && post.images[detailCarouselIdx + 1]) {
                      preloadImageUrl(post.images[detailCarouselIdx + 1]);
                    }
                  }}
                  onClick={() => {
                    triggerHaptic();
                    navigate(`/loops/photo/${post.id}/${detailCarouselIdx}`);
                  }}
                  wrapperClassName="w-full rounded-none"
                  className="w-full max-h-[640px] object-cover block cursor-pointer select-none rounded-none"
                />

                {/* Top-Right Liquid-Glass Image Count Pill (Strictly only when > 1 image) */}
                <div className="loops-media-count-pill absolute top-3 right-3 z-20 px-2.5 py-1 text-[12px] font-semibold tabular-nums leading-none select-none pointer-events-none">
                  {detailCarouselIdx + 1}/{post.images.length}
                </div>

                {detailCarouselIdx > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic();
                      setDetailCarouselIdx((i) => Math.max(0, i - 1));
                    }}
                    aria-label="Previous slide"
                    className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-white shadow-md items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

                {detailCarouselIdx < post.images.length - 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic();
                      setDetailCarouselIdx((i) =>
                        Math.min((post.images?.length || 1) - 1, i + 1)
                      );
                    }}
                    aria-label="Next slide"
                    className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-white shadow-md items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Centered Carousel Pagination Dots BELOW Media matching Post Card */}
              <div className="flex items-center justify-center gap-1.5 pt-3 pb-0.5">
                {post.images.map((_, idx) => {
                  const isCurrent = idx === detailCarouselIdx;
                  const dist = Math.abs(idx - detailCarouselIdx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailCarouselIdx(idx);
                      }}
                      aria-label={`Slide ${idx + 1}`}
                      className={`rounded-full transition-all cursor-pointer ${
                        isCurrent
                          ? "w-[6px] h-[6px] bg-[#4F5BD5] dark:bg-[#5B6EF5]"
                          : dist >= 3
                          ? "w-[4px] h-[4px] bg-[#D4D4D8] dark:bg-zinc-700"
                          : "w-[5.5px] h-[5.5px] bg-[#D4D4D8] dark:bg-zinc-600"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Non-photo rich attachments (Video, GIF, Voice, Music, Poll, Snippet, Quote, Thread items) */}
          <NewsPostMedia
            post={{ ...post, images: [] }}
            onOpenImage={(idx) => navigate(`/loops/photo/${post.id}/${idx}`)}
          />

          {/* Conditional Scam Report Dossier (Only when post is actually a Scam Report) */}
          {isScam && (
            <div className="rounded-2xl bg-rose-50/75 dark:bg-rose-950/25 border border-rose-200/80 dark:border-rose-900/50 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-semibold text-xs min-w-0">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    Scam Alert
                    {post.scamLocation ? ` · ${post.scamLocation}` : ""}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleConfirmScamVote}
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    post.votedUserIds?.includes(uid)
                      ? "bg-rose-600 text-white"
                      : "bg-white dark:bg-zinc-900 text-rose-600 border border-rose-200 dark:border-zinc-700"
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Confirm ({totalReactions})</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {post.scammerPhone && (
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyField("Phone", post.scammerPhone || "")
                    }
                    className="p-2 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 truncate font-mono">
                      <Phone className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      {post.scammerPhone}
                    </span>
                    {copiedField === "Phone" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                  </button>
                )}

                {post.scammerBkash && (
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyField("Account", post.scammerBkash || "")
                    }
                    className="p-2 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 truncate font-mono">
                      <CreditCard className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      {post.scammerBkash}
                    </span>
                    {copiedField === "Account" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                  </button>
                )}

                {post.scammedAmount ? (
                  <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 font-semibold text-rose-600 tabular-nums">
                    Reported Loss: ৳{post.scammedAmount.toLocaleString()}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* 4-Icon Loops Engagement Bar (IMG_5111: Heart, Comment, Repost, Send) */}
          <div className="pt-1 flex items-center gap-6 text-zinc-950 dark:text-zinc-100">
            <button
              type="button"
              onClick={() => handleReaction("love")}
              className={`inline-flex items-center gap-1.5 text-[14px] tabular-nums transition active:scale-90 cursor-pointer ${
                myReaction
                  ? "text-[#FF3040]"
                  : "text-zinc-900 dark:text-zinc-100 hover:text-[#FF3040]"
              }`}
              aria-label="Like"
            >
              <LoopHeartIcon
                className="w-[21px] h-[21px]"
                filled={Boolean(myReaction)}
              />
              {totalReactions > 0 && (
                <span>{formatLoopCount(totalReactions)}</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                commentInputRef.current?.focus();
              }}
              className="inline-flex items-center gap-1.5 text-[14px] tabular-nums text-zinc-900 dark:text-zinc-100 hover:opacity-75 transition active:scale-90 cursor-pointer"
              aria-label="Reply"
            >
              <LoopCommentIcon className="w-[21px] h-[21px]" />
              {(visibleComments.length || post.commentsCount || 0) > 0 && (
                <span>
                  {formatLoopCount(
                    visibleComments.length || post.commentsCount || 0
                  )}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleToggleRepost}
              className={`inline-flex items-center gap-1.5 text-[14px] tabular-nums transition active:scale-90 cursor-pointer ${
                isReposted
                  ? "text-[#00BA7C]"
                  : "text-zinc-900 dark:text-zinc-100 hover:text-[#00BA7C]"
              }`}
              aria-label="Repost"
            >
              <LoopRepeatIcon className="w-[21px] h-[21px]" />
              {repostCount > 0 && <span>{formatLoopCount(repostCount)}</span>}
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setShowShareModal(true);
              }}
              className="inline-flex items-center gap-1.5 text-[14px] tabular-nums text-zinc-900 dark:text-zinc-100 hover:text-[#0095F6] transition active:scale-90 cursor-pointer"
              aria-label="Share"
            >
              <LoopSendIcon className="w-[20px] h-[20px]" />
              {shareCount > 0 && <span>{formatLoopCount(shareCount)}</span>}
            </button>
          </div>
        </article>

        {/* DYNAMIC TOPIC SEARCH ROW (IMG_5091: 🔍 topic · N posts ›) */}
        {activeTopic && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              navigate(`/loops/search?q=${encodeURIComponent(activeTopic)}`);
            }}
            className="w-full px-4 py-3 border-t loops-divider flex items-center gap-2 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition cursor-pointer"
          >
            <Search className="w-4 h-4 text-[#0095F6] stroke-[2.2] shrink-0" />
            <span className="text-[14px] font-semibold text-[#0095F6] truncate">
              {activeTopic}
            </span>
            <span className="text-[14px] text-zinc-400 dark:text-zinc-500 inline-flex items-center gap-0.5 shrink-0 tabular-nums">
              <span>·</span>
              <span>
                {formatLoopCount(topicPostCount) || topicPostCount}{" "}
                {topicPostCount === 1 ? "post" : "posts"}
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </span>
          </button>
        )}

        {/* SORT & ACTIVITY BAR (IMG_5091 & IMG_5092: Top ⌄ | View activity ›) */}
        <div
          id="comments"
          className="px-4 py-3 border-t border-b loops-divider flex items-center justify-between relative"
        >
          <div className="relative" ref={sortPopoverRef}>
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setShowSortPopover((s) => !s);
              }}
              className="inline-flex items-center gap-1 text-[15px] font-bold text-zinc-950 dark:text-white cursor-pointer"
            >
              <span>{sortMode === "top" ? "Top" : "Recent"}</span>
              <ChevronDown className="w-4 h-4 text-zinc-400 stroke-[2.2]" />
            </button>

            {/* Frosted Liquid Glass Sort Popover (IMG_5092) */}
            <AnimatePresence>
              {showSortPopover && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="loops-liquid-popover absolute left-0 bottom-9 z-40 w-[235px] rounded-[28px] p-2.5 space-y-1"
                >
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setSortMode("top");
                      setShowSortPopover(false);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-2xl flex items-center gap-3 text-[16.5px] font-medium text-zinc-950 dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
                  >
                    <span className="w-5 flex items-center justify-center">
                      {sortMode === "top" && (
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      )}
                    </span>
                    <span>Top</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setSortMode("recent");
                      setShowSortPopover(false);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-2xl flex items-center gap-3 text-[16.5px] font-medium text-zinc-950 dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
                  >
                    <span className="w-5 flex items-center justify-center">
                      {sortMode === "recent" && (
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      )}
                    </span>
                    <span>Recent</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              navigate(`/loops/post/${post.id}/activity`);
            }}
            className="inline-flex items-center gap-0.5 text-[14.5px] font-normal text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition cursor-pointer"
          >
            <span>View activity</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* THREADED COMMENTS STREAM (IMG_5091 & IMG_5094) */}
        <section className="divide-y loops-divider">
          {commentsLoading && visibleComments.length === 0 ? (
            <div className="p-4">
              <CommentListSkeleton count={4} />
            </div>
          ) : sortedRootComments.length === 0 ? (
            <div className="py-14 px-6 text-center space-y-1">
              <p className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
                No replies yet
              </p>
              <p className="text-[13px] text-zinc-400 dark:text-zinc-500">
                Start the conversation below.
              </p>
            </div>
          ) : (
            sortedRootComments.map((rootCmt) => {
              const childReplies = (
                repliesByParentId.get(rootCmt.id) || []
              ).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
              const rootProfile = commentProfilesMap[rootCmt.userId];
              const rootAvatar =
                (rootProfile as any)?.photoURL || rootCmt.userAvatar || "";
              const hasReplies = childReplies.length > 0;

              return (
                <div key={rootCmt.id} className="px-4 py-3.5">
                  {/* Root Comment Row */}
                  <div className="flex gap-3">
                    <div className="w-9 shrink-0 flex flex-col items-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            rootCmt.userId &&
                            rootCmt.userId !== "guest_local"
                          ) {
                            navigate(`/loops/profile/${rootCmt.userId}`);
                          }
                        }}
                        className="shrink-0 cursor-pointer"
                      >
                        <GenericPersonAvatar
                          src={rootAvatar}
                          name={rootCmt.userName}
                          sizeClass="w-9 h-9"
                        />
                      </button>
                      {hasReplies && (
                        <div className="w-[2px] flex-1 bg-zinc-200 dark:bg-zinc-800 mt-1.5 rounded-full min-h-[16px]" />
                      )}
                    </div>

                    {renderSingleCommentBody(rootCmt, {
                      isReply: false,
                      rootParentId: rootCmt.id,
                      directReplyCount: childReplies.length,
                    })}
                  </div>

                  {/* Nested Threaded Replies with Curved L-Connector (IMG_5094) */}
                  {hasReplies && (
                    <div className="mt-1 space-y-3">
                      {childReplies.map((replyCmt, idx) => {
                        const isLastReply = idx === childReplies.length - 1;
                        const replyProfile =
                          commentProfilesMap[replyCmt.userId];
                        const replyAvatar =
                          (replyProfile as any)?.photoURL ||
                          replyCmt.userAvatar ||
                          "";

                        return (
                          <div key={replyCmt.id} className="flex items-stretch">
                            {/* Connector Gutter aligned under parent 36px avatar center (18px) */}
                            <div className="w-9 shrink-0 relative">
                              {/* Curved branch from x=17px into reply avatar */}
                              <div className="absolute left-[17px] top-0 w-[19px] h-[22px] border-l-2 border-b-2 border-zinc-200 dark:border-zinc-800 rounded-bl-2xl" />
                              {/* Continue vertical spine if more replies follow */}
                              {!isLastReply && (
                                <div className="absolute left-[17px] top-0 bottom-[-14px] w-[2px] bg-zinc-200 dark:bg-zinc-800" />
                              )}
                            </div>

                            <div className="flex gap-2.5 flex-1 min-w-0 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    replyCmt.userId &&
                                    replyCmt.userId !== "guest_local"
                                  ) {
                                    navigate(
                                      `/loops/profile/${replyCmt.userId}`
                                    );
                                  }
                                }}
                                className="shrink-0 self-start cursor-pointer"
                              >
                                <GenericPersonAvatar
                                  src={replyAvatar}
                                  name={replyCmt.userName}
                                  sizeClass="w-7 h-7"
                                />
                              </button>

                              {renderSingleCommentBody(replyCmt, {
                                isReply: true,
                                rootParentId: rootCmt.id,
                                directReplyCount: 0,
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </div>

      {/* STICKY BOTTOM PILL REPLY BAR (IMG_5091) */}
      <div className="fixed bottom-0 inset-x-0 z-30 loops-surface/95 backdrop-blur-md border-t loops-divider">
        <div className="max-w-[620px] mx-auto px-3.5 pt-2.5 pb-[calc(env(safe-area-inset-bottom,0px)+10px)]">
          {canCurrentUserReply ? (
            <form onSubmit={handleSubmitComment} className="space-y-1.5">
              {/* Replying-to / Attached Media Preview Strip */}
              {(replyingTo || commentImage) && (
                <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {replyingTo && (
                      <span className="text-zinc-600 dark:text-zinc-300 truncate">
                        Replying to{" "}
                        <strong className="text-zinc-950 dark:text-white">
                          @{replyingTo.userName}
                        </strong>
                      </span>
                    )}
                    {commentImage && (
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden border loops-divider shrink-0">
                        <img
                          src={commentImage}
                          alt="Attached"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setCommentImage(null)}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/75 text-white flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {replyingTo && (
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              <input
                ref={commentFileRef}
                type="file"
                accept="image/*"
                onChange={handleCommentPhotoPick}
                className="hidden"
              />

              {/* Pill Reply Bar (50px border-radius) */}
              <div className="loops-reply-pill rounded-[50px] min-h-[46px] px-3.5 py-1.5 flex items-center gap-2.5">
                <GenericPersonAvatar
                  src={viewerAvatarUrl}
                  name={getSafeDisplayName(viewerProfile || currentUser, "Me")}
                  sizeClass="w-7 h-7 shrink-0"
                />

                <input
                  ref={commentInputRef}
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={
                    replyingTo
                      ? `Reply to ${replyingTo.userName}...`
                      : "Add your reply..."
                  }
                  className="flex-1 bg-transparent text-[14.5px] text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none min-w-0"
                />

                <div className="flex items-center gap-2.5 shrink-0 text-zinc-900 dark:text-zinc-100">
                  {(commentText.trim() || commentImage) && (
                    <button
                      type="submit"
                      disabled={isSubmittingComment}
                      className="px-3 py-1 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-[12.5px] font-bold disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingComment ? "..." : "Post"}
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={processingCommentImg}
                    onClick={() => commentFileRef.current?.click()}
                    className="p-1 hover:opacity-70 transition cursor-pointer"
                    aria-label="Attach image"
                    title="Attach image"
                  >
                    <ImageIcon className="w-[20px] h-[20px] stroke-[1.9]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setShowStickersSheet(true);
                    }}
                    className="p-1 hover:opacity-70 transition cursor-pointer"
                    aria-label="Add sticker"
                    title="Stickers"
                  >
                    <StickerPeelSmileIcon className="w-[20px] h-[20px]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setShowGiphySheet(true);
                    }}
                    className="p-1 hover:opacity-70 transition cursor-pointer"
                    aria-label="Add GIF"
                    title="GIF"
                  >
                    <GifBadgeOutlineIcon className="w-[20px] h-[20px]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setShowExpandedComposer(true);
                      window.setTimeout(() => {
                        expandedTextareaRef.current?.focus();
                      }, 120);
                    }}
                    className="p-1 hover:opacity-70 transition cursor-pointer"
                    aria-label="Expand composer and options"
                    title="More reply options"
                  >
                    <DiagonalExpandIcon className="w-[19px] h-[19px]" />
                  </button>
                </div>
              </div>

              {/* Helper caption under pill (IMG_5091) */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  if (canManage) {
                    setShowPostOptionsSheet(true);
                  } else {
                    setShowExpandedComposer(true);
                  }
                }}
                className="w-full text-center text-[11.5px] text-zinc-400 dark:text-zinc-500 flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Tap</span>
                <DiagonalExpandIcon className="w-3 h-3 inline-block" />
                <span>for more options, such as limiting who can reply.</span>
              </button>
            </form>
          ) : (
            <div className="px-4 py-2.5 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>{replyRestrictionText}</span>
            </div>
          )}
        </div>
      </div>

      {/* EXPANDED COMPOSER MODAL (Triggered by ↗ icon) */}
      <AnimatePresence>
        {showExpandedComposer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowExpandedComposer(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-lg loops-surface rounded-t-[28px] sm:rounded-[28px] border loops-divider overflow-hidden shadow-2xl"
            >
              <div className="px-4 py-3.5 border-b loops-divider flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowExpandedComposer(false)}
                  className="text-[15px] text-zinc-600 dark:text-zinc-300 cursor-pointer"
                >
                  Cancel
                </button>
                <span className="loops-wordmark text-[15.5px] text-zinc-950 dark:text-white">
                  Reply
                </span>
                <button
                  type="button"
                  disabled={
                    isSubmittingComment || (!commentText.trim() && !commentImage)
                  }
                  onClick={() => handleSubmitComment()}
                  className="px-4 py-1.5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-[13.5px] font-bold disabled:opacity-40 cursor-pointer"
                >
                  {isSubmittingComment ? "Posting..." : "Post"}
                </button>
              </div>

              <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
                {/* Context of parent post */}
                <div className="flex gap-3">
                  <div className="w-9 shrink-0 flex flex-col items-center">
                    <GenericPersonAvatar
                      src={authorAvatarUrl}
                      name={authorHandle}
                      sizeClass="w-9 h-9"
                    />
                    <div className="w-[2px] flex-1 bg-zinc-200 dark:bg-zinc-800 my-1.5 rounded-full min-h-[20px]" />
                  </div>
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14.5px] font-semibold text-zinc-950 dark:text-white truncate">
                        {authorHandle}
                      </span>
                      <span className="text-[13px] text-zinc-400">
                        {formatLoopCompactTime(post.createdAt)}
                      </span>
                    </div>
                    <p className="text-[14px] text-zinc-600 dark:text-zinc-400 line-clamp-3 mt-0.5">
                      {post.description || post.title}
                    </p>
                  </div>
                </div>

                {/* Current User Reply Area */}
                <div className="flex gap-3">
                  <GenericPersonAvatar
                    src={viewerAvatarUrl}
                    name={getSafeDisplayName(viewerProfile || currentUser, "Me")}
                    sizeClass="w-9 h-9 shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <span className="text-[14.5px] font-semibold text-zinc-950 dark:text-white block">
                      {getSafePublicUsername(viewerProfile || currentUser) ||
                        getSafeDisplayName(viewerProfile || currentUser, "You")}
                    </span>
                    <textarea
                      ref={expandedTextareaRef}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={4}
                      placeholder={
                        replyingTo
                          ? `Reply to @${replyingTo.userName}...`
                          : `Reply to ${authorHandle}...`
                      }
                      className="w-full bg-transparent text-[15px] text-zinc-950 dark:text-white placeholder:text-zinc-400 outline-none resize-none"
                    />

                    {commentImage && (
                      <div className="relative w-32 h-32 rounded-2xl overflow-hidden border loops-divider">
                        <img
                          src={commentImage}
                          alt="Attachment"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setCommentImage(null)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/75 text-white flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-4 pt-1 text-zinc-600 dark:text-zinc-300">
                      <button
                        type="button"
                        onClick={() => commentFileRef.current?.click()}
                        className="hover:text-zinc-950 dark:hover:text-white cursor-pointer"
                      >
                        <ImageIcon className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowStickersSheet(true)}
                        className="hover:text-zinc-950 dark:hover:text-white cursor-pointer"
                      >
                        <StickerPeelSmileIcon className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowGiphySheet(true)}
                        className="hover:text-zinc-950 dark:hover:text-white cursor-pointer"
                      >
                        <GifBadgeOutlineIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 border-t loops-divider flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => setShowPostOptionsSheet(true)}
                    className="inline-flex items-center gap-1.5 font-medium hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>
                      {replyMode === "anyone"
                        ? "Anyone can reply & quote"
                        : `Limited replies (${replyMode})`}
                    </span>
                  </button>
                ) : (
                  <span>
                    {replyMode === "anyone"
                      ? "Anyone can reply"
                      : replyRestrictionText}
                  </span>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stickers, GIFs, Reply Permission & Share Sheets */}
      <StickersBottomSheet
        isOpen={showStickersSheet}
        onClose={() => setShowStickersSheet(false)}
        onInsertText={(kaomoji) =>
          setCommentText((prev) => `${prev}${prev ? " " : ""}${kaomoji}`)
        }
        onAttachSticker={(stickerUrl) => setCommentImage(stickerUrl)}
      />

      <GiphyBottomSheet
        isOpen={showGiphySheet}
        onClose={() => setShowGiphySheet(false)}
        onSelectGif={(gifUrl) => setCommentImage(gifUrl)}
      />

      <PostOptionsBottomSheet
        isOpen={showPostOptionsSheet}
        replyPermission={replyMode}
        reviewApproveReplies={Boolean(post.reviewApproveReplies)}
        alsoShareOn={post.alsoShareOn || []}
        onChangeReplyPermission={(mode) =>
          handleUpdateReplySettings(mode, Boolean(post.reviewApproveReplies))
        }
        onChangeReviewApprove={(val) =>
          handleUpdateReplySettings(replyMode, val)
        }
        onChangeAlsoShareOn={() => {}}
        onClose={() => setShowPostOptionsSheet(false)}
      />

      <LiquidGlassShareModal
        isOpen={showShareModal}
        post={post}
        onClose={() => setShowShareModal(false)}
        onRepost={handleToggleRepost}
        onQuotePost={() => {
          navigate(`/loops/create?quotePostId=${post.id}`);
        }}
      />

      <LoopPostOptionsSheet
        isOpen={showHeaderMenu}
        post={post}
        isSaved={saved}
        canManage={canManage}
        isFollowingAuthor={isFollowing}
        onClose={() => setShowHeaderMenu(false)}
        onToggleSave={handleToggleSave}
        onCopyLink={handleCopyPostLink}
        onOpenShare={() => setShowShareModal(true)}
        onOpenReplyOptions={() => setShowPostOptionsSheet(true)}
        onEditPost={() => navigate(`/loops/edit/${post.id}`)}
        onDeletePost={handleDeletePost}
        onPostHidden={() => navigate("/loops")}
      />
    </div>
  );
};

export default NewsDetails;
