import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Search,
  Check,
  Send,
  Plus,
  Trash2,
  ExternalLink,
  Shield,
  Calendar,
  Sparkles,
  TrendingUp,
  Star,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { StoryHighlightItem, StoryHighlightSnapshot } from "../types";
import { VerifiedLoopBadge } from "./LoopPostCard";
import { getSafeDisplayName, getSafePublicUsername } from "../lib/utils";
import { triggerHaptic } from "../lib/haptics";

export const QUICK_STORY_EMOJIS = ["❤️", "🙌", "🔥", "👏", "😢", "😍", "😮", "😂"];

/** Crisp WhatsApp + Facebook dual circle icon matching IMG_5131 "Share on..." */
export const DualSocialShareIcon: React.FC<{ className?: string }> = ({
  className = "w-7 h-7",
}) => (
  <svg
    viewBox="0 0 36 26"
    fill="none"
    className={className}
     aria-hidden="true"
  >
    {/* Left WhatsApp-style speech circle */}
    <path
      d="M12.5 3.2C7.53 3.2 3.5 7.12 3.5 11.96c0 1.72.51 3.32 1.39 4.68L3.8 21.1l4.66-1.18a9.16 9.16 0 0 0 4.04.94c4.97 0 9-3.92 9-8.76 0-4.84-4.03-8.9-9-8.9Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10.1 9.3c-.2-.42-.42-.43-.62-.44h-.52c-.18 0-.47.07-.72.34-.25.27-.95.92-.95 2.24s.97 2.59 1.1 2.77c.14.18 1.88 2.98 4.64 4.06 2.29.9 2.76.72 3.25.67.5-.05 1.6-.65 1.83-1.28.22-.63.22-1.17.16-1.28-.07-.11-.25-.18-.52-.31-.27-.14-1.6-.78-1.85-.87-.25-.09-.43-.14-.61.14-.18.27-.7.87-.86 1.05-.16.18-.32.2-.59.07-.27-.14-1.14-.42-2.18-1.34-.81-.71-1.35-1.59-1.51-1.86-.16-.27-.02-.41.12-.55.12-.12.27-.31.41-.47.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.47-.07-.14-.6-1.47-.84-2.01Z"
      fill="currentColor"
    />
    {/* Right Facebook circle */}
    <circle
      cx="24.5"
      cy="12.5"
      r="8.8"
       fill="#09090b"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M25.7 17.8v-4.6h1.55l.24-1.8H25.7v-1.14c0-.52.15-.88.9-.88h.96V7.77c-.17-.02-.74-.07-1.4-.07-1.39 0-2.34.85-2.34 2.4v1.3H22.3v1.8h1.52v4.6h1.88Z"
      fill="currentColor"
    />
  </svg>
);

/** Equalizer bars icon matching IMG_5131 / IMG_5132 song subtitle */
export const StoryMusicBarsIcon: React.FC<{
  playing?: boolean;
  className?: string;
}> = ({ playing = true, className = "w-3.5 h-3.5" }) => (
  <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
    <rect
      x="1.5"
      y={playing ? "4" : "6"}
      width="2.2"
      height={playing ? "8" : "4"}
      rx="1.1"
    />
    <rect
      x="6.8"
      y={playing ? "2" : "5"}
      width="2.2"
      height={playing ? "12" : "6"}
      rx="1.1"
    />
    <rect
      x="12.1"
      y={playing ? "5" : "6"}
      width="2.2"
      height={playing ? "6" : "4"}
      rx="1.1"
    />
  </svg>
);

/* ============================================================================
 * 1. OWN STORY "MORE" FROSTED POPOVER (IMG_5136 1:1)
 * ========================================================================== */
interface OwnStoryMorePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  allowCommenting: boolean;
  aiLabel: boolean;
  onDelete: () => void;
  onArchive: () => void;
  onHighlight: () => void;
  onSaveMedia: () => void;
  onToggleAiLabel: () => void;
  onBoostStory: () => void;
  onOpenStorySettings: () => void;
  onToggleCommenting: () => void;
}

export const OwnStoryMorePopover: React.FC<OwnStoryMorePopoverProps> = ({
  isOpen,
  onClose,
  allowCommenting,
  aiLabel,
  onDelete,
  onArchive,
  onHighlight,
  onSaveMedia,
  onToggleAiLabel,
  onBoostStory,
  onOpenStorySettings,
  onToggleCommenting,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[85]"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="loops-story-glass-popover fixed bottom-[84px] right-4 sm:right-[calc(50%-210px)] z-[95] w-[268px] rounded-[28px] py-2.5 px-2 select-none"
          >
            {/* 1. Delete story */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete();
              }}
              className="loops-story-danger-item w-full px-3.5 py-3 rounded-2xl flex items-center gap-3.5 text-left text-[16px] font-medium hover:bg-black/[0.05] active:scale-[0.99] transition cursor-pointer"
            >
              <Trash2 className="w-[22px] h-[22px] stroke-[2] shrink-0" />
              <span>Delete story</span>
            </button>

            {/* 2. Archive */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onArchive();
              }}
              className="w-full px-3.5 py-3 rounded-2xl flex items-center gap-3.5 text-left text-[16px] font-normal text-zinc-900 hover:bg-black/[0.05] active:scale-[0.99] transition cursor-pointer"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-[22px] h-[22px] shrink-0"
              >
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
                <path d="M12 7v5l3 2" />
              </svg>
              <span>Archive</span>
            </button>

            {/* 3. Highlight (dashed circle + heart) */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onHighlight();
              }}
              className="w-full px-3.5 py-3 rounded-2xl flex items-center gap-3.5 text-left text-[16px] font-normal text-zinc-900 hover:bg-black/[0.05] active:scale-[0.99] transition cursor-pointer"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-[22px] h-[22px] shrink-0"
              >
                <circle cx="12" cy="12" r="9" strokeDasharray="4 3.2" />
                <path d="M12 15.8s-3.5-2.2-3.5-4.4a2 2 0 0 1 3.5-1.3 2 2 0 0 1 3.5 1.3c0 2.2-3.5 4.4-3.5 4.4Z" />
              </svg>
              <span>Highlight</span>
            </button>

            {/* 4. Save... (arrow down into flat line) */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onSaveMedia();
              }}
              className="w-full px-3.5 py-3 rounded-2xl flex items-center gap-3.5 text-left text-[16px] font-normal text-zinc-900 hover:bg-black/[0.05] active:scale-[0.99] transition cursor-pointer"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-[22px] h-[22px] shrink-0"
              >
                <path d="M12 4v11" />
                <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
                <path d="M5 19h14" />
              </svg>
              <span>Save...</span>
            </button>

            {/* 5. Edit AI label (pencil/wand with sparkle) */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onToggleAiLabel();
              }}
              className="w-full px-3.5 py-3 rounded-2xl flex items-center gap-3.5 text-left text-[16px] font-normal text-zinc-900 hover:bg-black/[0.05] active:scale-[0.99] transition cursor-pointer"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-[22px] h-[22px] shrink-0"
              >
                <path d="M15 4 4 15v5h5L20 9l-5-5Z" />
                <path d="m12.5 6.5 5 5" />
                <path d="M19 15v4" />
                <path d="M17 17h4" />
              </svg>
              <span>{aiLabel ? "Remove AI label" : "Edit AI label"}</span>
            </button>

            {/* 6. Boost Story */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onBoostStory();
              }}
              className="w-full px-3.5 py-3 rounded-2xl flex items-center gap-3.5 text-left text-[16px] font-normal text-zinc-900 hover:bg-black/[0.05] active:scale-[0.99] transition cursor-pointer"
            >
              <TrendingUp className="w-[22px] h-[22px] stroke-[2] shrink-0" />
              <span>Boost Story</span>
            </button>

            {/* 7. Story settings */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenStorySettings();
              }}
              className="w-full px-3.5 py-3 rounded-2xl flex items-center gap-3.5 text-left text-[16px] font-normal text-zinc-900 hover:bg-black/[0.05] active:scale-[0.99] transition cursor-pointer"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-[22px] h-[22px] shrink-0"
              >
                <circle cx="12" cy="12" r="7.5" strokeDasharray="2.5 2.2" />
                <circle cx="12" cy="12" r="5.5" />
              </svg>
              <span>Story settings</span>
            </button>

            {/* 8. Turn off / on commenting */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onToggleCommenting();
              }}
              className="w-full px-3.5 py-3 rounded-2xl flex items-center gap-3.5 text-left text-[16px] font-normal text-zinc-900 hover:bg-black/[0.05] active:scale-[0.99] transition cursor-pointer"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-[22px] h-[22px] shrink-0"
              >
                <path d="M20 20 4 4" />
                <path d="M19.3 14.8A8 8 0 0 0 8.2 4.9" />
                <path d="M4.8 8.3a8 8 0 0 0 10.6 11l3.6 1-1-3.4" />
              </svg>
              <span>
                {allowCommenting ? "Turn off commenting" : "Turn on commenting"}
              </span>
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
 * 2. PEER STORY "..." COMPACT FROSTED POPOVER (IMG_5133 1:1)
 * ========================================================================== */
interface PeerStoryMenuPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onReport: () => void;
  onAboutAccount: () => void;
}

export const PeerStoryMenuPopover: React.FC<PeerStoryMenuPopoverProps> = ({
  isOpen,
  onClose,
  onReport,
  onAboutAccount,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[85]"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -8 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="loops-story-glass-popover fixed top-[62px] right-5 sm:right-[calc(50%-205px)] z-[95] w-[225px] rounded-[22px] py-2 px-1.5 select-none"
          >
            <button
              type="button"
              onClick={() => {
                onClose();
                onReport();
              }}
              className="loops-story-danger-item w-full px-4 py-3 rounded-2xl text-left text-[16px] font-medium hover:bg-black/[0.05] active:scale-[0.99] transition cursor-pointer"
            >
              Report
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onAboutAccount();
              }}
              className="w-full px-4 py-3 rounded-2xl text-left text-[16px] font-normal text-zinc-900 hover:bg-black/[0.05] active:scale-[0.99] transition cursor-pointer"
            >
              About this account
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
 * 3. STORY COMMENT & 8-EMOJI REACTION SHEET (IMG_5134 1:1)
 * ========================================================================== */
export interface StoryReplyItem {
  uid: string;
  name: string;
  avatar?: string;
  text: string;
  createdAt: number;
}

interface StoryCommentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  replies: StoryReplyItem[];
  currentUserAvatar: string;
  currentUserName: string;
  allowCommenting: boolean;
  onSubmitComment: (text: string) => Promise<void> | void;
  onQuickEmoji: (emoji: string) => Promise<void> | void;
  onNavigateProfile: (uid: string) => void;
}

export const StoryCommentSheet: React.FC<StoryCommentSheetProps> = ({
  isOpen,
  onClose,
  replies,
  currentUserAvatar,
  currentUserName,
  allowCommenting,
  onSubmitComment,
  onQuickEmoji,
  onNavigateProfile,
}) => {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = draft.trim();
    if (!clean || sending) return;
    setSending(true);
    setDraft("");
    try {
      await onSubmitComment(clean);
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/55 flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="loops-story-comment-sheet w-full max-w-md rounded-t-[28px] flex flex-col min-h-[360px] max-h-[75dvh]"
          >
            {/* Centered grab handle */}
            <div className="w-11 h-1 bg-white/40 rounded-full mx-auto mt-3 mb-2 shrink-0" />

            {/* Scrollable comments stream */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3.5">
              {replies.length > 0 &&
                replies.map((rep, idx) => (
                  <div
                    key={`${rep.uid}_${rep.createdAt}_${idx}`}
                    className="flex items-start gap-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (rep.uid) {
                          onClose();
                          onNavigateProfile(rep.uid);
                        }
                      }}
                      className="w-8 h-8 rounded-full overflow-hidden bg-white/15 shrink-0 flex items-center justify-center text-xs font-bold text-white cursor-pointer"
                    >
                      {rep.avatar ? (
                        <img
                          src={rep.avatar}
                          alt={rep.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (rep.name || "M").slice(0, 1).toUpperCase()
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-white/95 leading-snug">
                        {rep.name || "Member"}
                      </p>
                      <p className="text-[14px] text-white/90 break-words leading-snug">
                        {rep.text}
                      </p>
                    </div>
                  </div>
                ))}
            </div>

            {/* 8 Quick-React Emoji Row matching IMG_5134 */}
            <div className="px-4 py-2.5 flex items-center justify-between shrink-0">
              {QUICK_STORY_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    onQuickEmoji(em);
                  }}
                  className="w-10 h-10 flex items-center justify-center text-[27px] hover:scale-125 active:scale-95 transition-transform cursor-pointer select-none"
                  aria-label={`React ${em}`}
                >
                  {em}
                </button>
              ))}
            </div>

            {/* Bottom Avatar + Pill Input Row matching IMG_5134 */}
            <div className="px-4 pt-1 pb-6 shrink-0">
              {allowCommenting ? (
                <form
                  onSubmit={handleSend}
                  className="flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center text-xs font-bold text-white">
                    {currentUserAvatar ? (
                      <img
                        src={currentUserAvatar}
                        alt={currentUserName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (currentUserName || "U").slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="loops-story-comment-input flex-1 h-11 rounded-full px-4 flex items-center gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Add a comment or @mention friends..."
                      className="ds-liquid-input flex-1 bg-transparent border-0 outline-none text-[14.5px] text-white placeholder-white/60"
                    />
                    {draft.trim() && (
                      <button
                        type="submit"
                        disabled={sending}
                        className="text-white font-semibold text-sm px-1.5 cursor-pointer"
                      >
                        Post
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                <div className="h-11 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/70">
                  Commenting is turned off for this story
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
 * 4. STORY MENTION WHITE BOTTOM SHEET (IMG_5135 1:1)
 * ========================================================================== */
interface StoryMentionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  allUsers: any[];
  currentUid: string;
  alreadyMentionedUids: string[];
  onConfirmMentions: (selectedUsers: any[]) => Promise<void> | void;
}

export const StoryMentionSheet: React.FC<StoryMentionSheetProps> = ({
  isOpen,
  onClose,
  allUsers,
  currentUid,
  alreadyMentionedUids,
  onConfirmMentions,
}) => {
  const [searchText, setSearchText] = useState("");
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchText("");
      setSelectedUids([]);
    }
  }, [isOpen]);

  const filteredUsers = useMemo(() => {
    const q = searchText.trim().toLowerCase().replace(/^@/, "");
    const pool = allUsers.filter((u) => u.uid && u.uid !== currentUid);
    if (!q) return pool.slice(0, 30);
    return pool
      .filter((u) => {
        const handle = (getSafePublicUsername(u) || "").toLowerCase();
        const name = (getSafeDisplayName(u, "") || "").toLowerCase();
        return handle.includes(q) || name.includes(q);
      })
      .slice(0, 30);
  }, [allUsers, currentUid, searchText]);

  const toggleSelect = (uid: string) => {
    triggerHaptic();
    setSelectedUids((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );
  };

  const handleConfirm = async () => {
    if (selectedUids.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const chosen = allUsers.filter((u) => selectedUids.includes(u.uid));
      await onConfirmMentions(chosen);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[105] bg-black/60 flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="loops-mention-sheet w-full max-w-md rounded-t-[32px] h-[75dvh] flex flex-col overflow-hidden"
          >
            {/* Top Grab Handle */}
            <div className="w-11 h-1 bg-zinc-400 rounded-full mx-auto mt-3 mb-3 shrink-0" />

            {/* Rounded Search Pill matching IMG_5135 */}
            <div className="px-4 pb-3 shrink-0">
              <div className="loops-search-pill h-11 rounded-full px-4 flex items-center gap-2.5">
                <Search className="w-4.5 h-4.5 text-zinc-500 shrink-0" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search"
                  className="ds-liquid-input flex-1 bg-transparent border-0 outline-none text-[15.5px] text-zinc-900 placeholder-zinc-500"
                />
                {searchText && (
                  <button
                    type="button"
                    onClick={() => setSearchText("")}
                    className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* User Selection List */}
            <div className="flex-1 overflow-y-auto px-4 py-1 space-y-1">
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-10">
                  No matching accounts found.
                </p>
              ) : (
                filteredUsers.map((u) => {
                  const handle = getSafePublicUsername(u) || "member";
                  const name = getSafeDisplayName(u, handle);
                  const avatar = u.photoURL || u.shopLogo || "";
                  const isVerified = Boolean(
                    u.isVerifiedBadge ||
                      u.kycStatus === "approved" ||
                      u.role === "admin"
                  );
                  const isSelected = selectedUids.includes(u.uid);
                  const alreadyAdded = alreadyMentionedUids.includes(u.uid);

                  return (
                    <button
                      key={u.uid}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => toggleSelect(u.uid)}
                      className={`w-full py-2.5 flex items-center justify-between gap-3 text-left rounded-2xl transition cursor-pointer ${
                        alreadyAdded ? "opacity-50 cursor-default" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-100 shrink-0 flex items-center justify-center font-bold text-zinc-600">
                          {avatar ? (
                            <img
                              src={avatar}
                              alt={name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[15px] font-semibold text-zinc-900 truncate">
                              {handle}
                            </span>
                            {isVerified && (
                              <VerifiedLoopBadge className="w-3.5 h-3.5 shrink-0" />
                            )}
                          </div>
                          <p className="text-[13.5px] text-zinc-500 truncate">
                            {alreadyAdded ? `${name} · Mentioned` : name}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition ${
                          isSelected || alreadyAdded
                            ? "bg-[#0095f6] border-[#0095f6] text-white"
                            : "border-zinc-300 bg-white"
                        }`}
                      >
                        {(isSelected || alreadyAdded) && (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Bottom Mention Button matching IMG_5135 */}
            <div className="px-4 pt-3 pb-6 border-t border-zinc-100 shrink-0">
              <button
                type="button"
                disabled={selectedUids.length === 0 || submitting}
                onClick={handleConfirm}
                className={`w-full h-12 rounded-[16px] text-[16px] font-semibold transition flex items-center justify-center ${
                  selectedUids.length > 0
                    ? "loops-mention-cta-active cursor-pointer active:scale-[0.99]"
                    : "loops-mention-cta-disabled cursor-default"
                }`}
              >
                {submitting
                  ? "Adding..."
                  : selectedUids.length > 0
                  ? `Mention (${selectedUids.length})`
                  : "Mention"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
 * 5. STORY HIGHLIGHT PICKER / CREATOR MODAL (SUPPORTS IMG_5137 HIGHLIGHTS)
 * ========================================================================== */
interface StoryHighlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingHighlights: StoryHighlightItem[];
  currentStoryId: string;
  onAddToHighlight: (highlightId: string) => Promise<void> | void;
  onCreateHighlight: (title: string) => Promise<void> | void;
}

export const StoryHighlightModal: React.FC<StoryHighlightModalProps> = ({
  isOpen,
  onClose,
  existingHighlights,
  currentStoryId,
  onAddToHighlight,
  onCreateHighlight,
}) => {
  const [creatingNew, setCreatingNew] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCreatingNew(existingHighlights.length === 0);
      setTitleInput("");
    }
  }, [isOpen, existingHighlights.length]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = titleInput.trim().toUpperCase();
    if (!clean || saving) return;
    setSaving(true);
    try {
      await onCreateHighlight(clean);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="loops-mention-sheet w-full max-w-md rounded-t-[30px] p-5 pb-8 space-y-5"
          >
            <div className="w-11 h-1 bg-zinc-300 rounded-full mx-auto -mt-1" />

            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-zinc-900">
                {creatingNew ? "New Highlight" : "Add to Highlight"}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {creatingNew ? (
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="flex flex-col items-center gap-2.5 py-2">
                  <div className="loops-highlight-ring w-[80px] h-[80px] rounded-full p-[3.5px] flex items-center justify-center">
                    <div className="loops-highlight-inner w-full h-full rounded-full flex items-center justify-center px-2 text-center overflow-hidden">
                      <span className="text-[10px] font-extrabold tracking-[0.04em] uppercase leading-tight line-clamp-2 break-words">
                        {(titleInput.trim() || "HIGHLIGHT").toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-zinc-500">
                    Stays on your profile even after 24h feed expiry
                  </span>
                </div>

                <div className="loops-search-pill h-12 rounded-2xl px-4 flex items-center">
                  <input
                    type="text"
                    autoFocus
                    maxLength={24}
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="Highlight name (e.g. FASHION, BTS)"
                    className="ds-liquid-input w-full bg-transparent border-0 outline-none text-[15px] font-semibold uppercase text-zinc-900 placeholder-zinc-400"
                  />
                </div>

                <div className="flex items-center gap-2.5">
                  {existingHighlights.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCreatingNew(false)}
                      className="flex-1 h-11 rounded-2xl bg-zinc-100 text-zinc-800 text-sm font-semibold cursor-pointer"
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!titleInput.trim() || saving}
                    className={`flex-1 h-11 rounded-2xl text-sm font-semibold transition ${
                      titleInput.trim()
                        ? "loops-mention-cta-active cursor-pointer"
                        : "loops-mention-cta-disabled cursor-default"
                    }`}
                  >
                    {saving ? "Saving..." : "Add Highlight"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-4 overflow-x-auto no-scrollbar py-2">
                  {/* Create New Circle */}
                  <button
                    type="button"
                    onClick={() => setCreatingNew(true)}
                    className="flex flex-col items-center shrink-0 cursor-pointer group"
                  >
                    <div className="w-[74px] h-[74px] rounded-full border-2 border-dashed border-zinc-300 flex items-center justify-center text-zinc-700 group-hover:border-zinc-500 transition">
                      <Plus className="w-6 h-6" />
                    </div>
                    <span className="mt-1.5 text-[12px] font-medium text-zinc-700">
                      New
                    </span>
                  </button>

                  {existingHighlights.map((hl) => {
                    const alreadyIn = hl.storyIds?.includes(currentStoryId);
                    return (
                      <button
                        key={hl.id}
                        type="button"
                        onClick={async () => {
                          await onAddToHighlight(hl.id);
                          onClose();
                        }}
                        className="flex flex-col items-center shrink-0 cursor-pointer relative"
                      >
                        <div className="loops-highlight-ring w-[74px] h-[74px] rounded-full p-[3.5px] flex items-center justify-center">
                          <div className="loops-highlight-inner w-full h-full rounded-full flex items-center justify-center px-1.5 text-center overflow-hidden">
                            <span className="text-[9.5px] font-extrabold tracking-[0.04em] uppercase leading-[1.15] line-clamp-2 break-words">
                              {hl.title}
                            </span>
                          </div>
                        </div>
                        {alreadyIn && (
                          <span className="absolute top-0 right-0 w-5 h-5 rounded-full bg-[#0095f6] text-white flex items-center justify-center shadow">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                        <span className="mt-1.5 text-[12px] tracking-[0.03em] text-zinc-900 uppercase truncate w-[78px] text-center">
                          {hl.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
 * 6. DIRECT CHAT SEND SHEET (SEND STORY VIA P2P_CHATS)
 * ========================================================================== */
interface StoryDirectSendSheetProps {
  isOpen: boolean;
  onClose: () => void;
  allUsers: any[];
  currentUid: string;
  onSendToUser: (targetUser: any) => Promise<void> | void;
}

export const StoryDirectSendSheet: React.FC<StoryDirectSendSheetProps> = ({
  isOpen,
  onClose,
  allUsers,
  currentUid,
  onSendToUser,
}) => {
  const [searchText, setSearchText] = useState("");
  const [sentUids, setSentUids] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSearchText("");
      setSentUids([]);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const list = allUsers.filter((u) => u.uid && u.uid !== currentUid);
    if (!q) return list.slice(0, 24);
    return list
      .filter((u) => {
        const h = (getSafePublicUsername(u) || "").toLowerCase();
        const n = (getSafeDisplayName(u, "") || "").toLowerCase();
        return h.includes(q) || n.includes(q);
      })
      .slice(0, 24);
  }, [allUsers, currentUid, searchText]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[105] bg-black/65 flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="loops-mention-sheet w-full max-w-md rounded-t-[30px] h-[68dvh] flex flex-col overflow-hidden"
          >
            <div className="w-11 h-1 bg-zinc-400 rounded-full mx-auto mt-3 mb-3 shrink-0" />
            <div className="px-4 pb-3 shrink-0">
              <div className="loops-search-pill h-11 rounded-full px-4 flex items-center gap-2.5">
                <Search className="w-4.5 h-4.5 text-zinc-500 shrink-0" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Send to..."
                  className="ds-liquid-input flex-1 bg-transparent border-0 outline-none text-[15px] text-zinc-900 placeholder-zinc-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1">
              {filtered.map((u) => {
                const handle = getSafePublicUsername(u) || "member";
                const name = getSafeDisplayName(u, handle);
                const avatar = u.photoURL || u.shopLogo || "";
                const isSent = sentUids.includes(u.uid);

                return (
                  <div
                    key={u.uid}
                    className="py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-100 shrink-0 flex items-center justify-center font-bold text-zinc-600">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-zinc-900 truncate">
                          {handle}
                        </p>
                        <p className="text-[13px] text-zinc-500 truncate">
                          {name}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSent}
                      onClick={async () => {
                        triggerHaptic();
                        setSentUids((prev) => [...prev, u.uid]);
                        await onSendToUser(u);
                      }}
                      className={`px-4 h-9 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                        isSent
                          ? "bg-zinc-100 text-zinc-500"
                          : "loops-mention-cta-active"
                      }`}
                    >
                      {isSent ? "Sent" : "Send"}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
 * 7. ABOUT THIS ACCOUNT & STORY SETTINGS MODALS
 * ========================================================================== */
interface StoryAboutAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  authorProfile: any | null;
  fallbackName: string;
  fallbackAvatar: string;
  onViewProfile: () => void;
}

export const StoryAboutAccountModal: React.FC<StoryAboutAccountModalProps> = ({
  isOpen,
  onClose,
  authorProfile,
  fallbackName,
  fallbackAvatar,
  onViewProfile,
}) => {
  const handle =
    getSafePublicUsername(authorProfile) ||
    fallbackName.toLowerCase().replace(/\s+/g, ".");
  const displayName = getSafeDisplayName(authorProfile, fallbackName);
  const avatar =
    authorProfile?.photoURL || authorProfile?.shopLogo || fallbackAvatar;
  const isVerified = Boolean(
    authorProfile?.isVerifiedBadge ||
      authorProfile?.kycStatus === "approved" ||
      authorProfile?.role === "admin"
  );
  const joinedYear = authorProfile?.createdAt
    ? new Date(authorProfile.createdAt).getFullYear() || 2025
    : 2025;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="loops-mention-sheet w-full max-w-md rounded-t-[30px] p-6 pb-8 space-y-5"
          >
            <div className="w-11 h-1 bg-zinc-300 rounded-full mx-auto -mt-2" />
            <h3 className="text-center text-[17px] font-bold text-zinc-900">
              About this account
            </h3>

            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-18 h-18 rounded-full overflow-hidden bg-zinc-100 flex items-center justify-center text-xl font-bold text-zinc-700">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[16px] font-bold text-zinc-900">
                  {handle}
                </span>
                {isVerified && <VerifiedLoopBadge className="w-4 h-4" />}
              </div>
              <p className="text-xs text-zinc-500 max-w-xs">
                To help keep our community authentic, we show information about
                accounts on Loops.
              </p>
            </div>

            <div className="space-y-3 border-t border-zinc-100 pt-4">
              <div className="flex items-center gap-3.5">
                <Calendar className="w-5 h-5 text-zinc-700 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    Date joined
                  </p>
                  <p className="text-xs text-zinc-500">{joinedYear}</p>
                </div>
              </div>
              {isVerified && (
                <div className="flex items-center gap-3.5">
                  <Shield className="w-5 h-5 text-[#0095f6] shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      Verified account
                    </p>
                    <p className="text-xs text-zinc-500">
                      Verified creator or official store on Deep Shop Loops
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onViewProfile();
              }}
              className="w-full h-11 rounded-2xl bg-zinc-900 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>View profile</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

interface StorySettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isCloseFriends: boolean;
  allowCommenting: boolean;
  onToggleCloseFriends: () => void;
  onToggleCommenting: () => void;
}

export const StorySettingsSheet: React.FC<StorySettingsSheetProps> = ({
  isOpen,
  onClose,
  isCloseFriends,
  allowCommenting,
  onToggleCloseFriends,
  onToggleCommenting,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="loops-mention-sheet w-full max-w-md rounded-t-[30px] p-6 pb-8 space-y-5"
          >
            <div className="w-11 h-1 bg-zinc-300 rounded-full mx-auto -mt-2" />
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-zinc-900">
                Story settings
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <button
                type="button"
                onClick={onToggleCommenting}
                className="w-full flex items-center justify-between py-2 text-left cursor-pointer"
              >
                <div>
                  <p className="text-[15px] font-semibold text-zinc-900">
                    Allow story comments
                  </p>
                  <p className="text-xs text-zinc-500">
                    Let viewers leave comments and quick reactions
                  </p>
                </div>
                <div
                  className={`w-11 h-6 rounded-full p-0.5 transition ${
                    allowCommenting ? "bg-[#0095f6]" : "bg-zinc-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      allowCommenting ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </button>

              <button
                type="button"
                onClick={onToggleCloseFriends}
                className="w-full flex items-center justify-between py-2 text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4 fill-white" />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-zinc-900">
                      Close Friends badge
                    </p>
                    <p className="text-xs text-zinc-500">
                      Mark this story for Close Friends
                    </p>
                  </div>
                </div>
                <div
                  className={`w-11 h-6 rounded-full p-0.5 transition ${
                    isCloseFriends ? "bg-emerald-500" : "bg-zinc-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      isCloseFriends ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
