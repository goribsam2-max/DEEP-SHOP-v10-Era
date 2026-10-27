import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Clock,
  Sparkles,
  Check,
  ChevronRight,
  ChevronDown,
  Camera,
  MapPin,
  TrendingUp,
  Smile,
  Heart,
  Frown,
  ThumbsUp,
  Trash2,
  FileText,
  RefreshCw,
  Loader2,
} from "lucide-react";

const PartyPopperIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5.8 11.3L2 22l10.7-3.8" />
    <path d="M4 3h.01" />
    <path d="M22 8h.01" />
    <path d="M15 2h.01" />
    <path d="M22 20h.01" />
    <path d="M22 2l-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" />
    <path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z" />
  </svg>
);

const NavigationIcon: React.FC<{ className?: string }> = ({
  className = "w-4 h-4",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="3 11 22 2 13 21 11 13 3 11" />
  </svg>
);
import {
  ReplyPermissionMode,
  PostPoll,
  PostSnippet,
  PostQuoteBlock,
  PostThreadItem,
} from "../types";
import { triggerHaptic } from "../lib/haptics";

/* ============================================================================
 * 1. COMPOSER DRAFTS STORAGE HELPERS
 * ========================================================================== */
export interface ComposerDraftItem {
  id: string;
  description: string;
  postType: "normal" | "scam";
  textStyle: "normal" | "large" | "quote";
  postTag?: string;
  locationTag?: string;
  gifUrl?: string;
  stickers?: string[];
  poll?: PostPoll | null;
  snippet?: PostSnippet | null;
  quoteBlock?: PostQuoteBlock | null;
  threadItems?: PostThreadItem[];
  scheduledAt?: number | null;
  isGhostPost?: boolean;
  isAiGenerated?: boolean;
  replyPermission?: ReplyPermissionMode;
  reviewApproveReplies?: boolean;
  updatedAt: number;
}

const getDraftStorageKey = (uid?: string | null) =>
  `deep_composer_drafts_${uid || "guest"}`;

export const loadComposerDrafts = (uid?: string | null): ComposerDraftItem[] => {
  try {
    const raw = localStorage.getItem(getDraftStorageKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveComposerDraftItem = (
  uid: string | null | undefined,
  draft: ComposerDraftItem
): ComposerDraftItem[] => {
  const existing = loadComposerDrafts(uid).filter((d) => d.id !== draft.id);
  const next = [draft, ...existing].slice(0, 25);
  try {
    localStorage.setItem(getDraftStorageKey(uid), JSON.stringify(next));
  } catch {}
  return next;
};

export const removeComposerDraftItem = (
  uid: string | null | undefined,
  draftId: string
): ComposerDraftItem[] => {
  const next = loadComposerDrafts(uid).filter((d) => d.id !== draftId);
  try {
    localStorage.setItem(getDraftStorageKey(uid), JSON.stringify(next));
  } catch {}
  return next;
};

/* ============================================================================
 * 2. CUSTOM EXACT SVG ICONS MATCHING SCREENSHOTS (IMG_4957, IMG_4972, IMG_4975)
 * ========================================================================== */
export const DraftsDocIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="13" y2="17" />
  </svg>
);

export const MoreCircleDotsIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
    <circle cx="8.5" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="12" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const StickerPeelSmileIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.85"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15.5 3H7a4 4 0 0 0-4 4v10a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4V8.5L15.5 3Z" />
    <path d="M15 3v4a2 2 0 0 0 2 2h4" />
    <circle cx="9" cy="11.5" r="0.9" fill="currentColor" stroke="none" />
    <path d="M9.5 15.2c1.1 1 2.9 1 4 0" />
  </svg>
);

export const GifBadgeOutlineIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.85"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="16" rx="4" />
    <path d="M9.5 10H7.8a1.3 1.3 0 0 0-1.3 1.3v1.4A1.3 1.3 0 0 0 7.8 14h1.7v-1.8H8.4" />
    <line x1="12" y1="10" x2="12" y2="14" />
    <path d="M14.5 14v-4h2.7" />
    <line x1="14.5" y1="12" x2="16.5" y2="12" />
  </svg>
);

export const MusicNotesOutlineIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.85"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 18V6l11-2v12" />
    <path d="M9 10l11-2" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="17.5" cy="16" r="2.5" />
  </svg>
);

export const SlidersSquareIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.85"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <line x1="9" y1="7.5" x2="9" y2="16.5" />
    <line x1="7" y1="10.5" x2="11" y2="10.5" />
    <line x1="15" y1="7.5" x2="15" y2="16.5" />
    <line x1="13" y1="13.5" x2="17" y2="13.5" />
  </svg>
);

export const DottedGhostCatIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path
      d="M6.5 9.5L5.8 5.8l3.4 1.6a7.5 7.5 0 0 1 5.6 0l3.4-1.6-.7 3.7a6.8 6.8 0 1 1-11 0Z"
      strokeDasharray="2.4 2.3"
    />
    <circle cx="9.6" cy="12" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="14.4" cy="12" r="0.9" fill="currentColor" stroke="none" />
    <path d="M10.6 14.3c.8.6 2 .6 2.8 0" />
  </svg>
);

export const SnippetLinesIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="5" y="3.5" width="14" height="17" rx="3" />
    <line x1="8.5" y1="8.5" x2="15.5" y2="8.5" />
    <line x1="8.5" y1="12" x2="15.5" y2="12" />
    <line x1="8.5" y1="15.5" x2="12.5" y2="15.5" />
  </svg>
);

export const QuoteBubbleIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 20h7v-7a7 7 0 1 0-7 7Z" />
    <path
      d="M9.6 10.6c-.8 0-1.4.6-1.4 1.4s.6 1.4 1.4 1.4c.3 0 .6-.1.8-.3-.1.9-.6 1.5-1.4 1.8M14.6 10.6c-.8 0-1.4.6-1.4 1.4s.6 1.4 1.4 1.4c.3 0 .6-.1.8-.3-.1.9-.6 1.5-1.4 1.8"
      strokeWidth="1.7"
    />
  </svg>
);

export const PollBarsIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="4" y="5" width="10" height="3.5" rx="1.75" />
    <rect x="4" y="10.25" width="16" height="3.5" rx="1.75" />
    <rect x="4" y="15.5" width="12.5" height="3.5" rx="1.75" />
  </svg>
);

/* ============================================================================
 * 3. TOP-RIGHT LIQUID GLASS HEADER CAPSULE + MORPHING MENU (IMG_4957 & IMG_4972)
 * ========================================================================== */
export const LiquidGlassHeaderCapsule: React.FC<{
  draftsCount: number;
  isAiGenerated: boolean;
  scheduledAt: number | null;
  onOpenDrafts: () => void;
  onToggleAiLabel: () => void;
  onOpenSchedule: () => void;
}> = ({
  draftsCount,
  isAiGenerated,
  scheduledAt,
  onOpenDrafts,
  onToggleAiLabel,
  onOpenSchedule,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  return (
    <div ref={containerRef} className="relative z-40">
      {/* Frosted Liquid Glass Capsule */}
      <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-white/95 dark:border-white/15 shadow-[0_6px_22px_rgba(15,23,42,0.08),inset_0_1px_1.5px_rgba(255,255,255,0.95)]">
        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            setMenuOpen(false);
            onOpenDrafts();
          }}
          className="relative w-9 h-9 rounded-full flex items-center justify-center text-zinc-900 dark:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition cursor-pointer"
          title="Drafts"
          aria-label="Open drafts"
        >
          <DraftsDocIcon className="w-[19px] h-[19px]" />
          {draftsCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#1877F2] text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
              {draftsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            setMenuOpen((prev) => !prev);
          }}
          className={`w-9 h-9 rounded-full flex items-center justify-center text-zinc-900 dark:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition cursor-pointer ${
            menuOpen ? "bg-black/[0.07] dark:bg-white/15 scale-95" : ""
          }`}
          title="More post options"
          aria-label="More options"
        >
          <MoreCircleDotsIcon className="w-[19px] h-[19px]" />
        </button>
      </div>

      {/* Liquid Glass Morphing Popover (Video 00:01-00:02 & IMG_4972) */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.24, y: -12, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.2, y: -10, filter: "blur(8px)" }}
            transition={{
              type: "spring",
              stiffness: 470,
              damping: 29,
              mass: 0.72,
            }}
            className="absolute right-0 top-12 w-56 origin-top-right rounded-[28px] bg-white/80 dark:bg-zinc-900/85 backdrop-blur-2xl border border-white/95 dark:border-white/15 shadow-[0_22px_54px_rgba(15,23,42,0.16),inset_0_1.5px_2px_rgba(255,255,255,0.95)] overflow-hidden py-1.5 z-50"
          >
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                onToggleAiLabel();
                setMenuOpen(false);
              }}
              className="w-full px-5 py-3.5 text-left flex items-center justify-between gap-3 hover:bg-black/[0.045] dark:hover:bg-white/[0.07] active:scale-[0.985] transition cursor-pointer"
            >
              <span className="text-[15.5px] font-medium text-zinc-900 dark:text-white tracking-tight">
                {isAiGenerated ? "Remove AI label" : "Add AI label"}
              </span>
              {isAiGenerated && (
                <span className="w-5 h-5 rounded-full bg-[#1877F2] text-white flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </span>
              )}
            </button>

            <div className="mx-5 border-t border-black/[0.08] dark:border-white/10" />

            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setMenuOpen(false);
                onOpenSchedule();
              }}
              className="w-full px-5 py-3.5 text-left flex items-center justify-between gap-3 hover:bg-black/[0.045] dark:hover:bg-white/[0.07] active:scale-[0.985] transition cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Clock className="w-[19px] h-[19px] text-zinc-900 dark:text-zinc-100 stroke-[2] shrink-0" />
                <span className="text-[15.5px] font-medium text-zinc-900 dark:text-white tracking-tight truncate">
                  Schedule...
                </span>
              </div>
              {scheduledAt && (
                <span className="w-2 h-2 rounded-full bg-[#1877F2] shrink-0" />
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ============================================================================
 * 4. PRISMATIC IRIDESCENT LIQUID GLASS GHOST TOGGLE (Video 00:08-00:11 & IMG_4957)
 * ========================================================================== */
export const LiquidGlassGhostToggle: React.FC<{
  active: boolean;
  onChange: (next: boolean) => void;
}> = ({ active, onChange }) => {
  const [pressing, setPressing] = useState(false);
  const [refracting, setRefracting] = useState(false);
  const refractTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (refractTimerRef.current) window.clearTimeout(refractTimerRef.current);
    };
  }, []);

  const triggerLensPulse = () => {
    setRefracting(true);
    if (refractTimerRef.current) window.clearTimeout(refractTimerRef.current);
    refractTimerRef.current = window.setTimeout(() => {
      setRefracting(false);
    }, 680);
  };

  const lensActive = pressing || refracting;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      title={
        active
          ? "Ghost post enabled (Disappears in 24h)"
          : "Toggle 24-hour Ghost post"
      }
      onPointerDown={() => {
        setPressing(true);
        triggerLensPulse();
      }}
      onPointerUp={() => setPressing(false)}
      onPointerLeave={() => setPressing(false)}
      onClick={() => {
        triggerHaptic();
        triggerLensPulse();
        onChange(!active);
      }}
      className={`relative w-[78px] h-[40px] rounded-full p-[3px] flex items-center transition-colors duration-300 cursor-pointer select-none shrink-0 ${
        active
          ? "bg-zinc-900/90 dark:bg-zinc-700/90 shadow-[0_4px_18px_rgba(99,102,241,0.28)]"
          : "bg-[#D1D3D9]/90 dark:bg-zinc-800"
      }`}
    >
      {/* Chromatic Rainbow Specular Rim Halo during Liquid Glass Morph (Video 00:08-00:10) */}
      <motion.div
        layout
        animate={{
          x: active ? 28 : 0,
          scale: lensActive ? 1.18 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 410,
          damping: 25,
          mass: 0.68,
        }}
        className={`relative w-[44px] h-[34px] rounded-full flex items-center justify-center transition-all duration-200 ${
          lensActive
            ? "bg-zinc-900/65 dark:bg-white/25 backdrop-blur-xl text-white ring-2 ring-purple-400/80 shadow-[0_0_18px_rgba(168,85,247,0.55),-4px_0_12px_rgba(59,130,246,0.55),4px_0_12px_rgba(236,72,153,0.55),inset_0_1.5px_2px_rgba(255,255,255,0.85)]"
            : active
            ? "bg-white text-zinc-900 shadow-[0_3px_12px_rgba(0,0,0,0.22),inset_0_1px_1px_rgba(255,255,255,1)]"
            : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-300 shadow-[0_2px_8px_rgba(15,23,42,0.12)]"
        }`}
      >
        <DottedGhostCatIcon
          className={`w-[20px] h-[20px] transition-transform duration-200 ${
            lensActive ? "scale-105 text-white/95" : ""
          }`}
        />
      </motion.div>
    </button>
  );
};

/* ============================================================================
 * 5. ATTACHMENT MORE (...) LIQUID GLASS POPOVER (IMG_4975)
 * ========================================================================== */
export const AttachmentMorePopover: React.FC<{
  open: boolean;
  onClose: () => void;
  onSelectAction: (
    action: "snippet" | "quote" | "camera" | "poll" | "location"
  ) => void;
}> = ({ open, onClose, onSelectAction }) => {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open, onClose]);

  const rows: {
    id: "snippet" | "quote" | "camera" | "poll" | "location";
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "snippet",
      label: "Snippet",
      icon: <SnippetLinesIcon className="w-[21px] h-[21px]" />,
    },
    {
      id: "quote",
      label: "Quote",
      icon: <QuoteBubbleIcon className="w-[21px] h-[21px]" />,
    },
    {
      id: "camera",
      label: "Camera",
      icon: <Camera className="w-[21px] h-[21px] stroke-[1.9]" />,
    },
    {
      id: "poll",
      label: "Poll",
      icon: <PollBarsIcon className="w-[21px] h-[21px]" />,
    },
    {
      id: "location",
      label: "Location",
      icon: <MapPin className="w-[21px] h-[21px] stroke-[1.9]" />,
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.25, y: -10, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.22, y: -8, filter: "blur(8px)" }}
          transition={{
            type: "spring",
            stiffness: 460,
            damping: 29,
            mass: 0.72,
          }}
          className="absolute left-0 top-11 w-56 origin-top-left rounded-[30px] bg-white/84 dark:bg-zinc-900/86 backdrop-blur-2xl border border-white/95 dark:border-white/15 shadow-[0_24px_60px_rgba(15,23,42,0.16),inset_0_1.5px_2px_rgba(255,255,255,0.95)] py-2.5 z-50"
        >
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => {
                triggerHaptic();
                onSelectAction(row.id);
                onClose();
              }}
              className="w-full px-5 py-3 flex items-center gap-3.5 text-left text-zinc-900 dark:text-zinc-100 hover:bg-black/[0.045] dark:hover:bg-white/[0.07] active:scale-[0.985] transition cursor-pointer"
            >
              <span className="text-zinc-900 dark:text-zinc-100 shrink-0">
                {row.icon}
              </span>
              <span className="text-[15.5px] font-medium tracking-tight">
                {row.label}
              </span>
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
 * 6. DRAFTS BOTTOM SHEET (Video 00:04 & 00:06)
 * ========================================================================== */
export const DraftsBottomSheet: React.FC<{
  isOpen: boolean;
  drafts: ComposerDraftItem[];
  canSaveCurrent: boolean;
  onClose: () => void;
  onSaveCurrentDraft: () => void;
  onLoadDraft: (draft: ComposerDraftItem) => void;
  onDeleteDraft: (draftId: string) => void;
}> = ({
  isOpen,
  drafts,
  canSaveCurrent,
  onClose,
  onSaveCurrentDraft,
  onLoadDraft,
  onDeleteDraft,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg h-[82vh] sm:h-[74vh] bg-white dark:bg-zinc-950 rounded-t-[32px] sm:rounded-[32px] shadow-2xl border border-white/80 dark:border-zinc-800 flex flex-col overflow-hidden"
          >
            {/* Header matching Video 00:04 */}
            <div className="px-5 pt-4 pb-3.5 border-b border-slate-100 dark:border-zinc-800/80 grid grid-cols-3 items-center">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onClose();
                }}
                className="text-left text-[15.5px] font-normal text-zinc-900 dark:text-zinc-200 hover:opacity-70 cursor-pointer"
              >
                Cancel
              </button>

              <h2 className="text-center text-[16px] font-bold text-zinc-900 dark:text-white">
                Drafts
              </h2>

              <div className="flex justify-end">
                {canSaveCurrent && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      onSaveCurrentDraft();
                    }}
                    className="px-3 py-1 rounded-full bg-[#1877F2] text-white text-xs font-semibold hover:bg-[#1465D8] active:scale-95 transition cursor-pointer whitespace-nowrap"
                  >
                    Save current
                  </button>
                )}
              </div>
            </div>

            {/* Body */}
            {drafts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
                <p className="text-[15px] text-zinc-400 dark:text-zinc-500 font-normal">
                  No drafts yet.
                </p>
                {canSaveCurrent && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      onSaveCurrentDraft();
                    }}
                    className="mt-1 px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer"
                  >
                    Save current post as draft
                  </button>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/80 p-3">
                {drafts.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      triggerHaptic();
                      onLoadDraft(item);
                      onClose();
                    }}
                    className="p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-900/70 flex items-start justify-between gap-3 cursor-pointer transition"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                        <FileText className="w-3.5 h-3.5 text-[#1877F2] shrink-0" />
                        <span>
                          {new Date(item.updatedAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                        {item.postTag && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
                            #{item.postTag}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2">
                        {item.description ||
                          item.poll?.question ||
                          item.quoteBlock?.text ||
                          item.snippet?.title ||
                          (item.gifUrl ? "Attached GIF draft" : "Untitled draft")}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {item.poll && (
                          <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#1877F2] font-semibold">
                            Poll ({item.poll.options.length} options)
                          </span>
                        )}
                        {item.snippet && (
                          <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold">
                            Snippet
                          </span>
                        )}
                        {item.gifUrl && (
                          <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 font-semibold">
                            GIF
                          </span>
                        )}
                        {item.isGhostPost && (
                          <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
                            Ghost 24h
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic();
                        onDeleteDraft(item.id);
                      }}
                      className="w-9 h-9 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-600 flex items-center justify-center shrink-0 cursor-pointer"
                      aria-label="Delete draft"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
 * 7. iOS 3D DRUM WHEEL SCHEDULE PICKER (IMG_4959)
 * ========================================================================== */
const ITEM_HEIGHT = 40;

interface WheelColumnProps {
  items: string[];
  selectedIndex: number;
  onChangeIndex: (idx: number) => void;
  align?: "right" | "center" | "left";
  widthClass?: string;
}

const DrumWheelColumn: React.FC<WheelColumnProps> = ({
  items,
  selectedIndex,
  onChangeIndex,
  align = "center",
  widthClass = "flex-1",
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const targetTop = selectedIndex * ITEM_HEIGHT;
    if (Math.abs(el.scrollTop - targetTop) > 4) {
      el.scrollTo({ top: targetTop, behavior: "auto" });
    }
  }, [selectedIndex]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const rawIdx = Math.round(el.scrollTop / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, rawIdx));
    if (clamped !== selectedIndex) {
      onChangeIndex(clamped);
    }
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      el.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: "smooth" });
    }, 110);
  };

  const alignClass =
    align === "right"
      ? "justify-end pr-3 text-right"
      : align === "left"
      ? "justify-start pl-3 text-left"
      : "justify-center text-center";

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className={`relative h-[220px] overflow-y-auto snap-y snap-mandatory no-scrollbar select-none ${widthClass}`}
    >
      <div className="h-[90px] shrink-0" />
      {items.map((label, idx) => {
        const diff = Math.abs(idx - selectedIndex);
        const depthClasses =
          diff === 0
            ? "text-[20px] font-medium text-zinc-900 dark:text-white opacity-100 scale-100"
            : diff === 1
            ? "text-[17.5px] font-normal text-zinc-500 dark:text-zinc-400 opacity-75 scale-95"
            : diff === 2
            ? "text-[15.5px] font-normal text-zinc-400 dark:text-zinc-500 opacity-50 scale-90"
            : "text-[13.5px] font-normal text-zinc-400 dark:text-zinc-600 opacity-25 scale-85";

        return (
          <button
            key={`${label}-${idx}`}
            type="button"
            onClick={() => {
              triggerHaptic();
              onChangeIndex(idx);
              scrollRef.current?.scrollTo({
                top: idx * ITEM_HEIGHT,
                behavior: "smooth",
              });
            }}
            className={`w-full h-[40px] snap-center flex items-center transition-all duration-150 cursor-pointer whitespace-nowrap ${alignClass} ${depthClasses}`}
          >
            <span>{label}</span>
          </button>
        );
      })}
      <div className="h-[90px] shrink-0" />
    </div>
  );
};

export const ScheduleDrumWheelModal: React.FC<{
  isOpen: boolean;
  scheduledAt: number | null;
  onClose: () => void;
  onConfirmSchedule: (timestamp: number | null) => void;
}> = ({ isOpen, scheduledAt, onClose, onConfirmSchedule }) => {
  // Build 30 days starting from Today
  const dayEntries = React.useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 30 }, (_, idx) => {
      const d = new Date(base.getTime() + idx * 86400000);
      const label =
        idx === 0
          ? "Today"
          : d.toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
            });
      return { date: d, label };
    });
  }, [isOpen]);

  const hours = React.useMemo(
    () => Array.from({ length: 12 }, (_, i) => String(i + 1)),
    []
  );
  const minutes = React.useMemo(
    () => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")),
    []
  );
  const periods = ["am", "pm"];

  const [dayIdx, setDayIdx] = useState(0);
  const [hourIdx, setHourIdx] = useState(3); // 4
  const [minIdx, setMinIdx] = useState(0); // 00
  const [periodIdx, setPeriodIdx] = useState(1); // pm

  useEffect(() => {
    if (!isOpen) return;
    const initDate = scheduledAt
      ? new Date(scheduledAt)
      : new Date(Date.now() + 3600 * 1000);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const targetDayStart = new Date(initDate);
    targetDayStart.setHours(0, 0, 0, 0);
    const diffDays = Math.max(
      0,
      Math.min(
        29,
        Math.round((targetDayStart.getTime() - startOfToday.getTime()) / 86400000)
      )
    );
    const h24 = initDate.getHours();
    const isPm = h24 >= 12;
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    setDayIdx(diffDays);
    setHourIdx(h12 - 1);
    setMinIdx(initDate.getMinutes());
    setPeriodIdx(isPm ? 1 : 0);
  }, [isOpen, scheduledAt]);

  const handleApply = () => {
    triggerHaptic();
    const chosenDay = dayEntries[dayIdx]?.date || new Date();
    const h12 = hourIdx + 1;
    const isPm = periodIdx === 1;
    const h24 = isPm ? (h12 === 12 ? 12 : h12 + 12) : h12 === 12 ? 0 : h12;

    const target = new Date(chosenDay);
    target.setHours(h24, minIdx, 0, 0);

    // Ensure scheduled timestamp is at least 5 minutes in the future
    const minFuture = Date.now() + 5 * 60 * 1000;
    const finalTs = Math.max(minFuture, target.getTime());
    onConfirmSchedule(finalTs);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[110] bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[380px] rounded-[36px] bg-[#ECECEE]/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-white/90 dark:border-white/15 shadow-[0_24px_64px_rgba(0,0,0,0.22),inset_0_1.5px_2px_rgba(255,255,255,0.9)] p-4 space-y-3"
          >
            {/* Header Bar */}
            <div className="flex items-center justify-between px-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <span className="text-sm font-bold text-zinc-900 dark:text-white">
                Schedule
              </span>
              <button
                type="button"
                onClick={handleApply}
                className="text-sm font-bold text-[#1877F2] hover:opacity-80 cursor-pointer"
              >
                Done
              </button>
            </div>

            {/* 3D Cylindrical Drum Wheel Container matching IMG_4959 */}
            <div className="relative h-[220px] flex items-center px-2">
              {/* Center Selection Bar */}
              <div className="pointer-events-none absolute inset-x-1.5 top-1/2 -translate-y-1/2 h-[40px] rounded-2xl bg-black/[0.065] dark:bg-white/[0.09]" />

              <DrumWheelColumn
                items={dayEntries.map((d) => d.label)}
                selectedIndex={dayIdx}
                onChangeIndex={setDayIdx}
                align="right"
                widthClass="w-[46%]"
              />
              <DrumWheelColumn
                items={hours}
                selectedIndex={hourIdx}
                onChangeIndex={setHourIdx}
                align="center"
                widthClass="w-[18%]"
              />
              <DrumWheelColumn
                items={minutes}
                selectedIndex={minIdx}
                onChangeIndex={setMinIdx}
                align="center"
                widthClass="w-[18%]"
              />
              <DrumWheelColumn
                items={periods}
                selectedIndex={periodIdx}
                onChangeIndex={setPeriodIdx}
                align="left"
                widthClass="w-[18%]"
              />
            </div>

            {scheduledAt && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onConfirmSchedule(null);
                  onClose();
                }}
                className="w-full py-2.5 rounded-2xl bg-white/80 dark:bg-zinc-800 text-rose-600 text-xs font-bold hover:bg-white transition cursor-pointer"
              >
                Clear schedule
              </button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
 * 8. STICKERS BOTTOM SHEET + FLOATING LIQUID GLASS DOCK (IMG_4973)
 * ========================================================================== */
const makeHit0m0Sticker = (char: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <text x="60" y="92" text-anchor="middle" font-family="Georgia, 'Trebuchet MS', sans-serif" font-weight="900" font-size="86" fill="#18181B" stroke="#FFFFFF" stroke-width="10" paint-order="stroke">${char}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const makeRubyPopSticker = (label: string, fill: string, textFill = "#FFFFFF") => {
  const fontSize = label.length > 2 ? 40 : 72;
  const yPos = label.length > 2 ? 74 : 86;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="120" viewBox="0 0 140 120">
    <text x="70" y="${yPos}" text-anchor="middle" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="${fontSize}" fill="${fill}" stroke="#18181B" stroke-width="8" paint-order="stroke">${label}</text>
    <text x="70" y="${yPos}" text-anchor="middle" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="${fontSize}" fill="${fill}" stroke="${textFill}" stroke-width="2" paint-order="stroke">${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const makeEmojiFallbackSvg = (emoji: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <text x="60" y="86" text-anchor="middle" font-size="76">${emoji}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const KAOMOJI_ITEMS = [
  "(◕‿◕)",
  "ʕ•ᴥ•ʔ",
  "¯\\_(ツ)_/¯",
  "(づ｡◕‿‿◕｡)づ",
  "(¬‿¬)",
  "(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧",
  "(•̀ᴗ•́)و ̑̑",
  "(｡♥‿♥｡)",
  "(╯°□°）╯︵ ┻━┻",
];

const HIT0M0_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const EMOJI_STICKERS = [
  { id: "joy", name: "Laugh Cry", emoji: "😂", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.webp" },
  { id: "heart_eyes", name: "Heart Eyes", emoji: "😍", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.webp" },
  { id: "peace", name: "Peace", emoji: "✌️", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/270c_fe0f/512.webp" },
  { id: "chef_kiss", name: "Chef Kiss", emoji: "😘", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f618/512.webp" },
  { id: "peach", name: "Peach", emoji: "🍑", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f351/512.webp" },
  { id: "mind_blown", name: "Mind Blown", emoji: "🤯", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f92f/512.webp" },
  { id: "fire", name: "Fire", emoji: "🔥", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp" },
  { id: "party", name: "Celebrate", emoji: "🥳", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f973/512.webp" },
  { id: "sob", name: "Crying", emoji: "😭", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f62d/512.webp" },
  { id: "plead", name: "Pleading", emoji: "🥺", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f97a/512.webp" },
  { id: "hundred", name: "100", emoji: "💯", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f4af/512.webp" },
  { id: "sparkles", name: "Sparkles", emoji: "✨", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/2728/512.webp" },
];

const MEME_CAT_STICKERS = [
  { id: "cat_dance", name: "Happy Cat", fallback: "🐱", url: "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" },
  { id: "cat_vibing", name: "Vibing Cat", fallback: "😺", url: "https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif" },
  { id: "cat_huh", name: "Side Eye Cat", fallback: "😼", url: "https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif" },
  { id: "cat_love", name: "Cat Kiss", fallback: "😻", url: "https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif" },
  { id: "cat_pop", name: "Shocked Cat", fallback: "🙀", url: "https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif" },
  { id: "cat_key", name: "Keyboard Cat", fallback: "🐈", url: "https://media.giphy.com/media/ule4vhcY1xEKQ/giphy.gif" },
];

const RUBY_POP_ITEMS = [
  { id: "ruby_a", name: "a", url: makeRubyPopSticker("a", "#EC4899") },
  { id: "ruby_like", name: "like", url: makeRubyPopSticker("like", "#F43F5E", "#FDE047") },
  { id: "ruby_omg", name: "omg", url: makeRubyPopSticker("omg", "#8B5CF6", "#A5F3FC") },
  { id: "ruby_yes", name: "yes!", url: makeRubyPopSticker("yes!", "#10B981", "#FEF08A") },
  { id: "ruby_wow", name: "wow", url: makeRubyPopSticker("wow", "#F59E0B", "#FFFFFF") },
  { id: "ruby_hot", name: "vibe", url: makeRubyPopSticker("vibe", "#3B82F6", "#FBCFE8") },
];

export const StickersBottomSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onInsertText: (kaomoji: string) => void;
  onAttachSticker: (stickerUrl: string) => void;
}> = ({ isOpen, onClose, onInsertText, onAttachSticker }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDockTab, setActiveDockTab] = useState<
    "hit0m0" | "emojis" | "cats" | "ruby" | "kaomoji"
  >("hit0m0");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const kaomojiRef = useRef<HTMLDivElement | null>(null);
  const hit0m0Ref = useRef<HTMLDivElement | null>(null);
  const emojisRef = useRef<HTMLDivElement | null>(null);
  const catsRef = useRef<HTMLDivElement | null>(null);
  const rubyRef = useRef<HTMLDivElement | null>(null);

  const toggleCollapse = (key: string) => {
    triggerHaptic();
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const jumpToSection = (
    tab: "hit0m0" | "emojis" | "cats" | "ruby" | "kaomoji",
    ref: React.RefObject<HTMLDivElement | null>
  ) => {
    triggerHaptic();
    setActiveDockTab(tab);
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const q = searchQuery.trim().toLowerCase();

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg h-[84vh] bg-white dark:bg-zinc-950 rounded-t-[34px] sm:rounded-[34px] shadow-2xl border border-white/80 dark:border-zinc-800 flex flex-col overflow-hidden"
          >
            {/* Grab Handle */}
            <div className="w-11 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mt-3 mb-2 shrink-0" />

            {/* Search Stickers Input matching IMG_4973 */}
            <div className="px-4 pb-3 shrink-0">
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#F2F3F5] dark:bg-zinc-900">
                <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search stickers"
                  className="w-full bg-transparent text-[15px] text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Sticker Packs */}
            <div className="flex-1 overflow-y-auto px-4 pb-28 space-y-5 divide-y divide-slate-100 dark:divide-zinc-800/80 no-scrollbar">
              {/* 1. Kaomoji */}
              {(!q || "kaomoji smile shrug bear".includes(q)) && (
                <div ref={kaomojiRef} className="pt-2 space-y-3">
                  <button
                    type="button"
                    onClick={() => toggleCollapse("kaomoji")}
                    className="px-3.5 py-1.5 rounded-full bg-white dark:bg-zinc-900 shadow-[0_2px_10px_rgba(15,23,42,0.06)] border border-slate-100 dark:border-zinc-800 text-[13px] font-bold text-zinc-900 dark:text-white inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Kaomoji</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${
                        collapsed.kaomoji ? "-rotate-90" : ""
                      }`}
                    />
                  </button>

                  {!collapsed.kaomoji && (
                    <div className="grid grid-cols-3 gap-2.5">
                      {KAOMOJI_ITEMS.map((km) => (
                        <button
                          key={km}
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            onInsertText(km);
                            onClose();
                          }}
                          className="h-14 rounded-2xl bg-[#F8F8FA] dark:bg-zinc-900 hover:bg-[#EFEFF4] dark:hover:bg-zinc-800 text-zinc-900 dark:text-white text-[14px] font-semibold flex items-center justify-center active:scale-95 transition cursor-pointer"
                        >
                          {km}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 2. Alphabet by hit0m0 */}
              <div ref={hit0m0Ref} className="pt-5 space-y-3">
                <button
                  type="button"
                  onClick={() => toggleCollapse("hit0m0")}
                  className="px-3.5 py-1.5 rounded-full bg-white dark:bg-zinc-900 shadow-[0_2px_10px_rgba(15,23,42,0.06)] border border-slate-100 dark:border-zinc-800 text-[13px] font-bold text-zinc-900 dark:text-white inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Alphabet by hit0m0</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      collapsed.hit0m0 ? "-rotate-90" : ""
                    }`}
                  />
                </button>

                {!collapsed.hit0m0 && (
                  <div className="grid grid-cols-6 gap-2">
                    {HIT0M0_LETTERS.filter(
                      (ch) => !q || ch.toLowerCase().includes(q) || "alphabet".includes(q)
                    ).map((ch) => {
                      const src = makeHit0m0Sticker(ch);
                      return (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            onAttachSticker(src);
                            onClose();
                          }}
                          className="aspect-square rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-900 flex items-center justify-center p-1.5 active:scale-90 transition cursor-pointer"
                        >
                          <img
                            src={src}
                            alt={ch}
                            className="w-12 h-12 object-contain"
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Emojis */}
              <div ref={emojisRef} className="pt-5 space-y-3">
                <button
                  type="button"
                  onClick={() => toggleCollapse("emojis")}
                  className="px-3.5 py-1.5 rounded-full bg-white dark:bg-zinc-900 shadow-[0_2px_10px_rgba(15,23,42,0.06)] border border-slate-100 dark:border-zinc-800 text-[13px] font-bold text-zinc-900 dark:text-white inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Emojis</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      collapsed.emojis ? "-rotate-90" : ""
                    }`}
                  />
                </button>

                {!collapsed.emojis && (
                  <div className="grid grid-cols-6 gap-2.5">
                    {EMOJI_STICKERS.filter(
                      (e) =>
                        !q ||
                        e.name.toLowerCase().includes(q) ||
                        "emojis".includes(q)
                    ).map((em) => (
                      <button
                        key={em.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          onAttachSticker(em.url);
                          onClose();
                        }}
                        className="aspect-square rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-900 flex items-center justify-center p-1 active:scale-90 transition cursor-pointer"
                      >
                        <img
                          src={em.url}
                          alt={em.name}
                          referrerPolicy="no-referrer"
                          onError={(ev) => {
                            ev.currentTarget.src = makeEmojiFallbackSvg(em.emoji);
                          }}
                          className="w-12 h-12 object-contain"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Meme Cat */}
              <div ref={catsRef} className="pt-5 space-y-3">
                <button
                  type="button"
                  onClick={() => toggleCollapse("cats")}
                  className="px-3.5 py-1.5 rounded-full bg-white dark:bg-zinc-900 shadow-[0_2px_10px_rgba(15,23,42,0.06)] border border-slate-100 dark:border-zinc-800 text-[13px] font-bold text-zinc-900 dark:text-white inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Meme Cat</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      collapsed.cats ? "-rotate-90" : ""
                    }`}
                  />
                </button>

                {!collapsed.cats && (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                    {MEME_CAT_STICKERS.filter(
                      (c) =>
                        !q ||
                        c.name.toLowerCase().includes(q) ||
                        "meme cat".includes(q)
                    ).map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          onAttachSticker(cat.url);
                          onClose();
                        }}
                        className="aspect-square rounded-2xl bg-[#F8F8FA] dark:bg-zinc-900 overflow-hidden hover:ring-2 hover:ring-[#1877F2]/40 flex items-center justify-center active:scale-90 transition cursor-pointer"
                      >
                        <img
                          src={cat.url}
                          alt={cat.name}
                          referrerPolicy="no-referrer"
                          onError={(ev) => {
                            ev.currentTarget.src = makeEmojiFallbackSvg(
                              cat.fallback
                            );
                          }}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. Alphabet by irlrubyph */}
              <div ref={rubyRef} className="pt-5 space-y-3">
                <button
                  type="button"
                  onClick={() => toggleCollapse("ruby")}
                  className="px-3.5 py-1.5 rounded-full bg-white dark:bg-zinc-900 shadow-[0_2px_10px_rgba(15,23,42,0.06)] border border-slate-100 dark:border-zinc-800 text-[13px] font-bold text-zinc-900 dark:text-white inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Alphabet by irlrubyph</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      collapsed.ruby ? "-rotate-90" : ""
                    }`}
                  />
                </button>

                {!collapsed.ruby && (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                    {RUBY_POP_ITEMS.filter(
                      (r) => !q || r.name.toLowerCase().includes(q)
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          onAttachSticker(item.url);
                          onClose();
                        }}
                        className="aspect-square rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-900 flex items-center justify-center p-1 active:scale-90 transition cursor-pointer"
                      >
                        <img
                          src={item.url}
                          alt={item.name}
                          className="w-14 h-14 object-contain"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Floating Prismatic Liquid Glass Bottom Category Dock (Exact IMG_4973 Bottom Bar) */}
            <div className="absolute bottom-4 inset-x-4 z-20 flex justify-center pointer-events-none">
              <div className="pointer-events-auto w-full max-w-md px-3 py-2 rounded-full bg-gradient-to-r from-pink-100/75 via-white/80 to-amber-100/75 dark:from-zinc-900/85 dark:via-zinc-800/85 dark:to-zinc-900/85 backdrop-blur-2xl border border-white/95 dark:border-white/15 shadow-[0_14px_38px_rgba(15,23,42,0.16),inset_0_1.5px_2px_rgba(255,255,255,0.95)] flex items-center justify-around">
                <button
                  type="button"
                  onClick={() => jumpToSection("hit0m0", hit0m0Ref)}
                  className="relative w-10 h-10 rounded-full flex flex-col items-center justify-center active:scale-90 transition cursor-pointer"
                  title="Alphabet"
                >
                  <span className="text-[19px] font-black text-zinc-900 dark:text-white leading-none">
                    A
                  </span>
                  {activeDockTab === "hit0m0" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white mt-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => jumpToSection("emojis", emojisRef)}
                  className="relative w-10 h-10 rounded-full flex flex-col items-center justify-center active:scale-90 transition cursor-pointer"
                  title="Emojis"
                >
                  <span className="text-[20px] leading-none">😂</span>
                  {activeDockTab === "emojis" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white mt-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => jumpToSection("cats", catsRef)}
                  className="relative w-10 h-10 rounded-full flex flex-col items-center justify-center active:scale-90 transition cursor-pointer"
                  title="Meme Cat"
                >
                  <span className="text-[20px] leading-none">🐱</span>
                  {activeDockTab === "cats" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white mt-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => jumpToSection("ruby", rubyRef)}
                  className="relative w-10 h-10 rounded-full flex flex-col items-center justify-center active:scale-90 transition cursor-pointer"
                  title="Pop Stickers"
                >
                  <span className="text-[19px] font-black text-pink-500 leading-none">
                    a
                  </span>
                  {activeDockTab === "ruby" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white mt-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => jumpToSection("kaomoji", kaomojiRef)}
                  className="relative px-2 h-10 rounded-full flex flex-col items-center justify-center active:scale-90 transition cursor-pointer"
                  title="Kaomoji"
                >
                  <span className="text-[12px] font-extrabold text-amber-600 dark:text-amber-400 leading-none">
                    (◕‿◕)
                  </span>
                  {activeDockTab === "kaomoji" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white mt-0.5" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
 * 9. GIPHY BOTTOM SHEET WITH CATEGORY FILTERS & 2-COL MASONRY (IMG_4974)
 * ========================================================================== */
interface GifItem {
  id: string;
  title: string;
  url: string;
  category?: string;
}

const FALLBACK_GIFS: GifItem[] = [
  { id: "fg1", title: "Plotting Smile", category: "trending", url: "https://media.giphy.com/media/UTFiHeDL8cOSA/giphy.gif" },
  { id: "fg2", title: "Always", category: "trending", url: "https://media.giphy.com/media/6RIEW15CCWRvq/giphy.gif" },
  { id: "fg3", title: "Awesome Celebration", category: "celebrate", url: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif" },
  { id: "fg4", title: "Laughing", category: "laugh", url: "https://media.giphy.com/media/xr9AQyxLtjlxS/giphy.gif" },
  { id: "fg5", title: "Mind Blown", category: "trending", url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif" },
  { id: "fg6", title: "Love Hearts", category: "love", url: "https://media.giphy.com/media/26FLdm964upOuiqUE/giphy.gif" },
  { id: "fg7", title: "Thumbs Up", category: "thumbs_up", url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif" },
  { id: "fg8", title: "Approved Yes", category: "thumbs_up", url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif" },
  { id: "fg9", title: "Sad Rain", category: "sad", url: "https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif" },
  { id: "fg10", title: "Waiting", category: "sad", url: "https://media.giphy.com/media/tXL4FHPSnVJ0A/giphy.gif" },
  { id: "fg11", title: "Dance Party", category: "celebrate", url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif" },
  { id: "fg12", title: "Minions Excited", category: "laugh", url: "https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif" },
];

const GIF_CATEGORIES = [
  { id: "trending", query: "", label: "Trending", icon: TrendingUp },
  { id: "laugh", query: "laugh funny", label: "Laugh", icon: Smile },
  { id: "love", query: "love heart", label: "Love", icon: Heart },
  { id: "sad", query: "sad cry", label: "Sad", icon: Frown },
  { id: "celebrate", query: "celebrate party", label: "Celebrate", icon: PartyPopperIcon },
  { id: "thumbs_up", query: "thumbs up awesome", label: "Thumbs up", icon: ThumbsUp },
];

export const GiphyBottomSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelectGif: (gifUrl: string) => void;
}> = ({ isOpen, onClose, onSelectGif }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("trending");
  const [gifs, setGifs] = useState<GifItem[]>(FALLBACK_GIFS);
  const [loading, setLoading] = useState(false);
  const [brokenIds, setBrokenIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    const catObj = GIF_CATEGORIES.find((c) => c.id === activeCategory);
    const effectiveQuery = searchQuery.trim() || catObj?.query || "";

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/gifs?q=${encodeURIComponent(effectiveQuery)}&limit=24`
        );
        if (res.ok) {
          const data = await res.json();
          if (active && Array.isArray(data?.items) && data.items.length > 0) {
            setGifs(data.items);
            setLoading(false);
            return;
          }
        }
      } catch {}

      if (active) {
        const filteredFallback = effectiveQuery
          ? FALLBACK_GIFS.filter(
              (g) =>
                g.title.toLowerCase().includes(effectiveQuery.toLowerCase()) ||
                g.category === activeCategory
            )
          : FALLBACK_GIFS;
        setGifs(filteredFallback.length > 0 ? filteredFallback : FALLBACK_GIFS);
        setLoading(false);
      }
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isOpen, searchQuery, activeCategory]);

  const visibleGifs = gifs.filter((g) => !brokenIds[g.id]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg h-[84vh] bg-white dark:bg-zinc-950 rounded-t-[34px] sm:rounded-[34px] shadow-2xl border border-white/80 dark:border-zinc-800 flex flex-col overflow-hidden"
          >
            {/* Grab Handle */}
            <div className="w-11 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mt-3 mb-2 shrink-0" />

            {/* Search GIPHY Input */}
            <div className="px-4 pb-2.5 space-y-2.5 shrink-0">
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#F2F3F5] dark:bg-zinc-900">
                <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search GIPHY"
                  className="w-full bg-transparent text-[15px] text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Reaction Category Icon Row matching IMG_4974 */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {GIF_CATEGORIES.map((cat) => {
                  const IconComp = cat.icon;
                  const isActive =
                    !searchQuery.trim() && activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        setSearchQuery("");
                        setActiveCategory(cat.id);
                      }}
                      title={cat.label}
                      className={`w-11 h-10 rounded-xl flex items-center justify-center transition cursor-pointer shrink-0 ${
                        isActive
                          ? "bg-[#EFEFEF] dark:bg-zinc-800 text-zinc-900 dark:text-white"
                          : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                      }`}
                    >
                      <IconComp className="w-5 h-5 stroke-[2]" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2-Column Masonry GIF Grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 pt-1 no-scrollbar">
              {loading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-zinc-400">
                  <Loader2 className="w-6 h-6 animate-spin text-[#1877F2]" />
                  <span className="text-xs font-medium">Loading GIFs...</span>
                </div>
              ) : (
                <div className="columns-2 gap-2.5 space-y-2.5">
                  {visibleGifs.map((gif) => (
                    <button
                      key={gif.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        onSelectGif(gif.url);
                        onClose();
                      }}
                      className="w-full break-inside-avoid rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 block hover:opacity-95 active:scale-[0.98] transition cursor-pointer"
                    >
                      <img
                        src={gif.url}
                        alt={gif.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setBrokenIds((prev) => ({ ...prev, [gif.id]: true }))
                        }
                        className="w-full h-auto object-cover block"
                      />
                    </button>
                  ))}
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
 * 10. POST OPTIONS BOTTOM SHEET (IMG_4958)
 * ========================================================================== */
export const PostOptionsBottomSheet: React.FC<{
  isOpen: boolean;
  replyPermission: ReplyPermissionMode;
  reviewApproveReplies: boolean;
  alsoShareOn: string[];
  onChangeReplyPermission: (mode: ReplyPermissionMode) => void;
  onChangeReviewApprove: (val: boolean) => void;
  onChangeAlsoShareOn: (targets: string[]) => void;
  onClose: () => void;
}> = ({
  isOpen,
  replyPermission,
  reviewApproveReplies,
  alsoShareOn,
  onChangeReplyPermission,
  onChangeReviewApprove,
  onChangeAlsoShareOn,
  onClose,
}) => {
  const [showShareSubmenu, setShowShareSubmenu] = useState(false);

  const replyOptions: { id: ReplyPermissionMode; label: string }[] = [
    { id: "anyone", label: "Anyone" },
    { id: "followers", label: "Your followers" },
    { id: "following", label: "Profiles you follow" },
    { id: "mentioned", label: "Profiles that you mention" },
  ];

  const shareTargets = [
    { id: "story", label: "My 24h Story" },
    { id: "copy_link", label: "Auto-copy Share Link on Post" },
  ];

  const toggleShareTarget = (id: string) => {
    triggerHaptic();
    if (alsoShareOn.includes(id)) {
      onChangeAlsoShareOn(alsoShareOn.filter((t) => t !== id));
    } else {
      onChangeAlsoShareOn([...alsoShareOn, id]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[110] bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 370, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#F3F4F6] dark:bg-zinc-950 rounded-t-[36px] sm:rounded-[36px] p-5 space-y-4 shadow-2xl border border-white/80 dark:border-zinc-800"
          >
            {/* Grab Handle */}
            <div className="w-11 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto" />

            {!showShareSubmenu ? (
              <>
                {/* Section 1: Who can reply and quote */}
                <div className="space-y-2">
                  <p className="px-1 text-[13px] font-semibold text-zinc-500 dark:text-zinc-400">
                    Who can reply and quote
                  </p>
                  <div className="rounded-[24px] bg-white dark:bg-zinc-900 divide-y divide-slate-100 dark:divide-zinc-800/80 overflow-hidden shadow-2xs">
                    {replyOptions.map((opt) => {
                      const active = replyPermission === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            onChangeReplyPermission(opt.id);
                          }}
                          className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition cursor-pointer"
                        >
                          <span className="text-[15.5px] font-semibold text-zinc-900 dark:text-white">
                            {opt.label}
                          </span>
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                              active
                                ? "border-2 border-zinc-900 dark:border-white p-[3px]"
                                : "border-2 border-zinc-300 dark:border-zinc-600"
                            }`}
                          >
                            {active && (
                              <span className="w-full h-full rounded-full bg-zinc-900 dark:bg-white block" />
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section 2: Review and approve replies */}
                <div className="rounded-[24px] bg-white dark:bg-zinc-900 px-5 py-4 flex items-center justify-between gap-3 shadow-2xs">
                  <span className="text-[15.5px] font-semibold text-zinc-900 dark:text-white">
                    Review and approve replies
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={reviewApproveReplies}
                    onClick={() => {
                      triggerHaptic();
                      onChangeReviewApprove(!reviewApproveReplies);
                    }}
                    className={`relative w-13 h-7.5 rounded-full transition-colors cursor-pointer shrink-0 ${
                      reviewApproveReplies
                        ? "bg-zinc-900 dark:bg-white"
                        : "bg-zinc-300 dark:bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-5.5 h-5.5 rounded-full transition-all shadow-xs ${
                        reviewApproveReplies
                          ? "left-6.5 bg-white dark:bg-zinc-900"
                          : "left-1 bg-white"
                      }`}
                    />
                  </button>
                </div>

                {/* Section 3: Audience -> Also share on... */}
                <div className="space-y-2">
                  <p className="px-1 text-[13px] font-semibold text-zinc-500 dark:text-zinc-400">
                    Audience
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setShowShareSubmenu(true);
                    }}
                    className="w-full rounded-[24px] bg-white dark:bg-zinc-900 px-5 py-4 flex items-center justify-between gap-3 shadow-2xs hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition cursor-pointer"
                  >
                    <span className="text-[15.5px] font-semibold text-zinc-900 dark:text-white">
                      Also share on...
                    </span>
                    <span className="flex items-center gap-1 text-[14.5px] font-medium text-zinc-400">
                      <span>
                        {alsoShareOn.length === 0
                          ? "Off"
                          : `${alsoShareOn.length} on`}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </button>
                </div>

                {/* Full-width Done CTA */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    onClose();
                  }}
                  className="w-full h-13 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-bold text-[15.5px] active:scale-[0.985] transition cursor-pointer mt-2"
                >
                  Done
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={() => setShowShareSubmenu(false)}
                    className="text-sm font-semibold text-[#1877F2] cursor-pointer"
                  >
                    ‹ Back
                  </button>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">
                    Also share on...
                  </span>
                  <span className="w-10" />
                </div>

                <div className="rounded-[24px] bg-white dark:bg-zinc-900 divide-y divide-slate-100 dark:divide-zinc-800 overflow-hidden">
                  {shareTargets.map((item) => {
                    const checked = alsoShareOn.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleShareTarget(item.id)}
                        className="w-full px-5 py-4 flex items-center justify-between text-left cursor-pointer"
                      >
                        <span className="text-[15px] font-semibold text-zinc-900 dark:text-white">
                          {item.label}
                        </span>
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            checked
                              ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                              : "border-2 border-zinc-300 dark:border-zinc-600"
                          }`}
                        >
                          {checked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setShowShareSubmenu(false)}
                  className="w-full h-12 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-bold text-sm cursor-pointer"
                >
                  Save
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
 * 11. LIVE CAMERA CAPTURE MODAL & LOCATION PICKER MODAL
 * ========================================================================== */
export const LiveCameraCaptureModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCaptureFile: (file: File) => void;
  onFallbackInput: () => void;
}> = ({ isOpen, onClose, onCaptureFile, onFallbackInput }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  );
  const [cameraError, setCameraError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setCameraError(false);

    const startCam = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera unavailable");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch {
        if (active) setCameraError(true);
      }
    };

    startCam();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, facingMode]);

  const handleSnap = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    triggerHaptic();
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const captured = new File([blob], `camera-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          onCaptureFile(captured);
          onClose();
        }
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] bg-black/95 flex flex-col justify-between p-5 text-white">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold">Take Photo</span>
            <button
              type="button"
              onClick={() =>
                setFacingMode((m) => (m === "environment" ? "user" : "environment"))
              }
              className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center cursor-pointer"
              title="Flip camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center my-4">
            {cameraError ? (
              <div className="text-center space-y-4 max-w-xs">
                <Camera className="w-12 h-12 mx-auto text-white/60" />
                <p className="text-sm text-zinc-300">
                  Camera preview is restricted by browser permissions. Choose or capture a photo directly instead.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onFallbackInput();
                  }}
                  className="px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs cursor-pointer"
                >
                  Open Device Camera / Gallery
                </button>
              </div>
            ) : (
              <div className="w-full max-w-md aspect-[3/4] rounded-[32px] overflow-hidden bg-zinc-900 border border-white/15 shadow-2xl">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {!cameraError && (
            <div className="flex items-center justify-center pb-4">
              <button
                type="button"
                onClick={handleSnap}
                className="w-18 h-18 rounded-full border-4 border-white p-1.5 flex items-center justify-center active:scale-90 transition cursor-pointer"
                aria-label="Capture photo"
              >
                <span className="w-full h-full rounded-full bg-white block" />
              </button>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
};

const POPULAR_LOCATIONS = [
  "Dhaka, Bangladesh",
  "Gulshan, Dhaka",
  "Dhanmondi, Dhaka",
  "Uttara, Dhaka",
  "Chattogram, Bangladesh",
  "Sylhet, Bangladesh",
  "Rajshahi, Bangladesh",
  "Cox's Bazar, Bangladesh",
];

export const LocationPickerModal: React.FC<{
  isOpen: boolean;
  currentLocation: string;
  onSelectLocation: (loc: string) => void;
  onClose: () => void;
}> = ({ isOpen, currentLocation, onSelectLocation, onClose }) => {
  const [query, setQuery] = useState(currentLocation || "");
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    if (isOpen) setQuery(currentLocation || "");
  }, [isOpen, currentLocation]);

  const detectBrowserLocation = () => {
    if (!navigator.geolocation) return;
    triggerHaptic();
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
          );
          const data = await res.json();
          const city =
            data?.address?.city ||
            data?.address?.town ||
            data?.address?.suburb ||
            data?.address?.state ||
            "Current Location";
          const country = data?.address?.country || "";
          const formatted = country ? `${city}, ${country}` : city;
          onSelectLocation(formatted);
          onClose();
        } catch {
          onSelectLocation("Dhaka, Bangladesh");
          onClose();
        } finally {
          setDetecting(false);
        }
      },
      () => {
        setDetecting(false);
      },
      { timeout: 6000 }
    );
  };

  const filtered = POPULAR_LOCATIONS.filter(
    (loc) => !query.trim() || loc.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[110] bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 370, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-zinc-950 rounded-t-[34px] sm:rounded-[34px] p-5 space-y-4 shadow-2xl border border-white/80 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-medium text-zinc-500 cursor-pointer"
              >
                Cancel
              </button>
              <span className="text-base font-bold text-zinc-900 dark:text-white">
                Add location
              </span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onSelectLocation(query.trim());
                  onClose();
                }}
                className="text-sm font-bold text-[#1877F2] cursor-pointer"
              >
                Done
              </button>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#F2F3F5] dark:bg-zinc-900">
              <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search or type a place..."
                className="w-full bg-transparent text-sm text-zinc-900 dark:text-white outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-zinc-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={detectBrowserLocation}
              disabled={detecting}
              className="w-full px-4 py-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 text-[#1877F2] text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              {detecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <NavigationIcon className="w-4 h-4" />
              )}
              <span>
                {detecting ? "Detecting location..." : "Use my current location"}
              </span>
            </button>

            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/80">
              {filtered.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    onSelectLocation(loc);
                    onClose();
                  }}
                  className="w-full py-3 px-2 flex items-center justify-between text-left text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-xl cursor-pointer"
                >
                  <span>{loc}</span>
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
