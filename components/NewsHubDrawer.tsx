import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  Bookmark,
  PlusCircle,
  Search,
  ShoppingBag,
  BarChart2,
  ShieldAlert,
  SlidersHorizontal,
  Sun,
  Moon,
  Music,
  MessageCircle,
  Check,
  ChevronUp,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DottedGhostCatIcon } from "./ComposerLiquidGlassSheets";
import { ReelsTuneAlgorithmIcon } from "./LoopsReelsView";
import { triggerHaptic } from "../lib/haptics";

interface NewsHubDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userData?: any;
}

const ComposeSquarePenIcon: React.FC<{ className?: string }> = ({
  className = "w-[22px] h-[22px]",
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
    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" />
  </svg>
);

interface DrawerMenuPrefs {
  quickPills: Record<"activity" | "saved", boolean>;
  primaryOrder: string[];
  primaryHidden: string[];
  secondaryOrder: string[];
  secondaryHidden: string[];
}

const STORAGE_KEY = "loops_custom_drawer_v1";

const DEFAULT_PRIMARY_IDS = ["for_you", "following", "reels", "ghost", "music"];
const DEFAULT_SECONDARY_IDS = [
  "shop",
  "messages",
  "search",
  "creator_studio",
  "your_algorithm",
  "preferences",
  "scam_alerts",
  "appearance",
];

const DEFAULT_PREFS: DrawerMenuPrefs = {
  quickPills: { activity: true, saved: true },
  primaryOrder: DEFAULT_PRIMARY_IDS,
  primaryHidden: [],
  secondaryOrder: DEFAULT_SECONDARY_IDS,
  secondaryHidden: [],
};

function loadDrawerPrefs(): DrawerMenuPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    const mergeOrder = (saved: unknown, defaults: string[]) => {
      const valid = Array.isArray(saved)
        ? saved.filter((id): id is string => defaults.includes(id))
        : [];
      const missing = defaults.filter((id) => !valid.includes(id));
      return [...valid, ...missing];
    };
    return {
      quickPills: {
        activity: parsed?.quickPills?.activity !== false,
        saved: parsed?.quickPills?.saved !== false,
      },
      primaryOrder: mergeOrder(parsed?.primaryOrder, DEFAULT_PRIMARY_IDS),
      primaryHidden: Array.isArray(parsed?.primaryHidden)
        ? parsed.primaryHidden
        : [],
      secondaryOrder: mergeOrder(parsed?.secondaryOrder, DEFAULT_SECONDARY_IDS),
      secondaryHidden: Array.isArray(parsed?.secondaryHidden)
        ? parsed.secondaryHidden
        : [],
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export const NewsHubDrawer: React.FC<NewsHubDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [prefs, setPrefs] = useState<DrawerMenuPrefs>(loadDrawerPrefs);

  useEffect(() => {
    if (!isOpen) {
      setIsCustomizing(false);
    }
  }, [isOpen]);

  const updatePrefs = (updater: (prev: DrawerMenuPrefs) => DrawerMenuPrefs) => {
    setPrefs((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleReset = () => {
    triggerHaptic();
    setPrefs(DEFAULT_PREFS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const handleNav = (path: string) => {
    if (isCustomizing) return;
    triggerHaptic();
    onClose();
    navigate(path);
  };

  const toggleTheme = () => {
    if (isCustomizing) return;
    triggerHaptic();
    const isDark = document.documentElement.classList.contains("dark");
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  const moveItem = (
    section: "primary" | "secondary",
    id: string,
    dir: -1 | 1
  ) => {
    triggerHaptic();
    updatePrefs((prev) => {
      const key = section === "primary" ? "primaryOrder" : "secondaryOrder";
      const list = [...prev[key]];
      const idx = list.indexOf(id);
      const targetIdx = idx + dir;
      if (idx < 0 || targetIdx < 0 || targetIdx >= list.length) return prev;
      const [removed] = list.splice(idx, 1);
      list.splice(targetIdx, 0, removed);
      return { ...prev, [key]: list };
    });
  };

  const toggleItemHidden = (section: "primary" | "secondary", id: string) => {
    triggerHaptic();
    updatePrefs((prev) => {
      if (id === "for_you") return prev; // Keep For you always accessible
      const key = section === "primary" ? "primaryHidden" : "secondaryHidden";
      const hidden = prev[key].includes(id)
        ? prev[key].filter((x) => x !== id)
        : [...prev[key], id];
      return { ...prev, [key]: hidden };
    });
  };

  const primaryDefinitions: Record<
    string,
    {
      label: string;
      sublabel?: string;
      onClick: () => void;
      trailing?: React.ReactNode;
      locked?: boolean;
    }
  > = {
    for_you: {
      label: "For you",
      locked: true,
      onClick: () => handleNav("/loops"),
    },
    following: {
      label: "Following",
      onClick: () => handleNav("/loops?filter=following"),
    },
    reels: {
      label: "Reels",
      onClick: () => handleNav("/loops?filter=video"),
    },
    ghost: {
      label: "Ghost posts",
      onClick: () => handleNav("/loops?filter=ghost"),
      trailing: (
        <DottedGhostCatIcon className="w-6 h-6 text-zinc-700 dark:text-zinc-300 shrink-0" />
      ),
    },
    music: {
      label: "Music Loops",
      sublabel: "Community",
      onClick: () => handleNav("/loops/search?tag=music"),
      trailing: (
        <div className="flex -space-x-2 shrink-0">
          <span className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-zinc-200 text-white dark:text-zinc-900 ring-2 ring-white dark:ring-[#1c1c1e] flex items-center justify-center">
            <Music className="w-3 h-3 stroke-[2.2]" />
          </span>
          <span className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 ring-2 ring-white dark:ring-[#1c1c1e] flex items-center justify-center">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="8" cy="12" r="2.2" />
              <circle cx="15" cy="8.5" r="2.2" />
              <circle cx="15" cy="15.5" r="2.2" />
            </svg>
          </span>
        </div>
      ),
    },
  };

  const secondaryDefinitions: Record<
    string,
    {
      label: string;
      onClick: () => void;
      trailing: React.ReactNode;
    }
  > = {
    shop: {
      label: "Visit Shop",
      onClick: () => handleNav("/"),
      trailing: (
        <ShoppingBag className="w-[20px] h-[20px] text-zinc-700 dark:text-zinc-300 stroke-[1.85] shrink-0" />
      ),
    },
    messages: {
      label: "Messages",
      onClick: () => handleNav("/messages"),
      trailing: (
        <MessageCircle className="w-[20px] h-[20px] text-zinc-700 dark:text-zinc-300 stroke-[1.85] shrink-0" />
      ),
    },
    search: {
      label: "Search",
      onClick: () => handleNav("/loops/search"),
      trailing: (
        <Search className="w-[20px] h-[20px] text-zinc-700 dark:text-zinc-300 stroke-[1.85] shrink-0" />
      ),
    },
    creator_studio: {
      label: "Creator Studio",
      onClick: () => handleNav("/creator-dashboard"),
      trailing: (
        <BarChart2 className="w-[20px] h-[20px] text-zinc-700 dark:text-zinc-300 stroke-[1.85] shrink-0" />
      ),
    },
    your_algorithm: {
      label: "Your algorithm",
      onClick: () => handleNav("/loops/algorithm"),
      trailing: (
        <ReelsTuneAlgorithmIcon className="w-[20px] h-[20px] text-zinc-700 dark:text-zinc-300 shrink-0" />
      ),
    },
    preferences: {
      label: "Feed preferences",
      onClick: () => handleNav("/loops/personalization"),
      trailing: (
        <SlidersHorizontal className="w-[20px] h-[20px] text-zinc-700 dark:text-zinc-300 stroke-[1.85] shrink-0" />
      ),
    },
    scam_alerts: {
      label: "Scam Alerts",
      onClick: () => handleNav("/loops?filter=scam"),
      trailing: (
        <ShieldAlert className="w-[20px] h-[20px] text-zinc-700 dark:text-zinc-300 stroke-[1.85] shrink-0" />
      ),
    },
    appearance: {
      label: "Appearance",
      onClick: toggleTheme,
      trailing: (
        <span className="text-zinc-700 dark:text-zinc-300 shrink-0">
          <Sun className="w-[20px] h-[20px] stroke-[1.85] dark:hidden" />
          <Moon className="w-[20px] h-[20px] stroke-[1.85] hidden dark:inline" />
        </span>
      ),
    },
  };

  const visiblePrimaryIds = isCustomizing
    ? prefs.primaryOrder
    : prefs.primaryOrder.filter((id) => !prefs.primaryHidden.includes(id));

  const visibleSecondaryIds = isCustomizing
    ? prefs.secondaryOrder
    : prefs.secondaryOrder.filter((id) => !prefs.secondaryHidden.includes(id));

  const showQuickRow =
    isCustomizing || prefs.quickPills.activity || prefs.quickPills.saved;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={onClose}
            className="fixed inset-0 z-[250] bg-black/20 dark:bg-black/50 cursor-pointer"
            aria-label="Close Feeds Menu"
          />

          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{
              type: "spring",
              damping: 32,
              stiffness: 320,
              mass: 0.85,
            }}
            className="loops-sheet-bg fixed top-0 left-0 bottom-0 z-[260] w-[300px] max-w-[85vw] h-[100dvh] border-r loops-divider shadow-[8px_0_30px_rgba(0,0,0,0.06)] overflow-y-auto overscroll-contain select-none"
          >
            <div className="flex flex-col gap-3.5 px-4 pt-5 pb-28 min-h-max">
              {/* Top Header: Feeds + Circled Plus + Pen (Customize Menu) */}
              <div className="shrink-0 flex items-center justify-between px-1 pt-0.5 gap-2">
                <h2 className="text-[25px] font-bold tracking-tight text-zinc-950 dark:text-white leading-none truncate">
                  {isCustomizing ? "Customize" : "Feeds"}
                </h2>

                {isCustomizing ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="h-8 px-2.5 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] flex items-center gap-1 text-[12.5px] font-semibold text-zinc-500 dark:text-zinc-400 cursor-pointer transition"
                      title="Reset menu"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        setIsCustomizing(false);
                      }}
                      className="h-8 px-3.5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-[12.5px] font-bold cursor-pointer active:scale-95 transition"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleNav("/loops/create")}
                      className="w-9 h-9 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] flex items-center justify-center text-zinc-900 dark:text-zinc-100 transition active:scale-92 cursor-pointer"
                      aria-label="New Loop"
                      title="New Loop"
                    >
                      <PlusCircle className="w-[23px] h-[23px] stroke-[1.85]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        setIsCustomizing(true);
                      }}
                      className="w-9 h-9 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] flex items-center justify-center text-zinc-900 dark:text-zinc-100 transition active:scale-92 cursor-pointer"
                      aria-label="Customize menu"
                      title="Customize menu"
                    >
                      <ComposeSquarePenIcon className="w-[21px] h-[21px]" />
                    </button>
                  </div>
                )}
              </div>

              {isCustomizing && (
                <p className="px-1 text-[12px] text-zinc-500 dark:text-zinc-400 leading-snug">
                  Show, hide, or reorder shortcuts in your side menu.
                </p>
              )}

              {/* Quick Top Shortcuts: Activity & Saved */}
              {showQuickRow && (
                <div
                  className={`shrink-0 grid gap-3 ${
                    isCustomizing ||
                    (prefs.quickPills.activity && prefs.quickPills.saved)
                      ? "grid-cols-2"
                      : "grid-cols-1"
                  }`}
                >
                  {(isCustomizing || prefs.quickPills.activity) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isCustomizing) {
                          triggerHaptic();
                          updatePrefs((prev) => ({
                            ...prev,
                            quickPills: {
                              ...prev.quickPills,
                              activity: !prev.quickPills.activity,
                            },
                          }));
                        } else {
                          handleNav("/loops/activity");
                        }
                      }}
                      className={`relative loops-sheet-group h-[54px] rounded-[22px] border flex items-center justify-center text-zinc-950 dark:text-white hover:opacity-90 active:scale-96 transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
                        isCustomizing && !prefs.quickPills.activity
                          ? "opacity-45"
                          : ""
                      }`}
                      aria-label="Activity"
                      title="Activity"
                    >
                      <Heart className="w-[23px] h-[23px] stroke-[1.9]" />
                      {isCustomizing && (
                        <span
                          className={`absolute top-2 right-2 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] ${
                            prefs.quickPills.activity
                              ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950"
                              : "border border-zinc-400 dark:border-zinc-600"
                          }`}
                        >
                          {prefs.quickPills.activity && (
                            <Check className="w-3 h-3 stroke-[3]" />
                          )}
                        </span>
                      )}
                    </button>
                  )}

                  {(isCustomizing || prefs.quickPills.saved) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isCustomizing) {
                          triggerHaptic();
                          updatePrefs((prev) => ({
                            ...prev,
                            quickPills: {
                              ...prev.quickPills,
                              saved: !prev.quickPills.saved,
                            },
                          }));
                        } else {
                          handleNav("/loops/saved");
                        }
                      }}
                      className={`relative loops-sheet-group h-[54px] rounded-[22px] border flex items-center justify-center text-zinc-950 dark:text-white hover:opacity-90 active:scale-96 transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
                        isCustomizing && !prefs.quickPills.saved
                          ? "opacity-45"
                          : ""
                      }`}
                      aria-label="Saved"
                      title="Saved"
                    >
                      <Bookmark className="w-[23px] h-[23px] stroke-[1.9]" />
                      {isCustomizing && (
                        <span
                          className={`absolute top-2 right-2 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] ${
                            prefs.quickPills.saved
                              ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950"
                              : "border border-zinc-400 dark:border-zinc-600"
                          }`}
                        >
                          {prefs.quickPills.saved && (
                            <Check className="w-3 h-3 stroke-[3]" />
                          )}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Primary Grouped Feeds Card */}
              {visiblePrimaryIds.length > 0 && (
                <div className="shrink-0 loops-sheet-group rounded-[24px] border divide-y loops-divider overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  {visiblePrimaryIds.map((id, idx) => {
                    const def = primaryDefinitions[id];
                    if (!def) return null;
                    const isHidden = prefs.primaryHidden.includes(id);

                    if (isCustomizing) {
                      return (
                        <div
                          key={id}
                          className={`w-full flex items-center justify-between gap-2 px-3.5 py-3.5 transition ${
                            isHidden ? "opacity-45" : ""
                          }`}
                        >
                          <button
                            type="button"
                            disabled={def.locked}
                            onClick={() => toggleItemHidden("primary", id)}
                            className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer disabled:cursor-default"
                          >
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition ${
                                !isHidden
                                  ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950"
                                  : "border border-zinc-400 dark:border-zinc-600"
                              }`}
                            >
                              {!isHidden && (
                                <Check className="w-3 h-3 stroke-[3]" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <span className="font-bold text-[15px] text-zinc-950 dark:text-white block truncate">
                                {def.label}
                              </span>
                              {def.sublabel && (
                                <span className="text-[12px] text-zinc-400 dark:text-zinc-500 block truncate">
                                  {def.sublabel}
                                </span>
                              )}
                            </div>
                          </button>

                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveItem("primary", id, -1)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-25 cursor-pointer"
                              aria-label={`Move ${def.label} up`}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === visiblePrimaryIds.length - 1}
                              onClick={() => moveItem("primary", id, 1)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-25 cursor-pointer"
                              aria-label={`Move ${def.label} down`}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={def.onClick}
                        className="w-full flex items-center justify-between px-4 py-4 hover:bg-black/[0.025] dark:hover:bg-white/[0.04] transition cursor-pointer text-left"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-[16px] text-zinc-950 dark:text-white block leading-snug">
                            {def.label}
                          </span>
                          {def.sublabel && (
                            <span className="text-[13px] text-zinc-400 dark:text-zinc-500 font-normal">
                              {def.sublabel}
                            </span>
                          )}
                        </div>
                        {def.trailing}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Secondary Minimal Monochrome Grouped Card */}
              {visibleSecondaryIds.length > 0 && (
                <div className="shrink-0 loops-sheet-group rounded-[24px] border divide-y loops-divider overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  {visibleSecondaryIds.map((id, idx) => {
                    const def = secondaryDefinitions[id];
                    if (!def) return null;
                    const isHidden = prefs.secondaryHidden.includes(id);

                    if (isCustomizing) {
                      return (
                        <div
                          key={id}
                          className={`w-full flex items-center justify-between gap-2 px-3.5 py-3 transition ${
                            isHidden ? "opacity-45" : ""
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleItemHidden("secondary", id)}
                            className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                          >
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition ${
                                !isHidden
                                  ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950"
                                  : "border border-zinc-400 dark:border-zinc-600"
                              }`}
                            >
                              {!isHidden && (
                                <Check className="w-3 h-3 stroke-[3]" />
                              )}
                            </span>
                            <span className="font-bold text-[15px] text-zinc-950 dark:text-white truncate">
                              {def.label}
                            </span>
                          </button>

                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveItem("secondary", id, -1)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-25 cursor-pointer"
                              aria-label={`Move ${def.label} up`}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === visibleSecondaryIds.length - 1}
                              onClick={() => moveItem("secondary", id, 1)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-25 cursor-pointer"
                              aria-label={`Move ${def.label} down`}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={def.onClick}
                        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-black/[0.025] dark:hover:bg-white/[0.04] transition cursor-pointer text-left"
                      >
                        <span className="font-bold text-[15.5px] text-zinc-950 dark:text-white">
                          {def.label}
                        </span>
                        {def.trailing}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  return content;
};

export default NewsHubDrawer;
