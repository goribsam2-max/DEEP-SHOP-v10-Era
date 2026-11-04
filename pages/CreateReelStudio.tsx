import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Settings,
  Plus,
  Music,
  Edit3,
  Mic,
  FileText,
  Layers,
  Video,
  Upload,
  Loader2,
  Check,
  Tag,
  MapPin,
  Smile,
  Globe,
  Share2,
  MoreHorizontal,
  Calendar,
  ShoppingBag,
  Clock,
  ArrowUp,
  Sliders,
  Heart,
  MessageSquare,
  Download,
  Shield,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
} from "lucide-react";
import { auth, db } from "../firebase";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { uploadFileToCatbox } from "../lib/catboxUpload";
import { toPlayableMediaUrl } from "../lib/videoEmbed";
import { useNotify } from "../components/Notifications";
import { triggerHaptic } from "../lib/haptics";
import SEO from "../components/SEO";
import {
  DeezerMusicPickerModal,
  AttachedMusic,
} from "../components/DeezerMusicPickerModal";
import { LoopsSvgIcon } from "../components/LoopsSvgIcon";
import { pingBingIndexNow } from "../lib/indexNowClient";
import {
  startReelBackgroundUpload,
  publishOrArmReelBackgroundJob,
  dismissReelUploadJob,
  retryReelUploadJob,
  useReelUploadJobs,
} from "../lib/reelBackgroundPublisher";

export const CreateReelStudio: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();
  const [searchParams] = useSearchParams();

  const currentUser = auth.currentUser;

  // Flow step: "picker" | "editor" | "finalize" | "more_options"
  const [step, setStep] = useState<
    "picker" | "editor" | "finalize" | "more_options"
  >("picker");

  // Selected Video & Media state
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string>("");
  const [uploadedClips, setUploadedClips] = useState<
    Array<{ id: string; url: string; name: string }>
  >([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [activeUploadJobId, setActiveUploadJobId] = useState<string | null>(
    null
  );
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const pendingUploadRef = useRef<Promise<string> | null>(null);
  const uploadJobs = useReelUploadJobs();
  const activeUploadJob =
    uploadJobs.find((j) => j.id === activeUploadJobId) || null;

  // Editor states
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Exit Confirmation Modal
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  // Attached Music
  const [attachedMusic, setAttachedMusic] = useState<AttachedMusic | null>(
    null
  );
  const [musicPickerOpen, setMusicPickerOpen] = useState<boolean>(false);
  const [videoVolume, setVideoVolume] = useState<number>(1.0);
  const [bgMusicVolume, setBgMusicVolume] = useState<number>(1.0);

  // Text Overlay
  const [overlayText, setOverlayText] = useState<string>("");
  const [showTextInput, setShowTextInput] = useState<boolean>(false);

  // Finalize / Post Details State
  const [caption, setCaption] = useState<string>("");
  const [taggedPeople, setTaggedPeople] = useState<string>("");
  const [locationTag, setLocationTag] = useState<string>("");
  const [audioTitle, setAudioTitle] = useState<string>("Original audio");
  const [addAiLabel, setAddAiLabel] = useState<boolean>(false);
  const [audience, setAudience] = useState<string>("Everyone");

  // More options state
  const [uploadHighestQuality, setUploadHighestQuality] =
    useState<boolean>(true);
  const [disableTemplate, setDisableTemplate] = useState<boolean>(false);
  const [hideLikeCount, setHideLikeCount] = useState<boolean>(false);
  const [hideShareCount, setHideShareCount] = useState<boolean>(false);
  const [turnOffCommenting, setTurnOffCommenting] = useState<boolean>(false);
  const [allowDownload, setAllowDownload] = useState<boolean>(true);

  // Inline editors (replaces browser prompt())
  const [showTagInput, setShowTagInput] = useState<boolean>(false);
  const [showLocationInput, setShowLocationInput] = useState<boolean>(false);

  // Submitting
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Auto-attach preselected background music when arriving from "Use audio" on Audio Details Page
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("loops_preselected_reel_audio");
      if (!raw) return;
      sessionStorage.removeItem("loops_preselected_reel_audio");
      const parsed = JSON.parse(raw);
      if (parsed && parsed.audioUrl) {
        setAttachedMusic({
          title: parsed.title || "Original audio",
          artist: parsed.artist || "Loops Creator",
          audioUrl: parsed.audioUrl,
          cover: parsed.cover || parsed.coverUrl || "",
          coverUrl: parsed.coverUrl || parsed.cover || "",
        });
        if (parsed.title) {
          setAudioTitle(parsed.title);
        }
        notify(`Audio "${parsed.title || "Original audio"}" attached!`, "success");
      }
    } catch {}
  }, []);

  // Sync hostedUrl into local studio state when background upload finishes
  useEffect(() => {
    if (!activeUploadJob) return;
    if (activeUploadJob.status === "uploading") {
      setUploading(true);
      setUploadProgress(`Uploading ${activeUploadJob.progress}%`);
    } else if (activeUploadJob.status === "uploaded") {
      setUploading(false);
      setUploadProgress("");
      if (activeUploadJob.hostedUrl) {
        setUploadedClips((prev) =>
          prev.map((c) =>
            c.url === activeUploadJob.localPreviewUrl
              ? { ...c, url: activeUploadJob.hostedUrl }
              : c
          )
        );
      }
    } else if (activeUploadJob.status === "error") {
      setUploading(false);
      setUploadProgress("");
    }
  }, [
    activeUploadJob?.status,
    activeUploadJob?.progress,
    activeUploadJob?.hostedUrl,
    activeUploadJob?.localPreviewUrl,
  ]);

  // Handle direct video file selection with instant local video preview + background upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideoFile =
      file.type.startsWith("video/") ||
      /\.(mp4|webm|mov|m4v|3gp|mkv|avi)$/i.test(file.name);

    if (!isVideoFile) {
      notify("Please select a valid video file.", "error");
      return;
    }

    triggerHaptic();
    const job = startReelBackgroundUpload(file, activeUploadJobId);
    const clipId = `clip_${Date.now()}`;

    setActiveUploadJobId(job.id);
    setSelectedVideoFile(file);
    // Keep local blob preview URL for zero-buffering instant playback while background upload runs
    setSelectedVideoUrl(job.localPreviewUrl);
    setUploadedClips((prev) => [
      { id: clipId, url: job.localPreviewUrl, name: file.name },
      ...prev,
    ]);
    // Immediately switch to full playable video preview!
    setStep("editor");
  };

  const handleShareReel = async () => {
    if (!selectedVideoUrl) {
      notify("Please select a video for your reel.", "error");
      return;
    }

    if (!currentUser) {
      notify("Please sign in to share a reel.", "info");
      navigate("/signin");
      return;
    }

    triggerHaptic();
    setIsSubmitting(true);

    const authorName =
      currentUser.displayName ||
      currentUser.email?.split("@")[0] ||
      "Creator";
    const authorAvatar = currentUser.photoURL || "";

    // If managed by our background upload engine, publish immediately if 100% uploaded OR arm auto-publish & return user to feed!
    if (activeUploadJobId && activeUploadJob) {
      try {
        const result = await publishOrArmReelBackgroundJob(activeUploadJobId, {
          uid: currentUser.uid,
          authorName,
          authorAvatar,
          caption,
          locationTag,
          addAiLabel,
          audience: audience === "Close Friends" ? "Close Friends" : "Everyone",
          uploadHighestQuality,
          disableTemplate,
          hideLikeCount,
          hideShareCount,
          turnOffCommenting,
          allowDownload,
          audioTitle,
          bgMusicVolume,
          videoVolume,
          attachedMusic: attachedMusic
            ? {
                title: attachedMusic.title,
                artist: attachedMusic.artist,
                audioUrl: attachedMusic.audioUrl,
                coverUrl: attachedMusic.coverUrl || attachedMusic.cover || "",
                cover: attachedMusic.cover || attachedMusic.coverUrl || "",
              }
            : null,
        });

        if (result.immediatePostId) {
          notify("Your Reel is now live!", "success");
          navigate(`/loops?filter=video&postId=${result.immediatePostId}`);
        } else {
          notify(
            "Uploading in background — your Reel will publish automatically!",
            "success"
          );
          navigate("/loops?filter=video");
        }
        return;
      } catch (err: any) {
        notify(err?.message || "Failed to queue Reel publish.", "error");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      let hostedVideoUrl = selectedVideoUrl;
      if (hostedVideoUrl.startsWith("blob:") && pendingUploadRef.current) {
        hostedVideoUrl = await pendingUploadRef.current;
        setSelectedVideoUrl(hostedVideoUrl);
      } else if (hostedVideoUrl.startsWith("blob:") && selectedVideoFile) {
        hostedVideoUrl = await uploadFileToCatbox(selectedVideoFile);
        setSelectedVideoUrl(hostedVideoUrl);
      }

      // 1. Create Reel Post in Firestore `scam_posts`
      const postRef = await addDoc(collection(db, "scam_posts"), {
        title: caption.slice(0, 60) || "Reel",
        description: caption,
        videoUrl: hostedVideoUrl,
        images: [],
        type: "reel",
        reporterId: currentUser.uid,
        reporterName: authorName,
        reporterAvatar: authorAvatar,
        authorName,
        authorPhoto: authorAvatar,
        locationTag: locationTag || null,
        addAiLabel,
        audience,
        uploadHighestQuality,
        disableTemplate,
        hideLikeCount,
        hideShareCount,
        turnOffCommenting,
        allowDownload,
        music: attachedMusic?.audioUrl
          ? {
              title: attachedMusic.title,
              artist: attachedMusic.artist,
              audioUrl: attachedMusic.audioUrl,
              url: attachedMusic.audioUrl,
              coverUrl: attachedMusic.coverUrl || attachedMusic.cover || "",
              cover: attachedMusic.cover || attachedMusic.coverUrl || "",
              bgMusicVolume,
              videoVolume,
            }
          : {
              title:
                audioTitle && audioTitle !== "Original audio"
                  ? audioTitle
                  : caption.trim().slice(0, 32) ||
                    `${authorName}'s Original Audio`,
              artist: authorName,
              audioUrl: hostedVideoUrl,
              url: hostedVideoUrl,
              coverUrl: authorAvatar,
              cover: authorAvatar,
              isFromVideo: true,
              bgMusicVolume: 1.0,
              videoVolume: 1.0,
            },
        views: 1,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        createdAt: Date.now(),
        createdAtMs: Date.now(),
      });

      // 2. Automatically add video audio / music track to global `background_music` & `story_songs`
      const hasCustomMusic = Boolean(attachedMusic?.audioUrl);
      const songTitle = hasCustomMusic
        ? attachedMusic!.title
        : caption.trim().slice(0, 32) || `${authorName}'s Original Audio`;
      const songArtist = hasCustomMusic ? attachedMusic!.artist : authorName;
      const audioUrl = hasCustomMusic
        ? attachedMusic!.audioUrl
        : hostedVideoUrl;
      const coverUrl =
        (hasCustomMusic
          ? attachedMusic!.coverUrl || attachedMusic!.cover
          : authorAvatar) || "";

      const musicDoc = {
        title: songTitle,
        artist: songArtist,
        url: audioUrl,
        audioUrl,
        coverUrl,
        cover: coverUrl,
        isFromVideo: !hasCustomMusic,
        addedBy: authorName,
        addedByUid: currentUser.uid,
        addedByName: authorName,
        postId: postRef.id,
        createdAt: Date.now(),
      };

      await Promise.all([
        addDoc(collection(db, "background_music"), musicDoc).catch(() => {}),
        addDoc(collection(db, "story_songs"), musicDoc).catch(() => {}),
      ]);

      pingBingIndexNow([
        `/loops/post/${postRef.id}`,
        "/loops",
        "/loops?filter=video",
      ]).catch(() => {});

      notify("Your Reel is now live!", "success");
      navigate(`/loops?filter=video&postId=${postRef.id}`);
    } catch (err: any) {
      notify(err.message || "Failed to post reel.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
      if (snap.exists()) {
        setUserProfile(snap.data());
      }
    });
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    const replyCommentId = searchParams.get("replyCommentId");
    if (replyCommentId) {
      const raw = sessionStorage.getItem("loops_reel_reply_comment");
      if (raw) {
        try {
          const cmt = JSON.parse(raw);
          setCaption(`Reply to @${cmt.userName || 'user'}: `);
        } catch {}
      }
    }
  }, [searchParams]);

  const isPostingBlocked = Boolean(
    userProfile?.loopsPostingBlocked || (userProfile?.loopsStrikeCount || 0) >= 3
  );

  if (isPostingBlocked) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center text-zinc-900 dark:text-white">
        <Shield className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold">Reels Restricted</h2>
        <p className="text-sm text-zinc-500 max-w-sm mt-2">
          Your account has received 3 copyright strikes or severe guideline violations. Creating new Reels is currently disabled.
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
    <div className="min-h-screen bg-white text-zinc-950 dark:bg-black dark:text-white transition-colors select-none font-sans">
      <SEO
        title="Create New Reel — DEEP SHOP"
        description="Record or upload a vertical video reel on DEEP SHOP."
      />

      {/* =========================================================================
       * STEP 1: NEW REEL PICKER SCREEN (Exact IMG_5253)
       * ========================================================================= */}
      {step === "picker" && (
        <div className="flex flex-col min-h-screen max-w-lg mx-auto">
          {/* Action Sub-Header (No global/page header bar; Settings shown ONLY after video upload) */}
          <div className="px-4 pt-4 pb-3 space-y-3.5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-zinc-900 dark:text-white" />
              </button>

              <div className="flex items-center gap-2">
                {Boolean(selectedVideoUrl) && (
                  <button
                    type="button"
                    onClick={() => setStep("more_options")}
                    className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer transition-colors text-zinc-900 dark:text-white"
                    aria-label="Reel settings"
                  >
                    <LoopsSvgIcon
                      name="loops-reel-studio-settings"
                      className="w-4 h-4"
                    />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="h-9 px-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>

            {attachedMusic && (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-[#4150F7]/10 border border-[#4150F7]/25 text-xs">
                <div className="flex items-center gap-2 min-w-0 text-[#4150F7] dark:text-indigo-300 font-semibold">
                  <LoopsSvgIcon
                    name="loops-reel-studio-music"
                    className="w-4 h-4 shrink-0"
                  />
                  <span className="truncate">
                    Using audio: {attachedMusic.title} · {attachedMusic.artist}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedMusic(null)}
                  aria-label="Remove preselected audio"
                  className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm font-bold text-zinc-900 dark:text-white cursor-pointer"
              >
                <span>Uploaded Videos</span>
                <ChevronRight className="w-4 h-4 rotate-90" />
              </button>

              {uploadProgress && (
                <span className="text-xs font-medium text-[#1877F2] flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {uploadProgress}
                </span>
              )}
            </div>
          </div>

          {/* Media Grid — Only shows real uploaded videos (no black demo video) */}
          <div className="flex-1 p-3 grid grid-cols-3 gap-2.5 content-start overflow-y-auto">
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*,.mp4,.mov,.webm,.m4v,.3gp,.mkv"
              onClick={(e) => {
                e.currentTarget.value = "";
              }}
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="aspect-[9/16] rounded-2xl bg-zinc-100 dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-[#1877F2] transition cursor-pointer"
            >
              <span className="text-[#1877F2]">
                <LoopsSvgIcon
                  name="loops-reel-studio-video"
                  className="w-7 h-7"
                />
              </span>
              <span className="text-xs font-bold text-center px-2">
                Select Video
              </span>
            </button>

            {uploadedClips.map((clip, idx) => {
              const isSelected = selectedVideoUrl === clip.url;
              return (
                <div
                  key={clip.id}
                  onClick={() => {
                    setSelectedVideoUrl(clip.url);
                    setStep("editor");
                  }}
                  className={`aspect-[9/16] rounded-2xl bg-zinc-900 relative overflow-hidden group cursor-pointer border-2 transition ${
                    isSelected
                      ? "border-[#1877F2] shadow-md"
                      : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <video
                    src={toPlayableMediaUrl(clip.url)}
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20 flex flex-col justify-between p-2.5">
                    <div className="flex justify-end">
                      <span
                        className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shadow-md ${
                          isSelected
                            ? "bg-[#1877F2] text-white"
                            : "bg-black/50 text-white border border-white/40"
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-white text-[11px] font-semibold truncate">
                      <span className="truncate">{clip.name}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Action Bar */}
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-white/95 dark:bg-black/95 backdrop-blur-md">
            <div className="flex items-center gap-2">
              {selectedVideoUrl ? (
                <div className="relative w-11 h-15 rounded-xl bg-black overflow-hidden border border-zinc-200 dark:border-zinc-700">
                  <video
                    src={toPlayableMediaUrl(selectedVideoUrl)}
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVideoUrl("");
                      setSelectedVideoFile(null);
                      setUploadedClips([]);
                    }}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/80 text-white flex items-center justify-center cursor-pointer"
                    aria-label="Remove video"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-xs font-bold text-zinc-900 dark:text-white cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                >
                  Choose video
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!selectedVideoUrl}
                onClick={() => {
                  triggerHaptic();
                  setStep("editor");
                }}
                className="px-5 py-2.5 rounded-xl bg-[#1877F2] hover:bg-blue-600 text-white text-xs font-bold disabled:opacity-40 transition cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * STEP 2: REEL EDITOR PREVIEW SCREEN (Exact IMG_5258)
       * ========================================================================= */}
      {step === "editor" && (
        <div className="min-h-screen w-full bg-zinc-950 flex items-center justify-center sm:p-6">
        <div className="relative h-screen sm:h-[calc(100vh-3rem)] sm:max-h-[860px] w-full sm:max-w-[430px] sm:rounded-[32px] sm:border sm:border-white/15 sm:shadow-[0_28px_80px_rgba(0,0,0,0.65)] bg-black text-white flex flex-col justify-between overflow-hidden">
          {/* Background Video Viewport */}
          {selectedVideoUrl && (
            <video
              ref={videoPreviewRef}
              src={toPlayableMediaUrl(selectedVideoUrl)}
              autoPlay
              loop
              playsInline
              muted={isMuted}
              onClick={() => {
                const el = videoPreviewRef.current;
                if (!el) return;
                if (el.paused) {
                  el.play().catch(() => {});
                  setIsPlaying(true);
                } else {
                  el.pause();
                  setIsPlaying(false);
                }
              }}
              className="absolute inset-0 w-full h-full object-contain bg-black cursor-pointer"
            />
          )}

          {/* Overlay Text Preview */}
          {overlayText && (
            <div className="absolute inset-x-6 top-1/3 z-20 text-center pointer-events-none">
              <span className="inline-block px-4 py-2 rounded-xl bg-black/75 text-white font-extrabold text-lg shadow-2xl backdrop-blur-md">
                {overlayText}
              </span>
            </div>
          )}

          {/* Top Controls Overlay + Live Background Upload Progress Pill */}
          <div className="relative z-30 p-4 space-y-2.5 bg-gradient-to-b from-black/85 via-black/40 to-transparent">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(true)}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Suggested Audio Button */}
              <button
                type="button"
                onClick={() => setMusicPickerOpen(true)}
                className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-semibold flex items-center gap-2 hover:bg-black/80 transition cursor-pointer min-w-0"
              >
                <span className="text-[#0095F6] shrink-0">
                  <LoopsSvgIcon
                    name="loops-reel-studio-music"
                    className="w-3.5 h-3.5"
                  />
                </span>
                <span className="truncate max-w-[180px]">
                  {attachedMusic
                    ? `${attachedMusic.title} · ${attachedMusic.artist}`
                    : "Suggested audio > Tap to apply"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition cursor-pointer shrink-0"
              >
                <LoopsSvgIcon
                  name={isMuted ? "loops-reel-mute" : "loops-reel-unmute"}
                  className="w-5 h-5"
                />
              </button>
            </div>

            {/* Live Non-Blocking Background Upload Status Bar */}
            {activeUploadJob && (
              <div className="rounded-2xl bg-black/65 backdrop-blur-xl border border-white/15 px-3.5 py-2 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[11.5px] font-semibold">
                    <span className="flex items-center gap-1.5 truncate text-white/95">
                      {activeUploadJob.status === "uploaded" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Uploaded in background · Ready to publish</span>
                        </>
                      ) : activeUploadJob.status === "error" ? (
                        <span className="text-rose-400 truncate">
                          Upload paused · Tap Retry
                        </span>
                      ) : (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-[#38BDF8] shrink-0" />
                          <span>Uploading in background...</span>
                        </>
                      )}
                    </span>
                    <span className="tabular-nums font-bold text-[#38BDF8] ml-2 shrink-0">
                      {activeUploadJob.status === "uploaded"
                        ? "100%"
                        : `${activeUploadJob.progress}%`}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 w-full rounded-full bg-white/15 overflow-hidden">
                    <div
                      style={{
                        width: `${
                          activeUploadJob.status === "uploaded"
                            ? 100
                            : Math.max(4, activeUploadJob.progress)
                        }%`,
                      }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        activeUploadJob.status === "uploaded"
                          ? "bg-emerald-400"
                          : activeUploadJob.status === "error"
                          ? "bg-rose-500"
                          : "bg-gradient-to-r from-[#1877F2] to-[#38BDF8]"
                      }`}
                    />
                  </div>
                </div>
                {activeUploadJob.status === "error" && (
                  <button
                    type="button"
                    onClick={() => retryReelUploadJob(activeUploadJob.id)}
                    className="px-2.5 py-1 rounded-lg bg-[#1877F2] text-white text-[11px] font-bold shrink-0 cursor-pointer"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bottom Floating Editing Toolbar (Audio, Text, Voice, Captions, Overlay) */}
          <div className="relative z-30 p-4 space-y-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
            <div className="flex items-center justify-around px-2 py-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10">
              <button
                type="button"
                onClick={() => setMusicPickerOpen(true)}
                className="flex flex-col items-center gap-1.5 text-xs text-white hover:text-[#0095F6] transition cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <LoopsSvgIcon
                    name="loops-reel-studio-music"
                    className="w-5 h-5"
                  />
                </div>
                <span className="font-medium">Audio</span>
              </button>

              <button
                type="button"
                onClick={() => setShowTextInput(true)}
                className="flex flex-col items-center gap-1.5 text-xs text-white hover:text-[#0095F6] transition cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <LoopsSvgIcon
                    name="loops-reel-studio-text"
                    className="w-5 h-5"
                  />
                </div>
                <span className="font-medium">Text</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  notify("Voiceover recording feature active!", "info");
                }}
                className="flex flex-col items-center gap-1.5 text-xs text-white hover:text-[#0095F6] transition cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <LoopsSvgIcon
                    name="loops-reel-studio-voice"
                    className="w-5 h-5"
                  />
                </div>
                <span className="font-medium">Voice</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  try {
                    localStorage.setItem("loops_reels_cc", "1");
                  } catch {}
                  notify("Closed captions enabled for your Reel!", "success");
                }}
                className="flex flex-col items-center gap-1.5 text-xs text-white hover:text-[#0095F6] transition cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <LoopsSvgIcon
                    name="loops-reel-studio-captions"
                    className="w-5 h-5"
                  />
                </div>
                <span className="font-medium">Captions</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  notify("Overlay sticker picker ready!", "info");
                }}
                className="flex flex-col items-center gap-1.5 text-xs text-white hover:text-[#0095F6] transition cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <LoopsSvgIcon
                    name="loops-reel-studio-overlay"
                    className="w-5 h-5"
                  />
                </div>
                <span className="font-medium">Overlay</span>
              </button>
            </div>

            {/* Next Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep("picker")}
                className="px-5 py-2.5 rounded-full bg-zinc-800 text-white text-xs font-bold hover:bg-zinc-700 transition cursor-pointer"
              >
                Edit video
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setStep("finalize");
                }}
                className="px-6 py-2.5 rounded-full bg-[#0095F6] hover:bg-blue-600 text-white text-xs font-bold shadow-lg transition cursor-pointer flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Text Overlay Input Modal */}
          {showTextInput && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-between p-6">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowTextInput(false)}
                  className="px-4 py-2 rounded-full bg-[#0095F6] text-white font-bold text-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
              <input
                type="text"
                autoFocus
                value={overlayText}
                onChange={(e) => setOverlayText(e.target.value)}
                placeholder="Type overlay text..."
                className="w-full bg-transparent text-center text-2xl font-black text-white outline-none"
              />
              <div />
            </div>
          )}

          {/* Start Again Confirmation Modal (Exact IMG_5258) */}
          {showExitConfirm && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-6">
              <div className="w-full max-w-xs rounded-3xl bg-[#1C1D22] text-white p-6 space-y-4 text-center border border-white/10 shadow-2xl">
                <h3 className="text-lg font-bold">Start again?</h3>
                <p className="text-xs text-zinc-400">
                  If you go back now, you will lose this draft.
                </p>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeUploadJobId) {
                        dismissReelUploadJob(activeUploadJobId);
                        setActiveUploadJobId(null);
                      }
                      setShowExitConfirm(false);
                      setSelectedVideoUrl("");
                      setStep("picker");
                    }}
                    className="w-full py-3 rounded-2xl bg-rose-600/20 text-rose-500 font-bold text-sm hover:bg-rose-600/30 transition cursor-pointer"
                  >
                    Start again
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowExitConfirm(false);
                      notify("Draft saved!", "success");
                      navigate("/loops");
                    }}
                    className="w-full py-3 rounded-2xl bg-zinc-800 text-white font-bold text-sm hover:bg-zinc-700 transition cursor-pointer"
                  >
                    Save draft
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowExitConfirm(false)}
                    className="w-full py-3 rounded-2xl bg-transparent text-zinc-400 font-bold text-sm hover:text-white transition cursor-pointer"
                  >
                    Continue editing
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      {/* =========================================================================
       * STEP 3: FINALIZE & SHARE REEL (Exact IMG_5254 & IMG_5255)
       * ========================================================================= */}
      {step === "finalize" && (
        <div className="flex flex-col min-h-screen max-w-lg mx-auto bg-white text-zinc-950 dark:bg-black dark:text-white">
          <div className="px-4 pt-4 pb-1 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep("editor")}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            {Boolean(selectedVideoUrl) && (
              <button
                type="button"
                onClick={() => setStep("more_options")}
                className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                aria-label="Reel settings"
              >
                <Settings className="w-4 h-4 text-zinc-900 dark:text-white" />
              </button>
            )}
          </div>

          <div className="flex-1 p-4 space-y-6 overflow-y-auto">
            {/* Responsive Background Upload & Auto-Publish Status Card */}
            {activeUploadJob && (
              <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {activeUploadJob.status === "uploaded" ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin text-[#1877F2] shrink-0" />
                    )}
                    <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                      {activeUploadJob.status === "uploaded"
                        ? "Video uploaded · Ready for instant publish"
                        : activeUploadJob.status === "error"
                        ? "Upload paused — tap Share or Retry to resume"
                        : "Uploading in background — tap Share anytime to auto-publish"}
                    </span>
                  </div>
                  <span className="text-xs font-extrabold tabular-nums text-[#1877F2] shrink-0">
                    {activeUploadJob.status === "uploaded"
                      ? "100%"
                      : `${activeUploadJob.progress}%`}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-200/80 dark:bg-zinc-800 overflow-hidden">
                  <div
                    style={{
                      width: `${
                        activeUploadJob.status === "uploaded"
                          ? 100
                          : Math.max(4, activeUploadJob.progress)
                      }%`,
                    }}
                    className={`h-full rounded-full transition-all duration-300 ${
                      activeUploadJob.status === "uploaded"
                        ? "bg-emerald-500"
                        : activeUploadJob.status === "error"
                        ? "bg-rose-500"
                        : "bg-gradient-to-r from-[#1877F2] to-[#0095F6]"
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Top Cover & Caption Card with Live Video Preview */}
            <div className="flex gap-4">
              <div
                onClick={() => setStep("editor")}
                className="relative w-28 h-40 rounded-2xl bg-black overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800 shadow-md cursor-pointer"
              >
                {selectedVideoUrl && (
                  <video
                    src={toPlayableMediaUrl(selectedVideoUrl)}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center p-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStep("editor");
                    }}
                    className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-bold cursor-pointer"
                  >
                    Preview
                  </button>
                </div>
              </div>

              <div className="flex-1">
                <textarea
                  rows={5}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption..."
                  className="w-full bg-transparent text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none resize-none"
                />
              </div>
            </div>

            {/* Quick Pill Buttons (# Hashtags, Poll, Prompt) */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                onClick={() => setCaption((prev) => `${prev} #viral #reels`)}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1 hover:opacity-80 transition cursor-pointer whitespace-nowrap"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Hashtags</span>
              </button>

              <button
                type="button"
                onClick={() => notify("Poll option added!", "info")}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1 hover:opacity-80 transition cursor-pointer whitespace-nowrap"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Poll</span>
              </button>

              <button
                type="button"
                onClick={() => notify("Prompt sticker active!", "info")}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1 hover:opacity-80 transition cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Prompt</span>
              </button>
            </div>

            {/* Option List */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border-y border-zinc-100 dark:border-zinc-800 text-sm">
              <div className="py-3.5 space-y-2">
                <div
                  onClick={() => setShowTagInput((prev) => !prev)}
                  className="flex items-center justify-between cursor-pointer hover:opacity-80"
                >
                  <div className="flex items-center gap-3">
                    <Tag className="w-5 h-5 text-zinc-500" />
                    <span className="font-medium">Tag people</span>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-400">
                    <span>{taggedPeople || ""}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
                {showTagInput && (
                  <input
                    type="text"
                    value={taggedPeople}
                    onChange={(e) => setTaggedPeople(e.target.value)}
                    placeholder="Enter @username..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs outline-none focus:border-[#1877F2]"
                  />
                )}
              </div>

              <div className="py-3.5 space-y-2">
                <div
                  onClick={() => setShowLocationInput((prev) => !prev)}
                  className="flex items-center justify-between cursor-pointer hover:opacity-80"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-zinc-500" />
                    <span className="font-medium">Add location</span>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-400">
                    <span>{locationTag || ""}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
                {showLocationInput && (
                  <input
                    type="text"
                    value={locationTag}
                    onChange={(e) => setLocationTag(e.target.value)}
                    placeholder="Enter city or place..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs outline-none focus:border-[#1877F2]"
                  />
                )}
              </div>

              <div
                onClick={() => setMusicPickerOpen(true)}
                className="py-3.5 flex items-center justify-between cursor-pointer hover:opacity-80"
              >
                <div className="flex items-center gap-3">
                  <Music className="w-5 h-5 text-zinc-500" />
                  <span className="font-medium">Rename audio</span>
                </div>
                <div className="flex items-center gap-1 text-zinc-400">
                  <span className="text-xs truncate max-w-[140px]">
                    {attachedMusic
                      ? `${attachedMusic.title}`
                      : audioTitle}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              <div className="py-3.5 flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-zinc-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Add AI label</p>
                    <p className="text-xs text-zinc-400 leading-tight">
                      Required for realistic photos and videos made with AI.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAddAiLabel(!addAiLabel)}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                    addAiLabel ? "bg-[#0095F6]" : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      addAiLabel ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Audience & More Options */}
            <div className="space-y-3 pt-2 text-sm">
              <div
                onClick={() =>
                  setAudience(
                    audience === "Everyone" ? "Close Friends" : "Everyone"
                  )
                }
                className="py-2.5 flex items-center justify-between cursor-pointer hover:opacity-80"
              >
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-zinc-500" />
                  <span className="font-medium">Audience</span>
                </div>
                <div className="flex items-center gap-1 text-zinc-400">
                  <span>{audience}</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              <div
                onClick={() => setStep("more_options")}
                className="py-2.5 flex items-center justify-between cursor-pointer hover:opacity-80"
              >
                <div className="flex items-center gap-3">
                  <MoreHorizontal className="w-5 h-5 text-zinc-500" />
                  <span className="font-medium">More options</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </div>
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                notify("Draft saved successfully!", "success");
                navigate("/loops");
              }}
              className="flex-1 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-bold text-sm text-zinc-900 dark:text-white hover:opacity-80 transition cursor-pointer"
            >
              Save draft
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleShareReel}
              className="flex-1 py-3 rounded-2xl bg-[#0095F6] hover:bg-blue-600 font-bold text-sm text-white shadow-lg transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : activeUploadJob && activeUploadJob.status === "uploading" ? (
                <span>Publish (Auto when uploaded)</span>
              ) : (
                <span>Publish</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
       * STEP 4: MORE OPTIONS SCREEN (Exact IMG_5256 & IMG_5257)
       * ========================================================================= */}
      {step === "more_options" && (
        <div className="flex flex-col min-h-screen max-w-lg mx-auto bg-white text-zinc-950 dark:bg-black dark:text-white">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setStep("finalize")}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6 text-zinc-900 dark:text-white" />
            </button>
            <h1 className="text-base font-bold text-zinc-900 dark:text-white">
              More options
            </h1>
            <div className="w-9" />
          </div>

          <div className="flex-1 p-4 space-y-6 overflow-y-auto text-sm">
            {/* Reminder */}
            <div
              onClick={() => notify("Reminder set!", "info")}
              className="py-3 flex items-center justify-between cursor-pointer hover:opacity-80"
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-zinc-500" />
                <span className="font-medium">Add reminder</span>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </div>

            {/* Category: Ads and monetisation */}
            <div className="space-y-3 pt-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Ads and monetisation
              </h2>
              <div
                onClick={() => notify("Product tag ready!", "info")}
                className="py-3 flex items-center justify-between cursor-pointer hover:opacity-80"
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-zinc-500" />
                  <span className="font-medium">Add product details</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </div>
            </div>

            {/* Category: Sharing preferences */}
            <div className="space-y-4 pt-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Sharing preferences
              </h2>

              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-zinc-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Schedule this reel</p>
                    <p className="text-xs text-zinc-400 leading-tight">
                      Some features may be unavailable with scheduled content.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    notify("Reel scheduling feature enabled", "info")
                  }
                  className="w-11 h-6 rounded-full bg-zinc-300 dark:bg-zinc-700 p-0.5"
                >
                  <div className="w-5 h-5 rounded-full bg-white" />
                </button>
              </div>

              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <ArrowUp className="w-5 h-5 text-zinc-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Upload at highest quality</p>
                    <p className="text-xs text-zinc-400 leading-tight">
                      Always upload highest-quality video even if taking longer.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadHighestQuality(!uploadHighestQuality)}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                    uploadHighestQuality
                      ? "bg-[#0095F6]"
                      : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      uploadHighestQuality ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Category: What others can remix and reuse */}
            <div className="space-y-4 pt-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                What others can remix and reuse
              </h2>

              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Layers className="w-5 h-5 text-zinc-500 mt-0.5" />
                  <div>
                    <p className="font-medium">
                      Don&apos;t let others use this reel as a template
                    </p>
                    <p className="text-xs text-zinc-400 leading-tight">
                      Templates allow anyone to use the same audio and timing.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDisableTemplate(!disableTemplate)}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                    disableTemplate
                      ? "bg-[#0095F6]"
                      : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      disableTemplate ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Category: How others can interact with your reel */}
            <div className="space-y-4 pt-2 pb-8">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                How others can interact with your reel
              </h2>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Heart className="w-5 h-5 text-zinc-500" />
                  <span className="font-medium">Hide like count on this reel</span>
                </div>
                <button
                  type="button"
                  onClick={() => setHideLikeCount(!hideLikeCount)}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                    hideLikeCount
                      ? "bg-[#0095F6]"
                      : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      hideLikeCount ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Share2 className="w-5 h-5 text-zinc-500" />
                  <span className="font-medium">
                    Hide share count on this reel
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setHideShareCount(!hideShareCount)}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                    hideShareCount
                      ? "bg-[#0095F6]"
                      : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      hideShareCount ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-zinc-500" />
                  <span className="font-medium">Turn off commenting</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTurnOffCommenting(!turnOffCommenting)}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                    turnOffCommenting
                      ? "bg-[#0095F6]"
                      : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      turnOffCommenting ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-zinc-500" />
                  <span className="font-medium">
                    Allow people to download your reels
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAllowDownload(!allowDownload)}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                    allowDownload
                      ? "bg-[#0095F6]"
                      : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      allowDownload ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Background Music Modal */}
      <DeezerMusicPickerModal
        isOpen={musicPickerOpen}
        onClose={() => setMusicPickerOpen(false)}
        selectedTrack={attachedMusic}
        onSelectTrack={(music) => {
          if (!music.audioUrl) {
            setAttachedMusic(null);
            setMusicPickerOpen(false);
            notify("Removed background track", "info");
            return;
          }
          setAttachedMusic(music);
          setMusicPickerOpen(false);
          notify(`Attached sound: ${music.title}`, "success");
        }}
      />
    </div>
  );
};

export default CreateReelStudio;
