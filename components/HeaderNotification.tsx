import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { ChevronDown, ChevronUp } from "lucide-react";

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
  const isLongText = (notifConfig.text || "").length > 42;

  if (!isReady || location.pathname !== "/" || dismissed || (!showPlatformNotif && !showCampaignBanner)) {
    return null;
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 lg:px-6 my-1 space-y-2">
      {/* 1. Cash on Campaign Banner */}
      {showCampaignBanner && (
        <div className="w-full rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 text-zinc-900 dark:text-white p-3 sm:p-3.5 shadow-xs flex items-center justify-between gap-3 font-sans">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="px-2.5 py-0.5 rounded-md bg-pink-100 text-pink-600 dark:bg-pink-950/60 dark:text-pink-400 text-xs font-bold shrink-0">
              🎁 Campaign
            </span>
            <p className="text-xs sm:text-sm font-bold truncate">
              Apply in Cash on Campaign to get Cash on Delivery Access!
            </p>
          </div>
          <a
            href="/cash-on-campaign"
            className="px-4 py-1.5 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold hover:bg-zinc-800 dark:hover:bg-zinc-100 active:scale-95 transition cursor-pointer shrink-0 shadow-xs"
          >
            Apply Now
          </a>
        </div>
      )}

      {/* 2. Global Platform Notification */}
      {showPlatformNotif && (
        <div
          className={`ntfC transition-colors duration-200 ${
            expanded ? "py-3.5 px-4" : "py-2.5 px-3.5"
          }`}
        >
        <div
          className={`ntfT w-full ${
            expanded ? "overflow-visible" : "overflow-x-auto scrollbar-none"
          }`}
        >
          <div
            className={`ntfA ${
              expanded
                ? "ntf-wrap flex flex-wrap items-center justify-center gap-2.5 text-center leading-relaxed w-full"
                : "ntf-nowrap flex-nowrap whitespace-nowrap"
            }`}
          >
            <div
              className={`text-center ${
                expanded
                  ? "w-full max-w-3xl mx-auto whitespace-normal break-words text-xs sm:text-sm leading-normal block py-1"
                  : isLongText
                  ? "inline-flex items-center gap-1.5 shrink-0 max-w-[200px] sm:max-w-[380px] md:max-w-[550px] truncate whitespace-nowrap"
                  : "inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              }`}
            >
              <span>{notifConfig.text}</span>
              {notifConfig.linkEnabled && notifConfig.textLinkText && (
                <a
                  className={`ntf-inline-link ${
                    expanded
                      ? "inline-block ml-1.5 underline font-bold whitespace-normal break-words"
                      : "whitespace-nowrap shrink-0 ml-1"
                  }`}
                  href={notifConfig.textLinkUrl || "#"}
                  target={
                    notifConfig.textLinkUrl &&
                    notifConfig.textLinkUrl.startsWith("http")
                      ? "_blank"
                      : "_self"
                  }
                  rel="noopener noreferrer"
                >
                  {notifConfig.textLinkText}
                </a>
              )}
            </div>

            {notifConfig.btnEnabled && notifConfig.buttonText && (
              <a
                className="ntf-btn whitespace-nowrap shrink-0 my-0.5"
                href={notifConfig.buttonUrl || "#"}
                target={
                  notifConfig.buttonUrl &&
                  notifConfig.buttonUrl.startsWith("http")
                    ? "_blank"
                    : "_self"
                }
                rel="noopener noreferrer"
              >
                {notifConfig.buttonText}
              </a>
            )}

            {isLongText && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors cursor-pointer shrink-0 active:scale-95 my-0.5"
                title={expanded ? "Show less" : "Show more"}
              >
                <span>{expanded ? "Less" : "More"}</span>
                {expanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>
        <div
          className="c-close shrink-0"
          onClick={() => setDismissed(true)}
          aria-label="Close notification"
          title="Close notification"
        />
      </div>
      )}
    </div>
  );
};

export default HeaderNotification;

