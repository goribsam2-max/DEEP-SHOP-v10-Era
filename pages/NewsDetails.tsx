import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  Globe,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Smile,
  ShieldAlert,
  MapPin,
  Phone,
  CreditCard,
  Copy,
  Check,
  Image as ImageIcon,
  Reply,
  Edit3,
  Trash2,
  ThumbsUp,
  Gift,
  UserPlus,
  UserCheck,
  X,
} from "lucide-react";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
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
import { ScamPost, ScamComment, ReactionType } from "../types";
import { NewsPostMedia, isScamPostRecord } from "../components/NewsPostMedia";
import {
  NewsRichText,
  NewsLinkPreviewCards,
} from "../components/NewsRichText";
import { NewsBottomDock } from "../components/NewsBottomDock";
import {
  resolvePostById,
  getSavedPostIdsLocal,
  toggleSavePostHelper,
} from "./NewsHubSubPages";
import {
  applyWatermarkToImage,
  processCleanImage,
} from "../lib/watermark";
import { useNotify, useConfirm } from "../components/Notifications";
import { triggerHaptic } from "../lib/haptics";
import SEO from "../components/SEO";
import { formatDhakaDateTime, formatDhakaFeedTime } from "../lib/dhakaTime";
import {
  hasImmediateAdminOrStaffRole,
  checkStaffRecord,
} from "../lib/admin";

import creatorAvatar1 from "../src/assets/images/story_avatar_creator_1_1792826814910.jpg";

const REACTION_OPTIONS: { type: ReactionType; emoji: string; label: string }[] =
  [
    { type: "love", emoji: "❤️", label: "Love" },
    { type: "like", emoji: "👍", label: "Like" },
    { type: "haha", emoji: "😆", label: "Haha" },
    { type: "wow", emoji: "😮", label: "Wow" },
    { type: "sad", emoji: "😢", label: "Sad" },
    { type: "angry", emoji: "😡", label: "Angry" },
  ];

export const NewsDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotify();
  const confirm = useConfirm();

  const commentInputRef = useRef<HTMLInputElement | null>(null);
  const commentFileRef = useRef<HTMLInputElement | null>(null);
  const submittingCommentRef = useRef(false);

  const [post, setPost] = useState<ScamPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(() => auth.currentUser);
  const [isAdmin, setIsAdmin] = useState(false);

  const [comments, setComments] = useState<ScamComment[]>([]);
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

  const [showInlineReactions, setShowInlineReactions] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>(() =>
    getSavedPostIdsLocal()
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [localReaction, setLocalReaction] = useState<ReactionType | null>(null);

  // Auth & Admin check
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setCurrentUser(u);
      if (!u) {
        setIsAdmin(false);
        return;
      }
      if (hasImmediateAdminOrStaffRole(null, u)) {
        setIsAdmin(true);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        const uData = snap.exists() ? snap.data() : null;
        if (hasImmediateAdminOrStaffRole(uData, u)) {
          setIsAdmin(true);
          return;
        }
        const staffRes = await checkStaffRecord(uData?.email || u.email);
        setIsAdmin(staffRes.isStaff);
      } catch {
        setIsAdmin(false);
      }
    });
    return unsub;
  }, []);

  // Load Post (Real-time Firestore + Fallback to local/showcase)
  useEffect(() => {
    if (!id) return;
    setLoading(true);

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

  // Load Comments (Firestore subcollection + local comments fallback)
  useEffect(() => {
    if (!id) return;

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

        // Clean out local fallback comments that have already synced to Firestore
        // or legacy temp `cmt_*` duplicates created with a different ID
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
      },
      () => {
        setComments(loadLocalComments());
      }
    );

    return () => unsub();
  }, [id]);

  // Scroll to comments if hash #comments present
  useEffect(() => {
    if (!loading && location.hash === "#comments") {
      window.setTimeout(() => {
        commentInputRef.current?.focus();
      }, 220);
    }
  }, [loading, location.hash]);

  // Follow state
  useEffect(() => {
    if (!post?.reporterId) return;
    try {
      const list: string[] = JSON.parse(
        localStorage.getItem("followed_creators") || "[]"
      );
      setIsFollowing(list.includes(post.reporterId));
    } catch {}
  }, [post?.reporterId]);

  const handleToggleFollow = () => {
    if (!post) return;
    triggerHaptic();
    const targetId = post.reporterId || "creator_default";
    try {
      const saved: string[] = JSON.parse(
        localStorage.getItem("followed_creators") || "[]"
      );
      const next = !isFollowing;
      setIsFollowing(next);
      const updated = next
        ? Array.from(new Set([...saved, targetId]))
        : saved.filter((x) => x !== targetId);
      localStorage.setItem("followed_creators", JSON.stringify(updated));
      notify(
        next
          ? `Following ${post.reporterName}`
          : `Unfollowed ${post.reporterName}`,
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

  const handleReaction = async (chosen: ReactionType) => {
    if (!post) return;
    if (!currentUser) {
      notify("Please sign in or sign up to react to posts.", "error");
      navigate("/signin");
      return;
    }
    triggerHaptic();
    const uid = currentUser.uid;
    const currentReaction = post.reactions?.[uid] || localReaction;
    const removing = currentReaction === chosen;

    setLocalReaction(removing ? null : chosen);
    setShowInlineReactions(false);

    try {
      const map = JSON.parse(
        localStorage.getItem("deep_post_reactions") || "{}"
      );
      if (removing) delete map[post.id];
      else map[post.id] = chosen;
      localStorage.setItem("deep_post_reactions", JSON.stringify(map));
    } catch {}

    const counts: Record<ReactionType, number> = {
      like: post.reactionsCount?.like || 0,
      love: post.reactionsCount?.love || 0,
      haha: post.reactionsCount?.haha || 0,
      wow: post.reactionsCount?.wow || 0,
      sad: post.reactionsCount?.sad || 0,
      angry: post.reactionsCount?.angry || 0,
    };

    if (currentReaction && counts[currentReaction] > 0) {
      counts[currentReaction] = Math.max(0, counts[currentReaction] - 1);
    }
    if (!removing) {
      counts[chosen] = (counts[chosen] || 0) + 1;
    }

    const updatedReactions = { ...(post.reactions || {}) };
    if (removing) delete updatedReactions[uid];
    else updatedReactions[uid] = chosen;

    setPost((prev) =>
      prev
        ? { ...prev, reactions: updatedReactions, reactionsCount: counts }
        : null
    );

    if (!post.id.startsWith("showcase_")) {
      try {
        await updateDoc(doc(db, "scam_posts", post.id), {
          reactions: updatedReactions,
          reactionsCount: counts,
        });

        if (!removing && post.reporterId && post.reporterId !== uid) {
          addDoc(collection(db, "news_hub_notifications"), {
            userId: post.reporterId,
            type: "reaction",
            title: `${currentUser.displayName || "Someone"} reacted to your post`,
            body: `Gave a ${chosen} reaction to "${post.title || post.description?.slice(0, 30)}..."`,
            avatarText: (currentUser.displayName || "U").slice(0, 1).toUpperCase(),
            createdAt: new Date().toISOString(),
            read: false,
            link: `/news-hub/post/${post.id}`,
          }).catch(() => {});
        }
      } catch {}
    }
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
    notify(next ? "Post saved!" : "Removed from saved posts", "info");
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
      setCommentImage(res.dataUrl);
    } catch {
      notify("Failed to attach image", "error");
    } finally {
      setProcessingCommentImg(false);
      e.target.value = "";
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      notify("Please sign in or sign up to leave a comment.", "error");
      navigate("/signin");
      return;
    }
    if (submittingCommentRef.current) return;
    if (!post || (!commentText.trim() && !commentImage)) return;

    submittingCommentRef.current = true;
    setIsSubmittingComment(true);
    triggerHaptic();

    const authorName =
      currentUser?.displayName ||
      currentUser?.email?.split("@")[0] ||
      "Community Member";
    const authorAvatar = currentUser?.photoURL || creatorAvatar1;
    const isLocalOnlyPost =
      post.id.startsWith("showcase_") || post.id.startsWith("post_");

    // Pre-generate the exact Firestore document reference so optimistic UI and Firestore share ONE identical ID
    const commentRef = !isLocalOnlyPost
      ? doc(collection(db, "scam_posts", post.id, "comments"))
      : null;
    const commentId = commentRef ? commentRef.id : `cmt_${Date.now()}`;

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
      createdAt: Date.now(),
    };

    const fullComment: ScamComment = { id: commentId, ...newCommentObj };

    setComments((prev) =>
      prev.some((c) => c.id === commentId) ? prev : [...prev, fullComment]
    );
    setPost((prev) =>
      prev ? { ...prev, commentsCount: (prev.commentsCount || 0) + 1 } : null
    );
    setCommentText("");
    setCommentImage(null);
    setReplyingTo(null);

    try {
      if (commentRef) {
        await setDoc(commentRef, newCommentObj);
        await updateDoc(doc(db, "scam_posts", post.id), {
          commentsCount: increment(1),
        });
        // Trigger notification for post author
        if (post.reporterId && post.reporterId !== currentUser?.uid) {
          addDoc(collection(db, "news_hub_notifications"), {
            userId: post.reporterId,
            type: "comment",
            title: `${authorName} commented on your post`,
            body: `"${newCommentObj.text.slice(0, 50)}"`,
            avatarText: authorName.slice(0, 1).toUpperCase(),
            createdAt: new Date().toISOString(),
            read: false,
            link: `/news-hub/post/${post.id}`,
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
      // Offline / permission fallback so user's comment is still preserved locally with the same ID
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

  const handleCommentReaction = async (cmt: ScamComment, emoji: ReactionType) => {
    if (!currentUser) {
      notify("Please sign in or sign up to react to comments.", "error");
      navigate("/signin");
      return;
    }
    if (!post) return;
    triggerHaptic();

    const uid = currentUser.uid;
    const currentReaction = cmt.reactions?.[uid];
    const isRemoving = currentReaction === emoji;

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
          addDoc(collection(db, "news_hub_notifications"), {
            userId: cmt.userId,
            type: "comment_reaction",
            title: `${currentUser.displayName || "Someone"} reacted to your comment`,
            body: `Gave a reaction to "${cmt.text.slice(0, 40)}..."`,
            avatarText: (currentUser.displayName || "U").slice(0, 1).toUpperCase(),
            createdAt: new Date().toISOString(),
            read: false,
            link: `/news-hub/post/${post.id}`,
          }).catch(() => {});
        }
      } catch {}
    }
  };

  const handleStartEditComment = (cmt: ScamComment) => {
    triggerHaptic();
    setEditingCommentId(cmt.id);
    setEditingCommentText(cmt.text || "");
  };

  const handleSaveCommentEdit = async (cmt: ScamComment) => {
    if (!post) return;
    const trimmed = editingCommentText.trim();
    if (!trimmed && !cmt.imageUrl) {
      notify("Comment cannot be empty", "error");
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
        notify("Could not sync comment edit", "error");
      }
    }
    setSavingCommentEdit(false);
    notify("Comment updated", "success");
  };

  const handleDeleteComment = async (cmt: ScamComment) => {
    if (!post) return;
    triggerHaptic();
    const ok = await confirm({
      title: "Delete Comment?",
      message: "Are you sure you want to delete this comment?",
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
    notify("Comment deleted", "info");
  };

  const handleDeletePost = async () => {
    if (!post) return;
    triggerHaptic();
    const ok = await confirm({
      title: "Delete Post?",
      message: "This post and its discussion will be permanently removed.",
      confirmText: "Delete Post",
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
      notify("Post deleted", "info");
      navigate("/news-hub");
    } catch {
      notify("Could not delete post", "error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#BCE0FD]/80 via-[#E2F1FF]/45 to-transparent dark:from-transparent dark:to-transparent flex items-center justify-center p-6">
        <div className="bg-white dark:bg-zinc-900 rounded-[28px] px-8 py-6 text-sm font-semibold text-zinc-500 shadow-xs">
          Loading post...
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#BCE0FD]/80 via-[#E2F1FF]/45 to-transparent dark:from-transparent dark:to-transparent flex items-center justify-center p-6">
        <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 max-w-md w-full text-center space-y-4 shadow-md">
          <p className="text-base font-bold text-zinc-900 dark:text-white">
            Post not found
          </p>
          <button
            type="button"
            onClick={() => navigate("/news-hub")}
            className="px-6 py-2.5 rounded-full bg-[#1877F2] text-white text-xs font-bold cursor-pointer"
          >
            Back to Feed
          </button>
        </div>
      </div>
    );
  }

  const isScam = isScamPostRecord(post);
  const uid = currentUser?.uid || "guest_local";
  const myReaction = post.reactions?.[uid] || localReaction;
  const activeReactionMeta = REACTION_OPTIONS.find(
    (r) => r.type === myReaction
  );
  const totalReactions = post.reactionsCount
    ? (Object.values(post.reactionsCount) as number[]).reduce(
        (a, b) => a + (b || 0),
        0
      )
    : post.votes || 0;
  const saved =
    savedIds.includes(post.id) ||
    Boolean(currentUser?.uid && post.savedByUserIds?.includes(currentUser.uid));
  const canManage =
    isAdmin || Boolean(currentUser?.uid && currentUser.uid === post.reporterId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#BCE0FD]/80 via-[#E2F1FF]/45 to-transparent dark:from-transparent dark:via-transparent dark:to-transparent text-zinc-900 dark:text-zinc-100 font-sans pb-32">
      <SEO
        title={`${post.reporterName} on Feed`}
        description={post.description?.slice(0, 150) || post.title}
      />

      <div className="max-w-xl lg:max-w-6xl mx-auto pt-4 sm:pt-7 px-3 sm:px-6 space-y-4 sm:space-y-5">
        {/* Top Bar */}
        <header className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                navigate("/news-hub");
              }}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white dark:bg-zinc-900 shadow-xs flex items-center justify-center cursor-pointer shrink-0"
              aria-label="Back to Feed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-[18px] sm:text-[20px] font-bold truncate whitespace-nowrap">
              {isScam ? "Scam Report" : "Post Details"}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() => navigate(`/news-hub/edit/${post.id}`)}
                  className="px-3.5 h-9 sm:h-10 rounded-full bg-white dark:bg-zinc-900 text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
                >
                  <Edit3 className="w-3.5 h-3.5 shrink-0" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeletePost}
                  className="px-3.5 h-9 sm:h-10 rounded-full bg-white dark:bg-zinc-900 text-rose-600 text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
                  aria-label="Delete post"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        </header>

        {/* Responsive Split Grid: Single-Column on Mobile, Post Left + Comments Right on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
          {/* LEFT COLUMN (Desktop): Main Post Card */}
          <article className="lg:col-span-7 bg-white dark:bg-zinc-900 rounded-[32px] p-4 sm:p-6 shadow-[0_10px_36px_rgba(15,23,42,0.06)] space-y-4">
            {/* Author Row — Strictly single-line timestamp in 12-hour Dhaka timezone */}
            <div className="flex items-center justify-between gap-2">
              <div
                onClick={() => navigate(`/author/${post.reporterId}`)}
                className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 cursor-pointer"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full p-[2px] border border-dashed border-[#1877F2] shrink-0">
                  <img
                    src={post.reporterAvatar || creatorAvatar1}
                    alt={post.reporterName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] sm:text-[16px] font-bold text-zinc-900 dark:text-white truncate">
                    {post.reporterName}
                  </p>
                  <p className="text-[10.5px] sm:text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 whitespace-nowrap overflow-hidden">
                    <span className="truncate">
                      {formatDhakaDateTime(post.createdAt)}
                    </span>
                    {post.isEdited && (
                      <>
                        <span className="shrink-0">·</span>
                        <span className="shrink-0">Edited</span>
                      </>
                    )}
                    <span className="shrink-0">·</span>
                    <Globe className="w-3 h-3 shrink-0" />
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {currentUser?.uid !== post.reporterId && (
                  <button
                    type="button"
                    onClick={handleToggleFollow}
                    className={`px-2.5 sm:px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0 ${
                      isFollowing
                        ? "bg-[#F4F5F7] dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                        : "bg-[#1877F2] text-white"
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => navigate(`/gift-stars/${post.reporterId}`)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center cursor-pointer shrink-0"
                  title="Send Stars"
                  aria-label="Send Stars"
                >
                  <Gift className="w-4 h-4" />
                </button>
              </div>
            </div>

          {/* Caption / Full Text */}
          {post.description && (
            <div
              className={
                post.textStyle === "quote"
                  ? "rounded-[22px] bg-[#F5F7FA] dark:bg-zinc-800/70 p-4 border-l-4 border-[#1877F2]"
                  : ""
              }
            >
              <p
                className={`whitespace-pre-line break-words ${
                  post.textStyle === "large"
                    ? "text-xl font-bold leading-snug"
                    : post.textStyle === "quote"
                    ? "text-base italic font-medium leading-relaxed"
                    : "text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200"
                }`}
              >
                <NewsRichText text={post.description} />
              </p>
            </div>
          )}

          {/* Auto Stylish Link Preview Cards */}
          <NewsLinkPreviewCards text={post.description} />

          {/* Media (Photos / Multi-photo layout / Voice Note / Video) */}
          <NewsPostMedia
            post={post}
            onOpenImage={(idx) =>
              navigate(`/news-hub/photo/${post.id}/${idx}`)
            }
          />

          {/* SCAM INCIDENT DOSSIER — Shown ONLY when post is a Scam Report */}
          {isScam && (
            <div className="rounded-[24px] bg-rose-50/75 dark:bg-rose-950/25 border border-rose-200/80 dark:border-rose-900/50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 w-full">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs min-w-0 flex-1">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    Verified Scam Report{post.scamLocation ? ` · ${post.scamLocation}` : ""}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmScamVote}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 whitespace-nowrap ${
                    post.votedUserIds?.includes(uid)
                      ? "bg-rose-600 text-white"
                      : "bg-white dark:bg-zinc-800 text-rose-600 border border-rose-200 dark:border-zinc-700"
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span className={`whitespace-nowrap overflow-hidden ${(post.votes || 0) > 999 ? 'text-[10px]' : ((post.votes || 0) > 99 ? 'text-[11px]' : 'text-[12px]')}`}>
                    Confirm ({post.votes || 0})
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {post.scamLocation && (
                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="truncate font-medium">
                      {post.scamLocation}
                    </span>
                  </div>
                )}

                {post.scammerPhone && (
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyField("Phone", post.scammerPhone || "")
                    }
                    className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="flex items-center gap-2 truncate font-mono">
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
                    className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="flex items-center gap-2 truncate font-mono">
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
                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 font-bold text-rose-600 tabular-nums">
                    Reported Loss: ৳{post.scammedAmount.toLocaleString()}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Inline Emoji Reaction Picker */}
          {showInlineReactions && (
            <div className="flex items-center justify-between px-3 py-2 rounded-full bg-[#F5F6F8] dark:bg-zinc-800">
              {REACTION_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => handleReaction(opt.type)}
                  className={`px-2.5 py-1 rounded-full text-lg hover:scale-110 transition cursor-pointer ${
                    myReaction === opt.type
                      ? "bg-white dark:bg-zinc-900 shadow-2xs"
                      : ""
                  }`}
                >
                  {opt.emoji}
                </button>
              ))}
            </div>
          )}

          {/* Engagement Bar */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() =>
                  myReaction
                    ? setShowInlineReactions((s) => !s)
                    : handleReaction("love")
                }
                className={`h-9 sm:h-10 px-3 sm:px-4 rounded-full flex items-center gap-1.5 text-xs font-semibold tabular-nums cursor-pointer whitespace-nowrap shrink-0 ${
                  myReaction
                    ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600"
                    : "bg-[#F5F6F8] dark:bg-zinc-800 text-zinc-900 dark:text-white"
                }`}
              >
                {activeReactionMeta && myReaction !== "love" ? (
                  <span>{activeReactionMeta.emoji}</span>
                ) : (
                  <Heart
                    className={`w-4 h-4 shrink-0 ${
                      myReaction ? "fill-current text-rose-500" : "stroke-[2]"
                    }`}
                  />
                )}
                <span>{totalReactions}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowInlineReactions((s) => !s)}
                className="w-9 h-9 sm:h-10 rounded-full bg-[#F5F6F8] dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 cursor-pointer shrink-0"
                aria-label="Pick reaction"
              >
                <Smile className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => commentInputRef.current?.focus()}
                className="h-9 sm:h-10 px-3 sm:px-4 rounded-full bg-[#F5F6F8] dark:bg-zinc-800 flex items-center gap-1.5 text-xs font-semibold tabular-nums cursor-pointer whitespace-nowrap shrink-0"
              >
                <MessageCircle className="w-4 h-4 stroke-[2] shrink-0" />
                <span>{comments.length || post.commentsCount || 0}</span>
              </button>

              <button
                type="button"
                onClick={() => navigate(`/news-hub/share/${post.id}`)}
                className="h-9 sm:h-10 px-3 sm:px-4 rounded-full bg-[#F5F6F8] dark:bg-zinc-800 flex items-center gap-1.5 text-xs font-semibold tabular-nums cursor-pointer whitespace-nowrap shrink-0"
              >
                <Send className="w-3.5 h-3.5 stroke-[2] shrink-0" />
                <span>Share</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleToggleSave}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center cursor-pointer shrink-0 ${
                saved
                  ? "bg-[#1877F2]/12 text-[#1877F2]"
                  : "bg-[#F5F6F8] dark:bg-zinc-800 text-zinc-900 dark:text-white"
              }`}
              aria-label="Save post"
            >
              <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
            </button>
          </div>
          </article>

          {/* RIGHT COLUMN (Desktop Sticky Panel): COMMENTS & DISCUSSION */}
          <section
            id="comments"
            className="lg:col-span-5 lg:sticky lg:top-6 bg-white dark:bg-zinc-900 rounded-[32px] p-4 sm:p-5 shadow-[0_10px_36px_rgba(15,23,42,0.06)] flex flex-col lg:max-h-[calc(100vh-110px)] space-y-4"
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800">
              <h2 className="text-[16px] font-bold flex items-center gap-2 whitespace-nowrap">
                <MessageCircle className="w-4 h-4 text-[#1877F2]" />
                <span>Comments ({comments.length})</span>
              </h2>
              <span className="text-[10.5px] font-medium text-zinc-400 whitespace-nowrap">
                Dhaka Time (12h)
              </span>
            </div>

            {/* Comments List (Scrollable on Desktop Right Panel) */}
            <div className="lg:flex-1 lg:overflow-y-auto lg:pr-1 space-y-3">
              {comments.length === 0 ? (
                <div className="py-8 text-center space-y-1.5">
                  <MessageCircle className="w-7 h-7 text-zinc-300 dark:text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-500">
                    Be the first to share your thoughts on this post.
                  </p>
                </div>
              ) : (
                comments.map((cmt) => {
                  const isCommentOwner = Boolean(
                    currentUser?.uid && currentUser.uid === cmt.userId
                  );
                  const canDeleteComment =
                    isCommentOwner ||
                    isAdmin ||
                    Boolean(
                      currentUser?.uid && currentUser.uid === post.reporterId
                    );
                  const isEditingThis = editingCommentId === cmt.id;

                  return (
                    <div
                      key={cmt.id}
                      className={`flex items-start gap-2.5 sm:gap-3 ${
                        cmt.replyToCommentId ? "pl-7 sm:pl-8" : ""
                      }`}
                    >
                      <img
                        src={cmt.userAvatar || creatorAvatar1}
                        alt={cmt.userName}
                        referrerPolicy="no-referrer"
                        onClick={() => navigate(`/author/${cmt.userId}`)}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shrink-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="rounded-2xl bg-[#F5F6F8] dark:bg-zinc-800 px-3.5 py-2.5 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                              {cmt.userName}
                            </span>
                            <span className="text-[10px] text-zinc-400 whitespace-nowrap shrink-0">
                              {formatDhakaFeedTime(cmt.createdAt)}
                              {cmt.isEdited ? " · Edited" : ""}
                            </span>
                          </div>

                          {cmt.replyToUserName && (
                            <span className="text-[11px] font-semibold text-[#1877F2] block">
                              @{cmt.replyToUserName}
                            </span>
                          )}

                          {isEditingThis ? (
                            <div className="space-y-2 pt-0.5">
                              <input
                                type="text"
                                value={editingCommentText}
                                onChange={(e) =>
                                  setEditingCommentText(e.target.value)
                                }
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSaveCommentEdit(cmt);
                                  } else if (e.key === "Escape") {
                                    setEditingCommentId(null);
                                    setEditingCommentText("");
                                  }
                                }}
                                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white outline-none focus:border-[#1877F2]"
                              />
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCommentId(null);
                                    setEditingCommentText("");
                                  }}
                                  className="px-2.5 py-1 rounded-full bg-zinc-200/80 dark:bg-zinc-700 text-[10.5px] font-semibold text-zinc-700 dark:text-zinc-200 cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={savingCommentEdit}
                                  onClick={() => handleSaveCommentEdit(cmt)}
                                  className="px-3 py-1 rounded-full bg-[#1877F2] text-white text-[10.5px] font-bold disabled:opacity-50 cursor-pointer"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            cmt.text && (
                              <p className="text-xs text-zinc-700 dark:text-zinc-200 leading-relaxed break-words">
                                <NewsRichText text={cmt.text} />
                              </p>
                            )
                          )}

                          {cmt.imageUrl && (
                            <img
                              src={cmt.imageUrl}
                              alt="Comment media"
                              referrerPolicy="no-referrer"
                              className="rounded-xl max-h-48 w-auto object-cover mt-1"
                            />
                          )}
                        </div>

                        <div className="flex items-center gap-3 pl-2 pt-1">
                          {/* Comment Reaction Quick Picker */}
                          <div className="flex items-center gap-1.5">
                            {[
                              { type: "love", emoji: "❤️" },
                              { type: "like", emoji: "👍" },
                              { type: "haha", emoji: "😆" },
                            ].map((re) => {
                              const count = cmt.reactionsCount?.[re.type] || 0;
                              const isMine = cmt.reactions?.[currentUser?.uid || ""] === re.type;
                              return (
                                <button
                                  key={re.type}
                                  type="button"
                                  onClick={() => handleCommentReaction(cmt, re.type as ReactionType)}
                                  className={`px-1.5 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1 transition cursor-pointer ${
                                    isMine
                                      ? "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold"
                                      : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500"
                                  }`}
                                >
                                  <span>{re.emoji}</span>
                                  {count > 0 && <span className="text-[10px]">{count}</span>}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setReplyingTo({
                                commentId: cmt.id,
                                userName: cmt.userName,
                              });
                              commentInputRef.current?.focus();
                            }}
                            className="text-[11px] font-semibold text-zinc-500 hover:text-[#1877F2] flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <Reply className="w-3 h-3" />
                            <span>Reply</span>
                          </button>

                          {isCommentOwner && !isEditingThis && (
                            <button
                              type="button"
                              onClick={() => handleStartEditComment(cmt)}
                              className="text-[11px] font-semibold text-zinc-500 hover:text-[#1877F2] flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          )}

                          {canDeleteComment && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(cmt)}
                              className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pinned Comment Composer */}
            <form
              onSubmit={handleSubmitComment}
              className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800"
            >
              {replyingTo && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-xs text-[#1877F2]">
                  <span className="truncate">Replying to @{replyingTo.userName}</span>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="cursor-pointer shrink-0 ml-2"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {commentImage && (
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-700">
                  <img
                    src={commentImage}
                    alt="Attachment"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setCommentImage(null)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/75 text-white flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  ref={commentFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCommentPhotoPick}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => commentFileRef.current?.click()}
                  disabled={processingCommentImg}
                  className="w-10 h-10 rounded-full bg-[#F4F5F7] dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0 cursor-pointer"
                  aria-label="Attach photo to comment"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>

                <input
                  ref={commentInputRef}
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 h-10 sm:h-11 px-4 rounded-full bg-[#F4F5F7] dark:bg-zinc-800 text-sm outline-none min-w-0"
                />

                <button
                  type="submit"
                  disabled={
                    isSubmittingComment || (!commentText.trim() && !commentImage)
                  }
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#1877F2] text-white flex items-center justify-center disabled:opacity-45 shrink-0 cursor-pointer"
                  aria-label="Send comment"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>

      <NewsBottomDock />
    </div>
  );
};

export default NewsDetails;
