import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Download, Share, PlusSquare, X } from "lucide-react";
import { usePWAInstall } from "../lib/usePWAInstall";
import { triggerHaptic } from "../lib/haptics";

interface PWAInstallButtonProps {
  compact?: boolean;
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
  className = "",
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => {
          triggerHaptic("light");
          void install();
        }}
        className={`ds-apple-btn-primary h-9 rounded-full px-3.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${className}`}
        aria-label="Install App"
        title="Install DEEP SHOP App"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        {!compact && <span>Install App</span>}
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setShowIOSGuide(true);
          }}
          className={`ds-apple-btn-secondary h-9 rounded-full px-3.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${className}`}
          aria-label="Install on iOS"
          title="Install on iPhone or iPad"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          {!compact && <span>Install</span>}
        </button>

        {showIOSGuide &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className="ds-apple-portal ds-apple-backdrop fixed inset-0 z-[100050] flex items-center justify-center p-4"
              onClick={() => setShowIOSGuide(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                className="ds-apple-modal w-full max-w-sm rounded-[26px] p-6 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      Install on iPhone / iPad
                    </h3>
                    <p className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-0.5">
                      Add DEEP SHOP to your Home Screen for offline access.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowIOSGuide(false)}
                    className="w-8 h-8 rounded-full ds-apple-btn-secondary flex items-center justify-center cursor-pointer"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">
                  <div className="flex items-center gap-3 p-3 rounded-2xl ds-apple-surface-subtle">
                    <Share className="w-5 h-5 text-[#0071E3] dark:text-[#0A84FF] shrink-0" />
                    <span>
                      1. Tap the <strong>Share</strong> button in Safari&apos;s toolbar.
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-2xl ds-apple-surface-subtle">
                    <PlusSquare className="w-5 h-5 text-[#0071E3] dark:text-[#0A84FF] shrink-0" />
                    <span>
                      2. Scroll down and tap <strong>Add to Home Screen</strong>.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="ds-apple-btn-primary w-full h-11 rounded-full text-sm font-semibold cursor-pointer"
                >
                  Got It
                </button>
              </div>
            </div>,
            document.body
          )}
      </>
    );
  }

  return null;
};
