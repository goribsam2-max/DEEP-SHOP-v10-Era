import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import { triggerHaptic } from "../lib/haptics";

/* Exact IMG_5123 Home Icon: Solid rounded house with arched bottom doorway when active */
const DockHomeIcon: React.FC<{ active?: boolean }> = ({ active }) =>
  active ? (
    <svg className="w-[24px] h-[24px]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.08 2.62a1.45 1.45 0 0 1 1.84 0l7.45 6.26A2.2 2.2 0 0 1 21.15 10.56V19.2A2.3 2.3 0 0 1 18.85 21.5h-4.35v-5.35a2.5 2.5 0 0 0-5 0V21.5H5.15A2.3 2.3 0 0 1 2.85 19.2v-8.64a2.2 2.2 0 0 1 .78-1.68l7.45-6.26Z" />
    </svg>
  ) : (
    <svg
      className="w-[24px] h-[24px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11.12 3.05a1.35 1.35 0 0 1 1.76 0l7.15 6.02a2 2 0 0 1 .72 1.54V19a2 2 0 0 1-2 2h-4.25v-5.2a2.5 2.5 0 0 0-5 0V21H5.25a2 2 0 0 1-2-2v-8.39a2 2 0 0 1 .72-1.54l7.15-6.02Z" />
    </svg>
  );

/* Exact IMG_5123 Video Icon: Clean rounded squircle with centered rounded play triangle (NO clapper stripes) */
const DockVideoIcon: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg
    className="w-[23px] h-[23px]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={active ? "2.25" : "2"}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="5.5" />
    <path
      d="M10.1 8.85L15.6 12L10.1 15.15V8.85Z"
      fill={active ? "currentColor" : "none"}
    />
  </svg>
);

/* Exact IMG_5123 Center Messages Icon: Horizontal-top-edge Direct Message paper plane */
const DockMessagesIcon: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg
    className="w-[23px] h-[23px]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={active ? "2.25" : "2"}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21.4 3.8H2.8L9.5 10.6L12.2 20.2L21.4 3.8Z" />
    <path d="M21.4 3.8L9.5 10.6" />
  </svg>
);

/* Exact IMG_5123 Search Magnifying Glass Icon */
const DockSearchIcon: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg
    className="w-[23px] h-[23px]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={active ? "2.4" : "2"}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="7.2" />
    <path d="M20.2 20.2L16.2 16.2" />
  </svg>
);

const DockUserFallbackIcon: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg
    className="w-[22px] h-[22px]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={active ? "2.25" : "2"}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </svg>
);

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

  const isReelsVariant = variant === "reels";

  const items = [
    {
      id: "home",
      label: "Loops Home",
      path: "/loops",
      isActive: isHomeActive,
      render: (active: boolean) => <DockHomeIcon active={active} />,
    },
    {
      id: "video",
      label: "Video Loops",
      path: "/loops?filter=video",
      isActive: isVideoActive,
      render: (active: boolean) => <DockVideoIcon active={active} />,
    },
    {
      id: "messages",
      label: "Messages",
      path: "/messages",
      isActive: isMessagesActive,
      render: (active: boolean) => <DockMessagesIcon active={active} />,
    },
    {
      id: "search",
      label: "Search",
      path: "/loops/search",
      isActive: isSearchActive,
      render: (active: boolean) => <DockSearchIcon active={active} />,
    },
    {
      id: "profile",
      label: "Profile",
      path: "/loops/profile",
      isActive: isProfileActive,
      render: (active: boolean) =>
        avatarUrl && !imgErr ? (
          <img
            src={avatarUrl}
            alt="Profile"
            referrerPolicy="no-referrer"
            onError={() => setImgErr(true)}
            className={`w-[29px] h-[29px] rounded-full object-cover transition ${
              active
                ? isReelsVariant
                  ? "ring-2 ring-white"
                  : "ring-2 ring-[#0f0f0f] dark:ring-white"
                : isReelsVariant
                ? "ring-1 ring-white/30"
                : "ring-1 ring-black/[0.06] dark:ring-white/15"
            }`}
          />
        ) : (
          <DockUserFallbackIcon active={active} />
        ),
    },
  ];

  return (
    <nav
      aria-label="Loops Bottom Navigation"
      className="fixed bottom-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none pb-[env(safe-area-inset-bottom)]"
    >
      <div
        onTouchStart={(e) => e.stopPropagation()}
        className={`${
          isReelsVariant ? "loops-reels-dock-pill" : "loops-dock-pill"
        } pointer-events-auto flex items-center justify-between gap-1 p-1.5 rounded-full max-w-[356px] w-full h-[60px] touch-manipulation`}
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
            className={`relative h-full flex-1 rounded-full flex items-center justify-center transition-all duration-200 active:scale-94 cursor-pointer touch-manipulation ${
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
