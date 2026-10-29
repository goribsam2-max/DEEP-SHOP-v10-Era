import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingBag, Newspaper } from "lucide-react";
import { triggerHaptic } from "../lib/haptics";

interface TopNavTabSwitcherProps {
  className?: string;
  variant?: "floating" | "inline";
}

export const TopNavTabSwitcher: React.FC<TopNavTabSwitcherProps> = ({
  className = "",
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isNewsHub =
    location.pathname.startsWith("/loops") ||
    location.pathname.startsWith("/news-hub") ||
    location.pathname.startsWith("/news") ||
    location.pathname.startsWith("/scam");

  const isShop = !isNewsHub;

  return (
    <div
      className={`inline-flex items-center p-1 rounded-full bg-white/80 dark:bg-zinc-900/90 backdrop-blur-xl border border-white/80 dark:border-zinc-800/90 shadow-[0_4px_14px_rgba(15,23,42,0.06)] whitespace-nowrap select-none max-w-full ${className}`}
    >
      {/* Shop Tab */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic();
          if (!isShop) navigate("/");
        }}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-tight whitespace-nowrap transition-all duration-200 cursor-pointer ${
          isShop
            ? "bg-[#1877F2] text-white shadow-[0_4px_12px_rgba(24,119,242,0.3)] font-bold"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
      >
        <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Shop</span>
      </button>

      {/* Loops Tab */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic();
          if (!isNewsHub) navigate("/loops");
        }}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer relative ${
          isNewsHub
            ? "bg-zinc-950 dark:bg-white text-white dark:text-black shadow-xs font-extrabold"
            : "text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
        }`}
      >
        <span className="loops-wordmark text-[13.5px] whitespace-nowrap">Loops</span>
        <span className="flex h-1.5 w-1.5 relative shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
        </span>
      </button>
    </div>
  );
};

export default TopNavTabSwitcher;
