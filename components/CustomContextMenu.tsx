import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Copy, Scissors, Clipboard, SquareStack, RefreshCw, ArrowLeft, Shield } from "lucide-react";
import { APPLE_SPRING_SNAPPY, isAppleShoppingRoute } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

export const CustomContextMenu: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hasSelection, setHasSelection] = useState(false);
  const [isEditable, setIsEditable] = useState(false);
  const [lastActiveElement, setLastActiveElement] = useState<HTMLElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const isAppleShop =
    typeof window !== "undefined" && isAppleShoppingRoute(window.location.pathname);

  const menuRef = useRef<HTMLDivElement>(null);

  const updateMenuState = (targetEl?: HTMLElement) => {
    const selection = window.getSelection()?.toString() || "";
    setHasSelection(selection.trim().length > 0);

    const activeEl = targetEl || document.activeElement;
    const editable = activeEl && (
      activeEl.tagName === "INPUT" ||
      activeEl.tagName === "TEXTAREA" ||
      (activeEl as HTMLElement).isContentEditable
    );
    setIsEditable(!!editable);
    if (editable) {
      setLastActiveElement(activeEl as HTMLElement);
    }
  };

  const setInputValueNative = (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
    const prototype = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (setter) {
      setter.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };

  useEffect(() => {
    if (visible && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let adjustedX = position.x;
      let adjustedY = position.y;

      if (position.x + rect.width > window.innerWidth) {
        adjustedX = window.innerWidth - rect.width - 12;
      }
      if (adjustedX < 12) {
        adjustedX = 12;
      }

      if (position.y + rect.height > window.innerHeight) {
        adjustedY = window.innerHeight - rect.height - 12;
      }
      if (adjustedY < 12) {
        adjustedY = 12;
      }

      if (adjustedX !== position.x || adjustedY !== position.y) {
        setPosition({ x: adjustedX, y: adjustedY });
      }
    }
  }, [visible]);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerHaptic("light");

      const target = e.target as HTMLElement;
      const editableTarget = target.closest("input, textarea, [contenteditable='true']") as HTMLElement;
      if (editableTarget) {
        editableTarget.focus();
        updateMenuState(editableTarget);
      } else {
        updateMenuState();
      }

      let x = e.clientX;
      let y = e.clientY;

      const menuWidth = 220;
      const menuHeight = 350;

      if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 12;
      }
      if (x < 12) {
        x = 12;
      }

      if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - 12;
      }
      if (y < 12) {
        y = 12;
      }

      setPosition({ x, y });
      setVisible(true);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };

    const handleScroll = () => setVisible(false);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setVisible(false);
      }
      if (e.ctrlKey && e.key.toLowerCase() === "u") {
        e.preventDefault();
      }
      if (e.key === "F12") {
        e.preventDefault();
      }
      if (e.ctrlKey && e.shiftKey && (e.key.toLowerCase() === "i" || e.key.toLowerCase() === "c")) {
        e.preventDefault();
      }
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("click", handleClickOutside);
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("click", handleClickOutside);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [lastActiveElement]);

  const handleCopy = () => {
    const text = window.getSelection()?.toString() || "";
    if (text) {
      navigator.clipboard.writeText(text);
      localStorage.setItem("virtual_clipboard", text);
    }
    setVisible(false);
  };

  const handleCut = () => {
    const text = window.getSelection()?.toString() || "";
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        localStorage.setItem("virtual_clipboard", text);
        const activeEl = (lastActiveElement || document.activeElement) as any;
        if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
          const start = activeEl.selectionStart;
          const end = activeEl.selectionEnd;
          const val = activeEl.value;
          setInputValueNative(activeEl, val.substring(0, start) + val.substring(end));
          activeEl.selectionStart = activeEl.selectionEnd = start;
        }
      });
    }
    setVisible(false);
  };

  const insertText = (activeEl: any, text: string) => {
    const val = activeEl.value;
    const start = activeEl.selectionStart ?? val.length;
    const end = activeEl.selectionEnd ?? val.length;
    setInputValueNative(activeEl, val.substring(0, start) + text + val.substring(end));
    activeEl.selectionStart = activeEl.selectionEnd = start + text.length;
    activeEl.focus();
  };

  const handlePaste = () => {
    const activeEl = (lastActiveElement || document.activeElement) as any;
    if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
      navigator.clipboard.readText().then((clipText) => {
        if (!clipText) {
          const virtText = localStorage.getItem("virtual_clipboard") || "";
          if (virtText) {
            insertText(activeEl, virtText);
          }
          return;
        }
        insertText(activeEl, clipText);
      }).catch(() => {
        const virtText = localStorage.getItem("virtual_clipboard") || "";
        if (virtText) {
          insertText(activeEl, virtText);
        }
      });
    }
    setVisible(false);
  };

  const handleSelectAll = () => {
    const activeEl = (lastActiveElement || document.activeElement) as any;
    if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
      activeEl.select();
    } else {
      const range = document.createRange();
      range.selectNodeContents(document.body);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    setVisible(false);
  };

  const activeItemHover = isAppleShop
    ? "text-zinc-800 dark:text-zinc-200 hover:bg-[#0071E3]/10 dark:hover:bg-[#0A84FF]/18 hover:text-[#0071E3] dark:hover:text-[#0A84FF]"
    : "text-zinc-800 dark:text-zinc-200 hover:bg-[#EF8020]/10 dark:hover:bg-[#EF8020]/20 hover:text-[#EF8020]";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={menuRef}
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -4 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -4 }}
          transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_SNAPPY}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          style={{ top: position.y, left: position.x }}
          className={`fixed z-[999999] w-52 max-h-[calc(100vh-24px)] overflow-y-auto p-2 flex flex-col gap-0.5 select-none ${
            isAppleShop
              ? "ds-apple-portal ds-apple-popover rounded-[22px]"
              : "bg-white/70 dark:bg-zinc-950/75 backdrop-blur-xl border border-white/20 dark:border-zinc-800/60 rounded-3xl shadow-2xl shadow-black/10 dark:shadow-black/35"
          }`}
        >
          <div className="px-3 py-1.5 mb-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Shield className={`w-3 h-3 ${isAppleShop ? "text-[#0071E3] dark:text-[#0A84FF]" : "text-[#EF8020]"}`} />
              Secure Shield
            </span>
          </div>

          <button
            onPointerDown={() => triggerHaptic("light")}
            onClick={handleCopy}
            disabled={!hasSelection}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all ${
              hasSelection
                ? `${activeItemHover} active:scale-[0.97] cursor-pointer`
                : "text-zinc-300 dark:text-zinc-700 cursor-not-allowed"
            }`}
          >
            <Copy className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">Copy</span>
          </button>

          <button
            onPointerDown={() => triggerHaptic("light")}
            onClick={handleCut}
            disabled={!hasSelection || !isEditable}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all ${
              hasSelection && isEditable
                ? `${activeItemHover} active:scale-[0.97] cursor-pointer`
                : "text-zinc-300 dark:text-zinc-700 cursor-not-allowed"
            }`}
          >
            <Scissors className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">Cut</span>
          </button>

          <button
            onPointerDown={() => triggerHaptic("light")}
            onClick={handlePaste}
            disabled={!isEditable}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all ${
              isEditable
                ? `${activeItemHover} active:scale-[0.97] cursor-pointer`
                : "text-zinc-300 dark:text-zinc-700 cursor-not-allowed"
            }`}
          >
            <Clipboard className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">Paste</span>
          </button>

          <button
            onPointerDown={() => triggerHaptic("light")}
            onClick={handleSelectAll}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.97] cursor-pointer ${activeItemHover}`}
          >
            <SquareStack className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">Select All</span>
          </button>

          <hr className="border-black/8 dark:border-white/10 my-1" />

          <button
            onPointerDown={() => triggerHaptic("light")}
            onClick={() => {
              window.location.reload();
              setVisible(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.97] cursor-pointer ${activeItemHover}`}
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">Refresh Page</span>
          </button>

          <button
            onPointerDown={() => triggerHaptic("light")}
            onClick={() => {
              window.history.back();
              setVisible(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.97] cursor-pointer ${activeItemHover}`}
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">Go Back</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
