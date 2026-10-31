import React, { useEffect, useId, useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  ParsedVideoEmbed,
  parseVideoEmbed,
  resolveShortVideoUrl,
  getVideoPlatformMeta,
  toPlayableMediaUrl,
  toPlayableAudioUrl,
} from "../lib/videoEmbed";
import { triggerHaptic } from "../lib/haptics";

interface NewsVideoPlayerProps {
  videoSource: ParsedVideoEmbed;
  autoPlayInView?: boolean;
  overlayBadge?: React.ReactNode;
  bgMusicUrl?: string;
  bgMusicVolume?: number;
  videoVolume?: number;
  hideBottomBar?: boolean;
  onVideoClick?: () => void;
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
  bgMusicUrl,
  bgMusicVolume = 1.0,
  videoVolume = 1.0,
  hideBottomBar = false,
  onVideoClick,
}) => {
  const instanceId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const nativeVideoRef = useRef<HTMLVideoElement | null>(null);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const userPausedRef = useRef(false);

  const [resolvedEmbed, setResolvedEmbed] =
    useState<ParsedVideoEmbed>(videoSource);
  const [resolvingLink, setResolvingLink] = useState<boolean>(
    Boolean(videoSource.needsResolution && videoSource.platform === "tiktok")
  );
  const [directStreamFailed, setDirectStreamFailed] = useState<boolean>(false);
  const [useRawOriginFallback, setUseRawOriginFallback] =
    useState<boolean>(false);
  const [hasLoadedFrame, setHasLoadedFrame] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<boolean>(false);

  // Viewport & activation state
  const [hasEnteredView, setHasEnteredView] = useState<boolean>(!autoPlayInView);
  const [isInView, setIsInView] = useState<boolean>(false);

  // postMessage / native video state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [detectedVertical, setDetectedVertical] = useState<boolean>(
    videoSource.isVertical
  );

  // Sync prop changes & resolve short share links / metadata
  useEffect(() => {
    let active = true;
    setResolvedEmbed(videoSource);
    setDetectedVertical(videoSource.isVertical);
    setCurrentTime(0);
    setDuration(0);
    setDirectStreamFailed(false);
    setUseRawOriginFallback(false);
    setHasLoadedFrame(false);
    setIsBuffering(false);
    setStreamError(false);
    setIsPlaying(false);
    userPausedRef.current = false;

    if (!videoSource.needsResolution) {
      setResolvingLink(false);
      return;
    }

    if (videoSource.platform === "tiktok") {
      setResolvingLink(true);
    }

    resolveShortVideoUrl(videoSource.originalUrl).then(
      ({
        resolvedUrl,
        tiktokVideoId,
        instagramShortcode,
        directVideoUrl,
        thumbnailUrl,
      }) => {
        if (!active) return;
        const reparsed = parseVideoEmbed(resolvedUrl);
        if (reparsed) {
          setResolvedEmbed({
            ...reparsed,
            videoId:
              reparsed.videoId ||
              tiktokVideoId ||
              instagramShortcode ||
              undefined,
            shortcode:
              reparsed.shortcode || instagramShortcode || reparsed.videoId,
            directStreamUrl: directVideoUrl || reparsed.directStreamUrl,
            thumbnailUrl: thumbnailUrl || reparsed.thumbnailUrl,
            needsResolution: false,
          });
          setDetectedVertical(reparsed.isVertical);
        } else if (tiktokVideoId) {
          setResolvedEmbed({
            ...videoSource,
            canonicalUrl: `https://www.tiktok.com/@tiktok/video/${tiktokVideoId}`,
            videoId: tiktokVideoId,
            directStreamUrl: directVideoUrl || undefined,
            thumbnailUrl: thumbnailUrl || undefined,
            isVertical: true,
            needsResolution: false,
          });
        } else if (instagramShortcode) {
          setResolvedEmbed({
            ...videoSource,
            platform: "instagram",
            canonicalUrl: `https://www.instagram.com/reel/${instagramShortcode}/`,
            videoId: instagramShortcode,
            shortcode: instagramShortcode,
            directStreamUrl: directVideoUrl || undefined,
            thumbnailUrl: thumbnailUrl || undefined,
            isVertical: true,
            needsResolution: false,
          });
        } else {
          setResolvedEmbed({
            ...videoSource,
            directStreamUrl: directVideoUrl || videoSource.directStreamUrl,
            thumbnailUrl: thumbnailUrl || videoSource.thumbnailUrl,
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

  const usesNativeStream =
    resolvedEmbed.platform === "direct" ||
    (Boolean(resolvedEmbed.directStreamUrl) && !directStreamFailed);

  // Pause this player if another video in the feed becomes active
  useEffect(() => {
    const onOtherVideoActive = (ev: Event) => {
      const customEv = ev as CustomEvent<{ id: string }>;
      if (customEv.detail?.id && customEv.detail.id !== instanceId) {
        if (nativeVideoRef.current) {
          nativeVideoRef.current.pause();
          setIsPlaying(false);
        } else if (resolvedEmbed.platform === "youtube") {
          sendYouTubeCommand("pauseVideo");
          setIsPlaying(false);
        } else if (resolvedEmbed.platform === "tiktok") {
          sendTikTokCommand("pause");
          setIsPlaying(false);
        }
        if (bgAudioRef.current) {
          bgAudioRef.current.pause();
        }
      }
    };

    window.addEventListener(ACTIVE_VIDEO_EVENT, onOtherVideoActive);
    return () => {
      window.removeEventListener(ACTIVE_VIDEO_EVENT, onOtherVideoActive);
    };
  }, [instanceId, resolvedEmbed.platform]);

  // Listen to YouTube & TikTok iframe player state/time updates
  useEffect(() => {
    if (
      usesNativeStream ||
      (resolvedEmbed.platform !== "youtube" &&
        resolvedEmbed.platform !== "tiktok")
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
      } catch {}
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [resolvedEmbed.platform, usesNativeStream]);

  // Viewport IntersectionObserver for Feed Autoplay & Off-Screen Autopause
  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setHasEnteredView(true);
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
          setHasEnteredView(true);
          setIsInView(true);
        } else if (!entry.isIntersecting || entry.intersectionRatio < 0.08) {
          setIsInView(false);
        }
      },
      {
        threshold: [0, 0.08, 0.2, 0.5],
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

      if (nativeVideoRef.current) {
        const v = nativeVideoRef.current;
        v.play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            v.muted = true;
            setIsMuted(true);
            v.play()
              .then(() => setIsPlaying(true))
              .catch(() => {});
          });
      } else if (resolvedEmbed.platform === "youtube") {
        sendYouTubeCommand("playVideo");
        setIsPlaying(true);
      } else if (resolvedEmbed.platform === "tiktok") {
        sendTikTokCommand("play");
        setIsPlaying(true);
      }
    } else {
      if (nativeVideoRef.current) {
        nativeVideoRef.current.pause();
        setIsPlaying(false);
      } else if (resolvedEmbed.platform === "youtube") {
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
    usesNativeStream,
    useRawOriginFallback,
    resolvedEmbed.platform,
    resolvedEmbed.canonicalUrl,
  ]);

  // React to external mute toggle events (sent by parent components like LoopPostCard)
  useEffect(() => {
    const handleExternalMute = (ev: Event) => {
      const customEv = ev as CustomEvent<{ postId?: string }>;
      // If event provides a postId, only react if it matches (or if no ID was provided)
      // Since NewsVideoPlayer doesn't explicitly know its postId from props, 
      // we assume it's for the currently active one or we just toggle.
      // Better: we just toggle if this player is currently 'isInView'.
      if (isInView) {
        const nextMuted = !isMuted;
        setIsMuted(nextMuted);
        if (nativeVideoRef.current) {
          nativeVideoRef.current.muted = nextMuted;
        } else if (resolvedEmbed.platform === "youtube") {
          sendYouTubeCommand(nextMuted ? "mute" : "unMute");
        } else if (resolvedEmbed.platform === "tiktok") {
          sendTikTokCommand(nextMuted ? "mute" : "unMute");
        }
      }
    };
    window.addEventListener('loops:toggle-mute', handleExternalMute);
    return () => window.removeEventListener('loops:toggle-mute', handleExternalMute);
  }, [isInView, isMuted, resolvedEmbed.platform]);

  // Sync video volume & separate background music <audio> element
  const rawNativeStreamUrl =
    resolvedEmbed.directStreamUrl || resolvedEmbed.canonicalUrl || "";
  const hasSeparateBgMusic = Boolean(
    bgMusicUrl &&
      bgMusicUrl.trim() &&
      bgMusicUrl.trim() !== rawNativeStreamUrl.trim() &&
      bgMusicUrl.trim() !== resolvedEmbed.originalUrl.trim()
  );

  useEffect(() => {
    if (nativeVideoRef.current) {
      const clampedVol = Math.max(0, Math.min(1, Number(videoVolume ?? 1)));
      nativeVideoRef.current.volume = clampedVol;
    }
  }, [videoVolume, hasLoadedFrame]);

  useEffect(() => {
    const audioEl = bgAudioRef.current;
    if (!audioEl || !hasSeparateBgMusic) return;
    audioEl.volume = Math.max(0, Math.min(1, Number(bgMusicVolume ?? 1)));
    audioEl.muted = isMuted;
    if (isPlaying && isInView && !isMuted) {
      audioEl.play().catch(() => {});
    } else if (!isPlaying || !isInView) {
      audioEl.pause();
    }
  }, [hasSeparateBgMusic, bgMusicUrl, bgMusicVolume, isMuted, isPlaying, isInView]);

  const toggleEmbedPlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onVideoClick) {
      onVideoClick();
      return;
    }
    triggerHaptic();
    if (nativeVideoRef.current) {
      const v = nativeVideoRef.current;
      if (streamError) {
        setStreamError(false);
        setIsBuffering(true);
        v.load();
      }
      if (v.paused) {
        userPausedRef.current = false;
        announceActivePlayback();
        v.play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            v.muted = true;
            setIsMuted(true);
            v.play()
              .then(() => setIsPlaying(true))
              .catch(() => setIsPlaying(false));
          });
      } else {
        userPausedRef.current = true;
        v.pause();
        setIsPlaying(false);
      }
      return;
    }

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
    if (nativeVideoRef.current) {
      const vid = nativeVideoRef.current;
      const target = Math.max(
        0,
        Math.min(vid.duration || Infinity, vid.currentTime + deltaSec)
      );
      vid.currentTime = target;
      setCurrentTime(target);
      return;
    }

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
    if (nativeVideoRef.current) {
      nativeVideoRef.current.currentTime = target;
    } else if (resolvedEmbed.platform === "youtube") {
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
    if (nativeVideoRef.current) {
      nativeVideoRef.current.muted = nextMuted;
    } else if (resolvedEmbed.platform === "youtube") {
      sendYouTubeCommand(nextMuted ? "mute" : "unMute");
    } else if (resolvedEmbed.platform === "tiktok") {
      sendTikTokCommand(nextMuted ? "mute" : "unMute");
    }
    if (bgAudioRef.current) {
      bgAudioRef.current.muted = nextMuted;
      if (!nextMuted && isPlaying && isInView) {
        bgAudioRef.current.play().catch(() => {});
      }
    }
  };

  const stopBubble = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  const meta = getVideoPlatformMeta(
    resolvedEmbed.platform,
    resolvedEmbed.originalUrl
  );

  const renderSourceAttributionBar = () => {
    if (resolvedEmbed.platform === "direct") return null;
    return (
      <div className="bg-zinc-950/95 text-zinc-300 px-3 py-1.5 flex items-center justify-between gap-2 border-t border-white/10 text-[11px]">
        <span className="truncate font-medium">
          Shared from <strong className="text-white">{meta.reelLabel}</strong>
        </span>
        <a
          href={resolvedEmbed.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-zinc-300 hover:text-white font-semibold shrink-0 whitespace-nowrap"
        >
          <span>View source</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  };

  // 0. DIRECT VIDEO STREAM (or resolved og:video stream)
  if (usesNativeStream) {
    const rawCandidate =
      resolvedEmbed.directStreamUrl || resolvedEmbed.canonicalUrl;
    const proxiedCandidate = toPlayableMediaUrl(rawCandidate);
    const streamSrc =
      useRawOriginFallback &&
      resolvedEmbed.originalUrl &&
      resolvedEmbed.originalUrl !== proxiedCandidate
        ? resolvedEmbed.originalUrl
        : proxiedCandidate;

    return (
      <div
        ref={containerRef}
        onClick={stopBubble}
        onPointerDown={stopBubble}
        className="w-full overflow-hidden bg-zinc-950 border-y border-slate-200/70 dark:border-zinc-800 select-none touch-manipulation"
      >
        <div
          onClick={toggleEmbedPlayPause}
          className="relative w-full bg-zinc-950 flex items-center justify-center cursor-pointer overflow-hidden"
        >
          <video
            ref={nativeVideoRef}
            src={streamSrc}
            poster={resolvedEmbed.thumbnailUrl}
            preload={hasEnteredView || isInView ? "auto" : "metadata"}
            playsInline
            loop
            muted={isMuted || (hasSeparateBgMusic && Number(videoVolume ?? 1) <= 0.01)}
            autoPlay={autoPlayInView && isInView}
            onPlay={() => {
              setIsPlaying(true);
              setStreamError(false);
            }}
            onPlaying={() => {
              setIsPlaying(true);
              setHasLoadedFrame(true);
              setIsBuffering(false);
              setStreamError(false);
            }}
            onPause={() => setIsPlaying(false)}
            onWaiting={() => setIsBuffering(true)}
            onCanPlay={() => {
              setHasLoadedFrame(true);
              setIsBuffering(false);
            }}
            onLoadedData={(e) => {
              setHasLoadedFrame(true);
              setIsBuffering(false);
              setStreamError(false);
              const v = e.currentTarget;
              v.volume = Math.max(0, Math.min(1, Number(videoVolume ?? 1)));
              if (autoPlayInView && isInView && !userPausedRef.current && v.paused) {
                v.play()
                  .then(() => setIsPlaying(true))
                  .catch(() => {
                    v.muted = true;
                    setIsMuted(true);
                    v.play()
                      .then(() => setIsPlaying(true))
                      .catch(() => {});
                  });
              }
            }}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.duration && Number.isFinite(v.duration)) {
                setDuration(v.duration);
              }
              if (v.videoHeight > 0 && v.videoWidth > 0) {
                setDetectedVertical(v.videoHeight >= v.videoWidth);
              }
              if (!resolvedEmbed.thumbnailUrl && v.currentTime === 0 && v.paused) {
                try {
                  v.currentTime = 0.001;
                } catch {}
              }
            }}
            onTimeUpdate={(e) => {
              if (!hasLoadedFrame && e.currentTarget.currentTime > 0) {
                setHasLoadedFrame(true);
              }
              setCurrentTime(e.currentTarget.currentTime);
            }}
            onError={() => {
              if (
                !useRawOriginFallback &&
                resolvedEmbed.originalUrl &&
                proxiedCandidate.startsWith("/api/stream-media") &&
                resolvedEmbed.originalUrl !== proxiedCandidate
              ) {
                setUseRawOriginFallback(true);
                return;
              }
              if (resolvedEmbed.platform !== "direct") {
                setDirectStreamFailed(true);
              } else {
                setIsBuffering(false);
                setStreamError(true);
              }
            }}
            className="w-full max-h-[680px] h-auto object-contain block mx-auto pointer-events-none"
          />

          {/* Loading / Buffering Spinner */}
          {(!hasLoadedFrame || isBuffering) && !streamError && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
              <div className="w-11 h-11 rounded-full bg-black/55 backdrop-blur-md border border-white/15 flex items-center justify-center text-white">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            </div>
          )}

          {/* Center Play Button Overlay when Paused (hidden on clean feed post cards) */}
          {!hideBottomBar && !isPlaying && hasLoadedFrame && !isBuffering && !streamError && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-xl">
                <Play className="w-6 h-6 fill-white ml-0.5" />
              </div>
            </div>
          )}

          {/* Stream Retry State if Network Interrupted */}
          {streamError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-950/90 px-4 text-center">
              <p className="text-xs font-medium text-zinc-300">
                Tap to reload video stream
              </p>
              <span className="px-3.5 py-1.5 rounded-full bg-white/15 text-white text-xs font-semibold">
                Reload Video
              </span>
            </div>
          )}

          {/* Top-Right Video Duration Badge */}
          {duration > 0 && (
            <div className="absolute top-3 right-3 z-20 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[12px] font-semibold tracking-wide font-mono select-none pointer-events-none drop-shadow-md">
              {formatVideoClock(duration)}
            </div>
          )}

          {/* Single Bottom-Right Glass Mute / Unmute Toggle Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic();
              const nextMuted = !isMuted;
              setIsMuted(nextMuted);
              if (nativeVideoRef.current) {
                nativeVideoRef.current.muted = nextMuted && !(hasSeparateBgMusic && Number(videoVolume ?? 1) <= 0.01);
                if (hasSeparateBgMusic && Number(videoVolume ?? 1) <= 0.01) {
                  nativeVideoRef.current.muted = true;
                } else {
                  nativeVideoRef.current.muted = nextMuted;
                }
              }
              if (bgAudioRef.current) {
                bgAudioRef.current.muted = nextMuted;
                if (!nextMuted && isPlaying && isInView) {
                  bgAudioRef.current.play().catch(() => {});
                }
              }
            }}
            className="absolute bottom-3 right-3 z-20 w-8.5 h-8.5 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center shadow-lg hover:bg-black/80 active:scale-90 transition cursor-pointer touch-manipulation"
            aria-label={isMuted ? "Unmute video" : "Mute video"}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 fill-white" />
            ) : (
              <Volume2 className="w-4 h-4 fill-white" />
            )}
          </button>

          {hasSeparateBgMusic && bgMusicUrl && (
            <audio
              ref={bgAudioRef}
              src={toPlayableAudioUrl(bgMusicUrl)}
              preload="auto"
              loop
              muted={isMuted}
            />
          )}

          {overlayBadge}
        </div>

        {!hideBottomBar && (
          <div className="bg-zinc-900 text-white px-3 py-2 flex items-center justify-between gap-2 border-t border-white/10">
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={toggleEmbedPlayPause}
                className="w-8 h-8 rounded-lg bg-white/12 hover:bg-white/20 flex items-center justify-center transition cursor-pointer touch-manipulation"
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
                onClick={(e) => handleEmbedSeekBy(e, -5)}
                className="px-2.5 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0 touch-manipulation"
              >
                <RotateCcw className="w-3 h-3 shrink-0" />
                <span>5s</span>
              </button>
              <button
                type="button"
                onClick={(e) => handleEmbedSeekBy(e, 5)}
                className="px-2.5 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0 touch-manipulation"
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
                  step={0.1}
                  value={Math.min(duration, currentTime)}
                  onChange={handleEmbedScrub}
                  aria-label="Seek video"
                  className="w-full h-1.5 accent-[#1877F2] cursor-pointer touch-manipulation"
                />
                <span className="text-[10.5px] tabular-nums text-zinc-300 shrink-0 hidden sm:inline">
                  {formatVideoClock(currentTime)} / {formatVideoClock(duration)}
                </span>
              </div>
            ) : (
              <span className="text-[11px] font-medium text-zinc-400 truncate">
                {meta.reelLabel}
              </span>
            )}

            <button
              type="button"
              onClick={toggleEmbedMute}
              className="px-2.5 h-8 rounded-lg bg-white/12 hover:bg-white/20 text-[11px] font-semibold flex items-center gap-1 shrink-0 whitespace-nowrap transition cursor-pointer touch-manipulation"
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
        {!hideBottomBar && renderSourceAttributionBar()}
      </div>
    );
  }

  // 1. YOUTUBE EMBED PLAYER
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
        className="w-full overflow-hidden bg-zinc-950 border-y border-slate-200/70 dark:border-zinc-800 select-none"
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
          {hideBottomBar && onVideoClick && (
            <div
              onClick={toggleEmbedPlayPause}
              className="absolute inset-0 z-10 cursor-pointer"
            />
          )}
          {hideBottomBar && (
            <button
              type="button"
              onClick={toggleEmbedMute}
              className="absolute bottom-3 right-3 z-20 w-8 h-8 rounded-full bg-black/65 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-md transition cursor-pointer"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {!hideBottomBar && (
          <>
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
                  {meta.reelLabel}
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
            {renderSourceAttributionBar()}
          </>
        )}
      </div>
    );
  }

  // 2. INSTAGRAM REEL / POST EMBED PLAYER
  if (resolvedEmbed.platform === "instagram") {
    const shortcode = resolvedEmbed.shortcode || resolvedEmbed.videoId;
    const isPost = /\/p\//i.test(resolvedEmbed.canonicalUrl);
    const igEmbedSrc = shortcode
      ? `https://www.instagram.com/${isPost ? "p" : "reel"}/${shortcode}/embed/`
      : null;

    return (
      <div
        ref={containerRef}
        onClick={stopBubble}
        onPointerDown={stopBubble}
        className="w-full overflow-hidden bg-zinc-950 border-y border-slate-200/70 dark:border-zinc-800 select-none"
      >
        <div className="relative w-full aspect-[9/16] max-h-[540px] max-w-[330px] mx-auto bg-zinc-950 flex items-center justify-center overflow-hidden">
          {igEmbedSrc && hasEnteredView ? (
            <iframe
              ref={iframeRef}
              src={igEmbedSrc}
              title="Instagram Reel player"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              allowFullScreen
              scrolling="no"
              className="w-full h-full border-0"
            />
          ) : (
            <div className="text-xs font-medium text-zinc-400">
              Loading Instagram Reel...
            </div>
          )}
          {hideBottomBar && onVideoClick && (
            <div
              onClick={toggleEmbedPlayPause}
              className="absolute inset-0 z-10 cursor-pointer"
            />
          )}
          {overlayBadge}
        </div>
        {!hideBottomBar && renderSourceAttributionBar()}
      </div>
    );
  }

  // 3. TIKTOK EMBED PLAYER v1
  if (resolvedEmbed.platform === "tiktok") {
    const ttId = resolvedEmbed.videoId;
    const autoParam = autoPlayInView ? "1" : "0";

    return (
      <div
        ref={containerRef}
        onClick={stopBubble}
        onPointerDown={stopBubble}
        className="w-full overflow-hidden bg-zinc-950 border-y border-slate-200/70 dark:border-zinc-800 select-none"
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
          {hideBottomBar && onVideoClick && (
            <div
              onClick={toggleEmbedPlayPause}
              className="absolute inset-0 z-10 cursor-pointer"
            />
          )}
          {hideBottomBar && (
            <button
              type="button"
              onClick={toggleEmbedMute}
              className="absolute bottom-3 right-3 z-20 w-8.5 h-8.5 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center shadow-lg hover:bg-black/80 active:scale-90 transition cursor-pointer touch-manipulation"
              aria-label={isMuted ? "Unmute video" : "Mute video"}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 fill-white" />
              ) : (
                <Volume2 className="w-4 h-4 fill-white" />
              )}
            </button>
          )}
          {overlayBadge}
        </div>

        {!hideBottomBar && ttId && (
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
        {!hideBottomBar && renderSourceAttributionBar()}
      </div>
    );
  }

  // 4. X / TWITTER, VIMEO, STREAMABLE, DAILYMOTION EMBEDS
  if (
    resolvedEmbed.platform === "x" ||
    resolvedEmbed.platform === "vimeo" ||
    resolvedEmbed.platform === "streamable" ||
    resolvedEmbed.platform === "dailymotion"
  ) {
    const autoParam = autoPlayInView && isInView ? "1" : "0";
    let embedUrl = resolvedEmbed.canonicalUrl;
    if (resolvedEmbed.platform === "x" && resolvedEmbed.videoId) {
      embedUrl = `https://platform.twitter.com/embed/Tweet.html?id=${resolvedEmbed.videoId}&theme=dark&dnt=true`;
    } else if (resolvedEmbed.platform === "vimeo" && resolvedEmbed.videoId) {
      embedUrl = `https://player.vimeo.com/video/${resolvedEmbed.videoId}?autoplay=${autoParam}&muted=1&loop=1`;
    } else if (
      resolvedEmbed.platform === "streamable" &&
      resolvedEmbed.videoId
    ) {
      embedUrl = `https://streamable.com/e/${resolvedEmbed.videoId}?autoplay=${autoParam}&muted=1&loop=1`;
    } else if (
      resolvedEmbed.platform === "dailymotion" &&
      resolvedEmbed.videoId
    ) {
      embedUrl = `https://www.dailymotion.com/embed/video/${resolvedEmbed.videoId}?autoplay=${autoParam}&mute=1`;
    }

    return (
      <div
        ref={containerRef}
        onClick={stopBubble}
        onPointerDown={stopBubble}
        className="w-full overflow-hidden bg-zinc-950 border-y border-slate-200/70 dark:border-zinc-800 select-none"
      >
        <div
          className={`relative w-full bg-zinc-950 flex items-center justify-center ${
            detectedVertical
              ? "aspect-[9/16] max-h-[540px] max-w-[340px] mx-auto"
              : "aspect-video"
          }`}
        >
          {hasEnteredView ? (
            <iframe
              ref={iframeRef}
              src={embedUrl}
              title={`${meta.name} video player`}
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="w-full h-full border-0"
            />
          ) : (
            <div className="text-xs font-medium text-zinc-400">
              {meta.reelLabel}
            </div>
          )}
          {hideBottomBar && onVideoClick && (
            <div
              onClick={toggleEmbedPlayPause}
              className="absolute inset-0 z-10 cursor-pointer"
            />
          )}
          {overlayBadge}
        </div>
        {!hideBottomBar && renderSourceAttributionBar()}
      </div>
    );
  }

  // 5. FACEBOOK VIDEO / REEL EMBED PLAYER
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
      className="w-full overflow-hidden bg-zinc-950 border-y border-slate-200/70 dark:border-zinc-800 select-none"
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
              if (onVideoClick) {
                onVideoClick();
                return;
              }
              setHasEnteredView(true);
              setIsInView(true);
            }}
            className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-300 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-[#1877F2] text-white flex items-center justify-center shadow-lg">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
            <span className="text-xs font-medium text-zinc-400">
              {meta.reelLabel}
            </span>
          </button>
        )}
        {hideBottomBar && onVideoClick && (
          <div
            onClick={toggleEmbedPlayPause}
            className="absolute inset-0 z-10 cursor-pointer"
          />
        )}
        {overlayBadge}
      </div>
      {!hideBottomBar && renderSourceAttributionBar()}
    </div>
  );
};

export default NewsVideoPlayer;
