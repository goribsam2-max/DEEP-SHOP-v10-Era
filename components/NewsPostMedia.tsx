import React, { useState, useRef, useEffect } from "react";
import Icon from "./Icon";
import { ScamPost, ImageLayoutStyle, ImageAspectMode } from "../types";
import { triggerHaptic } from "../lib/haptics";
import { resolvePostVideoSource } from "../lib/videoEmbed";
import { NewsVideoPlayer } from "./NewsVideoPlayer";

export const isScamPostRecord = (post?: Partial<ScamPost> | null): boolean => {
  if (!post) return false;
  if (
    post.postType === "normal" ||
    post.postType === "news" ||
    post.postType === "discussion"
  ) {
    return false;
  }
  if (post.postType === "scam" || (post as any).isScamAlert === true) {
    return true;
  }
  if (
    post.category === "advance_payment" ||
    post.category === "delivery" ||
    post.category === "fake_account" ||
    post.category === "scam"
  ) {
    return true;
  }
  return Boolean(
    post.scamLocation ||
      post.scammerName ||
      post.scammerPhone ||
      post.scammerBkash
  );
};

interface NewsPostMediaProps {
  post: Partial<ScamPost>;
  onOpenImage?: (index: number) => void;
  autoPlayVideo?: boolean;
}

const DEFAULT_WAVE_PEAKS = [
  0.28, 0.45, 0.36, 0.68, 0.56, 0.82, 0.38, 0.6, 0.92, 0.48, 0.34, 0.72, 0.84,
  0.42, 0.62, 0.38, 0.74, 0.52, 0.86, 0.4, 0.32, 0.64, 0.5, 0.38, 0.72, 0.52,
  0.34, 0.48, 0.66, 0.44, 0.58, 0.36,
];

const PEAK_HEIGHT_CLASSES = [
  "h-2",
  "h-2.5",
  "h-3",
  "h-3.5",
  "h-4",
  "h-5",
  "h-6",
  "h-7",
  "h-8",
  "h-9",
];

function peakToHeightClass(val: number): string {
  const clamped = Math.max(0.08, Math.min(1, val));
  const idx = Math.min(
    PEAK_HEIGHT_CLASSES.length - 1,
    Math.max(0, Math.round(clamped * (PEAK_HEIGHT_CLASSES.length - 1)))
  );
  return PEAK_HEIGHT_CLASSES[idx];
}

export async function extractAudioPeaks(
  audioUrl: string,
  barCount = 32
): Promise<number[] | null> {
  if (!audioUrl || typeof window === "undefined") return null;
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    const resp = await fetch(audioUrl);
    const arrayBuf = await resp.arrayBuffer();
    const ctx = new AudioCtx();
    try {
      const decoded = await ctx.decodeAudioData(arrayBuf);
      const raw = decoded.getChannelData(0);
      if (!raw || raw.length === 0) return null;

      const blockSize = Math.max(1, Math.floor(raw.length / barCount));
      const peaks: number[] = [];
      let maxPeak = 0.01;

      for (let i = 0; i < barCount; i++) {
        const start = i * blockSize;
        let sum = 0;
        let count = 0;
        for (let j = 0; j < blockSize && start + j < raw.length; j++) {
          const sample = Math.abs(raw[start + j]);
          sum += sample * sample;
          count++;
        }
        const rms = count > 0 ? Math.sqrt(sum / count) : 0;
        if (rms > maxPeak) maxPeak = rms;
        peaks.push(rms);
      }

      return peaks.map((p) =>
        Number(Math.max(0.14, Math.min(1, p / maxPeak)).toFixed(3))
      );
    } finally {
      ctx.close().catch(() => {});
    }
  } catch {
    return null;
  }
}

export const VoiceNoteCard: React.FC<{
  audioUrl: string;
  durationSec?: number;
  waveform?: number[];
}> = ({ audioUrl, durationSec = 0, waveform }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSec, setCurrentSec] = useState(0);
  const [totalSec, setTotalSec] = useState(durationSec || 0);
  const [decodedPeaks, setDecodedPeaks] = useState<number[] | null>(null);

  useEffect(() => {
    if (durationSec && durationSec > 0) {
      setTotalSec(durationSec);
    }
  }, [durationSec]);

  useEffect(() => {
    let active = true;
    if (waveform && waveform.length >= 8) {
      setDecodedPeaks(null);
      return;
    }
    extractAudioPeaks(audioUrl, 32).then((peaks) => {
      if (active && peaks) setDecodedPeaks(peaks);
    });
    return () => {
      active = false;
    };
  }, [audioUrl, waveform]);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const syncProgress = () => {
      const el = audioRef.current;
      if (el && !el.paused) {
        const cur = el.currentTime || 0;
        const dur =
          Number.isFinite(el.duration) && el.duration > 0
            ? el.duration
            : totalSec || 1;
        setCurrentSec(cur);
        setProgress(Math.min(100, (cur / dur) * 100));
        rafRef.current = requestAnimationFrame(syncProgress);
      }
    };

    rafRef.current = requestAnimationFrame(syncProgress);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [playing, totalSec]);

  const bars =
    waveform && waveform.length >= 8
      ? waveform
      : decodedPeaks && decodedPeaks.length >= 8
      ? decodedPeaks
      : DEFAULT_WAVE_PEAKS;

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const el = audioRef.current;
    const container = trackRef.current;
    if (!el || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width)
    );
    const dur =
      Number.isFinite(el.duration) && el.duration > 0
        ? el.duration
        : totalSec || 0;

    if (dur > 0) {
      triggerHaptic();
      el.currentTime = ratio * dur;
      setCurrentSec(ratio * dur);
      setProgress(ratio * 100);
      if (!playing) {
        el.play()
          .then(() => setPlaying(true))
          .catch(() => {});
      }
    }
  };

  const formatDuration = (sec: number) => {
    const safe = Math.max(0, Math.floor(sec));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div
      onClick={togglePlay}
      className="w-full rounded-[22px] bg-[#F4F7FB] dark:bg-zinc-800/80 border border-slate-200/70 dark:border-zinc-700/70 p-3.5 flex items-center gap-3.5 cursor-pointer select-none transition hover:bg-[#EDF2F9] dark:hover:bg-zinc-800"
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setTotalSec(Math.round(d));
        }}
        onTimeUpdate={(e) => {
          const cur = e.currentTarget.currentTime;
          const dur =
            Number.isFinite(e.currentTarget.duration) &&
            e.currentTarget.duration > 0
              ? e.currentTarget.duration
              : totalSec || 1;
          setCurrentSec(cur);
          setProgress(Math.min(100, (cur / dur) * 100));
        }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
          setCurrentSec(0);
        }}
      />

      <button
        type="button"
        onClick={togglePlay}
        className="w-11 h-11 rounded-full bg-[#1877F2] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25 active:scale-95 transition-transform cursor-pointer"
        aria-label={playing ? "Pause voice note" : "Play voice note"}
      >
        {playing ? (
          <Icon name="pause" className="w-4 h-4" />
        ) : (
          <Icon name="play" className="w-4 h-4 ml-0.5" />
        )}
      </button>

      <div
        ref={trackRef}
        onClick={handleSeek}
        title="Tap anywhere on waveform to seek"
        className="flex-1 min-w-0 flex items-center gap-[3px] h-9 py-1 cursor-pointer"
      >
        {bars.map((peak, idx) => {
          const barPct = ((idx + 0.5) / bars.length) * 100;
          const active = progress > 0 && barPct <= progress;
          return (
            <span
              key={idx}
              className={`flex-1 min-w-[2px] rounded-full transition-all duration-100 ${peakToHeightClass(
                peak
              )} ${
                active
                  ? "bg-[#1877F2] scale-y-105"
                  : "bg-slate-300 dark:bg-zinc-600 hover:bg-slate-400 dark:hover:bg-zinc-500"
              }`}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-1 text-xs font-semibold tabular-nums text-slate-600 dark:text-zinc-300 shrink-0">
        <Icon
          name="volume-2"
          className={`w-3.5 h-3.5 text-[#1877F2] ${
            playing ? "animate-pulse" : ""
          }`}
        />
        <span>{formatDuration(playing ? currentSec : totalSec)}</span>
      </div>
    </div>
  );
};

export const NewsPostMedia: React.FC<NewsPostMediaProps> = ({
  post,
  onOpenImage,
  autoPlayVideo = true,
}) => {
  const images = post.images || [];
  const isScam = isScamPostRecord(post);
  const resolvedVideo = resolvePostVideoSource(post);
  const layout: ImageLayoutStyle = post.imageLayout || "collage";
  const aspectMode: ImageAspectMode = post.imageAspectRatio || "original";

  const [carouselIdx, setCarouselIdx] = useState(0);
  const [stackOrder, setStackOrder] = useState<number[]>(() =>
    images.map((_, i) => i)
  );
  const [detectedRatios, setDetectedRatios] = useState<Record<number, number>>(
    () => {
      const init: Record<number, number> = {};
      post.imageNaturalRatios?.forEach((r, idx) => {
        if (r) init[idx] = r;
      });
      return init;
    }
  );

  useEffect(() => {
    setStackOrder(images.map((_, i) => i));
    setCarouselIdx(0);
    const next: Record<number, number> = {};
    post.imageNaturalRatios?.forEach((r, idx) => {
      if (r) next[idx] = r;
    });
    setDetectedRatios(next);
  }, [images.length, post.id, post.imageNaturalRatios]);

  const recordNaturalRatio = (
    idx: number,
    e: React.SyntheticEvent<HTMLImageElement>
  ) => {
    if (detectedRatios[idx]) return;
    const w = e.currentTarget.naturalWidth;
    const h = e.currentTarget.naturalHeight;
    if (w && h) {
      const ratio = Number((w / h).toFixed(3));
      setDetectedRatios((prev) => ({ ...prev, [idx]: ratio }));
    }
  };

  const getAspectClass = (ratioValue?: number) => {
    if (aspectMode === "square") return "aspect-square";
    if (aspectMode === "portrait") return "aspect-[4/5]";
    if (aspectMode === "landscape") return "aspect-[16/10]";

    if (ratioValue !== undefined && ratioValue > 0) {
      if (ratioValue < 0.72) return "aspect-[3/4]";
      if (ratioValue < 0.89) return "aspect-[4/5]";
      if (ratioValue <= 1.14) return "aspect-square";
      if (ratioValue <= 1.42) return "aspect-[4/3]";
      if (ratioValue <= 1.72) return "aspect-[16/10]";
      return "aspect-video";
    }
    return "aspect-[16/10]";
  };

  const getScamPlaceLabel = () => {
    if (post.scamLocation?.trim()) return post.scamLocation.trim();
    if (post.category === "fake_account") return "Facebook / Social Page";
    if (post.category === "advance_payment") return "bKash / Nagad Advance";
    if (post.category === "delivery") return "Courier Delivery";
    return "Online Marketplace";
  };

  const renderScamOverlay = () => {
    if (!isScam) return null;
    const place = getScamPlaceLabel();
    const isDataUrlStamped = Boolean(
      images[0]?.startsWith("data:image/") && post.scamLocation
    );

    return (
      <>
        <div className="absolute top-3 left-3 right-12 flex items-center gap-2 pointer-events-none">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600/95 backdrop-blur-md text-white text-[11px] font-bold shadow-md whitespace-nowrap overflow-hidden max-w-full">
            <Icon name="shield-alert" className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Verified Scam Report · {place}</span>
          </div>
        </div>
        {!isDataUrlStamped && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-r from-rose-950/95 via-zinc-950/90 to-zinc-950/95 border-t border-rose-500/70 px-3.5 py-2 flex items-center justify-between gap-2 pointer-events-none">
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-wider uppercase text-white truncate">
                SCAM REPORT · DEEP SHOP
              </p>
              <p className="text-[11px] font-medium text-rose-200 truncate flex items-center gap-1">
                <Icon name="map-marker" className="w-3 h-3 shrink-0" />
                <span>Scam Happened on: {place}</span>
              </p>
            </div>
          </div>
        )}
      </>
    );
  };

  const handleImgClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    triggerHaptic();
    onOpenImage?.(index);
  };

  const getStackLayerClasses = (offsetIndex: number, isFront: boolean) => {
    if (isFront || offsetIndex === 0) {
      return "z-20 translate-x-0 rotate-0 scale-100";
    }
    if (offsetIndex === 1) {
      return "z-10 -translate-x-5 -rotate-6 scale-95 opacity-95";
    }
    return "z-0 translate-x-5 rotate-6 scale-90 opacity-90";
  };

  if (!post.audioUrl && !resolvedVideo && images.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">

      {/* Voice Note Player if present */}
      {post.audioUrl && (
        <VoiceNoteCard
          audioUrl={post.audioUrl}
          durationSec={post.audioDuration}
          waveform={post.audioWaveform}
        />
      )}

      {/* Embedded Social Video (YouTube / Facebook / TikTok) or Uploaded Video Player */}
      {resolvedVideo && (
        <NewsVideoPlayer
          videoSource={resolvedVideo}
          autoPlayInView={autoPlayVideo}
          overlayBadge={
            isScam && images.length === 0 ? (
              <div className="absolute top-3 left-3 right-14 flex items-center gap-2 pointer-events-none z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/95 backdrop-blur-md text-white text-[11px] font-bold shadow-md whitespace-nowrap overflow-hidden max-w-full">
                  <Icon name="shield-alert" className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    Verified Scam Report · {getScamPlaceLabel()}
                  </span>
                </div>
              </div>
            ) : undefined
          }
        />
      )}

      {/* Single Image Attachment — Dynamically sized to match photo aspect ratio */}
      {images.length === 1 && (
        <div
          onClick={(e) => handleImgClick(e, 0)}
          className={`group relative w-full rounded-[22px] overflow-hidden bg-slate-100 dark:bg-zinc-800 cursor-pointer ${getAspectClass(
            detectedRatios[0]
          )}`}
        >
          <img
            src={images[0]}
            alt={post.title || "Post photo"}
            referrerPolicy="no-referrer"
            onLoad={(e) => recordNaturalRatio(0, e)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.015]"
          />
          {renderScamOverlay()}
          <button
            type="button"
            onClick={(e) => handleImgClick(e, 0)}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md text-white flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
            aria-label="Open full screen image"
          >
            <Icon name="maximize-2" className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Multiple Images: CAROUSEL SLIDER STYLE */}
      {images.length > 1 && layout === "carousel" && (
        <div className="relative w-full rounded-[22px] overflow-hidden bg-slate-100 dark:bg-zinc-800 group">
          <div
            onClick={(e) => handleImgClick(e, carouselIdx)}
            className={`w-full cursor-pointer ${getAspectClass(
              detectedRatios[carouselIdx] ?? detectedRatios[0]
            )}`}
          >
            <img
              src={images[carouselIdx]}
              alt={`Slide ${carouselIdx + 1}`}
              referrerPolicy="no-referrer"
              onLoad={(e) => recordNaturalRatio(carouselIdx, e)}
              className="w-full h-full object-cover transition-all duration-300"
            />
          </div>
          {renderScamOverlay()}

          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold tabular-nums">
            {carouselIdx + 1} / {images.length}
          </div>

          {carouselIdx > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic();
                setCarouselIdx((i) => Math.max(0, i - 1));
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-white shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition cursor-pointer"
              aria-label="Previous image"
            >
              <Icon name="chevron-left" className="w-4 h-4" />
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
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-white shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition cursor-pointer"
              aria-label="Next image"
            >
              <Icon name="chevron-right" className="w-4 h-4" />
            </button>
          )}

          <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5 z-10">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCarouselIdx(idx);
                }}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === carouselIdx
                    ? "w-5 bg-white shadow-xs"
                    : "w-1.5 bg-white/60"
                }`}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Multiple Images: EVEN 2x2 GRID STYLE */}
      {images.length > 1 && layout === "grid" && (
        <div className="relative rounded-[22px] overflow-hidden">
          <div className="grid grid-cols-2 gap-1.5">
            {images.slice(0, 4).map((url, idx) => (
              <div
                key={idx}
                onClick={(e) => handleImgClick(e, idx)}
                className={`relative overflow-hidden bg-slate-100 dark:bg-zinc-800 cursor-pointer group ${
                  aspectMode === "portrait"
                    ? "aspect-[4/5]"
                    : aspectMode === "landscape"
                    ? "aspect-[16/10]"
                    : "aspect-square"
                }`}
              >
                <img
                  src={url}
                  alt={`Photo ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  onLoad={(e) => recordNaturalRatio(idx, e)}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {idx === 3 && images.length > 4 && (
                  <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] flex items-center justify-center text-white font-bold text-xl tabular-nums">
                    +{images.length - 4}
                  </div>
                )}
              </div>
            ))}
          </div>
          {renderScamOverlay()}
        </div>
      )}

      {/* Multiple Images: FANNED STACK STYLE */}
      {images.length > 1 && layout === "stack" && (
        <div className="relative py-4 px-2 flex items-center justify-center">
          <div
            className={`relative w-full max-w-[420px] flex items-center justify-center ${
              aspectMode === "square"
                ? "aspect-square"
                : aspectMode === "portrait"
                ? "aspect-[4/5]"
                : "aspect-[4/3]"
            }`}
          >
            {stackOrder
              .slice(0, 3)
              .reverse()
              .map((imgIdx, layerPos, arr) => {
                const isFront = layerPos === arr.length - 1;
                const offsetIndex = arr.length - 1 - layerPos;

                return (
                  <div
                    key={imgIdx}
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic();
                      if (isFront) {
                        onOpenImage?.(imgIdx);
                      } else {
                        setStackOrder((prev) => [...prev.slice(1), prev[0]]);
                      }
                    }}
                    className={`absolute w-[84%] h-full rounded-[22px] overflow-hidden shadow-lg border-[3px] border-white dark:border-zinc-900 bg-slate-100 dark:bg-zinc-800 cursor-pointer transition-all duration-300 ${getStackLayerClasses(
                      offsetIndex,
                      isFront
                    )}`}
                  >
                    <img
                      src={images[imgIdx]}
                      alt={`Stack card ${imgIdx + 1}`}
                      referrerPolicy="no-referrer"
                      onLoad={(e) => recordNaturalRatio(imgIdx, e)}
                      className="w-full h-full object-cover"
                    />
                    {isFront && renderScamOverlay()}
                  </div>
                );
              })}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic();
                setStackOrder((prev) => [...prev.slice(1), prev[0]]);
              }}
              className="absolute -bottom-1 right-2 z-30 px-3 py-1 rounded-full bg-zinc-900/90 dark:bg-white/95 text-white dark:text-zinc-900 text-[11px] font-semibold shadow-md backdrop-blur-md cursor-pointer"
            >
              Shuffle ({images.length})
            </button>
          </div>
        </div>
      )}

      {/* Multiple Images: SMART COLLAGE STYLE (Default) */}
      {images.length > 1 && layout === "collage" && (
        <div className="relative rounded-[22px] overflow-hidden">
          {images.length === 2 ? (
            <div className="grid grid-cols-2 gap-1.5">
              {images.map((url, idx) => (
                <div
                  key={idx}
                  onClick={(e) => handleImgClick(e, idx)}
                  className={`relative overflow-hidden bg-slate-100 dark:bg-zinc-800 cursor-pointer group ${
                    aspectMode === "square"
                      ? "aspect-square"
                      : aspectMode === "landscape"
                      ? "aspect-[4/3]"
                      : "aspect-[4/5]"
                  }`}
                >
                  <img
                    src={url}
                    alt={`Photo ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    onLoad={(e) => recordNaturalRatio(idx, e)}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          ) : images.length === 3 ? (
            <div
              className={`grid grid-cols-12 gap-1.5 ${
                aspectMode === "square"
                  ? "h-64 sm:h-72"
                  : aspectMode === "landscape"
                  ? "h-56 sm:h-64"
                  : "h-72 sm:h-80"
              }`}
            >
              <div
                onClick={(e) => handleImgClick(e, 0)}
                className="col-span-7 h-full relative overflow-hidden bg-slate-100 dark:bg-zinc-800 cursor-pointer group"
              >
                <img
                  src={images[0]}
                  alt="Photo 1"
                  referrerPolicy="no-referrer"
                  onLoad={(e) => recordNaturalRatio(0, e)}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="col-span-5 grid grid-rows-2 gap-1.5 h-full">
                {images.slice(1, 3).map((url, idx) => (
                  <div
                    key={idx}
                    onClick={(e) => handleImgClick(e, idx + 1)}
                    className="relative h-full overflow-hidden bg-slate-100 dark:bg-zinc-800 cursor-pointer group"
                  >
                    <img
                      src={url}
                      alt={`Photo ${idx + 2}`}
                      referrerPolicy="no-referrer"
                      onLoad={(e) => recordNaturalRatio(idx + 1, e)}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {images.slice(0, 4).map((url, idx) => (
                <div
                  key={idx}
                  onClick={(e) => handleImgClick(e, idx)}
                  className={`relative overflow-hidden bg-slate-100 dark:bg-zinc-800 cursor-pointer group ${
                    aspectMode === "square" ? "aspect-square" : "aspect-[4/3]"
                  }`}
                >
                  <img
                    src={url}
                    alt={`Photo ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    onLoad={(e) => recordNaturalRatio(idx, e)}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {idx === 3 && images.length > 4 && (
                    <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] flex items-center justify-center text-white font-bold text-xl tabular-nums">
                      +{images.length - 4}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {renderScamOverlay()}
        </div>
      )}
    </div>
  );
};
