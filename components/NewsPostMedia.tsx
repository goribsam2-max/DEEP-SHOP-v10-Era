import React, { useState, useRef, useEffect } from "react";
import { Check, Copy, Music, Pause, Play } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import Icon from "./Icon";
import { ScamPost, ImageLayoutStyle, ImageAspectMode, PostPoll } from "../types";
import { triggerHaptic } from "../lib/haptics";
import { resolvePostVideoSource } from "../lib/videoEmbed";
import { NewsVideoPlayer } from "./NewsVideoPlayer";
import { NewsRichText } from "./NewsRichText";

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

const MusicPostCard: React.FC<{
  music: NonNullable<ScamPost["music"]>;
}> = ({ music }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const toggleMusic = (e: React.MouseEvent) => {
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

  if (!music?.audioUrl) return null;

  return (
    <div
      onClick={toggleMusic}
      className="w-full rounded-[22px] bg-white/85 dark:bg-zinc-800/85 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-700/70 p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800 transition shadow-2xs"
    >
      <audio
        ref={audioRef}
        src={music.audioUrl}
        preload="none"
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
      <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-slate-200 dark:bg-zinc-700 shrink-0">
        {music.cover ? (
          <img
            src={music.cover}
            alt={music.title}
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover ${
              playing ? "animate-spin [animation-duration:8s]" : ""
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#1877F2]">
            <Music className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-zinc-900 dark:text-white truncate flex items-center gap-1.5">
          <Music className="w-3.5 h-3.5 text-[#1877F2] shrink-0" />
          <span className="truncate">{music.title}</span>
        </p>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
          {music.artist}
        </p>
      </div>
      <button
        type="button"
        onClick={toggleMusic}
        className="w-9 h-9 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shrink-0 active:scale-90 transition cursor-pointer"
        aria-label={playing ? "Pause track" : "Play track"}
      >
        {playing ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>
    </div>
  );
};

const InteractivePollCard: React.FC<{
  postId?: string;
  poll: PostPoll;
}> = ({ postId, poll }) => {
  const [localPoll, setLocalPoll] = useState<PostPoll>(poll);
  const [guestVoteMap, setGuestVoteMap] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem("deep_poll_votes") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    setLocalPoll(poll);
  }, [poll]);

  const uid = auth.currentUser?.uid || "guest_local";
  const isPreview = !postId || postId === "composer_preview";
  const isExpired = Boolean(localPoll.endsAt && localPoll.endsAt <= Date.now());

  const votedOptionId =
    localPoll.options.find((o) => o.voterIds?.includes(uid))?.id ||
    (postId ? guestVoteMap[postId] : undefined) ||
    null;

  const totalVotes = localPoll.options.reduce(
    (sum, opt) => sum + (Number(opt.votes) || 0),
    0
  );

  const handleVote = async (e: React.MouseEvent, optionId: string) => {
    e.stopPropagation();
    if (isPreview || isExpired) return;
    triggerHaptic();

    const updatedOptions = localPoll.options.map((opt) => {
      const existingVoters = (opt.voterIds || []).filter((id) => id !== uid);
      const wasVotedByMe =
        (opt.voterIds || []).includes(uid) || votedOptionId === opt.id;
      const baseVotes = Math.max(
        0,
        (Number(opt.votes) || 0) - (wasVotedByMe ? 1 : 0)
      );

      if (opt.id === optionId) {
        if (votedOptionId === optionId) {
          // Toggle off vote
          return { ...opt, votes: baseVotes, voterIds: existingVoters };
        }
        return {
          ...opt,
          votes: baseVotes + 1,
          voterIds: [...existingVoters, uid],
        };
      }
      return { ...opt, votes: baseVotes, voterIds: existingVoters };
    });

    const nextPoll: PostPoll = { ...localPoll, options: updatedOptions };
    setLocalPoll(nextPoll);

    if (postId) {
      const nextMap = { ...guestVoteMap };
      if (votedOptionId === optionId) delete nextMap[postId];
      else nextMap[postId] = optionId;
      setGuestVoteMap(nextMap);
      try {
        localStorage.setItem("deep_poll_votes", JSON.stringify(nextMap));
      } catch {}

      if (!postId.startsWith("showcase_") && !postId.startsWith("post_")) {
        try {
          await updateDoc(doc(db, "scam_posts", postId), { poll: nextPoll });
        } catch {}
      }
    }
  };

  const getRemainingLabel = () => {
    if (!localPoll.endsAt) return "Open poll";
    const diffMs = localPoll.endsAt - Date.now();
    if (diffMs <= 0) return "Final results";
    const hrs = Math.ceil(diffMs / 3600000);
    if (hrs < 24) return `${hrs}h left`;
    const days = Math.ceil(hrs / 24);
    return `${days}d left`;
  };

  const barWidthBucket = (pct: number) => {
    if (pct <= 0) return "w-0";
    if (pct < 10) return "w-[8%]";
    if (pct < 20) return "w-[18%]";
    if (pct < 30) return "w-[28%]";
    if (pct < 40) return "w-[38%]";
    if (pct < 50) return "w-[48%]";
    if (pct < 60) return "w-[58%]";
    if (pct < 70) return "w-[68%]";
    if (pct < 80) return "w-[78%]";
    if (pct < 90) return "w-[88%]";
    if (pct < 100) return "w-[95%]";
    return "w-full";
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="rounded-[22px] bg-[#F8FAFC] dark:bg-zinc-800/75 border border-slate-200/80 dark:border-zinc-700/70 p-4 space-y-2.5"
    >
      {localPoll.question && (
        <p className="text-sm font-bold text-zinc-900 dark:text-white">
          {localPoll.question}
        </p>
      )}

      <div className="space-y-2">
        {localPoll.options.map((opt) => {
          const count = Number(opt.votes) || 0;
          const pct =
            totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isChosen = votedOptionId === opt.id;
          const showBars = Boolean(votedOptionId) || isExpired || isPreview;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={(e) => handleVote(e, opt.id)}
              className={`relative w-full min-h-[44px] rounded-2xl overflow-hidden border text-left px-3.5 py-2.5 flex items-center justify-between gap-2 transition cursor-pointer ${
                isChosen
                  ? "border-zinc-900 dark:border-white bg-white dark:bg-zinc-900"
                  : "border-slate-200/90 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/70 hover:border-zinc-400"
              }`}
            >
              {showBars && (
                <span
                  className={`pointer-events-none absolute inset-y-0 left-0 transition-all duration-500 ${barWidthBucket(
                    pct
                  )} ${
                    isChosen
                      ? "bg-[#1877F2]/16 dark:bg-[#1877F2]/28"
                      : "bg-slate-200/65 dark:bg-zinc-700/50"
                  }`}
                />
              )}
              <span className="relative z-10 flex items-center gap-2 text-[13.5px] font-semibold text-zinc-900 dark:text-white min-w-0">
                <span className="truncate">{opt.text}</span>
                {isChosen && (
                  <span className="w-4 h-4 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </span>

              {showBars && (
                <span className="relative z-10 text-xs font-bold tabular-nums text-zinc-600 dark:text-zinc-300 shrink-0">
                  {pct}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[11.5px] text-zinc-500 dark:text-zinc-400 pt-0.5">
        <span>
          {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
        </span>
        <span>{getRemainingLabel()}</span>
      </div>
    </div>
  );
};

const SnippetPostCard: React.FC<{
  snippet: NonNullable<ScamPost["snippet"]>;
}> = ({ snippet }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    navigator.clipboard?.writeText(snippet.content || "").catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="rounded-[22px] bg-[#F5F7FA] dark:bg-zinc-900/95 border border-slate-200/85 dark:border-zinc-700/80 overflow-hidden"
    >
      <div className="px-4 py-2.5 border-b border-slate-200/70 dark:border-zinc-800 flex items-center justify-between gap-2 bg-white/70 dark:bg-zinc-800/50">
        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 truncate">
          {snippet.title || "Snippet"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1 hover:bg-slate-200 transition cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-500" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-[12.5px] leading-relaxed font-mono text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
        {snippet.content}
      </pre>
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

  const hasRichExtra = Boolean(
    post.gifUrl ||
      (post.stickers && post.stickers.length > 0) ||
      post.music?.audioUrl ||
      post.poll?.options?.length ||
      post.snippet?.content ||
      post.quoteBlock?.text ||
      (post.threadItems && post.threadItems.length > 0)
  );

  if (!post.audioUrl && !resolvedVideo && images.length === 0 && !hasRichExtra) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Stickers Row if attached */}
      {post.stickers && post.stickers.length > 0 && (
        <div className="flex items-center gap-2.5 flex-wrap pt-0.5">
          {post.stickers.map((stk, sIdx) => (
            <img
              key={`${stk}-${sIdx}`}
              src={stk}
              alt="Sticker"
              referrerPolicy="no-referrer"
              className="w-20 h-20 object-contain drop-shadow-sm hover:scale-105 transition-transform"
            />
          ))}
        </div>
      )}

      {/* Quote Block Card if attached */}
      {post.quoteBlock?.text && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="rounded-[22px] bg-[#F7F9FC] dark:bg-zinc-800/75 border border-slate-200/85 dark:border-zinc-700/70 p-4 space-y-1.5"
        >
          <p className="text-[15px] italic font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed">
            “{post.quoteBlock.text}”
          </p>
          {post.quoteBlock.author && (
            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
              — {post.quoteBlock.author}
            </p>
          )}
        </div>
      )}

      {/* Snippet Card if attached */}
      {post.snippet?.content && <SnippetPostCard snippet={post.snippet} />}

      {/* Interactive Poll Card if attached */}
      {post.poll && post.poll.options?.length >= 2 && (
        <InteractivePollCard postId={post.id} poll={post.poll} />
      )}

      {/* Attached Music Preview if present */}
      {post.music?.audioUrl && <MusicPostCard music={post.music} />}

      {/* Attached Animated GIF if present */}
      {post.gifUrl && (
        <div className="relative w-full rounded-none overflow-hidden bg-slate-100 dark:bg-zinc-800">
          <img
            src={post.gifUrl}
            alt="Attached GIF"
            referrerPolicy="no-referrer"
            className="w-full max-h-[420px] object-cover block rounded-none"
          />
          <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-md text-white text-[10px] font-extrabold tracking-wider">
            GIF
          </span>
        </div>
      )}

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

      {/* Single Image Attachment — Zero Radius, No Top-Right Count/Button */}
      {images.length === 1 && (
        <div
          onClick={(e) => handleImgClick(e, 0)}
          className={`loops-edge-media group relative w-full rounded-none overflow-hidden bg-slate-100 dark:bg-zinc-800 cursor-pointer ${getAspectClass(
            detectedRatios[0]
          )}`}
        >
          <img
            src={images[0]}
            alt={post.title || "Post photo"}
            referrerPolicy="no-referrer"
            onLoad={(e) => recordNaturalRatio(0, e)}
            className="w-full h-full object-cover rounded-none transition-transform duration-300 group-hover:scale-[1.015]"
          />
          {renderScamOverlay()}
        </div>
      )}

      {/* Multiple Images: CAROUSEL SLIDER STYLE */}
      {images.length > 1 && layout === "carousel" && (
        <div className="loops-edge-media relative w-full rounded-none overflow-hidden bg-slate-100 dark:bg-zinc-800 group">
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
              className="w-full h-full object-cover rounded-none transition-all duration-300"
            />
          </div>
          {renderScamOverlay()}

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
        <div className="relative rounded-none overflow-hidden">
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
                    className={`absolute w-[84%] h-full rounded-none overflow-hidden shadow-lg border-[3px] border-white dark:border-zinc-900 bg-slate-100 dark:bg-zinc-800 cursor-pointer transition-all duration-300 ${getStackLayerClasses(
                      offsetIndex,
                      isFront
                    )}`}
                  >
                    <img
                      src={images[imgIdx]}
                      alt={`Stack card ${imgIdx + 1}`}
                      referrerPolicy="no-referrer"
                      onLoad={(e) => recordNaturalRatio(imgIdx, e)}
                      className="w-full h-full object-cover rounded-none"
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
        <div className="relative rounded-none overflow-hidden">
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

      {/* Chained Thread Continuation Items ("Add to thread") */}
      {post.threadItems && post.threadItems.length > 0 && (
        <div className="space-y-2.5 pt-1">
          {post.threadItems.map((item, tIdx) => (
            <div
              key={item.id || tIdx}
              className="relative pl-4 border-l-2 border-slate-200 dark:border-zinc-700 py-0.5"
            >
              <p className="text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-line break-words">
                <NewsRichText text={item.text} />
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
