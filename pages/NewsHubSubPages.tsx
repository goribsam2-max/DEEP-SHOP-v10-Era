import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  increment,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
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
  canAccessSellerDashboard,
  hasImmediateAdminOrStaffRole,
  checkStaffRecord,
} from "../lib/admin";

import defaultAvatarImg from "../src/assets/images/story_avatar_creator_1_1792826814910.jpg";

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
  const notify = useNotify();

  const [post, setPost] = useState<ScamPost | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(
    Math.max(0, Number(index) || 0)
  );
  const [zoomed, setZoomed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveIndex(Math.max(0, Number(index) || 0));
  }, [index]);

  useEffect(() => {
    let mounted = true;
    resolvePostById(postId || "").then((found) => {
      if (mounted) {
        setPost(found);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [postId]);

  const images = post?.images || [];
  const isScam = isScamPostRecord(post);
  const currentImg = images[activeIndex] || images[0] || "";

  const handleDownload = () => {
    if (!currentImg) return;
    triggerHaptic();
    const filename = isScam
      ? `scam-report-${post?.id || "photo"}-${activeIndex + 1}.jpg`
      : `feed-photo-${post?.id || "photo"}-${activeIndex + 1}.jpg`;
    downloadWatermarkedImage(currentImg, filename);
    notify("Photo saved to device", "success");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between select-none">
      <SEO
        title={post?.title ? `${post.title} — Photo` : "Fullscreen Photo"}
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
              {post?.reporterName || "Feed Photo"}
            </p>
            <p className="text-xs text-zinc-400 tabular-nums">
              {images.length > 0
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
              onClick={() => navigate("/news-hub")}
              className="px-5 py-2.5 rounded-full bg-white text-zinc-900 text-xs font-bold cursor-pointer"
            >
              Back to Feed
            </button>
          </div>
        ) : (
          <div className="relative max-w-5xl w-full flex flex-col items-center justify-center">
            <img
              src={currentImg}
              alt={post?.title || "Fullscreen photo"}
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
        {post?.description && (
          <p className="max-w-xl mx-auto text-center text-xs text-zinc-300 line-clamp-2">
            {post.description}
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

  const [post, setPost] = useState<ScamPost | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  useEffect(() => {
    resolvePostById(id || "").then((found) => setPost(found));
  }, [id]);

  const isScam = isScamPostRecord(post);
  const postUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/news-hub/post/${post?.id || id}`
      : "";

  const shareText = isScam
    ? `⚠️ Scam Report${
        post?.scamLocation ? ` (${post.scamLocation})` : ""
      }: ${post?.description?.slice(0, 140) || post?.title || ""}`
    : `${post?.reporterName || "Community"}: ${
        post?.description?.slice(0, 160) || post?.title || "Check out this post"
      }`;

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
          title: isScam
            ? `Scam Alert · ${post?.scamLocation || "Community"}`
            : `${post?.reporterName || "Feed"}'s Post`,
          text: shareText,
          url: postUrl,
        });
        await recordShareCount();
        notify("Shared successfully!", "success");
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#BCE0FD]/80 via-[#E2F1FF]/45 to-transparent dark:from-transparent dark:via-transparent dark:to-transparent text-zinc-900 dark:text-zinc-100 pb-24">
      <SEO title="Share Post — Feed" description="Share this post" />

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
                  <span>Send in Direct Messages</span>
                </button>
              </div>
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
                    (a, b) => a + b,
                    0
                  )
                : post.votes || 0;

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
 * 4. DEDICATED STORY VIEWER PAGE (/news-hub/story/:storyId) — REAL STORIES ONLY
 * ========================================================================== */
export const NewsStoryViewerPage: React.FC = () => {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();

  const [stories, setStories] = useState<any[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(() => Boolean(auth.currentUser));

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setIsSignedIn(Boolean(u));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const mapDoc = (id: string, data: Record<string, any>) => {
      const createdAtMs =
        typeof data.createdAtMs === "number"
          ? data.createdAtMs
          : data.createdAt
          ? new Date(data.createdAt).getTime() || 0
          : 0;
      return {
        id,
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
        caption: data.caption || data.songTitle || "",
        createdAtMs,
        createdAtLabel: data.createdAt
          ? formatDhakaDateTime(data.createdAt)
          : "Recent",
      };
    };

    const loadStories = async () => {
      try {
        const [snapMain, snapCommunity] = await Promise.all([
          getDocs(collection(db, "stories")).catch(() => null),
          getDocs(collection(db, "creator_videos")).catch(() => null),
        ]);
        const merged = new Map<string, any>();
        snapMain?.docs.forEach((d) => merged.set(d.id, mapDoc(d.id, d.data())));
        snapCommunity?.docs.forEach((d) => {
          const data = d.data();
          if (data?.kind === "news_story") {
            merged.set(d.id, mapDoc(d.id, data));
          }
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

        const remote = Array.from(merged.values()).sort(
          (a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)
        );
        setStories(remote);
        const foundIdx = remote.findIndex((s) => s.id === storyId);
        if (foundIdx >= 0) setActiveIdx(foundIdx);
      } catch {}
      setLoading(false);
    };
    loadStories();
  }, [storyId]);

  const story = stories[activeIdx];

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between">
      <SEO
        title={`${story?.authorName || "Story"} — Feed`}
        description="Story viewer"
      />

      {/* Progress & Header */}
      <header className="p-4 space-y-3 z-20">
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

        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/news-hub")}
              className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center cursor-pointer"
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
                  className="w-10 h-10 rounded-full object-cover border border-white/50"
                />
                <div>
                  <p className="text-sm font-bold text-white">
                    {story.authorName}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {story.createdAtLabel}
                  </p>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(isSignedIn ? "/add-story?from=news-hub" : "/signin")
            }
            className="px-3.5 py-2 rounded-full bg-white/15 hover:bg-white/25 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Story</span>
          </button>
        </div>
      </header>

      {/* Story Media Stage (div instead of main to avoid global white main override) */}
      <div className="flex-1 flex items-center justify-center px-4 py-2 bg-transparent">
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
          <div className="relative w-full max-w-md aspect-[9/15] max-h-[75vh] rounded-[32px] overflow-hidden bg-zinc-900 shadow-2xl">
            {story.mediaType === "video" ? (
              <video
                src={story.mediaUrl}
                autoPlay
                playsInline
                controls
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={story.mediaUrl}
                alt={story.authorName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            )}

            {(story.caption || story.linkUrl) && (
              <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/85 via-black/45 to-transparent space-y-2.5">
                {story.caption && (
                  <p className="text-sm font-medium text-white leading-relaxed">
                    {story.caption}
                  </p>
                )}
                {story.linkUrl && (
                  <a
                    href={
                      /^https?:\/\//i.test(story.linkUrl)
                        ? story.linkUrl
                        : `https://${story.linkUrl}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-zinc-950 text-xs font-bold shadow-md"
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
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center cursor-pointer"
                aria-label="Previous story"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {activeIdx < stories.length - 1 && (
              <button
                type="button"
                onClick={() => setActiveIdx((i) => i + 1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center cursor-pointer"
                aria-label="Next story"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-4 max-w-md mx-auto w-full flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate("/news-hub/create")}
          className="flex-1 py-3 rounded-full bg-white/15 hover:bg-white/25 text-xs font-semibold text-center cursor-pointer"
        >
          Create a Post on Feed
        </button>
      </div>
    </div>
  );
};
