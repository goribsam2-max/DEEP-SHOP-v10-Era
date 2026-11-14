import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
} from "firebase/firestore";
import {
  ChevronDown,
  ChevronRight,
  Lock,
  MoreHorizontal,
  Pause,
  Play,
  Settings,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { auth, db } from "../firebase";
import { useNotify } from "./Notifications";
import { triggerHaptic } from "../lib/haptics";
import { prewarmVideoFirstChunk, toPlayableMediaUrl, toProxiedMediaStreamUrl } from "../lib/videoEmbed";

export interface DeepShopAdMediaItem {
  url: string;
  type: "video" | "image";
  ratio?: string;
}

export interface DeepShopAdItem {
  id: string;
  sourceType: "video" | "photo" | "placement" | "banner";
  media: DeepShopAdMediaItem[];
  title?: string;
  text?: string;
  buttonText?: string;
  buttonLink?: string;
  targetCategory?: string;
  targetRegion?: string;
  rewardCoins?: number;
  timerDuration?: number;
  isSponsored?: boolean;
}

const HIDDEN_ADS_STORAGE_KEY = "ds_hidden_ads_v1";
const HIDDEN_ADVERTISER_SESSION_KEY = "ds_hide_all_deepshop_ads_session";
const HIDDEN_ADS_EVENT = "ds:hidden-ads-updated";

const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;

export const isLikelyVideoUrl = (url: string): boolean => {
  if (!url) return false;
  const trimmed = url.trim();
  if (VIDEO_EXT_RE.test(trimmed)) return true;
  if (/catbox\.moe\/.*\.(mp4|webm|mov)/i.test(trimmed)) return true;
  if (/litter\.catbox\.moe\/.*\.(mp4|webm|mov)/i.test(trimmed)) return true;
  return false;
};

export const readHiddenAdIds = (): Set<string> => {
  try {
    if (
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem(HIDDEN_ADVERTISER_SESSION_KEY) === "1"
    ) {
      return new Set(["__ALL__"]);
    }
    const raw =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(HIDDEN_ADS_STORAGE_KEY)
        : null;
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.map((x) => String(x)));
    }
  } catch {}
  return new Set();
};

export const hideDeepShopAdById = (adId: string) => {
  try {
    const current = readHiddenAdIds();
    current.delete("__ALL__");
    current.add(String(adId));
    localStorage.setItem(
      HIDDEN_ADS_STORAGE_KEY,
      JSON.stringify(Array.from(current))
    );
    window.dispatchEvent(new CustomEvent(HIDDEN_ADS_EVENT));
  } catch {}
};

export const hideAllDeepShopAdsForSession = () => {
  try {
    sessionStorage.setItem(HIDDEN_ADVERTISER_SESSION_KEY, "1");
    window.dispatchEvent(new CustomEvent(HIDDEN_ADS_EVENT));
  } catch {}
};

export const recordDeepShopAdEvent = async (
  adId: string,
  type: "video" | "photo",
  action: "impression" | "conversion" | "close",
  watchTime?: number
) => {
  if (!adId) return;
  try {
    await fetch("/api/ads/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adId, type, action, watchTime }),
    });
  } catch {}
};

/**
 * Real-time hook subscribing to active Deep Shop Sponsored Ads from Admin Panel
 * (`settings/ads` Video Ads + Photo Ads, and `settings/ad_placements` custom ads).
 */
export const useDeepShopAds = () => {
  const [rawVideoAds, setRawVideoAds] = useState<any[]>([]);
  const [rawPhotoAds, setRawPhotoAds] = useState<any[]>([]);
  const [rawPlacements, setRawPlacements] = useState<any[]>([]);
  const [hiddenVersion, setHiddenVersion] = useState(0);

  useEffect(() => {
    const onHiddenChange = () => setHiddenVersion((v) => v + 1);
    window.addEventListener(HIDDEN_ADS_EVENT, onHiddenChange);
    window.addEventListener("storage", onHiddenChange);
    return () => {
      window.removeEventListener(HIDDEN_ADS_EVENT, onHiddenChange);
      window.removeEventListener("storage", onHiddenChange);
    };
  }, []);

  useEffect(() => {
    const unsubAds = onSnapshot(
      doc(db, "settings", "ads"),
      (snap) => {
        if (!snap.exists()) {
          setRawVideoAds([]);
          setRawPhotoAds([]);
          return;
        }
        const data = snap.data() || {};
        if (Array.isArray(data.videoAds)) {
          setRawVideoAds(data.videoAds);
        } else if (data.videoAd?.active && data.videoAd?.url) {
          setRawVideoAds([
            {
              id: "legacy-video",
              active: true,
              videos: [{ url: data.videoAd.url, ratio: "auto" }],
            },
          ]);
        } else {
          setRawVideoAds([]);
        }

        if (Array.isArray(data.photoAds)) {
          setRawPhotoAds(data.photoAds);
        } else {
          setRawPhotoAds([]);
        }
      },
      () => {}
    );

    const unsubPlacements = onSnapshot(
      doc(db, "settings", "ad_placements"),
      (snap) => {
        if (!snap.exists()) {
          setRawPlacements([]);
          return;
        }
        const data = snap.data() || {};
        setRawPlacements(Array.isArray(data.placements) ? data.placements : []);
      },
      () => {}
    );

    return () => {
      unsubAds();
      unsubPlacements();
    };
  }, []);

  const allActiveAds = useMemo<DeepShopAdItem[]>(() => {
    const hidden = readHiddenAdIds();
    if (hidden.has("__ALL__")) return [];

    const items: DeepShopAdItem[] = [];

    rawVideoAds.forEach((vAd, idx) => {
      if (!vAd || !vAd.active) return;
      const id = String(vAd.id || `video-${idx}`);
      if (hidden.has(id)) return;
      const media: DeepShopAdMediaItem[] = (Array.isArray(vAd.videos)
        ? vAd.videos
        : []
      )
        .map((m: any) => ({
          url: String(m?.url || "").trim(),
          type: "video" as const,
          ratio: m?.ratio || "auto",
        }))
        .filter((m: DeepShopAdMediaItem) => Boolean(m.url));

      if (media.length === 0) return;

      items.push({
        id,
        sourceType: "video",
        media,
        title: vAd.title || "",
        text: vAd.text || "",
        buttonText: vAd.buttonText || "See details",
        buttonLink: vAd.buttonLink || "/all-products",
        targetCategory: vAd.targetCategory || "",
        targetRegion: vAd.targetRegion || "Bangladesh",
        rewardCoins: Number(vAd.rewardCoins || 0),
        timerDuration: Number(vAd.timerDuration ?? 5),
        isSponsored: true,
      });
    });

    rawPhotoAds.forEach((pAd, idx) => {
      if (!pAd || !pAd.active) return;
      const id = String(pAd.id || `photo-${idx}`);
      if (hidden.has(id)) return;
      const rawImgs = Array.isArray(pAd.images)
        ? pAd.images
        : pAd.image
        ? [{ url: pAd.image, ratio: "auto" }]
        : [];
      const media: DeepShopAdMediaItem[] = rawImgs
        .map((m: any) => {
          const url = String(m?.url || "").trim();
          return {
            url,
            type: isLikelyVideoUrl(url) ? ("video" as const) : ("image" as const),
            ratio: m?.ratio || "auto",
          };
        })
        .filter((m: DeepShopAdMediaItem) => Boolean(m.url));

      if (media.length === 0) return;

      items.push({
        id,
        sourceType: "photo",
        media,
        title: pAd.title || "",
        text: pAd.text || "",
        buttonText: pAd.buttonText || "See details",
        buttonLink: pAd.buttonLink || "/all-products",
        targetCategory: pAd.targetCategory || "",
        targetRegion: pAd.targetRegion || "Bangladesh",
        isSponsored: true,
      });
    });

    rawPlacements.forEach((plc, idx) => {
      if (!plc || !plc.active || plc.type !== "custom") return;
      const id = String(plc.id || `plc-${plc.slot || idx}`);
      if (hidden.has(id)) return;
      const mediaUrl = String(plc.imageUrl || "").trim();
      if (!mediaUrl && !plc.title && !plc.text) return;
      const media: DeepShopAdMediaItem[] = mediaUrl
        ? [
            {
              url: mediaUrl,
              type: isLikelyVideoUrl(mediaUrl) ? "video" : "image",
              ratio: "auto",
            },
          ]
        : [];
      if (media.length === 0) return;
      items.push({
        id,
        sourceType: "placement",
        media,
        title: plc.title || "",
        text: plc.text || "",
        buttonText: plc.buttonText || "See details",
        buttonLink: plc.buttonLink || "/all-products",
        targetRegion: "Bangladesh",
        isSponsored: true,
      });
    });

    return items;
  }, [rawVideoAds, rawPhotoAds, rawPlacements, hiddenVersion]);

  return { ads: allActiveAds };
};

/* ============================================================================
 * CRISP INLINE ICONS MATCHING REFERENCE SCREENSHOTS (IMG_5402 – IMG_5405)
 * ========================================================================== */

const ChainLinkPillIcon: React.FC<{ className?: string }> = ({
  className = "w-3.5 h-3.5",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const MegaphoneFilledIcon: React.FC<{ className?: string }> = ({
  className = "w-3.5 h-3.5",
}) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.5 3.5c-.4 0-.8.15-1.15.42L12.1 8.5H6.5A2.5 2.5 0 0 0 4 11v2a2.5 2.5 0 0 0 2 2.45l1.15 4.2a1.5 1.5 0 0 0 1.45 1.1h1.4a1.5 1.5 0 0 0 1.42-1.97L10.35 15.5h1.75l6.25 4.58c.35.27.75.42 1.15.42 1.1 0 2-.9 2-2V5.5c0-1.1-.9-2-2-2Z" />
  </svg>
);

const CirclePlusOutlineIcon: React.FC<{ className?: string }> = ({
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
    <circle cx="12" cy="12" r="9.5" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const CircleMinusOutlineIcon: React.FC<{ className?: string }> = ({
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
    <circle cx="12" cy="12" r="9.5" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const HideAdBoxXIcon: React.FC<{ className?: string }> = ({
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
    <rect x="3" y="5" width="18" height="14" rx="3.5" />
    <path d="m9.5 9.5 5 5" />
    <path d="m14.5 9.5-5 5" />
  </svg>
);

const ReportBubbleAlertIcon: React.FC<{ className?: string }> = ({
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
    <path d="M5 4.5h14A2.5 2.5 0 0 1 21.5 7v8.5A2.5 2.5 0 0 1 19 18H9.2L4.5 21v-3A2.5 2.5 0 0 1 2.5 15.5V7A2.5 2.5 0 0 1 5 4.5Z" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <circle cx="12" cy="14.8" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);

const CircleInfoOutlineIcon: React.FC<{ className?: string }> = ({
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
    <circle cx="12" cy="12" r="9.5" />
    <line x1="12" y1="11" x2="12" y2="16.2" />
    <circle cx="12" cy="7.8" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);

const DocDetailsOutlineIcon: React.FC<{ className?: string }> = ({
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
    <rect x="4.5" y="3.5" width="15" height="17" rx="3" />
    <line x1="8.5" y1="8.5" x2="15.5" y2="8.5" />
    <line x1="8.5" y1="12.5" x2="13.5" y2="12.5" />
  </svg>
);


const LoopsInfinityMark: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.1"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
  </svg>
);

const DeepShopBrandEmblem: React.FC<{ className?: string }> = ({
  className = "w-10 h-10",
}) => (
  <div
    className={`${className} rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-black tracking-tighter select-none shrink-0`}
  >
    <span className="text-[13px] leading-none">d.</span>
  </div>
);

const ArchiveHideBoxIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M3.5 5.5A2.5 2.5 0 0 1 6 3h12a2.5 2.5 0 0 1 2.5 2.5v2A1.5 1.5 0 0 1 19 9v9.5A2.5 2.5 0 0 1 16.5 21h-9A2.5 2.5 0 0 1 5 18.5V9a1.5 1.5 0 0 1-1.5-1.5v-2Zm6.72 6.22a.75.75 0 0 0-1.06 1.06L10.94 14.5l-1.78 1.72a.75.75 0 1 0 1.06 1.06L12 15.56l1.78 1.72a.75.75 0 1 0 1.06-1.06L13.06 14.5l1.78-1.72a.75.75 0 0 0-1.06-1.06L12 13.44l-1.78-1.72ZM6.5 6.5h11v-1h-11v1Z" />
  </svg>
);

const stripHtmlTags = (html?: string): string => {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

type ActiveAdPopup =
  | null
  | "menu"
  | "report"
  | "why_ad"
  | "about_ad"
  | "why_post"
  | "ad_library";

export interface DeepShopSponsoredAdProps {
  ad: DeepShopAdItem;
  variant?: "reel" | "feed" | "modal" | "compact";
  isActive?: boolean;
  isMuted?: boolean;
  onToggleMute?: () => void;
  autoScroll?: boolean;
  onToggleAutoScroll?: () => void;
  onHideAd?: (adId: string) => void;
  onNotInterested?: (adId: string) => void;
  onAdEnded?: () => void;
  onActionNavigate?: () => void;
  onPopupOpenChange?: (open: boolean) => void;
  allLibraryAds?: DeepShopAdItem[];
  className?: string;
}

const REPORT_REASONS = [
  "It's misleading or a possible scam",
  "Inappropriate or offensive media",
  "Broken link or product unavailable",
  "I see this ad too often",
  "Something else",
];

export const DeepShopSponsoredAd: React.FC<DeepShopSponsoredAdProps> = ({
  ad,
  variant = "feed",
  isActive = true,
  isMuted: controlledMuted,
  onToggleMute,
  autoScroll: controlledAutoScroll,
  onToggleAutoScroll,
  onHideAd,
  onNotInterested,
  onAdEnded,
  onActionNavigate,
  onPopupOpenChange,
  allLibraryAds,
  className = "",
}) => {
  const navigate = useNavigate();
  const notify = useNotify();

  const [mediaIdx, setMediaIdx] = useState(0);
  const [localMuted, setLocalMuted] = useState(variant !== "modal");
  const [isPaused, setIsPaused] = useState(false);
  const [centerHud, setCenterHud] = useState<"play" | "pause" | null>(null);
  const [useProxyStream, setUseProxyStream] = useState(false);
  const [hasLoadedFrame, setHasLoadedFrame] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [activePopup, setActivePopup] = useState<ActiveAdPopup>(null);
  const [expandedWhyRow, setExpandedWhyRow] = useState<
    "advertiser" | "activity" | null
  >(null);
  const [expandedPayerDetails, setExpandedPayerDetails] = useState(false);
  const [expandedAccountDetails, setExpandedAccountDetails] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hudTimerRef = useRef<number | null>(null);
  const impressionRecordedRef = useRef<string | null>(null);

  const effectiveMuted =
    controlledMuted !== undefined ? controlledMuted : localMuted;

  const { ads: hookLibraryAds } = useDeepShopAds();
  const libraryAds = allLibraryAds || hookLibraryAds;

  useEffect(() => {
    onPopupOpenChange?.(Boolean(activePopup));
  }, [activePopup, onPopupOpenChange]);

  useEffect(() => {
    setMediaIdx(0);
    setUseProxyStream(false);
    setHasLoadedFrame(false);
    setIsPaused(false);
    setCaptionExpanded(false);
  }, [ad.id]);

  // Record impression when active
  useEffect(() => {
    if (!isActive || !ad.id) return;
    if (impressionRecordedRef.current === ad.id) return;
    impressionRecordedRef.current = ad.id;
    recordDeepShopAdEvent(
      ad.id,
      ad.sourceType === "video" ? "video" : "photo",
      "impression"
    );
  }, [isActive, ad.id, ad.sourceType]);

  const activeMedia =
    ad.media[mediaIdx % Math.max(1, ad.media.length)] || ad.media[0];
  const isVideo = activeMedia?.type === "video";

  useEffect(() => {
    ad.media.forEach((m) => {
      if (m.type === "video" && m.url) {
        prewarmVideoFirstChunk(m.url);
      }
    });
  }, [ad.id, ad.media]);

  // Sync video playback with active state & popup state
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !isVideo) return;
    v.muted = effectiveMuted;
    if (isActive && !isPaused && !activePopup) {
      v.play().catch(() => {
        v.muted = true;
        setLocalMuted(true);
        v.play().catch(() => {});
      });
    } else {
      v.pause();
    }
  }, [isActive, isPaused, effectiveMuted, activePopup, isVideo, mediaIdx]);

  const handleToggleSpeaker = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    if (onToggleMute) {
      onToggleMute();
    } else {
      const next = !localMuted;
      setLocalMuted(next);
      if (videoRef.current) {
        videoRef.current.muted = next;
      }
    }
  };

  const handleTapVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isVideo) return;
    triggerHaptic();
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);
    if (hudTimerRef.current) window.clearTimeout(hudTimerRef.current);
    setCenterHud(nextPaused ? "pause" : "play");
    hudTimerRef.current = window.setTimeout(() => {
      setCenterHud(null);
    }, 650);
  };


  const navigateToDestination = (customLink?: string) => {
    const rawTarget = (customLink ?? ad.buttonLink ?? "/all-products").trim();
    triggerHaptic();
    recordDeepShopAdEvent(
      ad.id,
      ad.sourceType === "video" ? "video" : "photo",
      "conversion"
    );
    onActionNavigate?.();
    if (!rawTarget) {
      navigate("/all-products");
      return;
    }
    if (/^https?:\/\//i.test(rawTarget)) {
      try {
        const parsed = new URL(rawTarget);
        if (
          typeof window !== "undefined" &&
          parsed.origin === window.location.origin
        ) {
          navigate(`${parsed.pathname}${parsed.search}${parsed.hash}`);
          return;
        }
      } catch {}
      window.location.assign(rawTarget);
      return;
    }
    navigate(rawTarget.startsWith("/") ? rawTarget : `/${rawTarget}`);
  };

  const handleInterested = () => {
    triggerHaptic();
    try {
      if (ad.targetCategory) {
        localStorage.setItem("vibe_favorite_category", ad.targetCategory);
      }
    } catch {}
    setActivePopup(null);
    notify("Got it! More of your ads will be like this.", "success");
  };

  const handleNotInterestedAction = () => {
    triggerHaptic();
    hideDeepShopAdById(ad.id);
    setActivePopup(null);
    onNotInterested?.(ad.id);
    notify("Fewer of your ads will be like this.", "info");
  };

  const handleHideAdAction = () => {
    triggerHaptic();
    hideDeepShopAdById(ad.id);
    setActivePopup(null);
    onHideAd?.(ad.id);
    notify("Ad hidden. You won't see this ad again.", "info");
  };

  const handleHideAllFromAdvertiser = () => {
    triggerHaptic();
    hideAllDeepShopAdsForSession();
    setActivePopup(null);
    onHideAd?.(ad.id);
    notify("Hidden sponsored ads from Deep Shop for this session.", "info");
  };

  const handleSubmitReport = async (reason: string) => {
    if (submittingReport) return;
    setSubmittingReport(true);
    triggerHaptic();
    try {
      await addDoc(collection(db, "reports"), {
        targetType: "ad",
        adId: ad.id,
        advertiser: "DEEP SHOP",
        reason,
        reporterId: auth.currentUser?.uid || "anonymous",
        createdAt: Date.now(),
        status: "pending",
      });
    } catch {}
    setSubmittingReport(false);
    hideDeepShopAdById(ad.id);
    setActivePopup(null);
    onHideAd?.(ad.id);
    notify("Thanks for letting us know. We've hidden this ad.", "success");
  };

  const captionPlain = useMemo(() => {
    const t1 = stripHtmlTags(ad.title);
    const t2 = stripHtmlTags(ad.text);
    if (t1 && t2 && t1 !== t2) return `${t1} — ${t2}`;
    return t1 || t2 || "";
  }, [ad.title, ad.text]);

  const ctaLabel = (ad.buttonText || "See details").trim() || "See details";

  const rawVideoUrl = activeMedia?.url || "";
  const directVideoSrc = isVideo ? toPlayableMediaUrl(rawVideoUrl) : "";
  const proxiedVideoSrc = isVideo ? toProxiedMediaStreamUrl(rawVideoUrl) : "";
  const effectiveVideoSrc =
    useProxyStream && proxiedVideoSrc && proxiedVideoSrc !== directVideoSrc
      ? proxiedVideoSrc
      : directVideoSrc;

  const isReelLayout = variant === "reel";

  const renderMediaStage = () => {
    const cleanMediaUrl = activeMedia?.url?.trim() || "";
    if (!cleanMediaUrl) return null;

    if (isVideo) {
      if (!effectiveVideoSrc) return null;
      const adPosterImg =
        activeMedia?.thumbnail ||
        activeMedia?.poster ||
        ad.media.find((m) => m.type === "photo")?.url ||
        ad.thumbnailUrl ||
        "";
      return (
        <div
          onClick={handleTapVideo}
          className={
            isReelLayout
              ? "relative w-full h-full flex items-center justify-center bg-black cursor-pointer overflow-hidden"
              : "relative w-full flex items-center justify-center bg-black cursor-pointer overflow-hidden"
          }
        >
          {adPosterImg && !hasLoadedFrame && (
            <img
              src={adPosterImg}
              alt={ad.title || "Sponsored Ad"}
              referrerPolicy="no-referrer"
              className="absolute inset-0 z-[1] w-full h-full object-contain bg-black pointer-events-none transition-opacity duration-200"
            />
          )}
          <video
            ref={videoRef}
            key={`${ad.id}-${mediaIdx}-${useProxyStream ? "p" : "d"}`}
            src={effectiveVideoSrc}
            poster={adPosterImg || undefined}
            playsInline
            muted={effectiveMuted}
            autoPlay={isActive}
            loop={ad.media.length <= 1 && !onAdEnded}
            preload="auto"
            onPlaying={() => setHasLoadedFrame(true)}
            onCanPlay={(e) => {
              setHasLoadedFrame(true);
              const v = e.currentTarget;
              if (isActive && !isPaused && !activePopup && v.paused) {
                v.play().catch(() => {});
              }
            }}
            onLoadedData={(e) => {
              setHasLoadedFrame(true);
              const v = e.currentTarget;
              if (isActive && !isPaused && !activePopup && v.paused) {
                v.muted = effectiveMuted;
                v.play().catch(() => {
                  v.muted = true;
                  v.play().catch(() => {});
                });
              }
            }}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (!hasLoadedFrame && (v.currentTime > 0 || v.readyState >= 2)) {
                setHasLoadedFrame(true);
              }
            }}
            onEnded={() => {
              if (ad.media.length > 1 && mediaIdx < ad.media.length - 1) {
                setMediaIdx((i) => i + 1);
                return;
              }
              if (onAdEnded) {
                onAdEnded();
              } else if (videoRef.current) {
                videoRef.current.currentTime = 0;
                videoRef.current.play().catch(() => {});
              }
            }}
            onError={() => {
              if (
                !useProxyStream &&
                proxiedVideoSrc &&
                proxiedVideoSrc !== directVideoSrc
              ) {
                setUseProxyStream(true);
              }
            }}
            className={
              isReelLayout
                ? "w-full h-auto max-h-full object-contain block select-none"
                : "w-full h-auto max-h-[75vh] object-contain block mx-auto select-none"
            }
          />

          {/* Center Play / Pause Brief Feedback */}
          <AnimatePresence>
            {(centerHud || isPaused) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.16 }}
                className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
              >
                <div className="w-14 h-14 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-xl">
                  {isPaused ? (
                    <Play className="w-7 h-7 fill-white ml-0.5" />
                  ) : (
                    <Pause className="w-7 h-7 fill-white" />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Subtle Speaker Mute/Unmute Toggle */}
          <button
            type="button"
            onClick={handleToggleSpeaker}
            aria-label={effectiveMuted ? "Unmute ad" : "Mute ad"}
            className={`absolute ${
              isReelLayout ? "left-3.5 top-[56px]" : "left-3.5 top-3.5"
            } z-20 w-9 h-9 rounded-full ds-sponsored-pill backdrop-blur-md flex items-center justify-center active:scale-90 transition cursor-pointer`}
          >
            {effectiveMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        </div>
      );
    }

    return (
      <div
        onClick={() => navigateToDestination()}
        className={
          isReelLayout
            ? "relative w-full h-full flex items-center justify-center bg-zinc-950 cursor-pointer overflow-hidden"
            : "relative w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 cursor-pointer overflow-hidden"
        }
      >
        <img
          src={activeMedia.url}
          alt={stripHtmlTags(ad.title) || "Sponsored Ad"}
          referrerPolicy="no-referrer"
          loading="lazy"
          className={
            isReelLayout
              ? "w-full h-auto max-h-full object-contain block select-none"
              : "w-full h-auto max-h-[75vh] object-contain block mx-auto select-none"
          }
        />
      </div>
    );
  };

  /* ==========================================================================
   * PORTAL POPUP SHEETS (IMG_5403, IMG_5404, IMG_5405, IMG_5401 + Ad Library)
   * ======================================================================== */
  const renderPopupPortal = () => {
    if (typeof document === "undefined" || !activePopup) return null;

    return createPortal(
      <AnimatePresence>
        {activePopup && (
          <div
            className="fixed inset-0 z-[10050] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-[2px]"
            onClick={(e) => {
              e.stopPropagation();
              setActivePopup(null);
            }}
          >
            {/* 1. 3-DOT MENU SHEET (Exact IMG_5403) */}
            {activePopup === "menu" && (
              <motion.div
                key="ad-menu-sheet"
                role="dialog"
                aria-modal="true"
                initial={{ y: "100%", opacity: 0.6 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 360 }}
                onClick={(e) => e.stopPropagation()}
                className="ds-sponsored-sheet w-full max-w-[480px] rounded-t-[28px] sm:rounded-[28px] px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl space-y-3.5 max-h-[90dvh] overflow-y-auto"
              >
                <div className="w-11 h-1.5 rounded-full bg-zinc-400/70 dark:bg-zinc-600 mx-auto mb-1" />

                {/* Card 1: Interested / Not interested */}
                <div className="ds-sponsored-sheet-card rounded-[20px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                  <button
                    type="button"
                    onClick={handleInterested}
                    className="w-full px-4 py-3.5 flex items-center gap-3.5 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04] active:scale-[0.99] transition cursor-pointer"
                  >
                    <CirclePlusOutlineIcon className="w-[25px] h-[25px] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-semibold leading-snug">
                        Interested
                      </p>
                      <p className="text-[13.5px] ds-sponsored-muted leading-snug mt-0.5">
                        More of your ads will be like this.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleNotInterestedAction}
                    className="w-full px-4 py-3.5 flex items-center gap-3.5 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04] active:scale-[0.99] transition cursor-pointer"
                  >
                    <CircleMinusOutlineIcon className="w-[25px] h-[25px] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-semibold leading-snug">
                        Not interested
                      </p>
                      <p className="text-[13.5px] ds-sponsored-muted leading-snug mt-0.5">
                        Fewer of your ads will be like this.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Card 2: Hide ad / Report ad / Why am I seeing this ad? / About this ad */}
                <div className="ds-sponsored-sheet-card rounded-[20px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                  <button
                    type="button"
                    onClick={handleHideAdAction}
                    className="w-full px-4 py-3.5 flex items-center gap-3.5 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04] active:scale-[0.99] transition cursor-pointer"
                  >
                    <HideAdBoxXIcon className="w-[25px] h-[25px] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-semibold leading-snug">
                        Hide ad
                      </p>
                      <p className="text-[13.5px] ds-sponsored-muted leading-snug mt-0.5">
                        Never see this ad again.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setActivePopup("report");
                    }}
                    className="w-full px-4 py-3.5 flex items-center gap-3.5 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04] active:scale-[0.99] transition cursor-pointer"
                  >
                    <ReportBubbleAlertIcon className="w-[25px] h-[25px] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-semibold leading-snug">
                        Report ad
                      </p>
                      <p className="text-[13.5px] ds-sponsored-muted leading-snug mt-0.5">
                        Tell us about a problem with this ad.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setExpandedWhyRow(null);
                      setActivePopup("why_ad");
                    }}
                    className="w-full px-4 py-3.5 flex items-center gap-3.5 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04] active:scale-[0.99] transition cursor-pointer"
                  >
                    <CircleInfoOutlineIcon className="w-[25px] h-[25px] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-semibold leading-snug">
                        Why am I seeing this ad?
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setExpandedPayerDetails(false);
                      setExpandedAccountDetails(false);
                      setActivePopup("about_ad");
                    }}
                    className="w-full px-4 py-3.5 flex items-center gap-3.5 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04] active:scale-[0.99] transition cursor-pointer"
                  >
                    <DocDetailsOutlineIcon className="w-[25px] h-[25px] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-semibold leading-snug">
                        About this ad
                      </p>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* REPORT AD SHEET */}
            {activePopup === "report" && (
              <motion.div
                key="ad-report-sheet"
                role="dialog"
                aria-modal="true"
                initial={{ y: "100%", opacity: 0.6 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 360 }}
                onClick={(e) => e.stopPropagation()}
                className="ds-sponsored-sheet w-full max-w-[480px] rounded-t-[28px] sm:rounded-[28px] px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl space-y-3.5"
              >
                <div className="w-11 h-1.5 rounded-full bg-zinc-400/70 dark:bg-zinc-600 mx-auto" />
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={() => setActivePopup("menu")}
                    className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    aria-label="Close report menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="text-[17px] font-bold">Report ad</h3>
                  <div className="w-9" />
                </div>
                <p className="text-[13.5px] ds-sponsored-muted px-1">
                  Why are you reporting this Deep Shop sponsored ad?
                </p>
                <div className="ds-sponsored-sheet-card rounded-[20px] overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                  {REPORT_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      disabled={submittingReport}
                      onClick={() => handleSubmitReport(reason)}
                      className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left text-[15px] font-medium hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition cursor-pointer"
                    >
                      <span>{reason}</span>
                      <ChevronRight className="w-4 h-4 ds-sponsored-muted shrink-0" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 2. "WHY YOU SAW THIS AD" SHEET (Exact IMG_5404 — Deep Shop Branded) */}
            {activePopup === "why_ad" && (
              <motion.div
                key="ad-why-sheet"
                role="dialog"
                aria-modal="true"
                initial={{ y: "100%", opacity: 0.6 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 360 }}
                onClick={(e) => e.stopPropagation()}
                className="ds-sponsored-sheet-white w-full max-w-[480px] rounded-t-[28px] sm:rounded-[28px] px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl max-h-[92dvh] overflow-y-auto"
              >
                {/* Header */}
                <div className="relative flex items-center justify-center py-1">
                  <button
                    type="button"
                    onClick={() => setActivePopup(null)}
                    aria-label="Close"
                    className="absolute left-0 w-9 h-9 -ml-1.5 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <h3 className="text-[18px] font-bold tracking-tight">
                    Why you saw this ad
                  </h3>
                </div>

                {/* "Only you can see this" lock pill */}
                <div className="flex justify-center mt-3">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/90 text-[13px] ds-sponsored-muted font-medium">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>Only you can see this</span>
                  </div>
                </div>

                {/* Miniature Ad Preview Card */}
                <div className="flex justify-center my-5">
                  <div className="w-[136px] rounded-[20px] p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-[0_8px_28px_rgba(0,0,0,0.08)] space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-700 flex items-center justify-center font-black text-[14px]">
                      d<span className="text-emerald-500">.</span>
                    </div>
                    <div className="w-full aspect-square rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      {isVideo && effectiveVideoSrc ? (
                        <video
                          src={effectiveVideoSrc}
                          muted
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-cover"
                        />
                      ) : activeMedia?.url?.trim() ? (
                        <img
                          src={activeMedia.url.trim()}
                          alt="Ad preview"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Intro Copy */}
                <p className="text-[15px] leading-[1.45] mb-5">
                  Different factors contribute to why you saw an ad, including
                  who the advertiser chooses to reach and your activity. These
                  factors help us predict ads that you might like.
                </p>

                {/* Two Expandable Factor Rows */}
                <div className="space-y-4">
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedWhyRow(
                          expandedWhyRow === "advertiser" ? null : "advertiser"
                        )
                      }
                      className="w-full flex items-center gap-3.5 text-left cursor-pointer group"
                    >
                      <DeepShopBrandEmblem className="w-11 h-11" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[16px] font-semibold leading-snug">
                          Advertiser choices
                        </p>
                        <p className="text-[14px] ds-sponsored-muted leading-snug mt-0.5">
                          View who Deep Shop wants to show ads to.
                        </p>
                      </div>
                      <ChevronRight
                        className={`w-5 h-5 ds-sponsored-muted shrink-0 transition-transform ${
                          expandedWhyRow === "advertiser" ? "rotate-90" : ""
                        }`}
                      />
                    </button>
                    {expandedWhyRow === "advertiser" && (
                      <div className="mt-2.5 ml-14 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/70 text-[13px] ds-sponsored-muted space-y-1">
                        <p>
                          • Advertiser:{" "}
                          <strong className="text-zinc-900 dark:text-white">
                            Deep Shop
                          </strong>
                        </p>
                        <p>
                          • Primary location:{" "}
                          <strong className="text-zinc-900 dark:text-white">
                            {ad.targetRegion || "Bangladesh"}
                          </strong>
                        </p>
                        <p>
                          • Interest focus:{" "}
                          <strong className="text-zinc-900 dark:text-white">
                            {ad.targetCategory ||
                              "Verified devices, electronics & marketplace deals"}
                          </strong>
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedWhyRow(
                          expandedWhyRow === "activity" ? null : "activity"
                        )
                      }
                      className="w-full flex items-center gap-3.5 text-left cursor-pointer group"
                    >
                      <div className="w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <LoopsInfinityMark className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[16px] font-semibold leading-snug">
                          Your activity
                        </p>
                        <p className="text-[14px] ds-sponsored-muted leading-snug mt-0.5">
                          You interacted with content about{" "}
                          {(ad.targetCategory || "shopping").toLowerCase()} and
                          more.
                        </p>
                      </div>
                      <ChevronRight
                        className={`w-5 h-5 ds-sponsored-muted shrink-0 transition-transform ${
                          expandedWhyRow === "activity" ? "rotate-90" : ""
                        }`}
                      />
                    </button>
                    {expandedWhyRow === "activity" && (
                      <div className="mt-2.5 ml-14 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/70 text-[13px] ds-sponsored-muted">
                        Your browsing, Loops engagement, and category interests
                        on Deep Shop help surface relevant sponsored offers.
                      </div>
                    )}
                  </div>
                </div>

                {/* Learn more -> Opens Popup 4 ("why_post", IMG_5401) */}
                <p className="text-[14px] leading-snug mt-5">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setActivePopup("why_post");
                    }}
                    className="ds-sponsored-link font-medium hover:underline cursor-pointer"
                  >
                    Learn more
                  </button>{" "}
                  about other factors that contribute to our ad predictions.
                </p>

                <div className="my-5 border-t border-zinc-200/80 dark:border-zinc-800" />

                {/* What you can do */}
                <h4 className="text-[18px] font-bold mb-3.5">
                  What you can do
                </h4>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleHideAllFromAdvertiser}
                    className="w-full flex items-center gap-3.5 text-left py-1 hover:opacity-85 transition cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                      <ArchiveHideBoxIcon className="w-5 h-5" />
                    </div>
                    <span className="text-[15.5px] font-medium">
                      Hide all ads from this advertiser
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setActivePopup(null);
                      onActionNavigate?.();
                      navigate("/loops/personalization");
                    }}
                    className="w-full flex items-center gap-3.5 text-left py-1 hover:opacity-85 transition cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                      <Settings className="w-5 h-5" />
                    </div>
                    <span className="text-[15.5px] font-medium">
                      Update your ad preferences
                    </span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* 3. "ABOUT THIS AD" SHEET (Exact IMG_5405 — Deep Shop Branded) */}
            {activePopup === "about_ad" && (
              <motion.div
                key="ad-about-sheet"
                role="dialog"
                aria-modal="true"
                initial={{ y: "100%", opacity: 0.6 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 360 }}
                onClick={(e) => e.stopPropagation()}
                className="ds-sponsored-sheet w-full max-w-[480px] rounded-t-[28px] sm:rounded-[28px] px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl space-y-4 max-h-[90dvh] overflow-y-auto"
              >
                <div className="w-11 h-1.5 rounded-full bg-zinc-400/70 dark:bg-zinc-600 mx-auto" />

                <h3 className="text-[18px] font-bold text-center tracking-tight">
                  About this ad
                </h3>

                {/* Payer / Advertiser Details Card */}
                <div className="ds-sponsored-sheet-card rounded-[20px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedPayerDetails(!expandedPayerDetails)
                    }
                    className="w-full p-4 flex items-center gap-3.5 text-left cursor-pointer"
                  >
                    <DocDetailsOutlineIcon className="w-6 h-6 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[16px] font-semibold leading-snug">
                        Payer/advertiser details
                      </p>
                      <p className="text-[14px] ds-sponsored-muted leading-snug mt-0.5">
                        Payer and advertiser: DEEP SHOP (Location:{" "}
                        {ad.targetRegion || "Bangladesh"})
                      </p>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 ds-sponsored-muted shrink-0 transition-transform ${
                        expandedPayerDetails ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                  {expandedPayerDetails && (
                    <div className="px-4 pb-4 pt-1 text-[13px] ds-sponsored-muted border-t border-zinc-100 dark:border-zinc-800 space-y-1">
                      <p>Beneficiary & Payer: DEEP SHOP Official Marketplace</p>
                      <p>Region: {ad.targetRegion || "Bangladesh"}</p>
                      <p>Campaign Reference: #{ad.id}</p>
                    </div>
                  )}
                </div>

                {/* About this account */}
                <div className="space-y-2.5 pt-1">
                  <h4 className="text-[17px] font-semibold px-1">
                    About this account
                  </h4>

                  <div className="ds-sponsored-sheet-card rounded-[20px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedAccountDetails(!expandedAccountDetails)
                      }
                      className="w-full p-4 flex items-center gap-3.5 text-left cursor-pointer"
                    >
                      <DeepShopBrandEmblem className="w-10 h-10" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[16px] font-semibold leading-snug">
                          Deep Shop
                        </p>
                        <p className="text-[14px] ds-sponsored-muted leading-snug mt-0.5">
                          Joined in 2024
                        </p>
                      </div>
                      <ChevronRight
                        className={`w-5 h-5 ds-sponsored-muted shrink-0 transition-transform ${
                          expandedAccountDetails ? "rotate-90" : ""
                        }`}
                      />
                    </button>
                    {expandedAccountDetails && (
                      <div className="px-4 pb-4 pt-1 text-[13px] ds-sponsored-muted border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
                        <span>
                          Official Deep Shop verified sponsorship account.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setActivePopup(null);
                            onActionNavigate?.();
                            navigate("/");
                          }}
                          className="ds-sponsored-link font-semibold shrink-0 cursor-pointer"
                        >
                          Visit Shop
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Ad Library Link */}
                <p className="text-[14px] text-center pt-2 pb-1">
                  For more about this ad, visit{" "}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setActivePopup("ad_library");
                    }}
                    className="ds-sponsored-link font-medium hover:underline cursor-pointer"
                  >
                    Deep Shop&apos;s Ad Library.
                  </button>
                </p>
              </motion.div>
            )}

            {/* 4. "WHY YOU'RE SEEING THIS POST" SHEET (Exact IMG_5401 — Deep Shop Branded) */}
            {activePopup === "why_post" && (
              <motion.div
                key="ad-why-post-sheet"
                role="dialog"
                aria-modal="true"
                initial={{ y: "100%", opacity: 0.6 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 360 }}
                onClick={(e) => e.stopPropagation()}
                className="ds-sponsored-sheet-white w-full max-w-[480px] rounded-t-[28px] sm:rounded-[28px] px-6 pt-3 pb-[max(2.25rem,env(safe-area-inset-bottom))] shadow-2xl space-y-4 text-center"
              >
                <div className="w-11 h-1.5 rounded-full bg-zinc-400/70 dark:bg-zinc-600 mx-auto" />

                <h3 className="text-[19px] font-bold tracking-tight pt-1">
                  Why you&apos;re seeing this post
                </h3>

                <p className="text-[15.5px] ds-sponsored-muted leading-[1.48] max-w-[380px] mx-auto pb-2">
                  We find and suggest new posts that you might like based on
                  many things, including your activity on Deep Shop.{" "}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setActivePopup(null);
                      onActionNavigate?.();
                      navigate("/loops/personalization");
                    }}
                    className="ds-sponsored-link font-bold hover:underline cursor-pointer"
                  >
                    Learn more
                  </button>
                </p>
              </motion.div>
            )}

            {/* 5. IN-APP DEEP SHOP AD LIBRARY SHEET */}
            {activePopup === "ad_library" && (
              <motion.div
                key="ad-library-sheet"
                role="dialog"
                aria-modal="true"
                initial={{ y: "100%", opacity: 0.6 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 360 }}
                onClick={(e) => e.stopPropagation()}
                className="ds-sponsored-sheet w-full max-w-[500px] rounded-t-[28px] sm:rounded-[28px] px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl space-y-3.5 max-h-[90dvh] overflow-y-auto"
              >
                <div className="w-11 h-1.5 rounded-full bg-zinc-400/70 dark:bg-zinc-600 mx-auto" />
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={() => setActivePopup("about_ad")}
                    className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    aria-label="Back"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="text-[17px] font-bold">
                    Deep Shop&apos;s Ad Library
                  </h3>
                  <div className="w-9" />
                </div>
                <p className="text-[13px] ds-sponsored-muted px-1">
                  Active promotions sponsored by DEEP SHOP ({libraryAds.length}{" "}
                  active)
                </p>
                <div className="space-y-3">
                  {(libraryAds.length > 0 ? libraryAds : [ad]).map((item) => {
                    const m = item.media[0];
                    const playableLibVideo =
                      m?.type === "video" && m.url ? toPlayableMediaUrl(m.url) : "";
                    const cleanLibImg =
                      m?.type !== "video" && m?.url?.trim() ? m.url.trim() : "";
                    return (
                      <div
                        key={item.id}
                        className="ds-sponsored-sheet-card rounded-2xl p-3 flex items-center gap-3"
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center">
                          {playableLibVideo ? (
                            <video
                              src={playableLibVideo}
                              muted
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-cover"
                            />
                          ) : cleanLibImg ? (
                            <img
                              src={cleanLibImg}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-bold truncate">
                            {stripHtmlTags(item.title) || "Deep Shop Sponsored"}
                          </p>
                          <p className="text-[12.5px] ds-sponsored-muted line-clamp-1">
                            {stripHtmlTags(item.text) ||
                              `Active in ${item.targetRegion || "Bangladesh"}`}
                          </p>
                          <span className="inline-block text-[11px] ds-sponsored-muted mt-0.5">
                            Sponsor: DEEP SHOP · ID #{item.id}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActivePopup(null);
                            navigateToDestination(item.buttonLink);
                          }}
                          className="ds-sponsored-cta px-3 py-2 rounded-xl text-[12px] font-bold shrink-0 cursor-pointer"
                        >
                          {item.buttonText || "See details"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>,
      document.body
    );
  };

  /* ==========================================================================
   * 1. REELS FULL-SCREEN SNAP SLIDE VARIANT (Exact IMG_5402 minus omitted items)
   * ======================================================================== */
  if (isReelLayout) {
    return (
      <div
        className={`relative w-full h-full bg-black text-white overflow-hidden select-none ${className}`}
      >
        {/* Top-Right "Tap to see details" Pill (IMG_5402) */}
        <button
          type="button"
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            navigateToDestination();
          }}
          className="ds-sponsored-pill absolute top-[56px] right-3.5 z-20 px-3.5 py-1.5 rounded-full backdrop-blur-md text-[13px] font-semibold inline-flex items-center gap-1.5 shadow-lg active:scale-95 transition cursor-pointer"
        >
          <ChainLinkPillIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Tap to see details</span>
        </button>

        {/* Multi-Media Slide Dots if ad contains multiple clips/images */}
        {ad.media.length > 1 && (
          <div className="absolute top-[64px] inset-x-0 z-20 flex items-center justify-center gap-1.5 pointer-events-auto">
            {ad.media.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMediaIdx(idx);
                }}
                aria-label={`Ad media ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === mediaIdx % ad.media.length
                    ? "w-5 bg-white"
                    : "w-1.5 bg-white/45"
                }`}
              />
            ))}
          </div>
        )}

        {/* Exact Natural Aspect Ratio Media Stage */}
        <div className="w-full h-full flex items-center justify-center pb-[128px] pt-[50px]">
          {renderMediaStage()}
        </div>

        {/* Bottom Scrim for Legibility */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-black/90 via-black/55 to-transparent z-10" />

        {/* Bottom Overlay: Optional Caption + Full-Width CTA + ("Ad" pill left | "..." menu right) */}
        {/* Strictly NO profile name/avatar, NO Follow button, NO Like/Comment/Repost/Share/Save */}
        <div
          onTouchStart={(e) => e.stopPropagation()}
          className="absolute inset-x-3.5 bottom-[68px] z-20 space-y-2.5"
        >
          {captionPlain && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCaptionExpanded((v) => !v);
              }}
              className="w-full text-left block cursor-pointer"
            >
              {captionExpanded ? (
                <p className="text-[14.5px] leading-snug text-white/95 drop-shadow max-h-[120px] overflow-y-auto">
                  {captionPlain}
                </p>
              ) : (
                <div className="flex items-center gap-1 text-[14.5px] leading-snug text-white/95 drop-shadow">
                  <span className="truncate max-w-[78%]">{captionPlain}</span>
                  {captionPlain.length > 36 && (
                    <span className="inline-flex items-center gap-0.5 text-white/80 font-medium shrink-0">
                      <span>more</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              )}
            </button>
          )}

          {/* Primary Full-Width CTA Button (Exact IMG_5402 #5835f2) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigateToDestination();
            }}
            className="ds-sponsored-cta w-full min-h-[46px] px-5 rounded-[12px] text-[15.5px] font-bold tracking-[-0.01em] flex items-center justify-center shadow-lg active:scale-[0.985] transition cursor-pointer"
          >
            {ctaLabel}
          </button>

          {/* Bottom Row: Left Megaphone "Ad" Badge | Right 3-Dot ("...") Trigger ONLY */}
          <div className="flex items-center justify-between pt-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic();
                setActivePopup("about_ad");
              }}
              className="ds-sponsored-pill px-2.5 py-1 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 backdrop-blur-md cursor-pointer"
            >
              <MegaphoneFilledIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Ad</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic();
                setActivePopup("menu");
              }}
              aria-label="Ad options"
              className="min-w-[44px] min-h-[38px] -mr-1.5 rounded-full flex items-center justify-center text-white/95 hover:text-white active:scale-90 transition cursor-pointer"
            >
              <MoreHorizontal className="w-6 h-6 drop-shadow" />
            </button>
          </div>
        </div>

        {renderPopupPortal()}
      </div>
    );
  }

  /* ==========================================================================
   * 2. FEED / MODAL / COMPACT SITE-WIDE SPONSORED AD CARD (Exact IMG_5402 Design)
   * ======================================================================== */
  return (
    <div
      className={`relative w-full overflow-hidden rounded-[22px] bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/90 shadow-[0_8px_28px_rgba(15,23,42,0.06)] select-none ${className}`}
    >
      {/* Media Stage with Top-Right "Tap to see details" Pill & Exact Natural Aspect Ratio */}
      <div className="relative w-full overflow-hidden bg-zinc-100 dark:bg-zinc-950">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigateToDestination();
          }}
          className="ds-sponsored-pill absolute top-3.5 right-3.5 z-20 px-3.5 py-1.5 rounded-full backdrop-blur-md text-[12.5px] font-semibold inline-flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
        >
          <ChainLinkPillIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Tap to see details</span>
        </button>

        {ad.media.length > 1 && (
          <div className="absolute bottom-3 inset-x-0 z-20 flex items-center justify-center gap-1.5">
            {ad.media.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMediaIdx(idx);
                }}
                aria-label={`Slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === mediaIdx % ad.media.length
                    ? "w-5 bg-white shadow"
                    : "w-1.5 bg-white/55"
                }`}
              />
            ))}
          </div>
        )}

        {renderMediaStage()}
      </div>

      {/* Bottom Footer Section: Caption + Full-Width "See details" CTA + ("Ad" pill | "..." button) */}
      <div className="p-3.5 sm:p-4 space-y-2.5 bg-white dark:bg-zinc-950">
        {captionPlain && (
          <button
            type="button"
            onClick={() => setCaptionExpanded((v) => !v)}
            className="w-full text-left block cursor-pointer"
          >
            {captionExpanded ? (
              <p className="text-[14.5px] leading-snug text-zinc-900 dark:text-zinc-100">
                {captionPlain}
              </p>
            ) : (
              <div className="flex items-center gap-1 text-[14.5px] leading-snug text-zinc-800 dark:text-zinc-200">
                <span className="truncate max-w-[82%]">{captionPlain}</span>
                {captionPlain.length > 42 && (
                  <span className="inline-flex items-center gap-0.5 text-zinc-500 dark:text-zinc-400 font-medium shrink-0">
                    <span>more</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => navigateToDestination()}
          className="ds-sponsored-cta w-full min-h-[46px] px-5 rounded-[12px] text-[15.5px] font-bold tracking-[-0.01em] flex items-center justify-center shadow-sm active:scale-[0.985] transition cursor-pointer"
        >
          {ctaLabel}
        </button>

        <div className="flex items-center justify-between pt-0.5">
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              setActivePopup("about_ad");
            }}
            className="ds-sponsored-pill px-2.5 py-1 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <MegaphoneFilledIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Ad</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              setActivePopup("menu");
            }}
            aria-label="Ad options"
            className="ds-theme-icon-btn min-w-[40px] min-h-[36px] -mr-1 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-900 active:scale-90 transition cursor-pointer"
          >
            <MoreHorizontal className="w-6 h-6" />
          </button>
        </div>
      </div>

      {renderPopupPortal()}
    </div>
  );
};

export default DeepShopSponsoredAd;
