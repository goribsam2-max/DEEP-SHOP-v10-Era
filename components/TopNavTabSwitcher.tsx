import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingBag, Newspaper, Flame } from "lucide-react";
import { triggerHaptic } from "../lib/haptics";

interface TopNavTabSwitcherProps {
  className?: string;
  variant?: "floating" | "inline";
}

export const TopNavTabSwitcher: React.FC<TopNavTabSwitcherProps> = ({
  className = "",
  variant = "inline",
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isNewsHub =
    location.pathname.startsWith("/news-hub") ||
    location.pathname.startsWith("/news") ||
    location.pathname.startsWith("/scam");

  const isShop = !isNewsHub;

  return (
    <div
      className={`inline-flex items-center p-0.5 sm:p-1 rounded-full bg-zinc-100/95 dark:bg-zinc-900/95 border border-zinc-200/90 dark:border-zinc-800/90 shadow-xs whitespace-nowrap select-none max-w-full ${className}`}
    >
      {/* Shop Tab */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic();
          if (!isShop) navigate("/");
        }}
        className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-medium tracking-tight whitespace-nowrap transition-all duration-200 cursor-pointer ${
          isShop
            ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-bold scale-[1.02]"
            : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
      >
        <ShoppingBag className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${isShop ? "text-amber-600 dark:text-amber-400" : ""}`} />
        <span className="truncate">Shop</span>
      </button>

      {/* News Hub Tab */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic();
          if (!isNewsHub) navigate("/news-hub");
        }}
        className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-medium tracking-tight whitespace-nowrap transition-all duration-200 cursor-pointer relative ${
          isNewsHub
            ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs font-bold scale-[1.02]"
            : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
      >
        <Newspaper className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${isNewsHub ? "text-rose-400 dark:text-rose-600" : ""}`} />
        <span className="whitespace-nowrap">News Hub</span>
        <span className="flex h-1.5 w-1.5 relative shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
        </span>
      </button>
    </div>
  );
};

export default TopNavTabSwitcher;
