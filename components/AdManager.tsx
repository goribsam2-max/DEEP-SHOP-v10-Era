import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { doc, runTransaction } from "firebase/firestore";
import { X } from "lucide-react";
import { auth, db } from "../firebase";
import { useNotify } from "./Notifications";
import {
  DeepShopAdItem,
  DeepShopSponsoredAd,
  readHiddenAdIds,
  recordDeepShopAdEvent,
  useDeepShopAds,
} from "./DeepShopSponsoredAd";

export const AdManager: React.FC = () => {
  const { ads: allAds } = useDeepShopAds();
  const [activeAd, setActiveAd] = useState<DeepShopAdItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canClose, setCanClose] = useState(true);
  const [userRegion, setUserRegion] = useState("");

  const location = useLocation();
  const notify = useNotify();
  const pageViewsRef = useRef(0);
  const openedAtRef = useRef<number>(0);
  const rewardClaimedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const cached = sessionStorage.getItem("vibe_user_region");
    if (cached) {
      setUserRegion(cached);
      return;
    }
    fetch("https://ipapi.co/json/")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          const region = data.city || data.region || "";
          setUserRegion(region);
          sessionStorage.setItem("vibe_user_region", region);
        }
      })
      .catch(() => {});
  }, []);

  const isSuppressedRoute = (pathname: string) =>
    pathname.startsWith("/admin") ||
    pathname.startsWith("/loops") ||
    pathname.startsWith("/create-reel") ||
    pathname.startsWith("/signin") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/checkout");

  const pickBestAd = (): DeepShopAdItem | null => {
    const hidden = readHiddenAdIds();
    if (hidden.has("__ALL__")) return null;

    const now = Date.now();
    let shownAds: Record<string, number> = {};
    try {
      const raw = localStorage.getItem("vibe_shown_ads_1h");
      if (raw) shownAds = JSON.parse(raw) || {};
    } catch {}

    const campaignPool = allAds.filter(
      (ad) =>
        (ad.sourceType === "video" || ad.sourceType === "photo") &&
        !hidden.has(ad.id) &&
        (!shownAds[ad.id] || now - shownAds[ad.id] > 60 * 60 * 1000) &&
        (!ad.targetRegion ||
          !userRegion ||
          ad.targetRegion.toLowerCase() === "bangladesh" ||
          userRegion.toLowerCase().includes(ad.targetRegion.toLowerCase()))
    );

    if (campaignPool.length === 0) return null;

    const favoriteCat = (
      localStorage.getItem("vibe_favorite_category") || ""
    ).toLowerCase();

    const matched = favoriteCat
      ? campaignPool.find(
          (a) => a.targetCategory && a.targetCategory.toLowerCase() === favoriteCat
        )
      : undefined;

    const chosen =
      matched || campaignPool[Math.floor(Math.random() * campaignPool.length)];

    try {
      shownAds[chosen.id] = now;
      localStorage.setItem("vibe_shown_ads_1h", JSON.stringify(shownAds));
    } catch {}

    return chosen;
  };

  const triggerPopupAd = () => {
    if (isOpen || isSuppressedRoute(location.pathname)) return;
    const chosen = pickBestAd();
    if (!chosen) return;

    const isVid = chosen.sourceType === "video";
    const waitSecs = isVid ? Math.max(0, Number(chosen.timerDuration ?? 5)) : 0;

    setActiveAd(chosen);
    setCountdown(waitSecs);
    setCanClose(waitSecs === 0);
    openedAtRef.current = Date.now();
    setIsOpen(true);
  };

  useEffect(() => {
    if (allAds.length === 0 || isSuppressedRoute(location.pathname)) return;
    if (!sessionStorage.getItem("vibe_ad_session")) {
      const t = window.setTimeout(() => {
        triggerPopupAd();
        sessionStorage.setItem("vibe_ad_session", "true");
      }, 900);
      return () => window.clearTimeout(t);
    }
  }, [allAds.length, location.pathname]);

  useEffect(() => {
    if (allAds.length === 0 || isSuppressedRoute(location.pathname)) return;
    pageViewsRef.current += 1;
    if (pageViewsRef.current >= 4 && !isOpen) {
      triggerPopupAd();
      pageViewsRef.current = 0;
    }
  }, [location.pathname, allAds.length]);

  useEffect(() => {
    if (!isOpen || canClose) return;
    if (countdown <= 0) {
      setCanClose(true);
      return;
    }
    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen, canClose, countdown]);

  const handleCloseModal = () => {
    if (!canClose) return;
    if (activeAd && activeAd.sourceType === "video") {
      const elapsedSec = Math.max(
        1,
        Math.round((Date.now() - openedAtRef.current) / 1000)
      );
      recordDeepShopAdEvent(activeAd.id, "video", "close", elapsedSec);
    }
    setIsOpen(false);
    setActiveAd(null);
  };

  const handleAdCompleted = () => {
    setCanClose(true);
    setCountdown(0);
    if (!activeAd) return;

    const reward = Number(activeAd.rewardCoins || 0);
    const user = auth.currentUser;
    if (
      activeAd.sourceType === "video" &&
      reward > 0 &&
      user &&
      !rewardClaimedRef.current[activeAd.id]
    ) {
      rewardClaimedRef.current[activeAd.id] = true;
      const userRef = doc(db, "users", user.uid);
      runTransaction(db, async (t) => {
        const snap = await t.get(userRef);
        if (!snap.exists()) return;
        const currentCoins = Number(snap.data().coins || 0);
        t.update(userRef, { coins: currentCoins + reward });
      })
        .then(() => {
          notify(`Earned ${reward} coins for watching!`, "success");
        })
        .catch(() => {});
    }
  };

  return (
    <AnimatePresence>
      {isOpen && activeAd && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
          onClick={() => {
            if (canClose) handleCloseModal();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[420px]"
          >
            {/* Top-Left Close / Skip Timer Pill (Never overlaps Top-Right "Tap to see details") */}
            <div className="absolute top-3.5 left-3.5 z-30">
              {!canClose ? (
                <div className="ds-sponsored-pill px-3 py-1.5 rounded-full text-[12px] font-semibold backdrop-blur-md shadow">
                  Skip in {countdown}s
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCloseModal}
                  aria-label="Close ad"
                  className="ds-sponsored-pill w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md shadow active:scale-90 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <DeepShopSponsoredAd
              ad={activeAd}
              variant="modal"
              isActive={isOpen}
              allLibraryAds={allAds}
              onAdEnded={handleAdCompleted}
              onHideAd={() => {
                setIsOpen(false);
                setActiveAd(null);
              }}
              onNotInterested={() => {
                setIsOpen(false);
                setActiveAd(null);
              }}
              onActionNavigate={() => {
                setIsOpen(false);
                setActiveAd(null);
              }}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
