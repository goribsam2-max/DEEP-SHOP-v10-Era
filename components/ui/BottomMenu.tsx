import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "../../firebase";
import {
  Home,
  FileText,
  Search,
  User as UserIcon,
} from "lucide-react";
import { triggerHaptic } from "../../lib/haptics";

const BottomMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const path = location.pathname;

  const navItems = [
    {
      id: "home",
      label: "Shop Home",
      path: "/",
      icon: Home,
      isActive: path === "/",
    },
    {
      id: "feed",
      label: "Loops",
      path: "/loops",
      icon: FileText,
      isActive: path.startsWith("/loops") || path.startsWith("/news-hub"),
    },
    {
      id: "search",
      label: "Search",
      path: "/search",
      icon: Search,
      isActive: path === "/search" || path === "/all-products",
    },
    {
      id: "profile",
      label: user ? "Profile" : "Sign In",
      path: user ? "/profile" : "/auth-selector",
      icon: UserIcon,
      isActive: path === "/profile" || path === "/auth-selector",
    },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-5 inset-x-0 z-[100] flex justify-center md:hidden px-4 pointer-events-none pb-[env(safe-area-inset-bottom)]"
    >
      <div className="pointer-events-auto flex items-center gap-2 p-1.5 rounded-full bg-white/75 dark:bg-zinc-900/80 backdrop-blur-2xl border border-white/80 dark:border-zinc-700/70 shadow-[0_14px_36px_rgba(15,23,42,0.16)]">
        {navItems.map((item) => {
          const IconComp = item.icon;
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
              className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer ${
                item.isActive
                  ? "bg-gradient-to-b from-[#4DA3FF] via-[#227BF3] to-[#1360DA] text-white shadow-[0_6px_18px_rgba(24,119,242,0.48)] ring-2 ring-white/60 dark:ring-blue-300/30"
                  : "bg-white/65 dark:bg-zinc-800/75 text-zinc-900 dark:text-zinc-100 border border-white/80 dark:border-zinc-700/60 hover:bg-white dark:hover:bg-zinc-800"
              }`}
            >
              <IconComp
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

export default BottomMenu;
