import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  MoreHorizontal,
  Pause,
  Play,
  TrendingUp,
  X,
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
      if (!vid) return;

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
            !targetArtist || !candArtist || targetArtist === candArtist;
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
          vid.thumbnailUrl ||
          p.images?.[0] ||
          (vid.platform === "youtube" && vid.videoId
            ? `https://i.ytimg.com/vi/${vid.videoId}/hqdefault.jpg`
            : "");
        const rawVid = vid.directStreamUrl || vid.canonicalUrl || "";
        const videoUrl =
          vid.platform === "direct" && rawVid ? toPlayableMediaUrl(rawVid) : "";
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
