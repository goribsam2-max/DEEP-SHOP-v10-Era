import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    buttonUrl: ""
  });

  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isLongText, setIsLongText] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "platform"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setNotifConfig({
          enabled: !!data.notificationBannerEnabled,
          text: data.notificationBannerText ? String(data.notificationBannerText).trim() : "",
          linkEnabled: data.notificationBannerLinkEnabled ?? false,
          textLinkText: data.notificationBannerLinkText || "",
          textLinkUrl: data.notificationBannerLinkUrl || "#",
          btnEnabled: data.notificationBannerBtnEnabled ?? false,
          buttonText: data.notificationBannerBtnText || "",
          buttonUrl: data.notificationBannerBtnUrl || ""
        });
      } else {
        setNotifConfig(prev => ({ ...prev, enabled: false, text: "" }));
      }
      setIsReady(true);
    }, (err) => {
      console.error("Error listening to notification settings:", err);
      setIsReady(true);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (notifConfig.text) {
      if (notifConfig.text.length > 35) {
        setIsLongText(true);
      } else if (textRef.current) {
        setIsLongText(textRef.current.scrollWidth > textRef.current.clientWidth);
      } else {
        setIsLongText(false);
      }
    }
  }, [notifConfig.text]);

  if (!isReady || location.pathname !== '/' || dismissed || !notifConfig.enabled || !notifConfig.text) {
    return null;
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 lg:px-6 my-1 animate-fade-in">
      <motion.div 
        layout
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className={`ntfC transition-all duration-300 ${expanded ? 'py-3.5 px-4' : 'py-2.5 px-3.5'}`}
      >
        <div className={`ntfT w-full ${expanded ? 'overflow-visible' : 'overflow-x-auto scrollbar-none'}`}>
          <motion.div 
            layout 
            className={`ntfA ${expanded ? 'ntf-wrap flex flex-wrap items-center justify-center gap-2.5 text-center leading-relaxed w-full' : 'ntf-nowrap flex-nowrap whitespace-nowrap'}`}
          >
            <div 
              ref={textRef}
              className={`text-center ${
                expanded 
                  ? 'w-full max-w-3xl mx-auto whitespace-normal break-words text-xs sm:text-sm leading-normal block py-1' 
                  : (isLongText ? 'inline-flex items-center gap-1.5 shrink-0 max-w-[200px] sm:max-w-[380px] md:max-w-[550px] truncate whitespace-nowrap' : 'inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap')
              }`}
            >
              <span>{notifConfig.text}</span>
              {notifConfig.linkEnabled && notifConfig.textLinkText && (
                <a
                  className={`ntf-inline-link ${expanded ? 'inline-block ml-1.5 underline font-bold whitespace-normal break-words' : 'whitespace-nowrap shrink-0 ml-1'}`}
                  href={notifConfig.textLinkUrl || "#"}
                  target={(notifConfig.textLinkUrl && notifConfig.textLinkUrl.startsWith("http")) ? "_blank" : "_self"}
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
                target={(notifConfig.buttonUrl && notifConfig.buttonUrl.startsWith("http")) ? "_blank" : "_self"}
                rel="noopener noreferrer"
              >
                {notifConfig.buttonText}
              </a>
            )}

            {isLongText && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-all cursor-pointer shrink-0 active:scale-95 my-0.5"
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
          </motion.div>
        </div>
        <div
          className="c-close shrink-0"
          onClick={() => setDismissed(true)}
          aria-label="Close notification"
          title="Close notification"
        />
      </motion.div>
    </div>
  );
};

export default HeaderNotification;

