import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "./Icon";
import { triggerHaptic } from "../lib/haptics";

export const NewsBottomDock: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const items = [
    {
      id: "feed",
      label: "Feed",
      path: "/news-hub",
      icon: "file-text",
      isActive:
        path === "/news-hub" ||
        path === "/scam-alert" ||
        path.startsWith("/news-hub/post"),
    },
    {
      id: "explore",
      label: "Explore",
      path: "/news-hub/search",
      icon: "compass",
      isActive:
        path === "/news-hub/search" ||
        path.startsWith("/news-hub/search"),
    },
    {
      id: "shop",
      label: "Shop",
      path: "/",
      icon: "shopping-bag",
      isActive: path === "/",
    },
    {
      id: "messages",
      label: "Messages",
      path: "/messages",
      icon: "message-square",
      isActive: path.startsWith("/messages"),
    },
    {
      id: "profile",
      label: "Profile",
      path: "/news-hub/profile",
      icon: "user",
      isActive:
        path === "/news-hub/profile" ||
        path.startsWith("/news-hub/profile") ||
        path === "/profile" ||
        path.startsWith("/author"),
    },
  ];

  return (
    <nav
      aria-label="Feed Bottom Navigation"
      className="fixed bottom-5 inset-x-0 z-50 flex justify-center px-4 pointer-events-none pb-[env(safe-area-inset-bottom)]"
    >
      <div className="pointer-events-auto flex items-center gap-2 p-1.5 rounded-full bg-white/75 dark:bg-zinc-900/80 backdrop-blur-2xl border border-white/80 dark:border-zinc-700/70 shadow-[0_14px_36px_rgba(15,23,42,0.16)]">
        {items.map((item) => {
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                triggerHaptic();
                navigate(item.path);
              }}
              title={item.label}
              aria-label={item.label}
              className={`relative w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer ${
                item.isActive
                  ? "bg-gradient-to-b from-[#4DA3FF] via-[#227BF3] to-[#1360DA] text-white shadow-[0_6px_18px_rgba(24,119,242,0.48)] ring-2 ring-white/60 dark:ring-blue-300/30"
                  : "bg-white/65 dark:bg-zinc-800/75 text-zinc-900 dark:text-zinc-100 border border-white/80 dark:border-zinc-700/60 hover:bg-white dark:hover:bg-zinc-800"
              }`}
            >
              <Icon
                name={item.icon}
                className={`w-5 h-5 ${
                  item.isActive ? "stroke-[2.2]" : "stroke-[1.9]"
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
};
