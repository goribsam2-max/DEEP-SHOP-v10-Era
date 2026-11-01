import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Pause,
  Play,
  TrendingUp,
  X,
  Bookmark,
  Plus,
  Check,
  Trash2,
  Search,
  FolderPlus,
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { ScamPost } from "../types";
import {
  resolvePostVideoSource,
  toPlayableAudioUrl,
  toPlayableMediaUrl,
} from "../lib/videoEmbed";
import {
  formatCompactNumber,
  getSafePublicUsername,
} from "../lib/utils";
import { triggerHaptic } from "../lib/haptics";
import { useNotify } from "./Notifications";
import { VerifiedLoopBadge } from "./LoopPostCard";
import { LoopsSvgIcon } from "./LoopsSvgIcon";
import {
  AVAILABLE_TRANSLATION_LANGUAGES,
  useSavedCollections,
  useTranslationPrefs,
} from "../lib/loopsSavedAndTranslation";

/* ============================================================================
 * 1. PLAYBACK BOTTOM SHEET (Exact IMG_5299)
 * ========================================================================== */
export interface ReelPlaybackSheetProps {
  isOpen: boolean;
  onClose: () => void;
  autoScroll: boolean;
  onToggleAutoScroll: () => void;
  closedCaptions: boolean;
  onToggleClosedCaptions: () => void;
  onEnterFullScreen: () => void;
}

export const ReelPlaybackSheet: React.FC<ReelPlaybackSheetProps> = ({
  isOpen,
  onClose,
  autoScroll,
  onToggleAutoScroll,
  closedCaptions,
  onToggleClosedCaptions,
  onEnterFullScreen,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[130] flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/55 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 390, damping: 35 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-[131] w-full max-w-[480px] mx-auto rounded-t-[32px] bg-white text-zinc-950 dark:bg-[#161618] dark:text-white px-4 pt-3 pb-[calc(1.75rem+env(safe-area-inset-bottom))] shadow-2xl border-t border-zinc-200/70 dark:border-white/10"
          >
            {/* Centered Drag Handle */}
            <div className="w-11 h-1 rounded-full bg-zinc-500/75 dark:bg-zinc-500 mx-auto" />

            {/* Centered Title */}
            <h2 className="text-[18px] font-bold tracking-tight text-center text-zinc-950 dark:text-white mt-4 mb-5">
              Playback
            </h2>

            {/* Single Inner Rounded Card (Exact IMG_5299) */}
            <div className="rounded-[24px] bg-[#F2F4F7] dark:bg-[#222328] py-2 px-1">
              {/* 1. View full-screen */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onClose();
                  onEnterFullScreen();
                }}
                className="w-full min-h-[54px] px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-left hover:bg-black/[0.035] dark:hover:bg-white/[0.04] active:scale-[0.99] transition cursor-pointer"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <LoopsSvgIcon
                    name="loops-reel-fullscreen"
                    className="w-6 h-6 text-zinc-950 dark:text-white"
                  />
                  <span className="text-[16px] font-normal text-zinc-950 dark:text-white whitespace-nowrap">
                    View full-screen
                  </span>
                </div>
              </button>

              {/* 2. Auto-scroll + New Pill + Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={autoScroll}
                onClick={() => {
                  triggerHaptic();
                  onToggleAutoScroll();
                }}
                className="w-full min-h-[54px] px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-left hover:bg-black/[0.035] dark:hover:bg-white/[0.04] transition cursor-pointer"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <LoopsSvgIcon
                    name="loops-reel-autoscroll"
                    className="w-6 h-6 text-zinc-950 dark:text-white"
                  />
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[16px] font-normal text-zinc-950 dark:text-white whitespace-nowrap">
                      Auto-scroll
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#4B55F5] text-white text-[12px] font-bold leading-snug whitespace-nowrap shrink-0">
                      New
                    </span>
                  </div>
                </div>

                <span
                  className={`w-[52px] h-[30px] rounded-full p-[3px] flex items-center transition-colors duration-200 shrink-0 ${
                    autoScroll
                      ? "bg-[#4B55F5]"
                      : "bg-[#5A6069] dark:bg-zinc-600"
                  }`}
                >
                  <span
                    className={`w-[26px] h-[24px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      autoScroll ? "translate-x-[20px]" : "translate-x-0"
                    }`}
                  />
                </span>
              </button>

              {/* 3. Closed captions */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onToggleClosedCaptions();
                }}
                className="w-full min-h-[54px] px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-left hover:bg-black/[0.035] dark:hover:bg-white/[0.04] active:scale-[0.99] transition cursor-pointer"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <LoopsSvgIcon
                    name="loops-reel-cc"
                    className="w-6 h-6 text-zinc-950 dark:text-white"
                  />
                  <span className="text-[16px] font-normal text-zinc-950 dark:text-white whitespace-nowrap">
                    Closed captions
                  </span>
                </div>
                {closedCaptions && (
                  <span className="text-[13px] font-bold text-[#4B55F5] whitespace-nowrap">
                    On
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
 * 2. BACKGROUND MUSIC / AUDIO DETAILS FULL-SCREEN PAGE (Exact IMG_5300)
 * ========================================================================== */
function normalizeAudioMatchText(val?: string | null): string {
  return (val || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeAudioUrlKey(val?: string | null): string {
  const raw = (val || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw, "https://loops.local");
    return `${u.hostname}${u.pathname}`.toLowerCase();
  } catch {
    return raw.split("?")[0].toLowerCase();
  }
}

function formatSecondsDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "0:30";
  const rounded = Math.max(1, Math.round(sec));
  const mins = Math.floor(rounded / 60);
  const rem = rounded % 60;
  return `${mins}:${rem < 10 ? `0${rem}` : rem}`;
}

export interface ReelAudioDetailsModalProps {
  isOpen: boolean;
  sourcePost: ScamPost | null;
  allPosts: ScamPost[];
  communityUserMap: Map<string, any>;
  currentUser: any;
  followedIds: string[];
  onToggleFollowCreator: (targetUid: string, targetName: string) => void;
  onSelectReelPost: (post: ScamPost) => void;
  onOpenShareModal: (post: ScamPost) => void;
  onClose: () => void;
}

export const ReelAudioDetailsModal: React.FC<ReelAudioDetailsModalProps> = ({
  isOpen,
  sourcePost,
  allPosts,
  communityUserMap,
  currentUser,
  followedIds,
  onToggleFollowCreator,
  onSelectReelPost,
  onOpenShareModal,
  onClose,
}) => {
  const navigate = useNavigate();
  const notify = useNotify();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [sortByTrending, setSortByTrending] = useState(true);
  const [savedAudioKeys, setSavedAudioKeys] = useState<Record<string, boolean>>(
    () => {
      try {
        const raw = localStorage.getItem("loops_saved_audios");
        return raw ? JSON.parse(raw) || {} : {};
      } catch {
        return {};
      }
    }
  );

  // Sync user's saved audios from Firestore if signed in
  useEffect(() => {
    if (!isOpen || !currentUser?.uid) return;
    getDoc(doc(db, "users", currentUser.uid))
      .then((snap) => {
        if (!snap.exists()) return;
        const arr = snap.data()?.savedAudios;
        if (Array.isArray(arr)) {
          const map: Record<string, boolean> = {};
          arr.forEach((k: unknown) => {
            if (typeof k === "string" && k) map[k] = true;
          });
          setSavedAudioKeys((prev) => ({ ...prev, ...map }));
        }
      })
      .catch(() => {});
  }, [isOpen, currentUser?.uid]);

  useEffect(() => {
    if (!isOpen) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlayingPreview(false);
      setDurationSeconds(0);
    }
  }, [isOpen, sourcePost?.id]);

  const creatorInfo = useMemo(() => {
    if (!sourcePost) {
      return {
        uid: "",
        handle: "creator",
        displayName: "Creator",
        avatar: "",
        isVerified: false,
      };
    }
    const uDoc = sourcePost.reporterId
      ? communityUserMap.get(sourcePost.reporterId)
      : null;
    const handle =
      getSafePublicUsername(uDoc) ||
      (sourcePost.reporterName
        ? sourcePost.reporterName.toLowerCase().replace(/\s+/g, "_")
        : "creator");
    const displayName =
      uDoc?.shopName ||
      uDoc?.displayName ||
      sourcePost.reporterName ||
      handle;
    const avatar =
      uDoc?.shopLogo || uDoc?.photoURL || sourcePost.reporterAvatar || "";
    const isVerified = Boolean(
      uDoc?.isVerified || uDoc?.role === "admin" || uDoc?.role === "seller"
    );
    return {
      uid: sourcePost.reporterId || "",
      handle,
      displayName,
      avatar,
      isVerified,
    };
  }, [sourcePost, communityUserMap]);

  const audioMeta = useMemo(() => {
    if (!sourcePost) {
      return {
        key: "",
        title: "Original audio",
        artist: "creator",
        rawAudioUrl: "",
        playableUrl: "",
        artworkUrl: "",
      };
    }
    const resolvedVideo = resolvePostVideoSource(sourcePost);
    const rawMusicUrl =
      sourcePost.music?.audioUrl ||
      sourcePost.music?.url ||
      sourcePost.audioUrl ||
      (resolvedVideo?.platform === "direct"
        ? resolvedVideo.directStreamUrl || resolvedVideo.canonicalUrl
        : sourcePost.videoUrl || "");

    const title = sourcePost.music?.title?.trim() || "Original audio";
    const artist = sourcePost.music?.artist?.trim() || creatorInfo.handle;
    const artworkUrl =
      sourcePost.music?.cover ||
      sourcePost.music?.coverUrl ||
      creatorInfo.avatar ||
      sourcePost.images?.[0] ||
      resolvedVideo?.thumbnailUrl ||
      "";
    const key =
      normalizeAudioUrlKey(rawMusicUrl) ||
      `${normalizeAudioMatchText(title)}::${normalizeAudioMatchText(artist)}`;

    return {
      key,
      title,
      artist,
      rawAudioUrl: rawMusicUrl,
      playableUrl: rawMusicUrl ? toPlayableAudioUrl(rawMusicUrl) : "",
      artworkUrl,
    };
  }, [sourcePost, creatorInfo]);

  const matchingReels = useMemo(() => {
    if (!sourcePost) return [];
    const targetUrlKey = normalizeAudioUrlKey(
      sourcePost.music?.audioUrl || sourcePost.music?.url
    );
    const targetTitle = normalizeAudioMatchText(sourcePost.music?.title);
    const targetArtist = normalizeAudioMatchText(sourcePost.music?.artist);
    const isOriginalUntracked = !targetUrlKey && !targetTitle;

    const seen = new Set<string>();
    const results: { post: ScamPost; posterUrl: string; videoUrl: string }[] =
      [];

    const pool = allPosts.length > 0 ? allPosts : [sourcePost];
    const ensureSourceIncluded = [
      sourcePost,
      ...pool.filter((p) => p.id !== sourcePost.id),
    ];

    ensureSourceIncluded.forEach((p) => {
      if (!p?.id || seen.has(p.id)) return;
      const vid = resolvePostVideoSource(p);
      const hasImages = Array.isArray(p.images) && p.images.filter(Boolean).length > 0;
      const hasBgMusic = Boolean(p.music?.audioUrl || p.music?.url);
      if (!vid && !(hasImages && hasBgMusic)) return;

      let matches = p.id === sourcePost.id;
      if (!matches) {
        const candUrlKey = normalizeAudioUrlKey(
          p.music?.audioUrl || p.music?.url
        );
        const candTitle = normalizeAudioMatchText(p.music?.title);
        const candArtist = normalizeAudioMatchText(p.music?.artist);

        if (targetUrlKey && candUrlKey && targetUrlKey === candUrlKey) {
          matches = true;
        } else if (targetTitle && candTitle && targetTitle === candTitle) {
          matches =
            !targetArtist || !targetArtist || targetArtist === candArtist;
        } else if (
          isOriginalUntracked &&
          !candTitle &&
          sourcePost.reporterId &&
          p.reporterId === sourcePost.reporterId
        ) {
          matches = true;
        }
      }

      if (matches) {
        seen.add(p.id);
        const posterUrl =
          vid?.thumbnailUrl ||
          p.images?.[0] ||
          (vid?.platform === "youtube" && vid.videoId
            ? `https://i.ytimg.com/vi/${vid.videoId}/hqdefault.jpg`
            : "");
        const rawVid = vid?.directStreamUrl || vid?.canonicalUrl || "";
        const videoUrl =
          vid?.platform === "direct" && rawVid ? toPlayableMediaUrl(rawVid) : "";
        results.push({ post: p, posterUrl, videoUrl });
      }
    });

    return [...results].sort((a, b) => {
      if (sortByTrending) {
        return (b.post.views || 0) - (a.post.views || 0);
      }
      return (b.post.createdAt || 0) - (a.post.createdAt || 0);
    });
  }, [sourcePost, allPosts, sortByTrending]);

  const totalViewsAcrossAudio = useMemo(
    () => matchingReels.reduce((acc, r) => acc + (r.post.views || 0), 0),
    [matchingReels]
  );

  const isTrendingAudio =
    matchingReels.length >= 2 || totalViewsAcrossAudio >= 100;

  const isAudioSaved = Boolean(audioMeta.key && savedAudioKeys[audioMeta.key]);
  const isCreatorFollowed = Boolean(
    creatorInfo.uid && followedIds.includes(creatorInfo.uid)
  );
  const isOwnCreator = Boolean(
    currentUser?.uid && creatorInfo.uid === currentUser.uid
  );

  const handleTogglePlayPreview = () => {
    triggerHaptic();
    const el = audioRef.current;
    if (!el || !audioMeta.playableUrl) {
      notify("Audio preview unavailable for external stream", "info");
      return;
    }
    if (isPlayingPreview) {
      el.pause();
      setIsPlayingPreview(false);
    } else {
      el.play()
        .then(() => setIsPlayingPreview(true))
        .catch(() => {
          notify("Tap again to play audio preview", "info");
        });
    }
  };

  const handleToggleSaveAudio = async () => {
    if (!audioMeta.key) return;
    triggerHaptic();
    const nextVal = !isAudioSaved;
    const nextMap = { ...savedAudioKeys };
    if (nextVal) {
      nextMap[audioMeta.key] = true;
    } else {
      delete nextMap[audioMeta.key];
    }
    setSavedAudioKeys(nextMap);
    try {
      localStorage.setItem("loops_saved_audios", JSON.stringify(nextMap));
    } catch {}

    if (currentUser?.uid) {
      try {
        await setDoc(
          doc(db, "users", currentUser.uid),
          { savedAudios: Object.keys(nextMap).slice(0, 100) },
          { merge: true }
        );
      } catch {}
    }

    notify(
      nextVal ? "Audio saved to your collection" : "Removed from saved audio",
      "success"
    );
  };

  const handleUseAudio = () => {
    triggerHaptic();
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlayingPreview(false);

    if (audioMeta.rawAudioUrl) {
      try {
        sessionStorage.setItem(
          "loops_preselected_reel_audio",
          JSON.stringify({
            title: audioMeta.title,
            artist: audioMeta.artist,
            audioUrl: audioMeta.rawAudioUrl,
            url: audioMeta.rawAudioUrl,
            cover: audioMeta.artworkUrl,
            coverUrl: audioMeta.artworkUrl,
          })
        );
      } catch {}
    }
    onClose();
    navigate("/create-reel");
  };

  const handleCopyAudioLink = async () => {
    triggerHaptic();
    if (!sourcePost) return;
    const shareUrl = `${window.location.origin}/loops?filter=video&postId=${encodeURIComponent(
      sourcePost.id
    )}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      notify("Reel audio link copied", "success");
    } catch {
      onOpenShareModal(sourcePost);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && sourcePost && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[135] bg-white text-zinc-950 dark:bg-[#0B0C10] dark:text-white flex justify-center overflow-hidden"
        >
          {audioMeta.playableUrl && (
            <audio
              ref={audioRef}
              src={audioMeta.playableUrl}
              preload="metadata"
              onLoadedMetadata={(e) => {
                const dur = e.currentTarget.duration;
                if (Number.isFinite(dur) && dur > 0) {
                  setDurationSeconds(dur);
                }
              }}
              onEnded={() => setIsPlayingPreview(false)}
            />
          )}

          <div className="w-full max-w-[520px] h-[100dvh] flex flex-col bg-white dark:bg-[#0B0C10] md:border-x md:border-zinc-200 dark:md:border-white/10 overflow-y-auto no-scrollbar">
            {/* Top Navigation Bar (Exact IMG_5300) */}
            <header className="sticky top-0 z-20 bg-white/95 dark:bg-[#0B0C10]/95 backdrop-blur-md px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2.5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onClose();
                }}
                aria-label="Back to reel"
                className="w-11 h-11 rounded-full bg-[#F2F4F7] dark:bg-zinc-800/90 text-zinc-950 dark:text-white flex items-center justify-center active:scale-95 transition cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-2.5 shrink-0">
                {isTrendingAudio && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setSortByTrending((v) => !v);
                    }}
                    className={`h-9 px-3.5 rounded-full text-[13.5px] font-bold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                      sortByTrending
                        ? "bg-[#F2F4F7] dark:bg-zinc-800/90 text-zinc-950 dark:text-white"
                        : "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>{sortByTrending ? "Trending" : "Newest"}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopyAudioLink}
                  aria-label="More audio options"
                  className="w-11 h-11 rounded-full bg-[#F2F4F7] dark:bg-zinc-800/90 text-zinc-950 dark:text-white flex items-center justify-center active:scale-95 transition cursor-pointer shrink-0"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Audio Identity + Controls Section (Exact IMG_5300) */}
            <div className="px-4 pt-2 pb-4 space-y-4">
              {/* Artwork + Title + Creator Follow Row */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleTogglePlayPreview}
                  aria-label={
                    isPlayingPreview ? "Pause audio preview" : "Play audio preview"
                  }
                  className="relative w-[84px] h-[84px] rounded-[20px] overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0 shadow-sm group cursor-pointer"
                >
                  {audioMeta.artworkUrl ? (
                    <img
                      src={audioMeta.artworkUrl}
                      alt={audioMeta.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-950 flex items-center justify-center text-white/40">
                      <LoopsSvgIcon name="loops-reel-music" className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <span className="w-11 h-11 rounded-full bg-black/55 backdrop-blur-sm text-white flex items-center justify-center shadow-md group-active:scale-90 transition">
                      {isPlayingPreview ? (
                        <Pause className="w-5 h-5 fill-white" />
                      ) : (
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      )}
                    </span>
                  </div>
                </button>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <h1 className="text-[20px] font-bold tracking-tight text-zinc-950 dark:text-white leading-snug line-clamp-2">
                    {audioMeta.title}
                  </h1>

                  <div className="flex items-center gap-1.5 flex-wrap text-[15px]">
                    <button
                      type="button"
                      onClick={() => {
                        if (creatorInfo.uid) {
                          onClose();
                          navigate(`/loops/profile/${creatorInfo.uid}`);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 min-w-0 cursor-pointer"
                    >
                      {creatorInfo.avatar ? (
                        <img
                          src={creatorInfo.avatar}
                          alt={creatorInfo.handle}
                          referrerPolicy="no-referrer"
                          className="w-6 h-6 rounded-full object-cover shrink-0 border border-black/10 dark:border-white/15"
                        />
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-zinc-700 text-white text-[11px] font-bold inline-flex items-center justify-center shrink-0">
                          {creatorInfo.handle.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="font-bold text-zinc-950 dark:text-white truncate max-w-[160px]">
                        {creatorInfo.handle}
                      </span>
                      {creatorInfo.isVerified && (
                        <VerifiedLoopBadge className="w-4 h-4 shrink-0" />
                      )}
                    </button>

                    {!isOwnCreator && creatorInfo.uid && (
                      <>
                        <span
                          aria-hidden="true"
                          className="text-zinc-400 font-bold"
                        >
                          ·
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            onToggleFollowCreator(
                              creatorInfo.uid,
                              creatorInfo.displayName
                            );
                          }}
                          className="font-bold text-[#4150F7] hover:opacity-80 cursor-pointer whitespace-nowrap"
                        >
                          {isCreatorFollowed ? "Following" : "Follow"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Duration · Reels Count + Save & Share Circles (Exact IMG_5300) */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[15px] font-medium text-zinc-900 dark:text-zinc-200 tabular-nums">
                  <span>
                    {formatSecondsDuration(
                      durationSeconds || sourcePost.audioDuration || 30
                    )}
                  </span>
                  <span aria-hidden="true" className="text-zinc-400">
                    ·
                  </span>
                  <span>
                    {formatCompactNumber(matchingReels.length)}{" "}
                    {matchingReels.length === 1 ? "reel" : "reels"}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleToggleSaveAudio}
                    aria-label={isAudioSaved ? "Unsave audio" : "Save audio"}
                    className="w-11 h-11 rounded-full bg-[#F2F4F7] dark:bg-zinc-800/90 text-zinc-950 dark:text-white flex items-center justify-center active:scale-90 transition cursor-pointer"
                  >
                    <LoopsSvgIcon
                      name={
                        isAudioSaved
                          ? "loops-reel-save-active"
                          : "loops-reel-save"
                      }
                      className="w-5 h-5"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      onOpenShareModal(sourcePost);
                    }}
                    aria-label="Share audio"
                    className="w-11 h-11 rounded-full bg-[#F2F4F7] dark:bg-zinc-800/90 text-zinc-950 dark:text-white flex items-center justify-center active:scale-90 transition cursor-pointer"
                  >
                    <LoopsSvgIcon
                      name="loops-reel-share"
                      className="w-5 h-5"
                    />
                  </button>
                </div>
              </div>

              {/* Primary CTA: Use audio (Exact IMG_5300 Royal-Blue Full-Width Button) */}
              <button
                type="button"
                onClick={handleUseAudio}
                className="w-full h-11 rounded-[12px] bg-[#4150F7] hover:bg-[#3544E8] active:scale-[0.99] text-white text-[15.5px] font-bold flex items-center justify-center transition cursor-pointer whitespace-nowrap"
              >
                Use audio
              </button>
            </div>

            {/* 3-Column Reels Grid Made With This Background Music (Exact IMG_5300) */}
            <div className="grid grid-cols-3 gap-[1.5px] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
              {matchingReels.map(({ post: itemPost, posterUrl, videoUrl }) => (
                <button
                  key={itemPost.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    if (audioRef.current) audioRef.current.pause();
                    setIsPlayingPreview(false);
                    onSelectReelPost(itemPost);
                  }}
                  className="relative aspect-[9/16] bg-zinc-900 overflow-hidden group cursor-pointer text-left"
                >
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={itemPost.title || "Loops Reel"}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                    />
                  ) : videoUrl ? (
                    <video
                      src={videoUrl}
                      preload="metadata"
                      muted
                      playsInline
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-white/40">
                      <LoopsSvgIcon name="loops-nav-reels" className="w-7 h-7" />
                    </div>
                  )}

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                  <div className="pointer-events-none absolute left-2 bottom-2 flex items-center gap-1 text-white text-[13px] font-bold tabular-nums drop-shadow">
                    <LoopsSvgIcon
                      name="loops-reel-views"
                      className="w-4 h-4 text-white"
                    />
                    <span>{formatCompactNumber(itemPost.views || 1)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
 * 3. SUGGESTED PROFILES INTERSTITIAL SLIDE IN REELS (Exact IMG_5297)
 * ========================================================================== */
export interface SuggestedReelProfileItem {
  uid: string;
  displayName: string;
  handle: string;
  avatar: string;
  followsViewer: boolean;
}

export interface ReelsSuggestedProfilesSlideProps {
  profiles: SuggestedReelProfileItem[];
  slideKey: string;
  followedIds: string[];
  onToggleFollow: (uid: string, displayName: string) => void;
  onDismissProfile: (uid: string) => void;
}

export const ReelsSuggestedProfilesSlide: React.FC<
  ReelsSuggestedProfilesSlideProps
> = ({
  profiles,
  slideKey,
  followedIds,
  onToggleFollow,
  onDismissProfile,
}) => {
  const navigate = useNavigate();
  const touchStartXRef = useRef<number | null>(null);
  const [pageIdx, setPageIdx] = useState(0);

  const pages = useMemo(() => {
    const chunks: SuggestedReelProfileItem[][] = [];
    const capped = profiles.slice(0, 20);
    for (let i = 0; i < capped.length; i += 4) {
      chunks.push(capped.slice(i, i + 4));
    }
    return chunks;
  }, [profiles]);

  const safePageIdx = Math.min(pageIdx, Math.max(0, pages.length - 1));
  const currentCards = pages[safePageIdx] || [];
  const ambientAvatar =
    currentCards[0]?.avatar || profiles[0]?.avatar || "";

  return (
    <section
      key={slideKey}
      data-suggested-slide="true"
      onTouchStart={(e) => {
        touchStartXRef.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartXRef.current === null || pages.length <= 1) return;
        const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
        const dx = endX - touchStartXRef.current;
        touchStartXRef.current = null;
        if (Math.abs(dx) > 44) {
          triggerHaptic();
          if (dx < 0 && safePageIdx + 1 < pages.length) {
            setPageIdx(safePageIdx + 1);
          } else if (dx > 0 && safePageIdx > 0) {
            setPageIdx(safePageIdx - 1);
          }
        }
      }}
      className="relative w-full h-[100dvh] snap-start snap-always overflow-hidden bg-[#1D1D20] text-white flex flex-col justify-between px-3.5 pt-[max(3.75rem,env(safe-area-inset-top))] pb-[68px]"
    >
      {/* Ambient Blurred Portrait Backdrop matching IMG_5297 */}
      {ambientAvatar && (
        <img
          src={ambientAvatar}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          className="pointer-events-none absolute inset-0 w-full h-full object-cover scale-125 blur-3xl opacity-35"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/65 via-black/35 to-black/80" />

      {/* Center 2x2 Frosted Glass Cards + Pagination Dots (Exact IMG_5297) */}
      <div className="relative z-10 my-auto w-full">
        <div className="grid grid-cols-2 gap-3 w-full">
          {currentCards.map((item) => {
            const isFollowing = followedIds.includes(item.uid);
            const buttonLabel = isFollowing
              ? "Following"
              : item.followsViewer
              ? "Follow back"
              : "Follow";

            return (
              <div
                key={item.uid}
                className="relative rounded-[24px] bg-white/[0.15] backdrop-blur-2xl border border-white/[0.12] px-3.5 pt-5 pb-3.5 flex flex-col items-center text-center shadow-xl"
              >
                {/* Dismiss X Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic();
                    onDismissProfile(item.uid);
                  }}
                  aria-label={`Dismiss ${item.displayName}`}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-4 h-4 stroke-[2.2]" />
                </button>

                {/* Avatar */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    navigate(`/loops/profile/${item.uid}`);
                  }}
                  className="flex flex-col items-center w-full cursor-pointer"
                >
                  {item.avatar ? (
                    <img
                      src={item.avatar}
                      alt={item.displayName}
                      referrerPolicy="no-referrer"
                      className="w-[82px] h-[82px] rounded-full object-cover ring-1 ring-white/20 shadow-md"
                    />
                  ) : (
                    <div className="w-[82px] h-[82px] rounded-full bg-white/20 text-white text-2xl font-bold flex items-center justify-center ring-1 ring-white/20 shadow-md">
                      {item.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <span className="mt-3 text-[15.5px] font-bold text-white truncate w-full leading-snug">
                    {item.displayName}
                  </span>
                  <span className="text-[12.5px] text-white/85 truncate w-full mt-0.5">
                    Suggested for you
                  </span>
                </button>

                {/* Follow / Follow back White Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic();
                    onToggleFollow(item.uid, item.displayName);
                  }}
                  className={`mt-3.5 w-full h-[38px] rounded-[12px] text-[14px] font-bold flex items-center justify-center transition active:scale-95 cursor-pointer whitespace-nowrap ${
                    isFollowing
                      ? "bg-white/20 text-white border border-white/30"
                      : "bg-white text-zinc-950 hover:bg-zinc-100"
                  }`}
                >
                  {buttonLabel}
                </button>
              </div>
            );
          })}
        </div>

        {/* Pill + Dot Pagination Indicator (Exact IMG_5297) */}
        {pages.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            {pages.map((_, idx) => {
              const active = idx === safePageIdx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setPageIdx(idx);
                  }}
                  aria-label={`Suggested profiles page ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                    active ? "w-6 bg-white" : "w-1.5 bg-white/45 hover:bg-white/75"
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Footer Caption Row right above Compact Reels Dock (Exact IMG_5297) */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-1 pt-2">
        <div className="min-w-0">
          <p className="text-[16px] font-bold text-white leading-snug">
            Suggested for you
          </p>
          <p className="text-[13.5px] text-white/85 leading-snug mt-0.5">
            Loops is better with friends
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            navigate("/loops/search");
          }}
          aria-label="Explore more people on Loops"
          className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center text-white/90 hover:text-white cursor-pointer shrink-0"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
};

/* ============================================================================
 * 5. SAVED POPUP SHEET (Exact IMG_5302 + Real Persistent Collections)
 * ========================================================================== */
export interface SavedPopupSheetProps {
  isOpen: boolean;
  onClose: () => void;
  savedItem?: {
    id: string;
    thumbnail?: string;
    title?: string;
  } | null;
  isSaved?: boolean;
  onToggleSaveState?: () => void;
  onCollectionCreated?: (collectionName: string) => void;
}

export const SavedPopupSheet: React.FC<SavedPopupSheetProps> = ({
  isOpen,
  onClose,
  savedItem,
  isSaved = true,
  onToggleSaveState,
  onCollectionCreated,
}) => {
  const navigate = useNavigate();
  const notify = useNotify();
  const { collections, createCollection, togglePostInCollection } =
    useSavedCollections();
  const [showCreateCollectionModal, setShowCreateCollectionModal] =
    useState(false);
  const [collectionName, setCollectionName] = useState("");

  const handleStartCollection = () => {
    triggerHaptic();
    setShowCreateCollectionModal(true);
  };

  const handleConfirmCreateCollection = () => {
    const clean = collectionName.trim();
    if (!clean) {
      notify("Please enter a collection name", "error");
      return;
    }
    triggerHaptic();
    createCollection(clean, savedItem);
    onCollectionCreated?.(clean);
    notify(`Saved to "${clean}"`, "success");
    setCollectionName("");
    setShowCreateCollectionModal(false);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[290] flex flex-col justify-end"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 390, damping: 35 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-[291] w-full max-w-[480px] mx-auto rounded-t-[30px] bg-white text-zinc-950 dark:bg-[#18181A] dark:text-white pt-3 pb-[calc(1.75rem+env(safe-area-inset-bottom))] shadow-2xl border-t border-zinc-200/70 dark:border-white/10"
          >
            {/* Centered Drag Handle matching IMG_5302 */}
            <div className="w-10 h-1 rounded-full bg-zinc-500/80 dark:bg-zinc-500 mx-auto mb-3.5" />

            {/* Top Saved Post Info Row (Exact IMG_5302) */}
            <div className="px-5 pb-4 flex items-center justify-between border-b border-zinc-200/75 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onClose();
                  navigate("/loops/saved");
                }}
                className="flex items-center gap-3.5 min-w-0 text-left cursor-pointer"
              >
                <div className="w-[56px] h-[56px] rounded-[14px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 border border-black/[0.06] dark:border-white/10">
                  {savedItem?.thumbnail ? (
                    <img
                      src={savedItem.thumbnail}
                      alt="Saved Post"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white">
                      <Bookmark className="w-5 h-5 fill-current" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-[16px] font-bold text-zinc-950 dark:text-white leading-snug truncate">
                    {isSaved ? "Saved" : "Removed"}
                  </h3>
                  <p className="text-[14px] text-zinc-500 dark:text-zinc-400 font-normal truncate">
                    Private
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  if (onToggleSaveState) {
                    onToggleSaveState();
                    onClose();
                  } else {
                    onClose();
                  }
                }}
                aria-label={isSaved ? "Remove from saved" : "Save post"}
                className="w-11 h-11 -mr-1.5 rounded-full flex items-center justify-center text-zinc-950 dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer shrink-0"
              >
                <Bookmark
                  className={`w-[25px] h-[25px] stroke-[2] ${
                    isSaved ? "fill-current" : ""
                  }`}
                />
              </button>
            </div>

            {collections.length === 0 ? (
              /* Exact Empty Collections State matching IMG_5302 1:1 */
              <div className="px-6 pt-9 pb-3 flex flex-col items-center text-center">
                {/* Custom SVG Bookmark + 6 Colorful Radiating Ticks matching IMG_5302 */}
                <svg
                  viewBox="0 0 120 96"
                  className="w-[108px] h-[86px] mb-5 shrink-0"
                  fill="none"
                  aria-hidden="true"
                >
                  {/* Left 3 colorful ticks */}
                  <line
                    x1="24"
                    y1="22"
                    x2="31"
                    y2="27"
                    stroke="#F5B400"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="17"
                    y1="46"
                    x2="26"
                    y2="46"
                    stroke="#F97316"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="24"
                    y1="70"
                    x2="31"
                    y2="65"
                    stroke="#E11D48"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />

                  {/* Right 3 colorful ticks */}
                  <line
                    x1="96"
                    y1="22"
                    x2="89"
                    y2="27"
                    stroke="#EC4899"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="103"
                    y1="46"
                    x2="94"
                    y2="46"
                    stroke="#A855F7"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="96"
                    y1="70"
                    x2="89"
                    y2="65"
                    stroke="#7C3AED"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />

                  {/* Crisp Center Bookmark Ribbon Outline */}
                  <path
                    d="M41 18H79V77L60 59.5L41 77V18Z"
                    className="stroke-zinc-950 dark:stroke-white"
                    strokeWidth="2.8"
                    strokeLinejoin="round"
                  />
                </svg>

                <h2 className="text-[22px] font-bold text-zinc-950 dark:text-white tracking-tight leading-snug">
                  Collect the posts you love
                </h2>
                <p className="text-[14.5px] text-zinc-700 dark:text-zinc-300 font-normal leading-[1.42] max-w-[305px] mt-2.5 mb-7">
                  Save posts in collections just for you or build a collection
                  with others.
                </p>

                <button
                  type="button"
                  onClick={handleStartCollection}
                  className="px-7 py-3.5 rounded-[14px] bg-[#4150F7] hover:bg-[#3342E8] text-white font-semibold text-[15.5px] text-center shadow-sm active:scale-[0.98] transition cursor-pointer"
                >
                  Start a collection
                </button>
              </div>
            ) : (
              /* Interactive Collections Picker when user has created 1+ collections */
              <div className="px-5 pt-4 pb-2 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-bold text-zinc-950 dark:text-white">
                    Collections
                  </span>
                  <button
                    type="button"
                    onClick={handleStartCollection}
                    className="text-[14px] font-semibold text-[#4150F7] hover:underline cursor-pointer"
                  >
                    New collection
                  </button>
                </div>

                <div className="max-h-[260px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {collections.map((col) => {
                    const inCol = Boolean(
                      savedItem?.id && col.postIds.includes(savedItem.id)
                    );
                    const cover = col.coverUrl || savedItem?.thumbnail || "";
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => {
                          if (!savedItem?.id) return;
                          triggerHaptic();
                          const added = togglePostInCollection(col.id, savedItem);
                          notify(
                            added
                              ? `Saved to "${col.name}"`
                              : `Removed from "${col.name}"`,
                            "info"
                          );
                        }}
                        className="w-full py-2.5 flex items-center justify-between gap-3 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.04] rounded-xl transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-[12px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-black/[0.06] dark:border-white/10 shrink-0 flex items-center justify-center">
                            {cover ? (
                              <img
                                src={cover}
                                alt={col.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FolderPlus className="w-5 h-5 text-zinc-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[15.5px] font-semibold text-zinc-950 dark:text-white truncate">
                              {col.name}
                            </p>
                            <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
                              Private · {col.postIds.length}{" "}
                              {col.postIds.length === 1 ? "post" : "posts"}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition ${
                            inCol
                              ? "bg-[#4150F7] text-white"
                              : "border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          {inCol ? (
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          ) : (
                            <Plus className="w-4 h-4 stroke-[2.2]" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Interactive Modal to Create Named Collection */}
      {showCreateCollectionModal && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={(e) => {
            e.stopPropagation();
            setShowCreateCollectionModal(false);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[26px] bg-white dark:bg-[#1C1C1E] p-6 text-zinc-950 dark:text-white shadow-2xl border border-zinc-200/80 dark:border-zinc-800 space-y-4"
          >
            <h3 className="text-[18px] font-bold text-center">New collection</h3>
            <div className="flex flex-col items-center gap-3">
              {savedItem?.thumbnail && (
                <img
                  src={savedItem.thumbnail}
                  alt="Collection cover"
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-2xl object-cover border border-black/10"
                />
              )}
              <input
                type="text"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmCreateCollection();
                }}
                placeholder="Collection name"
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[15px] font-medium outline-none focus:border-[#4150F7]"
              />
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowCreateCollectionModal(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateCollection}
                className="px-5 py-2.5 rounded-xl bg-[#4150F7] hover:bg-[#3342E8] text-white text-sm font-semibold shadow-sm cursor-pointer"
              >
                Save
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

/* ============================================================================
 * 6. REEL / POST TRANSLATION DIALOG (Exact IMG_5304)
 * ========================================================================== */
export interface ReelTranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onToggleOriginal: () => void;
  isTranslated?: boolean;
  itemType?: "reel" | "post";
}

export const ReelTranslationModal: React.FC<ReelTranslationModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  onToggleOriginal,
  isTranslated = true,
  itemType = "reel",
}) => {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[295] flex items-center justify-center p-5 bg-black/45 backdrop-blur-[2px]"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.93 }}
            transition={{ duration: 0.16 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[310px] rounded-[30px] bg-[#F2F2F5]/95 dark:bg-[#232327]/95 backdrop-blur-2xl pt-6 text-center text-zinc-950 dark:text-white shadow-[0_20px_55px_rgba(0,0,0,0.28)] border border-white/60 dark:border-white/10 overflow-hidden"
          >
            {/* Exact Dual Speech Bubble SVG Icon matching IMG_5304 */}
            <div className="flex justify-center mb-3.5">
              <svg
                viewBox="0 0 96 86"
                className="w-[84px] h-[74px]"
                fill="none"
                aria-hidden="true"
              >
                {/* Top-right 3 subtle grey rays */}
                <line
                  x1="61"
                  y1="12"
                  x2="64"
                  y2="7"
                  stroke="#A1A1AA"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                />
                <line
                  x1="69"
                  y1="19"
                  x2="74"
                  y2="16"
                  stroke="#A1A1AA"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                />
                <line
                  x1="72"
                  y1="28"
                  x2="77"
                  y2="27.5"
                  stroke="#A1A1AA"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                />

                {/* Bottom-left curved swap arrow */}
                <path
                  d="M21 43C19.5 55 26 63 38 64"
                  stroke="#A1A1AA"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <polyline
                  points="16.5 47 21 42 25.5 46.5"
                  stroke="#A1A1AA"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points="34 60 39 64 34.5 68.5"
                  stroke="#A1A1AA"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Top-Left Speech Bubble with Orange 文 */}
                <path
                  d="M25 11H50C53.866 11 57 14.134 57 18V31C57 34.866 53.866 38 50 38H37L29 45V38H25C21.134 38 18 34.866 18 31V18C18 14.134 21.134 11 25 11Z"
                  className="fill-[#F2F2F5] dark:fill-[#232327] stroke-zinc-950 dark:stroke-white"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                />
                <text
                  x="37.5"
                  y="29.5"
                  textAnchor="middle"
                  fill="#F97316"
                  fontSize="16"
                  fontWeight="800"
                >
                  文
                </text>

                {/* Bottom-Right Speech Bubble with Magenta Aa */}
                <path
                  d="M47 43H72C75.866 43 79 46.134 79 50V63C79 66.866 75.866 70 72 70H68V77L60 70H47C43.134 70 40 66.866 40 63V50C40 46.134 43.134 43 47 43Z"
                  className="fill-[#F2F2F5] dark:fill-[#232327] stroke-zinc-950 dark:stroke-white"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                />
                <text
                  x="59.5"
                  y="61.5"
                  textAnchor="middle"
                  fill="#D946EF"
                  fontSize="14.5"
                  fontWeight="800"
                >
                  Aa
                </text>
              </svg>
            </div>

            <div className="px-6 pb-5">
              <h3 className="text-[19px] font-bold text-zinc-950 dark:text-white tracking-tight leading-snug mb-2">
                {itemType === "post"
                  ? "This post is auto-translated"
                  : "This reel is auto-translated"}
              </h3>

              <p className="text-[13.5px] text-zinc-700 dark:text-zinc-300 font-normal leading-[1.38]">
                You can choose which languages to translate in Translation
                settings.
              </p>
            </div>

            <div className="border-t border-zinc-300/75 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onClose();
                  onOpenSettings();
                }}
                className="w-full py-3.5 text-center text-[16px] font-bold text-[#384DF5] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
              >
                Translation settings
              </button>
            </div>

            <div className="border-t border-zinc-300/75 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onToggleOriginal();
                  onClose();
                }}
                className="w-full py-3.5 text-center text-[16px] font-normal text-zinc-950 dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
              >
                {isTranslated ? "See original" : "See translation"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

/* ============================================================================
 * 7. TRANSLATION SETTINGS SHEET (Exact IMG_5305)
 * ========================================================================== */
export interface TranslationSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPreferredLanguages?: () => void;
}

export const TranslationSettingsSheet: React.FC<
  TranslationSettingsSheetProps
> = ({ isOpen, onClose, onOpenPreferredLanguages }) => {
  const navigate = useNavigate();
  const { prefs, updatePrefs } = useTranslationPrefs();

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[296] flex flex-col justify-end"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 390, damping: 35 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-[297] w-full max-w-[480px] mx-auto rounded-t-[30px] bg-white text-zinc-950 dark:bg-[#18181A] dark:text-white px-5 pt-3 pb-[calc(2.25rem+env(safe-area-inset-bottom))] shadow-2xl border-t border-zinc-200/70 dark:border-white/10"
          >
            <div className="w-10 h-1 rounded-full bg-zinc-500/80 dark:bg-zinc-500 mx-auto mb-5" />

            <h2 className="text-[18px] font-bold text-center text-zinc-950 dark:text-white mb-6">
              Translations
            </h2>

            <div className="space-y-6">
              {/* Preferred Languages Row -> Dedicated Page (/loops/preferred-languages) or Modal */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onClose();
                  if (onOpenPreferredLanguages) {
                    onOpenPreferredLanguages();
                  } else {
                    navigate("/loops/preferred-languages");
                  }
                }}
                className="w-full py-1 flex items-center justify-between gap-3 text-left hover:opacity-75 transition cursor-pointer"
              >
                <span className="text-[16.5px] font-normal text-zinc-950 dark:text-white">
                  Preferred languages
                </span>
                <ChevronRight className="w-5 h-5 text-zinc-500 stroke-[2]" />
              </button>

              {/* Translate text on reels toggle (Exact IMG_5305 dark capsule switch) */}
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 pr-2">
                  <p className="text-[16.5px] font-normal text-zinc-950 dark:text-white leading-snug">
                    Translate text on reels
                  </p>
                  <p className="text-[13.5px] text-[#6E737B] dark:text-zinc-400 leading-[1.35] mt-1">
                    See stickers and text in your preferred language when
                    available.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-label="Translate text on reels"
                  aria-checked={prefs.translateTextOnReels}
                  onClick={() => {
                    triggerHaptic();
                    updatePrefs((prev) => ({
                      ...prev,
                      translateTextOnReels: !prev.translateTextOnReels,
                    }));
                  }}
                  className={`w-[56px] h-[32px] rounded-full p-[3px] flex items-center transition-colors duration-200 shrink-0 cursor-pointer ${
                    prefs.translateTextOnReels
                      ? "bg-[#0F1419] dark:bg-white"
                      : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <span
                    className={`w-[26px] h-[26px] rounded-full bg-white dark:bg-[#0F1419] shadow-sm transition-transform duration-200 ${
                      prefs.translateTextOnReels
                        ? "translate-x-[24px]"
                        : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Translate voice toggle (Exact IMG_5305 dark capsule switch) */}
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 pr-2">
                  <p className="text-[16.5px] font-normal text-zinc-950 dark:text-white leading-snug">
                    Translate voice
                  </p>
                  <p className="text-[13.5px] text-[#6E737B] dark:text-zinc-400 leading-[1.35] mt-1">
                    Hear audio translated into your default language in the
                    speaker&apos;s voice when available.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-label="Translate voice"
                  aria-checked={prefs.translateVoice}
                  onClick={() => {
                    triggerHaptic();
                    updatePrefs((prev) => ({
                      ...prev,
                      translateVoice: !prev.translateVoice,
                    }));
                  }}
                  className={`w-[56px] h-[32px] rounded-full p-[3px] flex items-center transition-colors duration-200 shrink-0 cursor-pointer ${
                    prefs.translateVoice
                      ? "bg-[#0F1419] dark:bg-white"
                      : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <span
                    className={`w-[26px] h-[26px] rounded-full bg-white dark:bg-[#0F1419] shadow-sm transition-transform duration-200 ${
                      prefs.translateVoice
                        ? "translate-x-[24px]"
                        : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

/* ============================================================================
 * 8. PREFERRED LANGUAGES DEDICATED PAGE & MODAL (Exact IMG_5306)
 * ========================================================================== */
const PreferredLanguagesScreenContent: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const notify = useNotify();
  const { prefs, updatePrefs } = useTranslationPrefs();
  const [isEditing, setIsEditing] = useState(false);
  const [showAddLanguageModal, setShowAddLanguageModal] = useState(false);
  const [langSearch, setLangSearch] = useState("");

  const languages = prefs.preferredLanguages;

  const moveLanguage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= languages.length) return;
    triggerHaptic();
    const copy = [...languages];
    const [moved] = copy.splice(index, 1);
    copy.splice(target, 0, moved);
    const updated = copy.map((item, idx) => ({
      ...item,
      isPrimary: idx === 0,
    }));
    updatePrefs((prev) => ({ ...prev, preferredLanguages: updated }));
  };

  const makePrimary = (id: string) => {
    triggerHaptic();
    const chosen = languages.find((l) => l.id === id);
    if (!chosen) return;
    const rest = languages
      .filter((l) => l.id !== id)
      .map((l) => ({ ...l, isPrimary: false }));
    updatePrefs((prev) => ({
      ...prev,
      preferredLanguages: [{ ...chosen, isPrimary: true }, ...rest],
    }));
    notify(`${chosen.name} set as primary translation language`, "success");
  };

  const removeLanguage = (id: string) => {
    if (languages.length <= 1) {
      notify("Keep at least one preferred language", "info");
      return;
    }
    triggerHaptic();
    const remaining = languages
      .filter((l) => l.id !== id)
      .map((l, idx) => ({ ...l, isPrimary: idx === 0 }));
    updatePrefs((prev) => ({ ...prev, preferredLanguages: remaining }));
  };

  const filteredAddableLanguages = useMemo(() => {
    const q = langSearch.trim().toLowerCase();
    return AVAILABLE_TRANSLATION_LANGUAGES.filter((l) => {
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q)
      );
    });
  }, [langSearch]);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-white text-zinc-950 dark:bg-[#121214] dark:text-white">
      <div className="w-full max-w-[540px] mx-auto flex-1 flex flex-col">
        {/* Top Bar matching IMG_5306 1:1 (Elevated Circle X + Title + Elevated Edit Pill) */}
        <header className="px-4 pt-4 pb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              onClose();
            }}
            className="w-11 h-11 rounded-full bg-white dark:bg-zinc-900 shadow-[0_2px_14px_rgba(0,0,0,0.08)] border border-zinc-100 dark:border-zinc-800 flex items-center justify-center text-zinc-950 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-95 transition cursor-pointer"
            aria-label="Close preferred languages"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>

          <h1 className="text-[17.5px] font-bold text-zinc-950 dark:text-white tracking-tight">
            Preferred languages
          </h1>

          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              setIsEditing((v) => !v);
            }}
            className="px-5 h-11 rounded-full bg-white dark:bg-zinc-900 shadow-[0_2px_14px_rgba(0,0,0,0.08)] border border-zinc-100 dark:border-zinc-800 text-[15.5px] font-medium text-zinc-950 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-95 transition cursor-pointer"
          >
            {isEditing ? "Done" : "Edit"}
          </button>
        </header>

        {/* Description Subtext & Clean Borderless Language List matching IMG_5306 */}
        <div className="flex-1 px-4 pt-3 pb-6 overflow-y-auto">
          <p className="text-[15px] text-[#6E737B] dark:text-zinc-400 leading-[1.38] font-normal mb-6">
            We&apos;ll translate reels into these languages in the order that
            you choose and may also suggest reels that were originally created
            in these languages.
          </p>

          <div className="space-y-5">
            {languages.map((lang, idx) => (
              <div
                key={lang.id}
                onClick={() => {
                  if (!lang.isPrimary && !isEditing) {
                    makePrimary(lang.id);
                  }
                }}
                className={`flex items-center justify-between py-1 ${
                  !lang.isPrimary && !isEditing ? "cursor-pointer" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="text-[16.5px] font-normal text-zinc-950 dark:text-white leading-snug">
                    {lang.nativeName || lang.name}
                  </p>
                  <p className="text-[14px] text-[#73777F] dark:text-zinc-400 font-normal leading-snug mt-0.5">
                    {lang.name}
                  </p>
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!lang.isPrimary && (
                      <button
                        type="button"
                        onClick={() => makePrimary(lang.id)}
                        className="px-2.5 py-1 rounded-lg bg-[#415AF6]/10 text-[#415AF6] text-xs font-semibold cursor-pointer"
                      >
                        Set Primary
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveLanguage(idx, -1)}
                      aria-label="Move language up"
                      className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === languages.length - 1}
                      onClick={() => moveLanguage(idx, 1)}
                      aria-label="Move language down"
                      className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {languages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLanguage(lang.id)}
                        aria-label={`Remove ${lang.name}`}
                        className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-4 shrink-0">
                    {idx === 0 && (
                      <span className="text-[15px] font-normal text-[#6E737B] dark:text-zinc-400">
                        Primary
                      </span>
                    )}
                    {/* Exact 3 thin grey horizontal lines from IMG_5306 */}
                    <div
                      aria-hidden="true"
                      className="w-[22px] flex flex-col justify-center gap-[4px]"
                    >
                      <span className="w-full h-[1.6px] bg-[#C4C7CE] dark:bg-zinc-600 rounded-full" />
                      <span className="w-full h-[1.6px] bg-[#C4C7CE] dark:bg-zinc-600 rounded-full" />
                      <span className="w-full h-[1.6px] bg-[#C4C7CE] dark:bg-zinc-600 rounded-full" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sticky Bottom Blue "Add language" Button matching IMG_5306 */}
        <div className="px-4 pt-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              setLangSearch("");
              setShowAddLanguageModal(true);
            }}
            className="w-full py-3.5 rounded-[14px] bg-[#415AF6] hover:bg-[#324BE6] text-white font-semibold text-[16px] text-center active:scale-[0.99] transition cursor-pointer"
          >
            Add language
          </button>
        </div>
      </div>

      {/* Searchable Add Language Sheet */}
      <AnimatePresence>
        {showAddLanguageModal && (
          <div
            className="fixed inset-0 z-[310] flex flex-col justify-end bg-black/50 backdrop-blur-[2px]"
            onClick={() => setShowAddLanguageModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 390, damping: 35 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[500px] mx-auto rounded-t-[28px] bg-white dark:bg-[#1C1C1E] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-zinc-950 dark:text-white shadow-2xl space-y-4 max-h-[80dvh] flex flex-col"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[17px] font-bold">Add language</h3>
                <button
                  type="button"
                  onClick={() => setShowAddLanguageModal(false)}
                  aria-label="Close language picker"
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 flex items-center gap-2">
                <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                <input
                  type="text"
                  value={langSearch}
                  onChange={(e) => setLangSearch(e.target.value)}
                  placeholder="Search languages..."
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {filteredAddableLanguages.map((item) => {
                  const alreadyAdded = languages.some((l) => l.id === item.id);
                  const isPrimary = languages[0]?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        if (!alreadyAdded) {
                          updatePrefs((prev) => ({
                            ...prev,
                            preferredLanguages: [
                              ...prev.preferredLanguages,
                              {
                                id: item.id,
                                name: item.name,
                                nativeName: item.nativeName,
                                isPrimary: false,
                              },
                            ],
                          }));
                          notify(
                            `Added ${item.name} to preferred languages`,
                            "success"
                          );
                        } else if (!isPrimary) {
                          makePrimary(item.id);
                        }
                        setShowAddLanguageModal(false);
                      }}
                      className="w-full py-3 px-1 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition cursor-pointer"
                    >
                      <div>
                        <p className="text-[15.5px] font-medium text-zinc-950 dark:text-white">
                          {item.nativeName}
                        </p>
                        <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
                          {item.name}
                        </p>
                      </div>
                      {isPrimary ? (
                        <span className="text-xs font-semibold text-[#415AF6]">
                          Primary
                        </span>
                      ) : alreadyAdded ? (
                        <span className="text-xs font-medium text-zinc-500">
                          Tap to make primary
                        </span>
                      ) : (
                        <Plus className="w-4 h-4 text-[#415AF6]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export interface PreferredLanguagesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PreferredLanguagesModal: React.FC<
  PreferredLanguagesModalProps
> = ({ isOpen, onClose }) => {
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 18 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[300] overflow-y-auto bg-white dark:bg-[#121214]"
        >
          <PreferredLanguagesScreenContent onClose={onClose} />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export const PreferredLanguagesPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <PreferredLanguagesScreenContent
      onClose={() => {
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate("/loops");
        }
      }}
    />
  );
};

/* ============================================================================
 * 9. REEL END SCREEN OVERLAY (Exact IMG_5307)
 * ========================================================================== */
export interface ReelEndScreenOverlayProps {
  isOpen: boolean;
  reel: ScamPost;
  onWatchMore: () => void;
  onWatchAgain: () => void;
}

export const ReelEndScreenOverlay: React.FC<ReelEndScreenOverlayProps> = ({
  isOpen,
  reel,
  onWatchMore,
  onWatchAgain,
}) => {
  if (!isOpen) return null;
  const creatorName = reel.reporterName || "Creator";
  const creatorAvatar = reel.reporterAvatar || reel.images?.[0] || "";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 bg-black/55 backdrop-blur-[2px] flex flex-col justify-between p-4 text-white pointer-events-auto"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-white/20 border border-white/30 shrink-0">
            {creatorAvatar ? (
              <img
                src={creatorAvatar}
                alt={creatorName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                {creatorName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-white truncate leading-snug">
              {creatorName}
            </p>
            <p className="text-[12px] text-white/85 truncate leading-snug flex items-center gap-1 mt-0.5">
              <span>🎵</span>
              <span className="truncate">
                {reel.music?.title
                  ? `${reel.music.title}`
                  : `${creatorName} · Original audio`}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="my-auto flex flex-col items-center text-center">
        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            onWatchMore();
          }}
          className="px-5 py-3 rounded-[16px] bg-white text-zinc-950 font-semibold text-[15px] flex items-center gap-2.5 shadow-xl hover:bg-zinc-100 active:scale-95 transition cursor-pointer"
        >
          <span className="w-5 h-5 rounded-[6px] bg-zinc-950 text-white flex items-center justify-center shrink-0">
            <Play className="w-3 h-3 fill-current ml-0.5" />
          </span>
          <span>Watch more reels</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            onWatchAgain();
          }}
          className="mt-4 text-[14.5px] font-semibold text-white/95 hover:text-white transition cursor-pointer"
        >
          Watch again
        </button>
      </div>

      <div className="h-8" />
    </motion.div>
  );
};

/* ============================================================================
 * 10. LIQUID GLASS BUTTON & FLOATING SCROLL CONTROLS (Exact IMG_5303)
 * ========================================================================== */
export interface LiquidGlassButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  title?: string;
  ariaLabel?: string;
  badge?: boolean;
}

export const LiquidGlassButton: React.FC<LiquidGlassButtonProps> = ({
  children,
  onClick,
  className = "",
  title,
  ariaLabel,
  badge = false,
}) => {
  return (
    <button
      type="button"
      onClick={() => {
        triggerHaptic();
        onClick();
      }}
      title={title}
      aria-label={ariaLabel || title}
      className={`relative w-[42px] h-[42px] rounded-full flex items-center justify-center text-zinc-950 dark:text-white transition-transform active:scale-90 cursor-pointer backdrop-blur-2xl bg-gradient-to-b from-white/88 via-white/62 to-[#E4E7EC]/82 dark:from-zinc-700/80 dark:via-zinc-800/72 dark:to-zinc-900/85 border border-white/95 dark:border-white/25 shadow-[0_6px_20px_rgba(15,23,42,0.14),inset_0_2px_3px_rgba(255,255,255,1),inset_0_-3px_6px_rgba(15,23,42,0.12),inset_2px_0_4px_rgba(255,255,255,0.85)] overflow-hidden shrink-0 ${className}`}
    >
      {/* Inner Refractive Liquid Specular Rim matching IMG_5303 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[2px] rounded-full border border-white/80 dark:border-white/15"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-[2px] inset-x-[5px] h-[44%] rounded-t-full bg-gradient-to-b from-white/90 via-white/35 to-transparent"
      />
      <span className="relative z-10 flex items-center justify-center leading-none">
        {children}
      </span>
      {badge && (
        <span
          aria-hidden="true"
          className="absolute top-[8px] right-[8px] z-20 w-[9px] h-[9px] rounded-full bg-[#FF2938] ring-[1.5px] ring-white dark:ring-zinc-900"
        />
      )}
    </button>
  );
};


