import React, { useEffect, useId, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  Eye,
  EyeOff,
  MessageCircle,
  MoreHorizontal,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import { db } from "../firebase";
import AuthVoiceToggle from "./AuthVoiceToggle";

const LOGO_CACHE_KEY = "deepshop_footer_logo_cache";

export function useFooterLogo(): string {
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(LOGO_CACHE_KEY) || "/favicon.png";
    } catch {
      return "/favicon.png";
    }
  });

  useEffect(() => {
    let paymentsLogo = "";
    let seoLogo = "";
    let platformLogo = "";

    const syncResolved = () => {
      // Exact priority matching Footer.tsx: platformLogo -> paymentsLogo -> seoLogo -> /favicon.png
      const resolved =
        platformLogo || paymentsLogo || seoLogo || "/favicon.png";
      setLogoUrl(resolved);
      try {
        localStorage.setItem(LOGO_CACHE_KEY, resolved);
      } catch {
        // Ignore storage quota errors
      }
    };

    const unsubPayments = onSnapshot(doc(db, "settings", "payments"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        paymentsLogo = data.footerLogo || data.logoUrl || "";
        syncResolved();
      }
    });

    const unsubSeo = onSnapshot(doc(db, "settings", "seo"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        seoLogo =
          data.logoUrl ||
          data.appIconUrl ||
          data.faviconUrl ||
          data.metaImage ||
          "";
        syncResolved();
      }
    });

    const unsubPlatform = onSnapshot(doc(db, "settings", "platform"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        platformLogo = data.footerLogo || data.logoUrl || "";
        syncResolved();
      }
    });

    return () => {
      unsubPayments();
      unsubSeo();
      unsubPlatform();
    };
  }, []);

  return logoUrl || "/favicon.png";
}

export const DeepShopCircleLogo: React.FC<{
  size?: "sm" | "md" | "lg";
  className?: string;
}> = ({ size = "md", className = "" }) => {
  const logoUrl = useFooterLogo();
  const [imgSrc, setImgSrc] = useState(logoUrl);

  useEffect(() => {
    setImgSrc(logoUrl);
  }, [logoUrl]);

  const sizeClasses =
    size === "sm"
      ? "w-8 h-8 rounded-full"
      : size === "lg"
      ? "w-20 h-20 rounded-full"
      : "w-[62px] h-[62px] rounded-full";

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden bg-white dark:bg-zinc-900 border border-[#e4e7ec] dark:border-zinc-700/80 shadow-[0_6px_20px_rgba(0,100,224,0.12)] shrink-0 ${sizeClasses} ${className}`}
    >
      <img
        src={imgSrc || "/favicon.png"}
        alt="DEEP SHOP"
        onError={() => setImgSrc("/favicon.png")}
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export const DeepShopBottomBrand: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const logoUrl = useFooterLogo();
  const [imgSrc, setImgSrc] = useState(logoUrl);

  useEffect(() => {
    setImgSrc(logoUrl);
  }, [logoUrl]);

  return (
    <div
      className={`flex items-center justify-center gap-2 pt-3 pb-1 select-none ${className}`}
    >
      <div className="w-5 h-5 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-700 flex items-center justify-center shrink-0">
        <img
          src={imgSrc || "/favicon.png"}
          alt="DEEP SHOP"
          onError={() => setImgSrc("/favicon.png")}
          className="w-full h-full object-cover"
        />
      </div>
      <span className="text-[15px] font-bold tracking-tight text-[#1c2b33] dark:text-zinc-200">
        DEEP SHOP
      </span>
    </div>
  );
};

export const DeepShopEcosystemHero: React.FC = () => {
  const logoUrl = useFooterLogo();
  const [imgSrc, setImgSrc] = useState(logoUrl);

  useEffect(() => {
    setImgSrc(logoUrl);
  }, [logoUrl]);

  return (
    <div className="relative w-full h-[230px] sm:h-[250px] flex items-center justify-center select-none overflow-hidden my-2">
      {/* Ambient soft glow */}
      <div className="w-44 h-44 rounded-full bg-[#0064e0]/10 dark:bg-[#0064e0]/20 blur-2xl absolute" />

      {/* Center Primary Auto-Synced Footer Logo */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="relative z-20 w-24 h-24 rounded-[28px] bg-white dark:bg-zinc-900 border border-[#dfe5ec] dark:border-zinc-700 shadow-[0_16px_40px_rgba(0,100,224,0.18)] p-2 flex items-center justify-center overflow-hidden"
      >
        <img
          src={imgSrc || "/favicon.png"}
          alt="DEEP SHOP"
          onError={() => setImgSrc("/favicon.png")}
          className="w-full h-full object-cover rounded-[20px]"
        />
      </motion.div>

      {/* Top-Left Orbit Badge: Shop */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[10%] sm:left-[14%] top-[18%] w-16 h-16 rounded-full bg-[#0064e0] text-white shadow-[0_10px_24px_rgba(0,100,224,0.3)] flex items-center justify-center"
      >
        <ShoppingBag className="w-7 h-7 stroke-[2]" />
      </motion.div>

      {/* Top-Center Sparkle Orb */}
      <motion.div
        animate={{ y: [0, 4, 0] }}
        transition={{ duration: 3.1, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[34%] top-[8%] w-10 h-10 rounded-2xl bg-violet-500/15 dark:bg-violet-500/25 text-violet-600 dark:text-violet-300 border border-violet-400/30 flex items-center justify-center"
      >
        <Sparkles className="w-5 h-5" />
      </motion.div>

      {/* Top-Right Orbit Badge: Verified Community */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-[12%] sm:right-[15%] top-[12%] w-14 h-14 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg flex items-center justify-center"
      >
        <ShieldCheck className="w-7 h-7 stroke-[2]" />
      </motion.div>

      {/* Bottom-Left Orbit Badge: Fast Delivery */}
      <motion.div
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[18%] sm:left-[22%] bottom-[12%] w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 shadow-md flex items-center justify-center"
      >
        <Truck className="w-5 h-5 stroke-[2]" />
      </motion.div>

      {/* Bottom-Right Orbit Badge: Direct Chat */}
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-[10%] sm:right-[14%] bottom-[14%] w-16 h-16 rounded-[20px] bg-gradient-to-tr from-amber-500 via-rose-500 to-fuchsia-600 text-white shadow-[0_12px_26px_rgba(244,63,94,0.28)] flex items-center justify-center rotate-6"
      >
        <MessageCircle className="w-7 h-7 stroke-[2]" />
      </motion.div>
    </div>
  );
};

export const DefaultUserAvatar: React.FC<{
  photoURL?: string;
  displayName?: string;
  sizeClass?: string;
}> = ({ photoURL, displayName = "User", sizeClass = "w-13 h-13" }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [photoURL]);

  if (photoURL && !failed) {
    return (
      <div
        className={`${sizeClass} rounded-full overflow-hidden bg-[#e4e6eb] dark:bg-zinc-800 border border-[#dfe3e8] dark:border-zinc-700 shrink-0`}
      >
        <img
          src={photoURL}
          alt={displayName}
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full overflow-hidden bg-[#e4e6eb] dark:bg-zinc-800 border border-[#d8dde4] dark:border-zinc-700 flex items-end justify-center shrink-0`}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className="w-full h-full text-[#7a828c] dark:text-zinc-400"
      >
        <circle cx="32" cy="24" r="11" fill="currentColor" />
        <path
          d="M12 58c2.8-11 11-17 20-17s17.2 6 20 17"
          fill="currentColor"
        />
      </svg>
    </div>
  );
};

interface DeepShopFloatingInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  showClear?: boolean;
  isPassword?: boolean;
  errorText?: string;
}

export const DeepShopFloatingInput: React.FC<DeepShopFloatingInputProps> = ({
  label,
  value,
  onChange,
  showClear = true,
  isPassword = false,
  errorText,
  type = "text",
  className = "",
  onFocus,
  onBlur,
  ...rest
}) => {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [revealPassword, setRevealPassword] = useState(false);
  const isFloating = focused || value.length > 0;

  const resolvedType = isPassword
    ? revealPassword
      ? "text"
      : "password"
    : type;

  return (
    <div className={`w-full ${className}`}>
      <div
        className={`relative flex items-center w-full h-[58px] rounded-[16px] border bg-white dark:bg-[#121820] transition-colors ${
          errorText
            ? "border-red-500 dark:border-red-500"
            : focused
            ? "border-[#1c2b33] dark:border-zinc-200"
            : "border-[#cbd2d9] dark:border-zinc-700/90"
        }`}
      >
        <input
          {...rest}
          id={id}
          type={resolvedType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholder=" "
          className="peer w-full h-full bg-transparent px-4 pt-5 pb-1.5 pr-12 text-[16px] font-normal text-[#0a1317] dark:text-zinc-100 outline-none rounded-[16px]"
        />
        <label
          htmlFor={id}
          className={`pointer-events-none absolute left-4 transition-all duration-150 select-none truncate max-w-[calc(100%-3rem)] ${
            isFloating
              ? "top-2 text-[12px] font-medium text-[#5e6c77] dark:text-zinc-400"
              : "top-1/2 -translate-y-1/2 text-[16px] font-normal text-[#65737e] dark:text-zinc-400"
          }`}
        >
          {label}
        </label>

        {isPassword ? (
          value.length > 0 && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setRevealPassword((p) => !p)}
              aria-label={revealPassword ? "Hide password" : "Show password"}
              className="absolute right-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#5e6c77] dark:text-zinc-400 hover:text-[#0a1317] dark:hover:text-white cursor-pointer"
            >
              {revealPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          )
        ) : (
          showClear &&
          focused &&
          value.length > 0 && (
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange("");
              }}
              aria-label="Clear input"
              className="absolute right-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#5e6c77] dark:text-zinc-400 hover:text-[#0a1317] dark:hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )
        )}
      </div>
      {errorText && (
        <p className="mt-1.5 px-1 text-[13px] font-medium text-red-600 dark:text-red-400">
          {errorText}
        </p>
      )}
    </div>
  );
};

export const BirthdaysInfoSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="relative z-10 w-full sm:max-w-[440px] bg-white dark:bg-[#182028] rounded-t-[28px] sm:rounded-[28px] pb-8 pt-2.5 shadow-2xl border-t sm:border border-zinc-200/80 dark:border-zinc-800"
          >
            {/* Top Grab Handle */}
            <div className="w-10 h-1 rounded-full bg-[#cbd2d9] dark:bg-zinc-600 mx-auto mb-2" />

            {/* Header Row */}
            <div className="relative flex items-center justify-center h-12 px-4 border-b border-[#e5e8ec] dark:border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute left-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#1c2b33] dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-[17px] font-bold text-[#0a1317] dark:text-white">
                Birthdays
              </h3>
            </div>

            {/* Body Copy */}
            <div className="px-6 pt-5 space-y-4 text-[15px] leading-[1.45] text-[#1c2b33] dark:text-zinc-200">
              <p>
                Providing your birthday improves the features and product
                recommendations you see, and helps us keep the DEEP SHOP
                community safe.
              </p>
              <p>
                You can find and manage your birthday anytime in your personal
                details account settings.{" "}
                <Link
                  to="/privacy"
                  onClick={onClose}
                  className="text-[#0064e0] dark:text-[#4599ff] font-medium hover:underline"
                >
                  Learn more about how we use your info in our Privacy Policy.
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export const StopCreatingAccountModal: React.FC<{
  isOpen: boolean;
  onStop: () => void;
  onContinue: () => void;
}> = ({ isOpen, onStop, onContinue }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onContinue}
            className="fixed inset-0 ds-liquid-backdrop"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ scale: 0.91, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.85 }}
            className="ds-liquid-glass-popup relative z-10 w-full max-w-[356px] px-6 pt-7 pb-6 text-left"
          >
            <h3 className="ds-liquid-popup-title text-[20px] font-bold leading-[1.28] tracking-[-0.02em]">
              Do you want to stop creating your account?
            </h3>
            <p className="ds-liquid-popup-desc mt-2.5 text-[15.5px] leading-[1.44]">
              If you stop now, you&apos;ll lose any progress that you&apos;ve
              made.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={onStop}
                className="ds-liquid-btn-primary w-full min-h-[48px] px-5 rounded-full font-semibold text-[16px] tracking-[-0.01em] transition-transform active:scale-[0.985] cursor-pointer"
              >
                Stop creating account
              </button>
              <button
                type="button"
                onClick={onContinue}
                className="ds-liquid-btn-secondary w-full min-h-[48px] px-5 rounded-full font-semibold text-[16px] tracking-[-0.01em] transition-transform active:scale-[0.985] cursor-pointer"
              >
                Continue creating account
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

interface DeepShopAuthShellProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  onBack?: () => void;
  hideBack?: boolean;
  onMoreClick?: () => void;
  desktopHeadline?: string;
  desktopSubtext?: string;
  savedCountBadge?: number;
}

export const DeepShopAuthShell: React.FC<DeepShopAuthShellProps> = ({
  children,
  footer,
  onBack,
  hideBack = false,
  onMoreClick,
  desktopHeadline = "Shop smarter & connect securely on DEEP SHOP.",
  desktopSubtext = "Sign in, switch between your saved profiles in one tap, track border-cross device orders, and stay updated with verified community alerts.",
  savedCountBadge,
}) => {
  const logoUrl = useFooterLogo();
  const [imgSrc, setImgSrc] = useState(logoUrl);

  useEffect(() => {
    setImgSrc(logoUrl);
  }, [logoUrl]);

  return (
    <div className="min-h-[100dvh] w-full bg-white dark:bg-[#0f1419] lg:bg-[#f0f2f5] lg:dark:bg-[#090d11] text-[#0a1317] dark:text-zinc-100 flex flex-col justify-center relative">
      <div className="w-full max-w-6xl mx-auto flex-1 lg:flex-initial lg:grid lg:grid-cols-12 lg:items-center lg:gap-12 lg:px-8 xl:px-12 lg:py-10">
        {/* Desktop Brand Showcase Column (Responsive Desktop Layout) */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-center pr-4 space-y-7">
          <Link
            to="/"
            className="inline-flex items-center gap-3.5 w-fit group"
          >
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-[#dce1e7] dark:border-zinc-700 shadow-md flex items-center justify-center p-1">
              <img
                src={imgSrc || "/favicon.png"}
                alt="DEEP SHOP"
                onError={() => setImgSrc("/favicon.png")}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div>
              <span className="block text-3xl font-extrabold tracking-tight text-[#0064e0] dark:text-[#4599ff]">
                DEEP SHOP
              </span>
              <span className="block text-[13px] font-medium text-[#5e6c77] dark:text-zinc-400">
                Official Account Center
              </span>
            </div>
          </Link>

          <div className="space-y-3">
            {typeof savedCountBadge === "number" && savedCountBadge > 0 && (
              <p className="text-sm font-semibold text-[#0064e0] dark:text-[#4599ff]">
                {savedCountBadge}{" "}
                {savedCountBadge === 1 ? "account" : "accounts"} saved on this
                browser
              </p>
            )}
            <h2 className="text-3xl xl:text-[38px] font-bold tracking-tight leading-[1.18] text-[#0a1317] dark:text-white [text-wrap:balance]">
              {desktopHeadline}
            </h2>
            <p className="text-[16px] leading-relaxed text-[#52606d] dark:text-zinc-400 max-w-lg">
              {desktopSubtext}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3.5 pt-1 max-w-lg">
            <div className="rounded-2xl bg-white dark:bg-[#161b22] border border-[#e1e5eb] dark:border-zinc-800 p-4 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-[#0064e0]/10 text-[#0064e0] dark:text-[#4599ff] flex items-center justify-center mb-2.5">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-[#0a1317] dark:text-zinc-100">
                Instant Order Sync
              </p>
              <p className="text-xs text-[#5e6c77] dark:text-zinc-400 mt-0.5 leading-snug">
                Track deliveries, shopping credits, and e-receipts in real time.
              </p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#161b22] border border-[#e1e5eb] dark:border-zinc-800 p-4 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-[#0a1317] dark:text-zinc-100">
                1-Tap Profile Switch
              </p>
              <p className="text-xs text-[#5e6c77] dark:text-zinc-400 mt-0.5 leading-snug">
                Switch between buyer, creator, and seller accounts effortlessly.
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Full-Height Native Surface / Desktop Elevated Card */}
        <div className="lg:col-span-6 w-full flex-1 flex flex-col justify-between min-h-[100dvh] lg:min-h-[640px] lg:max-w-[460px] lg:mx-auto bg-white dark:bg-[#0f1419] lg:dark:bg-[#161b22] lg:rounded-[28px] lg:border lg:border-[#dde2e8] lg:dark:border-zinc-800 lg:shadow-[0_14px_44px_rgba(15,23,42,0.08)] px-5 sm:px-7 pt-3 pb-6 lg:p-8">
          {/* Top App Bar */}
          <div className="flex items-center justify-between h-12 -mx-2 shrink-0">
            {!hideBack && onBack ? (
              <button
                type="button"
                onClick={onBack}
                aria-label="Go back"
                className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[#0a1317] dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2]" />
              </button>
            ) : (
              <div className="w-[44px] h-[44px]" />
            )}

            <div className="flex items-center gap-2">
              <AuthVoiceToggle isInline />
              {onMoreClick && (
                <button
                  type="button"
                  onClick={onMoreClick}
                  aria-label="More account options"
                  className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[#0a1317] dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition cursor-pointer"
                >
                  <MoreHorizontal className="w-6 h-6 stroke-[2]" />
                </button>
              )}
            </div>
          </div>

          {/* Main Content Body */}
          <div className="flex-1 flex flex-col w-full">{children}</div>

          {/* Pinned Footer Slot */}
          {footer && <div className="pt-6 shrink-0 w-full">{footer}</div>}
        </div>
      </div>
    </div>
  );
};
