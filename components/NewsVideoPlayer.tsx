import React, { useEffect, useId, useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import {
  ParsedVideoEmbed,
  parseVideoEmbed,
  resolveShortVideoUrl,
} from "../lib/videoEmbed";
import { triggerHaptic } from "../lib/haptics";

interface NewsVideoPlayerProps {
  videoSource: ParsedVideoEmbed;
  autoPlayInView?: boolean;
  overlayBadge?: React.ReactNode;
}

const ACTIVE_VIDEO_EVENT = "deepshop:news-active-video";

const formatVideoClock = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0"
    )}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

export const NewsVideoPlayer: React.FC<NewsVideoPlayerProps> = ({
  videoSource,
  autoPlayInView = true,
  overlayBadge,
}) => {
  const instanceId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const userPausedRef = useRef(false);

  const [resolvedEmbed, setResolvedEmbed] =
    useState<ParsedVideoEmbed>(videoSource);
  const [resolvingLink, setResolvingLink] = useState<boolean>(
    Boolean(videoSource.needsResolution && videoSource.platform === "tiktok")
  );

  // Viewport & activation state
  const [hasEnteredView, setHasEnteredView] = useState<boolean>(!autoPlayInView);
  const [isInView, setIsInView] = useState<boolean>(false);

  // postMessage-synced state for YouTube & TikTok players
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [detectedVertical, setDetectedVertical] = useState<boolean>(
    videoSource.isVertical
  );

  // Sync prop changes & resolve short share links (vt.tiktok.com, vm.tiktok.com, fb.watch, facebook.com/share/v|r)
  useEffect(() => {
    let active = true;
    setResolvedEmbed(videoSource);
    setDetectedVertical(videoSource.isVertical);
    setCurrentTime(0);
    setDuration(0);
    userPausedRef.current = false;

    if (!videoSource.needsResolution) {
      setResolvingLink(false);
      return;
    }

    if (videoSource.platform === "tiktok") {
      setResolvingLink(true);
    }

    resolveShortVideoUrl(videoSource.originalUrl).then(
      ({ resolvedUrl, tiktokVideoId }) => {
        if (!active) return;
        const reparsed = parseVideoEmbed(resolvedUrl);
        if (reparsed) {
          setResolvedEmbed({
            ...reparsed,
            videoId: reparsed.videoId || tiktokVideoId || undefined,
            needsResolution: false,
          });
          setDetectedVertical(reparsed.isVertical);
        } else if (tiktokVideoId) {
          setResolvedEmbed({
            ...videoSource,
            canonicalUrl: `https://www.tiktok.com/@tiktok/video/${tiktokVideoId}`,
            videoId: tiktokVideoId,
            isVertical: true,
            needsResolution: false,
          });
        } else {
          setResolvedEmbed({
            ...videoSource,
            needsResolution: false,
          });
        }
        setResolvingLink(false);
      }
    );

    return () => {
      active = false;
    };
  }, [
    videoSource.originalUrl,
    videoSource.platform,
    videoSource.isVertical,
    videoSource.needsResolution,
  ]);

  const announceActivePlayback = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(ACTIVE_VIDEO_EVENT, { detail: { id: instanceId } })
      );
    }
  };

  const sendYouTubeCommand = (func: string, args: unknown[] = []) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(
      JSON.stringify({
        event: "command",
        func,
        args,
      }),
      "*"
    );
  };

  const sendTikTokCommand = (type: string, value?: unknown) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const payload: Record<string, unknown> = {
      "x-tiktok-player": true,
      type,
    };
    if (value !== undefined) payload.value = value;
    win.postMessage(payload, "*");
  };

  // Pause this player if another video in the feed becomes active
  useEffect(() => {
    const onOtherVideoActive = (ev: Event) => {
      const customEv = ev as CustomEvent<{ id: string }>;
      if (customEv.detail?.id && customEv.detail.id !== instanceId) {
        if (resolvedEmbed.platform === "youtube") {
          sendYouTubeCommand("pauseVideo");
          setIsPlaying(false);
        } else if (resolvedEmbed.platform === "tiktok") {
          sendTikTokCommand("pause");
          setIsPlaying(false);
        }
      }
    };

    window.addEventListener(ACTIVE_VIDEO_EVENT, onOtherVideoActive);
    return () => {
      window.removeEventListener(ACTIVE_VIDEO_EVENT, onOtherVideoActive);
    };
  }, [instanceId, resolvedEmbed.platform]);

  // Listen to YouTube & TikTok iframe player state/time updates for live seek & play/pause sync
  useEffect(() => {
    if (
      resolvedEmbed.platform !== "youtube" &&
      resolvedEmbed.platform !== "tiktok"
    ) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (
        iframeRef.current?.contentWindow &&
        event.source !== iframeRef.current.contentWindow
      ) {
        return;
      }

      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (!data || typeof data !== "object") return;

        // YouTube IFrame API telemetry
        if (resolvedEmbed.platform === "youtube") {
          if (data.event === "infoDelivery" && data.info) {
            if (typeof data.info.currentTime === "number") {
              setCurrentTime(data.info.currentTime);
            }
            if (
              typeof data.info.duration === "number" &&
              data.info.duration > 0
            ) {
              setDuration(data.info.duration);
            }
            if (typeof data.info.playerState === "number") {
              if (data.info.playerState === 1) setIsPlaying(true);
              else if (
                data.info.playerState === 2 ||
                data.info.playerState === 0
              ) {
                setIsPlaying(false);
              }
            }
            if (typeof data.info.muted === "boolean") {
              setIsMuted(data.info.muted);
            }
          }
        }

        // TikTok Player v1 postMessage events
        if (resolvedEmbed.platform === "tiktok" && data["x-tiktok-player"]) {
          if (data.type === "onStateChange") {
            if (data.value === 1) setIsPlaying(true);
            else if (data.value === 2 || data.value === 0) setIsPlaying(false);
          } else if (data.type === "onCurrentTime" && data.value) {
            if (typeof data.value.currentTime === "number") {
              setCurrentTime(data.value.currentTime);
            }
            if (
              typeof data.value.duration === "number" &&
              data.value.duration > 0
            ) {
              setDuration(data.value.duration);
            }
          } else if (data.type === "onMute") {
            setIsMuted(Boolean(data.value));
          }
        }
      } catch {
        // Ignore unrelated cross-origin messages
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [resolvedEmbed.platform]);

  // Viewport IntersectionObserver for Feed Autoplay & Off-Screen Autopause
  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setHasEnteredView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
          setHasEnteredView(true);
          setIsInView(true);
        } else if (!entry.isIntersecting || entry.intersectionRatio < 0.15) {
          setIsInView(false);
        }
      },
      {
        threshold: [0, 0.15, 0.45, 0.75],
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // React to viewport visibility changes to autoplay or pause cleanly
  useEffect(() => {
    if (!autoPlayInView) return;

    if (isInView) {
      if (userPausedRef.current) return;
      announceActivePlayback();

      if (resolvedEmbed.platform === "youtube") {
        sendYouTubeCommand("playVideo");
        setIsPlaying(true);
      } else if (resolvedEmbed.platform === "tiktok") {
        sendTikTokCommand("play");
        setIsPlaying(true);
      }
    } else {
      if (resolvedEmbed.platform === "youtube") {
        sendYouTubeCommand("pauseVideo");
        setIsPlaying(false);
      } else if (resolvedEmbed.platform === "tiktok") {
        sendTikTokCommand("pause");
        setIsPlaying(false);
      }
    }
  }, [
    isInView,
    autoPlayInView,
    resolvedEmbed.platform,
    resolvedEmbed.canonicalUrl,
  ]);

  // Embedded YouTube / TikTok postMessage quick controls
  const toggleEmbedPlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    if (isPlaying) {
      userPausedRef.current = true;
      if (resolvedEmbed.platform === "youtube") sendYouTubeCommand("pauseVideo");
      if (resolvedEmbed.platform === "tiktok") sendTikTokCommand("pause");
      setIsPlaying(false);
    } else {
      userPausedRef.current = false;
      announceActivePlayback();
      if (resolvedEmbed.platform === "youtube") sendYouTubeCommand("playVideo");
      if (resolvedEmbed.platform === "tiktok") sendTikTokCommand("play");
      setIsPlaying(true);
    }
  };

  const handleEmbedSeekBy = (e: React.MouseEvent, deltaSec: number) => {
    e.stopPropagation();
    triggerHaptic();
    const baseTime = currentTime || 0;
    const target = Math.max(
      0,
      duration > 0 ? Math.min(duration, baseTime + deltaSec) : baseTime + deltaSec
    );
    setCurrentTime(target);
    if (resolvedEmbed.platform === "youtube") {
      sendYouTubeCommand("seekTo", [target, true]);
    } else if (resolvedEmbed.platform === "tiktok") {
      sendTikTokCommand("seekTo", target);
    }
  };

  const handleEmbedScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const target = Number(e.target.value);
    setCurrentTime(target);
    if (resolvedEmbed.platform === "youtube") {
      sendYouTubeCommand("seekTo", [target, true]);
    } else if (resolvedEmbed.platform === "tiktok") {
      sendTikTokCommand("seekTo", target);
    }
  };

  const toggleEmbedMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (resolvedEmbed.platform === "youtube") {
      sendYouTubeCommand(nextMuted ? "mute" : "unMute");
    } else if (resolvedEmbed.platform === "tiktok") {
      sendTikTokCommand(nextMuted ? "mute" : "unMute");
    }
  };

  const stopBubble = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  // 1. YOUTUBE EMBED PLAYER (Autoplay in viewport + Native Scrubber + Quick Seek/Play/Sound Bar)
  if (resolvedEmbed.platform === "youtube" && resolvedEmbed.videoId) {
    const originParam =
      typeof window !== "undefined"
        ? `&origin=${encodeURIComponent(window.location.origin)}`
        : "";
    const autoParam = autoPlayInView ? "1" : "0";
    const ytSrc = `https://www.youtube.com/embed/${resolvedEmbed.videoId}?enablejsapi=1&autoplay=${autoParam}&mute=1&controls=1&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${resolvedEmbed.videoId}${originParam}`;

    return (
      <div
        ref={containerRef}
        onClick={stopBubble}
        onPointerDown={stopBubble}
        className="w-full rounded-[22px] overflow-hidden bg-zinc-950 border border-slate-200/70 dark:border-zinc-800 select-none"
      >
        <div
          className={`relative w-full bg-zinc-950 ${
            detectedVertical
              ? "aspect-[9/16] max-h-[520px] mx-auto max-w-[320px]"
              : "aspect-video"
          }`}
        >
          {hasEnteredView ? (
            <iframe
              ref={iframeRef}
              src={ytSrc}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onLoad={() => {
                const win = iframeRef.current?.contentWindow;
                if (win) {
                  win.postMessage(
                    JSON.stringify({ event: "listening", id: instanceId }),
                    "*"
                  );
                  if (autoPlayInView && isInView && !userPausedRef.current) {
                    sendYouTubeCommand("playVideo");
                    setIsPlaying(true);
                  }
                }
              }}
              className="w-full h-full border-0"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
              <img
                src={`https://i.ytimg.com/vi/${resolvedEmbed.videoId}/hqdefault.jpg`}
                alt="Video thumbnail"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-85"
              />
            </div>
          )}
          {overlayBadge}
        </div>

        {/* Non-overlapping In-Site Control Strip (Play/Pause, -10s/+10s, Scrubber, Mute/Unmute) */}
        <div className="bg-zinc-900 text-white px-3 py-2 flex items-center justify-between gap-2 border-t border-white/10">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleEmbedPlayPause}
              className="w-8 h-8 rounded-lg bg-white/12 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
              aria-label={isPlaying ? "Pause video" : "Play video"}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={(e) => handleEmbedSeekBy(e, -10)}
              className="px-2.5 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0"
              title="Back 10s"
            >
              <RotateCcw className="w-3 h-3 shrink-0" />
              <span>10s</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleEmbedSeekBy(e, 10)}
              className="px-2.5 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0"
              title="Forward 10s"
            >
              <RotateCw className="w-3 h-3 shrink-0" />
              <span>10s</span>
            </button>
          </div>

          {duration > 0 ? (
            <div className="flex-1 flex items-center gap-2 min-w-0 px-1">
              <input
                type="range"
                min={0}
                max={duration}
                step={0.5}
                value={Math.min(duration, currentTime)}
                onChange={handleEmbedScrub}
                aria-label="Seek YouTube video"
                className="w-full h-1.5 accent-[#1877F2] cursor-pointer"
              />
              <span className="text-[10.5px] tabular-nums text-zinc-300 shrink-0 hidden sm:inline">
                {formatVideoClock(currentTime)} / {formatVideoClock(duration)}
              </span>
            </div>
          ) : (
            <span className="text-[11px] font-medium text-zinc-400 truncate">
              YouTube · In-Feed Player
            </span>
          )}

          <button
            type="button"
            onClick={toggleEmbedMute}
            className="px-2.5 h-8 rounded-lg bg-white/12 hover:bg-white/20 text-[11px] font-semibold flex items-center gap-1 shrink-0 whitespace-nowrap transition cursor-pointer"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 shrink-0" />
                <span>Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 shrink-0" />
                <span>Sound</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // 2. TIKTOK EMBED PLAYER v1 (Autoplay in viewport + Native Progress Scrubber + Quick Seek/Play/Sound Bar)
  if (resolvedEmbed.platform === "tiktok") {
    const ttId = resolvedEmbed.videoId;
    const autoParam = autoPlayInView ? "1" : "0";

    return (
      <div
        ref={containerRef}
        onClick={stopBubble}
        onPointerDown={stopBubble}
        className="w-full rounded-[22px] overflow-hidden bg-zinc-950 border border-slate-200/70 dark:border-zinc-800 select-none"
      >
        <div className="relative w-full aspect-[9/16] max-h-[520px] max-w-[310px] mx-auto bg-zinc-950 flex items-center justify-center">
          {resolvingLink ? (
            <div className="text-xs font-medium text-zinc-400">
              Loading TikTok video...
            </div>
          ) : ttId && hasEnteredView ? (
            <iframe
              ref={iframeRef}
              src={`https://www.tiktok.com/player/v1/${ttId}?autoplay=${autoParam}&mute=1&controls=1&progress_bar=1&play_button=1&volume_control=1&fullscreen_button=1&timestamp=1&loop=1&music_info=0&description=0&rel=0`}
              title="TikTok video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              onLoad={() => {
                if (autoPlayInView && isInView && !userPausedRef.current) {
                  setIsPlaying(true);
                }
              }}
              className="w-full h-full border-0"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400 px-4 text-center">
              {ttId ? "TikTok Video Ready" : "Unable to load TikTok video"}
            </div>
          )}
          {overlayBadge}
        </div>

        {ttId && (
          <div className="bg-zinc-900 text-white px-3 py-2 flex items-center justify-between gap-2 border-t border-white/10">
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={toggleEmbedPlayPause}
                className="w-8 h-8 rounded-lg bg-white/12 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
                aria-label={isPlaying ? "Pause TikTok" : "Play TikTok"}
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={(e) => handleEmbedSeekBy(e, -5)}
                className="px-2.5 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0"
                title="Back 5s"
              >
                <RotateCcw className="w-3 h-3 shrink-0" />
                <span>5s</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleEmbedSeekBy(e, 5)}
                className="px-2.5 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0"
                title="Forward 5s"
              >
                <RotateCw className="w-3 h-3 shrink-0" />
                <span>5s</span>
              </button>
            </div>

            {duration > 0 ? (
              <div className="flex-1 flex items-center gap-2 min-w-0 px-1">
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.5}
                  value={Math.min(duration, currentTime)}
                  onChange={handleEmbedScrub}
                  aria-label="Seek TikTok video"
                  className="w-full h-1.5 accent-[#1877F2] cursor-pointer"
                />
                <span className="text-[10.5px] tabular-nums text-zinc-300 shrink-0 hidden sm:inline">
                  {formatVideoClock(currentTime)} / {formatVideoClock(duration)}
                </span>
              </div>
            ) : (
              <span className="text-[11px] font-medium text-zinc-400 truncate">
                TikTok · In-Feed Player
              </span>
            )}

            <button
              type="button"
              onClick={toggleEmbedMute}
              className="px-2.5 h-8 rounded-lg bg-white/12 hover:bg-white/20 text-[11px] font-semibold flex items-center gap-1 shrink-0 whitespace-nowrap transition cursor-pointer"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 shrink-0" />
                  <span>Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Sound</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  // 3. FACEBOOK VIDEO / REEL EMBED PLAYER (Official plugins/video.php with Autoplay + Native Play/Pause/Scrubber)
  const shouldMountFb = hasEnteredView && (!autoPlayInView || isInView);
  const fbSrc = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
    resolvedEmbed.canonicalUrl
  )}&show_text=false&autoplay=${
    autoPlayInView ? "true" : "false"
  }&mute=1&allowfullscreen=true`;

  return (
    <div
      ref={containerRef}
      onClick={stopBubble}
      onPointerDown={stopBubble}
      className="w-full rounded-[22px] overflow-hidden bg-zinc-950 border border-slate-200/70 dark:border-zinc-800 select-none"
    >
      <div
        className={`relative w-full bg-zinc-950 flex items-center justify-center ${
          detectedVertical
            ? "aspect-[9/16] max-h-[520px] max-w-[310px] mx-auto"
            : "aspect-video"
        }`}
      >
        {shouldMountFb ? (
          <iframe
            ref={iframeRef}
            src={fbSrc}
            title="Facebook video player"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            scrolling="no"
            className="w-full h-full border-0 overflow-hidden"
          />
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setHasEnteredView(true);
              setIsInView(true);
            }}
            className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-300 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-[#1877F2] text-white flex items-center justify-center shadow-lg">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
            <span className="text-xs font-medium text-zinc-400">
              Facebook Video
            </span>
          </button>
        )}
        {overlayBadge}
      </div>
    </div>
  );
};

export default NewsVideoPlayer;
