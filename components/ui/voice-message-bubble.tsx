"use client"

import * as React from "react"
import { Play, Pause, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface VoiceMessageBubbleProps {
  audioSrc: string
  duration?: number // in seconds
  bubbleColor?: string
  waveColor?: string
  isMe?: boolean
  className?: string
  onEnded?: () => void
  autoPlay?: boolean
}

// Convert base64 data URL to Blob URL for rock-solid cross-browser playback
function createAudioBlobUrl(src: string): string {
  if (!src) return '';
  if (!src.startsWith('data:audio/')) return src;

  try {
    const parts = src.split(',');
    if (parts.length < 2) return src;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'audio/webm';
    const b64 = parts[1];
    const byteCharacters = atob(b64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mime });
    return URL.createObjectURL(blob);
  } catch (e) {
    return src;
  }
}

export default function VoiceMessageBubble({
  audioSrc,
  duration = 10,
  bubbleColor,
  waveColor = "#fff",
  isMe = false,
  className,
  onEnded,
  autoPlay = false,
}: VoiceMessageBubbleProps) {
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [totalDuration, setTotalDuration] = React.useState(duration || 10)
  const [speed, setSpeed] = React.useState(1)
  const [isDragging, setIsDragging] = React.useState(false)
  const [hasError, setHasError] = React.useState(false)
  const [resolvedSrc, setResolvedSrc] = React.useState<string>('')

  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const webAudioSourceRef = React.useRef<AudioBufferSourceNode | null>(null)
  const webAudioCtxRef = React.useRef<AudioContext | null>(null)

  React.useEffect(() => {
    if (!audioSrc) {
      setResolvedSrc('');
      return;
    }
    const blobUrl = createAudioBlobUrl(audioSrc);
    setResolvedSrc(blobUrl);
    setHasError(false);

    return () => {
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
      if (webAudioSourceRef.current) {
        try {
          webAudioSourceRef.current.stop();
        } catch (e) {}
      }
    };
  }, [audioSrc]);

  // Sync speed changes
  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed])

  // Handle Autoplay if requested
  React.useEffect(() => {
    if (autoPlay && audioRef.current && !isPlaying && resolvedSrc) {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  }, [autoPlay, resolvedSrc])

  const handleTimeUpdate = () => {
    if (!audioRef.current || isDragging) return
    const cur = audioRef.current.currentTime
    const dur = audioRef.current.duration && !isNaN(audioRef.current.duration) && isFinite(audioRef.current.duration)
      ? audioRef.current.duration
      : totalDuration || 10
    
    setCurrentTime(cur)
    setProgress(Math.min(100, Math.max(0, (cur / dur) * 100)))
  }

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return
    const dur = audioRef.current.duration
    if (dur && !isNaN(dur) && isFinite(dur)) {
      setTotalDuration(Math.round(dur))
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
    setProgress(0)
    setCurrentTime(0)
    if (audioRef.current) {
      audioRef.current.currentTime = 0
    }
    if (onEnded) onEnded()
  }

  const handleAudioError = (e: any) => {
    // Graceful error handling
    setHasError(true)
    setIsPlaying(false)
  }

  const playViaWebAudio = async () => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return false;
      if (!webAudioCtxRef.current) {
        webAudioCtxRef.current = new AudioCtxClass();
      }
      const ctx = webAudioCtxRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      let arrayBuffer: ArrayBuffer;
      if (audioSrc.startsWith('data:audio/')) {
        const parts = audioSrc.split(',');
        const b64 = parts[1] || '';
        const byteCharacters = atob(b64);
        const bytes = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          bytes[i] = byteCharacters.charCodeAt(i);
        }
        arrayBuffer = bytes.buffer;
      } else {
        const res = await fetch(resolvedSrc || audioSrc);
        arrayBuffer = await res.arrayBuffer();
      }

      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
      setTotalDuration(Math.round(decodedBuffer.duration));

      const source = ctx.createBufferSource();
      source.buffer = decodedBuffer;
      source.playbackRate.value = speed;
      source.connect(ctx.destination);
      source.onended = handleAudioEnded;
      source.start(0);
      webAudioSourceRef.current = source;
      setIsPlaying(true);
      setHasError(false);
      return true;
    } catch (err) {
      return false;
    }
  };

  const togglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const audio = audioRef.current

    if (isPlaying) {
      if (audio) {
        audio.pause()
      }
      if (webAudioSourceRef.current) {
        try {
          webAudioSourceRef.current.stop()
        } catch (e) {}
      }
      setIsPlaying(false)
      return
    }

    if (audio && resolvedSrc) {
      audio.playbackRate = speed
      try {
        await audio.play()
        setIsPlaying(true)
        setHasError(false)
        return
      } catch (err) {
        // Fallback to Web Audio API decoding if native HTML5 Audio element fails on specific codecs
        const fallbackSuccess = await playViaWebAudio();
        if (!fallbackSuccess) {
          setIsPlaying(false)
          setHasError(true)
        }
      }
    } else {
      await playViaWebAudio();
    }
  }

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation()
    const speeds = [0.5, 1, 1.5, 2]
    const nextIndex = (speeds.indexOf(speed) + 1) % speeds.length
    const nextSpeed = speeds[nextIndex]
    setSpeed(nextSpeed)
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed
    }
  }

  // Handle seeking / scrubbing
  const handleSeek = (clientX: number) => {
    const container = containerRef.current
    const audio = audioRef.current
    if (!container || !audio) return

    const rect = container.getBoundingClientRect()
    const relativeX = clientX - rect.left
    const percentage = Math.max(0, Math.min(1, relativeX / rect.width))
    
    const targetDuration = audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)
      ? audio.duration
      : totalDuration || 10
    const newTime = percentage * targetDuration
    
    setCurrentTime(newTime)
    setProgress(percentage * 100)
    
    if (!isDragging) {
      audio.currentTime = newTime
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    setIsDragging(true)
    handleSeek(e.clientX)
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation()
    setIsDragging(true)
    handleSeek(e.touches[0].clientX)
  }

  React.useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      handleSeek(e.clientX)
    }

    const handleTouchMove = (e: TouchEvent) => {
      handleSeek(e.touches[0].clientX)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      if (audioRef.current) {
        const dur = audioRef.current.duration && !isNaN(audioRef.current.duration) && isFinite(audioRef.current.duration)
          ? audioRef.current.duration
          : totalDuration || 10
        audioRef.current.currentTime = (progress / 100) * dur
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("touchmove", handleTouchMove, { passive: true })
    window.addEventListener("mouseup", handleMouseUp)
    window.addEventListener("touchend", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("touchend", handleMouseUp)
    }
  }, [isDragging, progress, totalDuration])

  // Waveform bars
  const waveBars = [
    6, 12, 18, 10, 14, 22, 28, 16, 12, 24, 
    30, 20, 14, 26, 32, 24, 12, 18, 26, 22, 
    10, 16, 24, 30, 18, 12, 20, 14, 8, 12, 
    16, 10, 14, 6, 10
  ]

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity || secs < 0) return "0:00"
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "flex items-center gap-2.5 p-2 rounded-2xl w-full max-w-[290px] select-none transition-all relative",
        isMe ? "bg-[#5B51D8] text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100",
        className
      )}
      style={bubbleColor ? { backgroundColor: bubbleColor } : undefined}
    >
      {/* Native Audio Element with inline handlers */}
      {resolvedSrc ? (
        <audio
          ref={audioRef}
          src={resolvedSrc}
          preload="auto"
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleAudioEnded}
          onError={handleAudioError}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      ) : null}

      {/* Play/Pause Trigger */}
      <button
        type="button"
        onClick={togglePlay}
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 hover:opacity-90 shadow-sm cursor-pointer",
          isMe ? "bg-white text-[#5B51D8]" : "bg-[#5B51D8] text-white"
        )}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current translate-x-[1px]" />
        )}
      </button>

      {/* Waveform & Progress Container */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="h-7 relative cursor-pointer flex items-center min-w-[110px]"
        >
          {/* Base wave (Unplayed) */}
          <div className="absolute inset-0 flex justify-between items-center px-0.5 gap-[2px]">
            {waveBars.map((h, idx) => (
              <div
                key={`base-${idx}`}
                className="rounded-full flex-1"
                style={{
                  height: `${h}px`,
                  backgroundColor: waveColor,
                  opacity: isMe ? 0.4 : 0.3,
                }}
              />
            ))}
          </div>

          {/* Active wave overlay (Played) */}
          <div
            className="absolute top-0 left-0 h-full overflow-hidden transition-[width] duration-75"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 flex justify-between items-center px-0.5 gap-[2px] w-[140px] sm:w-[160px] md:w-auto min-w-full">
              {waveBars.map((h, idx) => (
                <div
                  key={`played-${idx}`}
                  className="rounded-full flex-1"
                  style={{
                    height: `${h}px`,
                    backgroundColor: waveColor,
                    opacity: 1,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Timer Label */}
        <div className="flex justify-between items-center px-0.5">
          <span className={cn("text-[9px] font-bold font-mono tracking-wide", isMe ? "text-white/80" : "text-zinc-500 dark:text-zinc-400")}>
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </span>
          {hasError && (
            <span className="text-[9px] text-amber-400 font-medium flex items-center gap-0.5">
              <AlertCircle className="w-2.5 h-2.5" /> Tap again
            </span>
          )}
        </div>
      </div>

      {/* Speed Control Indicator */}
      <button
        type="button"
        onClick={cycleSpeed}
        className={cn(
          "h-6 px-1.5 py-0.5 rounded-lg text-[9px] font-black font-mono shrink-0 transition-all uppercase tracking-wider hover:opacity-95 active:scale-95 border cursor-pointer",
          isMe 
            ? "bg-white/10 text-white hover:bg-white/20 border-white/20" 
            : "bg-zinc-200 dark:bg-zinc-700/50 text-zinc-600 dark:text-zinc-300 border-zinc-300/30 dark:border-zinc-700/50"
        )}
      >
        {speed}x
      </button>
    </div>
  )
}
