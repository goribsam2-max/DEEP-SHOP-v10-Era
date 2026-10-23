import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Share2,
  ThumbsUp,
  Flame,
  ShieldAlert,
  AlertTriangle,
  Download,
  Phone,
  CreditCard,
  Camera,
  Send,
  Lock,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  Copy,
  Check,
  Eye,
  Reply,
  AtSign,
  Heart,
  Smile,
  X,
  Newspaper,
  Calendar,
  User as UserIcon,
  CheckCircle2,
  Edit3,
  Trash2,
} from "lucide-react";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  addDoc,
  increment,
  getDocs,
  where,
  deleteDoc,
} from "firebase/firestore";
import { ScamPost, ScamComment, ReactionType } from "../types";
import { TopNavTabSwitcher } from "../components/TopNavTabSwitcher";
import { applyWatermarkToImage, downloadWatermarkedImage } from "../lib/watermark";
import { useNotify } from "../components/Notifications";
import { triggerHaptic } from "../lib/haptics";
import SEO from "../components/SEO";
import { PublicAuthorProfileModal } from "../components/PublicAuthorProfileModal";
import { GiftStarsModal } from "../components/GiftStarsModal";

// Seed fallback posts if Firestore document not yet synced
const SEED_POSTS: Record<string, ScamPost> = {
  scam_1: {
    id: "scam_1",
    postType: "scam",
    title: "Fake Facebook Page 'Gadget World BD' Took ৳15,000 Advance & Blocked",
    description:
      "Ordered an iPhone 14 Pro 128GB refurbished. The page claimed border-cross authentic stock from Dubai. Asked for 50% advance via personal bKash number. After payment confirmation, they deleted WhatsApp chat and blocked on FB page. Be aware of this fraudulent network operating with multiple pages.",
    scammerName: "Gadget World BD (Admin: Tanvir)",
    scammerPhone: "01711223344",
    scammerBkash: "01711223344 (bKash Personal)",
    scammerSocialLink: "https://facebook.com/gadgetworldbd.fake",
    scammedAmount: 15000,
    category: "advance_payment",
    images: [
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=900&auto=format&fit=crop&q=80",
    ],
    reporterId: "user_samir",
    reporterName: "Samir K.",
    reporterAvatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80",
    votes: 3420,
    votedUserIds: [],
    reactions: {},
    reactionsCount: {
      like: 1200,
      love: 45,
      haha: 12,
      wow: 310,
      sad: 890,
      angry: 2840,
    },
    reactionsUsers: {
      usr_1: { userName: "Rahim Chowdhury", type: "angry", timestamp: Date.now() - 100000 },
      usr_2: { userName: "Tanvir Ahmed", type: "angry", timestamp: Date.now() - 90000 },
      usr_3: { userName: "Sumon Paul", type: "sad", timestamp: Date.now() - 80000 },
      usr_4: { userName: "Nabila Khan", type: "like", timestamp: Date.now() - 70000 },
    },
    commentsCount: 1540,
    createdAt: Date.now() - 2 * 3600 * 1000,
    status: "trending",
    views: 14200,
  },
  scam_2: {
    id: "scam_2",
    postType: "scam",
    title: "Fake Courier Delivery Agent Swapped Parcel with Soap Bar",
    description:
      "Received a delivery supposedly containing a high-end Samsung Galaxy S23 Ultra. Delivery rider insisted on cash payment before opening the box. Upon unboxing, found tiles and soap bars inside. Rider fled on motorbike TR-9821. Police complaint filed.",
    scammerName: "Rider ID: SteadFast-Fake901",
    scammerPhone: "01944556677",
    scammerBkash: "01944556677 (Nagad Merchant)",
    scammedAmount: 78000,
    category: "delivery",
    images: [
      "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=900&auto=format&fit=crop&q=80",
    ],
    reporterId: "user_fahim",
    reporterName: "Fahim Rahman",
    reporterAvatar:
      "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80",
    votes: 1890,
    votedUserIds: [],
    reactions: {},
    reactionsCount: {
      like: 640,
      love: 20,
      haha: 8,
      wow: 120,
      sad: 560,
      angry: 1450,
    },
    reactionsUsers: {},
    commentsCount: 840,
    createdAt: Date.now() - 45 * 60 * 1000,
    status: "trending",
    views: 9800,
  },
  news_1: {
    id: "news_1",
    postType: "news",
    title: "BTRC Updates IMEI Registration Rules for Hand-Carried & Border Devices",
    description:
      "Bangladesh Telecommunication Regulatory Commission has released new guidelines for personal devices brought from overseas. Travelers and cross-border shoppers can bring up to two devices under personal luggage allowance with genuine purchase proof.",
    category: "tech_news",
    images: [
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=900&auto=format&fit=crop&q=80",
    ],
    reporterId: "admin_team",
    reporterName: "DEEP SHOP Editorial",
    reporterAvatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80",
    votes: 820,
    votedUserIds: [],
    reactions: {},
    reactionsCount: {
      like: 510,
      love: 180,
      haha: 2,
      wow: 95,
      sad: 12,
      angry: 4,
    },
    reactionsUsers: {},
    commentsCount: 160,
    createdAt: Date.now() - 5 * 3600 * 1000,
    status: "verified",
    views: 6300,
  },
};

const REACTION_EMOJIS: Record<ReactionType, { emoji: string; label: string; color: string }> = {
  like: { emoji: "👍", label: "Like", color: "text-blue-500" },
  love: { emoji: "❤️", label: "Love", color: "text-rose-500" },
  haha: { emoji: "😆", label: "Haha", color: "text-amber-500" },
  wow: { emoji: "😮", label: "Wow", color: "text-amber-500" },
  sad: { emoji: "😢", label: "Sad", color: "text-amber-600" },
  angry: { emoji: "😡", label: "Angry", color: "text-red-600" },
};

export const NewsDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notify = useNotify();

  const [post, setPost] = useState<ScamPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Comments
  const [comments, setComments] = useState<ScamComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [isWatermarkingCommentImage, setIsWatermarkingCommentImage] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; userName: string; userId?: string } | null>(null);

  // Reactions
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [activeReactionTab, setActiveReactionTab] = useState<"all" | ReactionType>("all");

  // Share
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Active Image Lightbox
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

  // Modals for Public Profile & Gift Stars
  const [selectedAuthorModalId, setSelectedAuthorModalId] = useState<string | null>(null);
  const [showGiftStarsModal, setShowGiftStarsModal] = useState(false);
  const [giftStarsTarget, setGiftStarsTarget] = useState<{ id: string; name: string }>({ id: '', name: '' });
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (!post?.reporterId) return;
    try {
      const savedFollows = JSON.parse(localStorage.getItem("followed_creators") || "[]");
      setIsFollowing(savedFollows.includes(post.reporterId));
    } catch (e) {}
  }, [post?.reporterId]);

  const handleToggleFollow = () => {
    if (!post) return;
    triggerHaptic();
    const reporterId = post.reporterId || "reporter_default";
    try {
      const savedFollows: string[] = JSON.parse(localStorage.getItem("followed_creators") || "[]");
      const isNowFollowing = !isFollowing;
      setIsFollowing(isNowFollowing);

      let updated: string[];
      if (isNowFollowing) {
        updated = Array.from(new Set([...savedFollows, reporterId]));
        notify(`You are now following ${post.reporterName}!`, "success");
      } else {
        updated = savedFollows.filter((id) => id !== reporterId);
        notify(`Unfollowed ${post.reporterName}`, "info");
      }
      localStorage.setItem("followed_creators", JSON.stringify(updated));
    } catch (e) {}
  };

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEditing, setAdminEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editScammerName, setEditScammerName] = useState("");
  const [editScammerPhone, setEditScammerPhone] = useState("");
  const [editScammerBkash, setEditScammerBkash] = useState("");
  const [editScammedAmount, setEditScammedAmount] = useState<string>("0");
  const [editCategory, setEditCategory] = useState("advance_payment");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [isBlockedShadowReview, setIsBlockedShadowReview] = useState(false);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (u) => {
      setCurrentUser(u);
      if (!u) {
        setIsAdmin(false);
        return;
      }
      const email = u.email?.toLowerCase().trim() || "";
      if (
        email === "admin@deep.shop" ||
        email === "deepshop@gmail.com" ||
        email === "deepshopbysam@gmail.com" ||
        localStorage.getItem("isAdmin") === "true"
      ) {
        setIsAdmin(true);
        return;
      }
      try {
        const uSnap = await getDoc(doc(db, "users", u.uid));
        if (uSnap.exists()) {
          const role = uSnap.data().role;
          if (role === "admin" || role === "staff") {
            setIsAdmin(true);
          }
        }
      } catch (e) {}
    });
    return unsubAuth;
  }, []);

  const openAdminEdit = () => {
    if (!post) return;
    setEditTitle(post.title || "");
    setEditDesc(post.description || "");
    setEditScammerName(post.scammerName || "");
    setEditScammerPhone(post.scammerPhone || "");
    setEditScammerBkash(post.scammerBkash || "");
    setEditScammedAmount(post.scammedAmount ? post.scammedAmount.toString() : "0");
    setEditCategory(post.category || "advance_payment");
    setEditImages(post.images ? [...post.images] : []);
    setNewImageUrl("");
    setAdminEditing(true);
  };

  const handleAdminSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post) return;
    setIsSavingAdmin(true);
    try {
      const updatedFields: any = {
        title: editTitle.trim(),
        description: editDesc.trim(),
        scammerName: editScammerName.trim() || undefined,
        scammerPhone: editScammerPhone.trim() || undefined,
        scammerBkash: editScammerBkash.trim() || undefined,
        scammedAmount: Number(editScammedAmount) || 0,
        category: editCategory,
        images: editImages,
      };

      try {
        await updateDoc(doc(db, "scam_posts", post.id), updatedFields);
      } catch (err) {}

      setPost((prev) => (prev ? { ...prev, ...updatedFields } : null));
      notify("Report updated successfully by Admin!", "success");
      setAdminEditing(false);
    } catch (err: any) {
      notify(err.message || "Failed to update post", "error");
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const handleAdminApprovePost = async () => {
    if (!post) return;
    try {
      try {
        await updateDoc(doc(db, "scam_posts", post.id), {
          status: "active",
          isBrandReview: false,
        });
      } catch (err) {}
      setPost((prev) => (prev ? { ...prev, status: "active", isBrandReview: false } : null));
      notify("Post approved and made public to everyone!", "success");
    } catch (err) {
      notify("Failed to approve post", "error");
    }
  };

  const handleAdminDeletePost = async () => {
    if (!post) return;
    if (!window.confirm("Are you sure you want to permanently delete this report?")) return;
    try {
      try {
        await deleteDoc(doc(db, "scam_posts", post.id));
      } catch (err) {}
      notify("Report permanently removed by Admin.", "info");
      navigate("/news-hub");
    } catch (err) {
      notify("Failed to delete post", "error");
    }
  };

  const handleAdminDeleteComment = async (commentId: string) => {
    if (!id) return;
    if (!window.confirm("Delete this comment?")) return;
    try {
      try {
        await deleteDoc(doc(db, `scam_posts/${id}/comments`, commentId));
      } catch (err) {}
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      notify("Comment deleted by Admin.", "info");
    } catch (err) {
      notify("Failed to delete comment", "error");
    }
  };

  const handleAdminEditComment = async (commentId: string, currentText: string) => {
    if (!id) return;
    const newText = prompt("Edit comment text:", currentText);
    if (newText === null || !newText.trim()) return;
    try {
      try {
        await updateDoc(doc(db, `scam_posts/${id}/comments`, commentId), { text: newText.trim() });
      } catch (err) {}
      setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, text: newText.trim() } : c)));
      notify("Comment updated by Admin.", "success");
    } catch (err) {
      notify("Failed to update comment", "error");
    }
  };

  // Fetch Post
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const loadPost = async () => {
      try {
        const docRef = doc(db, "scam_posts", id);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const postData = { id: snap.id, ...snap.data() } as ScamPost;
          // Shadow review check:
          if ((postData as any).status === "under_review" || (postData as any).isBrandReview) {
            const isAuthor = currentUser?.uid && (postData as any).reporterId === currentUser.uid;
            const isAdm =
              currentUser?.email?.toLowerCase().includes("admin") ||
              localStorage.getItem("isAdmin") === "true";
            if (!isAuthor && !isAdm) {
              setIsBlockedShadowReview(true);
              setPost(null);
              setLoading(false);
              return;
            }
          }
          setPost(postData);
        } else if (SEED_POSTS[id]) {
          setPost(SEED_POSTS[id]);
        } else {
          // Check local storage
          const localStr = localStorage.getItem("deep_scam_posts");
          if (localStr) {
            try {
              const list: ScamPost[] = JSON.parse(localStr);
              const found = list.find((p) => p.id === id);
              if (found) {
                setPost(found);
                setLoading(false);
                return;
              }
            } catch (e) {}
          }
          // Default fallback
          setPost(SEED_POSTS["scam_1"]);
        }
      } catch (err) {
        console.warn("Could not fetch post from Firestore:", err);
        setPost(SEED_POSTS[id] || SEED_POSTS["scam_1"]);
      } finally {
        setLoading(false);
      }
    };

    loadPost();

    // Real-time listener for comments
    try {
      const commentsQuery = query(
        collection(db, `scam_posts/${id}/comments`),
        orderBy("createdAt", "asc")
      );
      const unsubComments = onSnapshot(
        commentsQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map(
              (d) => ({ id: d.id, ...d.data() } as ScamComment)
            );
            setComments(list);
          } else {
            // Load local comments
            const localComms = localStorage.getItem(`comments_${id}`);
            if (localComms) {
              try {
                setComments(JSON.parse(localComms));
              } catch (e) {}
            } else {
              // Seed default comments
              setComments([
                {
                  id: "comm_1",
                  postId: id,
                  userId: "user_alert_1",
                  userName: "Tanvir Hasan",
                  userAvatar:
                    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
                  text: "This same number tried to scam me yesterday for an iPad Pro! Thanks for revealing on DEEP SHOP.",
                  createdAt: Date.now() - 3600 * 1000,
                },
                {
                  id: "comm_2",
                  postId: id,
                  userId: "user_alert_2",
                  userName: "Afsana Mimi",
                  userAvatar:
                    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
                  text: "Police Cyber Crime Unit e complaint drop korun please. Proof gula download kore print koren.",
                  createdAt: Date.now() - 1800 * 1000,
                },
              ]);
            }
          }
        },
        () => {
          // Fallback to local storage
          const localComms = localStorage.getItem(`comments_${id}`);
          if (localComms) {
            try {
              setComments(JSON.parse(localComms));
            } catch (e) {}
          }
        }
      );
      return () => unsubComments();
    } catch (e) {}
  }, [id]);

  const requireAuth = (action: string) => {
    if (!currentUser) {
      notify(`Please sign in or create an account to ${action}!`, "error");
      navigate("/signin", { state: { returnTo: `/news-hub/post/${id}` } });
      return false;
    }
    return true;
  };

  // Upvote / Confirm Scammer
  const handleVote = async () => {
    if (!requireAuth("vote")) return;
    if (!post) return;
    triggerHaptic();

    const userId = currentUser.uid;
    const hasVoted = post.votedUserIds?.includes(userId);
    const updatedVoted = hasVoted
      ? (post.votedUserIds || []).filter((u) => u !== userId)
      : [...(post.votedUserIds || []), userId];
    const updatedVoteCount = hasVoted ? Math.max(0, post.votes - 1) : post.votes + 1;

    const updatedPost = { ...post, votes: updatedVoteCount, votedUserIds: updatedVoted };
    setPost(updatedPost);

    try {
      await updateDoc(doc(db, "scam_posts", post.id), {
        votes: updatedVoteCount,
        votedUserIds: updatedVoted,
      });
    } catch (e) {}

    notify(hasVoted ? "Vote removed" : "Vote recorded: Confirmed Scammer!", "success");
  };

  // React to Post
  const handleReact = async (reactionType: ReactionType) => {
    if (!requireAuth("react")) return;
    if (!post) return;
    triggerHaptic();
    setShowReactionPicker(false);

    const userId = currentUser.uid;
    const userName = currentUser.displayName || currentUser.email?.split("@")[0] || "Community Member";
    const userAvatar = currentUser.photoURL || undefined;

    const existingReaction = post.reactions?.[userId];
    const newReactions = { ...(post.reactions || {}) };
    const newCounts = {
      like: post.reactionsCount?.like || 0,
      love: post.reactionsCount?.love || 0,
      haha: post.reactionsCount?.haha || 0,
      wow: post.reactionsCount?.wow || 0,
      sad: post.reactionsCount?.sad || 0,
      angry: post.reactionsCount?.angry || 0,
    };
    const newUsers = { ...(post.reactionsUsers || {}) };

    if (existingReaction === reactionType) {
      delete newReactions[userId];
      delete newUsers[userId];
      newCounts[reactionType] = Math.max(0, newCounts[reactionType] - 1);
    } else {
      if (existingReaction) {
        newCounts[existingReaction] = Math.max(0, newCounts[existingReaction] - 1);
      }
      newReactions[userId] = reactionType;
      newCounts[reactionType] = (newCounts[reactionType] || 0) + 1;
      newUsers[userId] = {
        userName,
        userAvatar,
        type: reactionType,
        timestamp: Date.now(),
      };
    }

    const updatedPost = {
      ...post,
      reactions: newReactions,
      reactionsCount: newCounts,
      reactionsUsers: newUsers,
    };
    setPost(updatedPost);

    try {
      await updateDoc(doc(db, "scam_posts", post.id), {
        reactions: newReactions,
        reactionsCount: newCounts,
        reactionsUsers: newUsers,
      });
    } catch (e) {}
  };

  // Photo Upload in Comment
  const handleCommentImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsWatermarkingCommentImage(true);
    triggerHaptic();

    try {
      const { dataUrl } = await applyWatermarkToImage(file, {
        watermarkText: "Revealed On DEEP SHOP",
        subText: "COMMENT EVIDENCE • VERIFIED REPORT",
        opacity: 0.32,
      });
      setCommentImagePreview(dataUrl);
      notify("Evidence photo watermarked successfully!", "success");
    } catch (err) {
      console.error("Watermark error:", err);
      notify("Failed to watermark image", "error");
    } finally {
      setIsWatermarkingCommentImage(false);
    }
  };

  // Add Comment & Trigger Mention Notification
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAuth("comment")) return;
    if (!post) return;

    if (!commentText.trim() && !commentImagePreview) {
      notify("Please write a comment or attach photo proof", "error");
      return;
    }

    // Extract @mentions
    const mentionMatches = commentText.match(/@(\w+)/g);
    const mentions = mentionMatches ? mentionMatches.map((m) => m.substring(1)) : [];

    const newComment: ScamComment = {
      id: "comm_" + Date.now(),
      postId: post.id,
      userId: currentUser.uid,
      userName: currentUser.displayName || currentUser.email?.split("@")[0] || "Community Member",
      userAvatar:
        currentUser.photoURL ||
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
      text: commentText.trim(),
      imageUrl: commentImagePreview || undefined,
      replyToCommentId: replyingTo?.commentId,
      replyToUserName: replyingTo?.userName,
      mentions,
      createdAt: Date.now(),
    };

    const updatedComments = [...comments, newComment];
    setComments(updatedComments);
    localStorage.setItem(`comments_${post.id}`, JSON.stringify(updatedComments));

    // Try saving to Firestore
    try {
      await addDoc(collection(db, `scam_posts/${post.id}/comments`), newComment);
      await updateDoc(doc(db, "scam_posts", post.id), {
        commentsCount: increment(1),
      });
    } catch (e) {}

    // Send in-app notification if reply or mention
    try {
      const targetUserId = replyingTo?.userId || (post.reporterId !== currentUser.uid ? post.reporterId : null);
      if (targetUserId) {
        await addDoc(collection(db, "notifications"), {
          userId: targetUserId,
          title: replyingTo ? `New Reply from ${newComment.userName}` : `New Comment on your Incident Report`,
          message: `${newComment.userName} commented: "${commentText.slice(0, 80)}${commentText.length > 80 ? "..." : ""}"`,
          type: "info",
          variant: "news-hub",
          link: `/news-hub/post/${post.id}`,
          isRead: false,
          createdAt: Date.now(),
        });
      }

      // Also create notifications for any @mentioned users
      if (mentions.length > 0) {
        for (const mention of mentions) {
          await addDoc(collection(db, "notifications"), {
            userId: "all", // broad broadcast if exact uid unknown
            title: `You were mentioned by ${newComment.userName}`,
            message: `@${mention}: ${commentText.slice(0, 80)}`,
            type: "info",
            variant: "news-hub",
            link: `/news-hub/post/${post.id}`,
            isRead: false,
            createdAt: Date.now(),
          });
        }
      }
    } catch (e) {
      console.warn("Could not dispatch notification:", e);
    }

    setCommentText("");
    setCommentImagePreview(null);
    setReplyingTo(null);
    notify(replyingTo ? `Reply sent to ${replyingTo.userName}!` : "Comment published!", "success");
  };

  const copyField = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    triggerHaptic();
    notify(`Copied ${fieldName}: ${text}`, "success");
    setTimeout(() => setCopiedField(null), 2500);
  };

  const copyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    triggerHaptic();
    notify("Direct share link copied to clipboard!", "success");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (isBlockedShadowReview) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-12 h-12 text-amber-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Report Under Verification Review</h2>
        <p className="text-xs text-slate-500 max-w-sm mb-6">
          This publication is undergoing administrative safety review to comply with community standards.
        </p>
        <button
          type="button"
          onClick={() => navigate('/news-hub')}
          className="px-6 py-2.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-black text-xs font-bold hover:opacity-90 transition cursor-pointer"
        >
          Back to News Hub
        </button>
      </div>
    );
  }

  if (loading || !post) {
    return (
      <div className="min-h-screen bg-[#F0F2F5] dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          Loading report & verified evidence...
        </p>
      </div>
    );
  }

  const currentUserReaction = currentUser ? post.reactions?.[currentUser.uid] : null;
  const isScam = post.postType === "scam" || !post.postType;
  const reactionsList = Object.entries(post.reactionsUsers || {}).map(([uid, data]) => ({
    userId: uid,
    ...data,
  }));

  const filteredReactionsList =
    activeReactionTab === "all"
      ? reactionsList
      : reactionsList.filter((r) => r.type === activeReactionTab);

  // Separate top-level comments and nested replies
  const topComments = comments.filter((c) => !c.replyToCommentId);
  const getReplies = (commentId: string) => comments.filter((c) => c.replyToCommentId === commentId);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans pb-16">
      <SEO
        title={`${post.title} • DEEP SHOP News Hub`}
        description={post.description.slice(0, 160)}
      />

      {/* TOP DEDICATED NEWS HEADER (NO SHOP HEADER) */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-3">
          {/* Back button & Tab Switcher */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate("/news-hub")}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition shrink-0 cursor-pointer"
              title="Back to News Hub"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Pill Tab Switcher: 2 tabs, single line, stylish */}
            <TopNavTabSwitcher />
          </div>

          {/* Right Action: Share & Report Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
              title="Share Incident"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <Link
              to="/news-hub/create"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-bold shadow-xs transition"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Post Report</span>
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN FULL-SCREEN CONTENT */}
      <main className="max-w-4xl mx-auto px-3.5 sm:px-4 py-4 sm:py-6 space-y-4">
        {/* Breadcrumb Pill (Single line, small font, full text visible) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
          <Link to="/news-hub" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition font-medium">
            News Hub
          </Link>
          <ChevronRight className="w-3 h-3 shrink-0" />
          <span className="font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
            {isScam ? "Scam Alert" : "News & Article"}
          </span>
          <ChevronRight className="w-3 h-3 shrink-0" />
          <span className="truncate max-w-[200px] sm:max-w-[320px] text-zinc-400">
            {post.title}
          </span>
        </div>

        {/* ADMIN MODERATION CONTROL BAR */}
        {isAdmin && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Admin In-Place Moderation
                {((post as any).status === "under_review" || (post as any).isBrandReview) && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px]">Under Review</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {((post as any).status === "under_review" || (post as any).isBrandReview) && (
                <button
                  type="button"
                  onClick={handleAdminApprovePost}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  Approve Post
                </button>
              )}
              <button
                type="button"
                onClick={openAdminEdit}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black text-white flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                Edit Post & Images
              </button>
              <button
                type="button"
                onClick={handleAdminDeletePost}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Delete Post
              </button>
            </div>
          </div>
        )}

        {/* POST MAIN CARD */}
        <article className="bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-7 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
          {/* Header Row: Category Badge & Status (Strictly single line) */}
          <div className="flex items-center justify-between gap-1.5 border-b border-zinc-100 dark:border-zinc-800/80 pb-3 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0">
              {isScam ? (
                <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] xs:text-[10px] sm:text-xs font-black uppercase tracking-wide bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 whitespace-nowrap shrink-0">
                  <ShieldAlert className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">Scam Alert • {post.category.replace(/_/g, " ")}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] xs:text-[10px] sm:text-xs font-black uppercase tracking-wide bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 whitespace-nowrap shrink-0">
                  <Newspaper className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">Tech News & Community</span>
                </span>
              )}

              {post.status === "trending" && (
                <span className="inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 rounded-full text-[9px] xs:text-[10px] sm:text-[11px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 whitespace-nowrap shrink-0">
                  <Flame className="w-3 h-3 shrink-0 text-amber-600" />
                  <span className="whitespace-nowrap">Viral Alert</span>
                </span>
              )}

              {post.status === "verified" && (
                <span className="inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 rounded-full text-[9px] xs:text-[10px] sm:text-[11px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 whitespace-nowrap shrink-0">
                  <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-600" />
                  <span className="whitespace-nowrap">Verified Report</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap shrink-0">
              <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="whitespace-nowrap">{(post.views || 1200).toLocaleString()} views</span>
            </div>
          </div>

          {/* Reporter Profile Info */}
          <div className="flex items-center justify-between gap-3">
            <div 
              onClick={() => navigate(`/author/${post.reporterId || 'user_jenny'}`)}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <img
                src={
                  post.reporterAvatar ||
                  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80"
                }
                alt={post.reporterName}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 group-hover:ring-2 group-hover:ring-blue-500 transition"
              />
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <h4 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-600 transition">
                    {post.reporterName}
                  </h4>
                  {(post as any).feeling && (
                    <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                      is {(post as any).feeling.emoji} {(post as any).feeling.text}
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 whitespace-nowrap shrink-0">
                    Reporter
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                  Posted {new Date(post.createdAt).toLocaleDateString()} at{" "}
                  {new Date(post.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleToggleFollow}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition active:scale-95 cursor-pointer whitespace-nowrap shadow-xs ${
                  isFollowing
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {isFollowing ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
                    <span>Following</span>
                  </>
                ) : (
                  <span>+ Follow</span>
                )}
              </button>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-zinc-900 dark:text-zinc-50 leading-tight">
            {post.title}
          </h1>

          {/* SCAMMER DOSSIER BOX (Only if Scam Alert) */}
          {isScam && (
            <div className="bg-rose-50/70 dark:bg-rose-950/20 rounded-2xl p-3.5 sm:p-5 border border-rose-200 dark:border-rose-900/40 space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-rose-200/80 dark:border-rose-900/40 pb-2.5">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-rose-800 dark:text-rose-300 whitespace-nowrap truncate">
                    Accused Scammer Information
                  </span>
                </div>
                {post.scammedAmount ? (
                  <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black bg-rose-600 text-white shadow-xs whitespace-nowrap shrink-0">
                    Loss: ৳{post.scammedAmount.toLocaleString()}
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                {post.scammerName && (
                  <div className="bg-white/80 dark:bg-zinc-900/80 p-2.5 rounded-xl border border-rose-100 dark:border-rose-950/50">
                    <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block mb-0.5">
                      Name / Organization
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {post.scammerName}
                    </span>
                  </div>
                )}

                {post.scammerPhone && (
                  <div className="bg-white/80 dark:bg-zinc-900/80 p-2.5 rounded-xl border border-rose-100 dark:border-rose-950/50 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block mb-0.5">
                        Phone Number
                      </span>
                      <a
                        href={`tel:${post.scammerPhone}`}
                        className="font-bold text-rose-600 dark:text-rose-400 hover:underline"
                      >
                        {post.scammerPhone}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyField(post.scammerPhone!, "Phone")}
                      className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 cursor-pointer"
                    >
                      {copiedField === "Phone" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}

                {post.scammerBkash && (
                  <div className="bg-white/80 dark:bg-zinc-900/80 p-2.5 rounded-xl border border-rose-100 dark:border-rose-950/50 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block mb-0.5">
                        bKash / Nagad Wallet
                      </span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {post.scammerBkash}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyField(post.scammerBkash!, "Wallet")}
                      className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 cursor-pointer"
                    >
                      {copiedField === "Wallet" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}

                {post.scammerSocialLink && (
                  <div className="bg-white/80 dark:bg-zinc-900/80 p-2.5 rounded-xl border border-rose-100 dark:border-rose-950/50 flex items-center justify-between">
                    <div className="truncate pr-2">
                      <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block mb-0.5">
                        Page / Social Link
                      </span>
                      <a
                        href={post.scammerSocialLink}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-blue-600 dark:text-blue-400 hover:underline truncate block"
                      >
                        {post.scammerSocialLink}
                      </a>
                    </div>
                    <ExternalLink className="w-4 h-4 text-zinc-400 shrink-0" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Full Story Description */}
          <div className="prose dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-200 leading-relaxed text-sm sm:text-base whitespace-pre-line">
            {post.description}
          </div>

          {/* WATERMARKED EVIDENCE PHOTOS GALLERY */}
          {post.images && post.images.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5 truncate">
                  <Camera className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span className="truncate">Evidence & Screenshots ({post.images.length})</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {post.images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="group relative rounded-2xl overflow-hidden bg-zinc-950 aspect-video border border-zinc-200 dark:border-zinc-800 shadow-sm"
                  >
                    <img
                      src={imgUrl}
                      alt={`Evidence ${idx + 1}`}
                      className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                      onClick={() => setActiveImageIndex(idx)}
                    />

                    {/* Watermark overlay indication */}
                    <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-md tracking-wider flex items-center gap-1 shadow-xs pointer-events-none">
                      <ShieldAlert className="w-3 h-3 text-rose-400" />
                      <span>Revealed On DEEP SHOP</span>
                    </div>

                    {/* Download Button: Saves photo with baked-in watermark */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadWatermarkedImage(imgUrl, `deep-shop-scam-${post.id}-${idx + 1}.jpg`);
                      }}
                      className="absolute bottom-2.5 right-2.5 bg-white/95 dark:bg-zinc-900/95 hover:bg-white text-zinc-900 dark:text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                      <span>Download</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COMMUNITY VOTING BOX (Strictly single line on mobile) */}
          <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl p-3 sm:p-5 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 overflow-hidden">
            <div className="space-y-0.5 min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 whitespace-nowrap truncate">
                <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span className="whitespace-nowrap truncate">Community Verification</span>
              </h4>
              <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap truncate">
                {post.votes.toLocaleString()} members confirmed report
              </p>
            </div>

            <button
              type="button"
              onClick={handleVote}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-black transition active:scale-95 cursor-pointer shadow-xs whitespace-nowrap shrink-0 ${
                post.votedUserIds?.includes(currentUser?.uid)
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700 hover:border-rose-500 hover:text-rose-600"
              }`}
            >
              <ThumbsUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="whitespace-nowrap">
                {post.votedUserIds?.includes(currentUser?.uid) ? "Voted: Confirmed!" : "Vote Scammer"}
              </span>
            </button>
          </div>

          {/* REACTION BAR & BREAKDOWN (Facebook-style - Strictly single line on mobile) */}
          <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-3 space-y-2.5">
            {/* Reaction counts breakdown */}
            <div className="flex items-center justify-between text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 gap-2 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowReactionsModal(true)}
                className="flex items-center gap-1 sm:gap-1.5 hover:underline cursor-pointer whitespace-nowrap shrink-0 min-w-0"
              >
                <div className="flex -space-x-1 shrink-0">
                  {Object.entries(post.reactionsCount || {})
                    .filter(([_, count]) => count > 0)
                    .slice(0, 3)
                    .map(([type]) => (
                      <span key={type} className="text-xs sm:text-sm">
                        {REACTION_EMOJIS[type as ReactionType]?.emoji}
                      </span>
                    ))}
                </div>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap text-[10px] sm:text-xs">
                  {Object.values(post.reactionsCount || {}).reduce((a, b) => a + b, 0)} reactions
                </span>
                <span className="text-[9px] sm:text-[10px] text-zinc-400 whitespace-nowrap hidden xs:inline">• View reactions</span>
              </button>

              <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0 text-[10px] sm:text-xs">
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{comments.length} comments</span>
                </span>
              </div>
            </div>

            {/* Interactive Action Buttons (Strictly single line on mobile) */}
            <div className="relative flex items-center justify-between border-y border-zinc-100 dark:border-zinc-800/80 py-1 sm:py-1.5 gap-1 overflow-x-auto no-scrollbar">
              {/* React button with long hover/tap flyout */}
              <div className="relative shrink-0 flex-1">
                <button
                  type="button"
                  onClick={() => handleReact("like")}
                  onMouseEnter={() => setShowReactionPicker(true)}
                  className={`w-full flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                    currentUserReaction
                      ? `${REACTION_EMOJIS[currentUserReaction]?.color} bg-zinc-100 dark:bg-zinc-800`
                      : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span className="text-xs sm:text-sm shrink-0">
                    {currentUserReaction ? REACTION_EMOJIS[currentUserReaction]?.emoji : "👍"}
                  </span>
                  <span className="whitespace-nowrap">{currentUserReaction ? REACTION_EMOJIS[currentUserReaction]?.label : "React"}</span>
                </button>

                {/* Reaction Picker Flyout */}
                <AnimatePresence>
                  {showReactionPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: -45, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      onMouseLeave={() => setShowReactionPicker(false)}
                      className="absolute -top-3 left-0 z-50 flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-full px-2 py-1.5"
                    >
                      {(Object.keys(REACTION_EMOJIS) as ReactionType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleReact(type)}
                          className="hover:scale-130 transition-transform text-lg sm:text-xl p-1 rounded-full cursor-pointer"
                          title={REACTION_EMOJIS[type].label}
                        >
                          {REACTION_EMOJIS[type].emoji}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Comment Scroll Button */}
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("comment-input-area");
                  el?.focus();
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex-1 flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Comment</span>
              </button>

              {/* Share Button */}
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="flex-1 flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <Share2 className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Share</span>
              </button>
            </div>
          </div>
        </article>

        {/* COMMENTS & REPLIES SECTION */}
        <section className="bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-7 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 truncate">
              <MessageCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="truncate">Comments & Evidence Thread ({comments.length})</span>
            </h3>
          </div>

          {/* Comment Composer */}
          <form onSubmit={handleAddComment} className="space-y-3">
            {replyingTo && (
              <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl text-xs text-zinc-600 dark:text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <Reply className="w-3.5 h-3.5 text-rose-500" />
                  <span>
                    Replying to <strong>@{replyingTo.userName}</strong>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex gap-2.5 items-start">
              <img
                src={
                  currentUser?.photoURL ||
                  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
                }
                alt="You"
                className="w-9 h-9 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 mt-1"
              />

              <div className="flex-1 space-y-2">
                <textarea
                  id="comment-input-area"
                  rows={2}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={
                    replyingTo
                      ? `Write a reply to @${replyingTo.userName}...`
                      : "Add comment, evidence or type @ to mention someone..."
                  }
                  className="w-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-3 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500 dark:text-zinc-100 resize-none"
                />

                {/* Evidence Image Preview in comment */}
                {commentImagePreview && (
                  <div className="relative inline-block rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 max-w-[200px]">
                    <img src={commentImagePreview} alt="Evidence" className="h-28 w-auto object-cover" />
                    <button
                      type="button"
                      onClick={() => setCommentImagePreview(null)}
                      className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded-full hover:bg-black cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                      Watermarked
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                    <Camera className="w-4 h-4 text-rose-500" />
                    <span>{isWatermarkingCommentImage ? "Watermarking..." : "Attach Proof"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCommentImage}
                      disabled={isWatermarkingCommentImage}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={isWatermarkingCommentImage}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{replyingTo ? "Send Reply" : "Post"}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-4 pt-2">
            {topComments.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 text-xs">
                No comments yet. Be the first to share evidence or information!
              </div>
            ) : (
              topComments.map((comment) => {
                const replies = getReplies(comment.id);
                return (
                  <div key={comment.id} className="space-y-3">
                    {/* Top-level comment */}
                    <div className="flex gap-3 items-start group">
                      <img
                        src={comment.userAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80"}
                        alt={comment.userName}
                        className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 mt-0.5"
                      />

                      <div className="flex-1 space-y-1.5">
                        <div className="bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl p-3 inline-block max-w-full">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              {comment.userName}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {new Date(comment.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>

                          <p className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
                            {comment.text}
                          </p>

                          {comment.imageUrl && (
                            <div className="mt-2 relative inline-block rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                              <img
                                src={comment.imageUrl}
                                alt="Evidence attachment"
                                className="max-h-48 w-auto rounded-xl object-cover cursor-pointer"
                                onClick={() => window.open(comment.imageUrl, "_blank")}
                              />
                              <button
                                type="button"
                                onClick={() => downloadWatermarkedImage(comment.imageUrl!, `comment-proof-${comment.id}.jpg`)}
                                className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-xs"
                              >
                                <Download className="w-3 h-3" />
                                <span>Save</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Reply Action button & Admin Controls */}
                        <div className="flex items-center gap-3 pl-2 text-[11px] text-zinc-500 font-semibold">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingTo({
                                commentId: comment.id,
                                userName: comment.userName,
                                userId: comment.userId,
                              });
                              setCommentText(`@${comment.userName} `);
                              const el = document.getElementById("comment-input-area");
                              el?.focus();
                            }}
                            className="hover:text-rose-600 transition flex items-center gap-1 cursor-pointer"
                          >
                            <Reply className="w-3 h-3" />
                            <span>Reply</span>
                          </button>

                          {isAdmin && (
                            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-zinc-200 dark:border-zinc-700">
                              <button
                                type="button"
                                onClick={() => handleAdminEditComment(comment.id, comment.text)}
                                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition flex items-center gap-1 cursor-pointer"
                                title="Edit comment"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAdminDeleteComment(comment.id)}
                                className="text-rose-500 hover:text-rose-700 transition flex items-center gap-1 cursor-pointer"
                                title="Delete comment"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Nested Replies */}
                    {replies.length > 0 && (
                      <div className="pl-10 sm:pl-12 space-y-2.5 border-l-2 border-zinc-100 dark:border-zinc-800 ml-4">
                        {replies.map((reply) => (
                          <div key={reply.id} className="flex gap-2.5 items-start">
                            <img
                              src={reply.userAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80"}
                              alt={reply.userName}
                              className="w-7 h-7 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 mt-0.5"
                            />
                            <div className="flex-1">
                              <div className="bg-zinc-100/90 dark:bg-zinc-800/60 rounded-2xl p-2.5 inline-block max-w-full">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                    {reply.userName}
                                  </span>
                                  {reply.replyToUserName && (
                                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                      replied to <strong className="text-rose-500">@{reply.replyToUserName}</strong>
                                    </span>
                                  )}
                                  <span className="text-[10px] text-zinc-400">
                                    • {new Date(reply.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200">
                                  {reply.text}
                                </p>
                              </div>

                              <div className="pl-2 pt-1 flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyingTo({
                                      commentId: comment.id,
                                      userName: reply.userName,
                                      userId: reply.userId,
                                    });
                                    setCommentText(`@${reply.userName} `);
                                    const el = document.getElementById("comment-input-area");
                                    el?.focus();
                                  }}
                                  className="text-[11px] font-semibold text-zinc-500 hover:text-rose-600 transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Reply className="w-3 h-3" />
                                  <span>Reply</span>
                                </button>

                                {isAdmin && (
                                  <div className="flex items-center gap-2 ml-2 pl-2 border-l border-zinc-200 dark:border-zinc-700 text-[11px]">
                                    <button
                                      type="button"
                                      onClick={() => handleAdminEditComment(reply.id, reply.text)}
                                      className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition flex items-center gap-1 cursor-pointer"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      <span>Edit</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAdminDeleteComment(reply.id)}
                                      className="text-rose-500 hover:text-rose-700 transition flex items-center gap-1 cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* WHO REACTED MODAL (Accurate breakdown & list of people who reacted) */}
      <AnimatePresence>
        {showReactionsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <span>Reactions</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    {reactionsList.length}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowReactionsModal(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Reaction filter tabs */}
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveReactionTab("all")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    activeReactionTab === "all"
                      ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                      : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  All ({reactionsList.length})
                </button>
                {(Object.keys(REACTION_EMOJIS) as ReactionType[]).map((type) => {
                  const count = post.reactionsCount?.[type] || 0;
                  if (count === 0) return null;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setActiveReactionTab(type)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        activeReactionTab === type
                          ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                          : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span>{REACTION_EMOJIS[type].emoji}</span>
                      <span>{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Reaction User list */}
              <div className="p-4 overflow-y-auto space-y-3 flex-1">
                {filteredReactionsList.length === 0 ? (
                  <div className="text-center py-6 text-zinc-400 text-xs">
                    No reactions in this category yet.
                  </div>
                ) : (
                  filteredReactionsList.map((user) => (
                    <div
                      key={user.userId}
                      className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={
                            user.userAvatar ||
                            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80"
                          }
                          alt={user.userName}
                          className="w-9 h-9 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                        />
                        <div>
                          <h5 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {user.userName}
                          </h5>
                          <span className="text-[10px] text-zinc-400">
                            Reacted with {REACTION_EMOJIS[user.type]?.label}
                          </span>
                        </div>
                      </div>

                      <span className="text-xl">
                        {REACTION_EMOJIS[user.type]?.emoji}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SHARE MODAL */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-sm border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-rose-500" />
                  <span>Share Report</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Share this verified report to protect friends and social media groups from scams.
              </p>

              <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 p-2.5 rounded-2xl">
                <span className="text-xs text-zinc-600 dark:text-zinc-300 truncate max-w-[210px]">
                  {window.location.href}
                </span>
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="px-3 py-1 bg-rose-600 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                >
                  {copiedLink ? "Copied!" : "Copy Link"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Check this scam report on DEEP SHOP: ${window.location.href}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition"
                >
                  <span>WhatsApp</span>
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
                >
                  <span>Facebook</span>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PUBLIC AUTHOR PROFILE MODAL */}
      <PublicAuthorProfileModal
        userId={selectedAuthorModalId}
        authorName={post?.reporterName}
        authorAvatar={post?.reporterAvatar}
        isOpen={!!selectedAuthorModalId}
        onClose={() => setSelectedAuthorModalId(null)}
        onOpenGiftStars={(uId, uName) => {
          setGiftStarsTarget({ id: uId, name: uName });
          setShowGiftStarsModal(true);
        }}
      />

      {/* ADMIN IN-PLACE EDIT POST MODAL */}
      <AnimatePresence>
        {adminEditing && post && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 my-8 text-zinc-900 dark:text-zinc-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                  <h3 className="font-extrabold text-base">Admin Moderation & Report Editor</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setAdminEditing(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAdminSavePost} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-500 block mb-1">Post Title / Incident Heading</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-500 block mb-1">Report Description & Evidence Details</label>
                  <textarea
                    rows={4}
                    required
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-xs leading-relaxed resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 block mb-1">Scammer Name / Alias</label>
                    <input
                      type="text"
                      value={editScammerName}
                      onChange={(e) => setEditScammerName(e.target.value)}
                      placeholder="e.g. Gadget Store BD"
                      className="w-full px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 block mb-1">Scammer Contact Phone</label>
                    <input
                      type="text"
                      value={editScammerPhone}
                      onChange={(e) => setEditScammerPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 block mb-1">bKash / Wallet Number</label>
                    <input
                      type="text"
                      value={editScammerBkash}
                      onChange={(e) => setEditScammerBkash(e.target.value)}
                      placeholder="01XXXXXXXXX (bKash)"
                      className="w-full px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 block mb-1">Scammed Amount (৳ BDT)</label>
                    <input
                      type="number"
                      value={editScammedAmount}
                      onChange={(e) => setEditScammedAmount(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-500 block mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-xs"
                  >
                    <option value="advance_payment">Advance Payment Fraud</option>
                    <option value="delivery">Courier / Delivery Scam</option>
                    <option value="electronics">Device / Electronics Scam</option>
                    <option value="fake_page">Fake Social Page / Store</option>
                    <option value="tech_news">Tech News / Community Article</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-500 block mb-1">
                    Attached Evidence Photos ({editImages.length})
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editImages.map((imgUrl, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                        <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditImages(editImages.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/80 text-white flex items-center justify-center text-[10px] hover:bg-rose-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="Add image URL..."
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newImageUrl.trim()) {
                          setEditImages([...editImages, newImageUrl.trim()]);
                          setNewImageUrl("");
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-xs font-bold hover:bg-zinc-300 transition"
                    >
                      Add Photo
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleAdminDeletePost}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-100 transition cursor-pointer"
                  >
                    Delete Post
                  </button>

                  <div className="flex items-center gap-2">
                    {((post as any).status === "under_review" || (post as any).isBrandReview) && (
                      <button
                        type="button"
                        onClick={handleAdminApprovePost}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
                      >
                        Approve & Publish
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setAdminEditing(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingAdmin}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50"
                    >
                      {isSavingAdmin ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NewsDetails;
