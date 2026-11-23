import React, { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
import AuthVoiceToggle from "./AuthVoiceToggle";
import {
  useFooterLogo,
  DEEP_SHOP_LOGO_DATA_URI,
} from "../lib/useFooterLogo";
import { APPLE_SPRING_DEFAULT, projectMomentum } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

export { useFooterLogo };

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
        src={imgSrc || DEEP_SHOP_LOGO_DATA_URI}
        alt="DEEP SHOP"
        onError={() => setImgSrc(DEEP_SHOP_LOGO_DATA_URI)}
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
          src={imgSrc || DEEP_SHOP_LOGO_DATA_URI}
          alt="DEEP SHOP"
          onError={() => setImgSrc(DEEP_SHOP_LOGO_DATA_URI)}
          className="w-full h-full object-cover"
        />
      </div>
      <span className="text-[15px] font-semibold tracking-tight text-[#1c2b33] dark:text-zinc-200">
        DEEP SHOP
      </span>
    </div>
  );
};

export const DeepShopEcosystemHero: React.FC = () => {
  const logoUrl = useFooterLogo();
  const [imgSrc, setImgSrc] = useState(logoUrl);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    setImgSrc(logoUrl);
  }, [logoUrl]);

  return (
    <div className="relative w-full h-[220px] sm:h-[240px] flex items-center justify-center select-none overflow-hidden my-2">
      <div className="w-40 h-40 rounded-full bg-[#0071E3]/8 dark:bg-[#0A84FF]/14 blur-2xl absolute" />

      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={prefersReducedMotion ? { duration: 0.2 } : APPLE_SPRING_DEFAULT}
        className="relative z-20 w-24 h-24 rounded-[26px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.1] shadow-md p-2 flex items-center justify-center overflow-hidden"
      >
        <img
          src={imgSrc || DEEP_SHOP_LOGO_DATA_URI}
          alt="DEEP SHOP"
          onError={() => setImgSrc(DEEP_SHOP_LOGO_DATA_URI)}
          className="w-full h-full object-cover rounded-[18px]"
        />
      </motion.div>

      <motion.div
        animate={prefersReducedMotion ? undefined : { y: [0, -4, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[10%] sm:left-[14%] top-[18%] w-15 h-15 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] text-white shadow-md flex items-center justify-center"
      >
        <ShoppingBag className="w-6 h-6 stroke-[2]" />
      </motion.div>

      <motion.div
        animate={prefersReducedMotion ? undefined : { y: [0, 3, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[34%] top-[8%] w-10 h-10 rounded-2xl bg-[#0071E3]/12 dark:bg-[#0A84FF]/18 text-[#0071E3] dark:text-[#0A84FF] border border-[#0071E3]/20 dark:border-[#0A84FF]/25 flex items-center justify-center"
      >
        <Sparkles className="w-5 h-5" />
      </motion.div>

      <motion.div
        animate={prefersReducedMotion ? undefined : { y: [0, -5, 0] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-[12%] sm:right-[15%] top-[12%] w-14 h-14 rounded-2xl bg-[#1D1D1F] dark:bg-[#F5F5F7] text-white dark:text-[#1D1D1F] shadow-md flex items-center justify-center"
      >
        <ShieldCheck className="w-6 h-6 stroke-[2]" />
      </motion.div>

      <motion.div
        animate={prefersReducedMotion ? undefined : { y: [0, 4, 0] }}
        transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[18%] sm:left-[22%] bottom-[12%] w-12 h-12 rounded-full bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.06] dark:border-white/[0.1] shadow-sm flex items-center justify-center"
      >
        <Truck className="w-5 h-5 stroke-[2]" />
      </motion.div>

      <motion.div
        animate={prefersReducedMotion ? undefined : { y: [0, -4, 0] }}
        transition={{ duration: 4.1, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-[10%] sm:right-[14%] bottom-[14%] w-15 h-15 rounded-[18px] bg-[#248A3D] dark:bg-[#30D158] text-white shadow-md flex items-center justify-center rotate-6"
      >
        <MessageCircle className="w-6 h-6 stroke-[2]" />
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
  const prefersReducedMotion = useReducedMotion();
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="ds-apple-portal fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.12 : 0.2 }}
            onClick={() => {
              triggerHaptic("selection");
              onClose();
            }}
            className="ds-apple-backdrop fixed inset-0"
          />
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { y: "100%", opacity: 0.6 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { y: "100%", opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0.16 } : APPLE_SPRING_DEFAULT}
            drag={prefersReducedMotion ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.02, bottom: 0.45 }}
            onDragEnd={(_, info) => {
              const projected = info.offset.y + projectMomentum(info.velocity.y);
              if (projected > 100 || info.velocity.y > 400) {
                triggerHaptic("light");
                onClose();
              }
            }}
            className="ds-apple-sheet relative z-10 w-full max-w-none sm:max-w-[440px] rounded-t-[28px] rounded-b-none sm:rounded-[28px] pb-[calc(2rem+env(safe-area-inset-bottom,0px))] sm:pb-8 pt-2.5"
          >
            <div className="w-10 h-1 rounded-full bg-black/[0.15] dark:bg-white/[0.2] mx-auto mb-2" />

            <div className="relative flex items-center justify-center h-12 px-4 border-b border-black/[0.06] dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("selection");
                  onClose();
                }}
                aria-label="Close"
                className="ds-apple-icon-btn absolute left-3 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="text-[16px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                Birthdays
              </h3>
            </div>

            <div className="px-6 pt-5 space-y-4 text-[14.5px] leading-relaxed text-[#1D1D1F] dark:text-[#F5F5F7]">
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
                  onClick={() => {
                    triggerHaptic("selection");
                    onClose();
                  }}
                  className="text-[#0071E3] dark:text-[#0A84FF] font-semibold hover:underline"
                >
                  Learn more about how we use your info in our Privacy Policy.
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export const StopCreatingAccountModal: React.FC<{
  isOpen: boolean;
  onStop: () => void;
  onContinue: () => void;
}> = ({ isOpen, onStop, onContinue }) => {
  const prefersReducedMotion = useReducedMotion();
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="ds-apple-portal fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.12 : 0.2 }}
            onClick={() => {
              triggerHaptic("selection");
              onContinue();
            }}
            className="fixed inset-0 ds-apple-backdrop"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0.94, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0.94, opacity: 0, y: 8 }}
            transition={prefersReducedMotion ? { duration: 0.16 } : APPLE_SPRING_DEFAULT}
            className="ds-apple-modal relative z-10 w-full max-w-[356px] px-6 pt-7 pb-6 text-left rounded-[24px]"
          >
            <h3 className="text-[19px] font-semibold leading-snug tracking-[-0.02em] text-[#1D1D1F] dark:text-[#F5F5F7]">
              Do you want to stop creating your account?
            </h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-[#6E6E73] dark:text-[#98989D]">
              If you stop now, you&apos;ll lose any progress that you&apos;ve
              made.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("warning");
                  onStop();
                }}
                className="w-full min-h-[46px] px-5 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] text-white font-semibold text-[15px] transition-transform active:scale-[0.98] cursor-pointer"
              >
                Stop creating account
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("selection");
                  onContinue();
                }}
                className="w-full min-h-[46px] px-5 rounded-full bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold text-[15px] transition-transform active:scale-[0.98] cursor-pointer"
              >
                Continue creating account
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
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
    <div className="min-h-[100dvh] w-full bg-white dark:bg-black lg:bg-[#F5F5F7] lg:dark:bg-black text-[#1D1D1F] dark:text-[#F5F5F7] flex flex-col justify-center relative">
      <div className="w-full max-w-6xl mx-auto flex-1 lg:flex-initial lg:grid lg:grid-cols-12 lg:items-center lg:gap-12 lg:px-8 xl:px-12 lg:py-10">
        {/* Desktop Brand Showcase Column */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-center pr-4 space-y-7">
          <Link
            to="/"
            onClick={() => triggerHaptic("selection")}
            className="inline-flex items-center gap-3.5 w-fit group"
          >
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex items-center justify-center p-1">
              <img
                src={imgSrc || DEEP_SHOP_LOGO_DATA_URI}
                alt="DEEP SHOP"
                onError={() => setImgSrc(DEEP_SHOP_LOGO_DATA_URI)}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div>
              <span className="block text-[28px] font-semibold tracking-[-0.025em] text-[#0071E3] dark:text-[#0A84FF]">
                DEEP SHOP
              </span>
              <span className="block text-[13px] font-medium text-[#6E6E73] dark:text-[#98989D]">
                Official Account Center
              </span>
            </div>
          </Link>

          <div className="space-y-3">
            {typeof savedCountBadge === "number" && savedCountBadge > 0 && (
              <p className="text-[13.5px] font-semibold tabular-nums text-[#0071E3] dark:text-[#0A84FF]">
                {savedCountBadge}{" "}
                {savedCountBadge === 1 ? "account" : "accounts"} saved on this
                browser
              </p>
            )}
            <h2 className="text-3xl xl:text-[38px] font-semibold tracking-[-0.025em] leading-[1.15] text-[#1D1D1F] dark:text-[#F5F5F7] [text-wrap:balance]">
              {desktopHeadline}
            </h2>
            <p className="text-[15.5px] leading-relaxed text-[#6E6E73] dark:text-[#98989D] max-w-lg">
              {desktopSubtext}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3.5 pt-1 max-w-lg">
            <div className="rounded-[20px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] p-4 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-[#0071E3]/10 dark:bg-[#0A84FF]/16 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center mb-2.5">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <p className="text-[14px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Instant Order Sync
              </p>
              <p className="text-[12px] text-[#6E6E73] dark:text-[#98989D] mt-0.5 leading-snug">
                Track deliveries, shopping credits, and e-receipts in real time.
              </p>
            </div>

            <div className="rounded-[20px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] p-4 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-[#248A3D]/10 dark:bg-[#30D158]/16 text-[#248A3D] dark:text-[#30D158] flex items-center justify-center mb-2.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <p className="text-[14px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                1-Tap Profile Switch
              </p>
              <p className="text-[12px] text-[#6E6E73] dark:text-[#98989D] mt-0.5 leading-snug">
                Switch between buyer, creator, and seller accounts effortlessly.
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Full-Height Native Surface / Desktop Elevated Card */}
        <div className="lg:col-span-6 w-full flex-1 flex flex-col justify-between min-h-[100dvh] lg:min-h-[640px] lg:max-w-[460px] lg:mx-auto bg-white dark:bg-[#1C1C1E] lg:rounded-[28px] lg:border lg:border-black/[0.06] lg:dark:border-white/[0.08] lg:shadow-sm px-5 sm:px-7 pt-3 pb-6 lg:p-8">
          <div className="flex items-center justify-between h-12 -mx-2 shrink-0">
            {!hideBack && onBack ? (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("selection");
                  onBack();
                }}
                aria-label="Go back"
                className="ds-apple-icon-btn w-10 h-10 rounded-full flex items-center justify-center active:scale-[0.95] transition-transform cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-10 h-10" />
            )}

            <div className="flex items-center gap-2">
              <AuthVoiceToggle isInline />
              {onMoreClick && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    onMoreClick();
                  }}
                  aria-label="More account options"
                  className="ds-apple-icon-btn w-10 h-10 rounded-full flex items-center justify-center active:scale-[0.95] transition-transform cursor-pointer"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col w-full">{children}</div>

          {footer && <div className="pt-6 shrink-0 w-full">{footer}</div>}
        </div>
      </div>
    </div>
  );
};
