import React, { useState, useEffect, useRef } from "react";
import {
  useParams,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ZoomIn,
  ZoomOut,
  Copy,
  Check,
  Send,
  Share2,
  Bookmark,
  Search,
  Heart,
  MessageCircle,
  Globe,
  ShieldAlert,
  Plus,
  X,
  ExternalLink,
  Pencil,
  Trash2,
  Volume2,
  VolumeX,
  Star,
  MapPin,
  AtSign,
  Hash,
  Link2,
  ShoppingBag,
  Clock,
  Bell,
  Camera,
  Cpu,
  Music,
  Sparkles,
  RefreshCw,
  Eye,
  BarChart3,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  onSnapshot,
  collection,
  getDocs,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  increment,
  arrayUnion,
  arrayRemove,
  where,
  serverTimestamp,
} from "firebase/firestore";
import {
  STORY_COLORS,
  STORY_FONTS,
  FONT_SIZE_STEPS,
  StoryTextLayer,
  StoryStickerItem,
} from "./seller/AddStory";
import { ScamPost } from "../types";
import { NewsPostMedia, isScamPostRecord } from "../components/NewsPostMedia";
import {
  NewsRichText,
  NewsLinkPreviewCards,
  extractHashtagsFromText,
} from "../components/NewsRichText";
import { NewsBottomDock } from "../components/NewsBottomDock";
import { downloadWatermarkedImage } from "../lib/watermark";
import { useNotify, useConfirm } from "../components/Notifications";
import { triggerHaptic } from "../lib/haptics";
import SEO from "../components/SEO";
import { formatDhakaDateTime } from "../lib/dhakaTime";
import {
  formatCompactNumber,
  getSafeDisplayName,
  getSafePublicUsername,
  getPublicShareOrigin,
} from "../lib/utils";
import {
  canAccessSellerDashboard,
  hasImmediateAdminOrStaffRole,
  checkStaffRecord,
} from "../lib/admin";

import defaultAvatarImg from "@/src/assets/images/story_avatar_creator_1_1792826814910.jpg";

export const resolvePostById = async (
  postId: string
): Promise<ScamPost | null> => {
  if (!postId) return null;

  try {
    const snap = await getDoc(doc(db, "scam_posts", postId));
    if (snap.exists()) {
      return { id: snap.id, ...(snap.data() as Omit<ScamPost, "id">) };
    }
  } catch {}

  try {
    const localRaw = localStorage.getItem("deep_scam_posts");
    if (localRaw) {
      const parsed: ScamPost[] = JSON.parse(localRaw);
      const match = parsed.find(
        (p) => p.id === postId && !p.id.startsWith("showcase_")
      );
      if (match) return match;
    }
  } catch {}

  return null;
};

export const loadAllFeedPosts = async (): Promise<ScamPost[]> => {
  const map = new Map<string, ScamPost>();

  try {
    const snap = await getDocs(
      query(collection(db, "scam_posts"), orderBy("createdAt", "desc"))
    );
    snap.docs.forEach((d) => {
      map.set(d.id, { id: d.id, ...(d.data() as Omit<ScamPost, "id">) });
    });
  } catch {}

  try {
    const localRaw = localStorage.getItem("deep_scam_posts");
    if (localRaw) {
      const localList: ScamPost[] = JSON.parse(localRaw);
      localList.forEach((p) => {
        if (p?.id && !p.id.startsWith("showcase_") && !map.has(p.id)) {
          map.set(p.id, p);
        }
      });
    }
  } catch {}

  return Array.from(map.values()).sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  );
};

export const getSavedPostIdsLocal = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem("deep_saved_posts") || "[]");
  } catch {
    return [];
  }
};

export const toggleSavePostHelper = async (
  post: ScamPost,
  uid?: string
): Promise<boolean> => {
  const localIds = getSavedPostIdsLocal();
  const currentlySaved =
    localIds.includes(post.id) ||
    Boolean(uid && post.savedByUserIds?.includes(uid));

  const nextSaved = !currentlySaved;
  const updatedLocal = nextSaved
    ? Array.from(new Set([...localIds, post.id]))
    : localIds.filter((id) => id !== post.id);
  localStorage.setItem("deep_saved_posts", JSON.stringify(updatedLocal));

  if (uid) {
    try {
      await updateDoc(doc(db, "scam_posts", post.id), {
        savedByUserIds: nextSaved ? arrayUnion(uid) : arrayRemove(uid),
      });
    } catch {}
  }
  return nextSaved;
};

/* ============================================================================
 * 1. DEDICATED FULLSCREEN PHOTO VIEWER PAGE (/news-hub/photo/:postId/:index)
 * ========================================================================== */
export const NewsPhotoViewerPage: React.FC = () => {
  const { postId, index } = useParams<{ postId: string; index: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const notify = useNotify();

  const commentId = searchParams.get("commentId");
  const navCommentState = (location.state || null) as {
    commentImageUrl?: string;
    commentAuthorName?: string;
    commentText?: string;
  } | null;

  const [post, setPost] = useState<ScamPost | null>(null);
  const [commentMedia, setCommentMedia] = useState<{
    imageUrl: string;
    authorName: string;
    text: string;
  } | null>(() =>
    navCommentState?.commentImageUrl
      ? {
          imageUrl: navCommentState.commentImageUrl,
          authorName: navCommentState.commentAuthorName || "Comment Photo",
          text: navCommentState.commentText || "",
        }
      : null
  );
  const [activeIndex, setActiveIndex] = useState<number>(
    Math.max(0, Number(index) || 0)
  );
  const [zoomed, setZoomed] = useState(false);
  const [loading, setLoading] = useState(
    !Boolean(navCommentState?.commentImageUrl)
  );

  useEffect(() => {
    setActiveIndex(Math.max(0, Number(index) || 0));
  }, [index]);

  useEffect(() => {
    if (navCommentState?.commentImageUrl) {
      setCommentMedia({
        imageUrl: navCommentState.commentImageUrl,
        authorName: navCommentState.commentAuthorName || "Comment Photo",
        text: navCommentState.commentText || "",
      });
    }
  }, [
    navCommentState?.commentImageUrl,
    navCommentState?.commentAuthorName,
    navCommentState?.commentText,
  ]);

  useEffect(() => {
    let mounted = true;

    const loadViewerData = async () => {
      const found = await resolvePostById(postId || "");
      if (mounted) {
        setPost(found);
      }

      if (commentId && !navCommentState?.commentImageUrl && postId) {
        let resolvedComment: {
          imageUrl: string;
          authorName: string;
          text: string;
        } | null = null;

        try {
          const snap = await getDoc(
            doc(db, "scam_posts", postId, "comments", commentId)
          );
          if (snap.exists()) {
            const d = snap.data();
            if (d?.imageUrl) {
              resolvedComment = {
                imageUrl: String(d.imageUrl),
                authorName: String(d.userName || "Comment Photo"),
                text: String(d.text || ""),
              };
            }
          }
        } catch {}

        if (!resolvedComment) {
          try {
            const allLocal = JSON.parse(
              localStorage.getItem("deep_post_comments") || "{}"
            );
            const list = Array.isArray(allLocal[postId])
              ? allLocal[postId]
              : [];
            const match = list.find((c: any) => c?.id === commentId);
            if (match?.imageUrl) {
              resolvedComment = {
                imageUrl: String(match.imageUrl),
                authorName: String(match.userName || "Comment Photo"),
                text: String(match.text || ""),
              };
            }
          } catch {}
        }

        if (mounted && resolvedComment) {
          setCommentMedia(resolvedComment);
        }
      }

      if (mounted) {
        setLoading(false);
      }
    };

    loadViewerData();
    return () => {
      mounted = false;
    };
  }, [postId, commentId, navCommentState?.commentImageUrl]);

  const isCommentPhotoMode = Boolean(commentId || commentMedia?.imageUrl);
  const images = isCommentPhotoMode
    ? commentMedia?.imageUrl
      ? [commentMedia.imageUrl]
      : []
    : post?.images || [];
  const isScam = isScamPostRecord(post);
  const currentImg = images[activeIndex] || images[0] || "";
  const headerTitle = isCommentPhotoMode
    ? commentMedia?.authorName || "Comment Photo"
    : post?.reporterName || "Feed Photo";
  const bottomCaption = isCommentPhotoMode
    ? commentMedia?.text || ""
    : post?.description || "";

  const handleDownload = () => {
    if (!currentImg) return;
    triggerHaptic();
    const filename = isCommentPhotoMode
      ? `comment-photo-${commentId || "media"}.jpg`
      : isScam
      ? `scam-report-${post?.id || "photo"}-${activeIndex + 1}.jpg`
      : `feed-photo-${post?.id || "photo"}-${activeIndex + 1}.jpg`;
    downloadWatermarkedImage(currentImg, filename);
    notify("Photo saved to device", "success");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between select-none">
      <SEO
        title={
          isCommentPhotoMode
            ? `${headerTitle} — Comment Photo`
            : post?.title
            ? `${post.title} — Photo`
            : "Fullscreen Photo"
        }
        description="Fullscreen media viewer"
      />

      {/* Top Bar */}
      <header className="px-4 py-4 flex items-center justify-between gap-3 bg-gradient-to-b from-black/80 to-transparent z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              navigate(-1);
            }}
            className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md flex items-center justify-center text-white transition cursor-pointer shrink-0"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">
              {headerTitle}
            </p>
            <p className="text-xs text-zinc-400 tabular-nums">
              {isCommentPhotoMode
                ? "Comment Photo"
                : images.length > 0
                ? `Photo ${activeIndex + 1} of ${images.length}`
                : "Photo Viewer"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              setZoomed((z) => !z);
            }}
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md flex items-center justify-center text-white transition cursor-pointer"
            aria-label={zoomed ? "Zoom out" : "Zoom in"}
          >
            {zoomed ? (
              <ZoomOut className="w-4 h-4" />
            ) : (
              <ZoomIn className="w-4 h-4" />
            )}
          </button>
          {currentImg && (
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 h-10 rounded-full bg-white text-zinc-950 text-xs font-bold flex items-center gap-1.5 hover:bg-zinc-200 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Image Stage (div instead of main to avoid global white main override) */}
      <div className="relative flex-1 flex items-center justify-center overflow-auto px-2 py-4 bg-transparent">
        {loading ? (
          <div className="text-sm text-zinc-400">Loading photo...</div>
        ) : !currentImg ? (
          <div className="text-center space-y-3">
            <p className="text-sm text-zinc-400">Photo not found.</p>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 rounded-full bg-white text-zinc-900 text-xs font-bold cursor-pointer"
            >
              Go Back
            </button>
          </div>
        ) : (
          <div className="relative max-w-5xl w-full flex flex-col items-center justify-center">
            <img
              src={currentImg}
              alt={headerTitle}
              referrerPolicy="no-referrer"
              onClick={() => setZoomed((z) => !z)}
              className={`rounded-2xl transition-transform duration-300 cursor-zoom-in ${
                zoomed
                  ? "scale-150 cursor-zoom-out max-h-none"
                  : "max-h-[76vh] w-auto object-contain"
              }`}
            />

            {isScam && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-600/90 text-white text-xs font-semibold shadow-lg">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>
                  Scam Report
                  {post?.scamLocation
                    ? ` · Happened on: ${post.scamLocation}`
                    : " · Verified Evidence"}
                </span>
              </div>
            )}

            {images.length > 1 && !zoomed && (
              <>
                {activeIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setActiveIndex((i) => Math.max(0, i - 1));
                    }}
                    className="fixed left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white flex items-center justify-center cursor-pointer"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                {activeIndex < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setActiveIndex((i) =>
                        Math.min(images.length - 1, i + 1)
                      );
                    }}
                    className="fixed right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white flex items-center justify-center cursor-pointer"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom Thumbnail Strip & Caption */}
      <div className="px-4 pb-6 pt-2 bg-gradient-to-t from-black/85 to-transparent space-y-3">
        {images.length > 1 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setZoomed(false);
                  setActiveIndex(i);
                }}
                className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition cursor-pointer ${
                  i === activeIndex
                    ? "border-[#1877F2] scale-105"
                    : "border-white/20 opacity-60 hover:opacity-90"
                }`}
              >
                <img
                  src={img}
                  alt={`Thumb ${i + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
        {bottomCaption && (
          <p className="max-w-xl mx-auto text-center text-xs text-zinc-300 line-clamp-2">
            {bottomCaption}
          </p>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. DEDICATED SHARE POST PAGE (/news-hub/share/:id) — ZERO SCAM TEXT ON NORMAL POSTS
 * ========================================================================== */
export const NewsSharePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notify = useNotify();

  const [post, setPost] = useState<ScamPost | null>(() => {
    if (typeof window !== "undefined") {
      const initial = (window as any).__INITIAL_POST_DATA__;
      if (initial && (!id || initial.id === id)) {
        return initial as ScamPost;
      }
    }
    return null;
  });
  const [copied, setCopied] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [chatRecipients, setChatRecipients] = useState<
    { chatId: string; uid: string; name: string; avatar: string }[]
  >([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [sentChatIds, setSentChatIds] = useState<string[]>([]);
  const [sendingChatId, setSendingChatId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setCurrentUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    resolvePostById(id || "").then((found) => {
      if (found) setPost(found);
    });
  }, [id]);

  // Load ONLY real users with whom the current user has actually had a chat conversation (zero demo/random users)
  useEffect(() => {
    if (!currentUser?.uid) {
      setChatRecipients([]);
      return;
    }

    let active = true;
    setLoadingChats(true);

    const qChats = query(
      collection(db, "p2p_chats"),
      where("participants", "array-contains", currentUser.uid)
    );

    const unsub = onSnapshot(
      qChats,
      async (snap) => {
        const rawItems: {
          chatId: string;
          otherUid: string;
          updatedMs: number;
          fallbackName: string;
          fallbackAvatar: string;
        }[] = [];

        snap.docs.forEach((docSnap) => {
          const d = docSnap.data() || {};
          if (d.isGroup || d.type === "group") return;
          const parts: string[] = Array.isArray(d.participants)
            ? d.participants
            : [];
          const otherUid = parts.find(
            (p) =>
              p &&
              p !== currentUser.uid &&
              p !== "system" &&
              p !== "member_local" &&
              !String(p).startsWith("demo_")
          );
          if (!otherUid) return;

          const hasConversation = Boolean(
            (typeof d.lastMessage === "string" && d.lastMessage.trim() !== "") ||
              d.lastMessageTimestamp ||
              d.updatedAt
          );
          if (!hasConversation) return;

          const updatedMs =
            d.updatedAt?.toMillis?.() ||
            d.lastMessageTimestamp?.toMillis?.() ||
            (typeof d.updatedAt === "number" ? d.updatedAt : 0);

          const details = d.participantDetails?.[otherUid] || {};
          rawItems.push({
            chatId: docSnap.id,
            otherUid,
            updatedMs,
            fallbackName:
              details.shopName || details.displayName || details.name || "",
            fallbackAvatar: details.shopLogo || details.photoURL || "",
          });
        });

        rawItems.sort((a, b) => b.updatedMs - a.updatedMs);

        const seenUids = new Set<string>();
        const uniqueItems = rawItems.filter((item) => {
          if (seenUids.has(item.otherUid)) return false;
          seenUids.add(item.otherUid);
          return true;
        });

        const resolved: {
          chatId: string;
          uid: string;
          name: string;
          avatar: string;
        }[] = [];

        await Promise.all(
          uniqueItems.slice(0, 25).map(async (item) => {
            try {
              const uSnap = await getDoc(doc(db, "users", item.otherUid));
              if (uSnap.exists()) {
                const uData = uSnap.data() || {};
                if (uData.isBanned || uData.isDemo) return;
                const name =
                  getSafeDisplayName(uData, "") ||
                  item.fallbackName ||
                  "";
                if (!name) return;
                resolved.push({
                  chatId: item.chatId,
                  uid: item.otherUid,
                  name,
                  avatar:
                    uData.shopLogo ||
                    uData.photoURL ||
                    item.fallbackAvatar ||
                    defaultAvatarImg,
                });
                return;
              }
            } catch {}
            if (item.fallbackName) {
              resolved.push({
                chatId: item.chatId,
                uid: item.otherUid,
                name: item.fallbackName,
                avatar: item.fallbackAvatar || defaultAvatarImg,
              });
            }
          })
        );

        const orderIndex = new Map(
          uniqueItems.map((it, idx) => [it.otherUid, idx])
        );
        resolved.sort(
          (a, b) => (orderIndex.get(a.uid) ?? 999) - (orderIndex.get(b.uid) ?? 999)
        );

        if (active) {
          setChatRecipients(resolved);
          setLoadingChats(false);
        }
      },
      () => {
        if (active) setLoadingChats(false);
      }
    );

    return () => {
      active = false;
      unsub();
    };
  }, [currentUser?.uid]);

  const isScam = isScamPostRecord(post);
  const postUrl =
    typeof window !== "undefined"
      ? `${getPublicShareOrigin()}/news-hub/post/${post?.id || id}`
      : "";

  const cleanPostDesc = (post?.description || "")
    .replace(/\s+/g, " ")
    .trim();
  const cleanPostTitle =
    post?.title && post.title !== "Feed Post" ? post.title.trim() : "";

  const exactShareTitle = post
    ? cleanPostTitle ||
      (cleanPostDesc
        ? cleanPostDesc.slice(0, 80) + (cleanPostDesc.length > 80 ? "..." : "")
        : `${post.reporterName || "Community"} Post`)
    : "Post";

  const exactShareDescription = post
    ? cleanPostDesc
      ? cleanPostDesc.slice(0, 200)
      : cleanPostTitle
    : "";

  const shareText = exactShareDescription || exactShareTitle;

  const recordShareCount = async () => {
    if (!post) return;
    try {
      await updateDoc(doc(db, "scam_posts", post.id), {
        sharesCount: increment(1),
      });
    } catch {}
  };

  const handleCopyLink = async () => {
    triggerHaptic();
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      await recordShareCount();
      notify("Post link copied!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify("Unable to copy link", "error");
    }
  };

  const handleCopyFullShareText = async () => {
    triggerHaptic();
    try {
      await navigator.clipboard.writeText(`${shareText}\n${postUrl}`);
      setCopiedCaption(true);
      await recordShareCount();
      notify("Post text & link copied!", "success");
      setTimeout(() => setCopiedCaption(false), 2000);
    } catch {
      notify("Unable to copy text", "error");
    }
  };

  const handleNativeShare = async () => {
    triggerHaptic();
    if (navigator.share) {
      try {
        await navigator.share({
          title: exactShareTitle,
          text: exactShareDescription,
          url: postUrl,
        });
        await recordShareCount();
        notify("Shared successfully!", "success");
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  const handleSendToChat = async (recipient: {
    chatId: string;
    uid: string;
    name: string;
    avatar: string;
  }) => {
    if (!currentUser?.uid || !post || sendingChatId) return;
    triggerHaptic();
    setSendingChatId(recipient.chatId);
    try {
      const msgText = `${shareText}\n${postUrl}`;
      await addDoc(collection(db, "p2p_chats", recipient.chatId, "messages"), {
        senderId: currentUser.uid,
        senderName: getSafeDisplayName(currentUser, "Member"),
        text: msgText,
        imageUrl: post.images?.[0] || "",
        sharedPostId: post.id,
        createdAt: serverTimestamp(),
        readBy: [currentUser.uid],
      });
      await updateDoc(doc(db, "p2p_chats", recipient.chatId), {
        lastMessage: `Shared a post: ${
          post.description?.slice(0, 48) || post.title || "Feed Post"
        }`,
        updatedAt: serverTimestamp(),
        [`unreadCount.${recipient.uid}`]: increment(1),
      });
      await recordShareCount();
      setSentChatIds((prev) =>
        prev.includes(recipient.chatId) ? prev : [...prev, recipient.chatId]
      );
      notify(`Sent to ${recipient.name}!`, "success");
    } catch {
      notify("Could not send message. Try again.", "error");
    } finally {
      setSendingChatId(null);
    }
  };

  const filteredChatRecipients = chatRecipients.filter((c) => {
    const q = chatSearch.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#BCE0FD]/80 via-[#E2F1FF]/45 to-transparent dark:from-transparent dark:via-transparent dark:to-transparent text-zinc-900 dark:text-zinc-100 pb-24">
      <SEO
        title={exactShareTitle}
        description={exactShareDescription || exactShareTitle}
        image={post?.images?.[0]}
        exactTitle
      />

      <div className="max-w-xl mx-auto pt-4 sm:pt-7 px-3 sm:px-4">
        <header className="flex items-center justify-between pb-5 px-1">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                navigate(-1);
              }}
              className="w-11 h-11 rounded-full bg-white dark:bg-zinc-900 shadow-xs flex items-center justify-center cursor-pointer"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-[19px] font-bold">Share Post</h1>
          </div>
        </header>

        <div className="h-3.5 mx-5 rounded-t-[26px] bg-white/55 dark:bg-zinc-800/50" />

        <div className="bg-white dark:bg-zinc-900 rounded-[34px] p-5 sm:p-6 shadow-[0_12px_40px_rgba(15,23,42,0.07)] space-y-5">
          {post ? (
            <>
              <div className="rounded-[24px] bg-[#F5F6F8] dark:bg-zinc-800/70 p-4 space-y-3 border border-slate-200/70 dark:border-zinc-700/60">
                <div className="flex items-center gap-3">
                  <img
                    src={post.reporterAvatar || defaultAvatarImg}
                    alt={post.reporterName}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                      {post.reporterName}
                    </p>
                    <p className="text-xs text-zinc-500 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      <span>
                        {isScam
                          ? `Scam Report${
                              post.scamLocation ? ` · ${post.scamLocation}` : ""
                            }`
                          : "Public Post"}
                      </span>
                    </p>
                  </div>
                </div>

                {post.description && (
                  <p className="text-sm text-zinc-700 dark:text-zinc-200 line-clamp-3 leading-relaxed">
                    <NewsRichText text={post.description} />
                  </p>
                )}

                {post.images?.[0] && (
                  <div className="rounded-[18px] overflow-hidden max-h-56 bg-slate-200 dark:bg-zinc-900">
                    <img
                      src={post.images[0]}
                      alt="Share preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Direct Post Link
                </label>
                <div className="flex items-center gap-2 p-2 rounded-2xl bg-[#F5F6F8] dark:bg-zinc-800">
                  <input
                    type="text"
                    readOnly
                    value={postUrl}
                    className="flex-1 bg-transparent px-2 text-xs text-zinc-700 dark:text-zinc-200 outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-4 py-2 rounded-xl bg-[#1877F2] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="py-3.5 px-4 rounded-2xl bg-[#1877F2] hover:bg-[#1565D8] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share via Device Apps</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyFullShareText}
                  className="py-3.5 px-4 rounded-2xl bg-[#F5F6F8] dark:bg-zinc-800 hover:bg-slate-200/70 text-zinc-900 dark:text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>
                    {copiedCaption ? "Copied Caption!" : "Copy Text & Link"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    recordShareCount();
                    navigate(`/messages?sharePost=${post.id}`);
                  }}
                  className="sm:col-span-2 py-3.5 px-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Open in Messages</span>
                </button>
              </div>

              {/* Send directly to Real Recent Chat Contacts (Zero random/demo users) */}
              {currentUser && (
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Send in Message
                    </label>
                    {chatRecipients.length > 3 && (
                      <div className="relative w-44">
                        <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={chatSearch}
                          onChange={(e) => setChatSearch(e.target.value)}
                          placeholder="Search chats..."
                          className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-[#F5F6F8] dark:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {loadingChats ? (
                    <p className="text-xs text-zinc-400 py-3 text-center">
                      Loading your conversations...
                    </p>
                  ) : filteredChatRecipients.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-0.5">
                      {filteredChatRecipients.map((recipient) => {
                        const alreadySent = sentChatIds.includes(recipient.chatId);
                        const isSending = sendingChatId === recipient.chatId;
                        return (
                          <div
                            key={recipient.chatId}
                            className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#F5F6F8] dark:bg-zinc-800/70"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={recipient.avatar}
                                alt={recipient.name}
                                referrerPolicy="no-referrer"
                                className="w-9 h-9 rounded-full object-cover shrink-0"
                              />
                              <span className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                                {recipient.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              disabled={alreadySent || isSending}
                              onClick={() => handleSendToChat(recipient)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer ${
                                alreadySent
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 cursor-default"
                                  : "bg-[#1877F2] hover:bg-[#1465D8] text-white"
                              }`}
                            >
                              {alreadySent
                                ? "Sent"
                                : isSending
                                ? "Sending..."
                                : "Send"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 py-3 text-center">
                      No active conversations found yet. People you talk with in Messages will appear here.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-500 text-center py-10">
              Post not found or still loading...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. DEDICATED SEARCH, HASHTAG EXPLORE & SAVED POSTS PAGE
 *    (/news-hub/search?tag=... & /news-hub/saved)
 * ========================================================================== */
export const NewsSavedAndSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const notify = useNotify();
  const confirm = useConfirm();

  const initialTab = location.pathname.includes("/saved") ? "saved" : "explore";
  const urlTag = searchParams.get("tag") || "";
  const urlQuery = searchParams.get("q") || "";

  const [tab, setTab] = useState<"explore" | "saved">(initialTab);
  const [posts, setPosts] = useState<ScamPost[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>(() =>
    getSavedPostIdsLocal()
  );
  const [queryText, setQueryText] = useState<string>(() =>
    urlTag ? `#${urlTag.replace(/^#/, "")}` : urlQuery
  );
  const [filterType, setFilterType] = useState<"all" | "normal" | "scam">(
    "all"
  );
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(
    () => auth.currentUser
  );
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setCurrentUser(u);
      if (!u) {
        setIsAdmin(false);
        return;
      }
      try {
        const uSnap = await getDoc(doc(db, "users", u.uid));
        const uData = uSnap.exists() ? uSnap.data() : null;
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
    return () => unsub();
  }, []);

  useEffect(() => {
    setTab(location.pathname.includes("/saved") ? "saved" : "explore");
  }, [location.pathname]);

  useEffect(() => {
    const tagParam = searchParams.get("tag");
    const qParam = searchParams.get("q");
    if (tagParam) {
      setTab("explore");
      setQueryText(`#${tagParam.replace(/^#/, "")}`);
    } else if (qParam !== null) {
      setQueryText(qParam);
    }
  }, [searchParams]);

  useEffect(() => {
    loadAllFeedPosts().then((list) => {
      setPosts(list);
      setLoading(false);
    });
  }, []);

  const uid = currentUser?.uid;

  const handleDeletePost = (post: ScamPost, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    confirm({
      title: "Delete Post?",
      message:
        "Are you sure you want to permanently delete this post? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "scam_posts", post.id));
        } catch {}
        try {
          const local: ScamPost[] = JSON.parse(
            localStorage.getItem("scam_posts_local_v1") || "[]"
          );
          localStorage.setItem(
            "scam_posts_local_v1",
            JSON.stringify(local.filter((p) => p.id !== post.id))
          );
        } catch {}
        setPosts((prev) => prev.filter((p) => p.id !== post.id));
        notify("Post deleted successfully", "success");
      },
    });
  };

  const isSaved = (post: ScamPost) =>
    savedIds.includes(post.id) ||
    Boolean(uid && post.savedByUserIds?.includes(uid));

  const handleToggleSave = async (post: ScamPost) => {
    triggerHaptic();
    const next = await toggleSavePostHelper(post, uid);
    setSavedIds(getSavedPostIdsLocal());
    notify(
      next ? "Saved to your bookmarks" : "Removed from saved posts",
      "info"
    );
  };

  // Discover real hashtags used across real posts
  const discoveredHashtags = React.useMemo(() => {
    const counts = new Map<string, number>();
    posts.forEach((p) => {
      const tags = extractHashtagsFromText(
        `${p.title || ""} ${p.description || ""}`
      );
      tags.forEach((t) => {
        counts.set(t, (counts.get(t) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tag, count]) => ({ tag, count }));
  }, [posts]);

  const selectHashtag = (tag: string) => {
    triggerHaptic();
    const clean = tag.replace(/^#/, "");
    setTab("explore");
    setQueryText(`#${clean}`);
    setSearchParams({ tag: clean });
  };

  const clearSearch = () => {
    triggerHaptic();
    setQueryText("");
    setSearchParams({});
  };

  const filteredPosts = posts.filter((p) => {
    if (tab === "saved" && !isSaved(p)) return false;
    const scam = isScamPostRecord(p);
    if (filterType === "normal" && scam) return false;
    if (filterType === "scam" && !scam) return false;

    const trimmed = queryText.trim();
    if (!trimmed) return true;

    if (trimmed.startsWith("#")) {
      const targetTag = trimmed.slice(1).toLowerCase();
      if (!targetTag) return true;
      const postTags = extractHashtagsFromText(
        `${p.title || ""} ${p.description || ""}`
      );
      return (
        postTags.some((t) => t === targetTag || t.includes(targetTag)) ||
        (p.themes || []).some((th) => th.toLowerCase() === targetTag)
      );
    }

    const q = trimmed.toLowerCase();
    return (
      p.title?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.reporterName?.toLowerCase().includes(q) ||
      p.scamLocation?.toLowerCase().includes(q) ||
      p.scammerName?.toLowerCase().includes(q) ||
      p.scammerPhone?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#BCE0FD]/80 via-[#EBF5FF]/45 to-transparent dark:from-transparent dark:via-transparent dark:to-transparent text-zinc-900 dark:text-zinc-100 pb-28">
      <SEO
        title={tab === "saved" ? "Saved Posts — Feed" : "Explore & Hashtags — Feed"}
        description="Search community posts, hashtags, and view your saved bookmarks."
      />

      <div className="max-w-3xl mx-auto pt-4 sm:pt-7 px-3 sm:px-4 space-y-4">
        <header className="flex items-center justify-between gap-2 px-0.5">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate("/news-hub")}
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white dark:bg-zinc-900 shadow-xs flex items-center justify-center cursor-pointer shrink-0"
              aria-label="Back to Feed"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <h1 className="text-[15px] sm:text-[20px] font-bold whitespace-nowrap truncate">
              {tab === "saved" ? "Saved Posts" : "Explore & Search"}
            </h1>
          </div>

          <div className="flex items-center bg-white/85 dark:bg-zinc-900 rounded-full p-1 shadow-xs shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setTab("explore");
                navigate("/news-hub/search", { replace: true });
              }}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                tab === "explore"
                  ? "bg-[#1877F2] text-white"
                  : "text-zinc-600 dark:text-zinc-300"
              }`}
            >
              Explore
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setTab("saved");
                navigate("/news-hub/saved", { replace: true });
              }}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                tab === "saved"
                  ? "bg-[#1877F2] text-white"
                  : "text-zinc-600 dark:text-zinc-300"
              }`}
            >
              Saved ({posts.filter((p) => isSaved(p)).length})
            </button>
          </div>
        </header>

        {/* Search Input + Active Hashtag Chips + Post Type Filter */}
        <div className="bg-white dark:bg-zinc-900 rounded-[28px] p-4 shadow-xs space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={queryText}
              onChange={(e) => {
                const v = e.target.value;
                setQueryText(v);
                if (!v.trim()) setSearchParams({});
              }}
              placeholder="Search #hashtags, people, links, phone numbers..."
              className="w-full pl-11 pr-10 py-3 rounded-full bg-[#F4F5F7] dark:bg-zinc-800 text-sm outline-none"
            />
            {queryText && (
              <button
                type="button"
                onClick={clearSearch}
                className="w-7 h-7 rounded-full bg-white dark:bg-zinc-700 flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {discoveredHashtags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {discoveredHashtags.map(({ tag, count }) => {
                const active =
                  queryText.trim().toLowerCase() === `#${tag.toLowerCase()}`;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      active ? clearSearch() : selectHashtag(tag)
                    }
                    className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 whitespace-nowrap transition cursor-pointer ${
                      active
                        ? "bg-[#1877F2] text-white shadow-2xs"
                        : "bg-[#1877F2]/10 text-[#1877F2] dark:text-[#58A6FF] hover:bg-[#1877F2]/18"
                    }`}
                  >
                    #{tag} ({count})
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {[
              { id: "all", label: "All Posts" },
              { id: "normal", label: "Community Posts" },
              { id: "scam", label: "Scam Reports" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilterType(item.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  filterType === item.id
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                    : "bg-[#F4F5F7] dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="bg-white dark:bg-zinc-900 rounded-[28px] p-8 text-center text-sm text-zinc-500">
            Loading posts...
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-[28px] p-10 text-center space-y-3">
            <Bookmark className="w-8 h-8 text-zinc-400 mx-auto" />
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {tab === "saved"
                ? "No saved posts yet"
                : queryText.trim().startsWith("#")
                ? `No posts found with ${queryText.trim()}`
                : "No matching posts found"}
            </p>
            <p className="text-xs text-zinc-500">
              {tab === "saved"
                ? "Tap the bookmark icon on any feed post to save it here."
                : "Try another hashtag or keyword."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => {
              const saved = isSaved(post);
              const totalReactions = post.reactionsCount
                ? (Object.values(post.reactionsCount) as number[]).reduce(
                    (a, b) => a + (Number(b) || 0),
                    0
                  )
                : Number(post.votes || 0);

              const canManage = Boolean(
                (uid &&
                  (post.reporterId === uid ||
                    (post as any).authorId === uid)) ||
                  isAdmin
              );

              return (
                <article
                  key={post.id}
                  onClick={() => navigate(`/news-hub/post/${post.id}`)}
                  className="bg-white dark:bg-zinc-900 rounded-[28px] p-4 shadow-[0_6px_24px_rgba(15,23,42,0.05)] space-y-3 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/author/${post.reporterId}`);
                      }}
                      className="flex items-center gap-3 min-w-0"
                    >
                      <img
                        src={post.reporterAvatar || defaultAvatarImg}
                        alt={post.reporterName}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">
                          {post.reporterName}
                        </p>
                        <p className="text-[11px] text-zinc-500 whitespace-nowrap truncate">
                          {formatDhakaDateTime(post.createdAt)}
                          {post.isEdited ? " · Edited" : ""}
                        </p>
                        {post.isAiGenerated && (
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 leading-tight">
                            <Sparkles className="w-3 h-3 text-[#1877F2] shrink-0" />
                            <span>AI generated</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHaptic();
                              navigate(`/news-hub/create?edit=${post.id}`);
                            }}
                            className="w-9 h-9 rounded-full bg-[#F5F6F8] dark:bg-zinc-800 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center cursor-pointer transition"
                            aria-label="Edit post"
                            title="Edit post"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeletePost(post, e)}
                            className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center cursor-pointer transition"
                            aria-label="Delete post"
                            title="Delete post"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSave(post);
                        }}
                        className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer shrink-0 ${
                          saved
                            ? "bg-[#1877F2]/10 text-[#1877F2]"
                            : "bg-[#F5F6F8] dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        }`}
                        aria-label="Toggle bookmark"
                      >
                        <Bookmark
                          className={`w-4 h-4 ${saved ? "fill-current" : ""}`}
                        />
                      </button>
                    </div>
                  </div>

                  {post.description && (
                    <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                      <NewsRichText
                        text={post.description}
                        onHashtagClick={(tag) => selectHashtag(tag)}
                      />
                    </p>
                  )}

                  <NewsLinkPreviewCards text={post.description} />

                  <NewsPostMedia
                    post={post}
                    onOpenImage={(idx) =>
                      navigate(`/news-hub/photo/${post.id}/${idx}`)
                    }
                  />

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-full bg-[#F5F6F8] dark:bg-zinc-800 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap">
                        <Heart className="w-3.5 h-3.5 text-zinc-900 dark:text-white shrink-0" />
                        <span>{totalReactions}</span>
                      </span>
                      <span className="px-3 py-1.5 rounded-full bg-[#F5F6F8] dark:bg-zinc-800 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap">
                        <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{post.commentsCount || 0}</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/news-hub/share/${post.id}`);
                        }}
                        className="px-3 py-1.5 rounded-full bg-[#F5F6F8] dark:bg-zinc-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Send className="w-3.5 h-3.5 shrink-0" />
                        <span>{post.sharesCount || 0}</span>
                      </button>
                      {Boolean(
                        uid &&
                          (post.reporterId === uid ||
                            (post as any).authorId === uid)
                      ) && (
                        <span
                          className="px-3 py-1.5 rounded-full bg-[#F5F6F8] dark:bg-zinc-800 text-xs font-semibold flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 whitespace-nowrap"
                          title="Views (only visible to you)"
                        >
                          <Eye className="w-3.5 h-3.5 shrink-0" />
                          <span>{formatCompactNumber(post.views || 0)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <NewsBottomDock />
    </div>
  );
};

/* ============================================================================
 * 4. DEDICATED STORY VIEWER PAGE (/news-hub/story/:storyId) — FULL INTERACTIVE
 * ========================================================================== */
export const NewsStoryViewerPage: React.FC = () => {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const notify = useNotify();
  const confirm = useConfirm();

  const [stories, setStories] = useState<any[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const story = stories[activeIdx];
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(
    () => auth.currentUser
  );
  const [audioMuted, setAudioMuted] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [questionDrafts, setQuestionDrafts] = useState<Record<string, string>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Viewer Stats Modal States
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [viewerProfiles, setViewerProfiles] = useState<any[]>([]);
  const [reactionProfiles, setReactionProfiles] = useState<any[]>([]);
  const [ownerFollowers, setOwnerFollowers] = useState<string[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // 2-Finger Pinch-to-Zoom & Pan State (Defaults to 1:1 exact aspect ratio)
  const [viewerScale, setViewerScale] = useState<number>(1);
  const [viewerOffset, setViewerOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const viewerPinchRef = useRef<{
    active: boolean;
    initialDist: number;
    initialScale: number;
    initialMidX: number;
    initialMidY: number;
    initialOffsetX: number;
    initialOffsetY: number;
  } | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let mainDocs: Record<string, any> = {};
    let communityDocs: Record<string, any> = {};

    const mapDoc = (id: string, data: Record<string, any>) => {
      const createdAtMs =
        typeof data.createdAtMs === "number"
          ? data.createdAtMs
          : data.createdAt
          ? new Date(data.createdAt).getTime() || 0
          : 0;
      return {
        id,
        userId: data.userId || data.sellerId || "",
        authorName:
          data.userName ||
          data.sellerName ||
          data.category ||
          "Community Member",
        avatar:
          data.userAvatar ||
          data.sellerLogo ||
          data.sellerAvatar ||
          data.mediaUrl ||
          defaultAvatarImg,
        mediaUrl: data.mediaUrl || data.imageUrl || "",
        mediaType: data.type || "image",
        linkUrl: data.linkUrl || "",
        caption: data.caption || "",
        songTitle: data.songTitle || "",
        music: data.music || null,
        textLayers: Array.isArray(data.textLayers) ? data.textLayers : [],
        stickers: Array.isArray(data.stickers) ? data.stickers : [],
        aiLabel: Boolean(data.aiLabel || data.isAiGenerated),
        allowCommenting: data.allowCommenting !== false,
        isCloseFriends: Boolean(data.isCloseFriends),
        closeFriendIds: Array.isArray(data.closeFriendIds) ? data.closeFriendIds : [],
        isBoomerang: Boolean(data.isBoomerang),
        pollVotes: data.pollVotes || {},
        sliderVotes: data.sliderVotes || {},
        likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
        viewedBy: Array.isArray(data.viewedBy) ? data.viewedBy : [],
        createdAtMs,
        createdAtLabel: data.createdAt
          ? formatDhakaDateTime(data.createdAt)
          : "Recent",
      };
    };

    const emitMerged = () => {
      const merged = new Map<string, any>();
      Object.entries(mainDocs).forEach(([id, raw]) => {
        merged.set(id, mapDoc(id, raw));
      });
      Object.entries(communityDocs).forEach(([id, raw]) => {
        const existing = merged.get(id);
        merged.set(id, mapDoc(id, existing ? { ...mainDocs[id], ...raw } : raw));
      });
      try {
        const localList = JSON.parse(
          localStorage.getItem("deep_news_stories_local") || "[]"
        );
        if (Array.isArray(localList)) {
          localList.forEach((ls: any) => {
            if (ls?.id && !merged.has(ls.id)) {
              merged.set(ls.id, mapDoc(ls.id, ls));
            }
          });
        }
      } catch {}

      const uid = auth.currentUser?.uid || "";
      const isAdm = hasImmediateAdminOrStaffRole(null, auth.currentUser);
      const visible = Array.from(merged.values())
        .filter((s) => {
          if (s.isCloseFriends && s.closeFriendIds.length > 0) {
            return isAdm || s.userId === uid || s.closeFriendIds.includes(uid);
          }
          return true;
        })
        .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));

      // Group stories by userId and sort stories within each group chronologically (FB/IG style)
      const userGroups = new Map<string, any[]>();
      visible.forEach((s) => {
        if (!userGroups.has(s.userId)) userGroups.set(s.userId, []);
        userGroups.get(s.userId)!.push(s);
      });

      // Sort stories within each group by time (oldest first)
      for (const [uid, groupStories] of userGroups.entries()) {
        groupStories.sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
      }

      const reordered = Array.from(userGroups.values()).flat();

      setStories(reordered);
      setLoading(false);
    };

    const unsubMain = onSnapshot(
      collection(db, "stories"),
      (snap) => {
        const next: Record<string, any> = {};
        snap.docs.forEach((d) => {
          next[d.id] = d.data();
        });
        mainDocs = next;
        emitMerged();
      },
      () => emitMerged()
    );

    const unsubComm = onSnapshot(
      collection(db, "creator_videos"),
      (snap) => {
        const next: Record<string, any> = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          if (data?.kind === "news_story" || data?.kind === "story_engagement") {
            next[d.id] = data;
          }
        });
        communityDocs = next;
        emitMerged();
      },
      () => emitMerged()
    );

    return () => {
      unsubMain();
      unsubComm();
    };
  }, []);

  useEffect(() => {
    if (!storyId || stories.length === 0) return;
    const foundIdx = stories.findIndex((s) => s.id === storyId);
    if (foundIdx >= 0) setActiveIdx(foundIdx);
  }, [storyId, stories.length]);

  // Effect: Record story view
  useEffect(() => {
    if (!story || !currentUser?.uid) return;
    if (story.userId === currentUser.uid) return; // Don't count own view

    const recordView = async () => {
      try {
        const alreadyViewed = story.viewedBy?.includes(currentUser.uid);
        if (alreadyViewed) return;

        const storyRef = doc(db, "stories", story.id);
        const videoRef = doc(db, "creator_videos", story.id);
        const payload = { viewedBy: arrayUnion(currentUser.uid) };

        await Promise.all([
          updateDoc(storyRef, payload).catch(() => {}),
          updateDoc(videoRef, payload).catch(() => {}),
        ]);
      } catch (e) {}
    };

    recordView();
  }, [story?.id, currentUser?.uid]);

  // Effect: Fetch owner's followers if viewing own story
  useEffect(() => {
    if (!story || !currentUser?.uid || story.userId !== currentUser.uid) {
      setOwnerFollowers([]);
      return;
    }

    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setOwnerFollowers(Array.isArray(d.followers) ? d.followers : []);
      }
    });

    return () => unsub();
  }, [story?.id, currentUser?.uid]);

  // Effect: Fetch detailed profiles for stats modal
  useEffect(() => {
    if (!showStatsModal || !story) return;

    const fetchDetailedStats = async () => {
      setIsLoadingStats(true);
      try {
        const fetchProfiles = async (uids: string[]) => {
          const profiles: any[] = [];
          for (const uid of uids) {
            try {
              const uSnap = await getDoc(doc(db, "users", uid));
              if (uSnap.exists()) {
                profiles.push({ uid: uSnap.id, ...uSnap.data() });
              }
            } catch (err) {}
          }
          return profiles;
        };

        const [vProfs, rProfs] = await Promise.all([
          fetchProfiles(story.viewedBy || []),
          fetchProfiles(story.likedBy || []),
        ]);

        setViewerProfiles(vProfs);
        setReactionProfiles(rProfs);
      } catch (err) {
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchDetailedStats();
  }, [showStatsModal, story?.id]);


  const isSignedIn = Boolean(currentUser);
  const canDeleteStory =
    Boolean(currentUser && story) &&
    (currentUser?.uid === story?.userId ||
      hasImmediateAdminOrStaffRole(null, currentUser));

  useEffect(() => {
    setViewerScale(1);
    setViewerOffset({ x: 0, y: 0 });
    viewerPinchRef.current = null;
  }, [story?.id, activeIdx]);

  const handleViewerTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const midX = (t0.clientX + t1.clientX) / 2;
      const midY = (t0.clientY + t1.clientY) / 2;
      viewerPinchRef.current = {
        active: true,
        initialDist: Math.max(dist, 1),
        initialScale: viewerScale,
        initialMidX: midX,
        initialMidY: midY,
        initialOffsetX: viewerOffset.x,
        initialOffsetY: viewerOffset.y,
      };
    }
  };

  const handleViewerTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && viewerPinchRef.current?.active) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const midX = (t0.clientX + t1.clientX) / 2;
      const midY = (t0.clientY + t1.clientY) / 2;
      const { initialDist, initialScale, initialMidX, initialMidY, initialOffsetX, initialOffsetY } =
        viewerPinchRef.current;
      const nextScale = Math.min(4, Math.max(0.5, initialScale * (dist / initialDist)));
      const nextX = initialOffsetX + (midX - initialMidX);
      const nextY = initialOffsetY + (midY - initialMidY);
      setViewerScale(nextScale);
      setViewerOffset({ x: nextX, y: nextY });
    }
  };

  const handleViewerTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2 && viewerPinchRef.current) {
      viewerPinchRef.current = null;
    }
  };

  const handleViewerWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.008;
      setViewerScale((prev) => Math.min(4, Math.max(0.5, prev + delta)));
    }
  };

  const isViewerZoomed =
    Math.abs(viewerScale - 1) > 0.02 ||
    Math.abs(viewerOffset.x) > 2 ||
    Math.abs(viewerOffset.y) > 2;

  // Sync story background music playback
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
    }
    const audio = audioRef.current;
    const songUrl = story?.music?.url || "";
    if (songUrl && !audioMuted) {
      if (audio.src !== songUrl) {
        audio.src = songUrl;
      }
      audio.muted = false;
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
    return () => {
      audio.pause();
    };
  }, [story?.id, story?.music?.url, audioMuted]);

  const handleDeleteCurrentStory = async () => {
    if (!story) return;
    const ok = await confirm({
      title: "Delete Story",
      message: "Remove this story from the Feed?",
      confirmText: "Delete",
    });
    if (!ok) return;
    triggerHaptic();
    try {
      await Promise.all([
        deleteDoc(doc(db, "creator_videos", story.id)).catch(() => {}),
        deleteDoc(doc(db, "stories", story.id)).catch(() => {}),
      ]);
      try {
        const prevLocal = JSON.parse(
          localStorage.getItem("deep_news_stories_local") || "[]"
        );
        if (Array.isArray(prevLocal)) {
          localStorage.setItem(
            "deep_news_stories_local",
            JSON.stringify(prevLocal.filter((x: any) => x?.id !== story.id))
          );
        }
      } catch {}
      notify("Story deleted.", "success");
      navigate("/news-hub");
    } catch {
      notify("Could not delete story.", "error");
    }
  };

  async function handleVotePoll(stkId: string, choice: "A" | "B") {
    if (!story) return;
    const currentVoter = auth.currentUser?.uid || "guest_viewer";
    triggerHaptic();
    const existingPoll = story.pollVotes?.[stkId] || {};
    const updatedPoll = { ...existingPoll, [currentVoter]: choice };
    try {
      await setDoc(
        doc(db, "creator_videos", story.id),
        {
          kind: story.userId ? "news_story" : "story_engagement",
          pollVotes: {
            ...(story.pollVotes || {}),
            [stkId]: updatedPoll,
          },
        },
        { merge: true }
      );
    } catch {}
  }

  async function handleVoteSlider(stkId: string, score: number) {
    if (!story) return;
    const voterKey = currentUser?.uid || "guest_viewer";
    triggerHaptic();
    const existingSlider = story.sliderVotes?.[stkId] || {};
    const updatedSlider = { ...existingSlider, [voterKey]: score };
    try {
      await setDoc(
        doc(db, "creator_videos", story.id),
        {
          kind: story.userId ? "news_story" : "story_engagement",
          sliderVotes: {
            ...(story.sliderVotes || {}),
            [stkId]: updatedSlider,
          },
        },
        { merge: true }
      );
      notify("Reaction recorded!", "success");
    } catch {}
  }

  const deliverStoryMessageToInbox = async (
    messageText: string,
    storyContextLabel: string
  ) => {
    if (!currentUser?.uid || !story) return;

    let recipientUid = String(story.userId || "").trim();
    if (!recipientUid) {
      try {
        const adminSnap = await getDocs(
          query(
            collection(db, "users"),
            where("role", "in", ["admin", "super_admin"])
          )
        );
        const firstAdmin = adminSnap.docs.find(
          (d) => d.id !== currentUser.uid
        );
        if (firstAdmin) recipientUid = firstAdmin.id;
      } catch {}
    }

    if (!recipientUid || recipientUid === currentUser.uid) return;

    const senderDisplayName = getSafeDisplayName(currentUser, "Member");
    const senderAvatar = currentUser.photoURL || "";
    let recipientName = story.authorName || "Creator";
    let recipientAvatar = story.avatar || "";

    try {
      const recSnap = await getDoc(doc(db, "users", recipientUid));
      if (recSnap.exists()) {
        const rData = recSnap.data() || {};
        recipientName =
          rData.shopName ||
          getSafeDisplayName(rData, recipientName) ||
          recipientName;
        recipientAvatar = rData.shopLogo || rData.photoURL || recipientAvatar;
      }
    } catch {}

    const qChats = query(
      collection(db, "p2p_chats"),
      where("participants", "array-contains", currentUser.uid)
    );
    const chatsSnap = await getDocs(qChats);
    let targetChatId: string | null = null;

    chatsSnap.docs.forEach((d) => {
      const data = d.data() || {};
      if (data.isGroup || data.type === "group") return;
      const parts: string[] = Array.isArray(data.participants)
        ? data.participants
        : [];
      if (parts.includes(recipientUid)) {
        targetChatId = d.id;
      }
    });

    const summaryPreview = `Story reply: ${messageText.slice(0, 60)}`;

    if (!targetChatId) {
      const createdChat = await addDoc(collection(db, "p2p_chats"), {
        participants: [currentUser.uid, recipientUid],
        participantDetails: {
          [currentUser.uid]: {
            displayName: senderDisplayName,
            photoURL: senderAvatar,
          },
          [recipientUid]: {
            displayName: recipientName,
            photoURL: recipientAvatar,
          },
        },
        lastMessage: summaryPreview,
        lastSenderId: currentUser.uid,
        seenBy: [currentUser.uid],
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        unreadCount: {
          [recipientUid]: 1,
        },
      });
      targetChatId = createdChat.id;
    } else {
      await updateDoc(doc(db, "p2p_chats", targetChatId), {
        lastMessage: summaryPreview,
        lastSenderId: currentUser.uid,
        seenBy: [currentUser.uid],
        updatedAt: serverTimestamp(),
        [`unreadCount.${recipientUid}`]: increment(1),
      });
    }

    const previewThumb =
      (story.mediaType === "image" && story.mediaUrl
        ? story.mediaUrl
        : story.avatar) || null;

    await addDoc(collection(db, "p2p_chats", targetChatId, "messages"), {
      text: messageText,
      images: [],
      imageUrl: null,
      senderId: currentUser.uid,
      senderName: senderDisplayName,
      senderPhoto: senderAvatar,
      createdAt: Date.now(),
      timestamp: serverTimestamp(),
      seenBy: [currentUser.uid],
      readBy: [currentUser.uid],
      replyTo: {
        id: story.id,
        text: storyContextLabel,
        senderId: recipientUid,
        senderName: story.authorName || recipientName,
        imageUrl: previewThumb,
      },
    });
  };

  async function handleSubmitQuestion(stk: StoryStickerItem) {
    if (!story) return;
    const answer = (questionDrafts[stk.id] || "").trim();
    if (!answer) return;
    if (!currentUser) {
      navigate("/signin");
      return;
    }
    triggerHaptic();
    setQuestionDrafts((prev) => ({ ...prev, [stk.id]: "" }));
    try {
      await setDoc(
        doc(db, "creator_videos", story.id),
        {
          kind: story.userId ? "news_story" : "story_engagement",
          questionAnswers: arrayUnion({
            stickerId: stk.id,
            prompt: stk.title,
            answer,
            uid: currentUser.uid,
            name: getSafeDisplayName(currentUser, "Viewer"),
            createdAt: Date.now(),
          }),
        },
        { merge: true }
      );
      await deliverStoryMessageToInbox(
        answer,
        `Story Q&A (${stk.title || "Question"})`
      ).catch(() => {});

      const actorIsAdmin = hasImmediateAdminOrStaffRole(null, currentUser);
      if (story.userId && story.userId !== currentUser.uid && !actorIsAdmin) {
        await addDoc(collection(db, "news_hub_notifications"), {
          userId: story.userId,
          fromUserId: currentUser.uid,
          fromUserName: getSafeDisplayName(currentUser, "Someone"),
          fromUserUsername: getSafePublicUsername(currentUser),
          fromUserAvatar: currentUser.photoURL || "",
          title: `New story response`,
          body: `responded to your story: "${answer}"`,
          mediaThumbnail: story.avatar || story.mediaUrl || "",
          type: "story",
          link: `/news-hub/story/${story.id}`,
          read: false,
          isRead: false,
          createdAt: Date.now(),
        }).catch(() => {});
      }
      notify("Response sent to inbox!", "success");
    } catch {
      notify("Could not send response.", "error");
    }
  }

  const handleToggleStoryLike = async () => {
    if (!story) return;
    if (!currentUser) {
      navigate("/signin");
      return;
    }
    triggerHaptic();
    const alreadyLiked = Boolean(story.likedBy?.includes(currentUser.uid));
    const nextLikedBy = alreadyLiked
      ? (story.likedBy || []).filter((id: string) => id !== currentUser.uid)
      : Array.from(new Set([...(story.likedBy || []), currentUser.uid]));

    setStories((prev) =>
      prev.map((s) =>
        s.id === story.id ? { ...s, likedBy: nextLikedBy } : s
      )
    );

    try {
      await Promise.all([
        setDoc(
          doc(db, "creator_videos", story.id),
          {
            kind: story.userId ? "news_story" : "story_engagement",
            likedBy: alreadyLiked
              ? arrayRemove(currentUser.uid)
              : arrayUnion(currentUser.uid),
          },
          { merge: true }
        ),
        updateDoc(doc(db, "stories", story.id), {
          likedBy: alreadyLiked
            ? arrayRemove(currentUser.uid)
            : arrayUnion(currentUser.uid),
        }).catch(() => {}),
      ]);

      const actorIsAdmin = hasImmediateAdminOrStaffRole(null, currentUser);
      if (!alreadyLiked && story.userId && story.userId !== currentUser.uid && !actorIsAdmin) {
        await addDoc(collection(db, "news_hub_notifications"), {
          userId: story.userId,
          fromUserId: currentUser.uid,
          fromUserName: getSafeDisplayName(currentUser, "Someone"),
          fromUserUsername: getSafePublicUsername(currentUser),
          fromUserAvatar: currentUser.photoURL || "",
          type: "story_like",
          title: "New Story Like",
          body: "liked your story.",
          mediaThumbnail: story.avatar || story.mediaUrl || "",
          targetId: story.id,
          createdAt: Date.now(),
          read: false,
          isRead: false,
          link: `/news-hub/story/${story.id}`,
        }).catch(() => {});
      }
    } catch {}
  };

  const handleSendStoryReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!story || !replyText.trim()) return;
    if (!currentUser) {
      navigate("/signin");
      return;
    }
    const cleanReply = replyText.trim();
    setReplyText("");
    triggerHaptic();
    try {
      await Promise.all([
        setDoc(
          doc(db, "creator_videos", story.id),
          {
            kind: story.userId ? "news_story" : "story_engagement",
            storyReplies: arrayUnion({
              uid: currentUser.uid,
              name: getSafeDisplayName(currentUser, "Member"),
              text: cleanReply,
              createdAt: Date.now(),
            }),
          },
          { merge: true }
        ).catch(() => {}),
        deliverStoryMessageToInbox(
          cleanReply,
          story.caption
            ? `Replied to story: "${String(story.caption).slice(0, 50)}"`
            : `Replied to ${story.authorName || "your"} story`
        ),
      ]);

      const actorIsAdmin = hasImmediateAdminOrStaffRole(null, currentUser);
      if (story.userId && story.userId !== currentUser.uid && !actorIsAdmin) {
        await addDoc(collection(db, "news_hub_notifications"), {
          userId: story.userId,
          fromUserId: currentUser.uid,
          fromUserName: getSafeDisplayName(currentUser, "Someone"),
          fromUserUsername: getSafePublicUsername(currentUser),
          fromUserAvatar: currentUser.photoURL || "",
          title: "New Story Reply",
          body: `replied to your story: "${cleanReply}"`,
          mediaThumbnail: story.avatar || story.mediaUrl || "",
          type: "story",
          link: `/news-hub/story/${story.id}`,
          read: false,
          isRead: false,
          createdAt: Date.now(),
        }).catch(() => {});
      }
      notify("Reply sent to inbox!", "success");
    } catch {
      notify("Could not send reply to inbox.", "error");
    }
  };

  function renderViewerTextLayer(layer: StoryTextLayer) {
    const colorDef = STORY_COLORS.find((c) => c.id === layer.colorId) || STORY_COLORS[0];
    const fontDef = STORY_FONTS.find((f) => f.id === layer.fontId) || STORY_FONTS[0];
    const sizeDef = FONT_SIZE_STEPS[layer.sizeStep] || FONT_SIZE_STEPS[3];
    const alignClass =
      layer.align === "left"
        ? "text-left"
        : layer.align === "right"
        ? "text-right"
        : "text-center";
    const pillClass =
      layer.pillMode === "solid"
        ? `${colorDef.pillSolidClass} px-4 py-2 rounded-2xl shadow-lg`
        : layer.pillMode === "soft"
        ? `${colorDef.pillSoftClass} px-4 py-2 rounded-2xl shadow-md`
        : colorDef.textClass;
    const outlineClass =
      layer.outline && layer.pillMode === "none"
        ? "drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]"
        : "";
    const animClass =
      layer.animation === "pulse"
        ? "animate-pulse"
        : layer.animation === "bounce"
        ? "animate-bounce"
        : "";
    const displayStr =
      layer.caseMode === "upper"
        ? layer.text.toUpperCase()
        : layer.caseMode === "lower"
        ? layer.text.toLowerCase()
        : layer.text;

    return (
      <div
        key={layer.id}
        className={`max-w-[300px] break-words leading-snug ${fontDef.className} ${sizeDef.textClass} ${alignClass} ${pillClass} ${outlineClass} ${animClass}`}
      >
        {displayStr}
      </div>
    );
  }

  function renderViewerSticker(stk: StoryStickerItem) {
    const voterKey = auth.currentUser?.uid || "guest_viewer";

    switch (stk.kind) {
      case "poll": {
        const votesObj: Record<string, "A" | "B"> = story?.pollVotes?.[stk.id] || {};
        const vals = Object.values(votesObj);
        const total = vals.length;
        const countA = vals.filter((v) => v === "A").length;
        const countB = vals.filter((v) => v === "B").length;
        const pctA = total > 0 ? Math.round((countA / total) * 100) : 50;
        const pctB = total > 0 ? 100 - pctA : 50;
        const myVote = voterKey ? votesObj[voterKey] : undefined;

        return (
          <div key={stk.id} className="w-60 rounded-2xl bg-white text-zinc-900 p-3.5 shadow-xl space-y-2">
            <p className="text-xs font-extrabold text-center text-zinc-900">{stk.title}</p>
            <button
              type="button"
              onClick={() => handleVotePoll(stk.id, "A")}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                myVote === "A" ? "bg-[#1877F2] text-white" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-900"
              }`}
            >
              <span className="truncate">{stk.optionA || "Yes"}</span>
              {total > 0 && <span className="tabular-nums">{pctA}%</span>}
            </button>
            <button
              type="button"
              onClick={() => handleVotePoll(stk.id, "B")}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                myVote === "B" ? "bg-[#1877F2] text-white" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-900"
              }`}
            >
              <span className="truncate">{stk.optionB || "No"}</span>
              {total > 0 && <span className="tabular-nums">{pctB}%</span>}
            </button>
          </div>
        );
      }

      case "questions":
        return (
          <div key={stk.id} className="w-64 rounded-2xl bg-white text-zinc-900 p-3.5 shadow-xl space-y-2">
            <p className="text-xs font-extrabold text-center text-zinc-900">{stk.title}</p>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={questionDrafts[stk.id] || ""}
                onChange={(e) =>
                  setQuestionDrafts((prev) => ({ ...prev, [stk.id]: e.target.value }))
                }
                placeholder="Type your response..."
                className="flex-1 h-8 px-2.5 rounded-lg bg-zinc-100 text-xs text-zinc-900 outline-none"
              />
              <button
                type="button"
                onClick={() => handleSubmitQuestion(stk)}
                className="px-3 h-8 rounded-lg bg-[#1877F2] text-white text-xs font-bold cursor-pointer"
              >
                Send
              </button>
            </div>
          </div>
        );

      case "slider": {
        const sliderObj: Record<string, number> = story?.sliderVotes?.[stk.id] || {};
        const myScore = sliderObj[voterKey] || 0;
        return (
          <div key={stk.id} className="w-60 rounded-2xl bg-white text-zinc-900 p-3.5 shadow-xl space-y-2 text-center">
            <p className="text-xs font-extrabold text-zinc-900">{stk.title}</p>
            <div className="flex items-center justify-between gap-1 pt-1">
              {[1, 2, 3, 4, 5].map((lv) => (
                <button
                  key={lv}
                  type="button"
                  onClick={() => handleVoteSlider(stk.id, lv)}
                  className={`flex-1 py-1.5 rounded-lg text-base cursor-pointer transition-transform hover:scale-110 ${
                    myScore >= lv ? "bg-[#1877F2]/15 scale-105" : "bg-zinc-100 opacity-65"
                  }`}
                >
                  {stk.emoji || "🔥"}
                </button>
              ))}
            </div>
          </div>
        );
      }

      case "add_yours":
        return (
          <div key={stk.id} className="w-56 rounded-2xl bg-white text-zinc-900 p-3.5 shadow-xl space-y-2.5 text-center">
            <p className="text-xs font-bold text-zinc-900">{stk.title}</p>
            <button
              type="button"
              onClick={() =>
                navigate(
                  isSignedIn
                    ? `/news-hub/create-story?from=news-hub&prompt=${encodeURIComponent(
                        stk.title
                      )}`
                    : "/signin"
                )
              }
              className="py-1.5 px-3.5 rounded-full bg-[#1877F2] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Add yours</span>
            </button>
          </div>
        );

      case "mention":
        return (
          <button
            key={stk.id}
            type="button"
            onClick={() =>
              navigate(
                stk.targetUid
                  ? `/author/${stk.targetUid}`
                  : `/news-hub/search?q=${encodeURIComponent(stk.title)}`
              )
            }
            className="px-3.5 py-2 rounded-xl bg-white/95 text-[#1877F2] shadow-lg inline-flex items-center gap-1 font-extrabold text-sm cursor-pointer"
          >
            <AtSign className="w-4 h-4" />
            <span>{stk.title.replace(/^@/, "")}</span>
          </button>
        );

      case "hashtag":
        return (
          <button
            key={stk.id}
            type="button"
            onClick={() =>
              navigate(`/news-hub/search?q=${encodeURIComponent("#" + stk.title.replace(/^#/, ""))}`)
            }
            className="px-3.5 py-2 rounded-xl bg-zinc-900/90 text-white border border-white/20 shadow-lg inline-flex items-center gap-1 font-bold text-sm cursor-pointer"
          >
            <Hash className="w-4 h-4 text-[#1877F2]" />
            <span>{stk.title.replace(/^#/, "")}</span>
          </button>
        );

      case "location":
        return (
          <div
            key={stk.id}
            className="px-3.5 py-2 rounded-xl bg-white/95 text-zinc-900 shadow-lg inline-flex items-center gap-1.5 font-bold text-xs"
          >
            <MapPin className="w-3.5 h-3.5 text-[#1877F2]" />
            <span>{stk.title}</span>
          </div>
        );

      case "shop_order":
        return (
          <button
            key={stk.id}
            type="button"
            onClick={() => navigate(stk.url || (stk.productId ? `/product/${stk.productId}` : "/products"))}
            className="w-60 rounded-2xl bg-white text-zinc-900 p-2.5 shadow-xl flex items-center gap-2.5 text-left cursor-pointer hover:scale-[1.02] transition-transform"
          >
            {stk.imageUrl ? (
              <img
                src={stk.imageUrl}
                alt={stk.title}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl object-cover shrink-0 bg-zinc-100"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold truncate text-zinc-900">{stk.title}</p>
              <p className="text-[11px] font-bold text-[#1877F2] tabular-nums">
                {stk.priceLabel || "Shop on Deep Shop →"}
              </p>
            </div>
          </button>
        );

      case "link": {
        const href = stk.url || stk.title || "";
        if (href.startsWith("/")) {
          return (
            <button
              key={stk.id}
              type="button"
              onClick={() => navigate(href)}
              className="px-4 py-2 rounded-full bg-white text-[#1877F2] shadow-xl inline-flex items-center gap-1.5 font-bold text-xs cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>{stk.subtitle || "Visit Link"}</span>
            </button>
          );
        }
        return (
          <a
            key={stk.id}
            href={/^https?:\/\//i.test(href) ? href : `https://${href}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-full bg-white text-[#1877F2] shadow-xl inline-flex items-center gap-1.5 font-bold text-xs"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>{stk.subtitle || "Visit Link"}</span>
          </a>
        );
      }

      case "notify":
        return (
          <button
            key={stk.id}
            type="button"
            onClick={() => notify("Reminder turned on for this creator!", "success")}
            className="px-4 py-2.5 rounded-2xl bg-white text-zinc-900 shadow-xl inline-flex items-center gap-2 text-xs font-extrabold cursor-pointer"
          >
            <Bell className="w-4 h-4 text-[#1877F2] fill-[#1877F2]" />
            <span>{stk.title || "Notify me"}</span>
          </button>
        );

      case "countdown":
        return (
          <div
            key={stk.id}
            className="w-56 rounded-2xl bg-zinc-900/90 text-white border border-white/15 backdrop-blur-md p-3.5 shadow-xl text-center space-y-1.5"
          >
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-sky-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{stk.subtitle || "Upcoming"}</span>
            </div>
            <p className="text-sm font-extrabold">{stk.title}</p>
          </div>
        );

      case "photo":
      case "cutout":
      case "frame":
        return stk.imageUrl ? (
          <img
            key={stk.id}
            src={stk.imageUrl}
            alt=""
            referrerPolicy="no-referrer"
            className={
              stk.kind === "cutout"
                ? "w-28 h-28 rounded-full object-cover border-4 border-dashed border-white shadow-xl"
                : "w-36 rounded-2xl object-cover border-2 border-white shadow-xl"
            }
          />
        ) : null;

      case "reaction":
        return (
          <span key={stk.id} className="text-4xl drop-shadow-xl">
            {stk.emoji || "😍"}
          </span>
        );

      default:
        return stk.title ? (
          <div
            key={stk.id}
            className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-white/20 backdrop-blur-md text-xs font-extrabold text-white"
          >
            {stk.title}
          </div>
        ) : null;
    }
  };

  const isLikedByMe = Boolean(
    currentUser?.uid && story?.likedBy?.includes(currentUser.uid)
  );

  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-zinc-950 text-white flex flex-col justify-between">
      <SEO
        title={`${story?.authorName || "Story"} — Feed`}
        description="Story viewer"
      />

      {/* Progress & Header */}
      <header className="px-4 pt-3 pb-2 space-y-2 z-20 shrink-0">
        {stories.length > 0 && (
          <div className="flex items-center gap-1.5 max-w-md mx-auto">
            {stories.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveIdx(idx)}
                className={`h-1 flex-1 rounded-full transition-colors cursor-pointer ${
                  idx <= activeIdx ? "bg-white" : "bg-white/30"
                }`}
                aria-label={`Story ${idx + 1}`}
              />
            ))}
          </div>
        )}

        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => navigate("/news-hub")}
              className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center cursor-pointer shrink-0"
              aria-label="Back to Feed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {story && (
              <>
                <img
                  src={story.avatar}
                  alt={story.authorName}
                  referrerPolicy="no-referrer"
                  className={`w-10 h-10 rounded-full object-cover border-2 shrink-0 ${
                    story.isCloseFriends ? "border-green-500" : "border-white/50"
                  }`}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-white truncate">
                      {story.authorName}
                    </p>
                    {story.isCloseFriends && (
                      <span className="px-2 py-0.5 rounded-full bg-green-500 text-white text-[10px] font-bold inline-flex items-center gap-1 shrink-0">
                        <Star className="w-2.5 h-2.5 fill-white" />
                        <span>Close Friends</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-300 truncate leading-tight">
                    {story.createdAtLabel}
                  </div>
                  {story.aiLabel && (
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-sky-400 leading-tight">
                      <Sparkles className="w-3 h-3 shrink-0" />
                      <span>AI generated</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {story?.music?.url && (
              <button
                type="button"
                onClick={() => setAudioMuted((m) => !m)}
                className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center cursor-pointer"
                aria-label={audioMuted ? "Unmute story audio" : "Mute story audio"}
              >
                {audioMuted ? (
                  <VolumeX className="w-4 h-4 text-zinc-300" />
                ) : (
                  <Volume2 className="w-4 h-4 text-[#1877F2]" />
                )}
              </button>
            )}

            {isViewerZoomed && (
              <button
                type="button"
                onClick={() => {
                  setViewerScale(1);
                  setViewerOffset({ x: 0, y: 0 });
                }}
                className="px-2.5 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center gap-1 text-[11px] font-bold text-white cursor-pointer shrink-0 whitespace-nowrap"
                aria-label="Reset zoom"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>1:1</span>
              </button>
            )}

            {canDeleteStory && (
              <button
                type="button"
                onClick={handleDeleteCurrentStory}
                className="w-9 h-9 rounded-full bg-white/15 hover:bg-red-500/30 flex items-center justify-center cursor-pointer"
                aria-label="Delete story"
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Attached Song Banner */}
        {story?.songTitle && (
          <div className="max-w-md mx-auto flex items-center gap-1.5 text-xs text-zinc-300 px-1">
            <Music className="w-3.5 h-3.5 text-[#1877F2] shrink-0" />
            <span className="truncate">{story.songTitle}</span>
          </div>
        )}
      </header>

      {/* Story Media Stage */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-4 py-1 bg-transparent overflow-hidden">
        {loading ? (
          <p className="text-sm text-zinc-400">Loading story...</p>
        ) : !story ? (
          <div className="text-center space-y-3">
            <p className="text-sm text-zinc-400">No active story found.</p>
            <button
              type="button"
              onClick={() => navigate("/news-hub")}
              className="px-5 py-2.5 rounded-full bg-white text-zinc-900 text-xs font-bold cursor-pointer"
            >
              Back to Feed
            </button>
          </div>
        ) : (
          <div
            onTouchStart={handleViewerTouchStart}
            onTouchMove={handleViewerTouchMove}
            onTouchEnd={handleViewerTouchEnd}
            onTouchCancel={handleViewerTouchEnd}
            onWheel={handleViewerWheel}
            className="relative w-full max-w-md h-full max-h-[64dvh] sm:max-h-[68dvh] aspect-[9/15] rounded-[28px] overflow-hidden bg-black shadow-2xl touch-none"
          >
            {story.mediaType === "video" ? (
              <video
                src={story.mediaUrl}
                autoPlay
                playsInline
                controls
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <motion.img
                src={story.mediaUrl}
                alt={story.authorName}
                referrerPolicy="no-referrer"
                animate={{
                  scale: story.isBoomerang ? viewerScale * 1.03 : viewerScale,
                  x: viewerOffset.x,
                  y: viewerOffset.y,
                }}
                transition={{ duration: 0 }}
                className={`w-full h-full object-contain bg-black select-none ${
                  story.isBoomerang ? "animate-pulse" : ""
                }`}
              />
            )}

            {/* Interactive Text & Sticker Overlays */}
            {(story?.textLayers?.length > 0 || story?.stickers?.length > 0) && (
              <div className="absolute inset-0 z-10 p-5 flex flex-col items-center justify-center gap-3 overflow-y-auto">
                {story?.textLayers?.map((tl: StoryTextLayer) => renderViewerTextLayer(tl))}
                {story?.stickers?.map((stk: StoryStickerItem) => renderViewerSticker(stk))}
              </div>
            )}

            {(story.caption || story.linkUrl) && (
              <div className="absolute inset-x-0 bottom-0 z-20 p-5 bg-gradient-to-t from-black/85 via-black/45 to-transparent space-y-2.5">
                {story.caption && (
                  <p className="text-sm font-medium text-white leading-relaxed">
                    {story.caption}
                  </p>
                )}
                {story.linkUrl && !story.stickers?.some((s: any) => s.kind === "link" || s.kind === "shop_order") && (
                  <a
                    href={
                      /^https?:\/\//i.test(story.linkUrl)
                        ? story.linkUrl
                        : story.linkUrl.startsWith("/")
                        ? story.linkUrl
                        : `https://${story.linkUrl}`
                    }
                    target={story.linkUrl.startsWith("/") ? "_self" : "_blank"}
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1877F2] text-white text-xs font-bold shadow-md"
                  >
                    <span>Open Story Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            {activeIdx > 0 && (
              <button
                type="button"
                onClick={() => setActiveIdx((i) => i - 1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center cursor-pointer"
                aria-label="Previous story"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {activeIdx < stories.length - 1 && (
              <button
                type="button"
                onClick={() => setActiveIdx((i) => i + 1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center cursor-pointer"
                aria-label="Next story"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Reply / Heart Reaction Bar (Lifted above mobile bottom bar) */}
      <div className="px-4 pt-2 pb-7 sm:pb-8 mb-2 max-w-md mx-auto w-full shrink-0 z-30">
        {story ? (
          <div className="flex items-center gap-2.5">
            {currentUser?.uid === story.userId && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setShowStatsModal(true);
                }}
                className="w-11 h-11 rounded-full bg-white/10 border border-white/15 text-white flex items-center justify-center shrink-0 cursor-pointer hover:bg-white/20"
                aria-label="Story activity"
              >
                <BarChart3 className="w-5 h-5" />
              </button>
            )}

            {story.allowCommenting ? (
              <form onSubmit={handleSendStoryReply} className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${story.authorName}...`}
                  className="flex-1 h-11 px-4 rounded-full bg-white/10 border border-white/15 text-xs text-white placeholder-zinc-400 outline-none focus:border-[#1877F2]"
                />
                {replyText.trim() && (
                  <button
                    type="submit"
                    className="w-11 h-11 rounded-full bg-[#1877F2] text-white flex items-center justify-center shrink-0 cursor-pointer"
                    aria-label="Send reply"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </form>
            ) : (
              <div className="flex-1 h-11 px-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-zinc-400">
                Commenting turned off for this story
              </div>
            )}

            <button
              type="button"
              onClick={handleToggleStoryLike}
              className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 border transition-colors cursor-pointer ${
                isLikedByMe
                  ? "bg-rose-500/20 border-rose-500 text-rose-500"
                  : "bg-white/10 border-white/15 text-white hover:bg-white/20"
              }`}
              aria-label="Like story"
            >
              <Heart className={`w-5 h-5 ${isLikedByMe ? "fill-rose-500" : ""}`} />
            </button>
          </div>
        ) : null}
      </div>

      {/* STORY ACTIVITY / VIEWERS MODAL (Only for owner) */}
      <AnimatePresence>
        {showStatsModal && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end justify-center p-4" onClick={() => setShowStatsModal(false)}>
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 w-full max-w-md rounded-t-[32px] overflow-hidden flex flex-col max-h-[80vh] border border-zinc-800"
            >
              <div className="h-1.5 w-12 bg-zinc-700 rounded-full mx-auto my-3 shrink-0" />
              
              <div className="px-6 py-2 flex items-center justify-between border-b border-zinc-800 shrink-0">
                <h2 className="text-base font-bold text-white">Story activity</h2>
                <button onClick={() => setShowStatsModal(false)} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {/* Main Stats Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-800">
                    <div className="flex items-center gap-2 text-zinc-400 mb-1">
                      <Eye className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Views</span>
                    </div>
                    <p className="text-2xl font-black text-white">{formatCompactNumber(story?.viewedBy?.length || 0)}</p>
                  </div>
                  <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-800">
                    <div className="flex items-center gap-2 text-zinc-400 mb-1">
                      <Heart className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Reactions</span>
                    </div>
                    <p className="text-2xl font-black text-white">{story?.likedBy?.length || 0}</p>
                  </div>
                </div>

                {/* Followers List (Viewed) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Followers who viewed</h3>
                    <span className="text-[10px] font-bold bg-[#1877F2]/20 text-[#1877F2] px-2 py-0.5 rounded-full">Only you see this</span>
                  </div>
                  
                  {isLoadingStats ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-5 h-5 border-2 border-[#1877F2] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {viewerProfiles.filter(p => ownerFollowers.includes(p.uid)).length === 0 ? (
                        <p className="text-xs text-zinc-500 text-center py-4 italic">No followers have viewed yet.</p>
                      ) : (
                        viewerProfiles.filter(p => ownerFollowers.includes(p.uid)).map(prof => (
                          <div key={prof.uid} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                              <img src={prof.photoURL || prof.shopLogo || defaultAvatarImg} alt="" className="w-10 h-10 rounded-full object-cover bg-zinc-800 border border-zinc-700" />
                              <div>
                                <p className="text-sm font-bold text-white leading-none mb-1">{getSafeDisplayName(prof, "Member")}</p>
                                {getSafePublicUsername(prof) ? (
                                  <p className="text-[11px] text-zinc-500 font-medium">@{getSafePublicUsername(prof)}</p>
                                ) : null}
                              </div>
                            </div>
                            
                            {/* If they also liked, show the reaction */}
                            {story.likedBy?.includes(prof.uid) && (
                              <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-500 shadow-sm border border-rose-500/30">
                                <Heart className="w-4 h-4 fill-current" />
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Reaction Details if any non-follower reacted (Optional, but user said "followers jara tara react dile tader id ar sathe react tao dekhabe") */}
                {/* We already show heart next to viewer if they are a follower. Let's make sure we show everyone who reacted IF they are followers but maybe didn't trigger a 'view' correctly (unlikely) */}
              </div>

              <div className="p-6 bg-zinc-900 border-t border-zinc-800">
                <p className="text-[10px] text-zinc-500 text-center leading-relaxed">
                  Only views and reactions from your followers are shown in the detailed list. 
                  Total counts include all community members.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};


