import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { doc, onSnapshot } from "firebase/firestore";
import {
  Download,
  X,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Plus,
  ChevronRight,
  Smartphone,
} from "lucide-react";
import { db } from "../firebase";

interface PlatformMobileConfig {
  androidApkEnabled?: boolean;
  androidApkUrl?: string;
  androidApkVersion?: string;
  androidApkFileName?: string;
  iosInstallGuideEnabled?: boolean;
  pwaPopupIcon?: string;
}

const APK_PERSIST_KEY = "ds_running_in_native_apk_v1";
const DISMISS_ANDROID_KEY = "ds_android_apk_prompt_dismissed_until";
const DISMISS_IOS_KEY = "ds_ios_a2hs_guide_dismissed_until";

/**
 * Converts GitHub blob links (e.g. https://github.com/user/repo/blob/main/app.apk)
 * into direct binary download URLs automatically so clicking Download immediately downloads the .apk.
 */
export function normalizeGithubApkDownloadUrl(rawUrl: string): string {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) return "";
  try {
    const u = new URL(trimmed);
    if (u.hostname === "github.com" && u.pathname.includes("/blob/")) {
      u.pathname = u.pathname.replace("/blob/", "/raw/");
      return u.toString();
    }
    return u.toString();
  } catch {
    return trimmed;
  }
}

/**
 * Detects if the site is ALREADY running inside:
 *  - An Android Website-to-APK wrapper / WebView (`; wv)`, WebIntoApp, GoNative/Median, Capacitor, Cordova, Appilix, TWA `android-app://`, JS bridges, or `?source=apk` / `?app=apk`)
 *  - An installed Standalone PWA (`display-mode: standalone` / `fullscreen` / `navigator.standalone`)
 */
export function isRunningInsideInstalledAppOrApk(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const sp = new URLSearchParams(window.location.search);
    const src = (
      sp.get("source") ||
      sp.get("app") ||
      sp.get("platform") ||
      sp.get("mode") ||
      ""
    )
      .trim()
      .toLowerCase();

    if (
      src === "apk" ||
      src === "android_app" ||
      src === "webview" ||
      sp.get("from_apk") === "1" ||
      sp.get("is_apk") === "1"
    ) {
      localStorage.setItem(APK_PERSIST_KEY, "1");
      return true;
    }

    if (localStorage.getItem(APK_PERSIST_KEY) === "1") {
      return true;
    }
  } catch {}

  // Standalone / Installed Web App check (Android WebAPK + iOS Home Screen)
  try {
    if (
      window.matchMedia?.("(display-mode: standalone)").matches ||
      window.matchMedia?.("(display-mode: fullscreen)").matches ||
      window.matchMedia?.("(display-mode: minimal-ui)").matches ||
      (window.navigator as any)?.standalone === true
    ) {
      return true;
    }
  } catch {}

  // Trusted Web Activity (TWA) referrer check
  if (
    typeof document !== "undefined" &&
    document.referrer &&
    document.referrer.startsWith("android-app://")
  ) {
    try {
      localStorage.setItem(APK_PERSIST_KEY, "1");
    } catch {}
    return true;
  }

  // Native Web-to-APK JS bridge globals
  const win = window as any;
  if (
    win.ReactNativeWebView ||
    win.gonative ||
    win.median ||
    win.Capacitor?.isNativePlatform?.() ||
    win.cordova ||
    win.Website2APK ||
    win.Appilix ||
    win.AndroidInterface ||
    win.AndroidApp
  ) {
    return true;
  }

  // User-Agent WebView detection (Android `; wv)` + popular Web-to-APK wrappers + iOS non-Safari WebView)
  const ua = window.navigator?.userAgent || "";
  if (
    /; wv\)/i.test(ua) ||
    /\bwv\b/i.test(ua) ||
    /WebIntoApp|gonative|median|Website2APK|AppsGeyser|Appilix|Convertixo|Cordova|Capacitor|DeepShopAPK|WebView/i.test(
      ua
    )
  ) {
    return true;
  }

  // Android WebView pattern: `Version/X.X Chrome/XX.0... Mobile Safari` when `; wv` is stripped by custom wrapper
  if (/Android/i.test(ua) && /Version\/\d+\.\d+/i.test(ua) && /Chrome\/\d+/i.test(ua) && !/SamsungBrowser|OPR|EdgA|UCBrowser/i.test(ua)) {
    return true;
  }

  return false;
}

function detectMobilePlatform(): "android" | "ios" | "other" {
  if (typeof window === "undefined") return "other";
  const ua = window.navigator?.userAgent || "";
  if (/android/i.test(ua)) {
    return "android";
  }
  const isIOSDevice =
    /iPad|iPhone|iPod/.test(ua) ||
    (window.navigator?.platform === "MacIntel" &&
      window.navigator?.maxTouchPoints > 1);
  if (isIOSDevice) {
    return "ios";
  }
  return "other";
}

function triggerDirectApkDownload(rawUrl: string, customFileName?: string) {
  const directUrl = normalizeGithubApkDownloadUrl(rawUrl);
  if (!directUrl || typeof document === "undefined") return;

  const cleanName = (customFileName || "DEEP-SHOP.apk").trim();
  const safeFileName = cleanName.toLowerCase().endsWith(".apk")
    ? cleanName
    : `${cleanName}.apk`;

  const anchor = document.createElement("a");
  anchor.href = directUrl;
  anchor.setAttribute("download", safeFileName);
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    anchor.remove();
  }, 1500);
}

/* Crisp iOS Safari Share Icon (Square with Upward Arrow) */
const SafariShareIcon: React.FC<{ className?: string }> = ({
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
    <path d="M12 3v12" />
    <path d="m8 7 4-4 4 4" />
    <path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
  </svg>
);

export const MobileAppInstallExperience: React.FC = () => {
  const location = useLocation();
  const [config, setConfig] = useState<PlatformMobileConfig | null>(null);
  const [visibleMode, setVisibleMode] = useState<"android" | "ios" | null>(
    null
  );
  const [downloadingApk, setDownloadingApk] = useState(false);
  const [apkStarted, setApkStarted] = useState(false);
  const [activeIosStep, setActiveIosStep] = useState<number>(0);

  const platform = useMemo(() => detectMobilePlatform(), []);
  const insideInstalledApp = useMemo(
    () => isRunningInsideInstalledAppOrApk(),
    [location.search]
  );

  // Subscribe to Admin Panel platform settings (`settings/platform`)
  useEffect(() => {
    if (insideInstalledApp) return;
    const unsub = onSnapshot(
      doc(db, "settings", "platform"),
      (snap) => {
        if (snap.exists()) {
          setConfig(snap.data() as PlatformMobileConfig);
        } else {
          setConfig({});
        }
      },
      () => {
        setConfig({});
      }
    );
    return () => unsub();
  }, [insideInstalledApp]);

  // Allow manual trigger from any button/menu via custom event
  useEffect(() => {
    const handleManualOpen = () => {
      if (isRunningInsideInstalledAppOrApk()) return;
      if (platform === "android") setVisibleMode("android");
      else if (platform === "ios") setVisibleMode("ios");
    };
    window.addEventListener("openMobileAppInstall", handleManualOpen);
    return () =>
      window.removeEventListener("openMobileAppInstall", handleManualOpen);
  }, [platform]);

  // Decide whether to show Android APK prompt or iOS animated guide
  useEffect(() => {
    if (!config || insideInstalledApp) {
      setVisibleMode(null);
      return;
    }

    const p = location.pathname;
    if (
      p.startsWith("/admin") ||
      p.startsWith("/signin") ||
      p.startsWith("/signup") ||
      p.startsWith("/auth") ||
      p.startsWith("/create-reel") ||
      p.startsWith("/add-story")
    ) {
      return;
    }

    const now = Date.now();

    if (platform === "android") {
      const apkEnabled = config.androidApkEnabled !== false;
      const apkUrl = normalizeGithubApkDownloadUrl(config.androidApkUrl || "");
      const hasDeferredPwa = Boolean((window as any).deferredPrompt);
      if (!apkEnabled || (!apkUrl && !hasDeferredPwa)) return;

      try {
        const dismissedUntil = Number(
          localStorage.getItem(DISMISS_ANDROID_KEY) || "0"
        );
        if (dismissedUntil > now) return;
      } catch {}

      const timer = window.setTimeout(() => {
        if (!isRunningInsideInstalledAppOrApk()) {
          setVisibleMode("android");
        }
      }, 2200);
      return () => window.clearTimeout(timer);
    }

    if (platform === "ios") {
      const iosEnabled = config.iosInstallGuideEnabled !== false;
      if (!iosEnabled) return;

      try {
        const dismissedUntil = Number(
          localStorage.getItem(DISMISS_IOS_KEY) || "0"
        );
        if (dismissedUntil > now) return;
      } catch {}

      const timer = window.setTimeout(() => {
        if (!isRunningInsideInstalledAppOrApk()) {
          setVisibleMode("ios");
        }
      }, 2600);
      return () => window.clearTimeout(timer);
    }
  }, [config, insideInstalledApp, platform, location.pathname]);

  // Auto-cycle iOS animated step showcase every 2.8s while open
  useEffect(() => {
    if (visibleMode !== "ios") return;
    const interval = window.setInterval(() => {
      setActiveIosStep((prev) => (prev + 1) % 3);
    }, 2800);
    return () => window.clearInterval(interval);
  }, [visibleMode]);

  const dismissPrompt = (hours = 18) => {
    const until = Date.now() + hours * 60 * 60 * 1000;
    try {
      if (visibleMode === "android") {
        localStorage.setItem(DISMISS_ANDROID_KEY, String(until));
      } else if (visibleMode === "ios") {
        localStorage.setItem(DISMISS_IOS_KEY, String(until));
      }
    } catch {}
    setVisibleMode(null);
  };

  const handleAndroidDownload = async () => {
    const apkUrl = normalizeGithubApkDownloadUrl(config?.androidApkUrl || "");
    if (apkUrl) {
      setDownloadingApk(true);
      triggerDirectApkDownload(apkUrl, config?.androidApkFileName);
      window.setTimeout(() => {
        setDownloadingApk(false);
        setApkStarted(true);
      }, 650);
      return;
    }

    // Fallback to native Chromium install prompt if Admin hasn't pasted GitHub APK URL yet
    const promptEvent = (window as any).deferredPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      await promptEvent.userChoice.catch(() => {});
      (window as any).deferredPrompt = null;
      dismissPrompt(72);
    }
  };

  if (!visibleMode || insideInstalledApp || typeof document === "undefined") {
    return null;
  }

  const rawPopupIcon = config?.pwaPopupIcon?.trim() || "";
  const appIconSrc =
    rawPopupIcon && rawPopupIcon !== "/favicon.png"
      ? rawPopupIcon
      : "data:image/svg+xml;utf8," +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#090d16"/><text x="27" y="44" font-family="system-ui,-apple-system,sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle">d</text><circle cx="45" cy="40" r="5" fill="#10b981"/></svg>'
        );
  const apkVersion = config?.androidApkVersion?.trim() || "Latest";

  return createPortal(
    <AnimatePresence>
      {visibleMode === "android" && (
        <div className="fixed inset-0 z-[995] flex items-end sm:items-center justify-center p-3 sm:p-5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => dismissPrompt(12)}
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ opacity: 0, y: 44, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 36, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-[420px] rounded-[28px] bg-white dark:bg-zinc-950 border border-zinc-200/85 dark:border-zinc-800 shadow-[0_24px_70px_rgba(0,0,0,0.28)] p-5 text-zinc-950 dark:text-white overflow-hidden"
          >
            {/* Subtle Ambient Header Wash */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#1877F2]/12 via-[#3DDC84]/6 to-transparent"
            />

            <div className="relative flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-md p-1.5 shrink-0 flex items-center justify-center overflow-hidden">
                  <img
                    src={appIconSrc}
                    alt="DEEP SHOP"
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[17px] font-extrabold tracking-tight text-zinc-950 dark:text-white">
                      DEEP SHOP App
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                      Android {apkVersion}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Install the official Android app for faster browsing, Loops & instant alerts.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => dismissPrompt(18)}
                aria-label="Close app download prompt"
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center shrink-0 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Highlights */}
            <div className="relative mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200/60 dark:border-zinc-800 px-3 py-2.5 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#1877F2] shrink-0" />
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  Ultra-fast native speed
                </span>
              </div>
              <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200/60 dark:border-zinc-800 px-3 py-2.5 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  Verified Official APK
                </span>
              </div>
            </div>

            {/* Download CTA */}
            <div className="relative mt-4 space-y-2">
              <button
                type="button"
                onClick={handleAndroidDownload}
                disabled={downloadingApk}
                className="w-full h-12 rounded-2xl bg-[#1877F2] hover:bg-[#1464D0] active:scale-[0.985] text-white font-bold text-[14.5px] shadow-[0_10px_28px_rgba(24,119,242,0.34)] flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-70"
              >
                {apkStarted ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                    <span>Download started · Tap again if needed</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4.5 h-4.5" />
                    <span>
                      {downloadingApk
                        ? "Starting APK download..."
                        : config?.androidApkUrl
                        ? "Download Android APK"
                        : "Install Android App"}
                    </span>
                  </>
                )}
              </button>

              {apkStarted && (
                <p className="text-[11.5px] text-center text-emerald-600 dark:text-emerald-400 font-medium">
                  Open the downloaded <strong>.apk</strong> from your notifications to install.
                </p>
              )}

              <button
                type="button"
                onClick={() => dismissPrompt(24)}
                className="w-full py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition cursor-pointer"
              >
                Continue in mobile browser
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {visibleMode === "ios" && (
        <div className="fixed inset-0 z-[995] flex items-end sm:items-center justify-center p-3 sm:p-5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => dismissPrompt(24)}
            className="fixed inset-0 bg-black/55 backdrop-blur-[3px]"
          />

          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 36, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-[430px] rounded-[30px] bg-white dark:bg-zinc-950 border border-zinc-200/85 dark:border-zinc-800 shadow-[0_26px_74px_rgba(0,0,0,0.34)] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] text-zinc-950 dark:text-white overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-13 h-13 rounded-[16px] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-md p-1.5 shrink-0 flex items-center justify-center overflow-hidden">
                  <img
                    src={appIconSrc}
                    alt="DEEP SHOP"
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[17px] font-extrabold tracking-tight">
                    Add DEEP SHOP to Home Screen
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Get the full-screen iOS app experience in 3 quick steps
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => dismissPrompt(24)}
                aria-label="Close iOS install guide"
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center shrink-0 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Animated Interactive iOS Visual Stage */}
            <div className="mt-4 rounded-2xl bg-gradient-to-b from-slate-100 to-slate-50 dark:from-zinc-900 dark:to-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 p-4 overflow-hidden">
              <AnimatePresence mode="wait">
                {activeIosStep === 0 && (
                  <motion.div
                    key="ios-stage-0"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22 }}
                    className="flex flex-col items-center text-center py-1"
                  >
                    <div className="w-full max-w-[260px] rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 px-4 py-2.5 shadow-sm flex items-center justify-between text-zinc-400">
                      <span className="text-xs font-medium">deepshop.top</span>
                      <motion.div
                        animate={{ scale: [1, 1.18, 1] }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.3,
                          ease: "easeInOut",
                        }}
                        className="relative w-9 h-9 rounded-xl bg-[#007AFF]/12 text-[#007AFF] flex items-center justify-center ring-2 ring-[#007AFF]/40"
                      >
                        <SafariShareIcon className="w-5 h-5" />
                        <motion.span
                          animate={{ scale: [1, 1.7], opacity: [0.55, 0] }}
                          transition={{ repeat: Infinity, duration: 1.3 }}
                          className="absolute inset-0 rounded-xl border-2 border-[#007AFF]"
                        />
                      </motion.div>
                      <Smartphone className="w-4 h-4 opacity-50" />
                    </div>
                    <p className="mt-2.5 text-xs font-semibold text-[#007AFF]">
                      1. Tap the Safari Share icon at the bottom (or top) bar
                    </p>
                  </motion.div>
                )}

                {activeIosStep === 1 && (
                  <motion.div
                    key="ios-stage-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22 }}
                    className="flex flex-col items-center text-center py-1"
                  >
                    <motion.div
                      animate={{ y: [3, -2, 3] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.6,
                        ease: "easeInOut",
                      }}
                      className="w-full max-w-[270px] rounded-2xl bg-white dark:bg-zinc-950 border-2 border-[#007AFF]/60 px-3.5 py-2.5 shadow-md flex items-center justify-between"
                    >
                      <span className="text-[13px] font-bold text-zinc-900 dark:text-white">
                        Add to Home Screen
                      </span>
                      <span className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-white">
                        <Plus className="w-4 h-4 stroke-[2.4]" />
                      </span>
                    </motion.div>
                    <p className="mt-2.5 text-xs font-semibold text-[#007AFF]">
                      2. Scroll the share menu & tap “Add to Home Screen”
                    </p>
                  </motion.div>
                )}

                {activeIosStep === 2 && (
                  <motion.div
                    key="ios-stage-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22 }}
                    className="flex flex-col items-center text-center py-1"
                  >
                    <div className="w-full max-w-[270px] rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 px-3.5 py-2.5 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={appIconSrc}
                          alt="DEEP SHOP"
                          className="w-8 h-8 rounded-lg object-contain border border-zinc-200 dark:border-zinc-800"
                        />
                        <span className="text-[13px] font-bold">DEEP SHOP</span>
                      </div>
                      <motion.span
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                        className="px-3 py-1 rounded-full bg-[#007AFF] text-white text-xs font-bold shadow-xs"
                      >
                        Add
                      </motion.span>
                    </div>
                    <p className="mt-2.5 text-xs font-semibold text-[#007AFF]">
                      3. Tap “Add” at the top-right to launch full-screen!
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Interactive Step-by-Step Rows */}
            <div className="mt-3.5 space-y-2">
              {[
                {
                  step: 1,
                  title: "Tap Share in Safari",
                  desc: "Look for the square icon with an upward arrow",
                  icon: <SafariShareIcon className="w-4 h-4 text-[#007AFF]" />,
                },
                {
                  step: 2,
                  title: "Select “Add to Home Screen”",
                  desc: "Swipe up on the share sheet to find this option",
                  icon: <Plus className="w-4 h-4 text-[#007AFF] stroke-[2.4]" />,
                },
                {
                  step: 3,
                  title: "Tap “Add” in Top Right",
                  desc: "Open DEEP SHOP directly from your Home Screen",
                  icon: (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ),
                },
              ].map((item, idx) => {
                const active = activeIosStep === idx;
                return (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => setActiveIosStep(idx)}
                    className={`w-full px-3.5 py-2.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition cursor-pointer ${
                      active
                        ? "bg-[#007AFF]/[0.07] border-[#007AFF]/45 dark:bg-[#007AFF]/15"
                        : "bg-zinc-50/70 dark:bg-zinc-900/60 border-zinc-200/70 dark:border-zinc-800/80"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 ${
                          active
                            ? "bg-[#007AFF] text-white"
                            : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                        }`}
                      >
                        {item.step}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-zinc-900 dark:text-white truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.icon}
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => dismissPrompt(48)}
              className="mt-4 w-full h-11 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold text-[13.5px] active:scale-[0.985] transition cursor-pointer"
            >
              Got it
            </button>

            {/* Animated Bouncing Pointer toward Safari Bottom Toolbar on iPhone */}
            <motion.div
              aria-hidden="true"
              animate={{ y: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
              className="sm:hidden mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-zinc-400"
            >
              <span>Tap</span>
              <SafariShareIcon className="w-3.5 h-3.5 text-[#007AFF]" />
              <span>in Safari’s toolbar below</span>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
