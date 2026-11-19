import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { APPLE_SPRING_DEFAULT, isAppleShoppingRoute } from '../../lib/shoppingRoute';
import { triggerHaptic } from '../../lib/haptics';

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
  pureGlass?: boolean;
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
  maxWidthClass = 'max-w-[350px] sm:max-w-[375px]',
  className = '',
  showCloseButton = false,
  closeOnBackdrop = true,
  zIndexClass = 'z-[9999]',
  pureGlass = false,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const isAppleShop =
    typeof window !== 'undefined' && isAppleShoppingRoute(window.location.pathname);

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

  const hasBothActions = Boolean(effectivePrimary && effectiveSecondary);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.14 : 0.18, ease: 'easeOut' }}
          onClick={() => {
            if (closeOnBackdrop && onClose) {
              triggerHaptic('light');
              onClose();
            }
          }}
          className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-4 sm:p-6 ${
            isAppleShop ? 'ds-apple-portal ds-apple-backdrop' : 'ds-liquid-backdrop'
          } overflow-y-auto`}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 10 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 6 }}
            transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_DEFAULT}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full ${maxWidthClass} ${
              isAppleShop
                ? 'ds-apple-portal ds-apple-modal rounded-[26px]'
                : `ds-liquid-glass-popup ${pureGlass ? 'ds-modal-pure-glass' : ''}`
            } px-6 pt-6 pb-6 my-auto ${className}`}
          >
            {showCloseButton && onClose && (
              <button
                type="button"
                onPointerDown={() => triggerHaptic('light')}
                onClick={onClose}
                aria-label="Close popup"
                className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center ds-liquid-btn-secondary !min-h-0 p-0 cursor-pointer active:scale-95 transition-transform"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {title && (
              <h2
                className={`ds-liquid-popup-title ds-apple-display text-left ${
                  showCloseButton ? 'pr-9' : ''
                }`}
              >
                {title}
              </h2>
            )}

            {description && (
              <div className="ds-liquid-popup-desc text-left mt-2">
                {description}
              </div>
            )}

            {children && (
              <div className={title || description ? 'mt-4' : ''}>
                {children}
              </div>
            )}

            {(effectivePrimary || effectiveSecondary) && (
              <div
                className={`mt-5 ${
                  hasBothActions
                    ? 'grid grid-cols-2 gap-3'
                    : 'flex flex-col gap-2.5'
                }`}
              >
                {effectivePrimary && (
                  <button
                    type={effectivePrimary.type || 'button'}
                    onPointerDown={() => triggerHaptic('light')}
                    onClick={effectivePrimary.onClick}
                    disabled={effectivePrimary.disabled || effectivePrimary.loading}
                    className={`w-full px-4 py-2.5 min-h-[46px] rounded-full font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 text-center leading-tight cursor-pointer active:scale-[0.97] transition-transform ${
                      isAppleShop ? 'ds-apple-btn-primary' : 'ds-liquid-btn-primary'
                    }`}
                  >
                    {effectivePrimary.loading ? (
                      <span className="w-16 h-4 rounded-full ds-skeleton inline-block" />
                    ) : (
                      effectivePrimary.label
                    )}
                  </button>
                )}

                {effectiveSecondary && (
                  <button
                    type={effectiveSecondary.type || 'button'}
                    onPointerDown={() => triggerHaptic('light')}
                    onClick={effectiveSecondary.onClick}
                    disabled={effectiveSecondary.disabled}
                    className={`w-full px-4 py-2.5 min-h-[46px] rounded-full font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 text-center leading-tight cursor-pointer active:scale-[0.97] transition-transform ${
                      isAppleShop ? 'ds-apple-btn-secondary' : 'ds-liquid-btn-secondary'
                    }`}
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
