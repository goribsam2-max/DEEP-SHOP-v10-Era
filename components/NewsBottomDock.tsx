import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import { triggerHaptic } from "../lib/haptics";
import { LoopsSvgIcon } from "./LoopsSvgIcon";

export const NewsBottomDock: React.FC<{
  variant?: "default" | "reels";
}> = ({ variant = "default" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const currentFilter = searchParams.get("filter");

  const [avatarUrl, setAvatarUrl] = useState<string>(
    () => auth.currentUser?.photoURL || ""
  );
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => {
    let unsubDoc: (() => void) | null = null;
    const unsubAuth = auth.onAuthStateChanged((u) => {
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }
      if (!u) {
        setAvatarUrl("");
        return;
      }
      setAvatarUrl(u.photoURL || "");
      unsubDoc = onSnapshot(
        doc(db, "users", u.uid),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            const resolved = d.photoURL || d.shopLogo || u.photoURL || "";
            setAvatarUrl(resolved);
            setImgErr(false);
          }
        },
        () => {}
      );
    });
    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  const isVideoActive =
    (path === "/loops" || path === "/news-hub") && currentFilter === "video";

  const isHomeActive =
    !isVideoActive &&
    (path === "/loops" ||
      path === "/news-hub" ||
      path === "/scam-alert" ||
      (path.startsWith("/loops/post") && !path.endsWith("/activity")) ||
      (path.startsWith("/news-hub/post") && !path.endsWith("/activity")));

  const isMessagesActive = path.startsWith("/messages");

  const isSearchActive =
    path.startsWith("/loops/search") ||
    path.startsWith("/news-hub/search") ||
    path.startsWith("/loops/saved") ||
    path.startsWith("/news-hub/saved");

  const isProfileActive =
    path.startsWith("/loops/profile") ||
    path.startsWith("/news-hub/profile") ||
    path.startsWith("/author");

  const isReelsVariant = variant === "reels" || isVideoActive;

  const iconSizeClass = isReelsVariant
    ? "w-[20px] h-[20px]"
    : "w-[23px] h-[23px]";
  const homeIconSizeClass = isReelsVariant
    ? "w-[20px] h-[20px]"
    : "w-[24px] h-[24px]";

  const items = [
    {
      id: "home",
      label: "Loops Home",
      path: "/loops",
      isActive: isHomeActive,
      render: (active: boolean) => (
        <LoopsSvgIcon
          name={active ? "loops-nav-home-active" : "loops-nav-home"}
          className={homeIconSizeClass}
        />
      ),
    },
    {
      id: "video",
      label: "Video Loops",
      path: "/loops?filter=video",
      isActive: isVideoActive,
      render: (active: boolean) => (
        <LoopsSvgIcon
          name={active ? "loops-nav-reels-active" : "loops-nav-reels"}
          className={iconSizeClass}
        />
      ),
    },
    {
      id: "messages",
      label: "Messages",
      path: "/messages",
      isActive: isMessagesActive,
      render: () => (
        <LoopsSvgIcon name="loops-nav-messages" className={iconSizeClass} />
      ),
    },
    {
      id: "search",
      label: "Search",
      path: "/loops/search",
      isActive: isSearchActive,
      render: () => (
        <LoopsSvgIcon name="loops-nav-search" className={iconSizeClass} />
      ),
    },
    {
      id: "profile",
      label: "Profile",
      path: "/loops/profile",
      isActive: isProfileActive,
      render: (active: boolean) =>
        avatarUrl && !imgErr ? (
          <span className="relative inline-flex items-center justify-center">
            <img
              src={avatarUrl}
              alt="Profile"
              referrerPolicy="no-referrer"
              onError={() => setImgErr(true)}
              className={`${
                isReelsVariant ? "w-[24px] h-[24px]" : "w-[29px] h-[29px]"
              } rounded-full object-cover transition ${
                active
                  ? isReelsVariant
                    ? "ring-2 ring-white"
                    : "ring-2 ring-[#0f0f0f] dark:ring-white"
                  : isReelsVariant
                  ? "ring-1 ring-white/25"
                  : "ring-1 ring-black/[0.06] dark:ring-white/15"
              }`}
            />
            {isReelsVariant && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#FF3040] ring-1 ring-black/75" />
            )}
          </span>
        ) : (
          <LoopsSvgIcon
            name="loops-nav-profile"
            className={isReelsVariant ? "w-[20px] h-[20px]" : "w-[22px] h-[22px]"}
          />
        ),
    },
  ];

  return (
    <nav
      aria-label="Loops Bottom Navigation"
      className={`fixed ${
        isReelsVariant ? "bottom-2.5" : "bottom-4"
      } inset-x-0 z-50 flex justify-center px-4 pointer-events-none pb-[env(safe-area-inset-bottom)]`}
    >
      <div
        onTouchStart={(e) => e.stopPropagation()}
        className={`${
          isReelsVariant
            ? "loops-reels-dock-pill max-w-[292px] h-[48px] p-1 gap-0.5"
            : "loops-dock-pill max-w-[356px] h-[60px] p-1.5 gap-1"
        } pointer-events-auto flex items-center justify-between rounded-full w-full transition-all duration-200 ease-out touch-manipulation`}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              triggerHaptic();
              navigate(item.path);
            }}
            title={item.label}
            aria-label={item.label}
            className={`relative h-full flex-1 rounded-full flex items-center justify-center transition-all duration-150 active:scale-94 cursor-pointer touch-manipulation ${
              item.isActive
                ? isReelsVariant
                  ? "loops-reels-dock-active-pill text-white"
                  : "loops-dock-active-pill text-[#0f0f0f] dark:text-white"
                : isReelsVariant
                ? "text-white/95 hover:bg-white/[0.08]"
                : "text-[#0f0f0f] dark:text-zinc-200 hover:bg-black/[0.035] dark:hover:bg-white/[0.05]"
            }`}
          >
            {item.render(item.isActive)}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default NewsBottomDock;
