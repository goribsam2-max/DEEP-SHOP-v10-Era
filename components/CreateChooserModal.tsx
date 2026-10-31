import React from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { triggerHaptic } from "../lib/haptics";
import { LoopsSvgIcon } from "./LoopsSvgIcon";

interface CreateChooserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateChooserModal: React.FC<CreateChooserModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-fade-in p-4 sm:items-center sm:justify-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="ds-liquid-glass-popup w-full max-w-sm rounded-[30px] bg-white text-zinc-950 dark:bg-[#18191C] dark:text-white p-6 shadow-2xl border border-zinc-200/80 dark:border-white/10 space-y-5 animate-scale-up"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#0095F6]/15 text-[#0095F6] flex items-center justify-center">
              <LoopsSvgIcon name="loops-header-create" className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white leading-tight">
                Create on Loops
              </h2>
              <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400">
                Choose what you want to share
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close create chooser"
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Post Option */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              onClose();
              navigate("/loops/create");
            }}
            className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 hover:border-[#0095F6] transition flex flex-col items-center justify-center gap-2.5 text-center group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#0095F6] flex items-center justify-center group-hover:scale-105 transition-transform">
              <LoopsSvgIcon name="loops-chooser-post" className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">
                Post
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Text &amp; Photos
              </p>
            </div>
          </button>

          {/* Reel Option */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              onClose();
              navigate("/create-reel");
            }}
            className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 hover:border-[#0095F6] transition flex flex-col items-center justify-center gap-2.5 text-center group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-[#3B5BDB] dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <LoopsSvgIcon name="loops-chooser-reel" className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">
                Reel
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Video &amp; Audio Studio
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateChooserModal;
