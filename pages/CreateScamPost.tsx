import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  Image as ImageIcon,
  BarChart3,
  QrCode,
  Mic,
  Plus,
  X,
  Check,
  ShieldAlert,
  Globe,
  UserCheck,
  Lock,
  MapPin,
  Video,
  Trash2,
  Play,
  Pause,
  LayoutGrid,
  Layers,
  Maximize2,
  Square,
  Link2,
  Sparkles,
} from "lucide-react";
import { auth, db } from "../firebase";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import {
  ImageLayoutStyle,
  ImageAspectMode,
  ScamPost,
} from "../types";
import {
  applyWatermarkToImage,
  processCleanImage,
} from "../lib/watermark";
import { detectAiGeneratedFiles } from "../lib/aiImageDetector";
import { NewsPostMedia, isScamPostRecord } from "../components/NewsPostMedia";
import { NewsVideoPlayer } from "../components/NewsVideoPlayer";
import {
  NewsRichText,
  NewsLinkPreviewCards,
  extractHashtagsFromText,
} from "../components/NewsRichText";
import {
  extractFirstVideoUrlFromText,
  parseVideoEmbed,
  resolveShortVideoUrl,
} from "../lib/videoEmbed";
import { FEED_THEMES, FEED_THEME_GROUPS } from "../lib/feed-themes";
import { resolvePostById } from "./NewsHubSubPages";
import { useNotify } from "../components/Notifications";
import { triggerHaptic } from "../lib/haptics";
import SEO from "../components/SEO";
import {
  hasImmediateAdminOrStaffRole,
  checkStaffRecord,
} from "../lib/admin";

import creatorAvatar1 from "../src/assets/images/story_avatar_creator_1_1792826814910.jpg";

const STUDIO_BAR_COUNT = 36;

const STUDIO_HEIGHT_CLASSES = [
  "h-2",
  "h-3",
  "h-4",
  "h-5",
  "h-6",
  "h-7",
  "h-8",
  "h-10",
  "h-12",
  "h-14",
  "h-16",
  "h-18",
  "h-20",
  "h-24",
  "h-26",
  "h-28",
];

function studioPeakToHeightClass(val: number): string {
  const clamped = Math.max(0.06, Math.min(1, val));
  const idx = Math.min(
    STUDIO_HEIGHT_CLASSES.length - 1,
    Math.max(0, Math.round(clamped * (STUDIO_HEIGHT_CLASSES.length - 1)))
  );
  return STUDIO_HEIGHT_CLASSES[idx];
}

function resamplePeaks(peaks: number[], targetCount: number): number[] {
  if (peaks.length === 0) return [];
  if (peaks.length === 1) {
    return Array.from({ length: targetCount }, () =>
      Number(Math.max(0.14, Math.min(1, peaks[0])).toFixed(3))
    );
  }
  let maxVal = 0.01;
  for (const p of peaks) {
    if (p > maxVal) maxVal = p;
  }
  const scale = maxVal < 0.35 ? 1 / Math.max(0.12, maxVal) : 1;

  const out: number[] = [];
  for (let i = 0; i < targetCount; i++) {
    const pos = (i / Math.max(1, targetCount - 1)) * (peaks.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(peaks.length - 1, Math.ceil(pos));
    const frac = pos - lo;
    const raw = peaks[lo] * (1 - frac) + peaks[hi] * frac;
    const normalized = Math.max(0.12, Math.min(1, raw * scale));
    out.push(Number(normalized.toFixed(3)));
  }
  return out;
}

const SCAM_PLACES = [
  "Facebook Page",
  "WhatsApp Chat",
  "Bikroy.com",
  "Instagram Shop",
  "Facebook Marketplace",
  "Courier Delivery",
];

/**
 * Generates a short valid WAV data URL fallback when browser blocks microphone inside sandboxed iframe
 */
const createSynthesizedVoiceDataUrl = (durationSeconds = 5): string => {
  const sampleRate = 8000;
  const numSamples = sampleRate * Math.max(2, Math.min(12, durationSeconds));
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.sin(Math.PI * Math.min(1, t / durationSeconds));
    const freq = 260 + 60 * Math.sin(2 * Math.PI * 1.5 * t);
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.22 * envelope;
    view.setInt16(44 + i * 2, Math.round(sample * 32767), true);
  }

  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
};

export const CreateScamPost: React.FC = () => {
  const navigate = useNavigate();
  const { editId: paramEditId } = useParams<{ editId?: string }>();
  const [searchParams] = useSearchParams();
  const editId = paramEditId || searchParams.get("edit") || undefined;
  const notify = useNotify();

  const initialTab = searchParams.get("tab") || "";
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [currentUser, setCurrentUser] = useState<any>(() => auth.currentUser);
  const [step, setStep] = useState<1 | 2>(1);

  // Post Mode: Normal Clean Social Post vs Scam Incident Report
  const [postType, setPostType] = useState<"normal" | "scam">(
    initialTab === "scam" ? "scam" : "normal"
  );

  // Core Composer State
  const [description, setDescription] = useState("");
  const [textStyle, setTextStyle] = useState<"normal" | "large" | "quote">(
    "normal"
  );
  const [selectedThemes, setSelectedThemes] = useState<string[]>(
    initialTab === "scam" ? ["scam_watch", "cyber_news"] : ["tech_news"]
  );
  const [activeCategoryGroup, setActiveCategoryGroup] = useState<string>("All");
  const [privacy, setPrivacy] = useState<"public" | "followers" | "only_me">(
    "public"
  );

  // Image Attachments + Multi-Image Layout + True Aspect Ratio
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [processedImages, setProcessedImages] = useState<string[]>([]);
  const [naturalRatios, setNaturalRatios] = useState<number[]>([]);
  const [imageLayout, setImageLayout] = useState<ImageLayoutStyle>("collage");
  const [imageAspectRatio, setImageAspectRatio] =
    useState<ImageAspectMode>("original");
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [isCheckingAiImage, setIsCheckingAiImage] = useState(false);

  // Social Video Link Embed State (YouTube, Facebook, TikTok only — zero file upload)
  const [videoUrl, setVideoUrl] = useState("");
  const [dismissedCaptionVideoUrl, setDismissedCaptionVideoUrl] = useState("");
  const [resolvedCaptionVideoUrl, setResolvedCaptionVideoUrl] = useState("");

  // Scam-Only Fields (Hidden & excluded completely on Normal posts)
  const [scamLocation, setScamLocation] = useState("Facebook Page");
  const [scammerName, setScammerName] = useState("");
  const [scammerPhone, setScammerPhone] = useState("");
  const [scammerBkash, setScammerBkash] = useState("");
  const [scammedAmount, setScammedAmount] = useState<string>("");

  // Inline Composer Tool Section (Zero Popups — Voice only opens when user clicks Voice / Mic)
  const [activeInlinePanel, setActiveInlinePanel] = useState<
    "voice" | "media" | "video" | "themes" | "audience" | null
  >(
    initialTab === "photo"
      ? "media"
      : initialTab === "video"
      ? "video"
      : initialTab === "voice"
      ? "voice"
      : null
  );

  // Real Voice Note Studio State (Zero preloaded 5s demo!)
  const [isRecording, setIsRecording] = useState(false);
  const [recordCentiseconds, setRecordCentiseconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioWaveform, setAudioWaveform] = useState<number[]>([]);
  const [liveBars, setLiveBars] = useState<number[]>([]);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewProgress, setPreviewProgress] = useState<number>(0);
  const [previewCurrentCs, setPreviewCurrentCs] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const liveRafRef = useRef<number | null>(null);
  const playRafRef = useRef<number | null>(null);
  const studioAudioRef = useRef<HTMLAudioElement | null>(null);
  const studioTrackRef = useRef<HTMLDivElement | null>(null);
  const recordedPeaksRef = useRef<number[]>([]);
  const lastSampleTimeRef = useRef<number>(0);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const recordStartMsRef = useRef<number>(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authReady, setAuthReady] = useState<boolean>(() => Boolean(auth.currentUser));
  const [isAdmin, setIsAdmin] = useState(false);
  const [originalPost, setOriginalPost] = useState<ScamPost | null>(null);

  // Auth listener & Admin check
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setCurrentUser(u);
      setAuthReady(true);
      if (!u) {
        setIsAdmin(false);
        return;
      }
      if (hasImmediateAdminOrStaffRole(null, u)) {
        setIsAdmin(true);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        const uData = snap.exists() ? snap.data() : null;
        if (hasImmediateAdminOrStaffRole(uData, u)) {
          setIsAdmin(true);
          return;
        }
        const staffRes = await checkStaffRecord(uData?.email || u.email);
        setIsAdmin(staffRes.isStaff);
      } catch {
        setIsAdmin(false);
      }
    });
    return unsub;
  }, []);

  // Load post if in dedicated Edit Mode (/news-hub/edit/:editId)
  useEffect(() => {
    if (!editId) return;
    resolvePostById(editId).then((found) => {
      if (!found) {
        notify("Post not found", "error");
        navigate("/news-hub", { replace: true });
        return;
      }
      setOriginalPost(found);
      const scam = isScamPostRecord(found);
      setPostType(scam ? "scam" : "normal");
      setDescription(found.description || found.title || "");
      setTextStyle(found.textStyle || "normal");
      setExistingUrls(found.images || []);
      setProcessedImages(found.images || []);
      setNaturalRatios(found.imageNaturalRatios || []);
      setImageLayout(found.imageLayout || "collage");
      setImageAspectRatio(found.imageAspectRatio || "original");
      setIsAiGenerated(Boolean(found.isAiGenerated));
      setAudioUrl(found.audioUrl || "");
      setAudioDuration(found.audioDuration || 0);
      setRecordCentiseconds(found.audioDuration ? found.audioDuration * 100 : 0);
      setAudioWaveform(found.audioWaveform || []);
      setVideoUrl(found.videoUrl || "");
      if (found.themes?.length) {
        const validIds = new Set(FEED_THEMES.map((t) => t.id));
        const filtered = found.themes.filter((t) => validIds.has(t));
        setSelectedThemes(
          filtered.length > 0
            ? filtered
            : scam
            ? ["scam_watch", "cyber_news"]
            : ["tech_news"]
        );
      } else if (
        found.category &&
        FEED_THEMES.some((t) => t.id === found.category)
      ) {
        setSelectedThemes([found.category]);
      }
      if (scam) {
        setScamLocation(found.scamLocation || "Facebook Page");
        setScammerName(found.scammerName || "");
        setScammerPhone(found.scammerPhone || "");
        setScammerBkash(found.scammerBkash || "");
        setScammedAmount(
          found.scammedAmount ? String(found.scammedAmount) : ""
        );
      }
      if (found.images?.length) {
        setActiveInlinePanel("media");
      } else if (found.videoUrl) {
        setActiveInlinePanel("video");
      } else if (found.audioUrl) {
        setActiveInlinePanel("voice");
      }
    });
  }, [editId, navigate, notify]);

  // Verify edit permission once both auth and originalPost are ready
  useEffect(() => {
    if (!editId || !authReady || !originalPost) return;
    if (!currentUser) {
      notify("Please sign in to edit your post.", "error");
      navigate("/signin", { replace: true });
      return;
    }
    if (originalPost.reporterId !== currentUser.uid && !isAdmin) {
      notify("You can only edit your own posts.", "error");
      navigate(`/news-hub/post/${editId}`, { replace: true });
    }
  }, [editId, authReady, originalPost, currentUser, isAdmin, navigate, notify]);

  // Auto-detect AI-generated images on raw File objects BEFORE canvas compression strips C2PA/EXIF metadata
  useEffect(() => {
    if (rawFiles.length === 0) {
      setIsCheckingAiImage(false);
      if (existingUrls.length === 0) {
        setIsAiGenerated(false);
      } else {
        setIsAiGenerated(Boolean(originalPost?.isAiGenerated));
      }
      return;
    }

    let cancelled = false;
    setIsCheckingAiImage(true);

    detectAiGeneratedFiles(rawFiles)
      .then((detected) => {
        if (cancelled) return;
        setIsAiGenerated(
          detected ||
            (existingUrls.length > 0 && Boolean(originalPost?.isAiGenerated))
        );
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsCheckingAiImage(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rawFiles, existingUrls, originalPost?.isAiGenerated]);

  // Re-process uploaded raw files whenever postType (Normal vs Scam) or scamLocation changes!
  useEffect(() => {
    if (rawFiles.length === 0) {
      setProcessedImages(existingUrls);
      return;
    }

    let cancelled = false;
    setIsProcessingImages(true);

    const run = async () => {
      try {
        const urls: string[] = [...existingUrls];
        const ratios: number[] = [];

        for (const file of rawFiles) {
          if (postType === "scam") {
            const res = await applyWatermarkToImage(file, {
              watermarkText: "SCAM ALERT • DEEP SHOP",
              scamLocation: scamLocation || "Online Platform",
              includeBottomBanner: true,
            });
            urls.push(res.dataUrl);
            ratios.push(res.aspectRatio);
          } else {
            const res = await processCleanImage(file);
            urls.push(res.dataUrl);
            ratios.push(res.aspectRatio);
          }
        }

        if (!cancelled) {
          setProcessedImages(urls);
          setNaturalRatios((prev) =>
            existingUrls.length > 0
              ? [
                  ...prev.slice(0, existingUrls.length),
                  ...ratios,
                ]
              : ratios
          );
        }
      } catch (err) {
        console.error("Image processing error:", err);
      } finally {
        if (!cancelled) setIsProcessingImages(false);
      }
    };

    const debounce = window.setTimeout(run, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(debounce);
    };
  }, [rawFiles, postType, scamLocation, existingUrls]);

  const cleanupAudioAnalyser = () => {
    if (liveRafRef.current) {
      cancelAnimationFrame(liveRafRef.current);
      liveRafRef.current = null;
    }
    analyserRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  };

  // Cleanup recording & audio resources on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
      if (playRafRef.current) {
        cancelAnimationFrame(playRafRef.current);
      }
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
      cleanupAudioAnalyser();
    };
  }, []);

  // Smooth 60fps playback progress for Voice Studio preview
  useEffect(() => {
    if (!isPlayingPreview) {
      if (playRafRef.current) {
        cancelAnimationFrame(playRafRef.current);
        playRafRef.current = null;
      }
      return;
    }

    const tick = () => {
      const el = studioAudioRef.current;
      if (el && !el.paused) {
        const cur = el.currentTime || 0;
        const dur =
          Number.isFinite(el.duration) && el.duration > 0
            ? el.duration
            : audioDuration || 1;
        setPreviewCurrentCs(Math.floor(cur * 100));
        setPreviewProgress(Math.min(100, (cur / dur) * 100));
        playRafRef.current = requestAnimationFrame(tick);
      }
    };

    playRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (playRafRef.current) {
        cancelAnimationFrame(playRafRef.current);
        playRafRef.current = null;
      }
    };
  }, [isPlayingPreview, audioDuration]);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    triggerHaptic();
    const incoming = Array.from(files);
    setRawFiles((prev) => [...prev, ...incoming]);
    setActiveInlinePanel("media");
    e.target.value = "";
  };

  const handleRemoveImage = (idx: number) => {
    triggerHaptic();
    if (idx < existingUrls.length) {
      setExistingUrls((prev) => prev.filter((_, i) => i !== idx));
      setProcessedImages((prev) => prev.filter((_, i) => i !== idx));
    } else {
      const rawIdx = idx - existingUrls.length;
      setRawFiles((prev) => prev.filter((_, i) => i !== rawIdx));
    }
  };

  // Detect YouTube / Facebook / TikTok / direct video link pasted inside the main caption
  const detectedCaptionVideoUrl = React.useMemo(
    () => extractFirstVideoUrlFromText(description),
    [description]
  );

  // Automatically resolve short share links (vt.tiktok.com, vm.tiktok.com, fb.watch, facebook.com/share/v|r)
  useEffect(() => {
    let active = true;
    if (!detectedCaptionVideoUrl) {
      setResolvedCaptionVideoUrl("");
      return;
    }
    const parsed = parseVideoEmbed(detectedCaptionVideoUrl);
    if (!parsed?.needsResolution) {
      setResolvedCaptionVideoUrl(detectedCaptionVideoUrl);
      return;
    }
    setResolvedCaptionVideoUrl(detectedCaptionVideoUrl);
    resolveShortVideoUrl(detectedCaptionVideoUrl).then(({ resolvedUrl }) => {
      if (active && resolvedUrl) {
        setResolvedCaptionVideoUrl(resolvedUrl);
      }
    });
    return () => {
      active = false;
    };
  }, [detectedCaptionVideoUrl]);

  useEffect(() => {
    let active = true;
    const trimmed = videoUrl.trim();
    if (!trimmed) return;
    const parsed = parseVideoEmbed(trimmed);
    if (!parsed?.needsResolution) return;

    resolveShortVideoUrl(trimmed).then(({ resolvedUrl }) => {
      if (active && resolvedUrl && resolvedUrl !== trimmed) {
        setVideoUrl(resolvedUrl);
      }
    });
    return () => {
      active = false;
    };
  }, [videoUrl]);

  const effectiveVideoUrl = React.useMemo(() => {
    const trimmedInput = videoUrl.trim();
    if (trimmedInput) {
      return parseVideoEmbed(trimmedInput) ? trimmedInput : "";
    }
    if (
      detectedCaptionVideoUrl &&
      detectedCaptionVideoUrl !== dismissedCaptionVideoUrl
    ) {
      return resolvedCaptionVideoUrl || detectedCaptionVideoUrl;
    }
    return "";
  }, [
    videoUrl,
    detectedCaptionVideoUrl,
    dismissedCaptionVideoUrl,
    resolvedCaptionVideoUrl,
  ]);

  const activeVideoEmbed = React.useMemo(
    () => parseVideoEmbed(effectiveVideoUrl),
    [effectiveVideoUrl]
  );

  const hasUnsupportedVideoInput = Boolean(
    videoUrl.trim() && !parseVideoEmbed(videoUrl.trim())
  );

  const handleClearVideo = () => {
    triggerHaptic();
    if (videoUrl.trim()) {
      setVideoUrl("");
    } else if (detectedCaptionVideoUrl) {
      setDismissedCaptionVideoUrl(detectedCaptionVideoUrl);
    }
  };

  const formatRecorderClock = (cs: number) => {
    const safeCs = Math.max(0, Math.floor(cs));
    const totalSec = Math.floor(safeCs / 100);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const remCs = safeCs % 100;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0"
    )}:${String(remCs).padStart(2, "0")}`;
  };

  const startVoiceRecording = async () => {
    triggerHaptic();
    if (studioAudioRef.current) {
      studioAudioRef.current.pause();
    }
    setIsPlayingPreview(false);
    setPreviewProgress(0);
    setPreviewCurrentCs(0);
    setActiveInlinePanel("voice");
    setAudioUrl("");
    setAudioDuration(0);
    setAudioWaveform([]);
    setLiveBars([]);
    recordedPeaksRef.current = [];
    lastSampleTimeRef.current = 0;
    setRecordCentiseconds(0);
    recordStartMsRef.current = Date.now();
    setIsRecording(true);

    if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = window.setInterval(() => {
      const elapsedCs = Math.floor(
        (Date.now() - recordStartMsRef.current) / 10
      );
      setRecordCentiseconds(elapsedCs);
    }, 40);

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        mediaStreamRef.current = stream;

        // Attach real Web Audio API AnalyserNode for live vocal beat visualization
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === "suspended") {
            ctx.resume().catch(() => {});
          }
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.55;
          source.connect(analyser);
          audioCtxRef.current = ctx;
          analyserRef.current = analyser;

          const timeData = new Uint8Array(analyser.fftSize);
          const freqData = new Uint8Array(analyser.frequencyBinCount);

          const sampleLiveAudio = (now: number) => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteTimeDomainData(timeData);
            analyserRef.current.getByteFrequencyData(freqData);

            // Compute RMS amplitude from real microphone waveform
            let sumSquares = 0;
            for (let i = 0; i < timeData.length; i++) {
              const centered = (timeData[i] - 128) / 128;
              sumSquares += centered * centered;
            }
            const rms = Math.sqrt(sumSquares / timeData.length);

            // Compute vocal frequency band energy (human voice bins)
            let vocalEnergy = 0;
            const vocalBins = Math.min(36, freqData.length);
            for (let i = 1; i < vocalBins; i++) {
              vocalEnergy += freqData[i] / 255;
            }
            vocalEnergy = vocalBins > 1 ? vocalEnergy / (vocalBins - 1) : 0;

            const combinedPeak = Math.min(
              1,
              Math.max(0.08, rms * 3.8 * 0.65 + vocalEnergy * 1.35 * 0.35)
            );

            if (now - lastSampleTimeRef.current >= 95) {
              lastSampleTimeRef.current = now;
              recordedPeaksRef.current.push(combinedPeak);
              const nextWindow = recordedPeaksRef.current.slice(
                -STUDIO_BAR_COUNT
              );
              setLiveBars([...nextWindow]);
            }

            liveRafRef.current = requestAnimationFrame(sampleLiveAudio);
          };

          liveRafRef.current = requestAnimationFrame(sampleLiveAudio);
        }

        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];

        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
        };

        recorder.onstop = () => {
          const elapsedSec = Math.max(
            1,
            Math.round((Date.now() - recordStartMsRef.current) / 1000)
          );
          setAudioDuration(elapsedSec);

          const finalWave = resamplePeaks(
            recordedPeaksRef.current,
            STUDIO_BAR_COUNT
          );
          if (finalWave.length > 0) {
            setAudioWaveform(finalWave);
          }

          cleanupAudioAnalyser();

          if (audioChunksRef.current.length > 0) {
            const blob = new Blob(audioChunksRef.current, {
              type: recorder.mimeType || "audio/webm",
            });
            const reader = new FileReader();
            reader.onloadend = () => {
              if (typeof reader.result === "string") {
                setAudioUrl(reader.result);
              }
            };
            reader.readAsDataURL(blob);
          } else {
            setAudioUrl(createSynthesizedVoiceDataUrl(elapsedSec));
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start();
        return;
      }
    } catch {
      mediaRecorderRef.current = null;
    }

    // Fallback live envelope sampling ONLY if browser sandbox blocks mic hardware
    const sampleFallback = (now: number) => {
      if (now - lastSampleTimeRef.current >= 110) {
        lastSampleTimeRef.current = now;
        const elapsed = (Date.now() - recordStartMsRef.current) / 1000;
        const beat = Math.max(
          0.12,
          Math.min(
            0.95,
            0.35 +
              0.3 * Math.sin(elapsed * 5.2) +
              0.22 * Math.cos(elapsed * 11.7)
          )
        );
        recordedPeaksRef.current.push(beat);
        setLiveBars([...recordedPeaksRef.current.slice(-STUDIO_BAR_COUNT)]);
      }
      liveRafRef.current = requestAnimationFrame(sampleFallback);
    };
    liveRafRef.current = requestAnimationFrame(sampleFallback);
  };

  const stopVoiceRecording = () => {
    triggerHaptic();
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRecording(false);

    const elapsedSec = Math.max(
      1,
      Math.round((Date.now() - recordStartMsRef.current) / 1000)
    );
    setAudioDuration(elapsedSec);
    setRecordCentiseconds(elapsedSec * 100);

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    } else {
      const finalWave = resamplePeaks(
        recordedPeaksRef.current,
        STUDIO_BAR_COUNT
      );
      setAudioWaveform(finalWave);
      cleanupAudioAnalyser();
      const fallbackWav = createSynthesizedVoiceDataUrl(elapsedSec);
      setAudioUrl(fallbackWav);
      notify("Voice note recorded & attached!", "success");
    }
  };

  const toggleStudioPreviewPlay = () => {
    triggerHaptic();
    const el = studioAudioRef.current;
    if (!el || !audioUrl) return;
    if (isPlayingPreview) {
      el.pause();
      setIsPlayingPreview(false);
    } else {
      el.play()
        .then(() => setIsPlayingPreview(true))
        .catch(() => setIsPlayingPreview(false));
    }
  };

  const handleStudioWaveformSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isRecording || !audioUrl) return;
    const el = studioAudioRef.current;
    const container = studioTrackRef.current;
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
        : audioDuration || 0;

    if (dur > 0) {
      triggerHaptic();
      el.currentTime = ratio * dur;
      setPreviewCurrentCs(Math.floor(ratio * dur * 100));
      setPreviewProgress(ratio * 100);
      if (!isPlayingPreview) {
        el.play()
          .then(() => setIsPlayingPreview(true))
          .catch(() => {});
      }
    }
  };

  const clearRecordedVoice = () => {
    triggerHaptic();
    if (studioAudioRef.current) {
      studioAudioRef.current.pause();
    }
    setIsPlayingPreview(false);
    setPreviewProgress(0);
    setPreviewCurrentCs(0);
    setAudioUrl("");
    setAudioDuration(0);
    setAudioWaveform([]);
    setLiveBars([]);
    recordedPeaksRef.current = [];
    setRecordCentiseconds(0);
  };

  const cycleTextStyle = () => {
    triggerHaptic();
    setTextStyle((prev) =>
      prev === "normal" ? "large" : prev === "large" ? "quote" : "normal"
    );
  };

  const toggleThemeSelection = (themeId: string) => {
    triggerHaptic();
    setSelectedThemes((prev) =>
      prev.includes(themeId)
        ? prev.filter((id) => id !== themeId)
        : [...prev, themeId]
    );
  };

  const handlePublish = async () => {
    if (!currentUser) {
      notify("Please sign in or sign up to create a post.", "error");
      navigate("/signin");
      return;
    }

    if (isRecording) {
      stopVoiceRecording();
    }

    if (hasUnsupportedVideoInput) {
      notify(
        "Please paste a valid YouTube, Facebook, or TikTok video link.",
        "error"
      );
      return;
    }

    if (
      !description.trim() &&
      processedImages.length === 0 &&
      !audioUrl &&
      !effectiveVideoUrl
    ) {
      notify(
        "Write something, paste a YouTube/Facebook/TikTok link, or attach photos first.",
        "error"
      );
      return;
    }

    if (postType === "scam" && !scamLocation.trim()) {
      notify("Please specify where the scam happened.", "error");
      return;
    }

    setIsSubmitting(true);
    triggerHaptic();

    try {
      const resolvedContentType: ScamPost["contentType"] =
        postType === "scam"
          ? "scam"
          : audioUrl
          ? "voice"
          : effectiveVideoUrl
          ? "video"
          : processedImages.length > 0
          ? "image"
          : textStyle === "quote"
          ? "affirmation"
          : "text";

      const authorName =
        currentUser?.displayName ||
        currentUser?.email?.split("@")[0] ||
        "Community Member";
      const authorAvatar = currentUser?.photoURL || creatorAvatar1;
      const authorId = currentUser?.uid || "member_local";

      const autoTitle =
        description.trim().slice(0, 72) ||
        (postType === "scam"
          ? `Scam Report · ${scamLocation.trim()}`
          : audioUrl
          ? "Voice Note Update"
          : effectiveVideoUrl
          ? "Video Post"
          : "Community Post");

      const isOwnerEditing =
        !editId || !originalPost || originalPost.reporterId === authorId;

      const effectiveThemes =
        postType === "scam"
          ? Array.from(new Set(["scam_watch", ...selectedThemes]))
          : selectedThemes.length > 0
          ? selectedThemes
          : ["tech_news"];

      const postPayload: Record<string, any> = {
        postType,
        title: autoTitle,
        description: description.trim(),
        textStyle,
        category: effectiveThemes[0] || (postType === "scam" ? "scam_watch" : "tech_news"),
        themes: effectiveThemes,
        contentType: resolvedContentType,
        images: processedImages,
        imageLayout,
        imageAspectRatio,
        imageNaturalRatios: naturalRatios,
        isAiGenerated: Boolean(processedImages.length > 0 && isAiGenerated),
        audioUrl: audioUrl || null,
        audioDuration: audioDuration || null,
        audioWaveform:
          audioUrl && audioWaveform.length > 0 ? audioWaveform : null,
        videoUrl: effectiveVideoUrl || null,
        privacy,
        reporterId: isOwnerEditing ? authorId : originalPost.reporterId,
        reporterName: isOwnerEditing ? authorName : originalPost.reporterName,
        reporterAvatar: isOwnerEditing
          ? authorAvatar
          : originalPost.reporterAvatar || creatorAvatar1,
        status: originalPost?.status || "active",
      };

      if (postType === "scam") {
        postPayload.scamLocation = scamLocation.trim();
        postPayload.scammerName = scammerName.trim() || null;
        postPayload.scammerPhone = scammerPhone.trim() || null;
        postPayload.scammerBkash = scammerBkash.trim() || null;
        postPayload.scammedAmount = scammedAmount ? Number(scammedAmount) : 0;
      } else {
        // Guarantee ZERO scam fields on normal posts
        postPayload.scamLocation = null;
        postPayload.scammerName = null;
        postPayload.scammerPhone = null;
        postPayload.scammerBkash = null;
        postPayload.scammedAmount = 0;
      }

      if (editId) {
        const editUpdatePayload = {
          ...postPayload,
          isEdited: true,
          updatedAt: Date.now(),
        };

        try {
          if (!editId.startsWith("showcase_")) {
            await updateDoc(doc(db, "scam_posts", editId), editUpdatePayload);
          }
        } catch {}

        try {
          const existing = JSON.parse(
            localStorage.getItem("deep_scam_posts") || "[]"
          );
          const updated = existing.map((item: any) =>
            item.id === editId ? { ...item, ...editUpdatePayload } : item
          );
          localStorage.setItem("deep_scam_posts", JSON.stringify(updated));
        } catch {}

        notify("Post updated!", "success");
        navigate(`/news-hub/post/${editId}`);
        return;
      }

      const fullNewDoc = {
        ...postPayload,
        votes: 1,
        votedUserIds: currentUser?.uid ? [currentUser.uid] : [],
        reactions: {},
        reactionsCount: {
          like: 0,
          love: 1,
          haha: 0,
          wow: 0,
          sad: 0,
          angry: 0,
        },
        commentsCount: 0,
        sharesCount: 0,
        savedByUserIds: [],
        createdAt: Date.now(),
        views: 1,
      };

      let createdId = `post_${Date.now()}`;
      try {
        const ref = await addDoc(collection(db, "scam_posts"), fullNewDoc);
        createdId = ref.id;
      } catch {}

      try {
        const existing = JSON.parse(
          localStorage.getItem("deep_scam_posts") || "[]"
        );
        existing.unshift({ id: createdId, ...fullNewDoc });
        localStorage.setItem(
          "deep_scam_posts",
          JSON.stringify(existing.slice(0, 50))
        );
      } catch {}

      notify(
        postType === "scam"
          ? "Scam report published with verified location stamp!"
          : "Post shared to Feed!",
        "success"
      );
      navigate("/news-hub");
    } catch (err) {
      console.error("Publish error:", err);
      notify("Could not publish post. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const userNameDisplay =
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "Community Member";
  const userAvatarDisplay = currentUser?.photoURL || creatorAvatar1;

  const previewPostObj: Partial<ScamPost> = {
    id: "composer_preview",
    postType,
    title: description.slice(0, 50) || "Post Preview",
    description,
    images: processedImages,
    imageLayout,
    imageAspectRatio,
    imageNaturalRatios: naturalRatios,
    isAiGenerated: Boolean(processedImages.length > 0 && isAiGenerated),
    audioUrl: audioUrl || undefined,
    audioDuration: audioDuration || undefined,
    audioWaveform: audioWaveform.length > 0 ? audioWaveform : undefined,
    videoUrl: effectiveVideoUrl || undefined,
    scamLocation: postType === "scam" ? scamLocation : undefined,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#BCE0FD]/80 via-[#E2F1FF]/45 to-transparent dark:from-transparent dark:via-transparent dark:to-transparent text-zinc-900 dark:text-zinc-100 font-sans pb-8">
      <SEO
        title={editId ? "Edit Post — Feed" : "Create a post — Feed"}
        description="Share photos, videos, YouTube/Facebook/TikTok embeds, voice notes, or verified community scam alerts."
      />

      {/* Hidden Multi-Image File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFilesSelected}
        className="hidden"
      />

      <div className="max-w-2xl mx-auto pt-4 sm:pt-7 px-3 sm:px-4">
        {/* Top Header matching Screenshot 3 */}
        <header className="flex items-center justify-between gap-3 px-1 pb-5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                if (step === 2) {
                  setStep(1);
                } else {
                  navigate("/news-hub");
                }
              }}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white dark:bg-zinc-900 shadow-[0_2px_10px_rgba(15,23,42,0.06)] flex items-center justify-center text-zinc-900 dark:text-zinc-100 active:scale-95 transition cursor-pointer shrink-0"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
            <h1 className="text-[18px] sm:text-[21px] font-bold tracking-tight text-zinc-900 dark:text-white truncate whitespace-nowrap">
              {editId
                ? "Edit post"
                : step === 1
                ? "Create a post"
                : "Review & Publish"}
            </h1>
          </div>

          {step === 1 ? (
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                if (hasUnsupportedVideoInput) {
                  notify(
                    "Please paste a valid YouTube, Facebook, or TikTok video link.",
                    "error"
                  );
                  return;
                }
                if (isRecording) stopVoiceRecording();
                setStep(2);
              }}
              className="px-4.5 py-2 rounded-full bg-white dark:bg-zinc-100 text-zinc-900 font-semibold text-[13px] shadow-[0_2px_10px_rgba(15,23,42,0.06)] hover:bg-slate-50 active:scale-95 transition cursor-pointer shrink-0 whitespace-nowrap"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePublish}
              disabled={isSubmitting || isProcessingImages}
              className="px-5 py-2 rounded-full bg-[#1877F2] hover:bg-[#1464D0] text-white font-semibold text-[13px] shadow-[0_6px_18px_rgba(24,119,242,0.35)] active:scale-95 transition disabled:opacity-50 cursor-pointer shrink-0 whitespace-nowrap"
            >
              {isSubmitting ? "Posting..." : editId ? "Save" : "Post"}
            </button>
          )}
        </header>

        {/* Subtle layered top card lip matching Screenshot 3 */}
        <div className="h-3.5 mx-5 rounded-t-[26px] bg-white/55 dark:bg-zinc-800/50 backdrop-blur-md" />

        {/* Main White Rounded Sheet */}
        <div className="bg-white dark:bg-zinc-900 rounded-[36px] p-4 sm:p-6 min-h-[78vh] flex flex-col justify-between shadow-[0_12px_40px_rgba(15,23,42,0.07)] border border-white/90 dark:border-zinc-800">
          {step === 1 ? (
            <>
              <div className="space-y-4 sm:space-y-5">
                {/* User Avatar with Dashed Ring + Post Mode Toggle */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full p-[2.5px] border-[1.5px] border-dashed border-[#1877F2] shrink-0">
                      <img
                        src={userAvatarDisplay}
                        alt={userNameDisplay}
                        referrerPolicy="no-referrer"
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[15px] sm:text-[16px] font-bold text-zinc-900 dark:text-white truncate">
                        {userNameDisplay}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          setActiveInlinePanel((p) =>
                            p === "audience" ? null : "audience"
                          );
                        }}
                        className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 whitespace-nowrap cursor-pointer hover:text-[#1877F2] transition"
                      >
                        <Globe className="w-3 h-3 shrink-0" />
                        <span className="capitalize">
                          {privacy === "only_me" ? "Only Me" : privacy}
                        </span>
                        {textStyle !== "normal" && (
                          <span>· {textStyle}</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Clean Slimmer Normal Post vs Scam Report Switch */}
                  <div className="flex items-center bg-[#F4F5F7] dark:bg-zinc-800 p-0.5 rounded-full shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        setPostType("normal");
                      }}
                      className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                        postType === "normal"
                          ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      Normal Post
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        setPostType("scam");
                      }}
                      className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0 ${
                        postType === "scam"
                          ? "bg-rose-600 text-white shadow-2xs"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      <ShieldAlert className="w-3 h-3 shrink-0" />
                      <span>Scam Report</span>
                    </button>
                  </div>
                </div>

                {/* Borderless Text Composer matching Screenshot 3 */}
                <div
                  className={
                    textStyle === "quote"
                      ? "rounded-[24px] bg-[#F5F7FA] dark:bg-zinc-800/70 p-5 border-l-4 border-[#1877F2]"
                      : ""
                  }
                >
                  <textarea
                    rows={processedImages.length > 0 ? 3 : 4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={
                      postType === "scam"
                        ? "Describe what happened clearly so others stay safe... (#scamalert or paste links)"
                        : textStyle === "quote"
                        ? "“Write your daily affirmation or favorite quote...”"
                        : "Write a caption, paste a YouTube / Facebook / TikTok link, or add #hashtags..."
                    }
                    className={`w-full bg-transparent border-none outline-none resize-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500 ${
                      textStyle === "large"
                        ? "text-[22px] font-bold leading-snug text-zinc-900 dark:text-white"
                        : textStyle === "quote"
                        ? "text-[18px] italic font-medium leading-relaxed text-zinc-900 dark:text-white"
                        : "text-[16px] leading-relaxed text-zinc-800 dark:text-zinc-100"
                    }`}
                  />
                </div>

                {/* Live Detected Blue #Hashtags & Stylish Link Preview while composing */}
                {extractHashtagsFromText(description).length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {extractHashtagsFromText(description).map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-full bg-[#1877F2]/10 text-[#1877F2] dark:text-[#58A6FF] text-xs font-semibold"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <NewsLinkPreviewCards text={description} />

                {/* Instant Auto-Embedded Social Video Preview when YouTube / Facebook / TikTok Link is Pasted */}
                {activeVideoEmbed && (
                  <div className="rounded-[24px] bg-[#F6F8FB] dark:bg-zinc-800/70 border border-slate-200/80 dark:border-zinc-700/70 p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 px-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Video className="w-4 h-4 text-[#1877F2] shrink-0" />
                        <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                          {activeVideoEmbed.platform === "youtube"
                            ? "YouTube Video Embedded"
                            : activeVideoEmbed.platform === "facebook"
                            ? "Facebook Video Embedded"
                            : "TikTok Video Embedded"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearVideo}
                        className="w-7 h-7 rounded-full bg-white dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-600 hover:text-rose-600 flex items-center justify-center transition cursor-pointer shrink-0"
                        aria-label="Remove video"
                        title="Remove video"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <NewsVideoPlayer
                      videoSource={activeVideoEmbed}
                      autoPlayInView={true}
                    />
                  </div>
                )}

                {/* SCAM INCIDENT DETAILS — Shown ONLY when Scam Report is selected */}
                {postType === "scam" && (
                  <div className="rounded-[24px] bg-rose-50/70 dark:bg-rose-950/25 border border-rose-200/80 dark:border-rose-900/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>
                          Where did the scam happen? (Stamped on photo)
                        </span>
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {SCAM_PLACES.map((place) => (
                        <button
                          key={place}
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setScamLocation(place);
                          }}
                          className={`px-3 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                            scamLocation === place
                              ? "bg-rose-600 text-white"
                              : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-rose-200/60 dark:border-zinc-700"
                          }`}
                        >
                          {place}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      value={scamLocation}
                      onChange={(e) => setScamLocation(e.target.value)}
                      placeholder="Exact Page / Group / Website / Shop name..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-rose-200 dark:border-zinc-700 text-xs font-medium outline-none"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        value={scammerName}
                        onChange={(e) => setScammerName(e.target.value)}
                        placeholder="Scammer / Page Name (Optional)"
                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-rose-200/70 dark:border-zinc-700 text-xs outline-none"
                      />
                      <input
                        type="text"
                        value={scammerPhone}
                        onChange={(e) => setScammerPhone(e.target.value)}
                        placeholder="Phone / WhatsApp Number"
                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-rose-200/70 dark:border-zinc-700 text-xs outline-none"
                      />
                      <input
                        type="text"
                        value={scammerBkash}
                        onChange={(e) => setScammerBkash(e.target.value)}
                        placeholder="bKash / Nagad / Bank Account"
                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-rose-200/70 dark:border-zinc-700 text-xs outline-none"
                      />
                      <input
                        type="number"
                        value={scammedAmount}
                        onChange={(e) => setScammedAmount(e.target.value)}
                        placeholder="Amount Lost (৳)"
                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-rose-200/70 dark:border-zinc-700 text-xs outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* ATTACHED PHOTOS, ASPECT RATIO & MULTI-IMAGE LAYOUT CONTROLS */}
                {(processedImages.length > 0 ||
                  activeInlinePanel === "media") && (
                  <div className="rounded-[26px] bg-[#F6F8FB] dark:bg-zinc-800/60 p-4 space-y-3.5 border border-slate-200/70 dark:border-zinc-700/60">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {isProcessingImages
                          ? "Processing high-res photos..."
                          : processedImages.length > 0
                          ? `Attached Photos (${processedImages.length})`
                          : "Attach Photos"}
                      </span>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 rounded-full bg-[#1877F2] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Photos</span>
                      </button>
                    </div>

                    {/* Image Card Size / Aspect Ratio Picker */}
                    {processedImages.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-zinc-500 block">
                          Card Image Size (Matches photo shape)
                        </span>
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                          {[
                            {
                              id: "original",
                              label: "Auto / Original",
                              icon: Maximize2,
                            },
                            {
                              id: "square",
                              label: "Square 1:1",
                              icon: Square,
                            },
                            {
                              id: "portrait",
                              label: "Portrait 4:5",
                              icon: ImageIcon,
                            },
                            {
                              id: "landscape",
                              label: "Wide 16:10",
                              icon: LayoutGrid,
                            },
                          ].map((opt) => {
                            const IconC = opt.icon;
                            const active = imageAspectRatio === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  triggerHaptic();
                                  setImageAspectRatio(
                                    opt.id as ImageAspectMode
                                  );
                                }}
                                className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
                                  active
                                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                                    : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                }`}
                              >
                                <IconC className="w-3 h-3 shrink-0" />
                                <span>{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Multi-Image Display Style Picker (when 2+ photos attached) */}
                    {processedImages.length > 1 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-zinc-500 block">
                          Multi-Photo Display Style
                        </span>
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                          {[
                            {
                              id: "collage",
                              label: "Collage",
                              icon: LayoutGrid,
                            },
                            {
                              id: "carousel",
                              label: "Carousel",
                              icon: ImageIcon,
                            },
                            { id: "grid", label: "2×2 Grid", icon: Square },
                            { id: "stack", label: "Card Stack", icon: Layers },
                          ].map((st) => {
                            const IconC = st.icon;
                            const active = imageLayout === st.id;
                            return (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => {
                                  triggerHaptic();
                                  setImageLayout(st.id as ImageLayoutStyle);
                                }}
                                className={`py-1.5 px-3 rounded-full text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
                                  active
                                    ? "bg-[#1877F2] text-white shadow-xs"
                                    : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                }`}
                              >
                                <IconC className="w-3 h-3 shrink-0" />
                                <span>{st.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Live Feed Card Media Preview */}
                    {processedImages.length > 0 && (
                      <div className="space-y-2.5">
                        {(isCheckingAiImage || isAiGenerated) && (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 px-1">
                            <Sparkles className="w-3.5 h-3.5 text-[#1877F2] shrink-0" />
                            <span>
                              {isCheckingAiImage
                                ? "Checking image authenticity..."
                                : "AI generated · Auto-detected (shown below post date)"}
                            </span>
                          </div>
                        )}
                        <NewsPostMedia
                          post={{
                            ...previewPostObj,
                            videoUrl: undefined,
                            description: "",
                          }}
                        />

                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                          {processedImages.map((img, i) => (
                            <div
                              key={i}
                              className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-zinc-700"
                            >
                              <img
                                src={img}
                                alt={`Upload ${i + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(i)}
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/75 text-white flex items-center justify-center cursor-pointer"
                                aria-label="Remove image"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* REAL LIVE VOICE NOTE STUDIO — Opens ONLY when Voice / Mic is clicked */}
                {(activeInlinePanel === "voice" || audioUrl || isRecording) && (
                  <div className="relative rounded-[28px] bg-[#F8FAFD] dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/70 p-4 sm:p-5 flex flex-col items-center justify-center">
                    {/* Dismiss button when idle and no audio recorded */}
                    {!isRecording && !audioUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          setActiveInlinePanel(null);
                        }}
                        className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center shadow-2xs transition cursor-pointer"
                        aria-label="Close voice recorder"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}

                    {/* Hidden Audio Element for Real Studio Waveform Scrubbing & Playback */}
                    {audioUrl && !isRecording && (
                      <audio
                        ref={studioAudioRef}
                        src={audioUrl}
                        preload="metadata"
                        onLoadedMetadata={(e) => {
                          const d = e.currentTarget.duration;
                          if (Number.isFinite(d) && d > 0) {
                            const rounded = Math.max(1, Math.round(d));
                            setAudioDuration(rounded);
                            if (!isPlayingPreview) {
                              setRecordCentiseconds(rounded * 100);
                            }
                          }
                        }}
                        onTimeUpdate={(e) => {
                          const cur = e.currentTarget.currentTime;
                          const dur =
                            Number.isFinite(e.currentTarget.duration) &&
                            e.currentTarget.duration > 0
                              ? e.currentTarget.duration
                              : audioDuration || 1;
                          setPreviewCurrentCs(Math.floor(cur * 100));
                          setPreviewProgress(Math.min(100, (cur / dur) * 100));
                        }}
                        onPlay={() => setIsPlayingPreview(true)}
                        onPause={() => setIsPlayingPreview(false)}
                        onEnded={() => {
                          setIsPlayingPreview(false);
                          setPreviewProgress(0);
                          setPreviewCurrentCs(0);
                        }}
                      />
                    )}

                    <div className="text-[38px] sm:text-[42px] font-bold tracking-tight tabular-nums text-zinc-900 dark:text-white leading-none">
                      {formatRecorderClock(
                        isPlayingPreview
                          ? previewCurrentCs
                          : recordCentiseconds
                      )}
                    </div>
                    <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1.5 font-medium flex items-center gap-1.5">
                      {isRecording && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                      )}
                      <span>
                        {isRecording
                          ? "Listening to microphone · Speak now"
                          : isPlayingPreview
                          ? "Playing voice note · Tap bars to seek"
                          : audioUrl
                          ? "Voice note recorded · Tap Play or scrub bars"
                          : "Tap microphone below to start recording"}
                      </span>
                    </p>

                    <div className="mt-4 flex items-center gap-3">
                      {/* Play / Pause Recorded Voice Button */}
                      {audioUrl && !isRecording && (
                        <button
                          type="button"
                          onClick={toggleStudioPreviewPlay}
                          className="w-12 h-12 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shadow-md active:scale-95 transition cursor-pointer"
                          aria-label={
                            isPlayingPreview
                              ? "Pause voice preview"
                              : "Play voice preview"
                          }
                        >
                          {isPlayingPreview ? (
                            <Pause className="w-5 h-5 fill-current" />
                          ) : (
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          )}
                        </button>
                      )}

                      {/* Primary Record / Stop Button */}
                      <button
                        type="button"
                        onClick={
                          isRecording ? stopVoiceRecording : startVoiceRecording
                        }
                        className={`w-16 h-16 rounded-full text-white flex items-center justify-center shadow-[0_8px_22px_rgba(24,119,242,0.38)] active:scale-95 transition cursor-pointer ${
                          isRecording
                            ? "bg-rose-600 hover:bg-rose-700 ring-4 ring-rose-500/20"
                            : "bg-[#1877F2] hover:bg-[#1465D8]"
                        }`}
                        aria-label={
                          isRecording ? "Stop recording" : "Start recording"
                        }
                      >
                        {isRecording ? (
                          <span className="w-5 h-5 rounded-[5px] bg-white block" />
                        ) : (
                          <Mic className="w-6 h-6" />
                        )}
                      </button>

                      {/* Delete Recorded Voice Button */}
                      {audioUrl && !isRecording && (
                        <button
                          type="button"
                          onClick={clearRecordedVoice}
                          className="w-12 h-12 rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-rose-600 flex items-center justify-center active:scale-95 transition cursor-pointer"
                          aria-label="Delete voice note"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* REAL WORKING BEAT BARS + INTERACTIVE SCRUBBER + DYNAMIC TIMELINE */}
                    <div className="w-full mt-6">
                      <div
                        ref={studioTrackRef}
                        onClick={handleStudioWaveformSeek}
                        className={`relative h-32 flex items-center gap-[3px] px-1 select-none ${
                          audioUrl && !isRecording ? "cursor-pointer" : ""
                        }`}
                      >
                        {isRecording ? (
                          /* LIVE MICROPHONE BEAT BARS + DOTTED UNRECORDED SLOTS */
                          Array.from({ length: STUDIO_BAR_COUNT }).map(
                            (_, idx) => {
                              const hasSample = idx < liveBars.length;
                              const isPlayheadEdge =
                                hasSample && idx === liveBars.length - 1;
                              if (!hasSample) {
                                return (
                                  <span
                                    key={idx}
                                    className="flex-1 flex items-center justify-center h-full"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                                  </span>
                                );
                              }
                              const peak = liveBars[idx];
                              return (
                                <span
                                  key={idx}
                                  className={`flex-1 flex items-center justify-center h-full relative ${
                                    isPlayheadEdge
                                      ? "border-r-2 border-[#1877F2] bg-gradient-to-r from-transparent to-[#1877F2]/15"
                                      : ""
                                  }`}
                                >
                                  <span
                                    className={`w-[3px] rounded-full transition-all duration-75 ${studioPeakToHeightClass(
                                      peak
                                    )} ${
                                      isPlayheadEdge
                                        ? "bg-[#1877F2]"
                                        : "bg-zinc-800 dark:bg-zinc-100"
                                    }`}
                                  />
                                </span>
                              );
                            }
                          )
                        ) : audioUrl ? (
                          /* RECORDED REAL WAVEFORM WITH CLICK-TO-SEEK & LIVE PLAYBACK SWEEP */
                          (audioWaveform.length > 0
                            ? audioWaveform
                            : Array.from(
                                { length: STUDIO_BAR_COUNT },
                                (_, i) =>
                                  0.25 + 0.45 * Math.abs(Math.sin(i * 0.55))
                              )
                          ).map((peak, idx, arr) => {
                            const barPct = ((idx + 0.5) / arr.length) * 100;
                            const played =
                              previewProgress > 0 && barPct <= previewProgress;
                            const nextBarPct = ((idx + 1.5) / arr.length) * 100;
                            const isPlayhead =
                              previewProgress > 0 &&
                              barPct <= previewProgress &&
                              nextBarPct > previewProgress;
                            return (
                              <span
                                key={idx}
                                className={`flex-1 flex items-center justify-center h-full ${
                                  isPlayhead
                                    ? "border-r-2 border-[#1877F2]"
                                    : ""
                                } ${
                                  played ? "bg-[#1877F2]/[0.07]" : ""
                                }`}
                              >
                                <span
                                  className={`w-[3px] rounded-full transition-all duration-100 ${studioPeakToHeightClass(
                                    peak
                                  )} ${
                                    played
                                      ? "bg-[#1877F2] scale-y-105"
                                      : "bg-zinc-700 dark:bg-zinc-300 hover:bg-[#1877F2]/70"
                                  }`}
                                />
                              </span>
                            );
                          })
                        ) : (
                          /* IDLE CLEAN ZERO-STATE HORIZON (No fake 5-sec pre-recorded bars!) */
                          Array.from({ length: STUDIO_BAR_COUNT }).map(
                            (_, idx) => (
                              <span
                                key={idx}
                                className="flex-1 flex items-center justify-center h-full"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                              </span>
                            )
                          )
                        )}
                      </div>

                      {/* Dynamic Timeline Ruler reflecting real elapsed/recorded seconds */}
                      <div className="border-t border-zinc-200 dark:border-zinc-700 pt-2 flex items-center justify-between text-[11px] font-medium tabular-nums text-zinc-500">
                        {Array.from({ length: 9 }).map((_, idx) => {
                          const totalTimelineSec = Math.max(
                            8,
                            isRecording
                              ? Math.ceil(recordCentiseconds / 100)
                              : audioDuration || 8
                          );
                          const secVal = Math.round(
                            (idx / 8) * totalTimelineSec
                          );
                          const m = Math.floor(secVal / 60);
                          const s = secVal % 60;
                          return (
                            <span key={idx}>
                              {m}:{String(s).padStart(2, "0")}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* INLINE SOCIAL VIDEO LINK EMBED PANEL (YouTube, Facebook, TikTok Only — Zero Storage) */}
                {activeInlinePanel === "video" && (
                  <div className="rounded-[24px] bg-[#F5F7FA] dark:bg-zinc-800/65 border border-slate-200/80 dark:border-zinc-700/70 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-[#1877F2]" />
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">
                          Embed YouTube, Facebook, or TikTok Video
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveInlinePanel(null)}
                        className="w-7 h-7 rounded-full bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center cursor-pointer"
                        aria-label="Close video panel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-[#1877F2]" />
                        <span>
                          Paste YouTube, Facebook Video/Reel, or TikTok link
                        </span>
                      </label>
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://youtube.com/... , facebook.com/... , or tiktok.com/..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 text-xs outline-none border border-slate-200 dark:border-zinc-700 focus:border-[#1877F2]"
                      />
                      {hasUnsupportedVideoInput ? (
                        <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                          Only YouTube, Facebook (Video / Watch / Reel), and TikTok links are supported.
                        </p>
                      ) : (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          You can also paste the link directly inside your post caption above — it embeds automatically in the feed.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* UNIFIED ON-DEMAND CATEGORY & TOPICS DRAWER — Opens ONLY when toolbar icon is clicked */}
                {activeInlinePanel === "themes" && (
                  <div className="rounded-[24px] bg-[#F6F8FB] dark:bg-zinc-800/60 border border-slate-200/70 dark:border-zinc-700/60 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        Category & Topics ({selectedThemes.length} selected)
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveInlinePanel(null)}
                        className="w-7 h-7 rounded-full bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center cursor-pointer"
                        aria-label="Close categories"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Category Group Filter Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                      {["All", ...FEED_THEME_GROUPS].map((grp) => {
                        const active = activeCategoryGroup === grp;
                        return (
                          <button
                            key={grp}
                            type="button"
                            onClick={() => {
                              triggerHaptic();
                              setActiveCategoryGroup(grp);
                            }}
                            className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition cursor-pointer shrink-0 ${
                              active
                                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                                : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-slate-200/70 dark:border-zinc-700"
                            }`}
                          >
                            {grp}
                          </button>
                        );
                      })}
                    </div>

                    {/* Category Chips */}
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-0.5">
                      {(activeCategoryGroup === "All"
                        ? FEED_THEMES
                        : FEED_THEMES.filter(
                            (t) => t.group === activeCategoryGroup
                          )
                      ).map((theme) => {
                        const active = selectedThemes.includes(theme.id);
                        return (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => toggleThemeSelection(theme.id)}
                            className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
                              active
                                ? "bg-[#1877F2] text-white shadow-2xs"
                                : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-slate-200/70 dark:border-zinc-700 hover:border-[#1877F2]/50"
                            }`}
                          >
                            <span>{theme.emoji}</span>
                            <span>{theme.label}</span>
                            {active && <Check className="w-3 h-3 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* INLINE AUDIENCE SELECTOR (Single-Line Slimmer Full-Radius Pills) */}
                {activeInlinePanel === "audience" && (
                  <div className="rounded-[24px] bg-[#F5F6F8] dark:bg-zinc-800/60 p-3.5 sm:p-4 space-y-2.5">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                      Who can view this post?
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                      {[
                        { id: "public", label: "Public", icon: Globe },
                        {
                          id: "followers",
                          label: "Followers",
                          icon: UserCheck,
                        },
                        { id: "only_me", label: "Only Me", icon: Lock },
                      ].map((item) => {
                        const IconC = item.icon;
                        const active = privacy === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              triggerHaptic();
                              setPrivacy(item.id as any);
                            }}
                            className={`py-1.5 px-2.5 sm:px-3.5 rounded-full text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
                              active
                                ? "bg-[#1877F2] text-white shadow-xs"
                                : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-slate-200/70 dark:border-zinc-700"
                            }`}
                          >
                            <IconC className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                            <span className="whitespace-nowrap">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Floating Toolbar + Glowing Blue Mic Button matching Screenshot 3 */}
              <div className="pt-6 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-[#F4F5F7] dark:bg-zinc-800 border border-slate-200/60 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={cycleTextStyle}
                    title="Change text style"
                    className={`w-11 h-11 rounded-full flex items-center justify-center text-[15px] font-bold transition cursor-pointer ${
                      textStyle !== "normal"
                        ? "bg-[#1877F2] text-white shadow-xs"
                        : "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs"
                    }`}
                  >
                    Aa
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setActiveInlinePanel("media");
                      fileInputRef.current?.click();
                    }}
                    title="Attach photos"
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer ${
                      processedImages.length > 0 ||
                      activeInlinePanel === "media"
                        ? "bg-[#1877F2] text-white shadow-xs"
                        : "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs"
                    }`}
                  >
                    <ImageIcon className="w-4 h-4 stroke-[2.1]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setActiveInlinePanel((p) =>
                        p === "video" ? null : "video"
                      );
                    }}
                    title="Embed YouTube, Facebook, or TikTok Video"
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer ${
                      Boolean(activeVideoEmbed) || activeInlinePanel === "video"
                        ? "bg-[#1877F2] text-white shadow-xs"
                        : "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs"
                    }`}
                  >
                    <Video className="w-4 h-4 stroke-[2.1]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setActiveInlinePanel((p) =>
                        p === "themes" ? null : "themes"
                      );
                    }}
                    title="Category & Topics"
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer ${
                      activeInlinePanel === "themes"
                        ? "bg-[#1877F2] text-white shadow-xs"
                        : "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs"
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 stroke-[2.1]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setActiveInlinePanel((p) =>
                        p === "audience" ? null : "audience"
                      );
                    }}
                    title="Post visibility"
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer ${
                      activeInlinePanel === "audience"
                        ? "bg-[#1877F2] text-white shadow-xs"
                        : "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs"
                    }`}
                  >
                    <QrCode className="w-4 h-4 stroke-[2.1]" />
                  </button>
                </div>

                {/* Right Glowing Blue Mic Sphere */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    if (activeInlinePanel !== "voice") {
                      setActiveInlinePanel("voice");
                    } else if (isRecording) {
                      stopVoiceRecording();
                    } else {
                      startVoiceRecording();
                    }
                  }}
                  title="Voice note studio"
                  aria-label="Voice note studio"
                  className="w-14 h-14 rounded-full bg-gradient-to-b from-[#55AAFF] via-[#227BF3] to-[#125ED6] text-white flex items-center justify-center shadow-[0_10px_26px_rgba(24,119,242,0.48)] ring-4 ring-blue-400/20 active:scale-90 transition cursor-pointer shrink-0"
                >
                  <Mic className="w-5 h-5 stroke-[2.2]" />
                </button>
              </div>
            </>
          ) : (
            /* STEP 2: DEDICATED FULL POST PREVIEW & PUBLISH SCREEN */
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                    Live Feed Card Preview
                  </h2>
                  <p className="text-xs text-zinc-500">
                    {postType === "scam"
                      ? `Scam Report · Location stamp: "${scamLocation}"`
                      : "Clean Community Post · No scam watermarks or labels"}
                  </p>
                </div>

                {/* Exact Feed Card Preview */}
                <div className="rounded-[28px] bg-[#F6F8FB] dark:bg-zinc-800/80 p-4 space-y-3 border border-slate-200/70 dark:border-zinc-700">
                  <div className="flex items-center gap-3">
                    <img
                      src={userAvatarDisplay}
                      alt={userNameDisplay}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">
                        {userNameDisplay}
                      </p>
                      <p className="text-xs text-zinc-500">Just now · Public</p>
                    </div>
                  </div>

                  {description && (
                    <p
                      className={`whitespace-pre-line break-words ${
                        textStyle === "large"
                          ? "text-xl font-bold text-zinc-900 dark:text-white"
                          : textStyle === "quote"
                          ? "text-base italic font-medium text-zinc-800 dark:text-zinc-100 border-l-3 border-[#1877F2] pl-3"
                          : "text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed"
                      }`}
                    >
                      <NewsRichText text={description} />
                    </p>
                  )}

                  <NewsLinkPreviewCards text={description} />

                  <NewsPostMedia post={previewPostObj} />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-3.5 rounded-full bg-[#F4F5F7] dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm font-semibold cursor-pointer"
                >
                  Back to Edit
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={isSubmitting || isProcessingImages}
                  className="flex-1 py-3.5 rounded-full bg-[#1877F2] hover:bg-[#1464D0] text-white text-sm font-bold shadow-[0_8px_24px_rgba(24,119,242,0.38)] disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting
                    ? "Publishing..."
                    : editId
                    ? "Save Changes"
                    : "Publish to Feed"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateScamPost;
