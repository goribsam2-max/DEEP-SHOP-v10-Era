import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { gooeyToast, GooeyToaster } from 'goey-toast';
import 'goey-toast/styles.css';
import { LiquidGlassPopup } from './ui/liquid-glass-popup';
import { showIsland } from './ui/dynamic-island';
import { APPLE_SPRING_SNAPPY } from '../lib/shoppingRoute';
import { triggerHaptic } from '../lib/haptics';

type ToastType = 'success' | 'error' | 'info';

function cleanErrorMessage(raw: string): { title: string; description?: string } {
  const msg = String(raw || '').trim();
  if (!msg) return { title: 'Something went wrong' };
  const stripped = msg
    .replace(/^Firebase:\s*Error\s*\([^)]+\)\.?\s*/i, '')
    .replace(/^FirebaseError:\s*/i, '')
    .replace(/\(auth\/[^)]+\)\.?/gi, '')
    .trim();
  if (/network-request-failed|offline/i.test(msg)) {
    return { title: 'Network unavailable', description: 'Check your connection and try again.' };
  }
  if (/permission-denied/i.test(msg)) {
    return { title: 'Action not allowed', description: 'Please sign in or verify access.' };
  }
  if (/wrong-password|invalid-credential/i.test(msg)) {
    return { title: 'Incorrect credentials', description: 'Check your email and password.' };
  }
  return { title: stripped || 'Something went wrong' };
}

interface ConfirmOptions {
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  _resolve?: (val: boolean) => void;
}

interface AlertOptions {
  title: string;
  message: string;
  buttonText?: string;
  onClose?: () => void;
}

interface PromptOptions {
  title: string;
  message: string;
  placeholder?: string;
  onConfirm: (val: string) => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  required?: boolean;
}

interface FullScreenInfoOptions {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  buttonText?: string;
}

export interface UndoNotifyOptions {
  onUndo?: () => void | Promise<void>;
  undoLabel?: string;
  durationMs?: number;
}

interface ToastContextType {
  notify: (
    message: string,
    type?: ToastType,
    description?: string,
    options?: UndoNotifyOptions
  ) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => void;
  prompt: (options: PromptOptions) => void;
  fullScreenInfo: (options: FullScreenInfoOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Standalone notify function for direct imports across non-hook files
export let globalNotify: (
  message: string,
  type?: ToastType,
  description?: string,
  options?: UndoNotifyOptions
) => void = () => {};

export function notify(
  message: string,
  type: ToastType = 'info',
  description?: string,
  options?: UndoNotifyOptions
) {
  if (globalNotify) {
    globalNotify(message, type, description, options);
  }
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const prefersReducedMotion = useReducedMotion();
  const [confirmModal, setConfirmModal] = useState<ConfirmOptions | null>(null);
  const [alertModal, setAlertModal] = useState<AlertOptions | null>(null);
  const [promptModal, setPromptModal] = useState<PromptOptions | null>(null);
  const [fullScreenModal, setFullScreenModal] = useState<FullScreenInfoOptions | null>(null);
  const [undoBar, setUndoBar] = useState<{
    message: string;
    onUndo?: () => void | Promise<void>;
    undoLabel?: string;
  } | null>(null);
  const undoTimerRef = React.useRef<any>(null);

  const [promptVal, setPromptVal] = useState("");

  const notifyFunc = useCallback(
    (
      message: string,
      type: ToastType = 'info',
      description?: string,
      options?: UndoNotifyOptions
    ) => {
      let finalTitle = message;
      let finalDesc = description;

      if (type === 'error') {
        const errorData = cleanErrorMessage(message);
        finalTitle = errorData.title;
        if (!finalDesc) finalDesc = errorData.description;
      }

      if (options?.onUndo) {
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        setUndoBar({
          message: finalTitle,
          onUndo: options.onUndo,
          undoLabel: options.undoLabel || 'Undo',
        });
        undoTimerRef.current = setTimeout(() => {
          setUndoBar(null);
        }, options.durationMs || 5000);
        return;
      }

      if (type === 'success') {
        if (finalTitle.toLowerCase().includes('cart')) {
          showIsland({ state: 'cart_add', title: finalTitle, subtitle: finalDesc });
        } else {
          showIsland({ state: 'success', title: finalTitle, subtitle: finalDesc });
        }
        return;
      } else if (type === 'error') {
        showIsland({ state: 'error', title: finalTitle, subtitle: finalDesc, duration: 4800 });
        return;
      } else if (type === 'info') {
        showIsland({ state: 'notification', title: finalTitle, subtitle: finalDesc });
        return;
      }

      gooeyToast.info(finalTitle, {
        preset: 'bouncy' as const,
        showProgress: true,
        description: finalDesc || undefined,
      });
    },
    []
  );

  useEffect(() => {
    globalNotify = notifyFunc;
  }, [notifyFunc]);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfirmModal({
        ...options,
        _resolve: resolve,
      });
    });
  }, []);
  const alert = useCallback((options: AlertOptions) => setAlertModal(options), []);
  const prompt = useCallback((options: PromptOptions) => {
    setPromptVal("");
    setPromptModal(options);
  }, []);
  const fullScreenInfo = useCallback((options: FullScreenInfoOptions) => setFullScreenModal(options), []);

  const contextValue = useMemo(
    () => ({ notify, confirm, alert, prompt, fullScreenInfo }),
    [notify, confirm, alert, prompt, fullScreenInfo]
  );

  const handleCancelConfirm = () => {
    confirmModal?.onCancel?.();
    confirmModal?._resolve?.(false);
    setConfirmModal(null);
  };

  const handleAcceptConfirm = () => {
    if (typeof confirmModal?.onConfirm === 'function') {
      try {
        confirmModal.onConfirm();
      } catch (err) {
        console.error("Error in onConfirm:", err);
      }
    }
    confirmModal?._resolve?.(true);
    setConfirmModal(null);
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <GooeyToaster position="top-right" showProgress closeButton="top-right" />
      
      <LiquidGlassPopup
        open={!!confirmModal}
        zIndexClass="z-[200000]"
        title={confirmModal?.title || 'Notification'}
        description={confirmModal?.message}
        primaryText={confirmModal?.confirmText || 'Yes'}
        onPrimary={handleAcceptConfirm}
        secondaryText={confirmModal?.cancelText || 'No'}
        onSecondary={handleCancelConfirm}
        onClose={handleCancelConfirm}
      />

      <LiquidGlassPopup
        open={!!alertModal}
        zIndexClass="z-[200000]"
        title={alertModal?.title}
        description={alertModal?.message}
        primaryText={alertModal?.buttonText || 'OK'}
        onPrimary={() => {
          alertModal?.onClose?.();
          setAlertModal(null);
        }}
        onClose={() => {
          alertModal?.onClose?.();
          setAlertModal(null);
        }}
      />

      <LiquidGlassPopup
        open={!!promptModal}
        zIndexClass="z-[200000]"
        title={promptModal?.title}
        description={promptModal?.message}
        primaryText={promptModal?.confirmText || 'Submit'}
        onPrimary={(e) => {
          e?.preventDefault?.();
          e?.stopPropagation?.();
          if (promptModal?.required && !promptVal.trim()) {
            notify("Please enter a value", "error");
            return;
          }
          promptModal?.onConfirm(promptVal);
          setPromptModal(null);
          setPromptVal("");
        }}
        secondaryText={promptModal?.cancelText || 'Cancel'}
        onSecondary={(e) => {
          e?.preventDefault?.();
          e?.stopPropagation?.();
          promptModal?.onCancel?.();
          setPromptModal(null);
          setPromptVal("");
        }}
        onClose={() => {
          promptModal?.onCancel?.();
          setPromptModal(null);
          setPromptVal("");
        }}
      >
        <input
          type="text"
          className="ds-liquid-input ds-apple-input w-full px-4 py-3.5 rounded-2xl text-[15px] outline-none transition"
          placeholder={promptModal?.placeholder || "Enter details..."}
          value={promptVal}
          onChange={(e) => setPromptVal(e.target.value)}
        />
      </LiquidGlassPopup>

      <LiquidGlassPopup
        open={!!fullScreenModal}
        zIndexClass="z-[200000]"
        maxWidthClass="max-w-[380px]"
        title={fullScreenModal?.title}
        description={fullScreenModal?.message}
        primaryText={fullScreenModal?.buttonText || 'Continue'}
        onPrimary={() => {
          fullScreenModal?.onClose();
          setFullScreenModal(null);
        }}
        onClose={() => {
          fullScreenModal?.onClose();
          setFullScreenModal(null);
        }}
      />

      <AnimatePresence>
        {undoBar && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.96 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.96 }}
            transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_SNAPPY}
            className="ds-apple-portal fixed bottom-[76px] inset-x-3.5 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-[440px] z-[210000] rounded-[22px] bg-[#1C1C1E]/95 backdrop-blur-2xl border border-white/15 px-4 py-3 shadow-2xl flex items-center justify-between gap-4 text-white"
          >
            <span className="text-[14px] font-medium text-[#F5F5F7] truncate">
              {undoBar.message}
            </span>
            <button
              type="button"
              onPointerDown={() => triggerHaptic('light')}
              onClick={async () => {
                const fn = undoBar.onUndo;
                setUndoBar(null);
                if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
                if (fn) await fn();
              }}
              className="text-[13.5px] font-semibold text-[#0A84FF] hover:opacity-85 active:scale-95 transition-all shrink-0 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 cursor-pointer whitespace-nowrap"
            >
              {undoBar.undoLabel || 'Undo'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};

export const useNotify = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useNotify must be used within ToastProvider");
  return context.notify;
};

export const useConfirm = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useConfirm must be used within ToastProvider");
  return context.confirm;
};

export const useAlert = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useAlert must be used within ToastProvider");
  return context.alert;
};

export const usePromptModal = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("usePrompt must be used within ToastProvider");
  return context.prompt;
};

export const useFullScreenInfo = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useFullScreenInfo must be used within ToastProvider");
  return context.fullScreenInfo;
};
