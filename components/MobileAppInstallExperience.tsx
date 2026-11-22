import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion, PanInfo, useReducedMotion } from "framer-motion";
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
import {
  APPLE_SPRING_DEFAULT,
  isAppleShoppingRoute,
  projectMomentum,
} from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

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

  if (
    /Android/i.test(ua) &&
    /Version\/\d+\.\d+/i.test(ua) &&
    /Chrome\/\d+/i.test(ua) &&
    !/SamsungBrowser|OPR|EdgA|UCBrowser/i.test(ua)
  ) {
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
  const prefersReducedMotion = useReducedMotion();
  const isAppleShop = isAppleShoppingRoute(location.pathname);
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

  const handleSheetDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const projectedY = info.offset.y + projectMomentum(info.velocity.y, 0.994);
    if (projectedY > 100 || info.velocity.y > 400) {
      triggerHaptic("light");
      dismissPrompt(18);
    }
  };

  const handleAndroidDownload = async () => {
    triggerHaptic("medium");
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
        <div
          className={`fixed inset-0 z-[995] flex items-end sm:items-center justify-center p-0 sm:p-5 ${
            isAppleShop ? "ds-apple-portal" : ""
          }`}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.14 : 0.18 }}
            onClick={() => dismissPrompt(12)}
            className={`fixed inset-0 ${
              isAppleShop ? "ds-apple-backdrop" : "bg-black/50 backdrop-blur-[2px]"
            }`}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: "100%" }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: "100%" }}
            transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_DEFAULT}
            drag={isAppleShop && !prefersReducedMotion ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.02, bottom: 0.5 }}
            onDragEnd={isAppleShop ? handleSheetDragEnd : undefined}
            onClick={(e) => e.stopPropagation()}
            className={`relative z-10 w-full max-w-none sm:max-w-[420px] rounded-t-[28px] rounded-b-none sm:rounded-[28px] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-5 overflow-hidden ${
              isAppleShop
                ? "ds-apple-sheet"
                : "bg-white dark:bg-zinc-950 border-t sm:border border-zinc-200/85 dark:border-zinc-800 shadow-[0_24px_70px_rgba(0,0,0,0.28)] text-zinc-950 dark:text-white"
            }`}
          >
            {isAppleShop && (
              <div className="sm:hidden flex justify-center pb-3 -mt-1">
                <div className="w-9 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
              </div>
            )}

            <div className="relative flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.08] dark:border-white/[0.12] shadow-sm p-1.5 shrink-0 flex items-center justify-center overflow-hidden">
                  <img
                    src={appIconSrc}
                    alt="DEEP SHOP"
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="ds-apple-display text-[17px] font-bold tracking-tight text-zinc-950 dark:text-white">
                      DEEP SHOP App
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/12 text-[#248A3D] dark:text-[#30D158] text-[11px] font-semibold">
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
                onPointerDown={() => triggerHaptic("light")}
                onClick={() => dismissPrompt(18)}
                aria-label="Close app download prompt"
                className="w-8 h-8 rounded-full bg-black/[0.06] dark:bg-white/[0.1] text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center shrink-0 transition active:scale-95 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-2xl bg-[#f5f5f7] dark:bg-[#2c2c2e] border border-black/[0.06] dark:border-white/[0.08] px-3 py-2.5 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF] shrink-0" />
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  Ultra-fast native speed
                </span>
              </div>
              <div className="rounded-2xl bg-[#f5f5f7] dark:bg-[#2c2c2e] border border-black/[0.06] dark:border-white/[0.08] px-3 py-2.5 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#248A3D] dark:text-[#30D158] shrink-0" />
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  Verified Official APK
                </span>
              </div>
            </div>

            <div className="relative mt-4 space-y-2">
              <button
                type="button"
                onPointerDown={() => triggerHaptic("light")}
                onClick={handleAndroidDownload}
                disabled={downloadingApk}
                className={`w-full h-12 rounded-full font-semibold text-[14.5px] flex items-center justify-center gap-2 transition active:scale-[0.97] cursor-pointer disabled:opacity-70 ${
                  isAppleShop
                    ? "ds-apple-btn-primary"
                    : "bg-[#0071E3] hover:bg-[#0077ED] text-white shadow-sm"
                }`}
              >
                {apkStarted ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                    <span>Download started · Tap again if needed</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
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
                <p className="text-[11.5px] text-center text-[#248A3D] dark:text-[#30D158] font-medium">
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
        <div
          className={`fixed inset-0 z-[995] flex items-end sm:items-center justify-center p-0 sm:p-5 ${
            isAppleShop ? "ds-apple-portal" : ""
          }`}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.14 : 0.18 }}
            onClick={() => dismissPrompt(24)}
            className={`fixed inset-0 ${
              isAppleShop ? "ds-apple-backdrop" : "bg-black/55 backdrop-blur-[3px]"
            }`}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: "100%" }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: "100%" }}
            transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_DEFAULT}
            drag={isAppleShop && !prefersReducedMotion ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.02, bottom: 0.5 }}
            onDragEnd={isAppleShop ? handleSheetDragEnd : undefined}
            onClick={(e) => e.stopPropagation()}
            className={`relative z-10 w-full max-w-none sm:max-w-[430px] rounded-t-[28px] rounded-b-none sm:rounded-[28px] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-5 overflow-hidden ${
              isAppleShop
                ? "ds-apple-sheet"
                : "bg-white dark:bg-zinc-950 border-t sm:border border-zinc-200/85 dark:border-zinc-800 shadow-[0_26px_74px_rgba(0,0,0,0.34)] text-zinc-950 dark:text-white"
            }`}
          >
            {isAppleShop && (
              <div className="sm:hidden flex justify-center pb-3 -mt-1">
                <div className="w-9 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
              </div>
            )}

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-13 h-13 rounded-[16px] bg-white dark:bg-zinc-900 border border-black/[0.08] dark:border-white/[0.12] shadow-sm p-1.5 shrink-0 flex items-center justify-center overflow-hidden">
                  <img
                    src={appIconSrc}
                    alt="DEEP SHOP"
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="ds-apple-display text-[17px] font-bold tracking-tight">
                    Add DEEP SHOP to Home Screen
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Get the full-screen iOS app experience in 3 quick steps
                  </p>
                </div>
              </div>

              <button
                type="button"
                onPointerDown={() => triggerHaptic("light")}
                onClick={() => dismissPrompt(24)}
                aria-label="Close iOS install guide"
                className="w-8 h-8 rounded-full bg-black/[0.06] dark:bg-white/[0.1] text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center shrink-0 transition active:scale-95 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl bg-[#f5f5f7] dark:bg-[#2c2c2e] border border-black/[0.06] dark:border-white/[0.08] p-4 overflow-hidden">
              <AnimatePresence mode="wait">
                {activeIosStep === 0 && (
                  <motion.div
                    key="ios-stage-0"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center text-center py-1"
                  >
                    <div className="w-full max-w-[260px] rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] px-4 py-2.5 shadow-sm flex items-center justify-between text-zinc-400">
                      <span className="text-xs font-medium">deepshop.top</span>
                      <div className="w-9 h-9 rounded-xl bg-[#0071E3]/12 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center ring-2 ring-[#0071E3]/35">
                        <SafariShareIcon className="w-5 h-5" />
                      </div>
                      <Smartphone className="w-4 h-4 opacity-50" />
                    </div>
                    <p className="mt-2.5 text-xs font-semibold text-[#0071E3] dark:text-[#0A84FF]">
                      1. Tap the Safari Share icon at the bottom (or top) bar
                    </p>
                  </motion.div>
                )}

                {activeIosStep === 1 && (
                  <motion.div
                    key="ios-stage-1"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center text-center py-1"
                  >
                    <div className="w-full max-w-[270px] rounded-2xl bg-white dark:bg-[#1c1c1e] border-2 border-[#0071E3]/55 px-3.5 py-2.5 shadow-sm flex items-center justify-between">
                      <span className="text-[13px] font-bold text-zinc-900 dark:text-white">
                        Add to Home Screen
                      </span>
                      <span className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-center text-zinc-900 dark:text-white">
                        <Plus className="w-4 h-4 stroke-[2.4]" />
                      </span>
                    </div>
                    <p className="mt-2.5 text-xs font-semibold text-[#0071E3] dark:text-[#0A84FF]">
                      2. Scroll the share menu & tap “Add to Home Screen”
                    </p>
                  </motion.div>
                )}

                {activeIosStep === 2 && (
                  <motion.div
                    key="ios-stage-2"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center text-center py-1"
                  >
                    <div className="w-full max-w-[270px] rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] px-3.5 py-2.5 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={appIconSrc}
                          alt="DEEP SHOP"
                          className="w-8 h-8 rounded-lg object-contain border border-black/[0.08] dark:border-white/[0.1]"
                        />
                        <span className="text-[13px] font-bold">DEEP SHOP</span>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-[#0071E3] text-white text-xs font-bold">
                        Add
                      </span>
                    </div>
                    <p className="mt-2.5 text-xs font-semibold text-[#0071E3] dark:text-[#0A84FF]">
                      3. Tap “Add” at the top-right to launch full-screen!
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-3.5 space-y-2">
              {[
                {
                  step: 1,
                  title: "Tap Share in Safari",
                  desc: "Look for the square icon with an upward arrow",
                  icon: <SafariShareIcon className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />,
                },
                {
                  step: 2,
                  title: "Select “Add to Home Screen”",
                  desc: "Swipe up on the share sheet to find this option",
                  icon: <Plus className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF] stroke-[2.4]" />,
                },
                {
                  step: 3,
                  title: "Tap “Add” in Top Right",
                  desc: "Open DEEP SHOP directly from your Home Screen",
                  icon: <CheckCircle2 className="w-4 h-4 text-[#248A3D] dark:text-[#30D158]" />,
                },
              ].map((item, idx) => {
                const active = activeIosStep === idx;
                return (
                  <button
                    key={item.step}
                    type="button"
                    onPointerDown={() => triggerHaptic("light")}
                    onClick={() => setActiveIosStep(idx)}
                    className={`w-full px-3.5 py-2.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition active:scale-[0.985] cursor-pointer ${
                      active
                        ? "bg-[#0071E3]/[0.08] border-[#0071E3]/45 dark:bg-[#0A84FF]/15"
                        : "bg-[#f5f5f7] dark:bg-[#2c2c2e] border-black/[0.06] dark:border-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold tabular-nums shrink-0 ${
                          active
                            ? "bg-[#0071E3] text-white"
                            : "bg-white dark:bg-[#1c1c1e] text-zinc-700 dark:text-zinc-300 border border-black/[0.08] dark:border-white/[0.1]"
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
              onPointerDown={() => triggerHaptic("light")}
              onClick={() => dismissPrompt(48)}
              className={`mt-4 w-full h-11 rounded-full font-semibold text-[14px] active:scale-[0.97] transition cursor-pointer ${
                isAppleShop
                  ? "ds-apple-btn-primary"
                  : "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950"
              }`}
            >
              Got it
            </button>

            <div className="sm:hidden mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-zinc-400">
              <span>Tap</span>
              <SafariShareIcon className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#0A84FF]" />
              <span>in Safari’s toolbar below</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
