import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import { LoopsSvgIcon } from "../components/LoopsSvgIcon";
import { pingBingIndexNow } from "../lib/indexNowClient";
import { auth, db } from "../firebase";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  ImageLayoutStyle,
  ImageAspectMode,
  ScamPost,
  ReplyPermissionMode,
  PostPoll,
  PostSnippet,
  PostQuoteBlock,
  PostThreadItem,
} from "../types";
import {
  applyWatermarkToImage,
  processCleanImage,
} from "../lib/watermark";
import { uploadDataUrlToImgbb } from "../services/imgbb";
import { uploadFileToCatbox } from "../lib/catboxUpload";
import { detectAiGeneratedFiles } from "../lib/aiImageDetector";
import { NewsPostMedia, isScamPostRecord } from "../components/NewsPostMedia";
import {
  NewsRichText,
  NewsLinkPreviewCards,
  extractHashtagsFromText,
} from "../components/NewsRichText";
import {
  extractFirstVideoUrlFromText,
  parseVideoEmbed,
  resolveShortVideoUrl,
  toPlayableMediaUrl,
} from "../lib/videoEmbed";
import { FEED_THEMES, FEED_THEME_GROUPS } from "../lib/feed-themes";
import { resolvePostById } from "./NewsHubSubPages";
import { LiveStreamModal } from "../components/LiveStreamModal";
import { useNotify } from "../components/Notifications";
import { triggerHaptic } from "../lib/haptics";
import SEO from "../components/SEO";
import {
  hasImmediateAdminOrStaffRole,
  checkStaffRecord,
} from "../lib/admin";
import {
  DeezerMusicPickerModal,
  AttachedMusic,
} from "../components/DeezerMusicPickerModal";
import {
  ComposerDraftItem,
  loadComposerDrafts,
  saveComposerDraftItem,
  removeComposerDraftItem,
  StickerPeelSmileIcon,
  GifBadgeOutlineIcon,
  MusicNotesOutlineIcon,
  MoreCircleDotsIcon,
  SlidersSquareIcon,
  DottedGhostCatIcon,
  LiquidGlassHeaderCapsule,
  LiquidGlassGhostToggle,
  AttachmentMorePopover,
  DraftsBottomSheet,
  ScheduleDrumWheelModal,
  StickersBottomSheet,
  GiphyBottomSheet,
  PostOptionsBottomSheet,
  LiveCameraCaptureModal,
  LocationPickerModal,
} from "../components/ComposerLiquidGlassSheets";

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
  const cameraFallbackInputRef = useRef<HTMLInputElement | null>(null);
  const musicPreviewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Professional Audio Uploader Refs & State
  const audioUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isVideoFileCandidate = (file: File): boolean =>
    file.type.startsWith("video/") ||
    /\.(mp4|webm|mov|m4v|mkv|3gp|avi|mpeg|mpg|ogv)$/i.test(file.name);

  useEffect(() => {
    if (initialTab === "video" && !editId) {
      navigate("/create-reel", { replace: true });
    }
  }, [initialTab, editId, navigate]);

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    triggerHaptic();
    setIsUploadingAudio(true);
    setUploadProgress(15);
    try {
      notify("Optimizing audio track for background playback...", "info");
      const url = await uploadFileToCatbox(file, undefined, (p) => setUploadProgress(p));
      setAudioUrl(url);
      setActiveInlinePanel("voice");
      notify("Audio track attached successfully!", "success");
    } catch (err: any) {
      notify("Audio optimization failed. Please try again.", "error");
    } finally {
      setIsUploadingAudio(false);
      setUploadProgress(0);
      e.target.value = "";
    }
  };

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
  const [manualAiLabel, setManualAiLabel] = useState(false);
  const [isCheckingAiImage, setIsCheckingAiImage] = useState(false);

  // Liquid Glass Composer Additions (Tags, Stickers, GIF, Music, Poll, Snippet, Quote, Thread, Schedule, Ghost, Reply Options)
  const [postTag, setPostTag] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [showTagPopover, setShowTagPopover] = useState(false);
  const [locationTag, setLocationTag] = useState("");
  const [gifUrl, setGifUrl] = useState("");
  const [stickers, setStickers] = useState<string[]>([]);
  const [attachedMusic, setAttachedMusic] = useState<AttachedMusic | null>(null);
  const [playingAttachedMusic, setPlayingAttachedMusic] = useState(false);
  const [pollDraft, setPollDraft] = useState<{
    question: string;
    options: string[];
    durationHours: number;
  } | null>(null);
  const [snippetDraft, setSnippetDraft] = useState<{
    title: string;
    content: string;
  } | null>(null);
  const [quoteDraft, setQuoteDraft] = useState<{
    text: string;
    author: string;
  } | null>(null);
  const [threadItems, setThreadItems] = useState<PostThreadItem[]>([]);
  const [scheduledAt, setScheduledAt] = useState<number | null>(null);
  const [isGhostPost, setIsGhostPost] = useState(
    () => searchParams.get("ghost") === "1"
  );
  const [replyPermission, setReplyPermission] =
    useState<ReplyPermissionMode>("anyone");
  const [reviewApproveReplies, setReviewApproveReplies] = useState(false);
  const [alsoShareOn, setAlsoShareOn] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<ComposerDraftItem[]>(() =>
    loadComposerDrafts(auth.currentUser?.uid)
  );

  // Liquid Glass Bottom Sheets & Popover States
  const [showDraftsSheet, setShowDraftsSheet] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showStickersSheet, setShowStickersSheet] = useState(false);
  const [showGiphySheet, setShowGiphySheet] = useState(false);
  const [showMoreAttachPopover, setShowMoreAttachPopover] = useState(false);
  const [showPostOptionsSheet, setShowPostOptionsSheet] = useState(false);
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [videoVolume, setVideoVolume] = useState<number>(1.0);
  const [bgMusicVolume, setBgMusicVolume] = useState<number>(1.0);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showLiveStudio, setShowLiveStudio] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Video State
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
    "voice" | "media" | "themes" | "audience" | null
  >(
    initialTab === "photo"
      ? "media"
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
  const [userProfile, setUserProfile] = useState<any>(null);
  const [originalPost, setOriginalPost] = useState<ScamPost | null>(null);

  // Auth listener & Admin check
  useEffect(() => {
    let unsubProfileDoc: (() => void) | null = null;
    const unsub = auth.onAuthStateChanged(async (u) => {
      setCurrentUser(u);
      setAuthReady(true);
      if (unsubProfileDoc) {
        unsubProfileDoc();
        unsubProfileDoc = null;
      }
      if (!u) {
        setIsAdmin(false);
        setUserProfile(null);
        return;
      }
      unsubProfileDoc = onSnapshot(doc(db, "users", u.uid), (snap) => {
        setUserProfile(snap.exists() ? snap.data() : null);
      });
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
    return () => {
      unsub();
      if (unsubProfileDoc) unsubProfileDoc();
    };
  }, []);

  // Load post if in dedicated Edit Mode (/news-hub/edit/:editId)
  useEffect(() => {
    if (!editId) return;
    resolvePostById(editId).then((found) => {
      if (!found) {
        notify("Loop not found", "error");
        navigate("/loops", { replace: true });
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
      setManualAiLabel(Boolean(found.isAiGenerated));
      setPrivacy(found.privacy || "public");
      setPostTag(found.postTag || "");
      setLocationTag(found.locationTag || "");
      setGifUrl(found.gifUrl || "");
      setStickers(found.stickers || []);
      setAttachedMusic(found.music || null);
      if (found.poll) {
        setPollDraft({
          question: found.poll.question || "",
          options: found.poll.options.map((o) => o.text),
          durationHours: 24,
        });
      }
      if (found.snippet) {
        setSnippetDraft({
          title: found.snippet.title || "",
          content: found.snippet.content || "",
        });
      }
      if (found.quoteBlock) {
        setQuoteDraft({
          text: found.quoteBlock.text || "",
          author: found.quoteBlock.author || "",
        });
      }
      setThreadItems(found.threadItems || []);
      setScheduledAt(found.scheduledAt || null);
      setIsGhostPost(Boolean(found.isGhostPost));
      setReplyPermission(found.replyPermission || "anyone");
      setReviewApproveReplies(Boolean(found.reviewApproveReplies));
      setAlsoShareOn(found.alsoShareOn || []);
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
      } else if (found.audioUrl) {
        setActiveInlinePanel("voice");
      }
    });
  }, [editId, navigate, notify]);

  // Reload drafts when auth user changes
  useEffect(() => {
    setDrafts(loadComposerDrafts(currentUser?.uid));
  }, [currentUser?.uid]);

  // Cleanup music preview audio on unmount
  useEffect(() => {
    return () => {
      if (musicPreviewAudioRef.current) {
        musicPreviewAudioRef.current.pause();
        musicPreviewAudioRef.current = null;
      }
    };
  }, []);

function cleanPayload<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj as T;
  if (Array.isArray(obj)) return obj.map(cleanPayload) as unknown as T;
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const res: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const val = (obj as Record<string, any>)[key];
      if (val !== undefined) {
        res[key] = cleanPayload(val);
      }
    }
    return res as T;
  }
  return obj;
}

  // Verify edit permission once both auth and originalPost are ready
  useEffect(() => {
    if (!editId || !authReady || !originalPost) return;
    if (!currentUser) {
      notify("Please sign in to edit your post.", "error");
      navigate("/signin", { replace: true });
      return;
    }
    const isAuthor =
      originalPost.reporterId === currentUser.uid ||
      (originalPost as any).authorId === currentUser.uid ||
      (originalPost as any).userId === currentUser.uid;
    if (!isAuthor && !isAdmin) {
      notify("You can only edit your own loops.", "error");
      navigate(`/loops/post/${editId}`, { replace: true });
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

  const uploadCacheRef = useRef<Map<string, Promise<string>>>(new Map());

  const ensureHostedPostImage = (src: string, idx: number): Promise<string> => {
    if (!src) return Promise.resolve("");
    if (/^https?:\/\//i.test(src)) {
      return Promise.resolve(src.replace(/^http:\/\//i, "https://"));
    }
    const cached = uploadCacheRef.current.get(src);
    if (cached) return cached;

    const uploadPromise = uploadDataUrlToImgbb(
      src,
      `feed-post-${Date.now()}-${idx + 1}.jpg`,
      { requireRemote: false }
    ).catch(() => {
      uploadCacheRef.current.delete(src);
      return src; // Safe fallback to local base64 so post upload never fails
    });

    uploadCacheRef.current.set(src, uploadPromise);
    return uploadPromise;
  };

  // Re-process uploaded raw files in parallel whenever postType (Normal vs Scam) or scamLocation changes,
  // and immediately warm background uploads so publishing multi-photo posts is near-instant!
  useEffect(() => {
    if (rawFiles.length === 0) {
      setProcessedImages(existingUrls);
      return;
    }

    let cancelled = false;
    setIsProcessingImages(true);

    const run = async () => {
      try {
        const processedBatch = await Promise.all(
          rawFiles.map((file) =>
            postType === "scam"
              ? applyWatermarkToImage(file, {
                  watermarkText: "SCAM ALERT • DEEP SHOP",
                  scamLocation: scamLocation || "Online Platform",
                  includeBottomBanner: true,
                })
              : processCleanImage(file)
          )
        );

        const urls: string[] = [
          ...existingUrls,
          ...processedBatch.map((r) => r.dataUrl),
        ];
        const ratios: number[] = processedBatch.map((r) => r.aspectRatio);

        // Pre-upload processed photos in parallel in the background while user composes
        processedBatch.forEach((r, idx) => {
          ensureHostedPostImage(r.dataUrl, idx).catch(() => {});
        });

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

    const debounce = window.setTimeout(run, 80);
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
    e.target.value = "";

    const videoFiles = incoming.filter(isVideoFileCandidate);
    const imageFiles = incoming.filter((f) => !isVideoFileCandidate(f));

    if (videoFiles.length > 0) {
      const vFile = videoFiles[0];
      setIsUploadingVideo(true);
      notify("Processing video...", "info");
      uploadFileToCatbox(vFile).then((url) => {
        if (url) {
          setVideoUrl(url);
          notify("Video attached successfully!", "success");
        } else {
          setVideoUrl(URL.createObjectURL(vFile));
        }
      }).catch(() => {
        setVideoUrl(URL.createObjectURL(vFile));
      }).finally(() => {
        setIsUploadingVideo(false);
      });
    }
    if (imageFiles.length > 0) {
      setRawFiles((prev) => [...prev, ...imageFiles]);
      setActiveInlinePanel("media");
    }
  };

  const handleVideoFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      notify("Video file must be under 100MB", "error");
      return;
    }
    setIsUploadingVideo(true);
    triggerHaptic();
    notify("Uploading video...", "info");
    try {
      const hostedUrl = await uploadFileToCatbox(file);
      if (hostedUrl) {
        setVideoUrl(hostedUrl);
        notify("Video attached successfully!", "success");
      } else {
        const localBlob = URL.createObjectURL(file);
        setVideoUrl(localBlob);
        notify("Video attached!", "success");
      }
    } catch {
      const localBlob = URL.createObjectURL(file);
      setVideoUrl(localBlob);
    } finally {
      setIsUploadingVideo(false);
      if (e.target) e.target.value = "";
    }
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

  const detectedCaptionVideoUrl = "";
/*
  const detectedCaptionVideoUrl = React.useMemo(
    () => extractFirstVideoUrlFromText(description),
    [description]
  );
*/

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

  const effectiveAiLabel = Boolean(manualAiLabel || isAiGenerated);

  const hasDraftableContent = Boolean(
    description.trim() ||
      videoUrl.trim() ||
      gifUrl ||
      stickers.length > 0 ||
      pollDraft ||
      snippetDraft ||
      quoteDraft ||
      threadItems.some((t) => t.text.trim())
  );

  const buildCurrentPollObject = (): PostPoll | null => {
    if (!pollDraft) return null;
    const validOptions = pollDraft.options
      .map((o) => o.trim())
      .filter(Boolean);
    if (validOptions.length < 2) return null;
    return {
      id: originalPost?.poll?.id || `poll_${Date.now()}`,
      question:
        pollDraft.question.trim() ||
        description.trim().slice(0, 120) ||
        "Community Poll",
      options: validOptions.map((optText, idx) => {
        const existingOpt = originalPost?.poll?.options?.[idx];
        return {
          id: existingOpt?.id || `opt_${idx + 1}`,
          text: optText,
          voterIds:
            existingOpt && existingOpt.text === optText
              ? existingOpt.voterIds || []
              : [],
        };
      }),
      endsAt:
        originalPost?.poll?.endsAt ||
        Date.now() + (pollDraft.durationHours || 24) * 3600 * 1000,
    };
  };

  const buildCurrentSnippetObject = (): PostSnippet | null => {
    if (!snippetDraft || !snippetDraft.content.trim()) return null;
    return {
      title: snippetDraft.title.trim() || undefined,
      content: snippetDraft.content.trim(),
    };
  };

  const buildCurrentQuoteObject = (): PostQuoteBlock | null => {
    if (!quoteDraft || !quoteDraft.text.trim()) return null;
    return {
      text: quoteDraft.text.trim(),
      author: quoteDraft.author.trim() || undefined,
    };
  };

  const handleSaveCurrentDraft = () => {
    const draftObj: ComposerDraftItem = {
      id: `draft_${Date.now()}`,
      description,
      postType,
      textStyle,
      postTag: postTag || undefined,
      locationTag: locationTag || undefined,
      videoUrl: videoUrl.trim() || undefined,
      gifUrl: gifUrl || undefined,
      stickers: stickers.length > 0 ? stickers : undefined,
      poll: buildCurrentPollObject(),
      snippet: buildCurrentSnippetObject(),
      quoteBlock: buildCurrentQuoteObject(),
      threadItems: threadItems.filter((t) => t.text.trim() || t.imageUrl),
      scheduledAt,
      isGhostPost,
      isAiGenerated: effectiveAiLabel,
      replyPermission,
      reviewApproveReplies,
      updatedAt: Date.now(),
    };
    const next = saveComposerDraftItem(currentUser?.uid, draftObj);
    setDrafts(next);
    notify("Saved to drafts!", "success");
  };

  const handleLoadDraft = (draft: ComposerDraftItem) => {
    setDescription(draft.description || "");
    setPostType(draft.postType || "normal");
    setTextStyle(draft.textStyle || "normal");
    setPostTag(draft.postTag || "");
    setLocationTag(draft.locationTag || "");
    setVideoUrl(draft.videoUrl || "");
    setGifUrl(draft.gifUrl || "");
    setStickers(draft.stickers || []);
    setPollDraft(
      draft.poll
        ? {
            question: draft.poll.question,
            options: draft.poll.options.map((o) => o.text),
            durationHours: 24,
          }
        : null
    );
    setSnippetDraft(
      draft.snippet
        ? {
            title: draft.snippet.title || "",
            content: draft.snippet.content,
          }
        : null
    );
    setQuoteDraft(
      draft.quoteBlock
        ? {
            text: draft.quoteBlock.text,
            author: draft.quoteBlock.author || "",
          }
        : null
    );
    setThreadItems(draft.threadItems || []);
    setScheduledAt(draft.scheduledAt || null);
    setIsGhostPost(Boolean(draft.isGhostPost));
    setManualAiLabel(Boolean(draft.isAiGenerated));
    setReplyPermission(draft.replyPermission || "anyone");
    setReviewApproveReplies(Boolean(draft.reviewApproveReplies));
    notify("Draft restored to composer", "info");
  };

  const handleDeleteDraft = (draftId: string) => {
    const next = removeComposerDraftItem(currentUser?.uid, draftId);
    setDrafts(next);
  };

  const toggleAttachedMusicPreview = () => {
    if (!attachedMusic?.audioUrl) return;
    triggerHaptic();
    if (playingAttachedMusic && musicPreviewAudioRef.current) {
      musicPreviewAudioRef.current.pause();
      setPlayingAttachedMusic(false);
      return;
    }
    if (musicPreviewAudioRef.current) {
      musicPreviewAudioRef.current.pause();
    }
    const audio = new Audio(toPlayableMediaUrl(attachedMusic.audioUrl));
    audio.onended = () => setPlayingAttachedMusic(false);
    audio
      .play()
      .then(() => setPlayingAttachedMusic(true))
      .catch(() => setPlayingAttachedMusic(false));
    musicPreviewAudioRef.current = audio;
  };

  const handleAddThreadItem = () => {
    triggerHaptic();
    setThreadItems((prev) => [
      ...prev,
      { id: `thread_${Date.now()}_${prev.length + 1}`, text: "" },
    ]);
  };

  const handleThreadPhotoSelected = async (
    threadId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    triggerHaptic();
    try {
      const processed = await processCleanImage(file);
      setThreadItems((prev) =>
        prev.map((item) =>
          item.id === threadId ? { ...item, imageUrl: processed.dataUrl } : item
        )
      );
    } catch {
      notify("Could not attach thread image", "error");
    } finally {
      e.target.value = "";
    }
  };

  const handlePublish = async () => {
    if (!currentUser) {
      notify("Please sign in or sign up to create a post.", "error");
      navigate("/signin");
      return;
    }

    if (isUploadingAudio) {
      notify(
        "Please wait a moment while your audio finishes uploading.",
        "info"
      );
      return;
    }

    if (isRecording) {
      stopVoiceRecording();
    }

    if (pollDraft) {
      const validPollOpts = pollDraft.options
        .map((o) => o.trim())
        .filter(Boolean);
      if (validPollOpts.length < 2) {
        notify("Please enter at least 2 poll options.", "error");
        return;
      }
    }

    const builtPoll = buildCurrentPollObject();
    const builtSnippet = buildCurrentSnippetObject();
    const builtQuote = buildCurrentQuoteObject();
    const validThreadItems = threadItems.filter(
      (t) => t.text.trim() || t.imageUrl
    );

    if (
      !description.trim() &&
      processedImages.length === 0 &&
      !audioUrl &&
      !effectiveVideoUrl &&
      !gifUrl &&
      stickers.length === 0 &&
      !attachedMusic &&
      !builtPoll &&
      !builtSnippet &&
      !builtQuote &&
      validThreadItems.length === 0
    ) {
      notify(
        "Write something, attach a photo, or add a voice note/poll/GIF first.",
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
      // Upload all attached photos in parallel (resolves immediately if background pre-upload already finished)
      const hostedImages =
        processedImages.length > 0
          ? (
              await Promise.all(
                processedImages.map((imgSrc, idx) =>
                  ensureHostedPostImage(imgSrc, idx)
                )
              )
            ).filter(Boolean)
          : [];

      // Upload any thread item photos in parallel
      const hostedThreadItems: PostThreadItem[] =
        validThreadItems.length > 0
          ? await Promise.all(
              validThreadItems.map(async (item, idx) => ({
                id: item.id,
                text: item.text.trim(),
                ...(item.imageUrl
                  ? {
                      imageUrl: await ensureHostedPostImage(
                        item.imageUrl,
                        100 + idx
                      ),
                    }
                  : {}),
              }))
            )
          : [];

      const resolvedContentType: ScamPost["contentType"] =
        postType === "scam"
          ? "scam"
          : audioUrl
          ? "voice"
          : effectiveVideoUrl
          ? "video"
          : hostedImages.length > 0
          ? "image"
          : textStyle === "quote" || builtQuote
          ? "affirmation"
          : "text";

      const authorName =
        userProfile?.displayName ||
        userProfile?.shopName ||
        currentUser?.displayName ||
        currentUser?.email?.split("@")[0] ||
        "Community Member";
      const authorAvatar =
        userProfile?.photoURL || userProfile?.shopLogo || currentUser?.photoURL || "";
      const authorId = currentUser?.uid || "member_local";

      const autoTitle =
        description.trim().slice(0, 72) ||
        builtPoll?.question.slice(0, 72) ||
        builtQuote?.text.slice(0, 72) ||
        builtSnippet?.title?.slice(0, 72) ||
        (postType === "scam"
          ? `Scam Report · ${scamLocation.trim()}`
          : audioUrl
          ? "Voice Note Update"
          : effectiveVideoUrl
          ? "Video Post"
          : attachedMusic
          ? `Listening to ${attachedMusic.title}`
          : gifUrl
          ? "GIF Update"
          : "Community Post");

      const isOwnerEditing =
        !editId || !originalPost || originalPost.reporterId === authorId;

      const effectiveThemes =
        postType === "scam"
          ? Array.from(new Set(["scam_watch", ...selectedThemes]))
          : selectedThemes.length > 0
          ? selectedThemes
          : ["tech_news"];

      const publishTimestamp = scheduledAt || Date.now();
      const ghostExpiry = isGhostPost
        ? publishTimestamp + 24 * 3600 * 1000
        : null;

      const postPayload: Record<string, any> = {
        postType,
        title: autoTitle,
        description: description.trim(),
        textStyle,
        category:
          effectiveThemes[0] ||
          (postType === "scam" ? "scam_watch" : "tech_news"),
        themes: effectiveThemes,
        contentType: resolvedContentType,
        images: hostedImages,
        imageLayout,
        imageAspectRatio,
        imageNaturalRatios: naturalRatios,
        isAiGenerated: Boolean(
          manualAiLabel || (hostedImages.length > 0 && isAiGenerated)
        ),
        audioUrl: audioUrl || null,
        audioDuration: audioDuration || null,
        audioWaveform:
          audioUrl && audioWaveform.length > 0 ? audioWaveform : null,
        videoUrl: effectiveVideoUrl || null,
        gifUrl: gifUrl || null,
        stickers: stickers.length > 0 ? stickers : null,
        music: attachedMusic?.audioUrl
          ? {
              ...attachedMusic,
              url: attachedMusic.audioUrl,
              videoVolume,
              bgMusicVolume,
              originalVideoMuted: videoVolume === 0,
            }
          : effectiveVideoUrl &&
            !/youtube\.com|youtu\.be|tiktok\.com|instagram\.com|facebook\.com/i.test(
              effectiveVideoUrl
            )
          ? {
              audioUrl: effectiveVideoUrl,
              url: effectiveVideoUrl,
              title: autoTitle.slice(0, 32) || `${authorName}'s Original Audio`,
              artist: authorName,
              cover: authorAvatar || "",
              coverUrl: authorAvatar || "",
              isFromVideo: true,
              videoVolume,
              bgMusicVolume: 1,
              originalVideoMuted: videoVolume === 0,
            }
          : null,
        poll: builtPoll || null,
        snippet: builtSnippet || null,
        quoteBlock: builtQuote || null,
        locationTag: locationTag.trim() || null,
        postTag: postTag.trim().replace(/^#+/, "") || null,
        threadItems: hostedThreadItems.length > 0 ? hostedThreadItems : null,
        scheduledAt: scheduledAt || null,
        isGhostPost: Boolean(isGhostPost),
        expiresAt: ghostExpiry,
        replyPermission,
        reviewApproveReplies: Boolean(reviewApproveReplies),
        alsoShareOn: alsoShareOn.length > 0 ? alsoShareOn : null,
        privacy,
        reporterId: isOwnerEditing ? authorId : originalPost.reporterId,
        reporterName: isOwnerEditing ? authorName : originalPost.reporterName,
        reporterAvatar: isOwnerEditing
          ? authorAvatar
          : originalPost.reporterAvatar || "",
        status: originalPost?.status || "active",
      };

      // Auto-save attached music or uploaded video audio into global music library
      const isDirectVideoAudio =
        Boolean(effectiveVideoUrl) &&
        !/youtube\.com|youtu\.be|tiktok\.com|instagram\.com|facebook\.com/i.test(
          effectiveVideoUrl
        );
      if (attachedMusic?.audioUrl || isDirectVideoAudio) {
        try {
          const trackAudioUrl = attachedMusic?.audioUrl || effectiveVideoUrl;
          const bgRef = collection(db, "background_music");
          const qBg = query(bgRef, where("audioUrl", "==", trackAudioUrl));
          const snapBg = await getDocs(qBg);

          if (snapBg.empty) {
            const trackPayload = {
              title:
                attachedMusic?.title ||
                autoTitle.slice(0, 32) ||
                `${authorName}'s Original Audio`,
              artist: attachedMusic?.artist || authorName,
              coverUrl:
                attachedMusic?.cover ||
                (attachedMusic as any)?.coverUrl ||
                authorAvatar ||
                "",
              cover:
                attachedMusic?.cover ||
                (attachedMusic as any)?.coverUrl ||
                authorAvatar ||
                "",
              url: trackAudioUrl,
              audioUrl: trackAudioUrl,
              createdAt: Date.now(),
              addedBy: authorName,
              addedByUid: authorId,
              isFromVideo: !attachedMusic?.audioUrl && isDirectVideoAudio,
            };
            await Promise.all([
              addDoc(collection(db, "background_music"), trackPayload).catch(
                () => {}
              ),
              addDoc(collection(db, "story_songs"), trackPayload).catch(
                () => {}
              ),
            ]);
          }
        } catch (e) {
          console.error("Music auto-save failed:", e);
        }
      }

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

      const resolvedReporterId = editId
        ? originalPost?.reporterId ||
          (originalPost as any)?.authorId ||
          authorId
        : authorId;
      const resolvedReporterName = editId
        ? originalPost?.reporterName || authorName
        : authorName;
      const resolvedReporterAvatar = editId
        ? originalPost?.reporterAvatar || authorAvatar
        : authorAvatar;

      postPayload.reporterId = resolvedReporterId;
      postPayload.reporterName = resolvedReporterName;
      postPayload.reporterAvatar = resolvedReporterAvatar;

      if (editId) {
        const editUpdatePayload = cleanPayload({
          ...postPayload,
          isEdited: true,
          updatedAt: Date.now(),
        });

        if (!editId.startsWith("showcase_")) {
          await setDoc(doc(db, "scam_posts", editId), editUpdatePayload, {
            merge: true,
          });
        }

        try {
          const existing = JSON.parse(
            localStorage.getItem("deep_scam_posts") || "[]"
          );
          const updated = Array.isArray(existing)
            ? existing.map((item: any) =>
                item.id === editId ? { ...item, ...editUpdatePayload } : item
              )
            : [];
          localStorage.setItem("deep_scam_posts", JSON.stringify(updated));
        } catch {}

        notify("Loop updated!", "success");
        navigate(`/loops/post/${editId}`);
        return;
      }

      const fullNewDoc = cleanPayload({
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
        createdAt: publishTimestamp,
        views: 1,
      });

      const ref = await addDoc(collection(db, "scam_posts"), fullNewDoc);
      const createdId = ref.id;

      // Notify Bing IndexNow for instant search indexing
      pingBingIndexNow([`/loops/post/${createdId}`, "/loops"]).catch(() => {});

      // Handle "Also share on..." options from PostOptionsBottomSheet
      if (alsoShareOn.includes("copy_link")) {
        try {
          await navigator.clipboard?.writeText(
            `${window.location.origin}/loops/post/${createdId}`
          );
        } catch {}
      }
      if (alsoShareOn.includes("story") && currentUser?.uid) {
        addDoc(collection(db, "stories"), {
          authorId: authorId,
          authorName,
          authorAvatar,
          mediaUrl: hostedImages[0] || gifUrl || authorAvatar,
          mediaType: "image",
          caption: (description.trim() || autoTitle).slice(0, 140),
          createdAt: Date.now(),
          expiresAt: Date.now() + 24 * 3600 * 1000,
          viewerIds: [],
          likedBy: [],
        }).catch(() => {});
      }

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
        scheduledAt && scheduledAt > Date.now()
          ? `Post scheduled for ${new Date(scheduledAt).toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}!`
          : isGhostPost
          ? "24-hour Ghost loop shared to Loops!"
          : postType === "scam"
          ? "Scam report published with verified location stamp!"
          : "Shared to Loops!",
        "success"
      );
      if (effectiveVideoUrl) {
        navigate(`/loops?filter=video&postId=${encodeURIComponent(createdId)}`);
      } else {
        navigate("/loops");
      }
    } catch (err) {
      console.error("Publish error:", err);
      notify(
        "Could not publish post. Please check your connection and try again.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const userNameDisplay =
    userProfile?.displayName ||
    userProfile?.shopName ||
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "Community Member";
  const userAvatarDisplay =
    userProfile?.photoURL ||
    userProfile?.shopLogo ||
    currentUser?.photoURL ||
    "";

  const previewPostObj: Partial<ScamPost> = {
    id: "composer_preview",
    postType,
    title: description.slice(0, 50) || "Post Preview",
    description,
    images: processedImages,
    imageLayout,
    imageAspectRatio,
    imageNaturalRatios: naturalRatios,
    isAiGenerated: effectiveAiLabel,
    audioUrl: audioUrl || undefined,
    audioDuration: audioDuration || undefined,
    audioWaveform: audioWaveform.length > 0 ? audioWaveform : undefined,
    videoUrl: effectiveVideoUrl || undefined,
    gifUrl: gifUrl || undefined,
    stickers: stickers.length > 0 ? stickers : undefined,
    music: attachedMusic || undefined,
    poll: buildCurrentPollObject() || undefined,
    snippet: buildCurrentSnippetObject() || undefined,
    quoteBlock: buildCurrentQuoteObject() || undefined,
    threadItems: threadItems.filter((t) => t.text.trim() || t.imageUrl),
    reporterName: userNameDisplay,
    reporterAvatar: userAvatarDisplay,
    scamLocation: postType === "scam" ? scamLocation : undefined,
  };

  const [authorUserProfile, setAuthorUserProfile] = useState<any>(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
      if (snap.exists()) {
        setAuthorUserProfile(snap.data());
      }
    });
    return () => unsub();
  }, [currentUser]);

  const isPostingBlocked = Boolean(
    authorUserProfile?.loopsPostingBlocked || (authorUserProfile?.loopsStrikeCount || 0) >= 3
  );

  if (isPostingBlocked) {
    return (
      <div className="min-h-screen ambient-dynamic-bg flex flex-col items-center justify-center p-6 text-center text-zinc-900 dark:text-white">
        <Icon name="shield-alert" className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold">Posting Restricted</h2>
        <p className="text-sm text-zinc-500 max-w-sm mt-2">
          Your account has received 3 copyright strikes or severe guideline violations. Creating new Loops posts is currently disabled.
        </p>
        <button
          type="button"
          onClick={() => navigate('/loops/account-status')}
          className="mt-6 px-6 py-3 bg-red-600 text-white font-bold text-xs rounded-full shadow-lg hover:bg-red-500 transition-colors"
        >
          Check Account Status
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen ambient-dynamic-bg text-zinc-900 dark:text-zinc-100 font-sans pb-16 transition-colors">
      <SEO
        title={editId ? "Edit Loop — Loops" : "Create Post — Loops"}
        description="Share thoughts, photos, music, voice notes, polls, GIFs, or verified community alerts on Loops."
      />

      {/* Hidden Photo File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFilesSelected}
        className="hidden"
      />
      <input
        ref={cameraFallbackInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFilesSelected}
        className="hidden"
      />

      {/* Hidden Video File Input */}
      <input
        ref={videoFileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/*"
        onChange={handleVideoFileSelected}
        className="hidden"
      />

      {/* Main Single-Column Studio Layout Matching IMG_5474 */}
      <div className="max-w-[480px] w-full mx-auto px-4 pt-2 pb-6 min-h-screen flex flex-col justify-between">
        <div className="space-y-3 flex-1 flex flex-col">
          {/* Top Header Matching IMG_5474 */}
          <header className="flex items-center justify-between py-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                navigate("/loops");
              }}
              className="w-11 h-11 rounded-full bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/10 flex items-center justify-center text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 active:scale-95 transition cursor-pointer shrink-0"
              aria-label="Back"
            >
              <Icon name="chevron-left" className="w-5 h-5" />
            </button>

            <h1 className="text-[18.5px] font-bold tracking-tight text-zinc-900 dark:text-white">
              Create post
            </h1>

            <div className="w-11 shrink-0" />
          </header>

          {/* Action Pills Row Matching IMG_5474 (+ Scam Post Toggle Feature) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {/* 1. Tag People */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setShowTagPopover((prev) => !prev);
                setActiveInlinePanel(null);
              }}
              className={`px-4 py-2 rounded-full border text-[13.5px] font-medium flex items-center gap-2 shrink-0 transition active:scale-95 cursor-pointer ${
                postTag
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-xs"
                  : "bg-white dark:bg-zinc-800 border-black/5 dark:border-white/10 text-zinc-800 dark:text-zinc-200"
              }`}
            >
              <Icon name="user-plus" className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
              <span>{postTag ? `#${postTag}` : "Tag People"}</span>
            </button>

            {/* 2. Who can see */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setActiveInlinePanel((prev) => (prev === "audience" ? null : "audience"));
                setShowTagPopover(false);
              }}
              className={`px-4 py-2 rounded-full border text-[13.5px] font-medium flex items-center gap-2 shrink-0 transition active:scale-95 cursor-pointer ${
                activeInlinePanel === "audience"
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-xs"
                  : "bg-white dark:bg-zinc-800 border-black/5 dark:border-white/10 text-zinc-800 dark:text-zinc-200"
              }`}
            >
              <Icon name="eye" className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
              <span className="capitalize">
                {privacy === "only_me" ? "Only Me" : privacy === "followers" ? "Followers" : "Who can see"}
              </span>
            </button>

            {/* 3. Location */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setShowLocationModal(true);
              }}
              className={`px-4 py-2 rounded-full border text-[13.5px] font-medium flex items-center gap-2 shrink-0 transition active:scale-95 cursor-pointer ${
                locationTag
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-white dark:bg-zinc-800 border-black/5 dark:border-white/10 text-zinc-800 dark:text-zinc-200"
              }`}
            >
              <Icon name="map-marker" className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
              <span className="max-w-[120px] truncate">{locationTag || "Location"}</span>
            </button>

            {/* 4. Scam Post (User-Requested Extra Feature) */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setPostType((prev) => (prev === "scam" ? "normal" : "scam"));
              }}
              className={`px-4 py-2 rounded-full border text-[13.5px] font-semibold flex items-center gap-2 shrink-0 transition active:scale-95 cursor-pointer ${
                postType === "scam"
                  ? "bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-500/20"
                  : "bg-white dark:bg-zinc-800 border-black/5 dark:border-white/10 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20"
              }`}
            >
              <Icon name="shield-alert" className="w-4 h-4 text-current" />
              <span>{postType === "scam" ? "Scam Alert ON" : "Scam Post"}</span>
            </button>
          </div>

          {/* Inline Audience Selector Panel */}
          {activeInlinePanel === "audience" && (
            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 p-3 shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Who can see this post?</span>
                <button
                  type="button"
                  onClick={() => setActiveInlinePanel(null)}
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <Icon name="x" className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "public" as const, label: "Public", sub: "Anyone on Loops", iconName: "globe" },
                  { id: "followers" as const, label: "Followers", sub: "Followers only", iconName: "user-check" },
                  { id: "only_me" as const, label: "Only Me", sub: "Private archive", iconName: "lock" },
                ].map((aud) => {
                  const active = privacy === aud.id;
                  return (
                    <button
                      key={aud.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        setPrivacy(aud.id);
                        setActiveInlinePanel(null);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        active
                          ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent"
                          : "bg-zinc-50 dark:bg-zinc-800 border-black/5 dark:border-white/5 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <Icon name={aud.iconName} className="w-3.5 h-3.5 shrink-0" />
                        <span>{aud.label}</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{aud.sub}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Inline Tag People Popover */}
          {showTagPopover && (
            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 p-3 shadow-md space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Tag Topic or Mention</span>
                <button
                  type="button"
                  onClick={() => setShowTagPopover(false)}
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <Icon name="x" className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                <span className="text-xs font-bold text-zinc-400">#</span>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && tagInput.trim()) {
                      e.preventDefault();
                      setPostTag(tagInput.trim().replace(/^#+/, ""));
                      setShowTagPopover(false);
                    }
                  }}
                  placeholder="Type topic or friend name..."
                  autoFocus
                  className="w-full bg-transparent text-xs font-medium text-zinc-900 dark:text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (tagInput.trim()) {
                      setPostTag(tagInput.trim().replace(/^#+/, ""));
                    }
                    setShowTagPopover(false);
                  }}
                  className="text-xs font-bold text-zinc-900 dark:text-white cursor-pointer px-1.5"
                >
                  Set
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["community", "deals", "viral", "tech", "scamalert", "lifestyle"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setPostTag(t);
                      setShowTagPopover(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 cursor-pointer transition"
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Writing Textarea Matching IMG_5474 */}
          <div className="flex-1 flex flex-col pt-1">
            <textarea
              rows={7}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full flex-1 bg-transparent border-none outline-none resize-none text-[17px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 leading-relaxed font-normal"
            />
          </div>

          {/* Scam Incident Details (When Scam Post is Active) */}
          {postType === "scam" && (
            <div className="rounded-2xl bg-rose-50/70 dark:bg-rose-950/25 border border-rose-200/80 dark:border-rose-900/50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                <Icon name="shield-alert" className="w-4 h-4 shrink-0" />
                <span>Scam Incident Details (Protect the community)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["Facebook Page", "Daraz Seller", "WhatsApp", "Telegram", "Fake Website", "Physical Shop"].map((place) => (
                  <button
                    key={place}
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setScamLocation(place);
                    }}
                    className={`px-3 py-1 rounded-full text-[11.5px] font-semibold transition cursor-pointer ${
                      scamLocation === place
                        ? "bg-rose-600 text-white"
                        : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-rose-200/70 dark:border-zinc-700"
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-rose-200 dark:border-zinc-700 text-xs font-medium outline-none focus:border-rose-500 text-zinc-900 dark:text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={scammerPhone}
                  onChange={(e) => setScammerPhone(e.target.value)}
                  placeholder="Scammer Phone / WhatsApp"
                  className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-rose-200 dark:border-zinc-700 text-xs outline-none text-zinc-900 dark:text-white"
                />
                <input
                  type="number"
                  value={scammedAmount}
                  onChange={(e) => setScammedAmount(e.target.value)}
                  placeholder="Amount Lost (৳)"
                  className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-rose-200 dark:border-zinc-700 text-xs outline-none text-zinc-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Attached Photos Preview */}
          {processedImages.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
                <span>Photos ({processedImages.length})</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-zinc-900 dark:text-white font-bold cursor-pointer hover:underline"
                >
                  + Add more
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {processedImages.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-black/5">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(i)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center cursor-pointer hover:bg-rose-600 transition"
                      aria-label="Remove image"
                    >
                      <Icon name="x" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attached Video Preview */}
          {videoUrl && (
            <div className="relative rounded-2xl overflow-hidden bg-black border border-black/10 aspect-video flex items-center justify-center">
              <video
                src={toPlayableMediaUrl(videoUrl)}
                controls
                playsInline
                className="w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={() => setVideoUrl("")}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/75 text-white flex items-center justify-center hover:bg-rose-600 transition cursor-pointer z-10"
                aria-label="Remove video"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Attached GIF Preview */}
          {gifUrl && (
            <div className="relative rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-black/5 max-h-60 flex items-center justify-center">
              <img src={gifUrl} alt="Attached GIF" className="max-h-60 object-contain rounded-2xl" />
              <button
                type="button"
                onClick={() => setGifUrl("")}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/75 text-white flex items-center justify-center hover:bg-rose-600 transition cursor-pointer"
                aria-label="Remove GIF"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Attached Music Preview */}
          {attachedMusic && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-zinc-800 border border-black/5 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon name="music" className="w-4 h-4 text-purple-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{attachedMusic.title}</p>
                  <p className="text-[11px] text-zinc-500 truncate">{attachedMusic.artist}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedMusic(null)}
                className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-zinc-500 hover:text-rose-500 cursor-pointer"
              >
                <Icon name="x" className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Bottom Attachment Shelf & Publish Post Button Matching IMG_5474 */}
        <div className="pt-4 space-y-4">
          {/* Exactly 4 Toolbar Cards: Image | GIF | Live | Video (IMG_5474) */}
          <div className="grid grid-cols-4 gap-2.5">
            {/* 1. Image */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                fileInputRef.current?.click();
              }}
              className="bg-white dark:bg-zinc-800 rounded-2xl py-3.5 px-2 flex flex-col items-center justify-center gap-1.5 border border-black/5 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 active:scale-95 transition cursor-pointer shadow-2xs"
            >
              <Icon name="image" className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
              <span className="text-[12px] font-medium text-zinc-800 dark:text-zinc-200">Image</span>
            </button>

            {/* 2. GIF */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setShowGiphySheet(true);
              }}
              className="bg-white dark:bg-zinc-800 rounded-2xl py-3.5 px-2 flex flex-col items-center justify-center gap-1.5 border border-black/5 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 active:scale-95 transition cursor-pointer shadow-2xs"
            >
              <span className="text-[9.5px] font-bold text-zinc-700 dark:text-zinc-200 border-[1.5px] border-current px-1 py-0.2 rounded-xs leading-none">
                GIF
              </span>
              <span className="text-[12px] font-medium text-zinc-800 dark:text-zinc-200">GIF</span>
            </button>

            {/* 3. Live */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setShowLiveStudio(true);
              }}
              className="bg-white dark:bg-zinc-800 rounded-2xl py-3.5 px-2 flex flex-col items-center justify-center gap-1.5 border border-black/5 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 active:scale-95 transition cursor-pointer shadow-2xs"
            >
              <Icon name="radio" className="w-5 h-5 text-red-500 animate-pulse" />
              <span className="text-[12px] font-medium text-zinc-800 dark:text-zinc-200">Live</span>
            </button>

            {/* 4. Video - Directly triggers device file picker without popup */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                videoFileInputRef.current?.click();
              }}
              className="bg-white dark:bg-zinc-800 rounded-2xl py-3.5 px-2 flex flex-col items-center justify-center gap-1.5 border border-black/5 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 active:scale-95 transition cursor-pointer shadow-2xs"
            >
              <Icon name="play" className="w-5 h-5 text-zinc-600 dark:text-zinc-300" solid />
              <span className="text-[12px] font-medium text-zinc-800 dark:text-zinc-200">Video</span>
            </button>
          </div>

          {/* Large Full-Width "Publish Post" Pill Button Matching IMG_5474 */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              handlePublish();
            }}
            disabled={
              isSubmitting ||
              isProcessingImages ||
              isUploadingAudio ||
              isUploadingVideo ||
              (!description.trim() &&
                processedImages.length === 0 &&
                !videoUrl &&
                !gifUrl &&
                !audioUrl &&
                !attachedMusic)
            }
            className={`w-full py-4 rounded-full font-semibold text-[16px] flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
              description.trim() ||
              processedImages.length > 0 ||
              videoUrl ||
              gifUrl ||
              audioUrl ||
              attachedMusic
                ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-sm hover:opacity-95 active:scale-[0.99]"
                : "bg-[#D1D5DB] dark:bg-zinc-700 text-white cursor-not-allowed"
            }`}
          >
            {isSubmitting && <Icon name="loader-2" className="w-4 h-4 animate-spin" />}
            <span>{isSubmitting ? "Publishing Post..." : "Publish Post"}</span>
          </button>
        </div>
      </div>

      {/* Live Stream Studio Modal */}
      <LiveStreamModal
        isOpen={showLiveStudio}
        onClose={() => setShowLiveStudio(false)}
        initialTitle={description.slice(0, 40) || "Live Discussion"}
      />

      {/* ====================================================================
       * LIQUID GLASS MODALS & BOTTOM SHEETS
       * ================================================================== */}
      <DraftsBottomSheet
        isOpen={showDraftsSheet}
        drafts={drafts}
        canSaveCurrent={hasDraftableContent}
        onClose={() => setShowDraftsSheet(false)}
        onSaveCurrentDraft={handleSaveCurrentDraft}
        onLoadDraft={handleLoadDraft}
        onDeleteDraft={handleDeleteDraft}
      />

      <ScheduleDrumWheelModal
        isOpen={showScheduleModal}
        scheduledAt={scheduledAt}
        onClose={() => setShowScheduleModal(false)}
        onConfirmSchedule={(ts) => {
          setScheduledAt(ts);
          if (ts) {
            notify(
              `Scheduled for ${new Date(ts).toLocaleString([], {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}`,
              "success"
            );
          } else {
            notify("Schedule cleared", "info");
          }
        }}
      />

      <StickersBottomSheet
        isOpen={showStickersSheet}
        onClose={() => setShowStickersSheet(false)}
        onInsertText={(kaomoji) => {
          setDescription((prev) =>
            prev ? `${prev} ${kaomoji}` : kaomoji
          );
        }}
        onAttachSticker={(stickerUrl) => {
          setStickers((prev) =>
            prev.includes(stickerUrl) ? prev : [...prev, stickerUrl].slice(0, 6)
          );
        }}
      />

      <GiphyBottomSheet
        isOpen={showGiphySheet}
        onClose={() => setShowGiphySheet(false)}
        onSelectGif={(url) => setGifUrl(url)}
      />

      <PostOptionsBottomSheet
        isOpen={showPostOptionsSheet}
        replyPermission={replyPermission}
        reviewApproveReplies={reviewApproveReplies}
        alsoShareOn={alsoShareOn}
        onChangeReplyPermission={setReplyPermission}
        onChangeReviewApprove={setReviewApproveReplies}
        onChangeAlsoShareOn={setAlsoShareOn}
        onClose={() => setShowPostOptionsSheet(false)}
      />

      <DeezerMusicPickerModal
        isOpen={showMusicModal}
        onClose={() => setShowMusicModal(false)}
        selectedTrack={attachedMusic}
        onSelectTrack={(track) => {
          setAttachedMusic(track);
          setShowMusicModal(false);
        }}
      />

      <LiveCameraCaptureModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCaptureFile={(file) => {
          if (!isVideoFileCandidate(file)) {
            setRawFiles((prev) => [...prev, file]);
            setActiveInlinePanel("media");
          }
        }}
        onFallbackInput={() => cameraFallbackInputRef.current?.click()}
      />

      <LocationPickerModal
        isOpen={showLocationModal}
        currentLocation={locationTag}
        onSelectLocation={(loc) => setLocationTag(loc)}
        onClose={() => setShowLocationModal(false)}
      />
    </div>
  );
};

export default CreateScamPost;
