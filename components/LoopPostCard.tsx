import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { ScamPost, UserProfile } from "../types";
import {
  isScamPostRecord,
  VoiceNoteCard,
} from "./NewsPostMedia";
import { resolvePostVideoSource } from "../lib/videoEmbed";
import { NewsVideoPlayer } from "./NewsVideoPlayer";
import { NewsRichText, NewsLinkPreviewCards } from "./NewsRichText";
import { DottedGhostCatIcon } from "./ComposerLiquidGlassSheets";
import { LoopPostOptionsSheet } from "./LiquidGlassPostInteractions";
import {
  getTotalPostReactions,
  hasUserReactedToPost,
} from "../lib/feedAlgorithm";
import { triggerHaptic } from "../lib/haptics";
import { toggleFollowUser } from "../lib/follow";
import { getSafePublicUsername, getSafeDisplayName } from "../lib/utils";

export function formatLoopCompactTime(timestamp?: number | null): string {
  if (!timestamp || Number.isNaN(Number(timestamp))) return "now";
  const diffSec = Math.max(0, Math.floor((Date.now() - Number(timestamp)) / 1000));
  if (diffSec < 45) return "now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${Math.max(1, months)}mo`;
  const years = Math.floor(days / 365);
  return `${Math.max(1, years)}y`;
}

export function formatLoopRelativeTime(timestamp?: number | null): string {
  if (!timestamp || Number.isNaN(Number(timestamp))) return "Just now";
  const diffSec = Math.max(0, Math.floor((Date.now() - Number(timestamp)) / 1000));
  if (diffSec < 60) return "Just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return mins === 1 ? "1 minute ago" : `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? "1 day ago" : `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (days < 30) return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export function formatLoopCount(count?: number | null): string {
  const n = Number(count || 0);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n >= 1_000_000) {
    const val = (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1);
    return `${val.replace(/\.0$/, "")}M`;
  }
  if (n >= 10_000) {
    const val = (n / 1_000).toFixed(n >= 100_000 ? 0 : 1);
    return `${val.replace(/\.0$/, "")}K`;
  }
  return Math.trunc(n).toLocaleString();
}

export const VerifiedLoopBadge: React.FC<{ className?: string }> = ({
  className = "w-3.5 h-3.5",
}) => (
  <svg
    className={`${className} text-[#0095F6] shrink-0 inline-block`}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-label="Verified"
  >
    <path d="M12 2l2.39 1.98 3.08-.41.88 2.98 2.83 1.24-.98 2.95 1.58 2.66-2.29 2.09.16 3.1-3.05.58-1.48 2.72L12 20.66l-3.12 1.23-1.48-2.72-3.05-.58.16-3.1-2.29-2.09 1.58-2.66-.98-2.95 2.83-1.24.88-2.98 3.08.41L12 2zm-1.15 13.42l5.3-5.3-1.41-1.42-3.89 3.89-1.89-1.89-1.41 1.41 3.3 3.31z" />
  </svg>
);

/* Exact IMG_5126 & IMG_5123 Post Header Asymmetric Two-Line Menu Icon (replaces 3 dots) */
export const LoopPostMenuLinesIcon: React.FC<{ className?: string }> = ({
  className = "w-[22px] h-[22px]",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.05"
    strokeLinecap="round"
  >
    <line x1="3" y1="8.5" x2="21" y2="8.5" />
    <line x1="3" y1="15.5" x2="13.8" y2="15.5" />
  </svg>
);

/* Exact IMG_5126 Heart Icon */
export const LoopHeartIcon: React.FC<{
  className?: string;
  filled?: boolean;
}> = ({ className = "w-[23px] h-[23px]", filled = false }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={filled ? "1.6" : "1.95"}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938Z" />
  </svg>
);

/* Exact IMG_5126 Circular Speech Bubble Icon */
export const LoopCommentIcon: React.FC<{ className?: string }> = ({
  className = "w-[23px] h-[23px]",
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
    <path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" />
  </svg>
);

/* Exact IMG_5126 Vertical Rounded-Loop Repost Icon */
export const LoopRepeatIcon: React.FC<{ className?: string }> = ({
  className = "w-[23px] h-[23px]",
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
    <path d="M7 17.5V7a3 3 0 0 1 3-3h6.2" />
    <polyline points="13.4 1.5 16.4 4 13.4 6.5" />
    <path d="M17 6.5V17a3 3 0 0 1-3 3H7.8" />
    <polyline points="10.6 17.5 7.6 20 10.6 22.5" />
  </svg>
);

/* Exact IMG_5126 & IMG_5123 Horizontal-Top Paper Plane Send Icon */
export const LoopSendIcon: React.FC<{ className?: string }> = ({
  className = "w-[23px] h-[23px]",
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
    <path d="M21.4 3.8H2.8L9.5 10.6L12.2 20.2L21.4 3.8Z" />
    <path d="M21.4 3.8L9.5 10.6" />
  </svg>
);

/* Exact IMG_5126 Right-Aligned Bookmark Save Ribbon Icon */
export const LoopBookmarkIcon: React.FC<{
  className?: string;
  filled?: boolean;
}> = ({ className = "w-[23px] h-[23px]", filled = false }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="1.95"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21l-7-4.8L5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
  </svg>
);

export interface LoopPostCardProps {
  post: ScamPost;
  authorProfile?: Partial<UserProfile> | Record<string, any> | null;
  currentUser?: {
    uid: string;
    displayName?: string | null;
    email?: string | null;
    photoURL?: string | null;
    username?: string | null;
  } | null;
  isFollowingAuthor?: boolean;
  isSaved?: boolean;
  canManage?: boolean;
  repostedHeaderLabel?: string | null;
  onToggleLike: (post: ScamPost) => void;
  onToggleRepost: (post: ScamPost) => void;
  onOpenShare: (post: ScamPost) => void;
  onToggleSave?: (postId: string) => void;
  onCopyLink?: (postId: string) => void;
  onEditPost?: (post: ScamPost) => void;
  onDeletePost?: (post: ScamPost) => void;
  onRequireAuth?: () => void;
}

export const LoopPostCard: React.FC<LoopPostCardProps> = ({
  post,
  authorProfile,
  currentUser,
  isFollowingAuthor = false,
  isSaved = false,
  canManage = false,
  repostedHeaderLabel,
  onToggleLike,
  onToggleRepost,
  onOpenShare,
  onToggleSave,
  onCopyLink,
  onEditPost,
  onDeletePost,
  onRequireAuth,
}) => {
  const navigate = useNavigate();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [optimisticFollowing, setOptimisticFollowing] = useState<boolean | null>(
    null
  );
  const [optimisticSaved, setOptimisticSaved] = useState<boolean | null>(null);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [hiddenLocally, setHiddenLocally] = useState(false);

  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    setOptimisticFollowing(null);
  }, [isFollowingAuthor, post.reporterId]);

  useEffect(() => {
    setOptimisticSaved(null);
  }, [isSaved, post.id]);

  const effectiveFollowing =
    optimisticFollowing !== null ? optimisticFollowing : isFollowingAuthor;

  const effectiveSaved =
    optimisticSaved !== null ? optimisticSaved : isSaved;

  const isOwnPost = Boolean(
    currentUser?.uid && post.reporterId && currentUser.uid === post.reporterId
  );

  const rawHandle =
    getSafePublicUsername(authorProfile) ||
    (post.reporterName || "")
      .trim()
      .replace(/^@+/, "")
      .toLowerCase()
      .replace(/\s+/g, "_") ||
    "member";

  const displayUsername =
    (authorProfile?.username &&
      String(authorProfile.username).replace(/^@+/, "").trim()) ||
    getSafeDisplayName(authorProfile, post.reporterName || rawHandle);

  const avatarUrl =
    (authorProfile?.photoURL && String(authorProfile.photoURL).trim()) ||
    (post.reporterAvatar && String(post.reporterAvatar).trim()) ||
    "";

  const avatarInitial = (displayUsername || "U").trim().charAt(0).toUpperCase();

  const isVerified = Boolean(
    authorProfile?.isVerifiedBadge ||
      authorProfile?.kycStatus === "approved" ||
      authorProfile?.role === "admin"
  );

  const totalReactionsCount = useMemo(
    () => getTotalPostReactions(post),
    [
      post.reactions,
      post.reactionsCount,
      post.reactionsUsers,
      post.votedUserIds,
      post.votes,
    ]
  );

  const userLiked = hasUserReactedToPost(post, currentUser?.uid);
  const isGhost = Boolean(post.isGhostPost);
  const ghostHoursLeft = useMemo(() => {
    if (!isGhost) return 0;
    const expiry =
      Number(post.expiresAt || 0) ||
      Number(post.createdAt || Date.now()) + 24 * 3600 * 1000;
    return Math.max(1, Math.ceil((expiry - Date.now()) / 3_600_000));
  }, [isGhost, post.expiresAt, post.createdAt]);

  const repostsCount = useMemo(() => {
    const byIds = Array.isArray(post.repostedByUserIds)
      ? post.repostedByUserIds.filter(Boolean).length
      : 0;
    return Math.max(byIds, Number(post.repostsCount || 0));
  }, [post.repostedByUserIds, post.repostsCount]);

  const userReposted = Boolean(
    currentUser?.uid &&
      Array.isArray(post.repostedByUserIds) &&
      post.repostedByUserIds.includes(currentUser.uid)
  );

  const commentsCount = Math.max(0, Number(post.commentsCount || 0));
  const sharesCount = Math.max(0, Number(post.sharesCount || 0));

  const isScamAlert = isScamPostRecord(post);
  const repostBannerText =
    repostedHeaderLabel ||
    (post.repostedByUserName
      ? `${post.repostedByUserName} reposted`
      : null);

  const images = useMemo(
    () => (Array.isArray(post.images) ? post.images.filter(Boolean) : []),
    [post.images]
  );
  const resolvedVideo = useMemo(
    () => resolvePostVideoSource(post),
    [post.videoUrl, post.description]
  );
  const hasPrimaryVisualMedia =
    images.length > 0 || Boolean(resolvedVideo) || Boolean(post.gifUrl);

  const cleanTitle = (post.title || "").trim();
  const cleanDescription = (post.description || "").trim();
  const showDistinctTitle =
    Boolean(cleanTitle) &&
    cleanTitle.length > 0 &&
    !cleanDescription.toLowerCase().startsWith(cleanTitle.toLowerCase()) &&
    cleanTitle.toLowerCase() !== "post" &&
    cleanTitle.toLowerCase() !== "loop";

  const combinedCaption = useMemo(() => {
    if (showDistinctTitle && cleanDescription) {
      return `${cleanTitle} — ${cleanDescription}`;
    }
    return cleanDescription || (showDistinctTitle ? cleanTitle : "");
  }, [showDistinctTitle, cleanTitle, cleanDescription]);

  const headerSubtitle = useMemo(() => {
    if (post.locationTag && String(post.locationTag).trim()) {
      return String(post.locationTag).trim();
    }
    if (post.music?.title) {
      return post.music.artist
        ? `${post.music.title} · ${post.music.artist}`
        : post.music.title;
    }
    if (isScamAlert) {
      return post.scamLocation
        ? `Scam Alert · ${post.scamLocation}`
        : "Scam Alert";
    }
    if (!isOwnPost && !effectiveFollowing) {
      return "Suggested for you";
    }
    if (post.postTag && String(post.postTag).trim()) {
      return String(post.postTag).trim();
    }
    return "";
  }, [
    post.locationTag,
    post.music,
    isScamAlert,
    post.scamLocation,
    isOwnPost,
    effectiveFollowing,
    post.postTag,
  ]);

  if (hiddenLocally) {
    return null;
  }

  const handleFollowAction = async (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    if (!currentUser?.uid) {
      onRequireAuth?.();
      return;
    }
    if (!post.reporterId || isOwnPost || followBusy) return;

    const nextState = !effectiveFollowing;
    setOptimisticFollowing(nextState);
    setFollowBusy(true);
    try {
      const res = await toggleFollowUser({
        targetUid: post.reporterId,
        targetName: displayUsername,
        currentUser,
        currentlyFollowing: effectiveFollowing,
      });
      if (!res.ok) {
        setOptimisticFollowing(effectiveFollowing);
      } else {
        setOptimisticFollowing(res.isFollowing);
      }
    } catch {
      setOptimisticFollowing(effectiveFollowing);
    } finally {
      setFollowBusy(false);
    }
  };

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    const next = !effectiveSaved;
    setOptimisticSaved(next);
    if (onToggleSave) {
      onToggleSave(post.id);
      return;
    }
    try {
      const key = "deep_saved_scam_posts";
      const list: string[] = JSON.parse(localStorage.getItem(key) || "[]");
      const updated = next
        ? Array.from(new Set([post.id, ...list]))
        : list.filter((id) => id !== post.id);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {}
  };

  const openPostDetails = () => {
    triggerHaptic();
    navigate(`/loops/post/${post.id}`);
  };

  const openAuthorProfile = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    triggerHaptic();
    if (post.reporterId) {
      navigate(`/loops/profile/${post.reporterId}`);
    }
  };

  /* Preserve Ghost Post Dashed Speech-Bubble Design (IMG_5112) */
  if (isGhost) {
    return (
      <article
        onClick={openPostDetails}
        className="loops-surface border-b loops-divider px-4 py-3.5 transition-colors cursor-pointer select-text"
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={openAuthorProfile}
            className="w-10 h-10 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-1 ring-black/[0.06] dark:ring-white/10 flex items-center justify-center shrink-0 cursor-pointer"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayUsername}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[14px] font-bold text-zinc-700 dark:text-zinc-200">
                {avatarInitial}
              </span>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={openAuthorProfile}
                className="text-[14.5px] font-semibold text-[#0f0f0f] dark:text-[#f5f5f5] hover:underline truncate cursor-pointer"
              >
                {displayUsername}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic();
                  setMoreMenuOpen(true);
                }}
                aria-label="Post options"
                className="w-8 h-8 -mr-1.5 rounded-full flex items-center justify-center text-[#0f0f0f] dark:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
              >
                <LoopPostMenuLinesIcon className="w-[20px] h-[20px]" />
              </button>
            </div>

            {combinedCaption && (
              <div className="mt-1.5 inline-block max-w-full rounded-[24px] rounded-tl-[8px] border-[1.6px] border-dashed border-zinc-400/80 dark:border-zinc-600 bg-zinc-50/90 dark:bg-zinc-900/70 px-4 py-3 text-[15px] leading-[1.45] text-[#0f0f0f] dark:text-[#f3f4f6] whitespace-pre-wrap break-words">
                <NewsRichText
                  text={combinedCaption}
                  onHashtagClick={(tag) =>
                    navigate(`/loops/search?tag=${encodeURIComponent(tag)}`)
                  }
                />
              </div>
            )}

            <div
              className="mt-2.5 flex items-center gap-4 text-[#0f0f0f] dark:text-zinc-200"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onToggleLike(post);
                }}
                className={`inline-flex items-center gap-1.5 py-1 cursor-pointer active:scale-90 transition ${
                  userLiked ? "text-[#FF3040]" : ""
                }`}
              >
                <LoopHeartIcon className="w-[21px] h-[21px]" filled={userLiked} />
                {totalReactionsCount > 0 && (
                  <span className="text-[13.5px] font-semibold tabular-nums">
                    {formatLoopCount(totalReactionsCount)}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={openPostDetails}
                className="inline-flex items-center gap-1.5 py-1 cursor-pointer active:scale-90 transition"
              >
                <LoopCommentIcon className="w-[21px] h-[21px]" />
                {commentsCount > 0 && (
                  <span className="text-[13.5px] font-semibold tabular-nums">
                    {formatLoopCount(commentsCount)}
                  </span>
                )}
              </button>

              <span className="inline-flex items-center gap-1.5 py-1 text-[13.5px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                <DottedGhostCatIcon className="w-[18px] h-[18px] shrink-0" />
                <span>{ghostHoursLeft}h left</span>
              </span>
            </div>
          </div>
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <LoopPostOptionsSheet
            isOpen={moreMenuOpen}
            post={post}
            isSaved={effectiveSaved}
            canManage={canManage || isOwnPost}
            isFollowingAuthor={effectiveFollowing}
            onClose={() => setMoreMenuOpen(false)}
            onToggleSave={onToggleSave ? () => onToggleSave(post.id) : undefined}
            onCopyLink={onCopyLink ? () => onCopyLink(post.id) : undefined}
            onOpenShare={() => onOpenShare(post)}
            onEditPost={onEditPost ? () => onEditPost(post) : undefined}
            onDeletePost={onDeletePost ? () => onDeletePost(post) : undefined}
            onPostHidden={() => setHiddenLocally(true)}
          />
        </div>
      </article>
    );
  }

  /* Standard Full-Bleed Loops Post Card matching IMG_5126 & IMG_5123 */
  const cleanSingleLinePreview = combinedCaption.replace(/\s+/g, " ").trim();
  const shouldTruncateCaption =
    hasPrimaryVisualMedia &&
    !captionExpanded &&
    (cleanSingleLinePreview.length > 56 || combinedCaption.includes("\n"));

  return (
    <article className="loops-surface border-b loops-divider w-full select-text">
      {/* Optional Repost Kicker */}
      {repostBannerText && (
        <div
          onClick={openPostDetails}
          className="flex items-center gap-1.5 px-3.5 pt-2.5 -mb-1 text-[12px] text-zinc-500 dark:text-zinc-400 cursor-pointer"
        >
          <LoopRepeatIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{repostBannerText}</span>
        </div>
      )}

      {/* 1. Card Header matching IMG_5126 & IMG_5123 */}
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={openAuthorProfile}
            className="w-9 h-9 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-1 ring-black/[0.06] dark:ring-white/10 flex items-center justify-center shrink-0 cursor-pointer focus:outline-none"
            aria-label={`Visit ${displayUsername}'s profile`}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayUsername}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[14px] font-bold text-zinc-700 dark:text-zinc-200">
                {avatarInitial}
              </span>
            )}
          </button>

          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-1 min-w-0">
              <button
                type="button"
                onClick={openAuthorProfile}
                className="text-[14px] font-semibold text-[#0f0f0f] dark:text-[#f5f5f5] hover:underline truncate cursor-pointer text-left"
              >
                {displayUsername}
              </button>
              {isVerified && <VerifiedLoopBadge className="w-3.5 h-3.5" />}
            </div>

            {headerSubtitle && (
              <p className="text-[12px] font-normal text-[#262626] dark:text-zinc-400 truncate mt-0.5 leading-tight">
                {headerSubtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right Controls: Soft Gray "Follow" Button + Two-Line Menu Button (IMG_5126) */}
        <div className="flex items-center gap-3 shrink-0">
          {!isOwnPost && post.reporterId && (
            <button
              type="button"
              disabled={followBusy}
              onClick={handleFollowAction}
              className={
                effectiveFollowing
                  ? "px-3 py-1.5 rounded-[9px] border loops-divider text-[13px] font-semibold text-zinc-600 dark:text-zinc-300 active:scale-95 transition cursor-pointer"
                  : "loops-card-follow-pill px-4 py-1.5 rounded-[9px] text-[13.5px] font-semibold active:scale-95 transition cursor-pointer"
              }
            >
              {effectiveFollowing ? "Following" : "Follow"}
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic();
              setMoreMenuOpen(true);
            }}
            aria-label="About this post and options"
            className="w-8 h-8 -mr-1 rounded-full flex items-center justify-center text-[#0f0f0f] dark:text-[#f5f5f5] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:scale-92 transition cursor-pointer"
          >
            <LoopPostMenuLinesIcon className="w-[22px] h-[22px]" />
          </button>
        </div>
      </div>

      {/* Optional Scam Alert Banner if Scam Report */}
      {isScamAlert && (
        <div className="px-3.5 pb-2">
          <div className="inline-flex flex-wrap items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[12px] font-semibold">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>Scam Alert</span>
            {post.scammerName && <span>· {post.scammerName}</span>}
            {post.scammerPhone && <span>· {post.scammerPhone}</span>}
          </div>
        </div>
      )}

      {/* 2A. Full-Bleed Edge-to-Edge Visual Media (Photos, Carousel, Video, GIF — Zero Radius) */}
      {images.length === 1 && (
        <div
          onClick={() => {
            triggerHaptic();
            navigate(`/loops/photo/${post.id}/0`);
          }}
          className="loops-edge-media w-full rounded-none bg-zinc-100 dark:bg-zinc-900 overflow-hidden cursor-pointer"
        >
          <img
            src={images[0]}
            alt={cleanTitle || displayUsername}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full max-h-[640px] object-cover block rounded-none"
          />
        </div>
      )}

      {images.length > 1 && (
        <div className="w-full">
          <div
            onTouchStart={(e) => {
              touchStartXRef.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              if (touchStartXRef.current === null) return;
              const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
              const delta = touchStartXRef.current - endX;
              touchStartXRef.current = null;
              if (Math.abs(delta) > 40) {
                triggerHaptic();
                if (delta > 0 && carouselIdx < images.length - 1) {
                  setCarouselIdx((i) => i + 1);
                } else if (delta < 0 && carouselIdx > 0) {
                  setCarouselIdx((i) => i - 1);
                }
              }
            }}
            className="loops-edge-media relative w-full rounded-none bg-zinc-100 dark:bg-zinc-900 overflow-hidden group"
          >
            <img
              src={images[carouselIdx] || images[0]}
              alt={`${displayUsername} slide ${carouselIdx + 1}`}
              loading="lazy"
              referrerPolicy="no-referrer"
              onClick={() => {
                triggerHaptic();
                navigate(`/loops/photo/${post.id}/${carouselIdx}`);
              }}
              className="w-full max-h-[640px] object-cover block cursor-pointer select-none rounded-none"
            />

            {/* Top-Right Liquid-Glass Image Count Pill (Strictly only when > 1 image) */}
            <div className="loops-media-count-pill absolute top-3 right-3 z-20 px-2.5 py-1 text-[12px] font-semibold tabular-nums leading-none select-none pointer-events-none">
              {carouselIdx + 1}/{images.length}
            </div>

            {carouselIdx > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic();
                  setCarouselIdx((i) => Math.max(0, i - 1));
                }}
                aria-label="Previous slide"
                className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-white shadow-md items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {carouselIdx < images.length - 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic();
                  setCarouselIdx((i) => Math.min(images.length - 1, i + 1));
                }}
                aria-label="Next slide"
                className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-white shadow-md items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Centered Carousel Pagination Dots BELOW Media matching IMG_5126 */}
          <div className="flex items-center justify-center gap-1.5 pt-3 pb-0.5">
            {images.map((_, idx) => {
              const isCurrent = idx === carouselIdx;
              const dist = Math.abs(idx - carouselIdx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCarouselIdx(idx);
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

      {images.length === 0 && resolvedVideo && (
        <div className="loops-edge-media w-full rounded-none overflow-hidden">
          <NewsVideoPlayer videoSource={resolvedVideo} />
        </div>
      )}

      {images.length === 0 && !resolvedVideo && post.gifUrl && (
        <div
          onClick={openPostDetails}
          className="loops-edge-media relative w-full rounded-none bg-zinc-100 dark:bg-zinc-900 overflow-hidden cursor-pointer"
        >
          <img
            src={post.gifUrl}
            alt="GIF"
            referrerPolicy="no-referrer"
            className="w-full max-h-[520px] object-cover block rounded-none"
          />
          <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md bg-black/65 text-white text-[10px] font-bold tracking-wider">
            GIF
          </span>
        </div>
      )}

      {/* 2B. Text-Only Body (when post has no primary image/video/gif) */}
      {!hasPrimaryVisualMedia && combinedCaption && (
        <div
          onClick={openPostDetails}
          className={`px-3.5 pt-1 pb-2 text-[#0f0f0f] dark:text-[#f3f4f6] whitespace-pre-wrap break-words cursor-pointer ${
            post.textStyle === "large"
              ? "text-[18px] font-medium leading-[1.42]"
              : post.textStyle === "quote"
              ? "text-[16px] italic pl-6 border-l-2 border-zinc-300 dark:border-zinc-700 leading-[1.48]"
              : "text-[15px] font-normal leading-[1.46]"
          }`}
        >
          <NewsRichText
            text={combinedCaption}
            onHashtagClick={(tag) =>
              navigate(`/loops/search?tag=${encodeURIComponent(tag)}`)
            }
          />
        </div>
      )}

      {/* Voice Note & Link Preview if attached */}
      {post.audioUrl && (
        <div className="px-3.5 py-2" onClick={(e) => e.stopPropagation()}>
          <VoiceNoteCard
            audioUrl={post.audioUrl}
            durationSec={post.audioDuration}
            waveform={post.audioWaveform}
          />
        </div>
      )}

      {!hasPrimaryVisualMedia && cleanDescription && (
        <div className="px-3.5 pb-1" onClick={(e) => e.stopPropagation()}>
          <NewsLinkPreviewCards text={cleanDescription} />
        </div>
      )}

      {/* 3. Engagement Action Row matching IMG_5126: Heart, Comment, Repost, Send ... Bookmark */}
      <div className="px-3.5 pt-3 pb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          {/* Like */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic();
              onToggleLike(post);
            }}
            aria-label="Like"
            className={`inline-flex items-center gap-1.5 transition active:scale-90 cursor-pointer ${
              userLiked
                ? "text-[#FF3040]"
                : "text-[#0f0f0f] dark:text-[#f5f5f5] hover:opacity-75"
            }`}
          >
            <LoopHeartIcon className="w-[24px] h-[24px]" filled={userLiked} />
            {totalReactionsCount > 0 && (
              <span className="text-[14px] font-semibold tabular-nums">
                {formatLoopCount(totalReactionsCount)}
              </span>
            )}
          </button>

          {/* Comment */}
          <button
            type="button"
            onClick={openPostDetails}
            aria-label="Comments"
            className="inline-flex items-center gap-1.5 text-[#0f0f0f] dark:text-[#f5f5f5] hover:opacity-75 transition active:scale-90 cursor-pointer"
          >
            <LoopCommentIcon className="w-[24px] h-[24px]" />
            {commentsCount > 0 && (
              <span className="text-[14px] font-semibold tabular-nums">
                {formatLoopCount(commentsCount)}
              </span>
            )}
          </button>

          {/* Repost */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic();
              onToggleRepost(post);
            }}
            aria-label="Repost"
            className={`inline-flex items-center gap-1.5 transition active:scale-90 cursor-pointer ${
              userReposted
                ? "text-[#00BA7C]"
                : "text-[#0f0f0f] dark:text-[#f5f5f5] hover:opacity-75"
            }`}
          >
            <LoopRepeatIcon className="w-[23px] h-[23px]" />
            {repostsCount > 0 && (
              <span className="text-[14px] font-semibold tabular-nums">
                {formatLoopCount(repostsCount)}
              </span>
            )}
          </button>

          {/* Send / Share */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic();
              onOpenShare(post);
            }}
            aria-label="Share"
            className="inline-flex items-center gap-1.5 text-[#0f0f0f] dark:text-[#f5f5f5] hover:opacity-75 transition active:scale-90 cursor-pointer"
          >
            <LoopSendIcon className="w-[23px] h-[23px]" />
            {sharesCount > 0 && (
              <span className="text-[14px] font-semibold tabular-nums">
                {formatLoopCount(sharesCount)}
              </span>
            )}
          </button>
        </div>

        {/* Right: Bookmark Save Ribbon */}
        <button
          type="button"
          onClick={handleBookmarkClick}
          aria-label={effectiveSaved ? "Unsave post" : "Save post"}
          className="text-[#0f0f0f] dark:text-[#f5f5f5] hover:opacity-75 transition active:scale-90 cursor-pointer"
        >
          <LoopBookmarkIcon
            className="w-[23px] h-[23px]"
            filled={effectiveSaved}
          />
        </button>
      </div>

      {/* 4. Inline Caption Row below Action Bar for Visual Posts (matching IMG_5126) */}
      {hasPrimaryVisualMedia && combinedCaption && (
        <div
          onClick={() => {
            if (!shouldTruncateCaption) openPostDetails();
          }}
          className="px-3.5 pb-1 text-[14px] leading-[1.42] text-[#0f0f0f] dark:text-[#f5f5f5] break-words"
        >
          <button
            type="button"
            onClick={openAuthorProfile}
            className="font-semibold mr-1.5 hover:underline cursor-pointer inline"
          >
            {displayUsername}
          </button>
          {shouldTruncateCaption ? (
            <>
              <span>{cleanSingleLinePreview.slice(0, 52).trimEnd()}... </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic();
                  setCaptionExpanded(true);
                }}
                className="text-[#737373] dark:text-zinc-400 font-normal cursor-pointer hover:underline inline"
              >
                more
              </button>
            </>
          ) : (
            <span className="whitespace-pre-wrap">
              <NewsRichText
                text={combinedCaption}
                onHashtagClick={(tag) =>
                  navigate(`/loops/search?tag=${encodeURIComponent(tag)}`)
                }
              />
            </span>
          )}
        </div>
      )}

      {/* 5. Relative Timestamp Footer matching IMG_5126 ("3 days ago") */}
      <div
        onClick={openPostDetails}
        className="px-3.5 pb-3.5 pt-0.5 text-[12px] text-[#737373] dark:text-zinc-400 font-normal cursor-pointer"
      >
        {formatLoopRelativeTime(post.createdAt)}
        {post.isEdited ? " · Edited" : ""}
      </div>

      {/* Shared "About this post" Options Sheet (IMG_5127) */}
      <LoopPostOptionsSheet
        isOpen={moreMenuOpen}
        post={post}
        isSaved={effectiveSaved}
        canManage={canManage || isOwnPost}
        isFollowingAuthor={effectiveFollowing}
        onClose={() => setMoreMenuOpen(false)}
        onToggleSave={onToggleSave ? () => onToggleSave(post.id) : undefined}
        onCopyLink={onCopyLink ? () => onCopyLink(post.id) : undefined}
        onOpenShare={() => onOpenShare(post)}
        onEditPost={onEditPost ? () => onEditPost(post) : undefined}
        onDeletePost={onDeletePost ? () => onDeletePost(post) : undefined}
        onPostHidden={() => setHiddenLocally(true)}
      />
    </article>
  );
};

export default LoopPostCard;
