import React from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Sparkles,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  dismissReelUploadJob,
  retryReelUploadJob,
  useReelUploadJobs,
} from "../lib/reelBackgroundPublisher";

export const ReelUploadProgressOverlay: React.FC = () => {
  const jobs = useReelUploadJobs();
  const location = useLocation();
  const navigate = useNavigate();

  const onStudioRoute = location.pathname.startsWith("/create-reel");

  // Outside CreateReelStudio, show armed auto-publish jobs (or active uploads that user left running).
  // Inside CreateReelStudio, CreateReelStudio renders its own inline header badge so we only show armed/published jobs if any.
  const visibleJobs = jobs.filter((j) =>
    onStudioRoute ? j.autoPublishArmed : true
  );

  if (visibleJobs.length === 0 || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      style={{
        top: "max(12px, env(safe-area-inset-top, 12px))",
      }}
      className="fixed inset-x-3 sm:inset-x-auto sm:top-auto sm:bottom-6 sm:right-6 z-[998] sm:w-[376px] flex flex-col gap-2.5 pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {visibleJobs.map((job) => {
          const isUploading = job.status === "uploading";
          const isPublishing = job.status === "publishing";
          const isPublished = job.status === "published";
          const isError = job.status === "error";

          const statusTitle = isPublished
            ? "Reel published live!"
            : isPublishing
            ? "Publishing your Reel..."
            : isError
            ? "Upload paused"
            : job.autoPublishArmed
            ? "Uploading · Auto-publish on"
            : job.status === "uploaded"
            ? "Video ready to share"
            : "Uploading Reel video...";

          const statusSubtitle = isPublished
            ? "Your Reel is now live in Loops & Reels."
            : isPublishing
            ? "Finalizing audio & feed indexing..."
            : isError
            ? job.errorMessage || "Connection interrupted. Tap Retry."
            : job.autoPublishArmed
            ? `${job.fileSizeMb} · Will publish automatically at 100%`
            : job.status === "uploaded"
            ? `${job.fileSizeMb} · Ready for instant publish`
            : `${job.fileName} (${job.fileSizeMb})`;

          return (
            <motion.div
              key={job.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="pointer-events-auto rounded-[22px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-zinc-200/85 dark:border-white/15 shadow-[0_18px_48px_rgba(15,23,42,0.18)] p-3 text-zinc-950 dark:text-white overflow-hidden"
            >
              <div className="flex items-center gap-3">
                {/* 9:16 Video Frame Thumbnail */}
                <div className="relative w-11 h-15 rounded-xl overflow-hidden bg-zinc-900 shrink-0 border border-black/10 dark:border-white/10">
                  {job.posterDataUrl ? (
                    <img
                      src={job.posterDataUrl}
                      alt="Reel preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={job.localPreviewUrl}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                    {isPublished ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 drop-shadow" />
                    ) : isError ? (
                      <AlertCircle className="w-5 h-5 text-rose-400 drop-shadow" />
                    ) : (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    )}
                  </div>
                </div>

                {/* Status Copy & Progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-[13.5px] font-bold tracking-tight truncate">
                        {statusTitle}
                      </p>
                      {job.autoPublishArmed && !isPublished && !isError && (
                        <span className="hidden xs:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#1877F2]/12 text-[#1877F2] dark:text-[#58A6FF] text-[10px] font-bold shrink-0">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>AUTO</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isPublished && !isError && (
                        <span className="text-[12.5px] font-extrabold tabular-nums text-[#1877F2] dark:text-[#58A6FF]">
                          {isPublishing ? "100%" : `${job.progress}%`}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => dismissReelUploadJob(job.id)}
                        aria-label="Dismiss upload status"
                        className="w-6 h-6 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center justify-center transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {statusSubtitle}
                  </p>

                  {/* Smooth Progress Bar */}
                  <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <motion.div
                      initial={false}
                      animate={{
                        width: `${
                          isPublished || isPublishing
                            ? 100
                            : Math.max(4, job.progress)
                        }%`,
                      }}
                      transition={{ ease: "easeOut", duration: 0.28 }}
                      className={`h-full rounded-full ${
                        isPublished
                          ? "bg-emerald-500"
                          : isError
                          ? "bg-rose-500"
                          : isPublishing
                          ? "bg-gradient-to-r from-[#1877F2] via-indigo-500 to-sky-400 animate-pulse"
                          : "bg-gradient-to-r from-[#1877F2] to-[#0095F6]"
                      }`}
                    />
                  </div>

                  {/* Action Buttons on Completion or Error */}
                  {(isPublished || isError || (!onStudioRoute && !job.autoPublishArmed && isUploading)) && (
                    <div className="mt-2.5 flex items-center justify-end gap-2">
                      {!onStudioRoute && !job.autoPublishArmed && isUploading && (
                        <button
                          type="button"
                          onClick={() => navigate("/create-reel")}
                          className="px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[11.5px] font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
                        >
                          Back to editor
                        </button>
                      )}

                      {isError && (
                        <button
                          type="button"
                          onClick={() => retryReelUploadJob(job.id)}
                          className="px-3 py-1 rounded-lg bg-[#1877F2] hover:bg-blue-600 text-white text-[11.5px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                      )}

                      {isPublished && job.publishedPostId && (
                        <button
                          type="button"
                          onClick={() => {
                            const postId = job.publishedPostId;
                            dismissReelUploadJob(job.id);
                            navigate(`/loops?filter=video&postId=${postId}`);
                          }}
                          className="px-3 py-1 rounded-lg bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-[11.5px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                        >
                          <span>View Reel</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body
  );
};
