import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useLanguage } from "../LanguageContext"
import { triggerHaptic } from "@/lib/haptics"

export const LanguageSwitcher = ({ className }: { className?: string }) => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const languagesList = [
    { id: 'en', label: 'English' },
    { id: 'bn', label: 'বাংলা' },
    { id: 'hi', label: 'हिन्दी' },
    { id: 'ar', label: 'العربية' },
    { id: 'es', label: 'Español' },
    { id: 'fr', label: 'Français' },
    { id: 'de', label: 'Deutsch' },
  ];

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        onClick={() => {
          triggerHaptic();
          setIsOpen(!isOpen);
        }}
        className="flex items-center justify-center p-2 rounded-full outline-none focus:outline-none cursor-pointer w-9 h-9 text-[#08102b] dark:text-[#fffdfc] hover:bg-black/5 dark:hover:bg-white/10 transition-all border-none shadow-none"
        type="button"
        title="Translate Language"
        aria-label="Translate Language"
      >
        <svg className="w-5 h-5 line" viewBox="0 0 24 24">
          <path className="svgC" d="M19.06 18.6699L16.92 14.3999L14.78 18.6699" />
          <path className="svgC" d="M15.1699 17.9099H18.6899" />
          <path d="M16.9201 22.0001C14.1201 22.0001 11.8401 19.73 11.8401 16.92C11.8401 14.12 14.1101 11.8401 16.9201 11.8401C19.7201 11.8401 22.0001 14.11 22.0001 16.92C22.0001 19.73 19.7301 22.0001 16.9201 22.0001Z" />
          <path d="M5.02 2H8.94C11.01 2 12.01 3.00002 11.96 5.02002V8.94C12.01 11.01 11.01 12.01 8.94 11.96H5.02C3 12 2 11 2 8.92999V5.01001C2 3.00001 3 2 5.02 2Z" />
          <path className="svgC" d="M9.00995 5.84985H4.94995" />
          <path className="svgC" d="M6.96997 5.16992V5.84991" />
          <path className="svgC" d="M7.98994 5.83984C7.98994 7.58984 6.61994 9.00983 4.93994 9.00983" />
          <path className="svgC" d="M9.0099 9.01001C8.2799 9.01001 7.61991 8.62 7.15991 8" />
          <path d="M2 15C2 18.87 5.13 22 9 22L7.95 20.25" />
          <path d="M22 9C22 5.13 18.87 2 15 2L16.05 3.75" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-48 bg-[#fffdfc] dark:bg-[#2d2d30] border border-[#e6e6e6] dark:border-white/15 rounded-xl shadow-[0_5px_35px_rgba(0,0,0,0.07)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.2)] overflow-hidden z-50 p-2 text-left"
          >
            <div className="text-[11px] font-bold tracking-wider text-zinc-400 dark:text-zinc-400 px-3 py-1 uppercase border-b border-zinc-100 dark:border-zinc-800 mb-1">
              Select Language
            </div>
            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {languagesList.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    triggerHaptic();
                    setLanguage(item.id as any);
                    setIsOpen(false);
                  }}
                  type="button"
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between shadow-none border-none",
                    language === item.id 
                      ? "bg-[#204ecf]/10 dark:bg-[#3b82f6]/20 text-[#204ecf] dark:text-[#3b82f6]" 
                      : "text-[#08102b] dark:text-[#fffdfc] hover:bg-black/5 dark:hover:bg-white/5"
                  )}
                >
                  <span>{item.label}</span>
                  {language === item.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#204ecf] dark:bg-[#3b82f6]" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

