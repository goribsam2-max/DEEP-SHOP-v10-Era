import {
  isLikelyVideoMediaUrl,
  toPlayableAudioUrl,
  toPlayableMediaUrl,
  toProxiedMediaStreamUrl,
} from "./videoEmbed";

export interface ResilientAudioCallbacks {
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: () => void;
  onDurationChange?: (durationSec: number) => void;
}

export interface ResilientAudioOptions extends ResilientAudioCallbacks {
  loop?: boolean;
  volume?: number;
  muted?: boolean;
}

/**
 * Plays admin-uploaded audio (MP3/M4A/AAC/OGG/WAV/Drive/Dropbox/Pixabay) AND
 * video-extracted auto audio (.mp4/.mov/.webm) reliably across mobile & desktop browsers.
 *
 * Strategy:
 * 1) Normalize source URL (Drive, Dropbox, GitHub, Pixabay).
 * 2) Try <audio> directly -> failover to /api/stream-media?url=... proxy.
 * 3) If source is a video file (.mp4/.mov/.webm) or <audio> fails to decode,
 *    transparently spin up a hidden offscreen <video playsInline> element (direct -> proxied)
 *    which natively extracts and plays the audio track even on Safari/iOS/WebViews.
 */
export class ResilientAudioPlayer {
  private callbacks: ResilientAudioCallbacks;
  private loop: boolean;
  private volume: number;
  private muted: boolean;
  private currentRawUrl = "";
  private activeEl: HTMLMediaElement | null = null;
  private isHiddenVideoEl = false;
  private sessionSeq = 0;
  private candidateTimer: number | null = null;

  constructor(options: ResilientAudioOptions = {}) {
    this.callbacks = {
      onPlay: options.onPlay,
      onPause: options.onPause,
      onEnded: options.onEnded,
      onError: options.onError,
      onDurationChange: options.onDurationChange,
    };
    this.loop = Boolean(options.loop);
    this.volume =
      typeof options.volume === "number"
        ? Math.max(0, Math.min(1, options.volume))
        : 0.9;
    this.muted = Boolean(options.muted);
  }

  public updateCallbacks(callbacks: ResilientAudioCallbacks) {
    this.callbacks = callbacks;
  }

  public getCurrentUrl(): string {
    return this.currentRawUrl;
  }

  public isPlaying(): boolean {
    return Boolean(this.activeEl && !this.activeEl.paused);
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.activeEl) {
      this.activeEl.muted = muted;
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.activeEl) {
      this.activeEl.volume = this.volume;
    }
  }

  public setLoop(loop: boolean) {
    this.loop = loop;
    if (this.activeEl) {
      this.activeEl.loop = loop;
    }
  }

  private clearCandidateTimer() {
    if (this.candidateTimer !== null && typeof window !== "undefined") {
      window.clearTimeout(this.candidateTimer);
      this.candidateTimer = null;
    }
  }

  private cleanupElement() {
    this.clearCandidateTimer();
    const el = this.activeEl;
    if (!el) return;
    try {
      el.onplay = null;
      el.onpause = null;
      el.onended = null;
      el.onerror = null;
      el.onloadedmetadata = null;
      el.oncanplay = null;
      el.onplaying = null;
      el.pause();
      el.removeAttribute("src");
      el.load();
      if (this.isHiddenVideoEl && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    } catch {}
    this.activeEl = null;
    this.isHiddenVideoEl = false;
  }

  public pause() {
    this.sessionSeq += 1;
    this.clearCandidateTimer();
    if (this.activeEl) {
      try {
        this.activeEl.pause();
      } catch {}
    }
    this.callbacks.onPause?.();
  }

  public stop() {
    this.sessionSeq += 1;
    this.currentRawUrl = "";
    this.cleanupElement();
  }

  private buildCandidates(
    rawUrl: string,
    preferVideoElement?: boolean
  ): Array<{ kind: "audio" | "video"; src: string }> {
    const trimmed = rawUrl.trim();
    if (!trimmed) return [];

    const playableAudio = toPlayableAudioUrl(trimmed);
    const playableMedia = toPlayableMediaUrl(trimmed);
    const proxied = toProxiedMediaStreamUrl(trimmed);

    const videoLikely =
      Boolean(preferVideoElement) ||
      isLikelyVideoMediaUrl(trimmed) ||
      isLikelyVideoMediaUrl(playableMedia);

    const list: Array<{ kind: "audio" | "video"; src: string }> = [];
    const pushUnique = (kind: "audio" | "video", src: string) => {
      const clean = (src || "").trim();
      if (!clean) return;
      if (list.some((x) => x.kind === kind && x.src === clean)) return;
      list.push({ kind, src: clean });
    };

    if (videoLikely) {
      // On many browsers <audio> works fast on .mp4, but on iOS/some WebViews only <video> decodes it.
      pushUnique("video", playableMedia);
      pushUnique("audio", playableAudio);
      pushUnique("video", proxied);
      pushUnique("audio", proxied);
    } else {
      pushUnique("audio", playableAudio);
      pushUnique("audio", proxied);
      pushUnique("video", playableMedia);
      pushUnique("video", proxied);
    }

    return list;
  }

  public async play(
    rawUrl: string,
    opts?: { preferVideoElement?: boolean; muted?: boolean }
  ): Promise<boolean> {
    if (typeof window === "undefined") return false;
    const trimmed = (rawUrl || "").trim();
    if (!trimmed) {
      this.stop();
      return false;
    }

    if (typeof opts?.muted === "boolean") {
      this.muted = opts.muted;
    }

    this.sessionSeq += 1;
    const mySeq = this.sessionSeq;
    this.currentRawUrl = trimmed;
    this.cleanupElement();

    const candidates = this.buildCandidates(trimmed, opts?.preferVideoElement);
    if (candidates.length === 0) {
      this.callbacks.onError?.();
      return false;
    }

    const tryCandidate = (idx: number): Promise<boolean> => {
      if (mySeq !== this.sessionSeq) return Promise.resolve(false);
      const cand = candidates[idx];
      if (!cand) {
        this.callbacks.onError?.();
        return Promise.resolve(false);
      }

      return new Promise<boolean>((resolve) => {
        if (mySeq !== this.sessionSeq) {
          resolve(false);
          return;
        }
        this.cleanupElement();

        let el: HTMLMediaElement;
        if (cand.kind === "video") {
          const v = document.createElement("video");
          v.playsInline = true;
          v.setAttribute("playsinline", "");
          v.setAttribute("webkit-playsinline", "");
          v.className = "fixed w-0 h-0 opacity-0 pointer-events-none -z-10";
          v.setAttribute("aria-hidden", "true");
          if (document.body) {
            document.body.appendChild(v);
            this.isHiddenVideoEl = true;
          }
          el = v;
        } else {
          el = new Audio();
          this.isHiddenVideoEl = false;
        }

        el.preload = "auto";
        el.loop = this.loop;
        el.volume = this.volume;
        el.muted = this.muted;
        el.src = cand.src;
        this.activeEl = el;

        let settled = false;
        const failover = () => {
          this.clearCandidateTimer();
          if (settled || mySeq !== this.sessionSeq) return;
          settled = true;
          tryCandidate(idx + 1).then(resolve);
        };

        // If a CDN silently stalls without firing onerror, fail over automatically
        this.candidateTimer = window.setTimeout(() => {
          if (mySeq !== this.sessionSeq || settled) return;
          if (el.readyState < 2 && idx + 1 < candidates.length) {
            failover();
          }
        }, 2200);

        el.onloadedmetadata = () => {
          if (mySeq !== this.sessionSeq) return;
          if (Number.isFinite(el.duration) && el.duration > 0) {
            this.callbacks.onDurationChange?.(el.duration);
          }
        };

        el.oncanplay = () => {
          if (mySeq !== this.sessionSeq) return;
          this.clearCandidateTimer();
        };

        el.onplaying = () => {
          if (mySeq !== this.sessionSeq) return;
          this.clearCandidateTimer();
          this.callbacks.onPlay?.();
        };

        el.onplay = () => {
          if (mySeq !== this.sessionSeq) return;
          this.callbacks.onPlay?.();
        };

        el.onpause = () => {
          if (mySeq !== this.sessionSeq) return;
          if (!el.ended) {
            this.callbacks.onPause?.();
          }
        };

        el.onended = () => {
          if (mySeq !== this.sessionSeq) return;
          this.callbacks.onEnded?.();
        };

        el.onerror = () => {
          failover();
        };

        const playPromise = el.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              this.clearCandidateTimer();
              if (settled || mySeq !== this.sessionSeq) {
                try {
                  el.pause();
                } catch {}
                resolve(false);
                return;
              }
              settled = true;
              this.callbacks.onPlay?.();
              resolve(true);
            })
            .catch((err) => {
              this.clearCandidateTimer();
              // If autoplay blocked by policy (NotAllowedError), don't cycle endlessly unless src failed
              const name = String(err?.name || "");
              if (name === "NotAllowedError") {
                if (settled || mySeq !== this.sessionSeq) {
                  resolve(false);
                  return;
                }
                settled = true;
                this.callbacks.onPause?.();
                resolve(false);
                return;
              }
              failover();
            });
        } else {
          this.clearCandidateTimer();
          settled = true;
          this.callbacks.onPlay?.();
          resolve(true);
        }
      });
    };

    return tryCandidate(0);
  }
}

export function createResilientAudioPlayer(
  options?: ResilientAudioOptions
): ResilientAudioPlayer {
  return new ResilientAudioPlayer(options);
}
