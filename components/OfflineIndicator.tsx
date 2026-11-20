import React from "react";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "../lib/useOnlineStatus";

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-[max(12px,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[9500] pointer-events-none px-3 w-max max-w-[92vw]"
    >
      <div className="flex items-center gap-2 rounded-full bg-[#1C1C1E]/92 dark:bg-[#2C2C2E]/95 backdrop-blur-xl border border-white/15 px-3.5 py-1.5 text-[11.5px] font-semibold text-white shadow-lg">
        <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
        <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="truncate">Offline Mode · Cached catalog &amp; cart available</span>
      </div>
    </div>
  );
};
