import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Calendar,
  MoreHorizontal,
  TrendingUp,
  Settings,
  MessageSquareOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  SmoothImage,
  isImageCached,
  markImageCached,
  preloadImageUrl,
} from "../components/SmoothImage";
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
import { ScamPost, StoryHighlightItem, StoryHighlightSnapshot } from "../types";
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
import { LoopPostCard, VerifiedLoopBadge } from "../components/LoopPostCard";
import { LiquidGlassShareModal } from "../components/LiquidGlassPostInteractions";
import { computeNextPostReactionState } from "../lib/feedAlgorithm";
import { useFollowedIds, toggleFollowUser, getEffectiveFollowersCount } from "../lib/follow";
import {
  DualSocialShareIcon,
  StoryMusicBarsIcon,
  OwnStoryMorePopover,
  PeerStoryMenuPopover,
  StoryCommentSheet,
  StoryMentionSheet,
  StoryHighlightModal,
  StoryDirectSendSheet,
  StoryAboutAccountModal,
  StorySettingsSheet,
  StoryReplyItem,
} from "../components/LoopsStoryViewerModals";

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
 * 1. DEDICATED FULLSCREEN PHOTO VIEWER PAGE (/loops/photo/:postId/:index)
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
  const [chromeVisible, setChromeVisible] = useState(true);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [loading, setLoading] = useState(
    !Boolean(navCommentState?.commentImageUrl)
  );

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const lastTapMsRef = useRef<number>(0);
  const singleTapTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setActiveIndex(Math.max(0, Number(index) || 0));
    setZoomed(false);
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
      if (singleTapTimerRef.current) {
        window.clearTimeout(singleTapTimerRef.current);
      }
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
    : getSafePublicUsername({
        username: (post as any)?.reporterUsername,
        displayName: post?.reporterName,
      }) ||
      post?.reporterName ||
      "Loops Photo";
  const authorAvatar = !isCommentPhotoMode ? post?.reporterAvatar || "" : "";
  const bottomCaption = isCommentPhotoMode
    ? commentMedia?.text || ""
    : post?.description || "";

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        navigate(-1);
      } else if (e.key === "ArrowLeft" && !zoomed && activeIndex > 0) {
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (
        e.key === "ArrowRight" &&
        !zoomed &&
        activeIndex < images.length - 1
      ) {
        setActiveIndex((i) => Math.min(images.length - 1, i + 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, images.length, navigate, zoomed]);

  const handleDownload = () => {
    if (!currentImg) return;
    triggerHaptic();
    const filename = isCommentPhotoMode
      ? `comment-photo-${commentId || "media"}.jpg`
      : isScam
      ? `scam-report-${post?.id || "photo"}-${activeIndex + 1}.jpg`
      : `loops-photo-${post?.id || "photo"}-${activeIndex + 1}.jpg`;
    downloadWatermarkedImage(currentImg, filename);
    notify("Photo saved to device", "success");
  };

  const handleCopyShareLink = async () => {
    if (!post?.id) return;
    triggerHaptic();
    const shareUrl = `${getPublicShareOrigin()}/loops/post/${post.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      notify("Post link copied", "success");
    } catch {
      notify("Could not copy link", "error");
    }
  };

  const handleImageStageTap = () => {
    const now = Date.now();
    if (now - lastTapMsRef.current < 280) {
      if (singleTapTimerRef.current) {
        window.clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      triggerHaptic();
      setZoomed((z) => !z);
      lastTapMsRef.current = 0;
      return;
    }
    lastTapMsRef.current = now;
    singleTapTimerRef.current = window.setTimeout(() => {
      if (!zoomed) {
        setChromeVisible((v) => !v);
      }
      singleTapTimerRef.current = null;
    }, 260);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoomed || e.touches.length !== 1) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (
      zoomed ||
      touchStartXRef.current === null ||
      touchStartYRef.current === null
    ) {
      return;
    }
    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const endY = e.changedTouches[0]?.clientY ?? touchStartYRef.current;
    const dx = touchStartXRef.current - endX;
    const dy = touchStartYRef.current - endY;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(dy) > 95 && Math.abs(dy) > Math.abs(dx) * 1.4) {
      triggerHaptic();
      navigate(-1);
      return;
    }

    if (images.length > 1 && Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy)) {
      triggerHaptic();
      if (dx > 0 && activeIndex < images.length - 1) {
        setActiveIndex((i) => Math.min(images.length - 1, i + 1));
      } else if (dx < 0 && activeIndex > 0) {
        setActiveIndex((i) => Math.max(0, i - 1));
      }
    }
  };

  const totalLikes = Math.max(
    Number(post?.votes || 0),
    post?.reactions ? Object.keys(post.reactions).length : 0
  );
  const totalComments = Number(post?.commentsCount || 0);

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between overflow-hidden select-none">
      <SEO
        title={
          isCommentPhotoMode
            ? `${headerTitle} — Comment Photo`
            : post?.title && post.title !== "Feed Post"
            ? `${post.title} — Photo`
            : `${headerTitle} on Loops`
        }
        description="Fullscreen photo viewer"
      />

      {/* Top Floating Liquid-Glass Chrome */}
      <header
        className={`fixed top-0 inset-x-0 z-30 px-3.5 sm:px-6 pt-3.5 pb-6 flex items-center justify-between gap-3 bg-gradient-to-b from-black/85 via-black/45 to-transparent transition-all duration-200 ${
          chromeVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-3 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              navigate(-1);
            }}
            className="w-11 h-11 rounded-full bg-white/12 hover:bg-white/20 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white active:scale-95 transition cursor-pointer shrink-0"
            aria-label="Close photo viewer"
          >
            <X className="w-5 h-5 stroke-[2.2]" />
          </button>

          <div
            onClick={() => {
              if (!isCommentPhotoMode && post?.reporterId) {
                navigate(`/loops/profile/${post.reporterId}`);
              }
            }}
            className={`flex items-center gap-2.5 min-w-0 ${
              !isCommentPhotoMode && post?.reporterId ? "cursor-pointer" : ""
            }`}
          >
            {authorAvatar ? (
              <img
                src={authorAvatar}
                alt={headerTitle}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover ring-1 ring-white/25 shrink-0"
              />
            ) : null}
            <div className="min-w-0">
              <p className="text-[14.5px] font-semibold text-white truncate leading-tight">
                {headerTitle}
              </p>
              <p className="text-[11.5px] text-zinc-300/85 truncate leading-tight mt-0.5">
                {isCommentPhotoMode
                  ? "Reply attachment"
                  : post?.createdAt
                  ? formatDhakaDateTime(post.createdAt)
                  : "Loops"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {images.length > 1 && (
            <div className="px-3 h-9 rounded-full bg-white/12 backdrop-blur-xl border border-white/18 flex items-center justify-center text-xs font-semibold tabular-nums text-white">
              {activeIndex + 1}/{images.length}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              setZoomed((z) => !z);
            }}
            className="w-10 h-10 rounded-full bg-white/12 hover:bg-white/20 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white active:scale-95 transition cursor-pointer"
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
              className="w-10 h-10 rounded-full bg-white/12 hover:bg-white/20 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white active:scale-95 transition cursor-pointer"
              aria-label="Save photo"
              title="Save photo"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Center Edge-to-Edge Cinema Stage */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`relative flex-1 w-full h-full flex items-center justify-center ${
          zoomed ? "overflow-auto" : "overflow-hidden"
        }`}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-9 h-9 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            <span className="text-xs font-medium text-zinc-400">
              Opening photo...
            </span>
          </div>
        ) : !currentImg ? (
          <div className="text-center space-y-3 px-6">
            <p className="text-sm text-zinc-400">Photo unavailable.</p>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 rounded-full bg-white text-zinc-950 text-xs font-semibold cursor-pointer"
            >
              Go Back
            </button>
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentImg}-${activeIndex}`}
                initial={{ opacity: 0.4, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0.3, scale: 0.985 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                onClick={handleImageStageTap}
                className="w-full h-full flex items-center justify-center"
              >
                <SmoothImage
                  src={currentImg}
                  alt={headerTitle}
                  eager
                  onLoad={() => {
                    preloadImageUrl(images[activeIndex + 1]);
                    preloadImageUrl(images[activeIndex - 1]);
                  }}
                  wrapperClassName="bg-transparent flex items-center justify-center w-full h-full rounded-none"
                  skeletonClassName="bg-zinc-900/60 rounded-none"
                  className={`rounded-none select-none transition-transform duration-200 ${
                    zoomed
                      ? "scale-[2.15] cursor-zoom-out max-h-none w-auto"
                      : "max-h-[100dvh] w-full object-contain cursor-zoom-in"
                  }`}
                />
              </motion.div>
            </AnimatePresence>

            {images.length > 1 && !zoomed && chromeVisible && (
              <>
                {activeIndex > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic();
                      setActiveIndex((i) => Math.max(0, i - 1));
                    }}
                    className="hidden sm:flex fixed left-5 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white/12 hover:bg-white/22 backdrop-blur-xl border border-white/15 text-white items-center justify-center active:scale-95 transition cursor-pointer"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                {activeIndex < images.length - 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic();
                      setActiveIndex((i) =>
                        Math.min(images.length - 1, i + 1)
                      );
                    }}
                    className="hidden sm:flex fixed right-5 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white/12 hover:bg-white/22 backdrop-blur-xl border border-white/15 text-white items-center justify-center active:scale-95 transition cursor-pointer"
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

      {/* Bottom Floating Caption, Slide Indicators & Quick Actions */}
      <footer
        className={`fixed bottom-0 inset-x-0 z-30 px-4 sm:px-6 pb-6 pt-8 bg-gradient-to-t from-black/90 via-black/55 to-transparent transition-all duration-200 ${
          chromeVisible && !zoomed
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <div className="max-w-xl mx-auto space-y-3">
          {isScam && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/90 backdrop-blur-md text-white text-[11.5px] font-semibold">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>
                Scam Report
                {post?.scamLocation ? ` · ${post.scamLocation}` : ""}
              </span>
            </div>
          )}

          {bottomCaption && (
            <div
              onClick={() => setCaptionExpanded((p) => !p)}
              className="cursor-pointer"
            >
              <p
                className={`text-[14px] leading-[1.45] text-zinc-100 break-words ${
                  captionExpanded ? "max-h-40 overflow-y-auto" : "line-clamp-2"
                }`}
              >
                {bottomCaption}
              </p>
            </div>
          )}

          {images.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 py-0.5">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setZoomed(false);
                    setActiveIndex(idx);
                  }}
                  aria-label={`View photo ${idx + 1}`}
                  className={`rounded-full transition-all cursor-pointer ${
                    idx === activeIndex
                      ? "w-5 h-1.5 bg-white"
                      : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          )}

          {!isCommentPhotoMode && post?.id && (
            <div className="flex items-center justify-between pt-1 border-t border-white/12 text-zinc-200">
              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    navigate(`/loops/post/${post.id}`);
                  }}
                  className="min-h-[40px] inline-flex items-center gap-1.5 text-[13.5px] font-medium hover:text-white transition cursor-pointer"
                >
                  <Heart className="w-[19px] h-[19px]" />
                  {totalLikes > 0 && (
                    <span className="tabular-nums">
                      {formatCompactNumber(totalLikes)}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    navigate(`/loops/post/${post.id}#comments`);
                  }}
                  className="min-h-[40px] inline-flex items-center gap-1.5 text-[13.5px] font-medium hover:text-white transition cursor-pointer"
                >
                  <MessageCircle className="w-[19px] h-[19px]" />
                  {totalComments > 0 && (
                    <span className="tabular-nums">
                      {formatCompactNumber(totalComments)}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="min-h-[40px] inline-flex items-center gap-1.5 text-[13.5px] font-medium hover:text-white transition cursor-pointer"
                >
                  <Send className="w-[18px] h-[18px]" />
                  <span>Share</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  navigate(`/loops/post/${post.id}`);
                }}
                className="px-3.5 h-8 rounded-full bg-white/12 hover:bg-white/20 backdrop-blur-md border border-white/15 text-xs font-semibold text-white transition cursor-pointer"
              >
                View Loop
              </button>
            </div>
          )}
        </div>
      </footer>
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
                    "",
                });
                return;
              }
            } catch {}
            if (item.fallbackName) {
              resolved.push({
                chatId: item.chatId,
                uid: item.otherUid,
                name: item.fallbackName,
                avatar: item.fallbackAvatar || "",
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
      ? `${getPublicShareOrigin()}/loops/post/${post?.id || id}`
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
                  {post.reporterAvatar ? (
                    <img
                      src={post.reporterAvatar}
                      alt={post.reporterName}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-700 dark:text-zinc-200 shrink-0">
                      {(post.reporterName || "M").slice(0, 1).toUpperCase()}
                    </div>
                  )}
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
                              {recipient.avatar ? (
                                <img
                                  src={recipient.avatar}
                                  alt={recipient.name}
                                  referrerPolicy="no-referrer"
                                  className="w-9 h-9 rounded-full object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-200 shrink-0">
                                  {(recipient.name || "M").slice(0, 1).toUpperCase()}
                                </div>
                              )}
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
 * 3. DEDICATED SEARCH (/loops/search) & STANDALONE SAVED (/loops/saved) PAGES
 *    Matches IMG_5128, IMG_5129, IMG_5130 1:1
 * ========================================================================== */
export const NewsSavedAndSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const notify = useNotify();
  const confirm = useConfirm();

  const isSavedRoute = location.pathname.includes("/saved");
  const urlTag = searchParams.get("tag") || "";
  const urlQuery = searchParams.get("q") || "";

  const [posts, setPosts] = useState<ScamPost[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>(() =>
    getSavedPostIdsLocal()
  );
  const [queryText, setQueryText] = useState<string>(() =>
    urlTag ? `#${urlTag.replace(/^#/, "")}` : urlQuery
  );
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [hasCommittedSearch, setHasCommittedSearch] = useState<boolean>(() =>
    Boolean(urlTag || urlQuery)
  );
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [filterSubView, setFilterSubView] = useState<"root" | "date" | "profile">("root");
  const [dateFilter, setDateFilter] = useState<"any" | "24h" | "7d" | "30d">("any");
  const [fromMeOnly, setFromMeOnly] = useState(false);
  const [fromProfileUid, setFromProfileUid] = useState<string>("");
  const [fromProfileHandle, setFromProfileHandle] = useState<string>("");
  const [profilePickerQuery, setProfilePickerQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(
    () => auth.currentUser
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const filterPopoverRef = useRef<HTMLDivElement | null>(null);

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
    const tagParam = searchParams.get("tag");
    const qParam = searchParams.get("q");
    if (tagParam) {
      setQueryText(`#${tagParam.replace(/^#/, "")}`);
      setHasCommittedSearch(true);
    } else if (qParam) {
      setQueryText(qParam);
      setHasCommittedSearch(true);
    }
  }, [searchParams]);

  useEffect(() => {
    loadAllFeedPosts().then((list) => {
      setPosts(list);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const onDocDown = (ev: MouseEvent) => {
      if (
        showFilterPopover &&
        filterPopoverRef.current &&
        !filterPopoverRef.current.contains(ev.target as Node)
      ) {
        setShowFilterPopover(false);
        setFilterSubView("root");
      }
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [showFilterPopover]);

  const uid = currentUser?.uid;
  const followedIds = useFollowedIds(uid);
  const [authorProfilesMap, setAuthorProfilesMap] = useState<Record<string, any>>({});
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [sharePost, setSharePost] = useState<ScamPost | null>(null);

  useEffect(() => {
    getDocs(collection(db, "users"))
      .then((snap) => {
        const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
        setAllUsers(list);
        const map: Record<string, any> = {};
        list.forEach((u) => {
          map[u.uid] = u;
        });
        setAuthorProfilesMap(map);
      })
      .catch(() => {});
  }, []);

  const suggestedAccounts = React.useMemo(
    () =>
      allUsers
        .filter((u) => u.uid !== uid && (u.displayName || u.shopName || u.username))
        .slice(0, 14),
    [allUsers, uid]
  );

  const handleDeletePost = async (post: ScamPost) => {
    triggerHaptic();
    const ok = await confirm({
      title: "Delete Loop?",
      message:
        "Are you sure you want to permanently delete this post? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "scam_posts", post.id));
    } catch {}
    for (const storageKey of ["deep_scam_posts", "scam_posts_local_v1"]) {
      try {
        const local: ScamPost[] = JSON.parse(
          localStorage.getItem(storageKey) || "[]"
        );
        if (Array.isArray(local)) {
          localStorage.setItem(
            storageKey,
            JSON.stringify(local.filter((p) => p.id !== post.id))
          );
        }
      } catch {}
    }
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    notify("Post deleted", "success");
  };

  const handleToggleLike = async (post: ScamPost) => {
    if (!uid) {
      navigate("/signin");
      return;
    }
    triggerHaptic();
    const nextState = computeNextPostReactionState(
      post,
      uid,
      {
        userName: getSafeDisplayName(currentUser, "Member"),
        userAvatar: currentUser?.photoURL || "",
      },
      "love"
    );
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? ({
              ...p,
              reactions: nextState.reactions,
              reactionsUsers: nextState.reactionsUsers,
              reactionsCount: nextState.reactionsCount,
              votes: nextState.votes,
              votedUserIds: nextState.votedUserIds,
            } as ScamPost)
          : p
      )
    );
    try {
      await updateDoc(doc(db, "scam_posts", post.id), {
        reactions: nextState.reactions,
        reactionsUsers: nextState.reactionsUsers,
        reactionsCount: nextState.reactionsCount,
        votes: nextState.votes,
        votedUserIds: nextState.votedUserIds,
      });
    } catch {}
  };

  const handleToggleRepost = async (post: ScamPost) => {
    if (!uid) {
      navigate("/signin");
      return;
    }
    triggerHaptic();
    const currentList = Array.isArray(post.repostedByUserIds)
      ? post.repostedByUserIds
      : [];
    const already = currentList.includes(uid);
    const nextList = already
      ? currentList.filter((id) => id !== uid)
      : Array.from(new Set([...currentList, uid]));
    const nextCount = already
      ? Math.max(0, Number(post.repostsCount || 1) - 1)
      : Number(post.repostsCount || 0) + 1;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, repostedByUserIds: nextList, repostsCount: nextCount }
          : p
      )
    );
    try {
      await updateDoc(doc(db, "scam_posts", post.id), {
        repostedByUserIds: nextList,
        repostsCount: nextCount,
      });
      notify(already ? "Removed repost" : "Reposted to Loops", "success");
    } catch {}
  };

  const isSaved = (post: ScamPost) =>
    savedIds.includes(post.id) ||
    Boolean(uid && post.savedByUserIds?.includes(uid));

  const handleToggleSaveById = async (postId: string) => {
    const target = posts.find((p) => p.id === postId);
    if (!target) return;
    triggerHaptic();
    const next = await toggleSavePostHelper(target, uid);
    setSavedIds(getSavedPostIdsLocal());
    notify(next ? "Saved to your bookmarks" : "Removed from saved", "info");
  };

  const handleCopyPostLink = async (postId: string) => {
    try {
      await navigator.clipboard.writeText(
        `${getPublicShareOrigin()}/loops/post/${postId}`
      );
      notify("Link copied", "success");
    } catch {
      notify("Unable to copy link", "error");
    }
  };

  const commitSearch = (qVal?: string) => {
    const finalQ = (qVal !== undefined ? qVal : queryText).trim();
    triggerHaptic();
    if (qVal !== undefined) setQueryText(qVal);
    setHasCommittedSearch(true);
    setIsSearchFocused(false);
    setShowFilterPopover(false);
    setFilterSubView("root");
    searchInputRef.current?.blur();
    if (finalQ) {
      setSearchParams({ q: finalQ });
    } else {
      setSearchParams({});
    }
  };

  const hasActiveFilter =
    dateFilter !== "any" || fromMeOnly || Boolean(fromProfileUid);

  // Live Autocomplete Suggestions while typing (IMG_5129)
  const queryPhraseSuggestions = React.useMemo(() => {
    const q = queryText.trim().toLowerCase().replace(/^#/, "");
    if (!q) return [];
    const candidates = new Set<string>();
    candidates.add(queryText.trim());
    posts.forEach((p) => {
      if (p.postTag && p.postTag.toLowerCase().includes(q)) {
        candidates.add(p.postTag.trim());
      }
      const tags = extractHashtagsFromText(`${p.title || ""} ${p.description || ""}`);
      tags.forEach((t) => {
        if (t.toLowerCase().includes(q)) candidates.add(t);
      });
      const rawTitle = (p.title || "").trim();
      if (rawTitle && rawTitle.toLowerCase().includes(q)) {
        const cleanTitle = rawTitle.replace(/\s+/g, " ").slice(0, 36).trim();
        if (cleanTitle) candidates.add(cleanTitle.toLowerCase());
      }
    });
    return Array.from(candidates).slice(0, 3);
  }, [queryText, posts]);

  const matchingUserSuggestions = React.useMemo(() => {
    const q = queryText.trim().toLowerCase().replace(/^@/, "");
    if (!q) return [];
    return allUsers
      .filter((u) => {
        const handle = (getSafePublicUsername(u) || "").toLowerCase();
        const dName = (getSafeDisplayName(u, "") || u.shopName || "").toLowerCase();
        return handle.includes(q) || dName.includes(q);
      })
      .slice(0, 10);
  }, [queryText, allUsers]);

  const savedPosts = React.useMemo(
    () => posts.filter((p) => isSaved(p)),
    [posts, savedIds, uid]
  );

  const searchResultPosts = React.useMemo(() => {
    const now = Date.now();
    return posts.filter((p) => {
      if (fromMeOnly && (!uid || p.reporterId !== uid)) return false;
      if (fromProfileUid && p.reporterId !== fromProfileUid) return false;
      if (dateFilter !== "any") {
        const createdMs =
          typeof p.createdAt === "number"
            ? p.createdAt
            : p.createdAt
            ? new Date(p.createdAt as any).getTime() || 0
            : 0;
        const maxAge =
          dateFilter === "24h"
            ? 24 * 60 * 60 * 1000
            : dateFilter === "7d"
            ? 7 * 24 * 60 * 60 * 1000
            : 30 * 24 * 60 * 60 * 1000;
        if (!createdMs || now - createdMs > maxAge) return false;
      }

      const trimmed = queryText.trim();
      if (!trimmed) return hasActiveFilter;

      if (trimmed.startsWith("#")) {
        const targetTag = trimmed.slice(1).toLowerCase();
        if (!targetTag) return true;
        const postTags = extractHashtagsFromText(
          `${p.title || ""} ${p.description || ""}`
        );
        const topicMatch = p.postTag?.toLowerCase().includes(targetTag);
        return (
          Boolean(topicMatch) ||
          postTags.some((t) => t === targetTag || t.includes(targetTag)) ||
          (p.themes || []).some((th) => th.toLowerCase() === targetTag)
        );
      }

      const q = trimmed.toLowerCase();
      return (
        p.title?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.reporterName?.toLowerCase().includes(q) ||
        p.postTag?.toLowerCase().includes(q) ||
        p.scamLocation?.toLowerCase().includes(q) ||
        p.scammerName?.toLowerCase().includes(q) ||
        p.scammerPhone?.toLowerCase().includes(q)
      );
    });
  }, [posts, queryText, dateFilter, fromMeOnly, fromProfileUid, uid, hasActiveFilter]);

  const renderPostStream = (streamPosts: ScamPost[], emptyTitle: string, emptySub: string) => {
    if (loading) {
      return (
        <div className="py-14 text-center text-sm text-zinc-500">
          Loading loops...
        </div>
      );
    }
    if (streamPosts.length === 0) {
      return (
        <div className="py-16 px-6 text-center space-y-2">
          <Bookmark className="w-7 h-7 text-zinc-400 mx-auto" />
          <p className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
            {emptyTitle}
          </p>
          <p className="text-xs text-zinc-500">{emptySub}</p>
        </div>
      );
    }
    return (
      <div className="loops-surface rounded-none sm:border loops-divider overflow-hidden">
        {streamPosts.map((post) => {
          const canManage = Boolean(
            (uid &&
              (post.reporterId === uid || (post as any).authorId === uid)) ||
              isAdmin
          );
          return (
            <LoopPostCard
              key={post.id}
              post={post}
              authorProfile={
                post.reporterId ? authorProfilesMap[post.reporterId] : null
              }
              currentUser={currentUser as any}
              isFollowingAuthor={Boolean(
                post.reporterId && followedIds.includes(post.reporterId)
              )}
              isSaved={isSaved(post)}
              canManage={canManage}
              onToggleLike={handleToggleLike}
              onToggleRepost={handleToggleRepost}
              onOpenShare={(p) => setSharePost(p)}
              onToggleSave={handleToggleSaveById}
              onCopyLink={handleCopyPostLink}
              onEditPost={(p) => navigate(`/loops/edit/${p.id}`)}
              onDeletePost={handleDeletePost}
              onRequireAuth={() => navigate("/signin")}
            />
          );
        })}
      </div>
    );
  };

  // STANDALONE SAVED PAGE (/loops/saved)
  if (isSavedRoute) {
    return (
      <div className="min-h-screen loops-surface text-zinc-900 dark:text-zinc-100 pb-28">
        <SEO title="Saved — Loops" description="View your saved community loops." />
        <div className="max-w-[620px] mx-auto pt-3 sm:pt-5">
          <header className="flex items-center gap-2 px-4 pb-3 border-b loops-divider">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-9 h-9 -ml-2 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] flex items-center justify-center cursor-pointer shrink-0 transition"
              aria-label="Back"
            >
              <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
            </button>
            <h1 className="text-[22px] font-bold tracking-tight">Saved</h1>
          </header>

          <div className="px-0 sm:px-4 sm:pt-3">
            {renderPostStream(
              savedPosts,
              "No saved loops yet",
              "Save any loop from its menu to keep it bookmarked here."
            )}
          </div>
        </div>

        <LiquidGlassShareModal
          isOpen={Boolean(sharePost)}
          post={sharePost || {}}
          onClose={() => setSharePost(null)}
          onRepost={() => {
            if (sharePost) handleToggleRepost(sharePost);
          }}
          onQuotePost={() => {
            if (sharePost) navigate(`/loops/create?quotePostId=${sharePost.id}`);
          }}
        />
        <NewsBottomDock />
      </div>
    );
  }

  // DEDICATED SEARCH PAGE (/loops/search) — Matches IMG_5128, IMG_5129, IMG_5130
  const isCompactMode =
    isSearchFocused ||
    Boolean(queryText.trim()) ||
    hasCommittedSearch ||
    showFilterPopover ||
    hasActiveFilter;

  const showLiveAutocomplete =
    !hasCommittedSearch && (isSearchFocused || Boolean(queryText.trim()));

  return (
    <div className="min-h-screen loops-surface text-zinc-900 dark:text-zinc-100 pb-28">
      <SEO title="Search — Loops" description="Search people, topics, and loops." />

      <div className="max-w-[620px] mx-auto pt-3 sm:pt-5">
        {!isCompactMode ? (
          /* IDLE HEADER + SEARCH BAR (IMG_5128) */
          <div className="px-4 space-y-3.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigate("/loops")}
                className="w-9 h-9 -ml-2 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Back to Loops"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
              </button>
              <h1 className="text-[28px] font-bold tracking-tight leading-none">
                Search
              </h1>
            </div>

            <div
              onClick={() => {
                setIsSearchFocused(true);
                setTimeout(() => searchInputRef.current?.focus(), 20);
              }}
              className="loops-search-pill h-11 rounded-[16px] px-3.5 flex items-center gap-2.5 cursor-text"
            >
              <Search className="w-[18px] h-[18px] text-zinc-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={queryText}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => {
                  setQueryText(e.target.value);
                  setHasCommittedSearch(false);
                }}
                placeholder="Search"
                className="flex-1 text-[16px] placeholder-zinc-400 outline-none border-none bg-transparent"
              />
            </div>
          </div>
        ) : (
          /* COMPACT FOCUSED / TYPING / RESULTS HEADER (IMG_5129 & IMG_5130) */
          <div className="px-3.5 relative z-30" ref={filterPopoverRef}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                commitSearch();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  if (hasCommittedSearch || queryText || hasActiveFilter) {
                    setQueryText("");
                    setHasCommittedSearch(false);
                    setIsSearchFocused(false);
                    setShowFilterPopover(false);
                    setDateFilter("any");
                    setFromMeOnly(false);
                    setFromProfileUid("");
                    setFromProfileHandle("");
                    setSearchParams({});
                  } else {
                    setIsSearchFocused(false);
                    navigate("/loops");
                  }
                }}
                className="w-9 h-9 -ml-1 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Back"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
              </button>

              <div className="loops-search-pill flex-1 h-11 rounded-[18px] pl-3.5 pr-2 flex items-center gap-2">
                <Search className="w-[18px] h-[18px] text-zinc-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={queryText}
                  onFocus={() => {
                    setIsSearchFocused(true);
                    if (hasCommittedSearch) setHasCommittedSearch(false);
                  }}
                  onChange={(e) => {
                    setQueryText(e.target.value);
                    setHasCommittedSearch(false);
                  }}
                  placeholder="Search"
                  className="flex-1 min-w-0 text-[16px] placeholder-zinc-400 outline-none border-none bg-transparent"
                />
                {queryText && (
                  <button
                    type="button"
                    onClick={() => {
                      setQueryText("");
                      setHasCommittedSearch(false);
                      searchInputRef.current?.focus();
                    }}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 cursor-pointer shrink-0"
                    aria-label="Clear query"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {/* Right-side Filter Sliders Icon matching IMG_5129 */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setShowFilterPopover((v) => !v);
                    setFilterSubView("root");
                  }}
                  className={`w-8 h-8 rounded-[10px] flex items-center justify-center cursor-pointer shrink-0 transition ${
                    hasActiveFilter || showFilterPopover
                      ? "text-zinc-950 dark:text-white bg-black/[0.06] dark:bg-white/[0.1]"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800"
                  }`}
                  aria-label="Search filters"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-[21px] h-[21px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
                    <line x1="9.5" y1="7.5" x2="9.5" y2="16.5" />
                    <line x1="7.7" y1="10.5" x2="11.3" y2="10.5" />
                    <line x1="14.5" y1="7.5" x2="14.5" y2="16.5" />
                    <line x1="12.7" y1="13.5" x2="16.3" y2="13.5" />
                  </svg>
                </button>
              </div>
            </form>

            {/* FLOATING FILTER POPOVER (IMG_5130) */}
            <AnimatePresence>
              {showFilterPopover && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -6 }}
                  transition={{ duration: 0.16 }}
                  className="loops-liquid-popover absolute right-3.5 top-12 w-[262px] rounded-[26px] overflow-hidden z-50 shadow-2xl"
                >
                  {filterSubView === "root" && (
                    <div className="py-2">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          setFilterSubView("date");
                        }}
                        className="w-full px-5 py-3.5 flex items-center justify-between text-[16px] font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer transition"
                      >
                        <span className="flex items-center gap-3.5">
                          <Calendar className="w-[20px] h-[20px] stroke-[1.9]" />
                          <span>
                            {dateFilter === "any"
                              ? "Date"
                              : dateFilter === "24h"
                              ? "Last 24 hours"
                              : dateFilter === "7d"
                              ? "Past 7 days"
                              : "Past 30 days"}
                          </span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-zinc-500 stroke-[2.2]" />
                      </button>

                      <div className="mx-5 my-1 border-t loops-divider" />

                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          if (!uid) {
                            navigate("/signin");
                            return;
                          }
                          setFromMeOnly(true);
                          setFromProfileUid("");
                          setFromProfileHandle("");
                          setHasCommittedSearch(true);
                          setIsSearchFocused(false);
                          setShowFilterPopover(false);
                        }}
                        className="w-full px-5 py-3.5 flex items-center justify-between text-[16px] font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer transition"
                      >
                        <span className="flex items-center gap-3.5">
                          <svg
                            viewBox="0 0 24 24"
                            className="w-[20px] h-[20px]"
                            fill="currentColor"
                          >
                            <circle cx="12" cy="8" r="4" />
                            <path d="M4.5 19.5c0-3.6 3.3-6 7.5-6s7.5 2.4 7.5 6a.8.8 0 0 1-.8.8H5.3a.8.8 0 0 1-.8-.8Z" />
                          </svg>
                          <span>From me</span>
                        </span>
                        {fromMeOnly && <Check className="w-4 h-4 text-[#0095F6]" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          setFilterSubView("profile");
                        }}
                        className="w-full px-5 py-3.5 flex items-center justify-between text-[16px] font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer transition"
                      >
                        <span className="flex items-center gap-3.5">
                          <User className="w-[20px] h-[20px] stroke-[1.9]" />
                          <span className="truncate">
                            {fromProfileHandle ? `@${fromProfileHandle}` : "From profile"}
                          </span>
                        </span>
                      </button>
                    </div>
                  )}

                  {filterSubView === "date" && (
                    <div className="py-2">
                      <div className="px-4 py-2 flex items-center gap-2 border-b loops-divider">
                        <button
                          type="button"
                          onClick={() => setFilterSubView("root")}
                          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-semibold">Date</span>
                      </div>
                      {(
                        [
                          { id: "any", label: "Any date" },
                          { id: "24h", label: "Last 24 hours" },
                          { id: "7d", label: "Past 7 days" },
                          { id: "30d", label: "Past 30 days" },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setDateFilter(opt.id);
                            setHasCommittedSearch(true);
                            setIsSearchFocused(false);
                            setShowFilterPopover(false);
                            setFilterSubView("root");
                          }}
                          className="w-full px-5 py-3 flex items-center justify-between text-[15px] font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
                        >
                          <span>{opt.label}</span>
                          {dateFilter === opt.id && (
                            <Check className="w-4 h-4 text-[#0095F6]" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {filterSubView === "profile" && (
                    <div className="py-2 max-h-72 flex flex-col">
                      <div className="px-3.5 py-2 flex items-center gap-2 border-b loops-divider">
                        <button
                          type="button"
                          onClick={() => setFilterSubView("root")}
                          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer shrink-0"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <input
                          type="text"
                          value={profilePickerQuery}
                          onChange={(e) => setProfilePickerQuery(e.target.value)}
                          placeholder="Filter @username..."
                          className="ds-liquid-input flex-1 text-sm bg-transparent outline-none"
                        />
                      </div>
                      <div className="overflow-y-auto divide-y loops-divider">
                        {allUsers
                          .filter((u) => {
                            const h = (getSafePublicUsername(u) || "").toLowerCase();
                            const n = (getSafeDisplayName(u, "") || "").toLowerCase();
                            const pq = profilePickerQuery.trim().toLowerCase();
                            return !pq || h.includes(pq) || n.includes(pq);
                          })
                          .slice(0, 12)
                          .map((u) => {
                            const h = getSafePublicUsername(u) || "member";
                            const n = getSafeDisplayName(u, h);
                            const av = u.photoURL || u.shopLogo || "";
                            return (
                              <button
                                key={u.uid}
                                type="button"
                                onClick={() => {
                                  triggerHaptic();
                                  setFromProfileUid(u.uid);
                                  setFromProfileHandle(h);
                                  setFromMeOnly(false);
                                  setHasCommittedSearch(true);
                                  setIsSearchFocused(false);
                                  setShowFilterPopover(false);
                                  setFilterSubView("root");
                                }}
                                className="w-full px-4 py-2.5 flex items-center gap-2.5 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
                              >
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0">
                                  {av ? (
                                    <img
                                      src={av}
                                      alt={n}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                                      {n.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold truncate">{h}</p>
                                  <p className="text-[11px] text-zinc-500 truncate">{n}</p>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* VIEW BODY: 1) IDLE FOLLOW SUGGESTIONS (IMG_5128), 2) LIVE AUTOCOMPLETE (IMG_5129), OR 3) COMMITTED POST RESULTS */}
        {!isCompactMode ? (
          <div className="pt-4">
            <h2 className="px-4 pb-2 text-[15px] font-semibold text-zinc-400 dark:text-zinc-500">
              Follow suggestions
            </h2>
            <div className="divide-y loops-divider">
              {suggestedAccounts.map((account) => {
                const isFollowing = Boolean(
                  account.uid && followedIds.includes(account.uid)
                );
                const handle = getSafePublicUsername(account) || "creator";
                const name = getSafeDisplayName(account, handle);
                const avatar = account.photoURL || account.shopLogo || "";
                const isVerified = Boolean(
                  account.isVerifiedBadge ||
                    account.kycStatus === "approved" ||
                    account.role === "admin"
                );
                const fCount = getEffectiveFollowersCount(account);

                return (
                  <div
                    key={account.uid}
                    onClick={() => navigate(`/loops/profile/${account.uid}`)}
                    className="flex items-start justify-between gap-3 px-4 py-3.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] cursor-pointer transition"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0 mt-0.5">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-zinc-600 dark:text-zinc-300">
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-[15px] text-zinc-950 dark:text-white truncate">
                            {handle}
                          </span>
                          {isVerified && (
                            <VerifiedLoopBadge className="w-3.5 h-3.5 shrink-0" />
                          )}
                        </div>
                        <p className="text-[14.5px] text-zinc-400 dark:text-zinc-500 truncate leading-snug">
                          {name}
                        </p>
                        <p className="mt-1.5 text-[14.5px] font-normal text-zinc-950 dark:text-zinc-100 tabular-nums">
                          {formatCompactNumber(fCount)} followers
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        triggerHaptic();
                        if (!uid) {
                          navigate("/signin");
                          return;
                        }
                        await toggleFollowUser({
                          targetUid: account.uid,
                          targetName: name,
                          currentUser: currentUser as any,
                          currentlyFollowing: isFollowing,
                        });
                      }}
                      className={`mt-0.5 min-w-[104px] h-9 px-5 rounded-[11px] text-[14px] font-semibold transition cursor-pointer shrink-0 whitespace-nowrap ${
                        isFollowing
                          ? "bg-transparent text-zinc-900 dark:text-zinc-100 border loops-divider"
                          : "bg-black dark:bg-white text-white dark:text-black hover:opacity-90"
                      }`}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : showLiveAutocomplete ? (
          /* LIVE AUTOCOMPLETE VIEW (IMG_5129) */
          <div className="pt-2">
            {queryText.trim() ? (
              <div className="space-y-0.5">
                {/* 1. Magnifying Glass Query Suggestion Rows */}
                {queryPhraseSuggestions.map((phrase) => {
                  const rawTyped = queryText.trim();
                  const lowerPhrase = phrase.toLowerCase();
                  const lowerTyped = rawTyped.toLowerCase();
                  const startsWithTyped = lowerPhrase.startsWith(lowerTyped);

                  return (
                    <button
                      key={`q_${phrase}`}
                      type="button"
                      onClick={() => commitSearch(phrase)}
                      className="w-full px-4 py-2.5 flex items-center gap-3.5 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04] cursor-pointer transition"
                    >
                      <div className="loops-search-icon-circle w-11 h-11 rounded-full flex items-center justify-center shrink-0">
                        <Search className="w-5 h-5 stroke-[1.9]" />
                      </div>
                      <span className="text-[16px] text-zinc-950 dark:text-zinc-100 truncate">
                        {startsWithTyped ? (
                          <>
                            <strong className="font-bold">
                              {phrase.slice(0, rawTyped.length)}
                            </strong>
                            <span className="font-normal">
                              {phrase.slice(rawTyped.length)}
                            </span>
                          </>
                        ) : (
                          <span className="font-medium">{phrase}</span>
                        )}
                      </span>
                    </button>
                  );
                })}

                {/* 2. Topic Community Row (<Query> Loops  Community) */}
                <button
                  type="button"
                  onClick={() =>
                    commitSearch(`#${queryText.trim().replace(/^#/, "")}`)
                  }
                  className="w-full px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] cursor-pointer transition"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="loops-search-icon-circle w-11 h-11 rounded-full flex items-center justify-center shrink-0">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-5 h-5 text-[#0095F6]"
                        fill="currentColor"
                      >
                        <circle cx="8" cy="13" r="3" />
                        <circle cx="15" cy="8.5" r="2.6" />
                        <circle cx="14.5" cy="15.8" r="2.2" />
                      </svg>
                    </div>
                    <span className="text-[16px] text-[#0095F6] truncate">
                      <strong className="font-bold">
                        {queryText.trim().replace(/^#/, "").toUpperCase()}
                      </strong>{" "}
                      <span className="font-normal">Loops</span>
                    </span>
                  </div>
                  <span className="text-[15px] text-zinc-400 dark:text-zinc-500 shrink-0">
                    Community
                  </span>
                </button>

                {/* 3. Matching User Profile Rows */}
                {matchingUserSuggestions.map((account) => {
                  const handle = getSafePublicUsername(account) || "creator";
                  const name = getSafeDisplayName(account, handle);
                  const avatar = account.photoURL || account.shopLogo || "";
                  const isVerified = Boolean(
                    account.isVerifiedBadge ||
                      account.kycStatus === "approved" ||
                      account.role === "admin"
                  );

                  return (
                    <button
                      key={`u_${account.uid}`}
                      type="button"
                      onClick={() => navigate(`/loops/profile/${account.uid}`)}
                      className="w-full px-4 py-2.5 flex items-center gap-3.5 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04] cursor-pointer transition"
                    >
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-zinc-600 dark:text-zinc-300">
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[15.5px] font-semibold text-zinc-950 dark:text-white truncate">
                            {handle}
                          </span>
                          {isVerified && (
                            <VerifiedLoopBadge className="w-3.5 h-3.5 shrink-0" />
                          )}
                        </div>
                        <p className="text-[14.5px] text-zinc-400 dark:text-zinc-500 truncate">
                          {name}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Focused with empty text: show Follow suggestions cleanly without posts */
              <div className="pt-3">
                <h2 className="px-4 pb-2 text-[15px] font-semibold text-zinc-400 dark:text-zinc-500">
                  Follow suggestions
                </h2>
                <div className="divide-y loops-divider">
                  {suggestedAccounts.slice(0, 8).map((account) => {
                    const handle = getSafePublicUsername(account) || "creator";
                    const name = getSafeDisplayName(account, handle);
                    const avatar = account.photoURL || account.shopLogo || "";
                    const isVerified = Boolean(
                      account.isVerifiedBadge ||
                        account.kycStatus === "approved" ||
                        account.role === "admin"
                    );
                    return (
                      <button
                        key={account.uid}
                        type="button"
                        onClick={() => navigate(`/loops/profile/${account.uid}`)}
                        className="w-full px-4 py-3 flex items-center gap-3.5 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03] cursor-pointer"
                      >
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0">
                          {avatar ? (
                            <img
                              src={avatar}
                              alt={name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold">
                              {name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[15px] font-semibold truncate">
                              {handle}
                            </span>
                            {isVerified && (
                              <VerifiedLoopBadge className="w-3.5 h-3.5 shrink-0" />
                            )}
                          </div>
                          <p className="text-[14px] text-zinc-400 truncate">
                            {name}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* COMMITTED SEARCH RESULTS STREAM */
          <div className="pt-3 space-y-2">
            {hasActiveFilter && (
              <div className="px-4 flex items-center gap-2 flex-wrap">
                {dateFilter !== "any" && (
                  <button
                    type="button"
                    onClick={() => setDateFilter("any")}
                    className="px-3 py-1 rounded-full border loops-divider text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>
                      {dateFilter === "24h"
                        ? "Last 24h"
                        : dateFilter === "7d"
                        ? "Past 7d"
                        : "Past 30d"}
                    </span>
                    <X className="w-3 h-3" />
                  </button>
                )}
                {fromMeOnly && (
                  <button
                    type="button"
                    onClick={() => setFromMeOnly(false)}
                    className="px-3 py-1 rounded-full border loops-divider text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>From me</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
                {fromProfileUid && (
                  <button
                    type="button"
                    onClick={() => {
                      setFromProfileUid("");
                      setFromProfileHandle("");
                    }}
                    className="px-3 py-1 rounded-full border loops-divider text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>@{fromProfileHandle}</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            <div className="px-0 sm:px-4">
              {renderPostStream(
                searchResultPosts,
                queryText.trim()
                  ? `No loops found for "${queryText.trim()}"`
                  : "No matching loops",
                "Try another search phrase, @username, or adjust your filter."
              )}
            </div>
          </div>
        )}
      </div>

      <LiquidGlassShareModal
        isOpen={Boolean(sharePost)}
        post={sharePost || {}}
        onClose={() => setSharePost(null)}
        onRepost={() => {
          if (sharePost) handleToggleRepost(sharePost);
        }}
        onQuotePost={() => {
          if (sharePost) navigate(`/loops/create?quotePostId=${sharePost.id}`);
        }}
      />

      <NewsBottomDock />
    </div>
  );
};

/* ============================================================================
 * 4. DEDICATED STORY VIEWER PAGE (/loops/story/:storyId) — 1:1 IMG_5131–IMG_5136
 * ========================================================================== */
const STORY_TTL_MS = 24 * 60 * 60 * 1000;

const formatCompactStoryAge = (createdAtMs?: number): string => {
  if (!createdAtMs || createdAtMs <= 0) return "1h";
  const diffSec = Math.max(1, Math.floor((Date.now() - createdAtMs) / 1000));
  if (diffSec < 60) return "now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
};

export const NewsStoryViewerPage: React.FC = () => {
  const { storyId } = useParams<{ storyId: string }>();
  const [searchParams] = useSearchParams();
  const highlightIdParam = searchParams.get("highlightId") || "";
  const highlightOwnerUid = searchParams.get("uid") || "";

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
  const followedIdsRaw = useFollowedIds(currentUser?.uid);
  const followedIds = useMemo(() => new Set(followedIdsRaw || []), [followedIdsRaw]);

  const [audioMuted, setAudioMuted] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [questionDrafts, setQuestionDrafts] = useState<Record<string, string>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Interactive Popovers & Sheets State
  const [showOwnMorePopover, setShowOwnMorePopover] = useState(false);
  const [showPeerMenuPopover, setShowPeerMenuPopover] = useState(false);
  const [showCommentSheet, setShowCommentSheet] = useState(false);
  const [showMentionSheet, setShowMentionSheet] = useState(false);
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [showDirectSendSheet, setShowDirectSendSheet] = useState(false);
  const [showAboutAccountModal, setShowAboutAccountModal] = useState(false);
  const [showStorySettingsSheet, setShowStorySettingsSheet] = useState(false);

  // Directory & Profile Data for Mentions / Highlights / Activity
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [myHighlights, setMyHighlights] = useState<StoryHighlightItem[]>([]);
  const [authorProfile, setAuthorProfile] = useState<any | null>(null);

  // Viewer Stats Modal States
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [viewerProfiles, setViewerProfiles] = useState<any[]>([]);
  const [ownerFollowers, setOwnerFollowers] = useState<string[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // 2-Finger Pinch-to-Zoom & Pan State
  const [viewerScale, setViewerScale] = useState<number>(1);
  const [viewerOffset, setViewerOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
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

  // Load users list for Mention & Direct Send sheets
  useEffect(() => {
    let cancelled = false;
    getDocs(collection(db, "users"))
      .then((snap) => {
        if (cancelled) return;
        setAllUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Load current user's Highlights so owner can add/create Highlights
  useEffect(() => {
    if (!currentUser?.uid) {
      setMyHighlights([]);
      return;
    }
    const localKey = `deep_story_highlights_${currentUser.uid}`;
    let localItems: StoryHighlightItem[] = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(localKey) || "[]");
      if (Array.isArray(parsed)) localItems = parsed;
    } catch {}
    if (localItems.length > 0) setMyHighlights(localItems);

    const unsub = onSnapshot(
      doc(db, "users", currentUser.uid),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data() || {};
          const remote: StoryHighlightItem[] = Array.isArray(d.storyHighlights)
            ? d.storyHighlights
            : [];
          if (remote.length > 0) {
            setMyHighlights(remote);
            try {
              localStorage.setItem(localKey, JSON.stringify(remote));
            } catch {}
          }
        }
      },
      () => {}
    );
    return () => unsub();
  }, [currentUser?.uid]);

  // Load Stories: either permanent Highlight playback OR 24h active Feed playback
  useEffect(() => {
    let mainDocs: Record<string, any> = {};
    let communityDocs: Record<string, any> = {};
    let highlightSnapshots: StoryHighlightSnapshot[] = [];

    const mapDoc = (id: string, data: Record<string, any>) => {
      const createdAtMs =
        typeof data.createdAtMs === "number"
          ? data.createdAtMs
          : data.createdAt
          ? new Date(data.createdAt).getTime() || 0
          : 0;
      return {
        id,
        userId: data.userId || data.sellerId || highlightOwnerUid || "",
        authorName:
          data.userName ||
          data.authorName ||
          data.sellerName ||
          data.category ||
          "Creator",
        authorUsername: data.userUsername || data.username || "",
        avatar:
          data.userAvatar ||
          data.avatar ||
          data.sellerLogo ||
          data.sellerAvatar ||
          "",
        mediaUrl: data.mediaUrl || data.imageUrl || "",
        mediaType: data.mediaType || data.type || "image",
        linkUrl: data.linkUrl || "",
        caption: data.caption || "",
        songTitle: data.songTitle || "",
        music: data.music || null,
        textLayers: Array.isArray(data.textLayers) ? data.textLayers : [],
        stickers: Array.isArray(data.stickers) ? data.stickers : [],
        aiLabel: Boolean(data.aiLabel || data.isAiGenerated),
        allowCommenting: data.allowCommenting !== false,
        isArchived: Boolean(data.isArchived),
        isCloseFriends: Boolean(data.isCloseFriends),
        closeFriendIds: Array.isArray(data.closeFriendIds)
          ? data.closeFriendIds
          : [],
        isBoomerang: Boolean(data.isBoomerang),
        pollVotes: data.pollVotes || {},
        sliderVotes: data.sliderVotes || {},
        likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
        viewedBy: Array.isArray(data.viewedBy) ? data.viewedBy : [],
        storyReplies: Array.isArray(data.storyReplies) ? data.storyReplies : [],
        createdAtMs,
        createdAtLabel: data.createdAt
          ? formatDhakaDateTime(data.createdAt)
          : "Recent",
        ageShort: formatCompactStoryAge(createdAtMs),
      };
    };

    const emitMerged = () => {
      const merged = new Map<string, any>();
      Object.entries(mainDocs).forEach(([id, raw]) => {
        merged.set(id, mapDoc(id, raw));
      });
      Object.entries(communityDocs).forEach(([id, raw]) => {
        const existingRaw = mainDocs[id] || {};
        merged.set(id, mapDoc(id, { ...existingRaw, ...raw }));
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

      // HIGHLIGHT PLAYBACK MODE: Plays permanent highlighted stories even after 24h feed expiry!
      if (highlightIdParam) {
        const hlItems: any[] = [];
        highlightSnapshots.forEach((snapItem) => {
          const live = merged.get(snapItem.id);
          if (live) {
            hlItems.push({
              ...mapDoc(snapItem.id, snapItem as any),
              ...live,
              mediaUrl: live.mediaUrl || snapItem.mediaUrl,
            });
          } else {
            hlItems.push(mapDoc(snapItem.id, snapItem as any));
          }
        });
        setStories(hlItems);
        setLoading(false);
        return;
      }

      // NORMAL FEED PLAYBACK MODE: Enforce 24-hour expiry & hide archived stories
      const now = Date.now();
      const uid = auth.currentUser?.uid || "";
      const isAdm = hasImmediateAdminOrStaffRole(null, auth.currentUser);
      const visible = Array.from(merged.values())
        .filter((s) => {
          if (!s.mediaUrl) return false;
          if (s.isArchived) return false;
          if (s.createdAtMs > 0 && now - s.createdAtMs > STORY_TTL_MS) {
            return false;
          }
          if (s.isCloseFriends && s.closeFriendIds.length > 0) {
            return isAdm || s.userId === uid || s.closeFriendIds.includes(uid);
          }
          return true;
        })
        .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));

      const userGroups = new Map<string, any[]>();
      visible.forEach((s) => {
        const groupKey = s.userId || s.id;
        if (!userGroups.has(groupKey)) userGroups.set(groupKey, []);
        userGroups.get(groupKey)!.push(s);
      });

      for (const [, groupStories] of userGroups.entries()) {
        groupStories.sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
      }

      setStories(Array.from(userGroups.values()).flat());
      setLoading(false);
    };

    const loadHighlightIfNeeded = async () => {
      if (!highlightIdParam) return;
      const targetUid = highlightOwnerUid || auth.currentUser?.uid || "";
      let foundHl: StoryHighlightItem | undefined;

      if (targetUid) {
        try {
          const localRaw = localStorage.getItem(
            `deep_story_highlights_${targetUid}`
          );
          if (localRaw) {
            const parsed: StoryHighlightItem[] = JSON.parse(localRaw);
            foundHl = parsed.find((h) => h.id === highlightIdParam);
          }
        } catch {}

        try {
          const uSnap = await getDoc(doc(db, "users", targetUid));
          if (uSnap.exists()) {
            const remoteHls: StoryHighlightItem[] = Array.isArray(
              uSnap.data()?.storyHighlights
            )
              ? uSnap.data()!.storyHighlights
              : [];
            const remoteMatch = remoteHls.find((h) => h.id === highlightIdParam);
            if (remoteMatch) foundHl = remoteMatch;
          }
        } catch {}
      }

      if (foundHl) {
        if (Array.isArray(foundHl.storiesSnapshot) && foundHl.storiesSnapshot.length > 0) {
          highlightSnapshots = foundHl.storiesSnapshot;
        } else if (Array.isArray(foundHl.storyIds)) {
          highlightSnapshots = foundHl.storyIds.map((sid) => ({
            id: sid,
            userId: targetUid,
            authorName: "Creator",
            avatar: "",
            mediaUrl: foundHl?.coverImage || "",
            mediaType: "image",
            createdAtMs: foundHl?.createdAt || Date.now(),
          }));
        }
      }
      emitMerged();
    };

    loadHighlightIfNeeded();

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
  }, [highlightIdParam, highlightOwnerUid]);

  useEffect(() => {
    if (!storyId || stories.length === 0) return;
    const foundIdx = stories.findIndex((s) => s.id === storyId);
    if (foundIdx >= 0) setActiveIdx(foundIdx);
  }, [storyId, stories.length]);

  useEffect(() => {
    if (activeIdx >= stories.length && stories.length > 0) {
      setActiveIdx(stories.length - 1);
    }
  }, [stories.length, activeIdx]);

  // Load active story author's profile for exact username & About Account modal
  useEffect(() => {
    if (!story?.userId) {
      setAuthorProfile(null);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, "users", story.userId))
      .then((snap) => {
        if (!cancelled && snap.exists()) {
          setAuthorProfile({ uid: snap.id, ...snap.data() });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [story?.userId]);

  // Record story view
  useEffect(() => {
    if (!story || !currentUser?.uid) return;
    if (story.userId === currentUser.uid) return;

    const recordView = async () => {
      try {
        if (story.viewedBy?.includes(currentUser.uid)) return;
        const payload = { viewedBy: arrayUnion(currentUser.uid) };
        await Promise.all([
          updateDoc(doc(db, "stories", story.id), payload).catch(() => {}),
          updateDoc(doc(db, "creator_videos", story.id), payload).catch(() => {}),
        ]);
      } catch {}
    };

    recordView();
  }, [story?.id, currentUser?.uid]);

  // Fetch owner's followers & viewer avatar previews when viewing own story
  useEffect(() => {
    if (!story || !currentUser?.uid || story.userId !== currentUser.uid) {
      setOwnerFollowers([]);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "users", currentUser.uid),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setOwnerFollowers(Array.isArray(d.followers) ? d.followers : []);
        }
      },
      () => {}
    );

    return () => unsub();
  }, [story?.id, currentUser?.uid]);

  // Preload up to 3 viewer profiles for bottom-left "Activity" overlapping avatars + full stats modal
  useEffect(() => {
    if (!story) return;
    const isMine = Boolean(currentUser?.uid && story.userId === currentUser.uid);
    if (!isMine && !showStatsModal) return;

    const uidsToFetch: string[] = showStatsModal
      ? story.viewedBy || []
      : (story.viewedBy || []).slice(0, 3);

    if (uidsToFetch.length === 0) {
      setViewerProfiles([]);
      return;
    }

    let cancelled = false;
    const fetchProfiles = async () => {
      if (showStatsModal) setIsLoadingStats(true);
      try {
        const loaded: any[] = [];
        for (const uid of uidsToFetch) {
          const cached = allUsers.find((u) => u.uid === uid);
          if (cached) {
            loaded.push(cached);
            continue;
          }
          try {
            const uSnap = await getDoc(doc(db, "users", uid));
            if (uSnap.exists()) {
              loaded.push({ uid: uSnap.id, ...uSnap.data() });
            }
          } catch {}
        }
        if (!cancelled) setViewerProfiles(loaded);
      } finally {
        if (!cancelled) setIsLoadingStats(false);
      }
    };
    fetchProfiles();

    return () => {
      cancelled = true;
    };
  }, [showStatsModal, story?.id, story?.viewedBy?.length, currentUser?.uid, allUsers.length]);

  const isSignedIn = Boolean(currentUser);
  const isOwnStory = Boolean(
    currentUser?.uid && story?.userId && currentUser.uid === story.userId
  );

  // Scoped segments for top progress bar (current author's stories or current highlight's stories)
  const scopedAuthorStories = React.useMemo(() => {
    if (!story) return [];
    if (highlightIdParam) return stories;
    return stories.filter((s) => s.userId === story.userId);
  }, [stories, story, highlightIdParam]);

  const scopedActiveIdx = React.useMemo(() => {
    if (!story) return 0;
    const idx = scopedAuthorStories.findIndex((s) => s.id === story.id);
    return idx >= 0 ? idx : 0;
  }, [scopedAuthorStories, story]);

  useEffect(() => {
    setViewerScale(1);
    setViewerOffset({ x: 0, y: 0 });
    viewerPinchRef.current = null;
    setShowOwnMorePopover(false);
    setShowPeerMenuPopover(false);
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
      const {
        initialDist,
        initialScale,
        initialMidX,
        initialMidY,
        initialOffsetX,
        initialOffsetY,
      } = viewerPinchRef.current;
      const nextScale = Math.min(
        4,
        Math.max(0.5, initialScale * (dist / initialDist))
      );
      setViewerScale(nextScale);
      setViewerOffset({
        x: initialOffsetX + (midX - initialMidX),
        y: initialOffsetY + (midY - initialMidY),
      });
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

  const handleCloseViewer = () => {
    triggerHaptic();
    if (highlightIdParam && highlightOwnerUid) {
      navigate(`/loops/profile/${highlightOwnerUid}`);
    } else {
      navigate("/loops");
    }
  };

  const handleDeleteCurrentStory = async () => {
    if (!story) return;
    const ok = await confirm({
      title: "Delete Story",
      message: "Remove this story permanently?",
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
      handleCloseViewer();
    } catch {
      notify("Could not delete story.", "error");
    }
  };

  const handleArchiveStory = async () => {
    if (!story) return;
    triggerHaptic();
    try {
      await Promise.all([
        updateDoc(doc(db, "stories", story.id), { isArchived: true }).catch(
          () => {}
        ),
        setDoc(
          doc(db, "creator_videos", story.id),
          { isArchived: true },
          { merge: true }
        ).catch(() => {}),
      ]);
      try {
        const prevLocal = JSON.parse(
          localStorage.getItem("deep_news_stories_local") || "[]"
        );
        if (Array.isArray(prevLocal)) {
          localStorage.setItem(
            "deep_news_stories_local",
            JSON.stringify(
              prevLocal.map((x: any) =>
                x?.id === story.id ? { ...x, isArchived: true } : x
              )
            )
          );
        }
      } catch {}
      notify("Story archived.", "success");
      if (stories.length <= 1) {
        handleCloseViewer();
      }
    } catch {
      notify("Could not archive story.", "error");
    }
  };

  const buildSnapshotFromCurrentStory = (): StoryHighlightSnapshot | null => {
    if (!story) return null;
    return {
      id: story.id,
      userId: story.userId || currentUser?.uid || "",
      authorName: story.authorName || "Creator",
      avatar: story.avatar || "",
      mediaUrl: story.mediaUrl || "",
      mediaType: story.mediaType || "image",
      caption: story.caption || "",
      songTitle: story.songTitle || "",
      music: story.music || null,
      textLayers: story.textLayers || [],
      stickers: story.stickers || [],
      aiLabel: Boolean(story.aiLabel),
      allowCommenting: story.allowCommenting !== false,
      createdAtMs: story.createdAtMs || Date.now(),
    };
  };

  const persistUserHighlights = async (nextList: StoryHighlightItem[]) => {
    if (!currentUser?.uid) return;
    setMyHighlights(nextList);
    try {
      localStorage.setItem(
        `deep_story_highlights_${currentUser.uid}`,
        JSON.stringify(nextList)
      );
    } catch {}
    await setDoc(
      doc(db, "users", currentUser.uid),
      { storyHighlights: nextList },
      { merge: true }
    ).catch(() => {});
  };

  const handleCreateNewHighlight = async (title: string) => {
    const snapItem = buildSnapshotFromCurrentStory();
    if (!snapItem || !currentUser?.uid) return;
    triggerHaptic();
    const newItem: StoryHighlightItem = {
      id: `hl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim().toUpperCase(),
      coverImage: story?.mediaUrl || "",
      storyIds: [snapItem.id],
      storiesSnapshot: [snapItem],
      createdAt: Date.now(),
    };
    const nextList = [...myHighlights, newItem];
    await persistUserHighlights(nextList);
    notify(`Added to "${newItem.title}" highlight!`, "success");
  };

  const handleAddToExistingHighlight = async (hlId: string) => {
    const snapItem = buildSnapshotFromCurrentStory();
    if (!snapItem || !currentUser?.uid) return;
    triggerHaptic();
    const nextList = myHighlights.map((hl) => {
      if (hl.id !== hlId) return hl;
      const exists = hl.storyIds?.includes(snapItem.id);
      if (exists) return hl;
      const nextSnaps = [...(hl.storiesSnapshot || []), snapItem];
      return {
        ...hl,
        storyIds: [...(hl.storyIds || []), snapItem.id],
        storiesSnapshot: nextSnaps,
      };
    });
    await persistUserHighlights(nextList);
    notify("Saved to profile highlight!", "success");
  };

  const handleSaveStoryMedia = async () => {
    if (!story?.mediaUrl) return;
    triggerHaptic();
    try {
      if (story.mediaType === "image") {
        await downloadWatermarkedImage(
          story.mediaUrl,
          `loops-story-${story.id}.jpg`
        );
      } else {
        const a = document.createElement("a");
        a.href = story.mediaUrl;
        a.download = `loops-story-${story.id}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      notify("Saved to device.", "success");
    } catch {
      notify("Could not save story media.", "error");
    }
  };

  const handleToggleAiLabel = async () => {
    if (!story) return;
    triggerHaptic();
    const nextVal = !story.aiLabel;
    setStories((prev) =>
      prev.map((s) => (s.id === story.id ? { ...s, aiLabel: nextVal } : s))
    );
    await Promise.all([
      updateDoc(doc(db, "stories", story.id), { aiLabel: nextVal }).catch(
        () => {}
      ),
      setDoc(
        doc(db, "creator_videos", story.id),
        { aiLabel: nextVal },
        { merge: true }
      ).catch(() => {}),
    ]);
    notify(nextVal ? "AI label added." : "AI label removed.", "success");
  };

  const handleToggleStoryCommenting = async () => {
    if (!story) return;
    triggerHaptic();
    const nextVal = !story.allowCommenting;
    setStories((prev) =>
      prev.map((s) =>
        s.id === story.id ? { ...s, allowCommenting: nextVal } : s
      )
    );
    await Promise.all([
      updateDoc(doc(db, "stories", story.id), {
        allowCommenting: nextVal,
      }).catch(() => {}),
      setDoc(
        doc(db, "creator_videos", story.id),
        { allowCommenting: nextVal },
        { merge: true }
      ).catch(() => {}),
    ]);
    notify(
      nextVal ? "Story commenting turned on." : "Story commenting turned off.",
      "success"
    );
  };

  const handleToggleCloseFriends = async () => {
    if (!story) return;
    triggerHaptic();
    const nextVal = !story.isCloseFriends;
    setStories((prev) =>
      prev.map((s) =>
        s.id === story.id ? { ...s, isCloseFriends: nextVal } : s
      )
    );
    await Promise.all([
      updateDoc(doc(db, "stories", story.id), {
        isCloseFriends: nextVal,
      }).catch(() => {}),
      setDoc(
        doc(db, "creator_videos", story.id),
        { isCloseFriends: nextVal },
        { merge: true }
      ).catch(() => {}),
    ]);
    notify(
      nextVal ? "Marked as Close Friends." : "Shared with everyone.",
      "success"
    );
  };

  const handleShareExternal = async () => {
    if (!story) return;
    triggerHaptic();
    const shareUrl = `${getPublicShareOrigin()}/loops/story/${story.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${story.authorName || "Loops"} Story`,
          url: shareUrl,
        });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(shareUrl);
      notify("Story link copied to share!", "success");
    } catch {
      notify("Could not copy story link.", "error");
    }
  };

  const handleConfirmMentions = async (chosenUsers: any[]) => {
    if (!story || !currentUser || chosenUsers.length === 0) return;
    const newStickers: StoryStickerItem[] = chosenUsers.map((u, idx) => ({
      id: `stk_mention_${Date.now()}_${idx}`,
      kind: "mention",
      title: `@${getSafePublicUsername(u) || getSafeDisplayName(u, "member")}`,
      targetUid: u.uid,
    }));
    const updatedStickers = [...(story.stickers || []), ...newStickers];
    setStories((prev) =>
      prev.map((s) =>
        s.id === story.id ? { ...s, stickers: updatedStickers } : s
      )
    );
    await Promise.all([
      updateDoc(doc(db, "stories", story.id), {
        stickers: updatedStickers,
      }).catch(() => {}),
      setDoc(
        doc(db, "creator_videos", story.id),
        { stickers: updatedStickers },
        { merge: true }
      ).catch(() => {}),
    ]);

    for (const u of chosenUsers) {
      if (u.uid && u.uid !== currentUser.uid) {
        await addDoc(collection(db, "news_hub_notifications"), {
          userId: u.uid,
          fromUserId: currentUser.uid,
          fromUserName: getSafeDisplayName(currentUser, "Someone"),
          fromUserUsername: getSafePublicUsername(currentUser),
          fromUserAvatar: currentUser.photoURL || "",
          title: "Story Mention",
          body: "mentioned you in their story.",
          mediaThumbnail: story.mediaUrl || story.avatar || "",
          type: "story",
          link: `/loops/story/${story.id}`,
          read: false,
          isRead: false,
          createdAt: Date.now(),
        }).catch(() => {});
      }
    }
    notify(
      `Mentioned ${chosenUsers.length} ${
        chosenUsers.length === 1 ? "person" : "people"
      }!`,
      "success"
    );
  };

  const handleReportPeerStory = async () => {
    if (!story) return;
    triggerHaptic();
    try {
      await addDoc(collection(db, "scam_reports"), {
        targetType: "story",
        storyId: story.id,
        reportedUserId: story.userId || "",
        reportedBy: currentUser?.uid || "guest",
        reason: "Story reported from viewer",
        createdAt: Date.now(),
      }).catch(() => {});
    } catch {}
    notify("Story reported. Thank you for keeping Loops safe.", "success");
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

  const deliverStoryMessageToUser = async (
    recipientUidInput: string,
    messageText: string,
    storyContextLabel: string
  ) => {
    if (!currentUser?.uid || !story) return;
    let recipientUid = String(recipientUidInput || "").trim();
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

    const summaryPreview = `Story: ${messageText.slice(0, 60)}`;

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
        senderId: story.userId || recipientUid,
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
      if (story.userId) {
        await deliverStoryMessageToUser(
          story.userId,
          answer,
          `Story Q&A (${stk.title || "Question"})`
        ).catch(() => {});
      }
      notify("Response sent!", "success");
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
      if (
        !alreadyLiked &&
        story.userId &&
        story.userId !== currentUser.uid &&
        !actorIsAdmin
      ) {
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
          link: `/loops/story/${story.id}`,
        }).catch(() => {});
      }
    } catch {}
  };

  const submitCommentOrReplyText = async (
    cleanText: string,
    alsoSendDm = true
  ) => {
    if (!story || !cleanText) return;
    if (!currentUser) {
      navigate("/signin");
      return;
    }
    triggerHaptic();
    const replyEntry: StoryReplyItem = {
      uid: currentUser.uid,
      name: getSafeDisplayName(currentUser, "Member"),
      avatar: currentUser.photoURL || "",
      text: cleanText,
      createdAt: Date.now(),
    };

    setStories((prev) =>
      prev.map((s) =>
        s.id === story.id
          ? { ...s, storyReplies: [...(s.storyReplies || []), replyEntry] }
          : s
      )
    );

    try {
      await Promise.all([
        setDoc(
          doc(db, "creator_videos", story.id),
          {
            kind: story.userId ? "news_story" : "story_engagement",
            storyReplies: arrayUnion(replyEntry),
          },
          { merge: true }
        ).catch(() => {}),
        updateDoc(doc(db, "stories", story.id), {
          storyReplies: arrayUnion(replyEntry),
        }).catch(() => {}),
        alsoSendDm && story.userId && story.userId !== currentUser.uid
          ? deliverStoryMessageToUser(
              story.userId,
              cleanText,
              `Replied to ${story.authorName || "your"} story`
            )
          : Promise.resolve(),
      ]);

      const actorIsAdmin = hasImmediateAdminOrStaffRole(null, currentUser);
      if (story.userId && story.userId !== currentUser.uid && !actorIsAdmin) {
        await addDoc(collection(db, "news_hub_notifications"), {
          userId: story.userId,
          fromUserId: currentUser.uid,
          fromUserName: getSafeDisplayName(currentUser, "Someone"),
          fromUserUsername: getSafePublicUsername(currentUser),
          fromUserAvatar: currentUser.photoURL || "",
          title: "New Story Comment",
          body: `commented on your story: "${cleanText}"`,
          mediaThumbnail: story.avatar || story.mediaUrl || "",
          type: "story",
          link: `/loops/story/${story.id}`,
          read: false,
          isRead: false,
          createdAt: Date.now(),
        }).catch(() => {});
      }
      notify("Sent!", "success");
    } catch {
      notify("Could not send message.", "error");
    }
  };

  const handleSendStoryReplyForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = replyText.trim();
    if (!clean) return;
    setReplyText("");
    await submitCommentOrReplyText(clean, true);
  };

  function renderViewerTextLayer(layer: StoryTextLayer) {
    const colorDef =
      STORY_COLORS.find((c) => c.id === layer.colorId) || STORY_COLORS[0];
    const fontDef =
      STORY_FONTS.find((f) => f.id === layer.fontId) || STORY_FONTS[0];
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
        const votesObj: Record<string, "A" | "B"> =
          story?.pollVotes?.[stk.id] || {};
        const vals = Object.values(votesObj);
        const total = vals.length;
        const countA = vals.filter((v) => v === "A").length;
        const pctA = total > 0 ? Math.round((countA / total) * 100) : 50;
        const pctB = total > 0 ? 100 - pctA : 50;
        const myVote = voterKey ? votesObj[voterKey] : undefined;

        return (
          <div
            key={stk.id}
            className="w-60 rounded-2xl bg-white text-zinc-900 p-3.5 shadow-xl space-y-2"
          >
            <p className="text-xs font-extrabold text-center text-zinc-900">
              {stk.title}
            </p>
            <button
              type="button"
              onClick={() => handleVotePoll(stk.id, "A")}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                myVote === "A"
                  ? "bg-[#1877F2] text-white"
                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-900"
              }`}
            >
              <span className="truncate">{stk.optionA || "Yes"}</span>
              {total > 0 && <span className="tabular-nums">{pctA}%</span>}
            </button>
            <button
              type="button"
              onClick={() => handleVotePoll(stk.id, "B")}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                myVote === "B"
                  ? "bg-[#1877F2] text-white"
                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-900"
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
          <div
            key={stk.id}
            className="w-64 rounded-2xl bg-white text-zinc-900 p-3.5 shadow-xl space-y-2"
          >
            <p className="text-xs font-extrabold text-center text-zinc-900">
              {stk.title}
            </p>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={questionDrafts[stk.id] || ""}
                onChange={(e) =>
                  setQuestionDrafts((prev) => ({
                    ...prev,
                    [stk.id]: e.target.value,
                  }))
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
        const sliderObj: Record<string, number> =
          story?.sliderVotes?.[stk.id] || {};
        const myScore = sliderObj[voterKey] || 0;
        return (
          <div
            key={stk.id}
            className="w-60 rounded-2xl bg-white text-zinc-900 p-3.5 shadow-xl space-y-2 text-center"
          >
            <p className="text-xs font-extrabold text-zinc-900">{stk.title}</p>
            <div className="flex items-center justify-between gap-1 pt-1">
              {[1, 2, 3, 4, 5].map((lv) => (
                <button
                  key={lv}
                  type="button"
                  onClick={() => handleVoteSlider(stk.id, lv)}
                  className={`flex-1 py-1.5 rounded-lg text-base cursor-pointer transition-transform hover:scale-110 ${
                    myScore >= lv
                      ? "bg-[#1877F2]/15 scale-105"
                      : "bg-zinc-100 opacity-65"
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
          <div
            key={stk.id}
            className="w-56 rounded-2xl bg-white text-zinc-900 p-3.5 shadow-xl space-y-2.5 text-center"
          >
            <p className="text-xs font-bold text-zinc-900">{stk.title}</p>
            <button
              type="button"
              onClick={() =>
                navigate(
                  isSignedIn
                    ? `/loops/create-story?from=loops&prompt=${encodeURIComponent(
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
                  ? `/loops/profile/${stk.targetUid}`
                  : `/loops/search?q=${encodeURIComponent(stk.title)}`
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
              navigate(
                `/loops/search?q=${encodeURIComponent(
                  "#" + stk.title.replace(/^#/, "")
                )}`
              )
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
            onClick={() =>
              navigate(
                stk.url ||
                  (stk.productId ? `/product/${stk.productId}` : "/products")
              )
            }
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
              <p className="text-xs font-extrabold truncate text-zinc-900">
                {stk.title}
              </p>
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
            onClick={() =>
              notify("Reminder turned on for this creator!", "success")
            }
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
  }

  const isLikedByMe = Boolean(
    currentUser?.uid && story?.likedBy?.includes(currentUser.uid)
  );
  const isFollowingAuthor = Boolean(
    story?.userId &&
    followedIds.has(story.userId)
  );

  const peerDisplayHandle =
    getSafePublicUsername(authorProfile) ||
    story?.authorUsername ||
    (story?.authorName || "creator").toLowerCase().replace(/\s+/g, "_");

  const musicLabel = React.useMemo(() => {
    if (!story) return null;
    if (story.music?.artist && story.music?.title) {
      return {
        artist: story.music.artist,
        title: story.music.title,
      };
    }
    if (story.music?.title) {
      return { artist: "", title: story.music.title };
    }
    if (story.songTitle) {
      const parts = String(story.songTitle).split("·");
      if (parts.length >= 2) {
        return {
          artist: parts[0].trim(),
          title: parts.slice(1).join("·").trim(),
        };
      }
      return { artist: "", title: String(story.songTitle).trim() };
    }
    return null;
  }, [story]);

  const alreadyMentionedUids = React.useMemo(() => {
    if (!story?.stickers) return [];
    return story.stickers
      .filter((s: any) => s.kind === "mention" && s.targetUid)
      .map((s: any) => s.targetUid);
  }, [story?.stickers]);

  const [storyMediaReady, setStoryMediaReady] = useState<boolean>(() =>
    story?.mediaType === "video" ? false : isImageCached(story?.mediaUrl)
  );

  useEffect(() => {
    if (!story?.mediaUrl) {
      setStoryMediaReady(true);
      return;
    }
    if (story.mediaType === "video") {
      setStoryMediaReady(false);
    } else if (isImageCached(story.mediaUrl)) {
      setStoryMediaReady(true);
    } else {
      setStoryMediaReady(false);
    }

    const nextStory = stories[activeIdx + 1];
    const prevStory = stories[activeIdx - 1];
    if (nextStory?.mediaUrl && nextStory.mediaType !== "video") {
      preloadImageUrl(nextStory.mediaUrl);
    }
    if (prevStory?.mediaUrl && prevStory.mediaType !== "video") {
      preloadImageUrl(prevStory.mediaUrl);
    }
  }, [story?.id, story?.mediaUrl, story?.mediaType, activeIdx, stories]);

  return (
    <div className="story-studio-shell h-[100dvh] max-h-[100dvh] overflow-hidden bg-black text-white flex flex-col justify-between select-none">
      <SEO
        title={`${story?.authorName || "Story"} — Loops`}
        description="Story viewer"
      />

      {/* Main Centered Mobile Story Viewport */}
      <div className="w-full max-w-md mx-auto h-full flex flex-col justify-between relative">
        {/* TOP SEGMENTED PROGRESS + HEADER (IMG_5131 vs IMG_5132) */}
        <header className="px-3 pt-2.5 pb-2 space-y-2.5 z-30 shrink-0">
          {scopedAuthorStories.length > 0 && (
            <div className="flex items-center gap-1 px-0.5">
              {scopedAuthorStories.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    const globalIdx = stories.findIndex((item) => item.id === s.id);
                    if (globalIdx >= 0) setActiveIdx(globalIdx);
                  }}
                  className="h-[2.5px] flex-1 rounded-full bg-white/30 overflow-hidden cursor-pointer"
                  aria-label={`Story segment ${idx + 1}`}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${
                      idx <= scopedActiveIdx ? "w-full bg-white" : "w-0"
                    }`}
                  />
                </button>
              ))}
            </div>
          )}

          {story && (
            <div className="flex items-center justify-between gap-2 px-0.5">
              {/* Left Avatar + Title + Music Subtitle */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {isOwnStory ? (
                  /* Own Story Avatar + Bottom-Right Dark "+" Badge (IMG_5131) */
                  <div className="relative w-10 h-10 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/loops/profile/${currentUser?.uid || ""}`)
                      }
                      className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-xs font-bold text-white cursor-pointer"
                    >
                      {story.avatar || currentUser?.photoURL ? (
                        <img
                          src={story.avatar || currentUser?.photoURL || ""}
                          alt="Your story"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (story.authorName || "Y").slice(0, 1).toUpperCase()
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic();
                        navigate("/loops/create-story?from=loops");
                      }}
                      className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center shadow cursor-pointer"
                      aria-label="Add to your story"
                    >
                      <Plus className="w-3 h-3 stroke-[2.8]" />
                    </button>
                  </div>
                ) : (
                  /* Peer Story Avatar (IMG_5132) */
                  <button
                    type="button"
                    onClick={() => {
                      if (story.userId) {
                        navigate(`/loops/profile/${story.userId}`);
                      }
                    }}
                    className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center text-xs font-bold text-white cursor-pointer"
                  >
                    {authorProfile?.photoURL ||
                    authorProfile?.shopLogo ||
                    story.avatar ? (
                      <img
                        src={
                          authorProfile?.photoURL ||
                          authorProfile?.shopLogo ||
                          story.avatar
                        }
                        alt={peerDisplayHandle}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      peerDisplayHandle.slice(0, 1).toUpperCase()
                    )}
                  </button>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (story.userId) {
                          navigate(`/loops/profile/${story.userId}`);
                        }
                      }}
                      className="text-[14.5px] font-semibold text-white truncate cursor-pointer"
                    >
                      {isOwnStory ? "Your story" : peerDisplayHandle}
                    </button>
                    <span className="text-[14px] font-normal text-white/75 shrink-0">
                      {story.ageShort || formatCompactStoryAge(story.createdAtMs)}
                    </span>
                    {story.isCloseFriends && (
                      <span className="w-4 h-4 rounded-full bg-emerald-500 inline-flex items-center justify-center shrink-0">
                        <Star className="w-2.5 h-2.5 fill-white text-white" />
                      </span>
                    )}
                  </div>

                  {musicLabel ? (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        setAudioMuted((m) => !m);
                      }}
                      className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-white/95 max-w-full cursor-pointer"
                    >
                      <StoryMusicBarsIcon
                        playing={!audioMuted}
                        className="w-3 h-3 shrink-0"
                      />
                      <span className="truncate">
                        {musicLabel.artist ? (
                          <>
                            <strong className="font-semibold">
                              {musicLabel.artist}
                            </strong>
                            <span className="mx-1">·</span>
                            <span>{musicLabel.title}</span>
                          </>
                        ) : (
                          <span className="font-medium">{musicLabel.title}</span>
                        )}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-white/80 shrink-0" />
                    </button>
                  ) : story.aiLabel ? (
                    <div className="mt-0.5 flex items-center gap-1 text-[11.5px] text-white/80">
                      <Sparkles className="w-3 h-3 shrink-0" />
                      <span>Made with AI</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Right Controls: Own Story -> X | Peer Story -> Follow + ... + X */}
              <div className="flex items-center gap-2 shrink-0">
                {!isOwnStory && story.userId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentUser) {
                        navigate("/signin");
                        return;
                      }
                      triggerHaptic();
                      toggleFollowUser({
                        targetUid: story.userId,
                        targetName: story.authorName || peerDisplayHandle,
                        currentUser,
                        currentlyFollowing: isFollowingAuthor,
                      });
                    }}
                    className="px-3.5 py-1 rounded-[10px] border border-white/65 bg-white/10 backdrop-blur-md text-[13px] font-semibold text-white whitespace-nowrap active:scale-95 transition cursor-pointer"
                  >
                    {isFollowingAuthor ? "Following" : "Follow"}
                  </button>
                )}

                {!isOwnStory && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic();
                      setShowPeerMenuPopover((v) => !v);
                    }}
                    className="w-9 h-9 flex items-center justify-center text-white cursor-pointer"
                    aria-label="More options"
                  >
                    <MoreHorizontal className="w-6 h-6" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCloseViewer}
                  className="w-9 h-9 flex items-center justify-center text-white cursor-pointer"
                  aria-label="Close story"
                >
                  <X className="w-7 h-7 stroke-[2]" />
                </button>
              </div>
            </div>
          )}
        </header>

        {/* FULL-WIDTH STORY MEDIA STAGE */}
        <div className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden bg-black">
          {loading ? (
            <p className="text-sm text-zinc-400">Loading story...</p>
          ) : !story ? (
            <div className="text-center space-y-3 px-6">
              <p className="text-sm text-zinc-400">No active story found.</p>
              <button
                type="button"
                onClick={handleCloseViewer}
                className="px-5 py-2.5 rounded-full bg-white text-zinc-900 text-xs font-bold cursor-pointer"
              >
                Back to Loops
              </button>
            </div>
          ) : (
            <div
              onTouchStart={handleViewerTouchStart}
              onTouchMove={handleViewerTouchMove}
              onTouchEnd={handleViewerTouchEnd}
              onTouchCancel={handleViewerTouchEnd}
              onWheel={handleViewerWheel}
              className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black touch-none"
            >
              {!storyMediaReady && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950 pointer-events-none">
                  <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/90 animate-spin" />
                </div>
              )}

              {story.mediaType === "video" ? (
                <video
                  src={story.mediaUrl}
                  autoPlay
                  playsInline
                  muted={audioMuted}
                  loop
                  onLoadedData={() => setStoryMediaReady(true)}
                  onCanPlay={() => setStoryMediaReady(true)}
                  className={`w-full h-full object-contain bg-black transition-opacity duration-200 ease-out ${
                    storyMediaReady ? "opacity-100" : "opacity-0"
                  }`}
                />
              ) : (
                <motion.img
                  key={story.mediaUrl}
                  src={story.mediaUrl}
                  alt={story.authorName}
                  loading="eager"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onLoad={(e) => {
                    const imgEl = e.currentTarget;
                    const reveal = () => {
                      markImageCached(story.mediaUrl);
                      setStoryMediaReady(true);
                    };
                    if (typeof imgEl.decode === "function") {
                      imgEl.decode().then(reveal).catch(reveal);
                    } else {
                      reveal();
                    }
                  }}
                  onError={() => setStoryMediaReady(true)}
                  animate={{
                    scale: story.isBoomerang ? viewerScale * 1.03 : viewerScale,
                    x: viewerOffset.x,
                    y: viewerOffset.y,
                  }}
                  transition={{ duration: 0 }}
                  className={`w-full h-full object-contain bg-black select-none transition-opacity duration-200 ease-out ${
                    storyMediaReady ? "opacity-100" : "opacity-0"
                  } ${story.isBoomerang ? "animate-pulse" : ""}`}
                />
              )}

              {/* Left / Right Invisible Tap Zones for Fast Story Stepping */}
              {activeIdx > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveIdx((i) => i - 1)}
                  className="absolute inset-y-12 left-0 w-1/4 z-15 cursor-pointer bg-transparent"
                  aria-label="Previous story"
                />
              )}
              {activeIdx < stories.length - 1 && (
                <button
                  type="button"
                  onClick={() => setActiveIdx((i) => i + 1)}
                  className="absolute inset-y-12 right-0 w-1/4 z-15 cursor-pointer bg-transparent"
                  aria-label="Next story"
                />
              )}

              {/* Interactive Text & Sticker Overlays */}
              {(story?.textLayers?.length > 0 ||
                story?.stickers?.length > 0) && (
                <div className="absolute inset-0 z-20 p-5 flex flex-col items-center justify-center gap-3 pointer-events-none">
                  <div className="pointer-events-auto flex flex-col items-center gap-3">
                    {story?.textLayers?.map((tl: StoryTextLayer) =>
                      renderViewerTextLayer(tl)
                    )}
                    {story?.stickers?.map((stk: StoryStickerItem) =>
                      renderViewerSticker(stk)
                    )}
                  </div>
                </div>
              )}

              {(story.caption || story.linkUrl) && (
                <div className="absolute inset-x-0 bottom-0 z-20 px-4 py-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent space-y-2">
                  {story.caption && (
                    <p className="text-sm font-medium text-white leading-relaxed">
                      {story.caption}
                    </p>
                  )}
                  {story.linkUrl &&
                    !story.stickers?.some(
                      (s: any) => s.kind === "link" || s.kind === "shop_order"
                    ) && (
                      <a
                        href={
                          /^https?:\/\//i.test(story.linkUrl)
                            ? story.linkUrl
                            : story.linkUrl.startsWith("/")
                            ? story.linkUrl
                            : `https://${story.linkUrl}`
                        }
                        target={
                          story.linkUrl.startsWith("/") ? "_self" : "_blank"
                        }
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-zinc-900 text-xs font-bold shadow"
                      >
                        <span>Visit Link</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM SECTION: OWN STORY (IMG_5131) VS PEER STORY (IMG_5132) */}
        {story && (
          <div className="shrink-0 z-30 bg-black">
            {isOwnStory ? (
              /* OWN STORY BOTTOM SECTION (IMG_5131 1:1) */
              <div className="pt-1 pb-4">
                {/* Floating Heart Reactions Row when reactions exist */}
                {(story.likedBy?.length || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setShowStatsModal(true);
                    }}
                    className="w-full px-7 py-2 flex items-center gap-12 cursor-pointer"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="w-9 h-9 drop-shadow -rotate-6"
                    >
                      <defs>
                        <linearGradient
                          id="storyHeartGrad1"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor="#ff2a55" />
                          <stop offset="100%" stopColor="#ff8a00" />
                        </linearGradient>
                      </defs>
                      <path
                        fill="url(#storyHeartGrad1)"
                        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                      />
                    </svg>
                    {(story.likedBy?.length || 0) > 1 && (
                      <svg
                        viewBox="0 0 24 24"
                        className="w-8 h-8 drop-shadow rotate-6"
                      >
                        <path
                          fill="#ff1f7a"
                          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                        />
                      </svg>
                    )}
                  </button>
                )}

                {/* "Say something..." Subtle Bar */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setShowCommentSheet(true);
                  }}
                  className="w-full px-4 py-2.5 border-y border-white/10 text-left text-[14.5px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                >
                  Say something...
                </button>

                {/* 5-Column Bottom Action Toolbar: Activity | Share on... | Mention | Send | More */}
                <div className="px-3 pt-2.5 flex items-end justify-between">
                  {/* 1. Activity */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setShowStatsModal(true);
                    }}
                    className="flex flex-col items-center gap-1 min-w-[60px] cursor-pointer"
                  >
                    {viewerProfiles.length > 0 ? (
                      <div className="flex items-center -space-x-2 h-7">
                        {viewerProfiles.slice(0, 3).map((vp, i) => {
                          const av = vp.photoURL || vp.shopLogo || "";
                          return (
                            <div
                              key={vp.uid || i}
                              className="w-7 h-7 rounded-full overflow-hidden border-2 border-black bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-white"
                            >
                              {av ? (
                                <img
                                  src={av}
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                (getSafeDisplayName(vp, "V") || "V")
                                  .slice(0, 1)
                                  .toUpperCase()
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-7 flex items-center justify-center">
                        <Eye className="w-6 h-6 text-white stroke-[2]" />
                      </div>
                    )}
                    <span className="text-[11.5px] font-medium text-white whitespace-nowrap">
                      Activity
                    </span>
                  </button>

                  {/* 2. Share on... */}
                  <button
                    type="button"
                    onClick={handleShareExternal}
                    className="flex flex-col items-center gap-1 min-w-[64px] cursor-pointer"
                  >
                    <div className="h-7 flex items-center justify-center text-white">
                      <DualSocialShareIcon className="w-9 h-6.5" />
                    </div>
                    <span className="text-[11.5px] font-medium text-white whitespace-nowrap">
                      Share on...
                    </span>
                  </button>

                  {/* 3. Mention */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setShowMentionSheet(true);
                    }}
                    className="flex flex-col items-center gap-1 min-w-[56px] cursor-pointer"
                  >
                    <div className="h-7 flex items-center justify-center text-white">
                      <AtSign className="w-6 h-6 stroke-[2]" />
                    </div>
                    <span className="text-[11.5px] font-medium text-white whitespace-nowrap">
                      Mention
                    </span>
                  </button>

                  {/* 4. Send */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setShowDirectSendSheet(true);
                    }}
                    className="flex flex-col items-center gap-1 min-w-[52px] cursor-pointer"
                  >
                    <div className="h-7 flex items-center justify-center text-white">
                      <Send className="w-6 h-6 stroke-[2]" />
                    </div>
                    <span className="text-[11.5px] font-medium text-white whitespace-nowrap">
                      Send
                    </span>
                  </button>

                  {/* 5. More */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic();
                      setShowOwnMorePopover((v) => !v);
                    }}
                    className="flex flex-col items-center gap-1 min-w-[52px] cursor-pointer"
                  >
                    <div className="h-7 flex items-center justify-center text-white">
                      <MoreHorizontal className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <span className="text-[11.5px] font-medium text-white whitespace-nowrap">
                      More
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              /* PEER STORY BOTTOM BAR (IMG_5132 1:1) */
              <div className="px-3.5 pt-2.5 pb-5 flex items-center gap-3">
                <form
                  onSubmit={handleSendStoryReplyForm}
                  className="flex-1 h-11 rounded-full border border-white/45 px-4 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Send message..."
                    className="ds-liquid-input flex-1 bg-transparent border-0 outline-none text-[14.5px] text-white placeholder-white/85"
                  />
                  {replyText.trim() && (
                    <button
                      type="submit"
                      className="text-xs font-bold text-[#0095f6] cursor-pointer"
                    >
                      Send
                    </button>
                  )}
                </form>

                {/* Heart Icon */}
                <button
                  type="button"
                  onClick={handleToggleStoryLike}
                  className="w-10 h-10 flex items-center justify-center text-white active:scale-90 transition cursor-pointer shrink-0"
                  aria-label="Like story"
                >
                  <Heart
                    className={`w-6.5 h-6.5 stroke-[2] ${
                      isLikedByMe ? "fill-[#FF3040] text-[#FF3040]" : ""
                    }`}
                  />
                </button>

                {/* Comment Bubble Icon -> Opens IMG_5134 Sheet */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setShowCommentSheet(true);
                  }}
                  className="w-10 h-10 flex items-center justify-center text-white active:scale-90 transition cursor-pointer shrink-0"
                  aria-label="Comment on story"
                >
                  <MessageCircle className="w-6.5 h-6.5 stroke-[2]" />
                </button>

                {/* Direct Share Paper-Plane Icon */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    if (!currentUser) {
                      navigate("/signin");
                      return;
                    }
                    setShowDirectSendSheet(true);
                  }}
                  className="w-10 h-10 flex items-center justify-center text-white active:scale-90 transition cursor-pointer shrink-0"
                  aria-label="Share story"
                >
                  <Send className="w-6.5 h-6.5 stroke-[2]" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* POPOVERS & BOTTOM SHEETS */}
      <OwnStoryMorePopover
        isOpen={showOwnMorePopover}
        onClose={() => setShowOwnMorePopover(false)}
        allowCommenting={story?.allowCommenting !== false}
        aiLabel={Boolean(story?.aiLabel)}
        onDelete={handleDeleteCurrentStory}
        onArchive={handleArchiveStory}
        onHighlight={() => setShowHighlightModal(true)}
        onSaveMedia={handleSaveStoryMedia}
        onToggleAiLabel={handleToggleAiLabel}
        onBoostStory={() =>
          notify("Story Boost queued for priority discovery!", "success")
        }
        onOpenStorySettings={() => setShowStorySettingsSheet(true)}
        onToggleCommenting={handleToggleStoryCommenting}
      />

      <PeerStoryMenuPopover
        isOpen={showPeerMenuPopover}
        onClose={() => setShowPeerMenuPopover(false)}
        onReport={handleReportPeerStory}
        onAboutAccount={() => setShowAboutAccountModal(true)}
      />

      <StoryCommentSheet
        isOpen={showCommentSheet}
        onClose={() => setShowCommentSheet(false)}
        replies={story?.storyReplies || []}
        currentUserAvatar={currentUser?.photoURL || ""}
        currentUserName={getSafeDisplayName(currentUser, "You")}
        allowCommenting={story?.allowCommenting !== false}
        onSubmitComment={(txt) => submitCommentOrReplyText(txt, true)}
        onQuickEmoji={async (emoji) => {
          await submitCommentOrReplyText(emoji, true);
          setShowCommentSheet(false);
        }}
        onNavigateProfile={(uid) => navigate(`/loops/profile/${uid}`)}
      />

      <StoryMentionSheet
        isOpen={showMentionSheet}
        onClose={() => setShowMentionSheet(false)}
        allUsers={allUsers}
        currentUid={currentUser?.uid || ""}
        alreadyMentionedUids={alreadyMentionedUids}
        onConfirmMentions={handleConfirmMentions}
      />

      <StoryHighlightModal
        isOpen={showHighlightModal}
        onClose={() => setShowHighlightModal(false)}
        existingHighlights={myHighlights}
        currentStoryId={story?.id || ""}
        onAddToHighlight={handleAddToExistingHighlight}
        onCreateHighlight={handleCreateNewHighlight}
      />

      <StoryDirectSendSheet
        isOpen={showDirectSendSheet}
        onClose={() => setShowDirectSendSheet(false)}
        allUsers={allUsers}
        currentUid={currentUser?.uid || ""}
        onSendToUser={async (targetUser) => {
          await deliverStoryMessageToUser(
            targetUser.uid,
            `Shared a story from @${peerDisplayHandle}: ${getPublicShareOrigin()}/loops/story/${
              story?.id || ""
            }`,
            "Shared story"
          );
          notify(
            `Sent to ${getSafeDisplayName(targetUser, "member")}!`,
            "success"
          );
        }}
      />

      <StoryAboutAccountModal
        isOpen={showAboutAccountModal}
        onClose={() => setShowAboutAccountModal(false)}
        authorProfile={authorProfile}
        fallbackName={story?.authorName || "Creator"}
        fallbackAvatar={story?.avatar || ""}
        onViewProfile={() => {
          if (story?.userId) navigate(`/loops/profile/${story.userId}`);
        }}
      />

      <StorySettingsSheet
        isOpen={showStorySettingsSheet}
        onClose={() => setShowStorySettingsSheet(false)}
        isCloseFriends={Boolean(story?.isCloseFriends)}
        allowCommenting={story?.allowCommenting !== false}
        onToggleCloseFriends={handleToggleCloseFriends}
        onToggleCommenting={handleToggleStoryCommenting}
      />

      {/* STORY ACTIVITY / VIEWERS MODAL (Owner) */}
      <AnimatePresence>
        {showStatsModal && (
          <div
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end justify-center p-4"
            onClick={() => setShowStatsModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 w-full max-w-md rounded-t-[32px] overflow-hidden flex flex-col max-h-[80vh] border border-zinc-800"
            >
              <div className="h-1.5 w-12 bg-zinc-700 rounded-full mx-auto my-3 shrink-0" />

              <div className="px-6 py-2 flex items-center justify-between border-b border-zinc-800 shrink-0">
                <h2 className="text-base font-bold text-white">
                  Story activity
                </h2>
                <button
                  type="button"
                  onClick={() => setShowStatsModal(false)}
                  className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-800">
                    <div className="flex items-center gap-2 text-zinc-400 mb-1">
                      <Eye className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        Views
                      </span>
                    </div>
                    <p className="text-2xl font-black text-white tabular-nums">
                      {formatCompactNumber(story?.viewedBy?.length || 0)}
                    </p>
                  </div>
                  <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-800">
                    <div className="flex items-center gap-2 text-zinc-400 mb-1">
                      <Heart className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        Reactions
                      </span>
                    </div>
                    <p className="text-2xl font-black text-white tabular-nums">
                      {story?.likedBy?.length || 0}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                      Viewers
                    </h3>
                    <span className="text-[11px] font-medium text-zinc-400">
                      Only visible to you
                    </span>
                  </div>

                  {isLoadingStats ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-5 h-5 border-2 border-[#1877F2] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : viewerProfiles.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-4">
                      No viewers yet.
                    </p>
                  ) : (
                    <div className="space-y-3.5">
                      {viewerProfiles.map((prof) => {
                        const isFollower = ownerFollowers.includes(prof.uid);
                        return (
                          <div
                            key={prof.uid}
                            className="flex items-center justify-between"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setShowStatsModal(false);
                                navigate(`/loops/profile/${prof.uid}`);
                              }}
                              className="flex items-center gap-3 text-left cursor-pointer"
                            >
                              {prof.photoURL || prof.shopLogo ? (
                                <img
                                  src={prof.photoURL || prof.shopLogo}
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  className="w-10 h-10 rounded-full object-cover bg-zinc-800 border border-zinc-700"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-200">
                                  {(getSafeDisplayName(prof, "M") || "M")
                                    .slice(0, 1)
                                    .toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-bold text-white leading-none mb-1">
                                  {getSafeDisplayName(prof, "Member")}
                                </p>
                                <p className="text-[11px] text-zinc-400">
                                  @{getSafePublicUsername(prof) || "member"}
                                  {isFollower ? " · Follows you" : ""}
                                </p>
                              </div>
                            </button>

                            {story.likedBy?.includes(prof.uid) && (
                              <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-500 border border-rose-500/30">
                                <Heart className="w-4 h-4 fill-current" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};



