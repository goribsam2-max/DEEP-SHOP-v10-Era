import { useEffect, useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";
import { uploadFileToCatbox } from "./catboxUpload";
import { pingBingIndexNow } from "./indexNowClient";

export type ReelUploadStatus =
  | "uploading"
  | "uploaded"
  | "publishing"
  | "published"
  | "error";

export interface ReelPublishPayload {
  uid: string;
  authorName: string;
  authorAvatar: string;
  caption: string;
  locationTag: string;
  addAiLabel: boolean;
  audience: "Everyone" | "Close Friends";
  uploadHighestQuality: boolean;
  disableTemplate: boolean;
  hideLikeCount: boolean;
  hideShareCount: boolean;
  turnOffCommenting: boolean;
  allowDownload: boolean;
  audioTitle: string;
  bgMusicVolume: number;
  videoVolume: number;
  attachedMusic: {
    id?: string;
    title: string;
    artist: string;
    audioUrl: string;
    coverUrl?: string;
    cover?: string;
  } | null;
}

export interface ReelUploadJob {
  id: string;
  file: File;
  fileName: string;
  fileSizeMb: string;
  localPreviewUrl: string;
  posterDataUrl: string;
  hostedUrl: string;
  progress: number;
  status: ReelUploadStatus;
  autoPublishArmed: boolean;
  publishPayload: ReelPublishPayload | null;
  publishedPostId: string | null;
  errorMessage: string | null;
  createdAt: number;
}

interface InternalJobEntry {
  job: ReelUploadJob;
  abortController: AbortController | null;
  uploadPromise: Promise<string> | null;
}

const jobsMap = new Map<string, InternalJobEntry>();
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

export function getReelUploadJobsSnapshot(): ReelUploadJob[] {
  return Array.from(jobsMap.values())
    .map((entry) => entry.job)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getReelUploadJob(jobId: string | null | undefined): ReelUploadJob | null {
  if (!jobId) return null;
  return jobsMap.get(jobId)?.job || null;
}

export function useReelUploadJobs(): ReelUploadJob[] {
  const [jobs, setJobs] = useState<ReelUploadJob[]>(() =>
    getReelUploadJobsSnapshot()
  );

  useEffect(() => {
    const onUpdate = () => setJobs(getReelUploadJobsSnapshot());
    listeners.add(onUpdate);
    onUpdate();
    return () => {
      listeners.delete(onUpdate);
    };
  }, []);

  return jobs;
}

async function captureVideoFrameThumbnail(blobUrl: string): Promise<string> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve("");
      return;
    }
    const video = document.createElement("video");
    let settled = false;
    const finish = (dataUrl: string) => {
      if (settled) return;
      settled = true;
      video.removeAttribute("src");
      video.load();
      resolve(dataUrl);
    };

    const timeout = window.setTimeout(() => finish(""), 3500);
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = blobUrl;

    video.onloadeddata = () => {
      try {
        video.currentTime = Math.min(0.25, (video.duration || 1) * 0.1);
      } catch {
        drawFrame();
      }
    };

    const drawFrame = () => {
      window.clearTimeout(timeout);
      try {
        const vw = video.videoWidth || 270;
        const vh = video.videoHeight || 480;
        const scale = Math.min(1, 240 / Math.max(vw, 1));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(90, Math.round(vw * scale));
        canvas.height = Math.max(160, Math.round(vh * scale));
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          finish(canvas.toDataURL("image/jpeg", 0.72));
          return;
        }
      } catch {}
      finish("");
    };

    video.onseeked = drawFrame;
    video.onerror = () => {
      window.clearTimeout(timeout);
      finish("");
    };
  });
}

async function writeReelToFirestore(
  hostedVideoUrl: string,
  payload: ReelPublishPayload
): Promise<string> {
  const {
    uid,
    authorName,
    authorAvatar,
    caption,
    locationTag,
    addAiLabel,
    audience,
    uploadHighestQuality,
    disableTemplate,
    hideLikeCount,
    hideShareCount,
    turnOffCommenting,
    allowDownload,
    audioTitle,
    bgMusicVolume,
    videoVolume,
    attachedMusic,
  } = payload;

  const postRef = await addDoc(collection(db, "scam_posts"), {
    title: caption.slice(0, 60) || "Reel",
    description: caption,
    videoUrl: hostedVideoUrl,
    images: [],
    type: "reel",
    reporterId: uid,
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

  const hasCustomMusic = Boolean(attachedMusic?.audioUrl);
  const songTitle = hasCustomMusic
    ? attachedMusic!.title
    : caption.trim().slice(0, 32) || `${authorName}'s Original Audio`;
  const songArtist = hasCustomMusic ? attachedMusic!.artist : authorName;
  const audioUrl = hasCustomMusic ? attachedMusic!.audioUrl : hostedVideoUrl;
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
    addedByUid: uid,
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

  return postRef.id;
}

async function executePublishStep(entry: InternalJobEntry) {
  if (!entry.job.hostedUrl || !entry.job.publishPayload) return;
  if (entry.job.status === "publishing" || entry.job.status === "published") {
    return;
  }

  entry.job = {
    ...entry.job,
    status: "publishing",
    progress: 100,
    errorMessage: null,
  };
  emitChange();

  try {
    const postId = await writeReelToFirestore(
      entry.job.hostedUrl,
      entry.job.publishPayload
    );
    entry.job = {
      ...entry.job,
      status: "published",
      progress: 100,
      publishedPostId: postId,
      errorMessage: null,
    };
    emitChange();

    // Auto-clean completed overlay card after 9 seconds if user hasn't dismissed it
    window.setTimeout(() => {
      const current = jobsMap.get(entry.job.id);
      if (current && current.job.status === "published") {
        dismissReelUploadJob(entry.job.id);
      }
    }, 9000);
  } catch (err: any) {
    entry.job = {
      ...entry.job,
      status: "error",
      errorMessage: err?.message || "Failed to publish Reel. Tap Retry.",
    };
    emitChange();
  }
}

function runUploadForEntry(entry: InternalJobEntry): Promise<string> {
  const controller = new AbortController();
  entry.abortController = controller;
  entry.job = {
    ...entry.job,
    status: "uploading",
    errorMessage: null,
    progress: Math.max(2, entry.job.progress > 95 ? 5 : entry.job.progress),
  };
  emitChange();

  const promise = uploadFileToCatbox(
    entry.job.file,
    controller.signal,
    (pct) => {
      const current = jobsMap.get(entry.job.id);
      if (!current) return;
      current.job = {
        ...current.job,
        progress: Math.max(current.job.progress, Math.min(99, pct)),
      };
      emitChange();
    }
  )
    .then(async (hostedUrl) => {
      const current = jobsMap.get(entry.job.id);
      if (!current) return hostedUrl;
      current.abortController = null;
      current.job = {
        ...current.job,
        hostedUrl,
        progress: 100,
        status: "uploaded",
        errorMessage: null,
      };
      emitChange();

      if (current.job.autoPublishArmed && current.job.publishPayload) {
        await executePublishStep(current);
      }
      return hostedUrl;
    })
    .catch((err: any) => {
      const current = jobsMap.get(entry.job.id);
      if (current && !controller.signal.aborted) {
        current.abortController = null;
        current.job = {
          ...current.job,
          status: "error",
          errorMessage:
            err?.message || "Video upload interrupted. Tap Retry to resume.",
        };
        emitChange();
      }
      throw err;
    });

  entry.uploadPromise = promise;
  return promise;
}

/**
 * Starts uploading a selected Reel video immediately in the background while returning
 * an instant local blob preview URL + job ID.
 */
export function startReelBackgroundUpload(
  file: File,
  previousDraftJobId?: string | null
): ReelUploadJob {
  // Clean up any previous un-armed draft upload from the studio picker
  if (previousDraftJobId) {
    const prev = jobsMap.get(previousDraftJobId);
    if (prev && !prev.job.autoPublishArmed) {
      prev.abortController?.abort();
      jobsMap.delete(previousDraftJobId);
    }
  }

  const localPreviewUrl = URL.createObjectURL(file);
  const jobId = `reel_up_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const sizeMb = `${Math.max(0.1, file.size / (1024 * 1024)).toFixed(1)} MB`;

  const initialJob: ReelUploadJob = {
    id: jobId,
    file,
    fileName: file.name,
    fileSizeMb: sizeMb,
    localPreviewUrl,
    posterDataUrl: "",
    hostedUrl: "",
    progress: 2,
    status: "uploading",
    autoPublishArmed: false,
    publishPayload: null,
    publishedPostId: null,
    errorMessage: null,
    createdAt: Date.now(),
  };

  const entry: InternalJobEntry = {
    job: initialJob,
    abortController: null,
    uploadPromise: null,
  };
  jobsMap.set(jobId, entry);
  emitChange();

  captureVideoFrameThumbnail(localPreviewUrl).then((poster) => {
    const current = jobsMap.get(jobId);
    if (current && poster) {
      current.job = { ...current.job, posterDataUrl: poster };
      emitChange();
    }
  });

  runUploadForEntry(entry).catch(() => {});
  return initialJob;
}

/**
 * Arms auto-publishing for an active upload job (or immediately publishes if already uploaded).
 * Returns `{ immediatePostId }` if published synchronously right away, or `{ queued: true }`
 * when continuing in the background.
 */
export async function publishOrArmReelBackgroundJob(
  jobId: string,
  payload: ReelPublishPayload
): Promise<{ immediatePostId?: string; queued: boolean }> {
  const entry = jobsMap.get(jobId);
  if (!entry) {
    throw new Error("Upload session not found. Please select the video again.");
  }

  entry.job = {
    ...entry.job,
    autoPublishArmed: true,
    publishPayload: payload,
    errorMessage: null,
  };
  emitChange();

  if (entry.job.hostedUrl && entry.job.status === "uploaded") {
    await executePublishStep(entry);
    if (entry.job.publishedPostId) {
      return { immediatePostId: entry.job.publishedPostId, queued: false };
    }
  }

  if (entry.job.status === "error") {
    if (entry.job.hostedUrl) {
      executePublishStep(entry).catch(() => {});
    } else {
      runUploadForEntry(entry).catch(() => {});
    }
  }

  return { queued: true };
}

export function retryReelUploadJob(jobId: string) {
  const entry = jobsMap.get(jobId);
  if (!entry) return;
  if (entry.job.hostedUrl && entry.job.publishPayload) {
    executePublishStep(entry).catch(() => {});
  } else {
    runUploadForEntry(entry).catch(() => {});
  }
}

export function dismissReelUploadJob(jobId: string) {
  const entry = jobsMap.get(jobId);
  if (!entry) return;
  entry.abortController?.abort();
  try {
    if (entry.job.localPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(entry.job.localPreviewUrl);
    }
  } catch {}
  jobsMap.delete(jobId);
  emitChange();
}
