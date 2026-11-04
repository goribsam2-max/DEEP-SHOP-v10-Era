import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import { gooeyToast, GooeyToaster } from 'goey-toast';
import 'goey-toast/styles.css';
import { LiquidGlassPopup } from './ui/liquid-glass-popup';
import { showIsland } from './ui/dynamic-island';

type ToastType = 'success' | 'error' | 'info';

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

      const config = {
        preset: 'bouncy' as const,
        showProgress: true,
        description: finalDesc || undefined,
      };

      if (type === 'success') {
        if (finalTitle.toLowerCase().includes('cart')) {
          showIsland({ state: 'cart_add', title: finalTitle, subtitle: finalDesc });
        } else {
          showIsland({ state: 'success', title: finalTitle, subtitle: finalDesc });
        }
        return;
      } else if (type === 'info') {
        showIsland({ state: 'notification', title: finalTitle, subtitle: finalDesc });
        return;
      }

      if (type === 'error') gooeyToast.error(finalTitle, config);
      else gooeyToast.info(finalTitle, config);
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
          className="ds-liquid-input w-full px-4 py-3.5 rounded-2xl text-[15px] outline-none focus:ring-2 focus:ring-[#0074f8]/50 transition"
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

      {/* Dark Frosted Glass Undo Snackbar matching IMG_5384 */}
      {undoBar && (
        <div className="fixed bottom-[74px] inset-x-3.5 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-[440px] z-[210000] rounded-[18px] bg-zinc-900/95 backdrop-blur-2xl border border-white/15 px-4 py-3.5 shadow-2xl flex items-center justify-between gap-4 text-white animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span className="text-sm font-medium text-zinc-100 truncate">
            {undoBar.message}
          </span>
          <button
            type="button"
            onClick={async () => {
              const fn = undoBar.onUndo;
              setUndoBar(null);
              if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
              if (fn) await fn();
            }}
            className="text-sm font-bold text-white hover:text-blue-400 active:scale-95 transition-all shrink-0 px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20"
          >
            {undoBar.undoLabel || 'Undo'}
          </button>
        </div>
      )}
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
