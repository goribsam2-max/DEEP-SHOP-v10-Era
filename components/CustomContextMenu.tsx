import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Scissors, Clipboard, SquareStack, RefreshCw, ArrowLeft, Shield } from "lucide-react";

export const CustomContextMenu: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hasSelection, setHasSelection] = useState(false);
  const [isEditable, setIsEditable] = useState(false);
  const [lastActiveElement, setLastActiveElement] = useState<HTMLElement | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);

  // Check state of selection and active element on right-click
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

  // Measure and adjust boundary on visible to prevent clipping inside the viewport
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
      
      const target = e.target as HTMLElement;
      // Focus the editable element if right-clicked directly
      const editableTarget = target.closest("input, textarea, [contenteditable='true']") as HTMLElement;
      if (editableTarget) {
        editableTarget.focus();
        updateMenuState(editableTarget);
      } else {
        updateMenuState();
      }

      // Initial placement
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

    // Disable standard keyboard source/inspect shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes the menu
      if (e.key === "Escape") {
        setVisible(false);
      }
      // Ctrl+U (View Source)
      if (e.ctrlKey && e.key.toLowerCase() === "u") {
        e.preventDefault();
      }
      // F12 (DevTools)
      if (e.key === "F12") {
        e.preventDefault();
      }
      // Ctrl+Shift+I / Ctrl+Shift+C (DevTools/Inspect)
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
      localStorage.setItem('virtual_clipboard', text);
    }
    setVisible(false);
  };

  const handleCut = () => {
    const text = window.getSelection()?.toString() || "";
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        localStorage.setItem('virtual_clipboard', text);
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
          const virtText = localStorage.getItem('virtual_clipboard') || "";
          if (virtText) {
            insertText(activeEl, virtText);
          }
          return;
        }
        insertText(activeEl, clipText);
      }).catch((err) => {
        console.warn("Direct clipboard read blocked by browser security, pasting from virtual clipboard instead.", err);
        const virtText = localStorage.getItem('virtual_clipboard') || "";
        if (virtText) {
          insertText(activeEl, virtText);
        }
      });
    }
    setVisible(false);
  };

  const handlePasteFallbackSubmit = (text: string) => {
    const activeEl = lastActiveElement as any;
    if (activeEl && text) {
      const val = activeEl.value;
      const start = activeEl.selectionStart ?? val.length;
      const end = activeEl.selectionEnd ?? val.length;
      setInputValueNative(activeEl, val.substring(0, start) + text + val.substring(end));
      activeEl.selectionStart = activeEl.selectionEnd = start + text.length;
      activeEl.focus();
    }
    setShowPasteFallback(false);
    setFallbackValue("");
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

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.9, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -5 }}
            transition={{ type: "spring", duration: 0.25, bounce: 0.15 }}
            onMouseDown={(e) => {
              // Extremely critical: prevent default on mousedown to preserve focus/selection on target input field!
              e.preventDefault();
            }}
            style={{ top: position.y, left: position.x }}
            className="fixed z-[999999] w-52 max-h-[calc(100vh-24px)] overflow-y-auto bg-white/70 dark:bg-zinc-950/75 backdrop-blur-xl border border-white/20 dark:border-zinc-800/60 rounded-3xl p-2.5 shadow-2xl shadow-black/10 dark:shadow-black/35 flex flex-col gap-1 select-none"
          >
            {/* Header Banner */}
            <div className="px-3.5 py-1.5 mb-1.5 rounded-2xl bg-zinc-900/5 dark:bg-white/5 flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 font-extrabold uppercase tracking-widest">
              <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-[#EF8020]" /> Secure Shield</span>
            </div>

            {/* Copy Option */}
            <button
              onClick={handleCopy}
              disabled={!hasSelection}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                hasSelection
                  ? "text-zinc-800 dark:text-zinc-200 hover:bg-[#EF8020]/10 dark:hover:bg-[#EF8020]/20 hover:text-[#EF8020] active:scale-95"
                  : "text-zinc-300 dark:text-zinc-700 cursor-not-allowed"
              }`}
            >
              <Copy className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Copy</span>
              {hasSelection && <span className="text-[9px] font-mono opacity-50">Selected</span>}
            </button>

            {/* Cut Option */}
            <button
              onClick={handleCut}
              disabled={!hasSelection || !isEditable}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                hasSelection && isEditable
                  ? "text-zinc-800 dark:text-zinc-200 hover:bg-[#EF8020]/10 dark:hover:bg-[#EF8020]/20 hover:text-[#EF8020] active:scale-95"
                  : "text-zinc-300 dark:text-zinc-700 cursor-not-allowed"
              }`}
            >
              <Scissors className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Cut</span>
            </button>

            {/* Paste Option */}
            <button
              onClick={handlePaste}
              disabled={!isEditable}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                isEditable
                  ? "text-zinc-800 dark:text-zinc-200 hover:bg-[#EF8020]/10 dark:hover:bg-[#EF8020]/20 hover:text-[#EF8020] active:scale-95"
                  : "text-zinc-300 dark:text-zinc-700 cursor-not-allowed"
              }`}
            >
              <Clipboard className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Paste</span>
              {isEditable && <span className="text-[9px] font-mono opacity-50">Active</span>}
            </button>

            {/* Select All */}
            <button
              onClick={handleSelectAll}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-[#EF8020]/10 dark:hover:bg-[#EF8020]/20 hover:text-[#EF8020] transition-all active:scale-95"
            >
              <SquareStack className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Select All</span>
            </button>

            <hr className="border-zinc-200/50 dark:border-zinc-800/50 my-1" />

            {/* Refresh Page */}
            <button
              onClick={() => {
                window.location.reload();
                setVisible(false);
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-[#EF8020]/10 dark:hover:bg-[#EF8020]/20 hover:text-[#EF8020] transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Refresh Page</span>
            </button>

            {/* Go Back */}
            <button
              onClick={() => {
                window.history.back();
                setVisible(false);
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-[#EF8020]/10 dark:hover:bg-[#EF8020]/20 hover:text-[#EF8020] transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Go Back</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
