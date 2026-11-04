"use client"

import * as React from "react"
import { AlertCircle } from "lucide-react"
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

function resolvePlayableAudioUrl(src: string): { url: string; ownedBlob: boolean } {
  if (!src) return { url: "", ownedBlob: false }
  if (!src.startsWith("data:audio/")) {
    return { url: src, ownedBlob: false }
  }

  try {
    const parts = src.split(",")
    if (parts.length < 2) return { url: src, ownedBlob: false }
    const mimeMatch = parts[0].match(/:(.*?);/)
    const mime = mimeMatch ? mimeMatch[1] : "audio/webm"
    const b64 = parts[1]
    const byteCharacters = atob(b64)
    const byteArray = new Uint8Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArray[i] = byteCharacters.charCodeAt(i)
    }
    const blob = new Blob([byteArray], { type: mime })
    return { url: URL.createObjectURL(blob), ownedBlob: true }
  } catch {
    return { url: src, ownedBlob: false }
  }
}

const ORGANIC_WAVE_HEIGHTS = [
  8, 13, 20, 14, 24, 30, 18, 12, 26, 32, 22, 15, 28, 34, 20, 14, 25,
  30, 18, 11, 22, 29, 24, 16, 27, 19, 13, 21, 16, 12, 18, 14, 10, 8,
]

export default function VoiceMessageBubble({
  audioSrc,
  duration = 0,
  bubbleColor,
  isMe = false,
  className,
  onEnded,
  autoPlay = false,
}: VoiceMessageBubbleProps) {
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [totalDuration, setTotalDuration] = React.useState(
    duration && duration > 0 ? duration : 0
  )
  const [speed, setSpeed] = React.useState<1 | 1.5 | 2>(1)
  const [hasError, setHasError] = React.useState(false)
  const [resolvedSrc, setResolvedSrc] = React.useState<string>("")
  const [animTick, setAnimTick] = React.useState(0)

  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const trackRef = React.useRef<HTMLDivElement | null>(null)
  const rafRef = React.useRef<number | null>(null)
  const isScrubbingRef = React.useRef(false)
  const webAudioSourceRef = React.useRef<AudioBufferSourceNode | null>(null)
  const webAudioCtxRef = React.useRef<AudioContext | null>(null)

  React.useEffect(() => {
    if (duration && duration > 0 && totalDuration === 0) {
      setTotalDuration(duration)
    }
  }, [duration, totalDuration])

  React.useEffect(() => {
    if (!audioSrc) {
      setResolvedSrc("")
      return
    }
    const { url, ownedBlob } = resolvePlayableAudioUrl(audioSrc)
    setResolvedSrc(url)
    setHasError(false)

    return () => {
      if (ownedBlob && url.startsWith("blob:")) {
        URL.revokeObjectURL(url)
      }
      if (webAudioSourceRef.current) {
        try {
          webAudioSourceRef.current.stop()
        } catch {}
      }
    }
  }, [audioSrc])

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed
    }
  }, [speed])

  React.useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    let frameCount = 0
    const tick = () => {
      const el = audioRef.current
      if (el && !el.paused && !isScrubbingRef.current) {
        const cur = el.currentTime || 0
        const dur =
          Number.isFinite(el.duration) && el.duration > 0
            ? el.duration
            : totalDuration || 1
        setCurrentTime(cur)
        setProgress(Math.min(100, Math.max(0, (cur / dur) * 100)))
        frameCount += 1
        if (frameCount % 3 === 0) {
          setAnimTick((n) => (n + 1) % 1000)
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isPlaying, totalDuration])

  React.useEffect(() => {
    if (autoPlay && audioRef.current && !isPlaying && resolvedSrc) {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {})
    }
  }, [autoPlay, resolvedSrc])

  const handleLoadedMetadata = () => {
    const el = audioRef.current
    if (!el) return
    if (Number.isFinite(el.duration) && el.duration > 0) {
      setTotalDuration(Math.round(el.duration))
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
    setProgress(0)
    setCurrentTime(0)
    if (audioRef.current) {
      audioRef.current.currentTime = 0
    }
    onEnded?.()
  }

  const playViaWebAudio = async (): Promise<boolean> => {
    try {
      const AudioCtxClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtxClass) return false
      if (!webAudioCtxRef.current) {
        webAudioCtxRef.current = new AudioCtxClass()
      }
      const ctx = webAudioCtxRef.current
      if (ctx.state === "suspended") {
        await ctx.resume()
      }

      let arrayBuffer: ArrayBuffer
      if (audioSrc.startsWith("data:audio/")) {
        const b64 = audioSrc.split(",")[1] || ""
        const byteCharacters = atob(b64)
        const bytes = new Uint8Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          bytes[i] = byteCharacters.charCodeAt(i)
        }
        arrayBuffer = bytes.buffer
      } else {
        const res = await fetch(resolvedSrc || audioSrc)
        arrayBuffer = await res.arrayBuffer()
      }

      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer)
      setTotalDuration(Math.max(1, Math.round(decodedBuffer.duration)))

      const source = ctx.createBufferSource()
      source.buffer = decodedBuffer
      source.playbackRate.value = speed
      source.connect(ctx.destination)
      source.onended = handleAudioEnded
      source.start(0)
      webAudioSourceRef.current = source
      setIsPlaying(true)
      setHasError(false)
      return true
    } catch {
      return false
    }
  }

  const togglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const audio = audioRef.current

    if (isPlaying) {
      audio?.pause()
      if (webAudioSourceRef.current) {
        try {
          webAudioSourceRef.current.stop()
        } catch {}
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
      } catch {
        const ok = await playViaWebAudio()
        if (!ok) {
          setIsPlaying(false)
          setHasError(true)
        }
      }
    } else {
      const ok = await playViaWebAudio()
      if (!ok) setHasError(true)
    }
  }

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation()
    const nextSpeed: 1 | 1.5 | 2 = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1
    setSpeed(nextSpeed)
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed
    }
  }

  const seekAtClientX = (clientX: number, commitToAudio: boolean) => {
    const track = trackRef.current
    const audio = audioRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    if (rect.width <= 0) return
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const dur =
      audio && Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : totalDuration || 1
    const nextTime = ratio * dur
    setCurrentTime(nextTime)
    setProgress(ratio * 100)
    if (commitToAudio && audio && dur > 0) {
      try {
        audio.currentTime = nextTime
      } catch {}
    }
  }

  const handlePointerDownTrack = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    isScrubbingRef.current = true
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
    seekAtClientX(e.clientX, true)
  }

  const handlePointerMoveTrack = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return
    e.stopPropagation()
    seekAtClientX(e.clientX, false)
  }

  const handlePointerUpTrack = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return
    e.stopPropagation()
    isScrubbingRef.current = false
    seekAtClientX(e.clientX, true)
  }

  const formatClock = (secs: number) => {
    if (!Number.isFinite(secs) || secs < 0) return "0:00"
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const displayTime =
    isPlaying || currentTime > 0
      ? formatClock(currentTime)
      : formatClock(totalDuration || duration || 0)

  const iconFillHex = isMe ? "#2F80ED" : "#FFFFFF"

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={bubbleColor ? { backgroundColor: bubbleColor } : undefined}
      className={cn(
        "group relative flex items-center gap-3 px-3 py-2.5 rounded-[22px] w-[248px] sm:w-[276px] max-w-full select-none transition-all",
        isMe
          ? "bg-gradient-to-br from-[#2F80ED] via-[#2573DF] to-[#1B64CE] text-white shadow-[0_6px_18px_rgba(47,128,237,0.26)]"
          : "bg-[#F2F5FA] dark:bg-[#1E222D] text-zinc-900 dark:text-zinc-100 border border-black/[0.05] dark:border-white/[0.08] shadow-xs",
        className
      )}
    >
      {resolvedSrc ? (
        <audio
          ref={audioRef}
          src={resolvedSrc}
          preload="metadata"
          playsInline
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={() => {
            if (!audioRef.current || isScrubbingRef.current) return
            const cur = audioRef.current.currentTime || 0
            const dur =
              Number.isFinite(audioRef.current.duration) &&
              audioRef.current.duration > 0
                ? audioRef.current.duration
                : totalDuration || 1
            setCurrentTime(cur)
            setProgress(Math.min(100, Math.max(0, (cur / dur) * 100)))
          }}
          onEnded={handleAudioEnded}
          onError={() => {
            setHasError(true)
            setIsPlaying(false)
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      ) : null}

      {/* Tactile Play / Pause Disc with Explicit SVG Hex Fill */}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
        className={cn(
          "relative w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform duration-150 active:scale-90 cursor-pointer",
          isMe
            ? "bg-white shadow-[0_3px_10px_rgba(0,0,0,0.16)]"
            : "bg-[#2F80ED] shadow-[0_4px_12px_rgba(47,128,237,0.32)]"
        )}
      >
        {isPlaying && (
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-0 rounded-full animate-ping opacity-25 pointer-events-none",
              isMe ? "bg-white" : "bg-[#2F80ED]"
            )}
          />
        )}
        {isPlaying ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="6" y="5" width="4.2" height="14" rx="1.6" fill={iconFillHex} />
            <rect x="13.8" y="5" width="4.2" height="14" rx="1.6" fill={iconFillHex} />
          </svg>
        ) : (
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            className="translate-x-[1px]"
            aria-hidden="true"
          >
            <path
              d="M7.5 5.4C7.5 4.5 8.5 3.95 9.28 4.42L19.1 10.32C19.85 10.77 19.85 11.86 19.1 12.31L9.28 18.21C8.5 18.68 7.5 18.13 7.5 17.23V5.4Z"
              fill={iconFillHex}
            />
          </svg>
        )}
      </button>

      {/* Center Interactive Waveform + Time Row */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div
          ref={trackRef}
          onPointerDown={handlePointerDownTrack}
          onPointerMove={handlePointerMoveTrack}
          onPointerUp={handlePointerUpTrack}
          onPointerCancel={handlePointerUpTrack}
          className="relative h-8 flex items-center gap-[2.5px] cursor-pointer touch-none"
        >
          {ORGANIC_WAVE_HEIGHTS.map((baseH, idx) => {
            const barPct = ((idx + 0.5) / ORGANIC_WAVE_HEIGHTS.length) * 100
            const played = progress > 0 && barPct <= progress
            const dynamicScale = isPlaying
              ? 0.78 + 0.34 * Math.abs(Math.sin((animTick * 0.45) + idx * 0.55))
              : 1

            return (
              <span
                key={idx}
                style={{
                  height: `${baseH}px`,
                  transform: `scaleY(${dynamicScale.toFixed(2)})`,
                  backgroundColor: isMe
                    ? played
                      ? "#FFFFFF"
                      : "rgba(255,255,255,0.38)"
                    : played
                    ? "#2F80ED"
                    : "rgba(148,163,184,0.48)",
                }}
                className="flex-1 min-w-[2.5px] max-w-[3.5px] rounded-full transition-transform duration-100 will-change-transform"
              />
            )
          })}
        </div>

        <div className="flex items-center justify-between gap-2 px-0.5">
          <span
            style={{ color: isMe ? "rgba(255,255,255,0.88)" : undefined }}
            className={cn(
              "text-[11px] font-semibold font-mono tabular-nums leading-none",
              !isMe && "text-zinc-500 dark:text-zinc-400"
            )}
          >
            {displayTime}
          </span>

          {hasError ? (
            <span className="text-[10px] text-amber-300 font-medium inline-flex items-center gap-0.5">
              <AlertCircle className="w-2.5 h-2.5" /> Tap retry
            </span>
          ) : (
            <button
              type="button"
              onClick={cycleSpeed}
              style={{ color: isMe ? "#FFFFFF" : undefined }}
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold font-mono tabular-nums leading-none transition active:scale-95 cursor-pointer",
                isMe
                  ? "bg-white/18 hover:bg-white/25"
                  : "bg-zinc-200/80 dark:bg-white/10 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300/80"
              )}
            >
              {speed}x
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
