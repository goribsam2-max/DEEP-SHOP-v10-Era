import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export interface LiquidGlassAction {
  label: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
}

export interface LiquidGlassPopupProps {
  open: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  primaryAction?: LiquidGlassAction;
  secondaryAction?: LiquidGlassAction;
  primaryText?: React.ReactNode;
  onPrimary?: (e?: any) => void;
  secondaryText?: React.ReactNode;
  onSecondary?: (e?: any) => void;
  maxWidthClass?: string;
  className?: string;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  zIndexClass?: string;
}

export const LiquidGlassPopup: React.FC<LiquidGlassPopupProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  primaryAction,
  secondaryAction,
  primaryText,
  onPrimary,
  secondaryText,
  onSecondary,
  maxWidthClass = 'max-w-[360px] sm:max-w-[390px]',
  className = '',
  showCloseButton = false,
  closeOnBackdrop = true,
  zIndexClass = 'z-[9999]',
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const effectivePrimary: LiquidGlassAction | undefined =
    primaryAction ||
    (primaryText && onPrimary
      ? { label: primaryText, onClick: onPrimary }
      : undefined);

  const effectiveSecondary: LiquidGlassAction | undefined =
    secondaryAction ||
    (secondaryText && onSecondary
      ? { label: secondaryText, onClick: onSecondary }
      : undefined);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={() => {
            if (closeOnBackdrop && onClose) onClose();
          }}
          className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-4 sm:p-6 ds-liquid-backdrop overflow-y-auto`}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.92, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{
              type: 'spring',
              stiffness: 380,
              damping: 28,
              mass: 0.85,
            }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full ${maxWidthClass} ds-liquid-glass-popup px-6 pt-7 pb-6 my-auto ${className}`}
          >
            {showCloseButton && onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close popup"
                className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center ds-liquid-btn-secondary !min-h-0 p-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {title && (
              <h2 className={`ds-liquid-popup-title text-left ${showCloseButton ? 'pr-9' : ''}`}>
                {title}
              </h2>
            )}

            {description && (
              <div className="ds-liquid-popup-desc text-left mt-2.5">
                {description}
              </div>
            )}

            {children && (
              <div className={title || description ? 'mt-4' : ''}>
                {children}
              </div>
            )}

            {(effectivePrimary || effectiveSecondary) && (
              <div className="mt-6 flex flex-col gap-2.5">
                {effectivePrimary && (
                  <button
                    type={effectivePrimary.type || 'button'}
                    onClick={effectivePrimary.onClick}
                    disabled={effectivePrimary.disabled || effectivePrimary.loading}
                    className="w-full px-6 py-3 ds-liquid-btn-primary flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap"
                  >
                    {effectivePrimary.loading ? (
                      <span className="w-24 h-4 rounded-full ds-skeleton inline-block" />
                    ) : (
                      effectivePrimary.label
                    )}
                  </button>
                )}

                {effectiveSecondary && (
                  <button
                    type={effectiveSecondary.type || 'button'}
                    onClick={effectiveSecondary.onClick}
                    disabled={effectiveSecondary.disabled}
                    className="w-full px-6 py-3 ds-liquid-btn-secondary flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap"
                  >
                    {effectiveSecondary.label}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default LiquidGlassPopup;
