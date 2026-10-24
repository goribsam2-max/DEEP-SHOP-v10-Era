import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Check,
  Mic,
  Video,
  Image as ImageIcon,
  Star,
  ShieldAlert,
} from "lucide-react";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { triggerHaptic } from "../lib/haptics";
import { useNotify } from "../components/Notifications";
import SEO from "../components/SEO";

export interface FeedPreferencesData {
  selectedThemes: string[];
  contentPreferences: {
    texts: boolean;
    voiceNotes: boolean;
    videos: boolean;
    images: boolean;
    affirmations: boolean;
    scamAlerts: boolean;
  };
}

export interface ThemeDefinition {
  id: string;
  label: string;
  emoji: string;
  group: "Sports & Fitness" | "Creativity & Craft" | "Tech & Safety";
}

export const FEED_THEMES: ThemeDefinition[] = [
  { id: "dogs", label: "Dogs", emoji: "🐶", group: "Creativity & Craft" },
  { id: "art", label: "Art", emoji: "🎨", group: "Creativity & Craft" },
  { id: "tennis", label: "Tennis", emoji: "🎾", group: "Sports & Fitness" },
  { id: "nature", label: "Nature", emoji: "🌳", group: "Sports & Fitness" },
  { id: "kpop", label: "K-Pop", emoji: "🎧", group: "Creativity & Craft" },
  { id: "ballet", label: "Ballet", emoji: "🩰", group: "Sports & Fitness" },
  { id: "pancakes", label: "Pancakes", emoji: "🥞", group: "Creativity & Craft" },
  { id: "fantasy", label: "Fantasy", emoji: "⚔️", group: "Creativity & Craft" },
  { id: "gadgets", label: "Gadgets", emoji: "📱", group: "Tech & Safety" },
  { id: "scam_watch", label: "Scam Watch", emoji: "🛡️", group: "Tech & Safety" },
  { id: "fitness", label: "Fitness", emoji: "🏃", group: "Sports & Fitness" },
  { id: "reviews", label: "Reviews", emoji: "⭐", group: "Tech & Safety" },
];

export const DEFAULT_FEED_PREFERENCES: FeedPreferencesData = {
  selectedThemes: FEED_THEMES.map((t) => t.id),
  contentPreferences: {
    texts: true,
    voiceNotes: true,
    videos: true,
    images: true,
    affirmations: true,
    scamAlerts: true,
  },
};

export const loadFeedPreferences = (): FeedPreferencesData => {
  try {
    const raw = localStorage.getItem("vibe_feed_preferences");
    if (!raw) return DEFAULT_FEED_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      selectedThemes: Array.isArray(parsed.selectedThemes)
        ? parsed.selectedThemes
        : DEFAULT_FEED_PREFERENCES.selectedThemes,
      contentPreferences: {
        ...DEFAULT_FEED_PREFERENCES.contentPreferences,
        ...(parsed.contentPreferences || {}),
      },
    };
  } catch {
    return DEFAULT_FEED_PREFERENCES;
  }
};

export const FeedPersonalization: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();

  const [activeThemeTab, setActiveThemeTab] = useState<string>("All Selected");
  const [selectedThemes, setSelectedThemes] = useState<string[]>(
    () => loadFeedPreferences().selectedThemes
  );
  const [contentPreferences, setContentPreferences] = useState(
    () => loadFeedPreferences().contentPreferences
  );
  const [saving, setSaving] = useState(false);

  // Sync from Firestore user profile if signed in
  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;
    getDoc(doc(db, "users", u.uid))
      .then((snap) => {
        const remote = snap.data()?.feedPreferences;
        if (remote) {
          if (Array.isArray(remote.selectedThemes)) {
            setSelectedThemes(remote.selectedThemes);
          }
          if (remote.contentPreferences) {
            setContentPreferences((prev) => ({
              ...prev,
              ...remote.contentPreferences,
            }));
          }
        }
      })
      .catch(() => {});
  }, []);

  const toggleTheme = (id: string) => {
    triggerHaptic();
    setSelectedThemes((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleContentPref = (
    key: keyof FeedPreferencesData["contentPreferences"]
  ) => {
    triggerHaptic();
    setContentPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleApply = async () => {
    triggerHaptic();
    setSaving(true);
    const payload: FeedPreferencesData = {
      selectedThemes:
        selectedThemes.length > 0
          ? selectedThemes
          : FEED_THEMES.map((t) => t.id),
      contentPreferences,
    };
    localStorage.setItem("vibe_feed_preferences", JSON.stringify(payload));
    window.dispatchEvent(new Event("feedPreferencesUpdated"));

    const u = auth.currentUser;
    if (u) {
      try {
        await setDoc(
          doc(db, "users", u.uid),
          { feedPreferences: payload },
          { merge: true }
        );
      } catch {}
    }

    setSaving(false);
    notify("Feed personalization applied!", "success");
    navigate("/news-hub");
  };

  const handleSelectAll = () => {
    triggerHaptic();
    setSelectedThemes(FEED_THEMES.map((t) => t.id));
    setContentPreferences(DEFAULT_FEED_PREFERENCES.contentPreferences);
  };

  const visibleThemes =
    activeThemeTab === "All Selected"
      ? FEED_THEMES
      : FEED_THEMES.filter((t) => t.group === activeThemeTab);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#BCE0FD]/80 via-[#E2F1FF]/45 to-transparent dark:from-transparent dark:via-transparent dark:to-transparent text-zinc-900 dark:text-zinc-100 font-sans pb-10">
      <SEO
        title="Feed Personalization — Feed"
        description="Customize the themes and content types shown in your feed."
      />

      <div className="max-w-xl mx-auto pt-4 sm:pt-7 px-3 sm:px-4">
        {/* Top Bar matching reference screenshot */}
        <header className="flex items-center justify-between gap-3 px-1 pb-5">
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                navigate("/news-hub");
              }}
              className="w-11 h-11 rounded-full bg-white dark:bg-zinc-900 shadow-[0_2px_10px_rgba(15,23,42,0.06)] flex items-center justify-center text-zinc-900 dark:text-zinc-100 active:scale-95 transition cursor-pointer shrink-0"
              aria-label="Back to Feed"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
            <h1 className="text-[19px] sm:text-[21px] font-bold tracking-tight text-zinc-900 dark:text-white truncate">
              Feed Personalization
            </h1>
          </div>

          <button
            type="button"
            onClick={handleApply}
            disabled={saving}
            className="px-5 py-2.5 rounded-full bg-white dark:bg-zinc-100 text-zinc-900 font-semibold text-[14px] shadow-[0_2px_10px_rgba(15,23,42,0.06)] hover:bg-slate-50 active:scale-95 transition cursor-pointer shrink-0"
          >
            {saving ? "Saving..." : "Apply"}
          </button>
        </header>

        {/* Subtle layered top card lip from reference screenshot */}
        <div className="h-3.5 mx-5 rounded-t-[26px] bg-white/55 dark:bg-zinc-800/50 backdrop-blur-md" />

        {/* Main White Rounded Sheet */}
        <div className="bg-white dark:bg-zinc-900 rounded-[34px] p-5 sm:p-6 shadow-[0_12px_40px_rgba(15,23,42,0.07)] border border-white/90 dark:border-zinc-800">
          {/* Themes Section */}
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-[17px] font-bold text-zinc-900 dark:text-white">
                Themes
              </h2>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-semibold text-[#1877F2] hover:underline cursor-pointer"
              >
                Reset all
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                "All Selected",
                "Sports & Fitness",
                "Creativity & Craft",
                "Tech & Safety",
              ].map((tab) => {
                const active = activeThemeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setActiveThemeTab(tab);
                    }}
                    className={`px-4 py-2.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      active
                        ? "bg-[#1877F2] text-white shadow-[0_4px_14px_rgba(24,119,242,0.32)]"
                        : "bg-[#F5F6F8] dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-[#EBEEF3] dark:hover:bg-zinc-700"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme Tiles Grid (4 columns matching screenshot) */}
          <div className="mt-5">
            <h3 className="text-[16px] font-bold text-zinc-900 dark:text-white mb-3.5">
              {activeThemeTab === "All Selected"
                ? `All selected (${selectedThemes.length})`
                : activeThemeTab}
            </h3>

            <div className="grid grid-cols-4 gap-2.5">
              {visibleThemes.map((theme) => {
                const isSelected = selectedThemes.includes(theme.id);
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => toggleTheme(theme.id)}
                    className={`relative rounded-[20px] p-3 text-left flex flex-col items-start justify-between min-h-[90px] transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? "bg-[#F4F6F9] dark:bg-zinc-800 ring-1.5 ring-[#1877F2]/60 shadow-2xs"
                        : "bg-[#F8F9FB] dark:bg-zinc-800/45 opacity-55 hover:opacity-85"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-white dark:bg-zinc-900 shadow-[0_2px_6px_rgba(15,23,42,0.06)] flex items-center justify-center text-[18px]">
                      <span>{theme.emoji}</span>
                    </div>

                    <span className="text-[12.5px] font-medium text-zinc-800 dark:text-zinc-200 mt-2.5 leading-tight truncate w-full">
                      {theme.label}
                    </span>

                    {isSelected && (
                      <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#1877F2] text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Types of Content Container matching screenshot */}
          <div className="mt-6 rounded-[28px] bg-[#F5F6F8] dark:bg-zinc-800/60 p-4 space-y-2.5">
            <h3 className="text-[16px] font-bold text-zinc-900 dark:text-white px-1 pb-1">
              Types of content
            </h3>

            {/* 1. Texts */}
            <button
              type="button"
              onClick={() => toggleContentPref("texts")}
              className="w-full rounded-[20px] bg-white dark:bg-zinc-900 px-3.5 py-3 flex items-center justify-between shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:bg-slate-50/70 dark:hover:bg-zinc-800/90 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#F5F6F8] dark:bg-zinc-800 flex items-center justify-center">
                  <span className="w-5 h-5 rounded-[6px] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[11px] font-serif italic font-bold flex items-center justify-center">
                    T
                  </span>
                </div>
                <span className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100">
                  Texts
                </span>
              </div>
              <span
                className={`w-6 h-6 rounded-full border flex items-center justify-center transition ${
                  contentPreferences.texts
                    ? "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    : "border-zinc-200 dark:border-zinc-700 text-transparent"
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[2.4]" />
              </span>
            </button>

            {/* 2. Voice notes */}
            <button
              type="button"
              onClick={() => toggleContentPref("voiceNotes")}
              className="w-full rounded-[20px] bg-white dark:bg-zinc-900 px-3.5 py-3 flex items-center justify-between shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:bg-slate-50/70 dark:hover:bg-zinc-800/90 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#F5F6F8] dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                  <Mic className="w-4 h-4 stroke-[2.1]" />
                </div>
                <span className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100">
                  Voice notes
                </span>
              </div>
              <span
                className={`w-6 h-6 rounded-full border flex items-center justify-center transition ${
                  contentPreferences.voiceNotes
                    ? "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    : "border-zinc-200 dark:border-zinc-700 text-transparent"
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[2.4]" />
              </span>
            </button>

            {/* 3. Videos */}
            <button
              type="button"
              onClick={() => toggleContentPref("videos")}
              className="w-full rounded-[20px] bg-white dark:bg-zinc-900 px-3.5 py-3 flex items-center justify-between shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:bg-slate-50/70 dark:hover:bg-zinc-800/90 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#F5F6F8] dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                  <Video className="w-4 h-4 stroke-[2.1]" />
                </div>
                <span className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100">
                  Videos
                </span>
              </div>
              <span
                className={`w-6 h-6 rounded-full border flex items-center justify-center transition ${
                  contentPreferences.videos
                    ? "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    : "border-zinc-200 dark:border-zinc-700 text-transparent"
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[2.4]" />
              </span>
            </button>

            {/* 4. Images */}
            <button
              type="button"
              onClick={() => toggleContentPref("images")}
              className="w-full rounded-[20px] bg-white dark:bg-zinc-900 px-3.5 py-3 flex items-center justify-between shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:bg-slate-50/70 dark:hover:bg-zinc-800/90 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#F5F6F8] dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                  <ImageIcon className="w-4 h-4 stroke-[2.1]" />
                </div>
                <span className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100">
                  Images
                </span>
              </div>
              <span
                className={`w-6 h-6 rounded-full border flex items-center justify-center transition ${
                  contentPreferences.images
                    ? "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    : "border-zinc-200 dark:border-zinc-700 text-transparent"
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[2.4]" />
              </span>
            </button>

            {/* 5. Affirmations */}
            <button
              type="button"
              onClick={() => toggleContentPref("affirmations")}
              className="w-full rounded-[20px] bg-white dark:bg-zinc-900 px-3.5 py-3 flex items-center justify-between shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:bg-slate-50/70 dark:hover:bg-zinc-800/90 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#F5F6F8] dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                  <Star className="w-4 h-4 stroke-[2.1]" />
                </div>
                <span className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100">
                  Affirmations
                </span>
              </div>
              <span
                className={`w-6 h-6 rounded-full border flex items-center justify-center transition ${
                  contentPreferences.affirmations
                    ? "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    : "border-zinc-200 dark:border-zinc-700 text-transparent"
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[2.4]" />
              </span>
            </button>

            {/* 6. Scam Alerts */}
            <button
              type="button"
              onClick={() => toggleContentPref("scamAlerts")}
              className="w-full rounded-[20px] bg-white dark:bg-zinc-900 px-3.5 py-3 flex items-center justify-between shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:bg-slate-50/70 dark:hover:bg-zinc-800/90 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="w-4 h-4 stroke-[2.1]" />
                </div>
                <span className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100">
                  Scam Alerts
                </span>
              </div>
              <span
                className={`w-6 h-6 rounded-full border flex items-center justify-center transition ${
                  contentPreferences.scamAlerts
                    ? "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    : "border-zinc-200 dark:border-zinc-700 text-transparent"
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[2.4]" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedPersonalization;
