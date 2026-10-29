import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  X,
  Check,
  Copy,
  Share2,
  MoreHorizontal,
  Heart,
  MessageCircle,
  Sparkles,
  ShieldAlert,
  Edit3,
  Trash2,
  Reply,
  Smile,
  BarChart2,
  Search,
  UserPlus,
  Bookmark,
  Link2,
  Eye,
  EyeOff,
  SlidersHorizontal,
  ThumbsUp,
  Frown,
  AlertCircle,
  User as UserIcon,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { ScamPost, ScamComment, ReactionType } from "../types";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  deleteDoc,
  limit,
} from "firebase/firestore";
import { triggerHaptic } from "../lib/haptics";
import {
  formatCompactNumber,
  getSafeDisplayName,
  getPublicShareOrigin,
} from "../lib/utils";
import { formatDhakaFeedTime } from "../lib/dhakaTime";
import { useNotify, useConfirm } from "./Notifications";
import { useNavigate } from "react-router-dom";
import {
  getTotalPostReactions,
  boostPostAffinity,
  dismissSuggestedPostId,
  getMutedUserIds,
  toggleMuteUserId,
  getRestrictedUserIds,
  toggleRestrictUserId,
  getBlockedUserIds,
  toggleBlockUserId,
} from "../lib/feedAlgorithm";

/* ============================================================================
 * CRISP OUTLINE SVG ICONS FOR POST OPTIONS & SHARE SHEET (IMG_5098 & IMG_5099)
 * ========================================================================== */
const MutePersonOutlineIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 5L6 9H2v6h4l5 4V5z" />
    <line x1="22" y1="9" x2="16" y2="15" />
    <line x1="16" y1="9" x2="22" y2="15" />
  </svg>
);

const RestrictPersonOutlineIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="10" cy="8" r="4" />
    <path d="M3 20a7 7 0 0 1 11.5-5.3" />
    <rect x="14.5" y="14" width="6.5" height="6" rx="1.5" />
    <path d="M16 14v-1.5a1.75 1.75 0 0 1 3.5 0V14" />
  </svg>
);

const BlockUserOutlineIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="10" cy="8" r="4" />
    <path d="M3 20a7 7 0 0 1 10.2-6.2" />
    <circle cx="17.5" cy="17.5" r="4.5" />
    <line x1="14.4" y1="14.4" x2="20.6" y2="20.6" />
  </svg>
);

const ReportBubbleExclamationIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <line x1="12" y1="8" x2="12" y2="11.5" />
    <circle cx="12" cy="14.5" r="0.6" fill="currentColor" />
  </svg>
);

const ShareUploadIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
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
    <path d="M12 3v12" />
    <polyline points="7 8 12 3 17 8" />
    <path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
  </svg>
);

const WhatsAppOutlineSvg: React.FC<{ className?: string }> = ({
  className = "w-6 h-6",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    <path d="M9.5 9.5c.3 1.8 2.2 3.7 4 4l1.3-1.1c.2-.2.5-.2.8-.1l1.6.7c.3.1.4.5.3.8-.3.9-1.1 1.6-2.1 1.7-2.8.2-6.5-3.5-6.3-6.3.1-1 .8-1.8 1.7-2.1.3-.1.7 0 .8.3l.7 1.6c.1.3.1.6-.1.8L9.5 9.5z" />
  </svg>
);

const MessengerBoltSvg: React.FC<{ className?: string }> = ({
  className = "w-6 h-6",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3c-5 0-9 3.7-9 8.3 0 2.6 1.3 4.9 3.4 6.4V21l3.1-1.7c.8.2 1.6.3 2.5.3 5 0 9-3.7 9-8.3S17 3 12 3z" />
    <polyline points="7.5 13 10.8 9.5 13.2 11.8 16.5 8.5" />
  </svg>
);

const AddStoryCirclePlusSvg: React.FC<{ className?: string }> = ({
  className = "w-6 h-6",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3a9 9 0 1 1-6.36 2.64" strokeDasharray="3.2 2.4" />
    <line x1="12" y1="8.5" x2="12" y2="15.5" />
    <line x1="8.5" y1="12" x2="15.5" y2="12" />
  </svg>
);

/* ============================================================================
 * 0. SHARED POST OPTIONS BOTTOM SHEET ("About this post" — Matching IMG_5127)
 * ========================================================================== */
const CircledInfoSvg: React.FC<{ className?: string }> = ({
  className = "w-[22px] h-[22px]",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.95"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9.25" />
    <line x1="12" y1="11" x2="12" y2="16.2" />
    <circle cx="12" cy="7.7" r="0.85" fill="currentColor" stroke="none" />
  </svg>
);

const CircledCheckSvg: React.FC<{ className?: string }> = ({
  className = "w-[22px] h-[22px]",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.95"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9.25" />
    <polyline points="8.3 12.3 10.9 14.9 15.8 9.6" />
  </svg>
);

const CircledCrossSvg: React.FC<{ className?: string }> = ({
  className = "w-[22px] h-[22px]",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.95"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9.25" />
    <line x1="9.3" y1="9.3" x2="14.7" y2="14.7" />
    <line x1="14.7" y1="9.3" x2="9.3" y2="14.7" />
  </svg>
);

const REPORT_REASONS = [
  "Spam or misleading content",
  "Scam, fraud, or impersonation",
  "Harassment or bullying",
  "Hate speech or abusive language",
  "False information",
];

function buildAboutPostSummary(post: ScamPost): string {
  const author = (post?.reporterName || "This creator").trim();
  const rawBody = (post?.description || post?.title || "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const imgCount = Array.isArray(post?.images) ? post.images.length : 0;
  const mediaPhrase =
    imgCount > 1
      ? `a ${imgCount}-photo carousel`
      : imgCount === 1
      ? "a visual post"
      : post?.videoUrl
      ? "a video post"
      : post?.audioUrl
      ? "a voice Loop"
      : "a community Loop";

  if (rawBody.length > 0) {
    const trimmed =
      rawBody.length > 185 ? `${rawBody.slice(0, 182).trimEnd()}...` : rawBody;
    return `${author} shares ${mediaPhrase}: ${trimmed}`;
  }
  if (post?.postTag) {
    return `${author} shared ${mediaPhrase} in ${post.postTag} on Loops.`;
  }
  return `${author} shared ${mediaPhrase} with the Loops community.`;
}

export const LoopPostOptionsSheet: React.FC<{
  isOpen: boolean;
  post: ScamPost;
  isSaved?: boolean;
  canManage?: boolean;
  isFollowingAuthor?: boolean;
  onClose: () => void;
  onToggleSave?: () => void;
  onCopyLink?: () => void;
  onOpenShare?: () => void;
  onOpenReplyOptions?: () => void;
  onEditPost?: () => void;
  onDeletePost?: () => void;
  onPostHidden?: (postId: string) => void;
}> = ({
  isOpen,
  post,
  isSaved = false,
  canManage = false,
  isFollowingAuthor = false,
  onClose,
  onToggleSave,
  onCopyLink,
  onOpenShare,
  onOpenReplyOptions,
  onEditPost,
  onDeletePost,
  onPostHidden,
}) => {
  const navigate = useNavigate();
  const notify = useNotify();
  const confirm = useConfirm();
  const currentUser = auth.currentUser;

  const [subView, setSubView] = useState<"main" | "why" | "report">("main");
  const [submittingReport, setSubmittingReport] = useState(false);

  const authorId = post?.reporterId || "";
  const authorLabel = post?.reporterName || "this user";
  const isOwnPost = Boolean(
    currentUser?.uid && authorId && currentUser.uid === authorId
  );

  const [isMuted, setIsMuted] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const aboutSummary = useMemo(() => buildAboutPostSummary(post), [post]);

  useEffect(() => {
    if (!isOpen) {
      setSubView("main");
      return;
    }
    if (authorId) {
      setIsMuted(getMutedUserIds().includes(authorId));
      setIsRestricted(getRestrictedUserIds().includes(authorId));
      setIsBlocked(getBlockedUserIds().includes(authorId));
    }
  }, [isOpen, authorId]);

  const handleDefaultCopy = async () => {
    triggerHaptic();
    if (onCopyLink) {
      onCopyLink();
      onClose();
      return;
    }
    const url = `${getPublicShareOrigin()}/loops/post/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      notify("Link copied to clipboard", "success");
    } catch {
      notify("Could not copy link", "error");
    }
    onClose();
  };

  const handleDefaultSave = () => {
    triggerHaptic();
    if (onToggleSave) {
      onToggleSave();
      onClose();
      return;
    }
    try {
      const key = "deep_saved_scam_posts";
      const list: string[] = JSON.parse(localStorage.getItem(key) || "[]");
      const exists = list.includes(post.id);
      const next = exists
        ? list.filter((id) => id !== post.id)
        : [post.id, ...list];
      localStorage.setItem(key, JSON.stringify(next));
      notify(exists ? "Removed from saved" : "Saved to Loops", "info");
    } catch {}
    onClose();
  };

  const handleInterested = () => {
    triggerHaptic();
    boostPostAffinity(post);
    notify("Showing more Loops like this", "success");
    onClose();
  };

  const handleNotInterested = () => {
    triggerHaptic();
    dismissSuggestedPostId(post.id);
    onPostHidden?.(post.id);
    notify("Loop hidden from your feed", "info");
    onClose();
  };

  const handleToggleMute = () => {
    triggerHaptic();
    if (!authorId) {
      onClose();
      return;
    }
    const nowMuted = toggleMuteUserId(authorId);
    setIsMuted(nowMuted);
    notify(
      nowMuted ? `Muted ${authorLabel}` : `Unmuted ${authorLabel}`,
      "info"
    );
    onClose();
  };

  const handleToggleRestrict = () => {
    triggerHaptic();
    if (!authorId) {
      onClose();
      return;
    }
    const nowRestricted = toggleRestrictUserId(authorId);
    setIsRestricted(nowRestricted);
    notify(
      nowRestricted
        ? `Restricted ${authorLabel}`
        : `Unrestricted ${authorLabel}`,
      "info"
    );
    onClose();
  };

  const handleToggleBlock = async () => {
    triggerHaptic();
    if (!authorId) {
      onClose();
      return;
    }
    if (!isBlocked) {
      const ok = await confirm({
        title: `Block ${authorLabel}?`,
        message:
          "They will not be able to interact with your Loops, and their posts will be hidden from your feed.",
        confirmText: "Block",
        cancelText: "Cancel",
      });
      if (!ok) return;
    }
    const nowBlocked = toggleBlockUserId(authorId);
    setIsBlocked(nowBlocked);
    notify(
      nowBlocked ? `Blocked ${authorLabel}` : `Unblocked ${authorLabel}`,
      "info"
    );
    onClose();
  };

  const handleSubmitReportReason = async (reason: string) => {
    if (submittingReport) return;
    triggerHaptic();
    setSubmittingReport(true);
    try {
      await addDoc(collection(db, "notifications"), {
        type: "loop_post_report",
        title: "Loop Reported",
        message: `Post ${post.id} by ${authorLabel} reported for: ${reason}`,
        postId: post.id,
        reportedAuthorId: authorId,
        reporterUid: currentUser?.uid || "guest",
        reason,
        read: false,
        createdAt: Date.now(),
      });
    } catch {}
    dismissSuggestedPostId(post.id);
    onPostHidden?.(post.id);
    setSubmittingReport(false);
    notify("Thank you. Your report has been submitted.", "success");
    onClose();
  };

  const handleFallbackDelete = async () => {
    triggerHaptic();
    if (onDeletePost) {
      onClose();
      onDeletePost();
      return;
    }
    const ok = await confirm({
      title: "Delete Loop?",
      message: "Are you sure you want to permanently delete this Loop?",
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;
    try {
      if (!post.id.startsWith("showcase_")) {
        await deleteDoc(doc(db, "scam_posts", post.id));
      }
      const raw = localStorage.getItem("deep_scam_posts");
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          localStorage.setItem(
            "deep_scam_posts",
            JSON.stringify(list.filter((p: any) => p.id !== post.id))
          );
        }
      }
      onPostHidden?.(post.id);
      notify("Loop deleted", "info");
    } catch {
      notify("Could not delete Loop", "error");
    }
    onClose();
  };

  const sheetNode = (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[280] flex flex-col justify-end"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/45 backdrop-blur-[1.5px]"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 390, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="loops-about-sheet relative z-[281] w-full max-w-lg mx-auto rounded-t-[32px] px-5 pt-3 pb-8 space-y-4 max-h-[88vh] overflow-y-auto overscroll-contain shadow-[0_-12px_40px_rgba(0,0,0,0.16)] border-t loops-divider"
          >
            {/* Top Grab Handle matching IMG_5127 */}
            <div className="w-11 h-1 rounded-full bg-zinc-400/75 dark:bg-zinc-600 mx-auto mb-1 shrink-0" />

            {subView === "report" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setSubView("main")}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    aria-label="Back"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-[16px] font-bold text-[#0f0f0f] dark:text-white">
                    Why are you reporting this post?
                  </span>
                  <span className="w-8" />
                </div>

                <div className="loops-about-card rounded-[22px] divide-y loops-divider overflow-hidden">
                  {REPORT_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      disabled={submittingReport}
                      onClick={() => handleSubmitReportReason(reason)}
                      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-[15.5px] font-medium text-[#0f0f0f] dark:text-white cursor-pointer text-left"
                    >
                      <span>{reason}</span>
                      <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : subView === "why" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setSubView("main")}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    aria-label="Back"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-[16px] font-bold text-[#0f0f0f] dark:text-white">
                    Why you&apos;re seeing this post
                  </span>
                  <span className="w-8" />
                </div>

                <p className="text-[14.5px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                  Posts in Loops are shown based on profiles you follow, topics
                  you engage with, and recent conversations in the community.
                </p>

                <div className="loops-about-card rounded-[22px] p-4 space-y-3.5">
                  <div className="flex items-start gap-3">
                    <UserIcon className="w-5 h-5 text-zinc-700 dark:text-zinc-300 mt-0.5 shrink-0" />
                    <div className="text-[14.5px] leading-snug">
                      <p className="font-semibold text-[#0f0f0f] dark:text-white">
                        {isOwnPost
                          ? "You shared this post"
                          : isFollowingAuthor
                          ? `You follow ${authorLabel}`
                          : `Suggested creator · ${authorLabel}`}
                      </p>
                      <p className="text-zinc-500 dark:text-zinc-400 text-[13px] mt-0.5">
                        {isFollowingAuthor
                          ? "Posts from accounts you follow appear higher in your feed."
                          : "Popular with members who share similar Loops interests."}
                      </p>
                    </div>
                  </div>

                  {post.postTag && (
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-zinc-700 dark:text-zinc-300 mt-0.5 shrink-0" />
                      <div className="text-[14.5px] leading-snug">
                        <p className="font-semibold text-[#0f0f0f] dark:text-white">
                          Topic: {post.postTag}
                        </p>
                        <p className="text-zinc-500 dark:text-zinc-400 text-[13px] mt-0.5">
                          Matched with active community topics in your feed.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    onClose();
                    navigate("/loops/personalization");
                  }}
                  className="w-full py-3.5 rounded-2xl bg-[#0f0f0f] dark:bg-white text-white dark:text-[#0f0f0f] text-[15px] font-semibold cursor-pointer active:scale-[0.98] transition"
                >
                  Manage feed preferences
                </button>
              </div>
            ) : (
              <>
                {/* "About this post" Heading + Real Post Summary matching IMG_5127 */}
                <div className="space-y-2 pt-0.5">
                  <h3 className="text-[16.5px] font-bold text-[#0f0f0f] dark:text-white tracking-tight">
                    About this post
                  </h3>
                  <p className="text-[15px] leading-[1.42] text-[#141414] dark:text-zinc-200">
                    {aboutSummary}
                  </p>
                </div>

                {/* Primary Options Card matching IMG_5127 exact left-icon layout */}
                <div className="loops-about-card rounded-[22px] py-1.5 px-1.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setSubView("why");
                    }}
                    className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                  >
                    <CircledInfoSvg className="w-[23px] h-[23px] text-[#0f0f0f] dark:text-white shrink-0" />
                    <span>Why you&apos;re seeing this post</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleInterested}
                    className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                  >
                    <CircledCheckSvg className="w-[23px] h-[23px] text-[#0f0f0f] dark:text-white shrink-0" />
                    <span>Interested</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNotInterested}
                    className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                  >
                    <CircledCrossSvg className="w-[23px] h-[23px] text-[#0f0f0f] dark:text-white shrink-0" />
                    <span>Not interested</span>
                  </button>

                  {!isOwnPost && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        setSubView("report");
                      }}
                      className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-rose-500/10 text-[16px] font-normal text-[#FF3040] cursor-pointer text-left transition"
                    >
                      <ReportBubbleExclamationIcon className="w-[23px] h-[23px] text-[#FF3040] shrink-0" />
                      <span>Report</span>
                    </button>
                  )}
                </div>

                {/* Secondary Actions Card (Save, Copy link, Share, Author/Moderation controls) */}
                <div className="loops-about-card rounded-[22px] py-1.5 px-1.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={handleDefaultSave}
                    className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[15.5px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                  >
                    <Bookmark
                      className={`w-[22px] h-[22px] stroke-[1.95] shrink-0 ${
                        isSaved
                          ? "fill-current text-[#0f0f0f] dark:text-white"
                          : "text-[#0f0f0f] dark:text-white"
                      }`}
                    />
                    <span>{isSaved ? "Unsave" : "Save"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDefaultCopy}
                    className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[15.5px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                  >
                    <Link2 className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                    <span>Copy link</span>
                  </button>

                  {onOpenShare && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        onClose();
                        onOpenShare();
                      }}
                      className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[15.5px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                    >
                      <ShareUploadIcon className="w-[22px] h-[22px] text-[#0f0f0f] dark:text-white shrink-0" />
                      <span>Share</span>
                    </button>
                  )}

                  {!isOwnPost && authorId && (
                    <>
                      <button
                        type="button"
                        onClick={handleToggleMute}
                        className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[15.5px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                      >
                        <MutePersonOutlineIcon className="w-[22px] h-[22px] text-[#0f0f0f] dark:text-white shrink-0" />
                        <span>{isMuted ? "Unmute" : "Mute"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleRestrict}
                        className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[15.5px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                      >
                        <RestrictPersonOutlineIcon className="w-[22px] h-[22px] text-[#0f0f0f] dark:text-white shrink-0" />
                        <span>{isRestricted ? "Unrestrict" : "Restrict"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleBlock}
                        className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-[16px] hover:bg-rose-500/10 text-[15.5px] font-normal text-[#FF3040] cursor-pointer text-left transition"
                      >
                        <BlockUserOutlineIcon className="w-[22px] h-[22px] text-[#FF3040] shrink-0" />
                        <span>{isBlocked ? "Unblock" : "Block"}</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Author / Admin Controls Card */}
                {canManage && (
                  <div className="loops-about-card rounded-[22px] py-1.5 px-1.5 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        onClose();
                        navigate(`/loops/post/${post.id}/activity`);
                      }}
                      className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[15.5px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                    >
                      <BarChart2 className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                      <span>View activity</span>
                    </button>

                    {onOpenReplyOptions && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          onClose();
                          onOpenReplyOptions();
                        }}
                        className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[15.5px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                      >
                        <SlidersHorizontal className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                        <span>Who can reply</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        onClose();
                        if (onEditPost) {
                          onEditPost();
                        } else {
                          navigate(`/loops/edit/${post.id}`);
                        }
                      }}
                      className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[15.5px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                    >
                      <Edit3 className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleFallbackDelete}
                      className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-[16px] hover:bg-rose-500/10 text-[15.5px] font-normal text-[#FF3040] cursor-pointer text-left transition"
                    >
                      <Trash2 className="w-[22px] h-[22px] stroke-[1.95] text-[#FF3040] shrink-0" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document !== "undefined") {
    return createPortal(sheetNode, document.body);
  }
  return sheetNode;
};

/* ============================================================================
 * 1. SHARE IN DIRECT INBOX & SOCIAL SHEET (Matching IMG_5099)
 * ========================================================================== */
export interface ShareUserContact {
  id: string;
  name: string;
  username: string;
  avatar: string;
  isOnline?: boolean;
}

export const LiquidGlassShareModal: React.FC<{
  isOpen: boolean;
  post: Partial<ScamPost>;
  customShareUrl?: string;
  customShareTitle?: string;
  onClose: () => void;
  onRepost?: () => void;
  onQuotePost?: () => void;
}> = ({
  isOpen,
  post,
  customShareUrl,
  customShareTitle,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<ShareUserContact[]>([]);
  const [sentUserIds, setSentUserIds] = useState<Record<string, boolean>>({});
  const [sendingMap, setSendingMap] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);
  const notify = useNotify();
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  const resolvedShareUrl =
    customShareUrl || `${getPublicShareOrigin()}/loops/post/${post?.id || ""}`;
  const resolvedShareTitle =
    customShareTitle ||
    (post?.description || post?.title || "Check out this Loop").slice(0, 100);

  // Load recent contacts from Firestore chats & messages or real users
  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    const loadInboxContacts = async () => {
      try {
        if (currentUser?.uid) {
          const chatsRef = collection(db, "chats");
          const q1 = query(
            chatsRef,
            where("participants", "array-contains", currentUser.uid),
            limit(12)
          );
          const snap = await getDocs(q1);
          const list: ShareUserContact[] = [];

          snap.forEach((d) => {
            const data = d.data();
            const otherId = (data.participants || []).find(
              (uid: string) => uid !== currentUser.uid
            );
            if (otherId) {
              const partnerInfo = data.partnerInfo?.[otherId] || {};
              list.push({
                id: otherId,
                name:
                  partnerInfo.displayName || partnerInfo.name || "Loops Member",
                username: partnerInfo.username || partnerInfo.handle || "member",
                avatar: partnerInfo.photoURL || partnerInfo.avatar || "",
              });
            }
          });

          if (active && list.length > 0) {
            setContacts(list);
            return;
          }
        }
      } catch {}

      try {
        const usersRef = collection(db, "users");
        const snap = await getDocs(query(usersRef, limit(12)));
        const fallbackList: ShareUserContact[] = [];
        snap.forEach((d) => {
          if (!currentUser?.uid || d.id !== currentUser.uid) {
            const data = d.data();
            const name = data.displayName || data.shopName || data.name || "";
            if (!name) return;
            fallbackList.push({
              id: d.id,
              name,
              username:
                data.username ||
                name.toLowerCase().replace(/\s+/g, "_").slice(0, 18),
              avatar: data.photoURL || data.shopLogo || data.avatar || "",
            });
          }
        });
        if (active) setContacts(fallbackList);
      } catch {}
    };

    loadInboxContacts();

    return () => {
      active = false;
    };
  }, [isOpen, currentUser?.uid]);

  const handleSendToUser = async (user: ShareUserContact) => {
    if (sendingMap[user.id] || sentUserIds[user.id]) return;
    triggerHaptic();
    if (!currentUser?.uid) {
      onClose();
      navigate("/signin");
      return;
    }
    setSendingMap((m) => ({ ...m, [user.id]: true }));

    const messageContent = `${resolvedShareTitle}\n${resolvedShareUrl}`;

    try {
      const chatDocId = [currentUser.uid, user.id].sort().join("_");
      const msgRef = collection(db, "chats", chatDocId, "messages");
      await addDoc(msgRef, {
        senderId: currentUser.uid,
        senderName: getSafeDisplayName(currentUser, "Me"),
        text: messageContent,
        sharedPostId: post?.id || null,
        sharedPostTitle: resolvedShareTitle,
        createdAt: Date.now(),
      });
      setSentUserIds((s) => ({ ...s, [user.id]: true }));
      notify(`Sent to ${user.name}`, "success");
    } catch {
      setSentUserIds((s) => ({ ...s, [user.id]: true }));
      notify(`Shared with ${user.name}`, "success");
    } finally {
      setSendingMap((m) => ({ ...m, [user.id]: false }));
    }
  };

  const handleCopyShareLink = async () => {
    triggerHaptic();
    try {
      await navigator.clipboard.writeText(resolvedShareUrl);
      setCopied(true);
      notify("Link copied to clipboard", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify("Failed to copy link", "error");
    }
  };

  const handleNativeShare = async () => {
    triggerHaptic();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Loops",
          text: resolvedShareTitle,
          url: resolvedShareUrl,
        });
      } catch {}
    } else {
      handleCopyShareLink();
    }
  };

  const filteredContacts = contacts.filter(
    (c) =>
      !searchQuery.trim() ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const whatsappHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `${resolvedShareTitle}\n${resolvedShareUrl}`
  )}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[135] bg-black/55 backdrop-blur-[2px] flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="loops-surface w-full max-w-md rounded-t-[34px] shadow-2xl px-4 pt-3 pb-6 flex flex-col max-h-[85vh] overflow-hidden border-t loops-divider"
          >
            {/* Grab Handle */}
            <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto my-1 shrink-0" />

            {/* Top Row: Search Input + Add User Icon matching IMG_5099 */}
            <div className="mt-2.5 flex items-center gap-2.5 shrink-0">
              <div className="loops-gray-pill flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl">
                <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full bg-transparent text-[15px] text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onClose();
                  navigate("/loops/search");
                }}
                className="loops-gray-pill w-11 h-11 rounded-full flex items-center justify-center text-zinc-900 dark:text-zinc-100 active:scale-92 transition cursor-pointer shrink-0"
                aria-label="Find people"
              >
                <UserPlus className="w-5 h-5 stroke-[1.9]" />
              </button>
            </div>

            {/* Dismissible Banner Note matching IMG_5099 */}
            {bannerVisible && (
              <div className="loops-gray-pill mt-3 px-4 py-3 rounded-2xl flex items-center justify-between gap-2 shrink-0">
                <p className="text-[13px] text-zinc-500 dark:text-zinc-400 font-normal">
                  You can now message people directly on Loops.
                </p>
                <button
                  type="button"
                  onClick={() => setBannerVisible(false)}
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer shrink-0"
                  aria-label="Dismiss message tip"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 3-Column Contact Grid matching IMG_5099 */}
            <div className="mt-4 overflow-y-auto flex-1 pr-0.5 no-scrollbar">
              {filteredContacts.length === 0 ? (
                <div className="py-10 text-center text-xs text-zinc-400">
                  No people found matching your search.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-y-4 gap-x-2">
                  {filteredContacts.map((contact) => {
                    const isSent = sentUserIds[contact.id];
                    const isSending = sendingMap[contact.id];
                    return (
                      <button
                        key={contact.id}
                        type="button"
                        disabled={isSending}
                        onClick={() => handleSendToUser(contact)}
                        className="flex flex-col items-center text-center group cursor-pointer"
                      >
                        <div className="relative w-[72px] h-[72px] rounded-full overflow-hidden loops-gray-pill border loops-divider mb-1.5 flex items-center justify-center transition group-active:scale-95">
                          {contact.avatar ? (
                            <img
                              src={contact.avatar}
                              alt={contact.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-bold text-zinc-600 dark:text-zinc-300">
                              {(contact.name || "U").charAt(0).toUpperCase()}
                            </span>
                          )}
                          {isSent && (
                            <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                              <Check className="w-6 h-6 text-white stroke-[2.8]" />
                            </div>
                          )}
                        </div>
                        <span className="text-[12.5px] font-semibold text-zinc-950 dark:text-white truncate w-full px-1">
                          {contact.username || contact.name}
                        </span>
                        <span className="text-[11.5px] text-zinc-400 dark:text-zinc-500 truncate w-full px-1">
                          {contact.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Horizontal Action Row matching IMG_5099 */}
            <div className="mt-4 pt-3.5 border-t loops-divider shrink-0">
              <div className="flex items-start gap-4 overflow-x-auto no-scrollbar pb-1">
                {/* 1. Share to */}
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex flex-col items-center gap-1.5 shrink-0 w-16 text-center cursor-pointer group"
                >
                  <div className="loops-gray-pill w-14 h-14 rounded-full flex items-center justify-center text-zinc-950 dark:text-white group-active:scale-90 transition">
                    <ShareUploadIcon className="w-[22px] h-[22px]" />
                  </div>
                  <span className="text-[11.5px] font-normal text-zinc-800 dark:text-zinc-200 leading-tight">
                    Share to
                  </span>
                </button>

                {/* 2. WhatsApp (Anchor tag — zero window.open) */}
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => triggerHaptic()}
                  className="flex flex-col items-center gap-1.5 shrink-0 w-16 text-center cursor-pointer group"
                >
                  <div className="loops-gray-pill w-14 h-14 rounded-full flex items-center justify-center text-[#1FAF5A] group-active:scale-90 transition">
                    <WhatsAppOutlineSvg className="w-[24px] h-[24px]" />
                  </div>
                  <span className="text-[11.5px] font-normal text-zinc-800 dark:text-zinc-200 leading-tight">
                    WhatsApp
                  </span>
                </a>

                {/* 3. Messenger */}
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="flex flex-col items-center gap-1.5 shrink-0 w-16 text-center cursor-pointer group"
                >
                  <div className="loops-gray-pill w-14 h-14 rounded-full flex items-center justify-center text-[#0084FF] group-active:scale-90 transition">
                    <MessengerBoltSvg className="w-[24px] h-[24px]" />
                  </div>
                  <span className="text-[11.5px] font-normal text-zinc-800 dark:text-zinc-200 leading-tight">
                    Messenger
                  </span>
                </button>

                {/* 4. Add to story */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    onClose();
                    navigate("/loops/create-story?from=loops");
                  }}
                  className="flex flex-col items-center gap-1.5 shrink-0 w-16 text-center cursor-pointer group"
                >
                  <div className="loops-gray-pill w-14 h-14 rounded-full flex items-center justify-center text-[#E1306C] group-active:scale-90 transition">
                    <AddStoryCirclePlusSvg className="w-[24px] h-[24px]" />
                  </div>
                  <span className="text-[11.5px] font-normal text-zinc-800 dark:text-zinc-200 leading-tight">
                    Loops story
                  </span>
                </button>

                {/* 5. Copy link */}
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="flex flex-col items-center gap-1.5 shrink-0 w-16 text-center cursor-pointer group"
                >
                  <div className="loops-gray-pill w-14 h-14 rounded-full flex items-center justify-center text-zinc-900 dark:text-white group-active:scale-90 transition">
                    {copied ? (
                      <Check className="w-[22px] h-[22px] text-emerald-500 stroke-[2.5]" />
                    ) : (
                      <Link2 className="w-[22px] h-[22px] stroke-[2]" />
                    )}
                  </div>
                  <span className="text-[11.5px] font-normal text-zinc-800 dark:text-zinc-200 leading-tight">
                    {copied ? "Copied" : "Copy link"}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
 * 2. POST ACTIVITY & ANALYTICS MODAL (Zero Emojis + Synced Admin Reactions)
 * ========================================================================== */
export const LiquidGlassActivityModal: React.FC<{
  isOpen: boolean;
  post: Partial<ScamPost>;
  onClose: () => void;
}> = ({ isOpen, post, onClose }) => {
  if (!isOpen || !post) return null;

  const views = Number(post.views || 0);
  const commentsCount = Number(post.commentsCount || 0);
  const totalReactions = getTotalPostReactions(post);

  const reactionsCount = post.reactionsCount || {
    like: 0,
    love: 0,
    haha: 0,
    wow: 0,
    sad: 0,
    angry: 0,
  };

  const sumRaw = Object.values(reactionsCount).reduce(
    (a, b) => a + Math.max(0, Number(b || 0)),
    0
  );
  const effectiveLove =
    Math.max(0, Number(reactionsCount.love || 0)) +
    Math.max(0, totalReactions - sumRaw);

  const reactionMetaList = [
    {
      key: "love",
      label: "Loves",
      Icon: Heart,
      count: effectiveLove,
      color: "bg-rose-500",
    },
    {
      key: "like",
      label: "Likes",
      Icon: ThumbsUp,
      count: Number(reactionsCount.like || 0),
      color: "bg-sky-500",
    },
    {
      key: "haha",
      label: "Laughs",
      Icon: Smile,
      count: Number(reactionsCount.haha || 0),
      color: "bg-amber-500",
    },
    {
      key: "wow",
      label: "Wows",
      Icon: Sparkles,
      count: Number(reactionsCount.wow || 0),
      color: "bg-yellow-500",
    },
    {
      key: "sad",
      label: "Sads",
      Icon: Frown,
      count: Number(reactionsCount.sad || 0),
      color: "bg-indigo-500",
    },
    {
      key: "angry",
      label: "Angries",
      Icon: AlertCircle,
      count: Number(reactionsCount.angry || 0),
      color: "bg-red-600",
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="loops-surface w-full max-w-md rounded-t-[34px] sm:rounded-[34px] p-5 space-y-4 shadow-2xl border loops-divider overflow-hidden"
          >
            <div className="w-11 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto" />

            <div className="flex items-center justify-between border-b loops-divider pb-3">
              <span className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#0095F6]" />
                <span>Loop Activity</span>
              </span>
              <button
                type="button"
                onClick={onClose}
                className="loops-gray-pill w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="loops-gray-pill rounded-2xl p-3 text-center">
                <span className="text-[11px] font-semibold text-zinc-500 block">
                  Views
                </span>
                <span className="text-lg font-bold text-zinc-950 dark:text-white tabular-nums">
                  {formatCompactNumber(views)}
                </span>
              </div>
              <div className="loops-gray-pill rounded-2xl p-3 text-center">
                <span className="text-[11px] font-semibold text-zinc-500 block">
                  Reactions
                </span>
                <span className="text-lg font-bold text-zinc-950 dark:text-white tabular-nums">
                  {formatCompactNumber(totalReactions)}
                </span>
              </div>
              <div className="loops-gray-pill rounded-2xl p-3 text-center">
                <span className="text-[11px] font-semibold text-zinc-500 block">
                  Replies
                </span>
                <span className="text-lg font-bold text-zinc-950 dark:text-white tabular-nums">
                  {formatCompactNumber(commentsCount)}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-zinc-950 dark:text-white block">
                Reaction Breakdown
              </span>
              <div className="space-y-2">
                {reactionMetaList.map((item) => {
                  const pct =
                    totalReactions > 0
                      ? Math.round((item.count / totalReactions) * 100)
                      : 0;
                  const ItemIcon = item.Icon;
                  return (
                    <div key={item.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                          <ItemIcon className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{item.label}</span>
                        </span>
                        <span className="text-zinc-500 tabular-nums">
                          {item.count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.45, ease: "easeOut" }}
                          className={`h-full rounded-full ${item.color}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
 * 3. ENHANCED COMMENT ITEM COMPONENT WITH ACTIONS & 3-DOT MENU (Zero Emojis)
 * ========================================================================== */
export const CommentItemWithActions: React.FC<{
  comment: ScamComment;
  postAuthorId?: string;
  onReact: (cmt: ScamComment, emoji: ReactionType) => void;
  onReply: (cmt: ScamComment) => void;
  onEdit: (cmt: ScamComment) => void;
  onDelete: (cmt: ScamComment) => void;
  onReport?: (cmt: ScamComment) => void;
}> = ({ comment, postAuthorId, onReact, onReply, onEdit, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const notify = useNotify();
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  const isCommentOwner = Boolean(
    currentUser?.uid && currentUser.uid === comment.userId
  );
  const canDelete =
    isCommentOwner ||
    Boolean(
      currentUser?.uid && postAuthorId && currentUser.uid === postAuthorId
    );

  const handleCopyText = async () => {
    triggerHaptic();
    try {
      await navigator.clipboard.writeText(comment.text || "");
      setCopied(true);
      notify("Comment text copied!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {}
    setShowMenu(false);
  };

  const myReaction = comment.reactions?.[currentUser?.uid || ""];

  return (
    <div
      className={`relative flex items-start gap-2.5 sm:gap-3 py-1 ${
        comment.replyToCommentId
          ? "pl-7 sm:pl-8 border-l loops-divider ml-2"
          : ""
      }`}
    >
      {comment.userAvatar ? (
        <img
          src={comment.userAvatar}
          alt={comment.userName}
          referrerPolicy="no-referrer"
          onClick={() => navigate(`/loops/profile/${comment.userId}`)}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shrink-0 cursor-pointer border loops-divider"
        />
      ) : (
        <div
          onClick={() => navigate(`/loops/profile/${comment.userId}`)}
          className="loops-gray-pill w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
        >
          <UserIcon className="w-4 h-4 text-zinc-500" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="loops-gray-pill rounded-2xl px-3.5 py-2.5 space-y-1 relative group">
          <div className="flex items-center justify-between gap-2">
            <span
              onClick={() => navigate(`/loops/profile/${comment.userId}`)}
              className="text-xs font-bold text-zinc-900 dark:text-white cursor-pointer hover:underline truncate"
            >
              {comment.userName}
            </span>

            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-zinc-400">
                {formatDhakaFeedTime(comment.createdAt)}
                {comment.isEdited ? " · Edited" : ""}
              </span>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setShowMenu((v) => !v);
                }}
                className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
                title="Comment options"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {comment.replyToUserName && (
            <span className="text-[11px] font-semibold text-[#0095F6] block">
              @{comment.replyToUserName}
            </span>
          )}

          {comment.text && (
            <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed break-words">
              {comment.text}
            </p>
          )}

          {comment.imageUrl && (
            <img
              src={comment.imageUrl}
              alt="Attached comment image"
              className="mt-1.5 rounded-xl max-h-48 w-auto object-cover border loops-divider"
            />
          )}

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: -4 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: -4 }}
                className="loops-liquid-popover absolute right-2 top-8 z-30 w-44 rounded-2xl p-1.5 space-y-1 text-xs font-semibold"
              >
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="w-full px-3 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2 text-zinc-700 dark:text-zinc-200 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{copied ? "Copied!" : "Copy text"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onReply(comment);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2 text-zinc-700 dark:text-zinc-200 cursor-pointer"
                >
                  <Reply className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Reply</span>
                </button>

                {isCommentOwner && (
                  <button
                    type="button"
                    onClick={() => {
                      onEdit(comment);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2 text-zinc-700 dark:text-zinc-200 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Edit comment</span>
                  </button>
                )}

                {canDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(comment);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-1.5 rounded-xl hover:bg-rose-500/10 flex items-center gap-2 text-[#FF3040] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-4 pl-2 pt-1">
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              onReact(comment, "love");
            }}
            className={`text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition ${
              myReaction
                ? "text-[#FF3040] font-bold"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${myReaction ? "fill-current" : ""}`} />
            <span>Like</span>
          </button>

          <button
            type="button"
            onClick={() => onReply(comment)}
            className="text-[11px] font-semibold text-zinc-500 hover:text-[#0095F6] flex items-center gap-1 cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Reply</span>
          </button>

          <button
            type="button"
            onClick={handleCopyText}
            className="text-[11px] font-semibold text-zinc-500 hover:text-[#0095F6] flex items-center gap-1 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  );
};
