import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Heart,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Search,
  Send,
  Info,
  CheckCircle2,
  XCircle,
  ExternalLink,
  X,
  Image as ImageIcon,
  Loader2,
  MoreHorizontal,
  Check,
  Music as Music2,
} from "lucide-react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  addDoc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { ScamComment, ScamPost, ReactionType, UserProfile } from "../types";
import {
  ParsedVideoEmbed,
  VideoPlatform,
  getVideoPlatformMeta,
  parseVideoEmbed,
  resolvePostVideoSource,
  resolveShortVideoUrl,
} from "../lib/videoEmbed";
import {
  CURATED_SUGGESTED_TOPICS,
  DEFAULT_MORE_TOPICS,
  LoopsAlgorithmPrefs,
  buildAlgorithmHeroHeadline,
  extractPostTopicsForAlgorithm,
  loadLocalAlgorithmPrefs,
  saveAlgorithmPrefs,
  syncAlgorithmPrefsFromFirestore,
} from "../lib/loopsAlgorithmPrefs";
import { FEED_THEMES } from "../lib/feed-themes";
import { SmoothImage } from "./SmoothImage";
import { GiphyBottomSheet } from "./ComposerLiquidGlassSheets";
import {
  VerifiedLoopBadge,
  formatLoopCompactTime,
} from "./LoopPostCard";
import { processCleanImage } from "../lib/watermark";
import { uploadDataUrlToImgbb } from "../services/imgbb";
import { useNotify } from "./Notifications";
import { triggerHaptic } from "../lib/haptics";
import {
  formatCompactNumber,
  getSafeDisplayName,
  getSafePublicUsername,
} from "../lib/utils";
import {
  getTotalPostReactions,
  hasUserReactedToPost,
} from "../lib/feedAlgorithm";

/* ============================================================================
 * CRISP CUSTOM VECTOR ICONS (Matching IMG_5142, IMG_5143, IMG_5144, IMG_5145)
 * ========================================================================== */

/** Top-right Algorithm Sliders Icon with mini heart/circle thumbs (IMG_5142) */
export const ReelsTuneAlgorithmIcon: React.FC<{ className?: string }> = ({
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
    <line x1="3.5" y1="8" x2="8.2" y2="8" />
    <line x1="14.8" y1="8" x2="20.5" y2="8" />
    <path
      d="M11.5 10.3C11.5 10.3 8.8 8.6 8.8 6.9C8.8 5.9 9.6 5.2 10.5 5.2C11.1 5.2 11.5 5.6 11.5 5.6C11.5 5.6 11.9 5.2 12.5 5.2C13.4 5.2 14.2 5.9 14.2 6.9C14.2 8.6 11.5 10.3 11.5 10.3Z"
      fill="none"
    />
    <line x1="3.5" y1="16.5" x2="10.2" y2="16.5" />
    <line x1="16.8" y1="16.5" x2="20.5" y2="16.5" />
    <path
      d="M13.5 18.8C13.5 18.8 10.8 17.1 10.8 15.4C10.8 14.4 11.6 13.7 12.5 13.7C13.1 13.7 13.5 14.1 13.5 14.1C13.5 14.1 13.9 13.7 14.5 13.7C15.4 13.7 16.2 14.4 16.2 15.4C16.2 17.1 13.5 18.8 13.5 18.8Z"
      fill="none"
    />
  </svg>
);

const ReelCommentBubbleIcon: React.FC<{ className?: string }> = ({
  className = "w-7 h-7",
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
    <path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" />
  </svg>
);

const ReelRepostLoopIcon: React.FC<{ className?: string }> = ({
  className = "w-7 h-7",
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
    <path d="M17 2l3.5 3.5L17 9" />
    <path d="M5 11V8.5A3 3 0 0 1 8 5.5h12.5" />
    <path d="M7 22l-3.5-3.5L7 15" />
    <path d="M19 13v2.5a3 3 0 0 1-3 3H3.5" />
  </svg>
);

const ReelSharePlaneIcon: React.FC<{ className?: string }> = ({
  className = "w-7 h-7",
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
    <path d="M21.5 3.8H2.8L9.6 10.7L12.3 20.3L21.5 3.8Z" />
    <path d="M21.5 3.8L9.6 10.7" />
  </svg>
);

const ReelBookmarkRibbonIcon: React.FC<{
  className?: string;
  filled?: boolean;
}> = ({ className = "w-7 h-7", filled = false }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const UseReferenceIcon: React.FC<{ className?: string }> = ({
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
    <rect x="5" y="3" width="14" height="18" rx="4" />
    <rect x="10" y="7" width="4" height="6" rx="1.5" />
  </svg>
);

const RemixSequenceIcon: React.FC<{ className?: string }> = ({
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
    <path d="M17 3l3 3-3 3" />
    <path d="M4 11V8a2 2 0 0 1 2-2h14" />
    <path d="M7 21l-3-3 3-3" />
    <path d="M20 13v3a2 2 0 0 1-2 2H4" />
    <line x1="12" y1="9.5" x2="12" y2="14.5" />
    <line x1="9.5" y1="12" x2="14.5" y2="12" />
  </svg>
);

const ReportAlertBubbleIcon: React.FC<{ className?: string }> = ({
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
    <path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <circle cx="12" cy="15" r="0.6" fill="currentColor" />
  </svg>
);

const FunnelFilterOutlineIcon: React.FC<{ className?: string }> = ({
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
    <path d="M4 5h16l-6.2 7.4v5.1l-3.6 2v-7.1L4 5Z" />
  </svg>
);

const GifSquareBadgeIcon: React.FC<{ className?: string }> = ({
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
    <rect x="2.5" y="4" width="19" height="16" rx="4" />
    <text
      x="12"
      y="14.5"
      textAnchor="middle"
      fontSize="7.4"
      fontWeight="800"
      fill="currentColor"
      stroke="none"
      fontFamily="system-ui, sans-serif"
    >
      GIF
    </text>
  </svg>
);

const GiftRibbonOutlineIcon: React.FC<{ className?: string }> = ({
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
    <rect x="3" y="8" width="18" height="4" rx="1.5" />
    <path d="M12 8v13" />
    <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
    <path d="M7.5 8a2.5 2.5 0 0 1 0-5C10.5 3 12 8 12 8" />
    <path d="M16.5 8a2.5 2.5 0 0 0 0-5C13.5 3 12 8 12 8" />
  </svg>
);

export const SocialPlatformBrandIcon: React.FC<{
  platform: VideoPlatform;
  className?: string;
}> = ({ platform, className = "w-3.5 h-3.5" }) => {
  switch (platform) {
    case "instagram":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "youtube":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.7.5a2.7 2.7 0 0 0-1.9 1.9C2 8.9 2 12 2 12s0 3.1.4 4.8a2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.7.5 7.7.5s6 0 7.7-.5a2.7 2.7 0 0 0 1.9-1.9c.4-1.7.4-4.8.4-4.8s0-3.1-.4-4.8ZM10 15.3V8.7L15.6 12 10 15.3Z" />
        </svg>
      );
    case "facebook":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.5 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.6 1.6-1.6h1.7V3.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.3H7.3v3.2h2.8V21h3.4Z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.6 5.8A4.3 4.3 0 0 1 15.2 3h-3.1v12.4a2.6 2.6 0 1 1-1.8-2.5V9.7a5.8 5.8 0 1 0 5 5.7V9.1a7.4 7.4 0 0 0 4.3 1.4V7.4a4.4 4.4 0 0 1-3-1.6Z" />
        </svg>
      );
    case "x":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.2 3h3.1l-6.8 7.8L22.5 21h-6.2l-4.9-6.4L5.8 21H2.7l7.3-8.4L1.8 3h6.4l4.4 5.8L18.2 3Zm-1.1 16.1h1.7L7.1 4.8H5.3l11.8 14.3Z" />
        </svg>
      );
    default:
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <polygon points="10 8.5 16 12 10 15.5 10 8.5" fill="currentColor" />
        </svg>
      );
  }
};

/* ============================================================================
 * 1. SINGLE REEL VIDEO STAGE (Supports Autoplay, Speed, Mute, Docked Mode)
 * ========================================================================== */
interface SingleReelMediaStageProps {
  post: ScamPost;
  videoSource: ParsedVideoEmbed;
  isActive: boolean;
  isMuted: boolean;
  playbackSpeed: number;
  isDocked: boolean;
  onToggleMute: () => void;
  onProgressUpdate?: (progressPct: number) => void;
  onResolvedChange?: (resolved: ParsedVideoEmbed) => void;
  onVideoEnded?: () => void;
}

const SingleReelMediaStage: React.FC<SingleReelMediaStageProps> = ({
  post,
  videoSource,
  isActive,
  isMuted,
  playbackSpeed,
  isDocked,
  onToggleMute,
  onProgressUpdate,
  onResolvedChange,
  onVideoEnded,
}) => {
  const playerId = useId();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [resolved, setResolved] = useState<ParsedVideoEmbed>(videoSource);
  const [directFailed, setDirectFailed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showControlsHud, setShowControlsHud] = useState(false);
  const hudTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    setResolved(videoSource);
    setDirectFailed(false);
    setIsPaused(false);

    if (!videoSource.needsResolution) {
      onResolvedChange?.(videoSource);
      return;
    }

    resolveShortVideoUrl(videoSource.originalUrl).then((meta) => {
      if (!mounted) return;
      const reparsed = parseVideoEmbed(meta.resolvedUrl);
      let next: ParsedVideoEmbed;
      if (reparsed) {
        next = {
          ...reparsed,
          videoId:
            reparsed.videoId ||
            meta.tiktokVideoId ||
            meta.instagramShortcode ||
            undefined,
          shortcode:
            reparsed.shortcode || meta.instagramShortcode || reparsed.videoId,
          directStreamUrl: meta.directVideoUrl || reparsed.directStreamUrl,
          thumbnailUrl: meta.thumbnailUrl || reparsed.thumbnailUrl,
          needsResolution: false,
        };
      } else if (meta.tiktokVideoId) {
        next = {
          ...videoSource,
          platform: "tiktok",
          canonicalUrl: `https://www.tiktok.com/@tiktok/video/${meta.tiktokVideoId}`,
          videoId: meta.tiktokVideoId,
          directStreamUrl: meta.directVideoUrl || undefined,
          thumbnailUrl: meta.thumbnailUrl || undefined,
          isVertical: true,
          needsResolution: false,
        };
      } else if (meta.instagramShortcode) {
        next = {
          ...videoSource,
          platform: "instagram",
          canonicalUrl: `https://www.instagram.com/reel/${meta.instagramShortcode}/`,
          videoId: meta.instagramShortcode,
          shortcode: meta.instagramShortcode,
          directStreamUrl: meta.directVideoUrl || undefined,
          thumbnailUrl: meta.thumbnailUrl || undefined,
          isVertical: true,
          needsResolution: false,
        };
      } else {
        next = {
          ...videoSource,
          directStreamUrl: meta.directVideoUrl || videoSource.directStreamUrl,
          thumbnailUrl: meta.thumbnailUrl || videoSource.thumbnailUrl,
          needsResolution: false,
        };
      }
      setResolved(next);
      onResolvedChange?.(next);
    });

    return () => {
      mounted = false;
    };
  }, [videoSource.originalUrl, videoSource.platform, videoSource.needsResolution]);

  const usesNativeVideo =
    resolved.platform === "direct" ||
    (Boolean(resolved.directStreamUrl) && !directFailed);

  const sendYtCmd = (func: string, args: unknown[] = []) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  };

  const sendTtCmd = (type: string, value?: unknown) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const payload: Record<string, unknown> = { "x-tiktok-player": true, type };
    if (value !== undefined) payload.value = value;
    win.postMessage(payload, "*");
  };

  // Sync active autoplay / pause
  useEffect(() => {
    if (usesNativeVideo && videoRef.current) {
      const v = videoRef.current;
      v.muted = isMuted;
      v.playbackRate = playbackSpeed;
      if (isActive && !isPaused) {
        v.play().catch(() => {
          // Browser blocked unmuted autoplay: mute and retry automatically
          v.muted = true;
          v.play().catch(() => {});
        });
      } else {
        v.pause();
      }
      return;
    }

    if (resolved.platform === "youtube") {
      if (isActive && !isPaused) {
        sendYtCmd("playVideo");
        sendYtCmd(isMuted ? "mute" : "unMute");
        sendYtCmd("setPlaybackRate", [playbackSpeed]);
      } else {
        sendYtCmd("pauseVideo");
      }
    } else if (resolved.platform === "tiktok") {
      if (isActive && !isPaused) {
        sendTtCmd("play");
        sendTtCmd(isMuted ? "mute" : "unMute");
      } else {
        sendTtCmd("pause");
      }
    }
  }, [isActive, isPaused, isMuted, playbackSpeed, usesNativeVideo, resolved.platform]);

  // Listen to YouTube & TikTok telemetry for real progress bar updates
  useEffect(() => {
    if (!isActive || usesNativeVideo) return;
    const onMessage = (ev: MessageEvent) => {
      if (
        iframeRef.current?.contentWindow &&
        ev.source !== iframeRef.current.contentWindow
      ) {
        return;
      }
      try {
        const data =
          typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
        if (!data || typeof data !== "object") return;
        if (
          resolved.platform === "youtube" &&
          data.event === "infoDelivery" &&
          data.info
        ) {
          const ct = Number(data.info.currentTime || 0);
          const dur = Number(data.info.duration || 0);
          if (dur > 0) {
            onProgressUpdate?.(Math.min(100, (ct / dur) * 100));
          }
          if (data.info.playerState === 0) {
            onVideoEnded?.();
          }
        }
        if (
          resolved.platform === "tiktok" &&
          data["x-tiktok-player"] &&
          data.type === "onCurrentTime" &&
          data.value
        ) {
          const ct = Number(data.value.currentTime || 0);
          const dur = Number(data.value.duration || 0);
          if (dur > 0) {
            onProgressUpdate?.(Math.min(100, (ct / dur) * 100));
          }
        }
      } catch {}
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [isActive, usesNativeVideo, resolved.platform, onProgressUpdate, onVideoEnded]);

  const revealHudBriefly = (keepOpen: boolean) => {
    if (hudTimerRef.current) window.clearTimeout(hudTimerRef.current);
    setShowControlsHud(true);
    if (!keepOpen) {
      hudTimerRef.current = window.setTimeout(() => {
        setShowControlsHud(false);
      }, 1500);
    }
  };

  const handleTapStage = (e: React.MouseEvent) => {
    if (isDocked) return;
    e.stopPropagation();
    triggerHaptic();
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);
    revealHudBriefly(nextPaused);
  };

  const posterImg =
    resolved.thumbnailUrl ||
    post.images?.[0] ||
    (resolved.platform === "youtube" && resolved.videoId
      ? `https://i.ytimg.com/vi/${resolved.videoId}/hqdefault.jpg`
      : "");

  const renderMediaElement = () => {
    if (usesNativeVideo) {
      const src = resolved.directStreamUrl || resolved.canonicalUrl;
      return (
        <video
          ref={videoRef}
          src={src}
          poster={posterImg || undefined}
          playsInline
          loop={!onVideoEnded}
          muted={isMuted}
          autoPlay={isActive}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (isActive && v.duration > 0) {
              onProgressUpdate?.(
                Math.min(100, (v.currentTime / v.duration) * 100)
              );
            }
          }}
          onEnded={() => {
            if (onVideoEnded) {
              onVideoEnded();
            } else if (videoRef.current) {
              videoRef.current.currentTime = 0;
              videoRef.current.play().catch(() => {});
            }
          }}
          onError={() => {
            if (resolved.platform !== "direct") {
              setDirectFailed(true);
            }
          }}
          className="w-full h-full object-cover"
        />
      );
    }

    if (!isActive) {
      return posterImg ? (
        <img
          src={posterImg}
          alt={post.title || "Reel preview"}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-85"
        />
      ) : (
        <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
          <SocialPlatformBrandIcon
            platform={resolved.platform}
            className="w-10 h-10 text-white/30"
          />
        </div>
      );
    }

    if (resolved.platform === "youtube" && resolved.videoId) {
      const originParam =
        typeof window !== "undefined"
          ? `&origin=${encodeURIComponent(window.location.origin)}`
          : "";
      const ytSrc = `https://www.youtube.com/embed/${
        resolved.videoId
      }?enablejsapi=1&autoplay=1&mute=${
        isMuted ? "1" : "0"
      }&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${
        resolved.videoId
      }${originParam}`;

      return (
        <iframe
          ref={iframeRef}
          src={ytSrc}
          title="YouTube Reel"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={() => {
            iframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: "listening", id: playerId }),
              "*"
            );
            if (!isPaused) {
              sendYtCmd("playVideo");
              sendYtCmd(isMuted ? "mute" : "unMute");
            }
          }}
          className="w-full h-full border-0 pointer-events-auto"
        />
      );
    }

    if (resolved.platform === "tiktok" && resolved.videoId) {
      const ttSrc = `https://www.tiktok.com/player/v1/${
        resolved.videoId
      }?autoplay=1&mute=${
        isMuted ? "1" : "0"
      }&controls=0&progress_bar=0&play_button=0&volume_control=0&fullscreen_button=0&timestamp=0&loop=1&music_info=0&description=0&rel=0`;
      return (
        <iframe
          ref={iframeRef}
          src={ttSrc}
          title="TikTok Reel"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          className="w-full h-full border-0 pointer-events-auto"
        />
      );
    }

    if (resolved.platform === "instagram") {
      const code = resolved.shortcode || resolved.videoId;
      const isPost = /\/p\//i.test(resolved.canonicalUrl);
      if (code) {
        return (
          <div className="w-full h-full flex items-center justify-center bg-black overflow-hidden">
            <iframe
              ref={iframeRef}
              src={`https://www.instagram.com/${
                isPost ? "p" : "reel"
              }/${code}/embed/`}
              title="Instagram Reel"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              allowFullScreen
              scrolling="no"
              className="w-full h-[112%] -mt-[6%] border-0 pointer-events-auto"
            />
          </div>
        );
      }
    }

    if (resolved.platform === "facebook") {
      const fbSrc = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
        resolved.canonicalUrl
      )}&show_text=false&autoplay=true&mute=${
        isMuted ? "1" : "0"
      }&allowfullscreen=true`;
      return (
        <iframe
          ref={iframeRef}
          src={fbSrc}
          title="Facebook Reel"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          scrolling="no"
          className="w-full h-full border-0 pointer-events-auto"
        />
      );
    }

    if (resolved.platform === "vimeo" && resolved.videoId) {
      return (
        <iframe
          ref={iframeRef}
          src={`https://player.vimeo.com/video/${resolved.videoId}?autoplay=1&muted=${
            isMuted ? "1" : "0"
          }&loop=1&title=0&byline=0&portrait=0`}
          title="Vimeo Reel"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      );
    }

    if (resolved.platform === "streamable" && resolved.videoId) {
      return (
        <iframe
          ref={iframeRef}
          src={`https://streamable.com/e/${resolved.videoId}?autoplay=1&muted=${
            isMuted ? "1" : "0"
          }&loop=1`}
          title="Streamable Reel"
          allow="autoplay; fullscreen"
          allowFullScreen
          className="w-full h-full border-0"
        />
      );
    }

    if (resolved.platform === "dailymotion" && resolved.videoId) {
      return (
        <iframe
          ref={iframeRef}
          src={`https://www.dailymotion.com/embed/video/${resolved.videoId}?autoplay=1&mute=${
            isMuted ? "1" : "0"
          }`}
          title="Dailymotion Reel"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      );
    }

    if (resolved.platform === "x" && resolved.videoId) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-black px-2">
          <iframe
            ref={iframeRef}
            src={`https://platform.twitter.com/embed/Tweet.html?id=${resolved.videoId}&theme=dark&dnt=true`}
            title="X Video"
            allow="autoplay; fullscreen"
            className="w-full h-[80%] border-0 rounded-2xl"
          />
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-zinc-950 px-6 text-center">
        <SocialPlatformBrandIcon
          platform={resolved.platform}
          className="w-10 h-10 text-white/75"
        />
        <a
          href={resolved.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-xs font-semibold text-white inline-flex items-center gap-1.5"
        >
          <span>Watch on {getVideoPlatformMeta(resolved.platform).name}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  };

  const supportsTapOverlay =
    usesNativeVideo ||
    resolved.platform === "youtube" ||
    resolved.platform === "tiktok";

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">
      {renderMediaElement()}

      {/* Tap-to-Play/Pause Catch Layer for controllable players */}
      {supportsTapOverlay && !isDocked && (
        <div
          onClick={handleTapStage}
          className="absolute inset-0 z-10 cursor-pointer"
        />
      )}

      {/* Center Stacked Glassmorphic Mute + Play/Pause Circles (Exact IMG_5142) */}
      <AnimatePresence>
        {!isDocked && supportsTapOverlay && (isPaused || showControlsHud) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-center gap-3"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic();
                onToggleMute();
                revealHudBriefly(isPaused);
              }}
              aria-label={isMuted ? "Unmute reel" : "Mute reel"}
              className="pointer-events-auto w-12 h-12 rounded-full bg-black/45 backdrop-blur-md border border-white/15 text-white flex items-center justify-center active:scale-90 transition cursor-pointer shadow-lg"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>

            <button
              type="button"
              onClick={handleTapStage}
              aria-label={isPaused ? "Play reel" : "Pause reel"}
              className="pointer-events-auto w-[72px] h-[72px] rounded-full bg-black/45 backdrop-blur-md border border-white/15 text-white flex items-center justify-center active:scale-90 transition cursor-pointer shadow-xl"
            >
              {isPaused ? (
                <Play className="w-8 h-8 fill-white ml-1" />
              ) : (
                <Pause className="w-8 h-8 fill-white" />
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Sound Pill in top-right below header when muted on controllable stream */}
      {!isDocked && supportsTapOverlay && isMuted && !isPaused && !showControlsHud && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic();
            onToggleMute();
          }}
          aria-label="Unmute audio"
          className="absolute right-3.5 bottom-[104px] z-20 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white flex items-center justify-center active:scale-90 transition cursor-pointer"
        >
          <VolumeX className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

/* ============================================================================
 * 2. "YOUR ALGORITHM" SCREEN / MODAL (Exact IMG_5144 — White in Light, Black in Dark)
 * ========================================================================== */
export const YourAlgorithmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  allPosts?: ScamPost[];
  prefs: LoopsAlgorithmPrefs;
  onChangePrefs: (next: LoopsAlgorithmPrefs) => void;
}> = ({ isOpen, onClose, allPosts = [], prefs, onChangePrefs }) => {
  const navigate = useNavigate();
  const notify = useNotify();

  const [showAllSuggested, setShowAllSuggested] = useState(false);
  const [addingTarget, setAddingTarget] = useState<"more" | "less" | null>(
    null
  );
  const [customTopicInput, setCustomTopicInput] = useState("");
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Build dynamic suggested topics from real posts + FEED_THEMES + curated topics
  const suggestedTopics = useMemo(() => {
    const pool = new Set<string>(CURATED_SUGGESTED_TOPICS);
    FEED_THEMES.forEach((t) => pool.add(t.label));
    allPosts.slice(0, 40).forEach((p) => {
      extractPostTopicsForAlgorithm(p).forEach((topic) => pool.add(topic));
    });
    DEFAULT_MORE_TOPICS.forEach((t) => pool.add(t));

    return Array.from(pool).filter(
      (t) =>
        !prefs.moreTopics.some(
          (m) => m.toLowerCase() === t.toLowerCase()
        ) &&
        !prefs.lessTopics.some((l) => l.toLowerCase() === t.toLowerCase())
    );
  }, [allPosts, prefs.moreTopics, prefs.lessTopics]);

  const initialVisibleSuggestions = showAllSuggested
    ? suggestedTopics
    : suggestedTopics.slice(0, 3);
  const hiddenSuggestionsCount = Math.max(
    0,
    suggestedTopics.length - initialVisibleSuggestions.length
  );

  const handleAddMoreTopic = async (topic: string) => {
    const clean = topic.trim();
    if (!clean) return;
    triggerHaptic();
    const updated = await saveAlgorithmPrefs(
      {
        ...prefs,
        moreTopics: [...prefs.moreTopics, clean],
        lessTopics: prefs.lessTopics.filter(
          (x) => x.toLowerCase() !== clean.toLowerCase()
        ),
      },
      auth.currentUser?.uid
    );
    onChangePrefs(updated);
  };

  const handleRemoveMoreTopic = async (topic: string) => {
    triggerHaptic();
    const updated = await saveAlgorithmPrefs(
      {
        ...prefs,
        moreTopics: prefs.moreTopics.filter((x) => x !== topic),
      },
      auth.currentUser?.uid
    );
    onChangePrefs(updated);
  };

  const handleAddLessTopic = async (topic: string) => {
    const clean = topic.trim();
    if (!clean) return;
    triggerHaptic();
    const updated = await saveAlgorithmPrefs(
      {
        ...prefs,
        lessTopics: [...prefs.lessTopics, clean],
        moreTopics: prefs.moreTopics.filter(
          (x) => x.toLowerCase() !== clean.toLowerCase()
        ),
      },
      auth.currentUser?.uid
    );
    onChangePrefs(updated);
  };

  const handleRemoveLessTopic = async (topic: string) => {
    triggerHaptic();
    const updated = await saveAlgorithmPrefs(
      {
        ...prefs,
        lessTopics: prefs.lessTopics.filter((x) => x !== topic),
      },
      auth.currentUser?.uid
    );
    onChangePrefs(updated);
  };

  const handleToggleStrictFilter = async () => {
    triggerHaptic();
    const nextStrict = !prefs.strictFilter;
    const updated = await saveAlgorithmPrefs(
      {
        ...prefs,
        strictFilter: nextStrict,
      },
      auth.currentUser?.uid
    );
    onChangePrefs(updated);
    notify(
      nextStrict
        ? "Focused topic filter enabled"
        : "Showing broader community recommendations",
      "info"
    );
  };

  const handleResetAlgorithm = async () => {
    triggerHaptic();
    setMoreMenuOpen(false);
    const updated = await saveAlgorithmPrefs(
      {
        moreTopics: DEFAULT_MORE_TOPICS,
        lessTopics: [],
        strictFilter: false,
        updatedAt: Date.now(),
      },
      auth.currentUser?.uid
    );
    onChangePrefs(updated);
    notify("Algorithm preferences reset", "success");
  };

  const handleSubmitCustomTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customTopicInput.trim().replace(/^#/, "");
    if (!clean || !addingTarget) return;
    if (addingTarget === "more") {
      await handleAddMoreTopic(clean);
    } else {
      await handleAddLessTopic(clean);
    }
    setCustomTopicInput("");
    setAddingTarget(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[130] bg-white text-zinc-950 dark:bg-black dark:text-white overflow-y-auto"
        >
          <div className="max-w-[540px] mx-auto px-5 pt-4 pb-16 min-h-full">
            {/* Top Bar (Exact IMG_5144) */}
            <header className="flex items-center justify-between gap-3 py-2">
              <div className="flex items-center gap-3.5 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    onClose();
                  }}
                  aria-label="Back"
                  className="w-11 h-11 rounded-full bg-zinc-100 hover:bg-zinc-200/80 dark:bg-[#16181C] dark:hover:bg-[#22252B] border border-zinc-200/80 dark:border-white/10 flex items-center justify-center text-zinc-900 dark:text-white transition cursor-pointer shrink-0"
                >
                  <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
                </button>
                <h1 className="text-[20px] font-bold tracking-tight truncate">
                  Your algorithm
                </h1>
              </div>

              <div className="relative flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setMoreMenuOpen((prev) => !prev);
                  }}
                  aria-label="Algorithm options"
                  className="w-11 h-11 rounded-full bg-zinc-100 hover:bg-zinc-200/80 dark:bg-[#16181C] dark:hover:bg-[#22252B] border border-zinc-200/80 dark:border-white/10 flex items-center justify-center text-zinc-900 dark:text-white transition cursor-pointer"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={handleToggleStrictFilter}
                  aria-label="Toggle strict topic filter"
                  title="Filter strictly by your topics"
                  className={`w-11 h-11 rounded-full border flex items-center justify-center transition cursor-pointer ${
                    prefs.strictFilter
                      ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950 dark:border-white"
                      : "bg-zinc-100 hover:bg-zinc-200/80 dark:bg-[#16181C] dark:hover:bg-[#22252B] border-zinc-200/80 dark:border-white/10 text-zinc-900 dark:text-white"
                  }`}
                >
                  <FunnelFilterOutlineIcon className="w-5 h-5" />
                </button>

                <AnimatePresence>
                  {moreMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.94, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.94, y: -6 }}
                      className="absolute right-0 top-13 z-30 w-56 rounded-2xl bg-white dark:bg-[#1C1D22] border border-zinc-200 dark:border-white/10 shadow-xl py-1.5 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setMoreMenuOpen(false);
                          onClose();
                          navigate("/loops/personalization");
                        }}
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/5 cursor-pointer"
                      >
                        Feed Personalization
                      </button>
                      <button
                        type="button"
                        onClick={handleResetAlgorithm}
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-[#FF3040] hover:bg-zinc-100 dark:hover:bg-white/5 cursor-pointer border-t border-zinc-100 dark:border-white/10"
                      >
                        Reset preferences
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </header>

            {/* Hero Summary Headline (Exact IMG_5144) */}
            <section className="mt-7 mb-9">
              <h2 className="text-[27px] sm:text-[31px] font-bold leading-[1.22] tracking-tight text-zinc-950 dark:text-white [text-wrap:balance]">
                {buildAlgorithmHeroHeadline(prefs.moreTopics)}
              </h2>
            </section>

            {/* Section 1: What you want to see more of */}
            <section className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-[16.5px] font-bold text-zinc-950 dark:text-white">
                  What you want to see more of
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    onClose();
                    navigate("/loops/activity");
                  }}
                  className="inline-flex items-center gap-1 text-[13.5px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <span>Based on your activity</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Selected Active Topic Pills + Suggested (+ Topic) Pills */}
              <div className="flex flex-wrap gap-2.5 pt-1">
                {prefs.moreTopics.map((topic) => (
                  <button
                    key={`more_${topic}`}
                    type="button"
                    onClick={() => handleRemoveMoreTopic(topic)}
                    title="Tap to remove topic"
                    className="px-4 py-2.5 rounded-full bg-[#F1F3F5] hover:bg-zinc-200/80 dark:bg-[#14171A] dark:hover:bg-[#1E2227] border border-zinc-200/70 dark:border-white/[0.06] text-[14px] font-semibold text-zinc-900 dark:text-white transition cursor-pointer whitespace-nowrap"
                  >
                    {topic}
                  </button>
                ))}

                {initialVisibleSuggestions.map((sug) => (
                  <button
                    key={`sug_${sug}`}
                    type="button"
                    onClick={() => handleAddMoreTopic(sug)}
                    className="px-4 py-2.5 rounded-full bg-transparent hover:bg-zinc-100 dark:hover:bg-white/[0.06] border border-zinc-300 dark:border-zinc-700 text-[14px] font-semibold text-zinc-900 dark:text-white inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 stroke-[2.2]" />
                    <span>{sug}</span>
                  </button>
                ))}

                {hiddenSuggestionsCount > 0 && !showAllSuggested && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setShowAllSuggested(true);
                    }}
                    className="px-4 py-2.5 rounded-full bg-transparent hover:bg-zinc-100 dark:hover:bg-white/[0.06] border border-zinc-300 dark:border-zinc-700 text-[14px] font-semibold text-zinc-900 dark:text-white inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap tabular-nums"
                  >
                    <span>See More</span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {hiddenSuggestionsCount}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setAddingTarget(addingTarget === "more" ? null : "more");
                    setCustomTopicInput("");
                  }}
                  className="px-4 py-2.5 rounded-full bg-transparent hover:bg-zinc-100 dark:hover:bg-white/[0.06] border border-zinc-300 dark:border-zinc-700 text-[14px] font-semibold text-zinc-900 dark:text-white inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 stroke-[2.2]" />
                  <span>Add</span>
                </button>
              </div>

              {addingTarget === "more" && (
                <form
                  onSubmit={handleSubmitCustomTopic}
                  className="flex items-center gap-2 pt-1"
                >
                  <input
                    type="text"
                    autoFocus
                    value={customTopicInput}
                    onChange={(e) => setCustomTopicInput(e.target.value)}
                    placeholder="Add a topic (e.g. Gadget Reviews)..."
                    className="flex-1 px-4 py-2.5 rounded-full bg-zinc-100 dark:bg-[#16181C] border border-zinc-200 dark:border-white/10 text-sm text-zinc-900 dark:text-white outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!customTopicInput.trim()}
                    className="px-4 py-2.5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold disabled:opacity-40 cursor-pointer whitespace-nowrap"
                  >
                    Add topic
                  </button>
                </form>
              )}
            </section>

            {/* Section 2: What you want to see less of */}
            <section className="mt-10 space-y-4">
              <h3 className="text-[16.5px] font-bold text-zinc-950 dark:text-white">
                What you want to see less of
              </h3>

              <div className="flex flex-wrap gap-2.5">
                {prefs.lessTopics.map((topic) => (
                  <button
                    key={`less_${topic}`}
                    type="button"
                    onClick={() => handleRemoveLessTopic(topic)}
                    title="Tap to unmute topic"
                    className="px-4 py-2.5 rounded-full bg-[#F1F3F5] hover:bg-zinc-200/80 dark:bg-[#14171A] dark:hover:bg-[#1E2227] border border-zinc-200/70 dark:border-white/[0.06] text-[14px] font-semibold text-zinc-900 dark:text-white inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                  >
                    <span>{topic}</span>
                    <X className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setAddingTarget(addingTarget === "less" ? null : "less");
                    setCustomTopicInput("");
                  }}
                  className="px-4 py-2.5 rounded-full bg-transparent hover:bg-zinc-100 dark:hover:bg-white/[0.06] border border-zinc-300 dark:border-zinc-700 text-[14px] font-semibold text-zinc-900 dark:text-white inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 stroke-[2.2]" />
                  <span>Add</span>
                </button>
              </div>

              {addingTarget === "less" && (
                <form
                  onSubmit={handleSubmitCustomTopic}
                  className="flex items-center gap-2 pt-1"
                >
                  <input
                    type="text"
                    autoFocus
                    value={customTopicInput}
                    onChange={(e) => setCustomTopicInput(e.target.value)}
                    placeholder="Mute a topic or keyword..."
                    className="flex-1 px-4 py-2.5 rounded-full bg-zinc-100 dark:bg-[#16181C] border border-zinc-200 dark:border-white/10 text-sm text-zinc-900 dark:text-white outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!customTopicInput.trim()}
                    className="px-4 py-2.5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold disabled:opacity-40 cursor-pointer whitespace-nowrap"
                  >
                    Mute
                  </button>
                </form>
              )}
            </section>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* Standalone Route Wrapper for /loops/algorithm */
export const LoopsAlgorithmPage: React.FC = () => {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<LoopsAlgorithmPrefs>(() =>
    loadLocalAlgorithmPrefs()
  );

  useEffect(() => {
    syncAlgorithmPrefsFromFirestore(auth.currentUser?.uid).then(setPrefs);
  }, []);

  return (
    <YourAlgorithmModal
      isOpen={true}
      onClose={() => navigate(-1)}
      prefs={prefs}
      onChangePrefs={setPrefs}
    />
  );
};

/* ============================================================================
 * 3. "ABOUT THIS REEL" BOTTOM SHEET (Exact IMG_5143 — White in Light, Dark in Dark)
 * ========================================================================== */
const AboutThisReelSheet: React.FC<{
  isOpen: boolean;
  post: ScamPost | null;
  videoSource: ParsedVideoEmbed | null;
  creatorHandle: string;
  creatorAvatar: string;
  isFollowingCreator: boolean;
  playbackSpeed: number;
  autoAdvance: boolean;
  onChangePlaybackSpeed: (speed: number) => void;
  onToggleAutoAdvance: () => void;
  onMarkInterested: (post: ScamPost) => void;
  onMarkNotInterested: (post: ScamPost) => void;
  onOpenAlgorithm: () => void;
  onClose: () => void;
}> = ({
  isOpen,
  post,
  videoSource,
  creatorHandle,
  creatorAvatar,
  isFollowingCreator,
  playbackSpeed,
  autoAdvance,
  onChangePlaybackSpeed,
  onToggleAutoAdvance,
  onMarkInterested,
  onMarkNotInterested,
  onOpenAlgorithm,
  onClose,
}) => {
  const navigate = useNavigate();
  const notify = useNotify();

  const [searchQuery, setSearchQuery] = useState("");
  const [showSourcesDetail, setShowSourcesDetail] = useState(false);
  const [showPlaybackPanel, setShowPlaybackPanel] = useState(false);
  const [showWhyPanel, setShowWhyPanel] = useState(false);
  const [showReportPanel, setShowReportPanel] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setShowSourcesDetail(false);
      setShowPlaybackPanel(false);
      setShowWhyPanel(false);
      setShowReportPanel(false);
    }
  }, [isOpen, post?.id]);

  if (!post) return null;

  const platformMeta = videoSource
    ? getVideoPlatformMeta(videoSource.platform, videoSource.originalUrl)
    : getVideoPlatformMeta("direct");

  const summaryText =
    post.description?.trim() ||
    post.title?.trim() ||
    `Shared by @${creatorHandle} on Loops${
      videoSource && videoSource.platform !== "direct"
        ? ` via ${platformMeta.reelLabel}.`
        : "."
    }`;

  const audioTitle = post.music?.title
    ? `${post.music.title} · ${post.music.artist || creatorHandle}`
    : videoSource && videoSource.platform !== "direct"
    ? `${platformMeta.shortName} audio · ${creatorHandle}`
    : `Original audio · ${creatorHandle}`;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q =
      searchQuery.trim() ||
      extractPostTopicsForAlgorithm(post)[0] ||
      creatorHandle;
    onClose();
    navigate(`/loops/search?q=${encodeURIComponent(q)}`);
  };

  const handleSubmitReport = async (reason: string) => {
    if (submittingReport) return;
    setSubmittingReport(true);
    triggerHaptic();
    try {
      await addDoc(collection(db, "reports"), {
        targetType: "reel",
        targetId: post.id,
        postTitle: post.title || "",
        reportedCreatorId: post.reporterId || "",
        reporterId: auth.currentUser?.uid || "anonymous",
        reason,
        createdAt: Date.now(),
        status: "pending",
      });
      notify("Thank you. Our moderation team will review this reel.", "success");
      onClose();
    } catch {
      notify("Report recorded for review.", "info");
      onClose();
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[125] flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/55 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-[126] w-full max-w-[480px] mx-auto max-h-[88dvh] overflow-y-auto no-scrollbar rounded-t-[30px] bg-white text-zinc-950 dark:bg-[#121214] dark:text-white px-4 pt-3 pb-8 shadow-2xl border-t border-zinc-200/70 dark:border-white/10"
          >
            {/* Grab Handle */}
            <div className="w-10 h-1 rounded-full bg-zinc-400/60 dark:bg-zinc-600 mx-auto mb-4" />

            {/* Title & Description + Sources (Exact IMG_5143) */}
            <div className="px-1 space-y-2">
              <h2 className="text-[18px] font-bold tracking-tight text-zinc-950 dark:text-white">
                About this reel
              </h2>
              <p className="text-[15px] leading-[1.45] text-zinc-800 dark:text-zinc-200 whitespace-pre-line line-clamp-5">
                {summaryText}
              </p>

              {/* Sources Attribution */}
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setShowSourcesDetail((prev) => !prev);
                  }}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                >
                  <span>Sources</span>
                  <span aria-hidden="true">·</span>
                  <SocialPlatformBrandIcon
                    platform={platformMeta.platform}
                    className="w-3.5 h-3.5"
                  />
                  <span>{platformMeta.reelLabel}</span>
                </button>

                {showSourcesDetail && videoSource && (
                  <div className="mt-2 p-3 rounded-2xl bg-[#F3F4F6] dark:bg-[#1E1F23] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">
                        {platformMeta.name} ({platformMeta.domain})
                      </p>
                      <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400 truncate">
                        {videoSource.originalUrl}
                      </p>
                    </div>
                    {videoSource.platform !== "direct" && (
                      <a
                        href={videoSource.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold inline-flex items-center gap-1 shrink-0 whitespace-nowrap"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Search Related Reels Bar (Clean functional search in place of third-party chatbot) */}
            <form onSubmit={handleSearchSubmit} className="mt-4">
              <div className="flex items-center gap-3 px-4 py-3 rounded-full bg-[#F3F4F6] dark:bg-[#1E1F23]">
                <Search className="w-5 h-5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search related reels or topics..."
                  className="flex-1 bg-transparent text-[15px] text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-400 outline-none"
                />
                <button
                  type="submit"
                  aria-label="Search related reels"
                  className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Card Group 1: Audio, Use as reference, Remix and sequence */}
            <div className="mt-3.5 rounded-2xl bg-[#F3F4F6] dark:bg-[#1E1F23] overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onClose();
                  if (post.reporterId) {
                    navigate(`/loops/profile/${post.reporterId}`);
                  }
                }}
                className="w-full px-4 py-3.5 flex items-center gap-3.5 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition cursor-pointer"
              >
                {creatorAvatar ? (
                  <img
                    src={creatorAvatar}
                    alt={creatorHandle}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                    <Music2 className="w-5 h-5 text-zinc-500" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-zinc-950 dark:text-white truncate">
                    {audioTitle}
                  </p>
                  <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
                    Audio
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onClose();
                  navigate(`/loops/create?quotePostId=${post.id}`);
                }}
                className="w-full px-4 py-3.5 flex items-center gap-3.5 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition cursor-pointer"
              >
                <div className="w-10 flex items-center justify-center shrink-0 text-zinc-900 dark:text-white">
                  <UseReferenceIcon className="w-[22px] h-[22px]" />
                </div>
                <span className="text-[15.5px] font-medium text-zinc-950 dark:text-white">
                  Use as reference
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onClose();
                  navigate(`/loops/create?quotePostId=${post.id}&remix=1`);
                }}
                className="w-full px-4 py-3.5 flex items-center gap-3.5 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition cursor-pointer"
              >
                <div className="w-10 flex items-center justify-center shrink-0 text-zinc-900 dark:text-white">
                  <RemixSequenceIcon className="w-[22px] h-[22px]" />
                </div>
                <span className="text-[15.5px] font-medium text-zinc-950 dark:text-white">
                  Remix and sequence
                </span>
              </button>
            </div>

            {/* Card Group 2: Playback */}
            <div className="mt-3 rounded-2xl bg-[#F3F4F6] dark:bg-[#1E1F23] overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setShowPlaybackPanel((prev) => !prev);
                }}
                className="w-full px-4 py-3.5 flex items-center justify-between gap-3.5 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 flex items-center justify-center shrink-0 text-zinc-900 dark:text-white">
                    <svg
                      className="w-[22px] h-[22px]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="9.5" />
                      <polygon
                        points="10.2 8.6 15.8 12 10.2 15.4 10.2 8.6"
                        fill="none"
                      />
                    </svg>
                  </div>
                  <span className="text-[15.5px] font-medium text-zinc-950 dark:text-white">
                    Playback
                  </span>
                </div>
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {playbackSpeed}x
                </span>
              </button>

              {showPlaybackPanel && (
                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-black/[0.05] dark:border-white/[0.06]">
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      Playback speed
                    </p>
                    <div className="flex items-center gap-1.5">
                      {[0.75, 1, 1.25, 1.5, 2].map((sp) => (
                        <button
                          key={sp}
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            onChangePlaybackSpeed(sp);
                          }}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer tabular-nums ${
                            playbackSpeed === sp
                              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                              : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          {sp}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      onToggleAutoAdvance();
                    }}
                    className="w-full flex items-center justify-between py-1 text-sm font-medium text-zinc-900 dark:text-white cursor-pointer"
                  >
                    <span>Auto-scroll to next reel</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        autoAdvance
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {autoAdvance ? "On" : "Off"}
                    </span>
                  </button>

                  {videoSource && videoSource.platform !== "direct" && (
                    <a
                      href={videoSource.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 rounded-xl bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-900 dark:text-white flex items-center justify-center gap-1.5"
                    >
                      <span>Open original on {platformMeta.name}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Card Group 3: Why you're seeing this post, Interested, Not interested, Report */}
            <div className="mt-3 rounded-2xl bg-[#F3F4F6] dark:bg-[#1E1F23] overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setShowWhyPanel((prev) => !prev);
                }}
                className="w-full px-4 py-3.5 flex items-center gap-3.5 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition cursor-pointer"
              >
                <div className="w-10 flex items-center justify-center shrink-0 text-zinc-900 dark:text-white">
                  <Info className="w-[22px] h-[22px]" />
                </div>
                <span className="text-[15.5px] font-medium text-zinc-950 dark:text-white">
                  Why you&apos;re seeing this post
                </span>
              </button>

              {showWhyPanel && (
                <div className="px-4 pb-3.5 pt-1 space-y-2.5 border-b border-black/[0.05] dark:border-white/[0.06]">
                  <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {isFollowingCreator
                      ? `You follow @${creatorHandle} on Loops.`
                      : `Recommended based on community engagement and your active algorithm topics.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      onClose();
                      onOpenAlgorithm();
                    }}
                    className="text-xs font-bold text-[#0095F6] hover:underline cursor-pointer"
                  >
                    Manage Your algorithm →
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onMarkInterested(post);
                  onClose();
                }}
                className="w-full px-4 py-3.5 flex items-center gap-3.5 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition cursor-pointer"
              >
                <div className="w-10 flex items-center justify-center shrink-0 text-zinc-900 dark:text-white">
                  <CheckCircle2 className="w-[22px] h-[22px]" />
                </div>
                <span className="text-[15.5px] font-medium text-zinc-950 dark:text-white">
                  Interested
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onMarkNotInterested(post);
                  onClose();
                }}
                className="w-full px-4 py-3.5 flex items-center gap-3.5 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition cursor-pointer"
              >
                <div className="w-10 flex items-center justify-center shrink-0 text-zinc-900 dark:text-white">
                  <XCircle className="w-[22px] h-[22px]" />
                </div>
                <span className="text-[15.5px] font-medium text-zinc-950 dark:text-white">
                  Not interested
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setShowReportPanel((prev) => !prev);
                }}
                className="w-full px-4 py-3.5 flex items-center gap-3.5 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition cursor-pointer"
              >
                <div className="w-10 flex items-center justify-center shrink-0 text-[#FF3040]">
                  <ReportAlertBubbleIcon className="w-[22px] h-[22px]" />
                </div>
                <span className="text-[15.5px] font-medium text-[#FF3040]">
                  Report
                </span>
              </button>

              {showReportPanel && (
                <div className="px-4 pb-4 pt-1 space-y-1.5 border-t border-black/[0.05] dark:border-white/[0.06]">
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 pb-1">
                    Why are you reporting this reel?
                  </p>
                  {[
                    "Spam or misleading link",
                    "Scam or fraud",
                    "Inappropriate or harmful content",
                    "Intellectual property violation",
                  ].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      disabled={submittingReport}
                      onClick={() => handleSubmitReport(reason)}
                      className="w-full py-2 px-3 rounded-xl bg-white dark:bg-zinc-800 text-left text-xs font-semibold text-zinc-900 dark:text-white hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
 * 4. INTERACTIVE SPLIT-SCREEN COMMENTS SHEET (Exact IMG_5145 — White Light / Dark Mode)
 * ========================================================================== */
const QUICK_COMMENT_EMOJIS = [
  "❤️",
  "🙌",
  "🔥",
  "👏",
  "😢",
  "😍",
  "😮",
  "😂",
];

const renderCommentTextWithMentions = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(@[a-zA-Z0-9_.-]+)/g);
  return parts.map((part, idx) =>
    part.startsWith("@") ? (
      <span key={idx} className="text-[#3897F0] font-medium">
        {part}
      </span>
    ) : (
      <React.Fragment key={idx}>{part}</React.Fragment>
    )
  );
};

const getTotalCommentLikes = (cmt: ScamComment): number => {
  if (cmt.reactionsCount && typeof cmt.reactionsCount === "object") {
    const sum = Object.values(cmt.reactionsCount).reduce(
      (acc, v) => acc + (Number(v) || 0),
      0
    );
    if (sum > 0) return sum;
  }
  if (cmt.reactions && typeof cmt.reactions === "object") {
    return Object.keys(cmt.reactions).length;
  }
  return 0;
};

interface ReelCommentsSheetProps {
  post: ScamPost;
  creatorHandle: string;
  currentUser: any;
  userProfile: UserProfile | null;
  userAvatar: string;
  initialReplyTarget: { commentId: string; userName: string } | null;
  onClose: () => void;
  onCommentCountDelta: (postId: string, delta: number) => void;
}

const ReelCommentsSheet: React.FC<ReelCommentsSheetProps> = ({
  post,
  creatorHandle,
  currentUser,
  userProfile,
  userAvatar,
  initialReplyTarget,
  onClose,
  onCommentCountDelta,
}) => {
  const navigate = useNavigate();
  const notify = useNotify();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const submittingRef = useRef(false);

  const [comments, setComments] = useState<ScamComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [profilesMap, setProfilesMap] = useState<
    Record<string, Partial<UserProfile>>
  >({});
  const [expandedThreads, setExpandedThreads] = useState<
    Record<string, boolean>
  >({});

  const [commentText, setCommentText] = useState("");
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gifSheetOpen, setGifSheetOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    userName: string;
  } | null>(initialReplyTarget);

  useEffect(() => {
    if (initialReplyTarget) {
      setReplyingTo(initialReplyTarget);
      window.setTimeout(() => inputRef.current?.focus(), 180);
    }
  }, [initialReplyTarget]);

  // Real-time Firestore comments listener (synced with NewsDetails)
  useEffect(() => {
    setLoading(true);
    const loadLocal = (): ScamComment[] => {
      try {
        const all = JSON.parse(
          localStorage.getItem("deep_post_comments") || "{}"
        );
        return Array.isArray(all[post.id]) ? all[post.id] : [];
      } catch {
        return [];
      }
    };

    const q = query(
      collection(db, "scam_posts", post.id, "comments"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const remote = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ScamComment, "id">),
        }));
        const local = loadLocal();
        const merged = new Map<string, ScamComment>();
        remote.forEach((c) => merged.set(c.id, c));
        local.forEach((lc) => {
          if (!merged.has(lc.id)) merged.set(lc.id, lc);
        });
        const list = Array.from(merged.values())
          .filter(
            (c) =>
              c.status !== "pending_approval" ||
              c.userId === currentUser?.uid ||
              post.reporterId === currentUser?.uid
          )
          .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        setComments(list);
        setLoading(false);
      },
      () => {
        setComments(loadLocal());
        setLoading(false);
      }
    );

    return () => unsub();
  }, [post.id, currentUser?.uid, post.reporterId]);

  // Enrich comment author avatars/handles from `users/{uid}`
  useEffect(() => {
    const missing = Array.from(
      new Set(
        comments
          .map((c) => c.userId)
          .filter(
            (uid) =>
              Boolean(uid) && uid !== "guest_local" && !profilesMap[uid]
          )
      )
    );
    if (!missing.length) return;

    let cancelled = false;
    Promise.all(
      missing.map(async (uid) => {
        try {
          const snap = await getDoc(doc(db, "users", uid));
          if (snap.exists()) {
            return [uid, snap.data() as Partial<UserProfile>] as const;
          }
        } catch {}
        return [uid, {} as Partial<UserProfile>] as const;
      })
    ).then((entries) => {
      if (cancelled) return;
      setProfilesMap((prev) => {
        const next = { ...prev };
        entries.forEach(([k, v]) => {
          next[k] = v;
        });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [comments]);

  const { rootComments, repliesByParent } = useMemo(() => {
    const roots: ScamComment[] = [];
    const byParent: Record<string, ScamComment[]> = {};
    const idSet = new Set(comments.map((c) => c.id));

    comments.forEach((c) => {
      if (c.replyToCommentId && idSet.has(c.replyToCommentId)) {
        if (!byParent[c.replyToCommentId]) byParent[c.replyToCommentId] = [];
        byParent[c.replyToCommentId].push(c);
      } else {
        roots.push(c);
      }
    });

    // Sort root comments by author-liked / engagement first, then newest
    roots.sort((a, b) => {
      const aAuthorLiked = post.reporterId && a.reactions?.[post.reporterId] ? 1 : 0;
      const bAuthorLiked = post.reporterId && b.reactions?.[post.reporterId] ? 1 : 0;
      if (bAuthorLiked !== aAuthorLiked) return bAuthorLiked - aAuthorLiked;
      const likeDiff = getTotalCommentLikes(b) - getTotalCommentLikes(a);
      if (likeDiff !== 0) return likeDiff;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    return { rootComments: roots, repliesByParent: byParent };
  }, [comments, post.reporterId]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    triggerHaptic();
    try {
      const processed = await processCleanImage(file);
      const hosted = await uploadDataUrlToImgbb(
        processed.dataUrl,
        `reel-cmt-${Date.now()}.jpg`,
        { requireRemote: true }
      );
      setCommentImage(hosted);
    } catch {
      notify("Failed to attach image", "error");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleToggleLikeComment = async (cmt: ScamComment) => {
    if (!currentUser?.uid) {
      notify("Please sign in to like comments.", "info");
      navigate("/signin");
      return;
    }
    triggerHaptic();
    const uid = currentUser.uid;
    const existing = cmt.reactions?.[uid];
    const removing = Boolean(existing);

    const updatedReactions = { ...(cmt.reactions || {}) };
    if (removing) {
      delete updatedReactions[uid];
    } else {
      updatedReactions[uid] = "love" as ReactionType;
    }

    const updatedCounts: Record<string, number> = {
      ...(cmt.reactionsCount || {}),
    };
    if (existing && updatedCounts[existing]) {
      updatedCounts[existing] = Math.max(0, updatedCounts[existing] - 1);
    }
    if (!removing) {
      updatedCounts.love = (updatedCounts.love || 0) + 1;
    }

    setComments((prev) =>
      prev.map((item) =>
        item.id === cmt.id
          ? {
              ...item,
              reactions: updatedReactions,
              reactionsCount: updatedCounts,
            }
          : item
      )
    );

    if (!post.id.startsWith("showcase_") && !String(cmt.id).startsWith("cmt_")) {
      try {
        await updateDoc(
          doc(db, "scam_posts", post.id, "comments", cmt.id),
          {
            reactions: updatedReactions,
            reactionsCount: updatedCounts,
          }
        );
      } catch {}
    }
  };

  const handleSubmitComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser?.uid) {
      notify("Please sign in to comment.", "info");
      navigate("/signin");
      return;
    }
    if (submittingRef.current) return;
    if (!commentText.trim() && !commentImage) return;

    submittingRef.current = true;
    setSubmitting(true);
    triggerHaptic();

    const authorName = getSafeDisplayName(
      userProfile || currentUser,
      "Community Member"
    );
    const authorAvatar =
      userProfile?.photoURL || currentUser?.photoURL || userAvatar || "";

    const isLocalOnly =
      post.id.startsWith("showcase_") || post.id.startsWith("post_");
    const commentRef = !isLocalOnly
      ? doc(collection(db, "scam_posts", post.id, "comments"))
      : null;
    const commentId = commentRef ? commentRef.id : `cmt_${Date.now()}`;

    const payload: Omit<ScamComment, "id"> = {
      postId: post.id,
      userId: currentUser.uid,
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
      status: "approved",
      createdAt: Date.now(),
    };

    const fullCmt: ScamComment = { id: commentId, ...payload };
    setComments((prev) =>
      prev.some((x) => x.id === commentId) ? prev : [...prev, fullCmt]
    );
    if (replyingTo) {
      setExpandedThreads((prev) => ({
        ...prev,
        [replyingTo.commentId]: true,
      }));
    }
    onCommentCountDelta(post.id, 1);

    setCommentText("");
    setCommentImage(null);
    setReplyingTo(null);

    try {
      if (commentRef) {
        await setDoc(commentRef, payload);
        await updateDoc(doc(db, "scam_posts", post.id), {
          commentsCount: increment(1),
        });
        if (post.reporterId && post.reporterId !== currentUser.uid) {
          addDoc(collection(db, "news_hub_notifications"), {
            userId: post.reporterId,
            fromUserId: currentUser.uid,
            fromUserName: authorName,
            fromUserUsername:
              getSafePublicUsername(userProfile || currentUser) || authorName,
            fromUserAvatar: authorAvatar,
            type: "comment",
            title: `${authorName} commented on your Reel`,
            body: payload.text.slice(0, 80) || "Sent a GIF/photo",
            mediaThumbnail: post.images?.[0] || "",
            targetId: post.id,
            createdAt: Date.now(),
            read: false,
            isRead: false,
            link: `/loops/post/${post.id}#comments`,
          }).catch(() => {});
        }
      } else {
        const allLocal = JSON.parse(
          localStorage.getItem("deep_post_comments") || "{}"
        );
        const list: ScamComment[] = Array.isArray(allLocal[post.id])
          ? allLocal[post.id]
          : [];
        list.push(fullCmt);
        allLocal[post.id] = list;
        localStorage.setItem("deep_post_comments", JSON.stringify(allLocal));
      }
    } catch {} finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const renderSingleCommentRow = (cmt: ScamComment, isReply = false) => {
    const prof = profilesMap[cmt.userId];
    const displayHandle =
      getSafePublicUsername(prof) ||
      cmt.userName ||
      "member";
    const avatar =
      (prof as any)?.shopLogo ||
      prof?.photoURL ||
      cmt.userAvatar ||
      "";
    const isVerified = Boolean(
      (prof as any)?.isVerified ||
        prof?.role === "admin" ||
        prof?.role === "seller"
    );
    const isPostAuthor = Boolean(
      post.reporterId && cmt.userId === post.reporterId
    );
    const likedByAuthor = Boolean(
      post.reporterId && cmt.reactions?.[post.reporterId]
    );
    const viewerLiked = Boolean(
      currentUser?.uid && cmt.reactions?.[currentUser.uid]
    );
    const likeCount = getTotalCommentLikes(cmt);

    return (
      <div
        key={cmt.id}
        className={`flex items-start gap-3 ${isReply ? "pl-11 pt-3" : "py-3"}`}
      >
        <button
          type="button"
          onClick={() => {
            if (cmt.userId && cmt.userId !== "guest_local") {
              onClose();
              navigate(`/loops/profile/${cmt.userId}`);
            }
          }}
          className="shrink-0 cursor-pointer"
        >
          {avatar ? (
            <img
              src={avatar}
              alt={displayHandle}
              referrerPolicy="no-referrer"
              className={`${
                isReply ? "w-7 h-7" : "w-9 h-9"
              } rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10`}
            />
          ) : (
            <div
              className={`${
                isReply ? "w-7 h-7 text-[11px]" : "w-9 h-9 text-xs"
              } rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-bold flex items-center justify-center`}
            >
              {displayHandle.charAt(0).toUpperCase()}
            </div>
          )}
        </button>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap text-[13px]">
            <span className="font-bold text-zinc-950 dark:text-white truncate max-w-[165px]">
              {displayHandle}
            </span>
            {isVerified && <VerifiedLoopBadge className="w-3.5 h-3.5" />}
            <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">
              {formatLoopCompactTime(cmt.createdAt)}
            </span>
            {isPostAuthor && (
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                · Author
              </span>
            )}
            {likedByAuthor && !isPostAuthor && (
              <span className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                <span>·</span>
                <Heart className="w-3 h-3 text-[#FF3040] fill-[#FF3040]" />
                <span>by author</span>
              </span>
            )}
          </div>

          {cmt.text && (
            <p className="text-[14.5px] leading-[1.4] text-zinc-900 dark:text-zinc-100 break-words">
              {renderCommentTextWithMentions(cmt.text)}
            </p>
          )}

          {cmt.imageUrl && (
            <div className="pt-1.5 max-w-[230px]">
              <SmoothImage
                src={cmt.imageUrl}
                alt="Comment attachment"
                className="w-full max-h-[210px] rounded-2xl object-cover border border-zinc-200/70 dark:border-white/10"
              />
            </div>
          )}

          <div className="pt-0.5 flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                const rootId = cmt.replyToCommentId || cmt.id;
                setReplyingTo({
                  commentId: rootId,
                  userName: displayHandle,
                });
                const prefix = `@${displayHandle} `;
                if (!commentText.startsWith("@")) {
                  setCommentText(prefix);
                }
                inputRef.current?.focus();
              }}
              className="text-[12.5px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
            >
              Reply
            </button>
          </div>
        </div>

        {/* Right Heart + Count (Exact IMG_5145) */}
        <button
          type="button"
          onClick={() => handleToggleLikeComment(cmt)}
          className="flex flex-col items-center gap-0.5 pt-1 pl-1 min-w-[36px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer shrink-0"
          aria-label="Like comment"
        >
          <Heart
            className={`w-[18px] h-[18px] transition-transform active:scale-125 ${
              viewerLiked ? "text-[#FF3040] fill-[#FF3040]" : ""
            }`}
          />
          {likeCount > 0 && (
            <span className="text-[11.5px] font-medium tabular-nums">
              {formatCompactNumber(likeCount)}
            </span>
          )}
        </button>
      </div>
    );
  };

  return (
    <>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] mx-auto h-[65dvh] rounded-t-[28px] bg-white text-zinc-950 dark:bg-[#18191C] dark:text-white flex flex-col overflow-hidden shadow-[0_-12px_40px_rgba(0,0,0,0.45)] border-t border-zinc-200 dark:border-white/10"
      >
        {/* Top Handle & Header */}
        <div
          onClick={onClose}
          className="pt-2.5 pb-2 px-4 flex flex-col items-center shrink-0 border-b border-zinc-100 dark:border-white/[0.06] cursor-pointer"
        >
          <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600 mb-2" />
          <span className="text-[14px] font-bold text-zinc-900 dark:text-white">
            Comments
          </span>
        </div>

        {/* Scrollable Comments Feed */}
        <div className="flex-1 overflow-y-auto px-4 py-1 no-scrollbar">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs font-medium">Loading comments...</span>
            </div>
          ) : rootComments.length === 0 ? (
            <div className="py-16 text-center space-y-1.5">
              <p className="text-[15px] font-bold text-zinc-900 dark:text-white">
                No comments yet
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Start the conversation for @{creatorHandle}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
              {rootComments.map((root) => {
                const replies = repliesByParent[root.id] || [];
                const isExpanded = Boolean(expandedThreads[root.id]);
                const shownReplies = isExpanded ? replies : replies.slice(0, 1);
                const hiddenCount = Math.max(
                  0,
                  replies.length - shownReplies.length
                );

                return (
                  <div key={root.id} className="pb-1">
                    {renderSingleCommentRow(root, false)}

                    {shownReplies.map((rep) =>
                      renderSingleCommentRow(rep, true)
                    )}

                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          setExpandedThreads((prev) => ({
                            ...prev,
                            [root.id]: true,
                          }));
                        }}
                        className="pl-11 pt-2 pb-1 flex items-center gap-2.5 text-[12.5px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                      >
                        <span className="w-6 h-[1px] bg-zinc-300 dark:bg-zinc-600" />
                        <span>
                          View {hiddenCount} more{" "}
                          {hiddenCount === 1 ? "reply" : "replies"}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky Bottom Emoji Strip + Input Bar (Exact IMG_5145) */}
        <div className="shrink-0 bg-white dark:bg-[#18191C] border-t border-zinc-200/80 dark:border-white/10 px-3.5 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] space-y-2">
          {/* Reply Banner */}
          {replyingTo && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-xs text-zinc-600 dark:text-zinc-300">
              <span>
                Replying to{" "}
                <strong className="text-zinc-900 dark:text-white">
                  @{replyingTo.userName}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Attached Image / GIF Preview */}
          {commentImage && (
            <div className="relative inline-block ml-1">
              <img
                src={commentImage}
                alt="Attachment preview"
                referrerPolicy="no-referrer"
                className="h-16 w-auto rounded-xl object-cover border border-zinc-200 dark:border-white/15"
              />
              <button
                type="button"
                onClick={() => setCommentImage(null)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center shadow-md cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* 8 Quick Emoji Reactions Row (IMG_5145) */}
          <div className="flex items-center justify-between px-1 py-0.5">
            {QUICK_COMMENT_EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setCommentText((prev) => `${prev}${em}`);
                  inputRef.current?.focus();
                }}
                className="w-9 h-9 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 flex items-center justify-center text-[22px] active:scale-125 transition-transform cursor-pointer"
              >
                {em}
              </button>
            ))}
          </div>

          {/* Input Row: Avatar + Rounded Pill Input (Image + GIF) + Gift Button */}
          <form
            onSubmit={handleSubmitComment}
            className="flex items-center gap-2.5"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {userAvatar ? (
              <img
                src={userAvatar}
                alt="Your avatar"
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-black/10 dark:ring-white/15"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-bold flex items-center justify-center shrink-0">
                U
              </div>
            )}

            <div className="flex-1 flex items-center gap-2 px-3.5 h-11 rounded-full bg-zinc-100 dark:bg-transparent border border-zinc-200 dark:border-zinc-700">
              <input
                ref={inputRef}
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={`Add a comment for ${creatorHandle}...`}
                className="flex-1 min-w-0 bg-transparent text-[14px] text-zinc-950 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-400 outline-none"
              />

              {uploadingImage ? (
                <Loader2 className="w-5 h-5 animate-spin text-zinc-400 shrink-0" />
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach photo"
                  className="text-zinc-700 dark:text-zinc-200 hover:opacity-80 cursor-pointer shrink-0"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setGifSheetOpen(true);
                }}
                aria-label="Attach GIF"
                className="text-zinc-700 dark:text-zinc-200 hover:opacity-80 cursor-pointer shrink-0"
              >
                <GifSquareBadgeIcon className="w-[22px] h-[22px]" />
              </button>

              {(commentText.trim() || commentImage) && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="pl-1 text-[13.5px] font-bold text-[#0095F6] hover:opacity-80 disabled:opacity-40 cursor-pointer shrink-0"
                >
                  Post
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                if (post.reporterId) {
                  onClose();
                  navigate(`/gift-stars/${post.reporterId}`);
                } else {
                  notify("Creator gifting unavailable for this post", "info");
                }
              }}
              aria-label="Send gift to creator"
              title="Gift Stars"
              className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/10 active:scale-90 transition cursor-pointer shrink-0"
            >
              <GiftRibbonOutlineIcon className="w-6 h-6" />
            </button>
          </form>
        </div>
      </motion.div>

      <GiphyBottomSheet
        isOpen={gifSheetOpen}
        onClose={() => setGifSheetOpen(false)}
        onSelectGif={(gifUrl) => {
          setCommentImage(gifUrl);
          setGifSheetOpen(false);
        }}
      />
    </>
  );
};

/* ============================================================================
 * 5. MAIN FULL-SCREEN VERTICAL REELS STREAM (Exact IMG_5142 + All Sheets)
 * ========================================================================== */
export interface LoopsReelsViewProps {
  posts: ScamPost[];
  allPosts?: ScamPost[];
  currentUser: any;
  userProfile: UserProfile | null;
  userAvatar: string;
  communityUserMap: Map<string, any>;
  followedIds: string[];
  savedIds: string[];
  localUserReactions: Record<string, ReactionType>;
  algorithmPrefs: LoopsAlgorithmPrefs;
  onChangeAlgorithmPrefs: (next: LoopsAlgorithmPrefs) => void;
  onToggleReaction: (post: ScamPost, chosen?: ReactionType) => void;
  onToggleRepost: (post: ScamPost) => void;
  onToggleSave: (post: ScamPost) => void;
  onToggleFollowCreator: (targetUid: string, targetName: string) => void;
  onOpenShareModal: (post: ScamPost) => void;
  onDismissPost: (postId: string) => void;
  onCommentCountDelta: (postId: string, delta: number) => void;
  onOverlayOpenChange?: (anySheetOpen: boolean) => void;
}

export const LoopsReelsView: React.FC<LoopsReelsViewProps> = ({
  posts,
  allPosts = [],
  currentUser,
  userProfile,
  userAvatar,
  communityUserMap,
  followedIds,
  savedIds,
  localUserReactions,
  algorithmPrefs,
  onChangeAlgorithmPrefs,
  onToggleReaction,
  onToggleRepost,
  onToggleSave,
  onToggleFollowCreator,
  onOpenShareModal,
  onDismissPost,
  onCommentCountDelta,
  onOverlayOpenChange,
}) => {
  const navigate = useNavigate();
  const notify = useNotify();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const viewedIdsRef = useRef<Set<string>>(new Set());

  const [reelsSubTab, setReelsSubTab] = useState<"reels" | "friends">("reels");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [expandedCaptionId, setExpandedCaptionId] = useState<string | null>(
    null
  );
  const [resolvedMap, setResolvedMap] = useState<
    Record<string, ParsedVideoEmbed>
  >({});

  // Interactive overlays
  const [commentsOpenPostId, setCommentsOpenPostId] = useState<string | null>(
    null
  );
  const [initialReplyTarget, setInitialReplyTarget] = useState<{
    commentId: string;
    userName: string;
  } | null>(null);
  const [aboutOpenPostId, setAboutOpenPostId] = useState<string | null>(null);
  const [algorithmModalOpen, setAlgorithmModalOpen] = useState(false);

  // Real Top Featured Comment on Active Reel (IMG_5142 — strictly from Firestore, zero mock data)
  const [topFeaturedComment, setTopFeaturedComment] =
    useState<ScamComment | null>(null);
  const [dismissedFeaturedBanner, setDismissedFeaturedBanner] = useState<
    Record<string, boolean>
  >({});

  const anySheetOpen = Boolean(
    commentsOpenPostId || aboutOpenPostId || algorithmModalOpen
  );

  useEffect(() => {
    onOverlayOpenChange?.(anySheetOpen);
  }, [anySheetOpen, onOverlayOpenChange]);

  const reelItems = useMemo(() => {
    const base = posts
      .map((post) => {
        const videoSource = resolvePostVideoSource(post);
        return videoSource ? { post, videoSource } : null;
      })
      .filter(
        (x): x is { post: ScamPost; videoSource: ParsedVideoEmbed } =>
          Boolean(x)
      );

    if (reelsSubTab === "friends") {
      return base.filter(
        ({ post }) =>
          post.reporterId &&
          (followedIds.includes(post.reporterId) ||
            post.reporterId === currentUser?.uid)
      );
    }

    return base;
  }, [posts, reelsSubTab, followedIds, currentUser?.uid]);

  useEffect(() => {
    if (activeIndex >= reelItems.length && reelItems.length > 0) {
      setActiveIndex(0);
    }
  }, [reelItems.length, activeIndex]);

  const activeItem = reelItems[activeIndex] || null;

  // Reset progress bar & record real view count when switching active reel
  useEffect(() => {
    setProgressPct(0);
    setTopFeaturedComment(null);

    const postId = activeItem?.post.id;
    if (!postId) return;

    if (
      !viewedIdsRef.current.has(postId) &&
      !postId.startsWith("showcase_") &&
      !postId.startsWith("post_")
    ) {
      viewedIdsRef.current.add(postId);
      updateDoc(doc(db, "scam_posts", postId), {
        views: increment(1),
      }).catch(() => {});
    }

    // Fetch top real comment for optional featured banner (IMG_5142)
    const q = query(
      collection(db, "scam_posts", postId, "comments"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ScamComment, "id">),
          }))
          .filter((c) => c.status !== "pending_approval" && Boolean(c.text));
        if (docs.length === 0) {
          setTopFeaturedComment(null);
          return;
        }
        docs.sort((a, b) => {
          const diff = getTotalCommentLikes(b) - getTotalCommentLikes(a);
          return diff !== 0 ? diff : (b.createdAt || 0) - (a.createdAt || 0);
        });
        setTopFeaturedComment(docs[0]);
      },
      () => setTopFeaturedComment(null)
    );

    return () => unsub();
  }, [activeItem?.post.id]);

  // Observe snap slides to update activeIndex
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || typeof IntersectionObserver === "undefined") return;

    const slides = Array.from(
      container.querySelectorAll<HTMLElement>("[data-reel-index]")
    );
    if (!slides.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.58) {
            const idx = Number(
              (entry.target as HTMLElement).dataset.reelIndex || 0
            );
            if (!Number.isNaN(idx)) {
              setActiveIndex(idx);
            }
          }
        });
      },
      {
        root: container,
        threshold: [0.58],
      }
    );

    slides.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [reelItems.length, reelsSubTab]);

  const jumpToReelIndex = (targetIdx: number) => {
    const clamped = Math.max(0, Math.min(reelItems.length - 1, targetIdx));
    const container = scrollContainerRef.current;
    const el = container?.querySelector<HTMLElement>(
      `[data-reel-index="${clamped}"]`
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveIndex(clamped);
    }
  };

  const getCreatorPresentation = (post: ScamPost) => {
    const uDoc = post.reporterId ? communityUserMap.get(post.reporterId) : null;
    const handle =
      getSafePublicUsername(uDoc) ||
      (post.reporterName
        ? post.reporterName.toLowerCase().replace(/\s+/g, "_")
        : "creator");
    const displayName =
      uDoc?.shopName || uDoc?.displayName || post.reporterName || handle;
    const avatar = uDoc?.shopLogo || uDoc?.photoURL || post.reporterAvatar || "";
    const isVerified = Boolean(
      uDoc?.isVerified || uDoc?.role === "admin" || uDoc?.role === "seller"
    );
    return { handle, displayName, avatar, isVerified };
  };

  const handleMarkInterested = async (post: ScamPost) => {
    const topics = extractPostTopicsForAlgorithm(post);
    const topicToAdd = topics[0] || "Creator Reels";
    const updated = await saveAlgorithmPrefs(
      {
        ...algorithmPrefs,
        moreTopics: [...algorithmPrefs.moreTopics, topicToAdd],
      },
      currentUser?.uid
    );
    onChangeAlgorithmPrefs(updated);
    notify(`Showing more reels like "${topicToAdd}"`, "success");
  };

  const handleMarkNotInterested = async (post: ScamPost) => {
    const topics = extractPostTopicsForAlgorithm(post);
    if (topics[0]) {
      const updated = await saveAlgorithmPrefs(
        {
          ...algorithmPrefs,
          lessTopics: [...algorithmPrefs.lessTopics, topics[0]],
        },
        currentUser?.uid
      );
      onChangeAlgorithmPrefs(updated);
    }
    onDismissPost(post.id);
    notify("Reel hidden. We'll tune your feed accordingly.", "info");
    if (activeIndex + 1 < reelItems.length) {
      jumpToReelIndex(activeIndex + 1);
    }
  };

  const stripVideoUrlFromCaption = (
    text: string | undefined,
    urlToStrip: string
  ): string => {
    if (!text) return "";
    return text.replace(urlToStrip, "").replace(/\s{2,}/g, " ").trim();
  };

  const isCommentsDockedMode = Boolean(commentsOpenPostId && activeItem);

  return (
    <div className="fixed inset-0 z-40 bg-black text-white flex justify-center overflow-hidden select-none">
      {/* Main Centered Reels Column (Full-bleed on Mobile, Cinema Frame on Desktop) */}
      <div className="relative w-full max-w-[480px] h-[100dvh] bg-black overflow-hidden md:border-x md:border-white/10">
        {/* TOP OVERLAY HEADER: + | Reels · Friends | Algorithm Sliders (Exact IMG_5142) */}
        {!isCommentsDockedMode && (
          <header className="absolute top-0 inset-x-0 z-30 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 px-4 flex items-center justify-between bg-gradient-to-b from-black/70 via-black/25 to-transparent pointer-events-none">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                navigate("/loops/create");
              }}
              aria-label="Create Reel or Loop"
              className="pointer-events-auto w-11 h-11 -ml-1.5 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:scale-90 transition cursor-pointer"
            >
              <Plus className="w-7 h-7 stroke-[2]" />
            </button>

            <div className="pointer-events-auto flex items-center gap-5">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setReelsSubTab("reels");
                }}
                className={`text-[18.5px] font-bold tracking-tight transition cursor-pointer whitespace-nowrap ${
                  reelsSubTab === "reels"
                    ? "text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]"
                    : "text-white/55 hover:text-white/80"
                }`}
              >
                Reels
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setReelsSubTab("friends");
                }}
                className={`text-[18.5px] font-bold tracking-tight transition cursor-pointer whitespace-nowrap ${
                  reelsSubTab === "friends"
                    ? "text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]"
                    : "text-white/55 hover:text-white/80"
                }`}
              >
                Friends
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setAlgorithmModalOpen(true);
              }}
              aria-label="Your algorithm"
              title="Your algorithm"
              className="pointer-events-auto w-11 h-11 -mr-1.5 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:scale-90 transition cursor-pointer"
            >
              <ReelsTuneAlgorithmIcon className="w-[25px] h-[25px]" />
            </button>
          </header>
        )}

        {/* EMPTY STATE */}
        {reelItems.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center px-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white">
              <Play className="w-7 h-7 fill-white ml-0.5" />
            </div>
            <div className="space-y-1.5 max-w-[300px]">
              <h2 className="text-lg font-bold text-white">
                {reelsSubTab === "friends"
                  ? "No Friend Reels Yet"
                  : "No Reels Shared Yet"}
              </h2>
              <p className="text-xs leading-relaxed text-zinc-400">
                {reelsSubTab === "friends"
                  ? "Follow creators on Loops or switch back to Reels to watch community videos."
                  : "Share an Instagram Reel, YouTube Short, TikTok, Facebook Reel, or video link in a Loop to watch it here."}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              {reelsSubTab === "friends" && (
                <button
                  type="button"
                  onClick={() => setReelsSubTab("reels")}
                  className="px-4 py-2.5 rounded-full bg-white/15 text-white text-xs font-bold cursor-pointer"
                >
                  Explore All Reels
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate("/loops/create")}
                className="px-5 py-2.5 rounded-full bg-white text-zinc-950 text-xs font-bold cursor-pointer"
              >
                Share a Reel Link
              </button>
            </div>
          </div>
        ) : (
          /* VERTICAL SNAP-SCROLLING REELS FEED */
          <div
            ref={scrollContainerRef}
            className={`w-full h-[100dvh] ${
              isCommentsDockedMode ? "overflow-hidden" : "overflow-y-scroll"
            } snap-y snap-mandatory no-scrollbar`}
          >
            {reelItems.map(({ post, videoSource }, idx) => {
              const isSlideActive = idx === activeIndex;
              const effectiveEmbed = resolvedMap[post.id] || videoSource;
              const platformMeta = getVideoPlatformMeta(
                effectiveEmbed.platform,
                effectiveEmbed.originalUrl
              );
              const creator = getCreatorPresentation(post);
              const isCreatorFollowed = Boolean(
                post.reporterId && followedIds.includes(post.reporterId)
              );
              const isOwnPost = Boolean(
                currentUser?.uid && post.reporterId === currentUser.uid
              );

              const isLiked = hasUserReactedToPost(
                post,
                currentUser?.uid,
                localUserReactions[post.id] || null
              );
              const likesCount = getTotalPostReactions(post);
              const isReposted = Boolean(
                currentUser?.uid &&
                  post.repostedByUserIds?.includes(currentUser.uid)
              );
              const repostsCount = Number(post.repostsCount || 0);
              const isSaved = Boolean(
                savedIds.includes(post.id) ||
                  (currentUser?.uid &&
                    post.savedByUserIds?.includes(currentUser.uid))
              );
              const savesCount = Math.max(
                isSaved ? 1 : 0,
                post.savedByUserIds?.length || 0
              );
              const sharesCount = Number(post.sharesCount || 0);
              const cleanCaption =
                stripVideoUrlFromCaption(
                  post.description,
                  videoSource.originalUrl
                ) || post.title;
              const isCaptionExpanded = expandedCaptionId === post.id;

              const showSlideDocked =
                isSlideActive && commentsOpenPostId === post.id;

              return (
                <section
                  key={post.id}
                  data-reel-index={idx}
                  className="relative w-full h-[100dvh] snap-start snap-always overflow-hidden bg-black flex flex-col"
                >
                  {/* Video Media Container — Smoothly shrinks into upper 35dvh stage when Comments open (IMG_5145) */}
                  <div
                    onClick={() => {
                      if (showSlideDocked) {
                        triggerHaptic();
                        setCommentsOpenPostId(null);
                      }
                    }}
                    className={
                      showSlideDocked
                        ? "relative w-full h-[35dvh] shrink-0 bg-black flex items-center justify-center pt-3 pb-2 px-4 cursor-pointer"
                        : "relative w-full h-full"
                    }
                  >
                    <div
                      onClick={(e) => {
                        if (showSlideDocked) e.stopPropagation();
                      }}
                      className={
                        showSlideDocked
                          ? "relative h-full aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border border-white/10"
                          : "relative w-full h-full"
                      }
                    >
                      <SingleReelMediaStage
                        post={post}
                        videoSource={videoSource}
                        isActive={isSlideActive}
                        isMuted={isMuted}
                        playbackSpeed={playbackSpeed}
                        isDocked={showSlideDocked}
                        onToggleMute={() => setIsMuted((m) => !m)}
                        onProgressUpdate={
                          isSlideActive ? setProgressPct : undefined
                        }
                        onResolvedChange={(resEmbed) =>
                          setResolvedMap((prev) => ({
                            ...prev,
                            [post.id]: resEmbed,
                          }))
                        }
                        onVideoEnded={
                          autoAdvance && idx + 1 < reelItems.length
                            ? () => jumpToReelIndex(idx + 1)
                            : undefined
                        }
                      />
                    </div>

                    {/* Bottom-Right Speaker Toggle on Upper Docked Stage (Exact IMG_5145) */}
                    {showSlideDocked && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic();
                          setIsMuted((m) => !m);
                        }}
                        aria-label={isMuted ? "Unmute" : "Mute"}
                        className="absolute right-4 bottom-3 w-9 h-9 rounded-full bg-zinc-800/85 hover:bg-zinc-700 text-white flex items-center justify-center shadow-lg cursor-pointer"
                      >
                        {isMuted ? (
                          <VolumeX className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* SPLIT-SCREEN COMMENTS SHEET (Bottom 65dvh when open — IMG_5145) */}
                  {showSlideDocked && (
                    <ReelCommentsSheet
                      post={post}
                      creatorHandle={creator.handle}
                      currentUser={currentUser}
                      userProfile={userProfile}
                      userAvatar={userAvatar}
                      initialReplyTarget={initialReplyTarget}
                      onClose={() => {
                        setCommentsOpenPostId(null);
                        setInitialReplyTarget(null);
                      }}
                      onCommentCountDelta={onCommentCountDelta}
                    />
                  )}

                  {/* FULL-SCREEN OVERLAYS (Hidden while split-screen comments sheet is open) */}
                  {!showSlideDocked && (
                    <>
                      {/* Optional Top Featured Real Comment Card (Exact IMG_5142 — only when real comment exists) */}
                      {isSlideActive &&
                        topFeaturedComment &&
                        !dismissedFeaturedBanner[post.id] && (
                          <div className="absolute top-[60px] inset-x-3 z-20">
                            <div
                              onClick={() => {
                                triggerHaptic();
                                setInitialReplyTarget({
                                  commentId: topFeaturedComment.id,
                                  userName: topFeaturedComment.userName,
                                });
                                setCommentsOpenPostId(post.id);
                              }}
                              className="w-full rounded-2xl bg-white/95 text-zinc-950 dark:bg-zinc-900/92 dark:text-white backdrop-blur-xl px-3.5 py-2.5 shadow-xl border border-black/5 dark:border-white/10 flex items-start gap-3 cursor-pointer"
                            >
                              {topFeaturedComment.userAvatar ? (
                                <img
                                  src={topFeaturedComment.userAvatar}
                                  alt={topFeaturedComment.userName}
                                  referrerPolicy="no-referrer"
                                  className="w-9 h-9 rounded-full object-cover shrink-0 border border-black/10"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center justify-center shrink-0">
                                  {(topFeaturedComment.userName || "U")
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 text-xs">
                                  <span className="font-bold truncate">
                                    {topFeaturedComment.userName}
                                  </span>
                                  <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">
                                    {formatLoopCompactTime(
                                      topFeaturedComment.createdAt
                                    )}
                                  </span>
                                </div>
                                <p className="text-[13.5px] leading-snug line-clamp-2 mt-0.5">
                                  {topFeaturedComment.text}
                                </p>
                                <span className="inline-block text-[11.5px] font-semibold text-zinc-500 dark:text-zinc-400 mt-1">
                                  Reply
                                </span>
                              </div>

                              <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDismissedFeaturedBanner((prev) => ({
                                      ...prev,
                                      [post.id]: true,
                                    }));
                                  }}
                                  aria-label="Dismiss featured comment"
                                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white p-0.5 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                                <Heart className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 mt-0.5" />
                                {getTotalCommentLikes(topFeaturedComment) >
                                  0 && (
                                  <span className="text-[10.5px] font-semibold text-zinc-600 dark:text-zinc-300 tabular-nums">
                                    {formatCompactNumber(
                                      getTotalCommentLikes(topFeaturedComment)
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                      {/* Bottom Gradient Scrim for Guaranteed Legibility */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[44%] bg-gradient-to-t from-black/90 via-black/45 to-transparent z-10" />

                      {/* RIGHT VERTICAL ACTION RAIL (Exact IMG_5142) */}
                      <div className="absolute right-3 bottom-[108px] z-20 flex flex-col items-center gap-4">
                        {/* 1. Like */}
                        <button
                          type="button"
                          onClick={() => onToggleReaction(post, "love")}
                          aria-label="Like reel"
                          className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1 text-white active:scale-90 transition cursor-pointer"
                        >
                          <Heart
                            className={`w-[28px] h-[28px] drop-shadow ${
                              isLiked
                                ? "text-[#FF3040] fill-[#FF3040]"
                                : "text-white"
                            }`}
                          />
                          <span className="text-[12px] font-semibold tabular-nums drop-shadow">
                            {likesCount > 0
                              ? formatCompactNumber(likesCount)
                              : "Like"}
                          </span>
                        </button>

                        {/* 2. Comment */}
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setInitialReplyTarget(null);
                            setCommentsOpenPostId(post.id);
                          }}
                          aria-label="Open comments"
                          className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1 text-white active:scale-90 transition cursor-pointer"
                        >
                          <ReelCommentBubbleIcon className="w-[27px] h-[27px] drop-shadow" />
                          <span className="text-[12px] font-semibold tabular-nums drop-shadow">
                            {(post.commentsCount || 0) > 0
                              ? formatCompactNumber(post.commentsCount || 0)
                              : "0"}
                          </span>
                        </button>

                        {/* 3. Repost */}
                        <button
                          type="button"
                          onClick={() => onToggleRepost(post)}
                          aria-label="Repost reel"
                          className={`min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1 active:scale-90 transition cursor-pointer ${
                            isReposted ? "text-emerald-400" : "text-white"
                          }`}
                        >
                          <ReelRepostLoopIcon className="w-[27px] h-[27px] drop-shadow" />
                          {repostsCount > 0 && (
                            <span className="text-[12px] font-semibold tabular-nums drop-shadow">
                              {formatCompactNumber(repostsCount)}
                            </span>
                          )}
                        </button>

                        {/* 4. Share */}
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            onOpenShareModal(post);
                          }}
                          aria-label="Share reel"
                          className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1 text-white active:scale-90 transition cursor-pointer"
                        >
                          <ReelSharePlaneIcon className="w-[26px] h-[26px] drop-shadow" />
                          {sharesCount > 0 && (
                            <span className="text-[12px] font-semibold tabular-nums drop-shadow">
                              {formatCompactNumber(sharesCount)}
                            </span>
                          )}
                        </button>

                        {/* 5. Bookmark / Save */}
                        <button
                          type="button"
                          onClick={() => onToggleSave(post)}
                          aria-label="Save reel"
                          className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1 text-white active:scale-90 transition cursor-pointer"
                        >
                          <ReelBookmarkRibbonIcon
                            filled={isSaved}
                            className="w-[26px] h-[26px] drop-shadow"
                          />
                          {savesCount > 0 && (
                            <span className="text-[12px] font-semibold tabular-nums drop-shadow">
                              {formatCompactNumber(savesCount)}
                            </span>
                          )}
                        </button>

                        {/* 6. More / About This Reel Square Audio Tile (Exact IMG_5142 bottom-right square) */}
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setAboutOpenPostId(post.id);
                          }}
                          aria-label="About this reel"
                          title="About this reel"
                          className="mt-1 w-9 h-9 rounded-[10px] border-2 border-white/90 overflow-hidden bg-zinc-900 flex items-center justify-center shadow-lg active:scale-90 transition cursor-pointer"
                        >
                          {creator.avatar ? (
                            <img
                              src={creator.avatar}
                              alt={creator.handle}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <SocialPlatformBrandIcon
                              platform={platformMeta.platform}
                              className="w-4 h-4 text-white"
                            />
                          )}
                        </button>
                      </div>

                      {/* BOTTOM-LEFT CREATOR + FOLLOW + SOCIAL SOURCE + CAPTION (Exact IMG_5142) */}
                      <div className="absolute left-3.5 right-[72px] bottom-[96px] z-20 space-y-2">
                        {/* Creator Row */}
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (post.reporterId) {
                                navigate(`/loops/profile/${post.reporterId}`);
                              }
                            }}
                            className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                          >
                            {creator.avatar ? (
                              <img
                                src={creator.avatar}
                                alt={creator.handle}
                                referrerPolicy="no-referrer"
                                className="w-9 h-9 rounded-full object-cover border border-white/30 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center shrink-0">
                                {creator.handle.charAt(0).toUpperCase()}
                              </div>
                            )}

                            <span className="text-[14.5px] font-bold text-white truncate drop-shadow">
                              {creator.handle}
                            </span>
                            {creator.isVerified && (
                              <VerifiedLoopBadge className="w-3.5 h-3.5 shrink-0" />
                            )}
                          </button>

                          {!isOwnPost && post.reporterId && (
                            <button
                              type="button"
                              onClick={() =>
                                onToggleFollowCreator(
                                  post.reporterId,
                                  creator.displayName
                                )
                              }
                              className={`px-3 py-1 rounded-[9px] text-[12.5px] font-semibold transition cursor-pointer shrink-0 whitespace-nowrap ${
                                isCreatorFollowed
                                  ? "bg-white/15 border border-white/40 text-white"
                                  : "bg-transparent border border-white/85 text-white hover:bg-white/10"
                              }`}
                            >
                              {isCreatorFollowed ? "Following" : "Follow"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic();
                              setAboutOpenPostId(post.id);
                            }}
                            aria-label="More options about this reel"
                            className="p-1 text-white/80 hover:text-white cursor-pointer shrink-0"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Embedded Social Media Source Indicator ("social media kothay theke asce ta dekhabe") */}
                        <div className="flex items-center gap-2 text-[12px] text-white/90">
                          {effectiveEmbed.platform !== "direct" ? (
                            <a
                              href={effectiveEmbed.originalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-white/90 hover:text-white font-medium drop-shadow max-w-full"
                            >
                              <SocialPlatformBrandIcon
                                platform={platformMeta.platform}
                                className="w-3.5 h-3.5 shrink-0"
                              />
                              <span className="truncate">
                                Shared from {platformMeta.reelLabel}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="underline underline-offset-2 shrink-0 inline-flex items-center gap-0.5">
                                Source
                                <ExternalLink className="w-3 h-3" />
                              </span>
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAboutOpenPostId(post.id)}
                              className="inline-flex items-center gap-1.5 text-white/85 hover:text-white font-medium cursor-pointer"
                            >
                              <Music2 className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">
                                Original audio · {creator.handle}
                              </span>
                            </button>
                          )}
                        </div>

                        {/* Expandable Caption */}
                        {cleanCaption && (
                          <div
                            onClick={() =>
                              setExpandedCaptionId(
                                isCaptionExpanded ? null : post.id
                              )
                            }
                            className="cursor-pointer"
                          >
                            <p
                              className={`text-[14px] leading-snug text-white/95 drop-shadow ${
                                isCaptionExpanded
                                  ? "max-h-[140px] overflow-y-auto pr-1"
                                  : "line-clamp-1"
                              }`}
                            >
                              {cleanCaption}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Thin White Progress Bar right above Bottom Dock (Exact IMG_5142) */}
                      <div className="pointer-events-none absolute inset-x-3.5 bottom-[84px] z-20 h-[2.5px] rounded-full bg-white/30 overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full transition-all duration-150"
                          style={{
                            width: `${
                              isSlideActive
                                ? progressPct > 0
                                  ? progressPct
                                  : 18
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Right-Side Prev / Next Reel Navigation Controls */}
      {!anySheetOpen && reelItems.length > 1 && (
        <div className="hidden lg:flex flex-col gap-3 fixed right-8 top-1/2 -translate-y-1/2 z-40">
          <button
            type="button"
            disabled={activeIndex <= 0}
            onClick={() => jumpToReelIndex(activeIndex - 1)}
            aria-label="Previous reel"
            className="w-11 h-11 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-white/15 text-white flex items-center justify-center disabled:opacity-30 cursor-pointer transition"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <button
            type="button"
            disabled={activeIndex >= reelItems.length - 1}
            onClick={() => jumpToReelIndex(activeIndex + 1)}
            aria-label="Next reel"
            className="w-11 h-11 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-white/15 text-white flex items-center justify-center disabled:opacity-30 cursor-pointer transition"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* "ABOUT THIS REEL" SHEET (IMG_5143 — White in Light Mode, Dark in Dark Mode) */}
      <AboutThisReelSheet
        isOpen={Boolean(aboutOpenPostId && activeItem)}
        post={activeItem?.post || null}
        videoSource={
          activeItem
            ? resolvedMap[activeItem.post.id] || activeItem.videoSource
            : null
        }
        creatorHandle={
          activeItem ? getCreatorPresentation(activeItem.post).handle : "creator"
        }
        creatorAvatar={
          activeItem ? getCreatorPresentation(activeItem.post).avatar : ""
        }
        isFollowingCreator={Boolean(
          activeItem?.post.reporterId &&
            followedIds.includes(activeItem.post.reporterId)
        )}
        playbackSpeed={playbackSpeed}
        autoAdvance={autoAdvance}
        onChangePlaybackSpeed={setPlaybackSpeed}
        onToggleAutoAdvance={() => setAutoAdvance((v) => !v)}
        onMarkInterested={handleMarkInterested}
        onMarkNotInterested={handleMarkNotInterested}
        onOpenAlgorithm={() => setAlgorithmModalOpen(true)}
        onClose={() => setAboutOpenPostId(null)}
      />

      {/* "YOUR ALGORITHM" MODAL (IMG_5144 — White in Light Mode, Black in Dark Mode) */}
      <YourAlgorithmModal
        isOpen={algorithmModalOpen}
        onClose={() => setAlgorithmModalOpen(false)}
        allPosts={allPosts.length ? allPosts : posts}
        prefs={algorithmPrefs}
        onChangePrefs={onChangeAlgorithmPrefs}
      />
    </div>
  );
};

export default LoopsReelsView;
