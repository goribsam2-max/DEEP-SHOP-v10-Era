import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { ChevronDown, ChevronUp, ChevronRight, X } from "lucide-react";
import { triggerHaptic } from "../lib/haptics";

export const HeaderNotification: React.FC = () => {
  const location = useLocation();
  const [isReady, setIsReady] = useState(false);
  const [notifConfig, setNotifConfig] = useState<{
    enabled: boolean;
    text: string;
    linkEnabled: boolean;
    textLinkText?: string;
    textLinkUrl?: string;
    btnEnabled: boolean;
    buttonText?: string;
    buttonUrl?: string;
  }>({
    enabled: false,
    text: "",
    linkEnabled: false,
    textLinkText: "",
    textLinkUrl: "#",
    btnEnabled: false,
    buttonText: "",
    buttonUrl: "",
  });

  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [campaignConfig, setCampaignConfig] = useState<{ enabled: boolean }>({ enabled: false });

  useEffect(() => {
    if (location.pathname !== "/") return;
    const unsubPlatform = onSnapshot(
      doc(db, "settings", "platform"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setNotifConfig({
            enabled: !!data.notificationBannerEnabled,
            text: data.notificationBannerText
              ? String(data.notificationBannerText).trim()
              : "",
            linkEnabled: data.notificationBannerLinkEnabled ?? false,
            textLinkText: data.notificationBannerLinkText || "",
            textLinkUrl: data.notificationBannerLinkUrl || "#",
            btnEnabled: data.notificationBannerBtnEnabled ?? false,
            buttonText: data.notificationBannerBtnText || "",
            buttonUrl: data.notificationBannerBtnUrl || "",
          });
        }
        setIsReady(true);
      },
      () => setIsReady(true)
    );

    const unsubCampaign = onSnapshot(
      doc(db, "settings", "cash_on_campaign"),
      (snap) => {
        if (snap.exists()) {
          setCampaignConfig({ enabled: Boolean(snap.data().isEnabled) });
        } else {
          setCampaignConfig({ enabled: true });
        }
      },
      () => setCampaignConfig({ enabled: true })
    );

    return () => {
      unsubPlatform();
      unsubCampaign();
    };
  }, [location.pathname]);

  const showPlatformNotif = notifConfig.enabled && Boolean(notifConfig.text);
  const showCampaignBanner = campaignConfig.enabled;
  const isLongText = (notifConfig.text || "").length > 48;

  if (!isReady || location.pathname !== "/" || dismissed || (!showPlatformNotif && !showCampaignBanner)) {
    return null;
  }

  return (
    <div className="ds-apple-shop-canvas w-full">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-5 md:px-12 pt-2.5 pb-1 space-y-2">
        {showCampaignBanner && (
          <div className="ds-apple-surface rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 text-[13px] leading-snug">
              <span className="font-semibold tracking-tight truncate">
                Cash on Campaign — Unlock zero-advance Cash on Delivery access
              </span>
            </div>
            <a
              href="/cash-on-campaign"
              onPointerDown={() => triggerHaptic()}
              className="ds-apple-accent-text inline-flex items-center gap-0.5 text-[13px] font-semibold whitespace-nowrap shrink-0 hover:underline active:scale-95 transition-transform"
            >
              <span>Apply</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {showPlatformNotif && (
          <div className="ds-apple-surface rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0 text-[13px] leading-relaxed">
              <div
                className={
                  expanded
                    ? "flex flex-wrap items-center gap-x-2 gap-y-1"
                    : "flex items-center gap-2 min-w-0"
                }
              >
                <span className={expanded ? "break-words" : "truncate"}>
                  {notifConfig.text}
                </span>
                {notifConfig.linkEnabled && notifConfig.textLinkText && (
                  <a
                    className="ds-apple-accent-text font-semibold hover:underline whitespace-nowrap shrink-0"
                    href={notifConfig.textLinkUrl || "#"}
                    target={
                      notifConfig.textLinkUrl && notifConfig.textLinkUrl.startsWith("http")
                        ? "_blank"
                        : "_self"
                    }
                    rel="noopener noreferrer"
                  >
                    {notifConfig.textLinkText}
                  </a>
                )}
                {notifConfig.btnEnabled && notifConfig.buttonText && (
                  <a
                    className="ds-apple-btn-primary px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0"
                    href={notifConfig.buttonUrl || "#"}
                    target={
                      notifConfig.buttonUrl && notifConfig.buttonUrl.startsWith("http")
                        ? "_blank"
                        : "_self"
                    }
                    rel="noopener noreferrer"
                  >
                    {notifConfig.buttonText}
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {isLongText && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setExpanded(!expanded);
                  }}
                  aria-label={expanded ? "Collapse announcement" : "Expand announcement"}
                  className="w-8 h-8 rounded-full flex items-center justify-center ds-apple-muted hover:opacity-80 transition cursor-pointer"
                >
                  {expanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setDismissed(true);
                }}
                aria-label="Dismiss announcement"
                className="w-8 h-8 rounded-full flex items-center justify-center ds-apple-muted hover:opacity-80 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeaderNotification;
