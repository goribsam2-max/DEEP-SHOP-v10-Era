import React, { useState, createContext, useContext } from 'react';
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

interface ToastContextType {
  notify: (message: string, type?: ToastType, description?: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => void;
  prompt: (options: PromptOptions) => void;
  fullScreenInfo: (options: FullScreenInfoOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const cleanErrorMessage = (msg: string | any): { title: string; description?: string } => {
  if (!msg) return { title: "Unexpected Error", description: "An unexpected error occurred. Please try again later." };
  
  const msgStr = typeof msg === 'string' ? msg : (msg.message || "An unexpected error occurred.");
  const m = msgStr.toLowerCase();
  
  if (m.includes("auth/user-not-found") || m.includes("auth/wrong-password") || m.includes("auth/invalid-credential")) {
    return { title: "Authentication Failed", description: "Invalid credentials provided. Please check your details and try again." };
  }
  if (m.includes("auth/email-already-in-use")) {
    return { title: "Account Exists", description: "This email is already associated with an account. Please log in instead." };
  }
  if (m.includes("auth/weak-password")) {
    return { title: "Weak Password", description: "Please use a stronger password with a mix of numbers and symbols." };
  }
  if (m.includes("permission-denied") || m.includes("missing or insufficient permissions")) {
    return { title: "Access Denied", description: "You do not have permission to access this resource or perform this action." };
  }
  if (m.includes("network-request-failed") || m.includes("offline")) {
    return { title: "Network Error", description: "Please check your internet connection and try again." };
  }
  if (m.includes("quota-exceeded")) {
    return { title: "Service Busy", description: "Our servers are experiencing high traffic. Please try again later." };
  }
  if (m.includes("requires-recent-login")) {
    return { title: "Authentication Required", description: "For your security, please log out and log back in to perform this action." };
  }
  
  if (m.includes("firebase") || m.includes("firestore") || m.includes("internal error")) {
    return { title: "System Error", description: "We encountered an internal issue. Our team has been notified." };
  }
  
  const cleanedText = msgStr.replace(/FirebaseError:\s*/gi, '').trim();
  
  if (cleanedText.length < 40) {
    return { title: cleanedText };
  }
  return { title: "Action Failed", description: cleanedText };
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [confirmModal, setConfirmModal] = useState<ConfirmOptions | null>(null);
  const [alertModal, setAlertModal] = useState<AlertOptions | null>(null);
  const [promptModal, setPromptModal] = useState<PromptOptions | null>(null);
  const [fullScreenModal, setFullScreenModal] = useState<FullScreenInfoOptions | null>(null);
  
  const [promptVal, setPromptVal] = useState("");

  const notify = (message: string, type: ToastType = 'info', description?: string) => {
    let finalTitle = message;
    let finalDesc = description;

    if (type === 'error') {
      const errorData = cleanErrorMessage(message);
      finalTitle = errorData.title;
      if (!finalDesc) finalDesc = errorData.description;
    }

    const config = {
      preset: 'bouncy' as const,
      showProgress: true,
      description: finalDesc || undefined
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
  };

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfirmModal({
        ...options,
        _resolve: resolve,
      });
    });
  };
  const alert = (options: AlertOptions) => setAlertModal(options);
  const prompt = (options: PromptOptions) => {
    setPromptVal("");
    setPromptModal(options);
  };
  const fullScreenInfo = (options: FullScreenInfoOptions) => setFullScreenModal(options);

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
    <ToastContext.Provider value={{ notify, confirm, alert, prompt, fullScreenInfo }}>
      {children}
      <GooeyToaster position="top-right" showProgress closeButton="top-right" />
      
      <LiquidGlassPopup
        open={!!confirmModal}
        zIndexClass="z-[200000]"
        title={confirmModal?.title}
        description={confirmModal?.message}
        primaryText={confirmModal?.confirmText || 'Confirm'}
        onPrimary={handleAcceptConfirm}
        secondaryText={confirmModal?.cancelText || 'Cancel'}
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
