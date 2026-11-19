import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { APPLE_SPRING_SNAPPY, isAppleShoppingRoute } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

interface Option {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  options: (Option | string)[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const isAppleShop =
    typeof window !== "undefined" && isAppleShoppingRoute(window.location.pathname);

  const normalizedOptions: Option[] = options.map((opt) => {
    if (typeof opt === "string") {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const accentBorder = isAppleShop
    ? "hover:border-[#0071E3] focus:border-[#0071E3] dark:hover:border-[#0A84FF] dark:focus:border-[#0A84FF]"
    : "hover:border-[#EF8020] focus:border-[#EF8020]";

  const accentText = isAppleShop
    ? "text-[#0071E3] dark:text-[#0A84FF]"
    : "text-[#EF8020]";

  const selectedItemClass = isAppleShop
    ? "bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF]"
    : "bg-[#EF8020]/10 text-[#EF8020]";

  return (
    <div ref={dropdownRef} className={`relative w-full ${className}`}>
      <button
        type="button"
        onPointerDown={() => triggerHaptic("light")}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-11 px-4 rounded-xl text-[13px] font-semibold flex items-center justify-between outline-none transition-all shadow-sm select-none active:scale-[0.985] cursor-pointer ${
          isAppleShop
            ? "ds-apple-input bg-[#f2f2f7] dark:bg-[#2c2c2e] border border-black/8 dark:border-white/12 text-[#1d1d1f] dark:text-[#f5f5f7]"
            : `bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 ${accentBorder}`
        }`}
      >
        <span className={selectedOption ? "truncate" : "text-zinc-400 dark:text-zinc-500"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
            isOpen ? `rotate-180 ${accentText}` : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 4, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_SNAPPY}
            className={`absolute z-50 left-0 right-0 max-h-60 overflow-y-auto rounded-2xl p-1.5 ${
              isAppleShop
                ? "ds-apple-portal ds-apple-popover"
                : "bg-white/90 dark:bg-zinc-950/95 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl shadow-black/5 dark:shadow-black/20"
            }`}
          >
            {normalizedOptions.length === 0 ? (
              <div className="p-3 text-xs text-zinc-400 text-center">No options available</div>
            ) : (
              normalizedOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onPointerDown={() => triggerHaptic("light")}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all flex items-center justify-between active:scale-[0.985] cursor-pointer ${
                      isSelected
                        ? selectedItemClass
                        : "text-zinc-800 dark:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className={`w-3.5 h-3.5 shrink-0 ${accentText}`} />}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
