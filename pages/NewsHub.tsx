import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bell,
  Menu,
  Heart,
  MessageCircle,
  MoreVertical,
  Share2,
  ThumbsUp,
  Flame,
  ShieldAlert,
  AlertTriangle,
  Download,
  Plus,
  Home as HomeIcon,
  User as UserIcon,
  MessageSquare,
  X,
  CheckCircle2,
  ExternalLink,
  Phone,
  CreditCard,
  Camera,
  Send,
  Lock,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Edit3,
  Trash2,
  Image as ImageIcon,
  Check,
} from "lucide-react";
import { auth, db } from "../firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, increment, addDoc, getDocs, getDoc, deleteDoc } from "firebase/firestore";
import { ScamPost, ScamComment, ReactionType } from "../types";
import { TopNavTabSwitcher } from "../components/TopNavTabSwitcher";
import { NewsHubDrawer } from "../components/NewsHubDrawer";
import { PublicAuthorProfileModal } from "../components/PublicAuthorProfileModal";
import { GiftStarsModal } from "../components/GiftStarsModal";
import { applyWatermarkToImage, downloadWatermarkedImage } from "../lib/watermark";
import { useNotify } from "../components/Notifications";
import { triggerHaptic } from "../lib/haptics";
import SEO from "../components/SEO";

// Default seed scam posts matching the wireframe and screenshots
const DEFAULT_POSTS: ScamPost[] = [
  {
    id: "scam_1",
    title: "Fake iPhone 15 Pro Max Advance Payment Scam on Facebook",
    description: "Ordered an iPhone 15 Pro Max from a Facebook page named 'iStore BD Gadgets'. They demanded ৳15,000 advance through bKash promising Steadfast courier delivery within 24 hours. After receiving the payment, they blocked my phone number and WhatsApp immediately. Be careful everyone!",
    scammerName: "Tanvir Ahmed (Fake Name)",
    scammerPhone: "01789234567",
    scammerBkash: "01812345678 (Personal bKash)",
    scammerSocialLink: "facebook.com/istorebdgadgets_fake",
    scammedAmount: 15000,
    category: "advance_payment",
    images: [
      "/assets/aistudio/IMG_4581_f89bd2ce.jpeg",
      "/assets/aistudio/IMG_4581_3dba9589.jpeg",
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80",
    ],
    reporterId: "user_jenny",
    reporterName: "Jenny Wilson",
    reporterAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
    votes: 2420,
    votedUserIds: [],
    reactions: {},
    reactionsCount: {
      like: 1200,
      love: 430,
      haha: 15,
      wow: 85,
      sad: 450,
      angry: 920,
    },
    commentsCount: 2100,
    createdAt: Date.now() - 3 * 60 * 1000, // 3 mins ago
    status: "trending",
    views: 14200,
  },
  {
    id: "scam_2",
    title: "Fake Courier Delivery Agent Swapped Parcel with Soap Bar",
    description: "Received a delivery supposedly containing a high-end Samsung Galaxy S23 Ultra. Delivery rider insisted on cash payment before opening the box. Upon unboxing, found tiles and soap bars inside. Rider fled on motorbike TR-9821. Police complaint filed.",
    scammerName: "Rider ID: SteadFast-Fake901",
    scammerPhone: "01944556677",
    scammerBkash: "01944556677 (Nagad Merchant)",
    scammedAmount: 78000,
    category: "delivery",
    images: [
      "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&auto=format&fit=crop&q=80",
    ],
    reporterId: "user_fahim",
    reporterName: "Fahim Rahman",
    reporterAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80",
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
    commentsCount: 840,
    createdAt: Date.now() - 45 * 60 * 1000,
    status: "trending",
    views: 9800,
  },
  {
    id: "scam_3",
    title: "Unauthorized Apple Gift Card & Reseller License Scam",
    description: "Scammer pretending to be official Apple distributor in Bangladesh collected ৳50,000 for authorized partner onboarding. Provided fake trade license and fake seal. Do not trust any unverified dealer.",
    scammerName: "Shakil Hossain (Apple BD Zone)",
    scammerPhone: "01300998877",
    scammerBkash: "01300998877 (Rocket)",
    scammedAmount: 50000,
    category: "electronics",
    images: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
    ],
    reporterId: "user_sarah",
    reporterName: "Sarah Alom",
    reporterAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    votes: 940,
    votedUserIds: [],
    reactions: {},
    reactionsCount: {
      like: 310,
      love: 15,
      haha: 5,
      wow: 80,
      sad: 210,
      angry: 720,
    },
    commentsCount: 390,
    createdAt: Date.now() - 4 * 3600 * 1000,
    status: "active",
    views: 5400,
  },
];

const REACTION_CONFIG: Record<ReactionType, { emoji: string; label: string; color: string }> = {
  like: { emoji: "👍", label: "Like", color: "text-blue-500" },
  love: { emoji: "❤️", label: "Love", color: "text-rose-500" },
  haha: { emoji: "😆", label: "Haha", color: "text-amber-500" },
  wow: { emoji: "😮", label: "Wow", color: "text-amber-500" },
  sad: { emoji: "😢", label: "Sad", color: "text-amber-500" },
  angry: { emoji: "😡", label: "Angry", color: "text-orange-600" },
};

const STORIES = [
  {
    id: "story_user",
    name: "Your Story",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    isUser: true,
  },
  {
    id: "story_1",
    name: "Jenny",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "story_2",
    name: "Alex",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "story_3",
    name: "Liam",
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
    image: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "story_4",
    name: "David",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
  },
];

export const NewsHub: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const notify = useNotify();

  const [posts, setPosts] = useState<ScamPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modals & Panels
  const [activePostDetails, setActivePostDetails] = useState<ScamPost | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authReason, setAuthReason] = useState("interact");
  const [activeReactionPickerPostId, setActiveReactionPickerPostId] = useState<string | null>(null);
  const [activeShareModalPost, setActiveShareModalPost] = useState<ScamPost | null>(null);

  // Comments State
  const [commentsDrawerPostId, setCommentsDrawerPostId] = useState<string | null>(null);
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);
  const [postComments, setPostComments] = useState<Record<string, ScamComment[]>>({});
  const [newCommentText, setNewCommentText] = useState("");
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [isWatermarkingCommentImage, setIsWatermarkingCommentImage] = useState(false);

  // Story Viewer
  const [selectedStory, setSelectedStory] = useState<any | null>(null);

  // Author Profile & Gift Stars Modals
  const [selectedAuthorModalId, setSelectedAuthorModalId] = useState<string | null>(null);
  const [selectedAuthorName, setSelectedAuthorName] = useState<string>("Community Member");
  const [selectedAuthorAvatar, setSelectedAuthorAvatar] = useState<string>("");
  const [showGiftStarsModal, setShowGiftStarsModal] = useState(false);
  const [giftStarsTarget, setGiftStarsTarget] = useState<{ id: string; name: string }>({ id: '', name: '' });
  const [photoAds, setPhotoAds] = useState<any[]>([]);

  // Admin In-Place Management State
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEditingPost, setAdminEditingPost] = useState<ScamPost | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editScammerName, setEditScammerName] = useState("");
  const [editScammerPhone, setEditScammerPhone] = useState("");
  const [editScammerBkash, setEditScammerBkash] = useState("");
  const [editScammedAmount, setEditScammedAmount] = useState<string>("0");
  const [editCategory, setEditCategory] = useState("advance_payment");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [isSavingAdminEdit, setIsSavingAdminEdit] = useState(false);

  // Admin Comment Edit State
  const [adminEditingComment, setAdminEditingComment] = useState<{ postId: string; commentId: string; text: string } | null>(null);

  // Fetch active admin banner/feed ads
  useEffect(() => {
    const fetchAds = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "ads"));
        if (snap.exists() && snap.data().photoAds) {
          setPhotoAds(snap.data().photoAds.filter((a: any) => a.active));
        } else {
          setPhotoAds([{
            id: 'ad_default_1',
            active: true,
            adType: 'in_feed',
            title: 'DEEP SHOP Premium Defense Membership',
            text: 'Get 0% commission fees on all gadget trades and instant courier dispatch.',
            buttonText: 'Explore Benefits',
            buttonLink: '/subscription',
            images: [{ url: 'https://images.unsplash.com/photo-1556742049-0a670f4a4591?w=800&auto=format&fit=crop&q=80', ratio: '16/9' }]
          }]);
        }
      } catch (e) {
        setPhotoAds([{
          id: 'ad_default_1',
          active: true,
          adType: 'in_feed',
          title: 'DEEP SHOP Premium Defense Membership',
          text: 'Get 0% commission fees on all gadget trades and instant courier dispatch.',
          buttonText: 'Explore Benefits',
          buttonLink: '/subscription',
          images: [{ url: 'https://images.unsplash.com/photo-1556742049-0a670f4a4591?w=800&auto=format&fit=crop&q=80', ratio: '16/9' }]
        }]);
      }
    };
    fetchAds();
  }, []);

  // 1. Auth Listener & Admin Role Verification
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
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
    return unsub;
  }, []);

  const openAdminEdit = (post: ScamPost) => {
    setAdminEditingPost(post);
    setEditTitle(post.title || "");
    setEditDesc(post.description || "");
    setEditScammerName(post.scammerName || "");
    setEditScammerPhone(post.scammerPhone || "");
    setEditScammerBkash(post.scammerBkash || "");
    setEditScammedAmount(post.scammedAmount ? post.scammedAmount.toString() : "0");
    setEditCategory(post.category || "advance_payment");
    setEditImages(post.images ? [...post.images] : []);
    setNewImageUrl("");
  };

  const handleAdminSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEditingPost) return;
    setIsSavingAdminEdit(true);
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
        await updateDoc(doc(db, "scam_posts", adminEditingPost.id), updatedFields);
      } catch (err) {}

      // Update local state
      setPosts(prev => prev.map(p => p.id === adminEditingPost.id ? { ...p, ...updatedFields } : p));
      notify("Post updated successfully by Admin!", "success");
      setAdminEditingPost(null);
    } catch (err: any) {
      notify(err.message || "Failed to update post", "error");
    } finally {
      setIsSavingAdminEdit(false);
    }
  };

  const handleAdminApprovePost = async (postId: string) => {
    try {
      try {
        await updateDoc(doc(db, "scam_posts", postId), {
          status: "active",
          isBrandReview: false,
        });
      } catch (err) {}
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: "active", isBrandReview: false } : p));
      notify("Post approved and made public to everyone!", "success");
      if (adminEditingPost?.id === postId) setAdminEditingPost(null);
    } catch (err) {
      notify("Failed to approve post", "error");
    }
  };

  const handleAdminDeletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this post?")) return;
    try {
      try {
        await deleteDoc(doc(db, "scam_posts", postId));
      } catch (err) {}
      setPosts(prev => prev.filter(p => p.id !== postId));
      notify("Post permanently removed by Admin.", "info");
      if (adminEditingPost?.id === postId) setAdminEditingPost(null);
    } catch (err) {
      notify("Failed to delete post", "error");
    }
  };

  const handleAdminDeleteComment = async (postId: string, commentId: string) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      try {
        await deleteDoc(doc(db, `scam_posts/${postId}/comments`, commentId));
      } catch (err) {}
      setPostComments(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).filter(c => c.id !== commentId)
      }));
      notify("Comment deleted by Admin.", "info");
    } catch (err) {
      notify("Failed to delete comment", "error");
    }
  };

  const handleAdminSaveComment = async (postId: string, commentId: string, newText: string) => {
    try {
      try {
        await updateDoc(doc(db, `scam_posts/${postId}/comments`, commentId), { text: newText });
      } catch (err) {}
      setPostComments(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).map(c => c.id === commentId ? { ...c, text: newText } : c)
      }));
      setAdminEditingComment(null);
      notify("Comment updated by Admin.", "success");
    } catch (err) {
      notify("Failed to update comment", "error");
    }
  };

  // 2. Fetch or Sync Posts from Firestore with Local Fallback
  useEffect(() => {
    let unsub: (() => void) | null = null;
    try {
      const q = query(collection(db, "scam_posts"), orderBy("createdAt", "desc"));
      unsub = onSnapshot(
        q,
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ScamPost);
            setPosts(list);
          } else {
            // Seed local storage with default posts
            const saved = localStorage.getItem("deep_scam_posts");
            if (saved) {
              try {
                setPosts(JSON.parse(saved));
              } catch (e) {
                setPosts(DEFAULT_POSTS);
              }
            } else {
              setPosts(DEFAULT_POSTS);
              localStorage.setItem("deep_scam_posts", JSON.stringify(DEFAULT_POSTS));
            }
          }
          setLoading(false);
        },
        (err) => {
          console.warn("Firestore error, using local posts:", err);
          const saved = localStorage.getItem("deep_scam_posts");
          setPosts(saved ? JSON.parse(saved) : DEFAULT_POSTS);
          setLoading(false);
        }
      );
    } catch (e) {
      setPosts(DEFAULT_POSTS);
      setLoading(false);
    }
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Auto-open post if provided in URL query (?post=id)
  useEffect(() => {
    const postId = searchParams.get("post");
    if (postId && posts.length > 0) {
      const found = posts.find((p) => p.id === postId);
      if (found) setActivePostDetails(found);
    }
  }, [searchParams, posts]);

  // Auth requirement check
  const requireAuth = (actionName: string): boolean => {
    if (!currentUser) {
      setAuthReason(actionName);
      setShowAuthModal(true);
      return false;
    }
    return true;
  };

  // Upvote / Scammer Vote
  const handleVoteScammer = async (postId: string) => {
    if (!requireAuth("vote")) return;
    triggerHaptic();

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const userId = currentUser.uid;
    const hasVoted = (post.votedUserIds || []).includes(userId);

    const updatedVoted = hasVoted
      ? (post.votedUserIds || []).filter((id) => id !== userId)
      : [...(post.votedUserIds || []), userId];

    const updatedVoteCount = hasVoted ? Math.max(0, post.votes - 1) : post.votes + 1;

    // Update state locally
    const updatedPosts = posts.map((p) =>
      p.id === postId ? { ...p, votes: updatedVoteCount, votedUserIds: updatedVoted } : p
    );
    setPosts(updatedPosts);
    localStorage.setItem("deep_scam_posts", JSON.stringify(updatedPosts));

    // Try Firestore update
    try {
      await updateDoc(doc(db, "scam_posts", postId), {
        votes: updatedVoteCount,
        votedUserIds: updatedVoted,
      });
    } catch (e) {}

    notify(hasVoted ? "Vote removed" : "Voted: Confirmed Scammer!", "success");
  };

  // React to Post (Facebook Style)
  const handleReact = async (postId: string, reactionType: ReactionType) => {
    if (!requireAuth("react")) return;
    triggerHaptic();
    setActiveReactionPickerPostId(null);

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const userId = currentUser.uid;
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

    if (existingReaction === reactionType) {
      // Toggle off
      delete newReactions[userId];
      newCounts[reactionType] = Math.max(0, newCounts[reactionType] - 1);
    } else {
      if (existingReaction) {
        newCounts[existingReaction] = Math.max(0, newCounts[existingReaction] - 1);
      }
      newReactions[userId] = reactionType;
      newCounts[reactionType] = (newCounts[reactionType] || 0) + 1;
    }

    const updatedPosts = posts.map((p) =>
      p.id === postId ? { ...p, reactions: newReactions, reactionsCount: newCounts } : p
    );
    setPosts(updatedPosts);
    localStorage.setItem("deep_scam_posts", JSON.stringify(updatedPosts));

    try {
      await updateDoc(doc(db, "scam_posts", postId), {
        reactions: newReactions,
        reactionsCount: newCounts,
      });
    } catch (e) {}
  };

  // Comments: Handle uploading an image into a comment (with automatic canvas watermark!)
  const handleCommentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsWatermarkingCommentImage(true);
    try {
      const { dataUrl } = await applyWatermarkToImage(file, {
        watermarkText: "Revealed On DEEP SHOP",
        subText: "COMMENT EVIDENCE • VERIFIED REPORT",
        opacity: 0.32,
      });
      setCommentImagePreview(dataUrl);
      notify("Watermark applied to evidence photo!", "success");
    } catch (err) {
      console.error("Watermark error:", err);
      notify("Failed to process image watermark", "error");
    } finally {
      setIsWatermarkingCommentImage(false);
    }
  };

  // Submit comment
  const handleAddComment = async (postId: string) => {
    if (!requireAuth("comment")) return;
    if (!newCommentText.trim() && !commentImagePreview) {
      notify("Please type a comment or attach an image", "error");
      return;
    }

    const comment: ScamComment = {
      id: "comment_" + Date.now(),
      postId,
      userId: currentUser.uid,
      userName: currentUser.displayName || currentUser.email?.split("@")[0] || "Anonymous Member",
      userAvatar:
        currentUser.photoURL ||
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
      text: newCommentText.trim(),
      imageUrl: commentImagePreview || undefined,
      createdAt: Date.now(),
    };

    const currentList = postComments[postId] || [];
    const updatedList = [comment, ...currentList];
    setPostComments({ ...postComments, [postId]: updatedList });

    // Update comment count on post
    const updatedPosts = posts.map((p) =>
      p.id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p
    );
    setPosts(updatedPosts);
    localStorage.setItem("deep_scam_posts", JSON.stringify(updatedPosts));

    setNewCommentText("");
    setCommentImagePreview(null);
    notify("Comment posted!", "success");
  };

  // Share post modal
  const handleSharePost = (post: ScamPost) => {
    setActiveShareModalPost(post);
  };

  const copyShareLink = (postId: string) => {
    const url = `${window.location.origin}/news-hub?post=${postId}`;
    navigator.clipboard.writeText(url);
    notify("Share link copied to clipboard!", "success");
  };

  // Filtered posts based on search & category
  const filteredPosts = posts.filter((post) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      post.title.toLowerCase().includes(q) ||
      post.description.toLowerCase().includes(q) ||
      (post.scammerName && post.scammerName.toLowerCase().includes(q)) ||
      (post.scammerPhone && post.scammerPhone.includes(q)) ||
      (post.scammerBkash && post.scammerBkash.includes(q));

    const matchesCategory =
      activeCategory === "all" ||
      (activeCategory === "trending" && post.status === "trending") ||
      (activeCategory === "scam" && (post.postType === "scam" || !post.postType)) ||
      (activeCategory === "news" && post.postType === "news") ||
      post.category === activeCategory;

    // Privacy check
    const currentUid = currentUser?.uid;
    const postPrivacy = (post as any).privacy || "public";
    if (postPrivacy === "only_me" && post.reporterId !== currentUid) {
      return false;
    }
    if (postPrivacy === "except" && currentUid && (post as any).excludedUserIds?.includes(currentUid)) {
      return false;
    }

    // Shadow Review Filter: posts flagged for brand mentions are hidden from everyone except author & admin
    if ((post as any).status === "under_review" || (post as any).isBrandReview) {
      if (post.reporterId !== currentUid && !isAdmin) {
        return false;
      }
    }

    return matchesSearch && matchesCategory;
  });

  // Top trending scammer
  const trendingScammer = [...posts].sort((a, b) => b.votes - a.votes)[0];

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans pb-24 lg:pb-12">
      <SEO
        title="Deep Shop News Hub • Scam Alert & Verified Incident Reports"
        description="Community-driven scam reporting hub. Expose online scammers, vote, verify evidence with 'Revealed On DEEP SHOP' watermarked proof."
      />

      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          {/* Left: Menu & Top Switcher */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setIsMenuDrawerOpen(true);
              }}
              className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-850 flex items-center justify-center text-zinc-700 dark:text-zinc-350 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer"
              title="Menu (HOME, FEED, DASHBOARD)"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* TAB SYSTEM: [Shop] & [News Hub] */}
            <TopNavTabSwitcher />
          </div>

          {/* Right: Notifications & Search Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/news-hub/notifications")}
              className="relative w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
              title="News Hub Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                3
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("scam-search-input");
                el?.focus();
              }}
              className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
              title="Search Scam Database"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER (RESPONSIVE DESKTOP MULTI-COLUMN & MOBILE FEED) */}
      <main className="max-w-6xl mx-auto px-4 py-4 lg:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* DESKTOP LEFT SIDEBAR (>= 1024px) */}
          <aside className="hidden lg:block lg:col-span-3 space-y-4">
            {/* Quick Action: Report Scam */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">Scam Defense Hub</h3>
                  <p className="text-xs text-zinc-500">Expose fraud & alert users</p>
                </div>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Got scammed or discovered a fake seller? Report it here with evidence. Every uploaded image is permanently stamped with{" "}
                <span className="font-bold text-rose-600">"Revealed On DEEP SHOP"</span>.
              </p>

              <button
                type="button"
                onClick={() => {
                  if (requireAuth("post")) navigate("/news-hub/create");
                }}
                className="w-full py-3 px-4 rounded-full bg-black dark:bg-white text-white dark:text-black font-extrabold text-xs shadow-md hover:opacity-90 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Report a Scam</span>
              </button>
            </div>

            {/* Category Filter Chips on Desktop */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-1.5">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Categories</h4>
              {[
                { id: "all", label: "All Posts" },
                { id: "scam", label: "🚨 Scam Alerts" },
                { id: "news", label: "📰 News & Discussion" },
                { id: "trending", label: "🔥 Trending / Viral" },
                { id: "advance_payment", label: "Advance Payment Fraud" },
                { id: "delivery", label: "Courier & Parcel Scam" },
                { id: "electronics", label: "Fake Gadgets & Clones" },
                { id: "tech_news", label: "Tech News & Updates" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between whitespace-nowrap cursor-pointer ${
                    activeCategory === cat.id
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span className="truncate">{cat.label}</span>
                  {cat.id === "trending" && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-rose-500 text-white font-black shrink-0">
                      Hot
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Safety Verification Seal */}
            <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                <Sparkles className="w-4 h-4" />
                <span>Deep Shop Guarantee</span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                All photos are protected with watermarking to prevent scammers from reusing user evidence.
              </p>
            </div>
          </aside>

          {/* CENTER FEED (MOBILE & DESKTOP CORE) */}
          <div className="lg:col-span-6 space-y-4">
            {/* SEARCH & FILTER BAR */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-3 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="scam-search-input"
                  type="text"
                  placeholder="Search scammer name, phone, bKash or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none font-medium placeholder-zinc-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* MOBILE QUICK CATEGORIES (Single line pill shape, small font, full text visible) */}
            <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none whitespace-nowrap">
              {[
                { id: "all", label: "All Posts" },
                { id: "scam", label: "🚨 Scam Alerts" },
                { id: "news", label: "📰 News" },
                { id: "trending", label: "🔥 Trending" },
                { id: "advance_payment", label: "Advance Fraud" },
                { id: "delivery", label: "Courier Scam" },
                { id: "electronics", label: "Fake Devices" },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCategory(c.id)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-tight whitespace-nowrap shrink-0 transition cursor-pointer ${
                    activeCategory === c.id
                      ? "bg-black text-white dark:bg-white dark:text-black shadow-xs font-black"
                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>


            {/* FEED POSTS LIST */}
            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-400">Loading verified scam reports...</div>
            ) : filteredPosts.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 text-center border border-zinc-200 dark:border-zinc-800 space-y-3">
                <ShieldAlert className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto" />
                <h3 className="font-bold text-sm">No scam reports found</h3>
                <p className="text-xs text-zinc-500">Try searching with a different phone number or category.</p>
              </div>
            ) : (
              filteredPosts.map((post, idx) => (
                <React.Fragment key={post.id}>
                  <article
                  key={post.id}
                  className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition"
                >
                  {/* POST HEADER (EXACT MATCH TO IMG_4581_f89bd2ce.jpeg) */}
                  <div className="flex items-center justify-between">
                    <div 
                      onClick={() => navigate(`/author/${post.reporterId || 'user_jenny'}`)}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <img
                        src={post.reporterAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                        alt={post.reporterName}
                        className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 group-hover:ring-2 group-hover:ring-blue-500 transition"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-blue-600 transition">
                            {post.reporterName}
                          </span>
                          <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500 text-white shrink-0" />
                          {(post as any).feeling && (
                            <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                              is {(post as any).feeling.emoji} {(post as any).feeling.text}
                            </span>
                          )}
                          {(post as any).taggedUsers && (post as any).taggedUsers.length > 0 && (
                            <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                              with <strong className="text-blue-600 dark:text-blue-400">{(post as any).taggedUsers.map((u: any) => '@' + u.username).join(', ')}</strong>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <span>
                            {Math.round((Date.now() - post.createdAt) / 60000)} mins ago
                          </span>
                          <span>•</span>
                          <span>Bangladesh</span>
                          <span>•</span>
                          <span>🌐</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Under Review indicator */}
                      {((post as any).status === "under_review" || (post as any).isBrandReview) && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
                          Under Review
                        </span>
                      )}

                      {/* Discreet Admin controls */}
                      {isAdmin && (
                        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                          {((post as any).status === "under_review" || (post as any).isBrandReview) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdminApprovePost(post.id);
                              }}
                              title="Approve Post"
                              className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-emerald-600 rounded transition cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAdminEdit(post);
                            }}
                            title="Edit Post"
                            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAdminDeletePost(post.id);
                            }}
                            title="Delete Post"
                            className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Category / Relationship Badge Pill */}
                      <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 whitespace-nowrap">
                        {post.category === "advance_payment"
                          ? "Advance Fraud"
                          : post.category === "delivery"
                          ? "Courier Scam"
                          : post.category === "electronics"
                          ? "Device Scam"
                          : post.postType === "news"
                          ? "Tech News"
                          : "Scam Alert"}
                      </span>
                    </div>
                  </div>

                  {/* STACKED / FANNED IMAGES PRESENTATION (MATCHING SCREENSHOT IMG_4581_f89bd2ce.jpeg) */}
                  {post.images && post.images.length > 0 && (
                    <div className="relative py-2 px-1">
                      {/* If multiple images, render the signature fanned stacked cards from screenshot */}
                      {post.images.length >= 3 ? (
                        <div
                          className="relative h-64 sm:h-72 w-full flex items-center justify-center cursor-pointer group"
                          onClick={() => navigate(`/news-hub/post/${post.id}`)}
                        >
                          {/* Left card tilted */}
                          <div className="absolute w-[60%] sm:w-[55%] h-full rounded-3xl overflow-hidden shadow-md transform -rotate-12 -translate-x-16 border-2 border-white dark:border-zinc-800 transition duration-300 group-hover:-translate-x-20">
                            <img
                              src={post.images[0]}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            {/* Watermark overlay indication */}
                            <div className="absolute inset-0 bg-black/10 flex items-end p-2 pointer-events-none">
                              <span className="text-[9px] font-black text-white/90 drop-shadow-md whitespace-nowrap">
                                Revealed On DEEP SHOP
                              </span>
                            </div>
                          </div>

                          {/* Right card tilted */}
                          <div className="absolute w-[60%] sm:w-[55%] h-full rounded-3xl overflow-hidden shadow-md transform rotate-12 translate-x-16 border-2 border-white dark:border-zinc-800 transition duration-300 group-hover:translate-x-20">
                            <img
                              src={post.images[2] || post.images[1]}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/10 flex items-end p-2 pointer-events-none">
                              <span className="text-[9px] font-black text-white/90 drop-shadow-md whitespace-nowrap">
                                Revealed On DEEP SHOP
                              </span>
                            </div>
                          </div>

                          {/* Center prominent front card */}
                          <div className="relative z-10 w-[62%] sm:w-[58%] h-full rounded-3xl overflow-hidden shadow-xl border-4 border-white dark:border-zinc-900 transition duration-300 group-hover:scale-102">
                            <img
                              src={post.images[1] || post.images[0]}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            {/* Watermark tag banner */}
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 sm:p-2.5 flex items-center justify-between text-white gap-1 overflow-hidden">
                              <span className="text-[9px] sm:text-[10px] font-black tracking-wide flex items-center gap-1 whitespace-nowrap truncate min-w-0">
                                🚨 Revealed On DEEP SHOP
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadWatermarkedImage(post.images[1] || post.images[0], `scam-evidence-${post.id}.jpg`);
                                  notify("Downloaded photo with permanent watermark!", "success");
                                }}
                                className="p-1 rounded-full bg-white/20 hover:bg-white/40 transition shrink-0"
                                title="Download with watermark"
                              >
                                <Download className="w-3.5 h-3.5 text-white" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Single or Double Image Layout */
                        <div
                          className="relative h-64 sm:h-72 w-full rounded-3xl overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-800 cursor-pointer"
                          onClick={() => navigate(`/news-hub/post/${post.id}`)}
                        >
                          <img
                            src={post.images[0]}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          {/* Watermark Bar */}
                          <div className="absolute bottom-0 inset-x-0 bg-black/75 backdrop-blur-xs p-2 sm:p-2.5 flex items-center justify-between text-white gap-1 overflow-hidden">
                            <span className="text-[9px] sm:text-[11px] font-black tracking-wide flex items-center gap-1 whitespace-nowrap truncate min-w-0">
                              🚨 Revealed On DEEP SHOP • VERIFIED
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadWatermarkedImage(post.images[0], `scam-evidence-${post.id}.jpg`);
                                notify("Evidence saved with watermark!", "success");
                              }}
                              className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-white/20 hover:bg-white/30 text-[10px] sm:text-xs font-bold transition flex items-center gap-1 whitespace-nowrap shrink-0"
                            >
                              <Download className="w-3 h-3 shrink-0" />
                              <span>Save</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* POST TEXT & DESCRIPTION */}
                  <div className="space-y-1.5">
                    <h3
                      className="font-extrabold text-sm sm:text-base text-zinc-900 dark:text-white leading-snug cursor-pointer hover:underline"
                      onClick={() => navigate(`/news-hub/post/${post.id}`)}
                    >
                      {post.title}
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3">
                      {post.description}
                    </p>
                  </div>

                  {/* SCAMMER INFO MINI BADGE BOX (Strictly single line on mobile) */}
                  {(post.scammerName || post.scammerPhone || post.scammedAmount) && (
                    <div className="p-2.5 sm:p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 text-xs space-y-1 overflow-hidden">
                      <div className="flex items-center justify-between gap-1.5 font-bold text-rose-800 dark:text-rose-300 min-w-0">
                        <span className="flex items-center gap-1 min-w-0 text-[10px] sm:text-xs whitespace-nowrap">
                          <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-600 shrink-0" />
                          <span className="truncate">Scammer: {post.scammerName || "Unknown"}</span>
                        </span>
                        {post.scammedAmount ? (
                          <span className="font-mono font-black text-rose-600 dark:text-rose-400 whitespace-nowrap shrink-0 text-[10px] sm:text-xs">
                            Lost: ৳{post.scammedAmount}
                          </span>
                        ) : null}
                      </div>
                      {post.scammerPhone && (
                        <p className="text-[10px] sm:text-[11px] text-zinc-600 dark:text-zinc-400 font-mono whitespace-nowrap truncate">
                          Phone/bKash: <span className="font-bold text-zinc-800 dark:text-zinc-200">{post.scammerPhone}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* INTERACTIVE ACTION BAR (Strictly single line on mobile) */}
                  <div className="flex items-center justify-between gap-1 sm:gap-2 pt-1">
                    {/* Left Pill: [♡ 2.1k  💬 2.1k] */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveReactionPickerPostId(activeReactionPickerPostId === post.id ? null : post.id)}
                        className="flex items-center gap-1.5 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] sm:text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <span className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
                          <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${post.reactions?.[currentUser?.uid] ? "fill-rose-500 text-rose-500" : ""}`} />
                          <span className="whitespace-nowrap">
                            {Object.values(post.reactionsCount || {}).reduce((a, b) => a + b, 0) || "2.1k"}
                          </span>
                        </span>
                        <span className="text-zinc-300 dark:text-zinc-600">•</span>
                        <span className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
                          <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="whitespace-nowrap">{post.commentsCount || "2.1k"}</span>
                        </span>
                      </button>

                      {/* FACEBOOK STYLE REACTION POPUP */}
                      <AnimatePresence>
                        {activeReactionPickerPostId === post.id && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: -45, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className="absolute -top-3 left-0 z-30 flex items-center gap-1 p-1.5 bg-white dark:bg-zinc-800 rounded-full shadow-xl border border-zinc-200 dark:border-zinc-700"
                          >
                            {(Object.keys(REACTION_CONFIG) as ReactionType[]).map((rKey) => (
                              <button
                                key={rKey}
                                type="button"
                                onClick={() => handleReact(post.id, rKey)}
                                className="w-8 h-8 rounded-full hover:scale-130 transition flex items-center justify-center text-lg active:scale-95"
                                title={REACTION_CONFIG[rKey].label}
                              >
                                {REACTION_CONFIG[rKey].emoji}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Middle Pill: [💬 Comments here] */}
                    <button
                      type="button"
                      onClick={() => setCommentsDrawerPostId(post.id)}
                      className="flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] sm:text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="whitespace-nowrap">Comments here</span>
                    </button>

                    {/* Right Circle: [ ⋮ ] */}
                    <button
                      type="button"
                      onClick={() => handleSharePost(post)}
                      className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
                      title="Share / Options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Scammer Community Voting Bar (Strictly single line on mobile) */}
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-1.5 text-xs">
                    <span className="text-[10px] sm:text-[11px] text-zinc-500 font-medium whitespace-nowrap truncate min-w-0">
                      Confirmed by: <strong className="text-zinc-900 dark:text-white font-bold">{post.votes} victims</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleVoteScammer(post.id)}
                      className={`px-2.5 sm:px-3 py-1 rounded-full font-bold text-[10px] sm:text-xs flex items-center gap-1 sm:gap-1.5 transition whitespace-nowrap shrink-0 ${
                        (post.votedUserIds || []).includes(currentUser?.uid)
                          ? "bg-rose-600 text-white"
                          : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100"
                      }`}
                    >
                      <ThumbsUp className="w-3 h-3 shrink-0" />
                      <span className="whitespace-nowrap">{(post.votedUserIds || []).includes(currentUser?.uid) ? "Confirmed" : "Vote Scammer"}</span>
                    </button>
                  </div>
                </article>

                {/* DYNAMIC ADMIN CONFIGURED AD (In-feed, Display, Multiplex, In-article) */}
                {photoAds.length > 0 && (
                  <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-white dark:from-blue-950/40 dark:via-zinc-900 dark:to-black border border-blue-200/80 dark:border-blue-900/50 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-2xs">
                          Sponsored
                        </span>
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                          {photoAds[idx % photoAds.length]?.adType ? photoAds[idx % photoAds.length].adType.replace('_', ' ').toUpperCase() : 'DEEP SHOP AD'}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">
                        Sponsored Ad
                      </span>
                    </div>

                    {photoAds[idx % photoAds.length]?.images?.[0]?.url && (
                      <div className="rounded-2xl overflow-hidden aspect-video bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                        <img src={photoAds[idx % photoAds.length].images[0].url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-0.5">
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-sm sm:text-base text-zinc-950 dark:text-white leading-snug" dangerouslySetInnerHTML={{ __html: photoAds[idx % photoAds.length]?.title || 'Special Promotion' }} />
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: photoAds[idx % photoAds.length]?.text || 'Check out our featured deals.' }} />
                      </div>
                      {photoAds[idx % photoAds.length]?.buttonLink && (
                        <a
                          href={photoAds[idx % photoAds.length].buttonLink}
                          target={photoAds[idx % photoAds.length].buttonLink.startsWith('http') ? '_blank' : '_self'}
                          rel="noreferrer"
                          className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm whitespace-nowrap shrink-0 transition active:scale-95 cursor-pointer"
                        >
                          {photoAds[idx % photoAds.length].buttonText || 'Shop Now'}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))
            )}
          </div>

          {/* DESKTOP RIGHT SIDEBAR (TRENDING SCAMMERS LEADERBOARD & DIRECTORY) */}
          <aside className="hidden lg:block lg:col-span-3 space-y-4">
            {/* Trending Viral Scammers Widget */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-500" />
                  Top Viral Scammers
                </h4>
                <span className="text-[10px] text-zinc-400">By Community Votes</span>
              </div>

              <div className="space-y-3 divide-y divide-zinc-100 dark:divide-zinc-800">
                {posts.slice(0, 4).map((p, idx) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/news-hub/post/${p.id}`)}
                    className="pt-2.5 first:pt-0 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-rose-600 transition truncate max-w-[170px]">
                        #{idx + 1} {p.scammerName || p.title}
                      </span>
                      <span className="font-mono font-bold text-rose-500 text-[11px]">
                        {p.votes} votes
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {p.scammerPhone || "Advance fraud reported"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Safety Tips Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2.5 text-xs">
              <h4 className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                How to Avoid Scams
              </h4>
              <ul className="space-y-2 text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                <li>• Never send full advance to unverified Facebook pages.</li>
                <li>• Demand open box inspection with courier delivery.</li>
                <li>• Search seller's mobile number here before paying.</li>
                <li>• Deep Shop only accepts verified courier deliveries.</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>

      {/* FLOATING BOTTOM NAV (MATCHING EXACT SHAPE IN SCREENSHOT IMG_4581_f89bd2ce.jpeg) */}
      <nav className="fixed bottom-4 inset-x-0 z-40 max-w-sm mx-auto px-4 pointer-events-none">
        <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-full shadow-2xl border border-zinc-200 dark:border-zinc-800 p-2 flex items-center justify-between pointer-events-auto">
          {/* Messages / Alerts */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              navigate("/messages");
            }}
            className="w-11 h-11 rounded-full bg-zinc-900 text-white flex items-center justify-center hover:opacity-90 transition active:scale-95"
            title="Messages"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          {/* Center Pill: [ ⌂ Home ] */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white dark:bg-white dark:text-black font-extrabold text-xs shadow-md transition active:scale-95"
          >
            <HomeIcon className="w-4 h-4" />
            <span>Home</span>
          </button>

          {/* Plus Create Action (Blue Floating Circle) */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              if (requireAuth("post")) navigate("/news-hub/create");
            }}
            className="w-11 h-11 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow-lg transition active:scale-95"
            title="Create Post / Report Scam"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>

          {/* Profile */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              navigate("/profile");
            }}
            className="w-11 h-11 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center hover:opacity-90 transition active:scale-95"
            title="Profile"
          >
            <UserIcon className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* FULL POST DETAIL MODAL ("news open korle kemon dekhabe") */}
      <AnimatePresence>
        {activePostDetails && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col p-6 my-8 text-zinc-900 dark:text-zinc-100"
            >
              {/* Modal Top Navigation */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActivePostDetails(null)}
                    className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <span className="font-extrabold text-sm">Verified Incident Report</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePostDetails(null)}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Detail Content */}
              <div className="space-y-4 pt-4">
                {/* Reporter Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={activePostDetails.reporterAvatar}
                      alt=""
                      className="w-11 h-11 rounded-full object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm">{activePostDetails.reporterName}</span>
                        <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500 text-white" />
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        {new Date(activePostDetails.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                    {activePostDetails.votes} Votes Confirmed
                  </span>
                </div>

                {/* Evidence Images Carousel with Download Buttons */}
                {activePostDetails.images && activePostDetails.images.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-500">
                      <span>Evidence Photos (Permanent Watermark Applied)</span>
                      <span>{activePostDetails.images.length} photo(s)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activePostDetails.images.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          className="relative h-56 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 group"
                        >
                          <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                          <div className="absolute bottom-0 inset-x-0 bg-black/75 p-2 flex items-center justify-between text-white">
                            <span className="text-[10px] font-bold">Revealed On DEEP SHOP</span>
                            <button
                              type="button"
                              onClick={() => {
                                downloadWatermarkedImage(imgUrl, `deep-shop-scam-${idx + 1}.jpg`);
                                notify("Photo downloaded with watermark!", "success");
                              }}
                              className="px-2 py-1 rounded bg-white/20 hover:bg-white/30 text-[10px] font-bold flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" />
                              <span>Download</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scammer Details Card */}
                <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-2 text-xs">
                  <h4 className="font-extrabold text-sm text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Scammer Identification Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
                    <div>
                      <span className="text-zinc-500 block">Name / Page:</span>
                      <strong className="text-zinc-900 dark:text-zinc-100">{activePostDetails.scammerName || "N/A"}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Phone Number:</span>
                      <strong className="font-mono text-zinc-900 dark:text-zinc-100">{activePostDetails.scammerPhone || "N/A"}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">bKash / Nagad:</span>
                      <strong className="font-mono text-zinc-900 dark:text-zinc-100">{activePostDetails.scammerBkash || "N/A"}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Amount Scammed:</span>
                      <strong className="font-mono text-rose-600 dark:text-rose-400">৳{activePostDetails.scammedAmount || 0}</strong>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-white mb-1">
                    {activePostDetails.title}
                  </h4>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {activePostDetails.description}
                  </p>
                </div>

                {/* Actions & Voting in Modal */}
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleVoteScammer(activePostDetails.id)}
                    className="px-4 py-2 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Confirm as Scammer ({activePostDetails.votes})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => copyShareLink(activePostDetails.id)}
                    className="px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-700 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Report</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* COMMENTS DRAWER */}
      <AnimatePresence>
        {commentsDrawerPostId && (
          <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
            >
              {/* Header */}
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <span className="font-extrabold text-sm">Comments & Community Insights</span>
                <button
                  type="button"
                  onClick={() => setCommentsDrawerPostId(null)}
                  className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(!postComments[commentsDrawerPostId] || postComments[commentsDrawerPostId].length === 0) ? (
                  <div className="p-6 text-center text-xs text-zinc-400">
                    No comments yet. Share your experience or evidence below.
                  </div>
                ) : (
                  postComments[commentsDrawerPostId].map((c) => (
                    <div key={c.id} className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img src={c.userAvatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                          <div>
                            <span className="font-bold text-xs">{c.userName}</span>
                            <span className="text-[10px] text-zinc-400 ml-2">Just now</span>
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const newTxt = prompt("Edit comment text:", c.text);
                                if (newTxt !== null && newTxt.trim() && commentsDrawerPostId) {
                                  handleAdminSaveComment(commentsDrawerPostId, c.id, newTxt.trim());
                                }
                              }}
                              className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 rounded cursor-pointer"
                              title="Edit comment"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (commentsDrawerPostId) {
                                  handleAdminDeleteComment(commentsDrawerPostId, c.id);
                                }
                              }}
                              className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-500 rounded cursor-pointer"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                      {c.text && <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{c.text}</p>}
                      {c.imageUrl && (
                        <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 max-h-48">
                          <img src={c.imageUrl} alt="" className="w-full h-full object-cover" />
                          <div className="absolute bottom-0 inset-x-0 bg-black/75 p-1 text-center text-[9px] text-white font-bold">
                            Revealed On DEEP SHOP
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input Box (With Photo Attachment + Canvas Watermark) */}
              <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                {commentImagePreview && (
                  <div className="relative inline-block">
                    <img src={commentImagePreview} alt="" className="w-16 h-16 rounded-xl object-cover border" />
                    <button
                      type="button"
                      onClick={() => setCommentImagePreview(null)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <label className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-blue-500 cursor-pointer">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCommentImageUpload}
                      disabled={isWatermarkingCommentImage}
                    />
                  </label>

                  <input
                    type="text"
                    placeholder={isWatermarkingCommentImage ? "Applying watermark..." : "Write a comment..."}
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddComment(commentsDrawerPostId);
                    }}
                    className="flex-1 px-3.5 py-2 text-xs rounded-full bg-zinc-100 dark:bg-zinc-800 border-none outline-none font-medium"
                  />

                  <button
                    type="button"
                    onClick={() => handleAddComment(commentsDrawerPostId)}
                    disabled={isWatermarkingCommentImage}
                    className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SHARE MODAL */}
      <AnimatePresence>
        {activeShareModalPost && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm">Share Scam Alert</span>
                <button
                  type="button"
                  onClick={() => setActiveShareModalPost(null)}
                  className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-500">
                Help friends and fellow buyers stay safe by sharing this report on social media.
              </p>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    copyShareLink(activeShareModalPost.id);
                    setActiveShareModalPost(null);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-bold flex items-center justify-center gap-2 transition"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Copy Shareable Link</span>
                </button>

                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `🚨 Scam Alert on Deep Shop! ${activeShareModalPost.title} - Check details: ${window.location.origin}/news-hub?post=${activeShareModalPost.id}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
                >
                  <span>Share on WhatsApp</span>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AUTH REQUIRED MODAL ("user ra comment react dite gele account create korte hobe") */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7" />
              </div>

              <div>
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">Account Required</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  You must be signed in to {authReason === "post" ? "post a scam report" : authReason === "comment" ? "write comments" : "react and vote on scammers"}.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAuthModal(false);
                    navigate("/signup");
                  }}
                  className="w-full py-3 rounded-full bg-black dark:bg-white text-white dark:text-black font-extrabold text-xs shadow-md"
                >
                  Create New Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAuthModal(false);
                    navigate("/signin");
                  }}
                  className="w-full py-2.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300"
                >
                  Sign In
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NEWS HUB SLIDE-OUT MENU DRAWER (HOME, FEED, DASHBOARD) */}
      <NewsHubDrawer
        isOpen={isMenuDrawerOpen}
        onClose={() => setIsMenuDrawerOpen(false)}
        userData={currentUser}
      />

      {/* PUBLIC AUTHOR PROFILE MODAL */}
      <PublicAuthorProfileModal
        userId={selectedAuthorModalId}
        authorName={selectedAuthorName}
        authorAvatar={selectedAuthorAvatar}
        isOpen={!!selectedAuthorModalId}
        onClose={() => setSelectedAuthorModalId(null)}
        onOpenGiftStars={(uId, uName) => {
          setGiftStarsTarget({ id: uId, name: uName });
          setShowGiftStarsModal(true);
        }}
      />

      {/* GIFT STARS / BUY STARS MODAL */}
      <GiftStarsModal
        isOpen={showGiftStarsModal}
        onClose={() => setShowGiftStarsModal(false)}
        targetUserId={giftStarsTarget.id}
        targetUserName={giftStarsTarget.name}
      />
      {/* ADMIN IN-PLACE EDIT POST MODAL */}
      <AnimatePresence>
        {adminEditingPost && (
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
                  <h3 className="font-extrabold text-base">Admin Moderation & Post Editor</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setAdminEditingPost(null)}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAdminSavePost} className="space-y-4">
                {/* Title */}
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

                {/* Description */}
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

                {/* Scammer Details Row */}
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

                {/* Category */}
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

                {/* Images Management */}
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

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdminDeletePost(adminEditingPost.id)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-100 transition cursor-pointer"
                  >
                    Delete Post
                  </button>

                  <div className="flex items-center gap-2">
                    {((adminEditingPost as any).status === "under_review" || (adminEditingPost as any).isBrandReview) && (
                      <button
                        type="button"
                        onClick={() => handleAdminApprovePost(adminEditingPost.id)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
                      >
                        Approve & Publish
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setAdminEditingPost(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingAdminEdit}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50"
                    >
                      {isSavingAdminEdit ? "Saving..." : "Save Changes"}
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

export default NewsHub;
