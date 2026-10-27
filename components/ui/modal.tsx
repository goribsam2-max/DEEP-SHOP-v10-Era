import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Button, ButtonProps } from "@/components/ui/button-1";
import clsx from "clsx";
import { Drawer } from "@/components/ui/drawer";
import useBreakpoints from "@/components/ui/use-breakpoints";

interface ModalProps {
  active: boolean;
  onClickOutside: () => void;
  children: React.ReactNode;
  sticky?: boolean;
  initialFocusRef?: React.RefObject<HTMLButtonElement> | React.RefObject<null>;
  zIndexClass?: string;
  zIndex?: number;
  bottomSheet?: boolean;
}

interface ModalBodyProps {
  children: React.ReactNode;
  sticky?: boolean;
  className?: string;
}

interface ModalHeaderProps {
  children: React.ReactNode;
  sticky?: boolean;
}

const ModalModal = ({
  active,
  onClickOutside,
  children,
  sticky,
  initialFocusRef,
  zIndexClass,
  zIndex,
  bottomSheet = false,
}: ModalProps) => {
  const focusRef = useRef<HTMLButtonElement | null>(null);
  const { isMobile } = useBreakpoints();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (active) {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (focusRef.current) {
        focusRef.current.focus();
      }
    }
  }, [active, initialFocusRef?.current]);

  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClickOutside();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active, onClickOutside]);

  const childrenArray = React.Children.toArray(children);

  const footer = childrenArray.find(
    (child) => React.isValidElement(child) && child.type === ModalActions
  );

  const enhancedFooter = React.isValidElement<{ children: React.ReactNode }>(
    footer
  )
    ? React.cloneElement(footer, {
        children: React.Children.map(footer.props.children, (child, index) => {
          if (index === 0 && React.isValidElement<ButtonProps>(child)) {
            return React.cloneElement(child, {
              ref: focusRef,
            });
          }
          return child;
        }),
      })
    : null;

  if (!mounted) return null;

  if (bottomSheet && isMobile) {
    return (
      <Drawer
        onDismiss={onClickOutside}
        show={active}
        zIndexOverlay={zIndexClass}
        zIndexContent={zIndexClass}
        zIndex={zIndex}
      >
        {React.Children.map(children, (child) =>
          (child as React.ReactElement)?.type === ModalBody
            ? React.cloneElement(child as React.ReactElement<ModalBodyProps>, {
                sticky,
              })
            : child
        )}
      </Drawer>
    );
  }

  const resolvedZIndexClass =
    zIndexClass || (zIndex && zIndex >= 150000 ? "z-[200000]" : "z-[100000]");

  return createPortal(
    <AnimatePresence>
      {active && (
        <div
          className={clsx(
            "fixed inset-0 flex items-center justify-center p-5 sm:p-6",
            resolvedZIndexClass
          )}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={onClickOutside}
            className="fixed inset-0 ds-liquid-backdrop"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.91, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{
              type: "spring",
              stiffness: 380,
              damping: 28,
              mass: 0.85,
            }}
            onClick={(e) => e.stopPropagation()}
            className="ds-liquid-glass-popup relative z-10 flex flex-col font-sans w-full max-w-[420px] sm:max-w-[480px] max-h-[min(820px,84dvh)] overflow-y-auto"
          >
            {React.Children.map(children, (child) =>
              (child as React.ReactElement)?.type === ModalBody
                ? React.cloneElement(
                    child as React.ReactElement<ModalBodyProps>,
                    { sticky }
                  )
                : (child as React.ReactElement)?.type === ModalActions &&
                  !initialFocusRef
                ? enhancedFooter
                : child
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

const ModalBody = ({ children, sticky, className }: ModalBodyProps) => (
  <div
    className={clsx(
      "ds-liquid-section overflow-y-auto text-[15px]",
      sticky ? "px-6 pb-4 pt-6" : "px-6 pt-7 pb-4",
      className
    )}
  >
    {React.Children.map(children, (child) =>
      (child as React.ReactElement)?.type === ModalHeader
        ? React.cloneElement(child as React.ReactElement<ModalHeaderProps>, {
            sticky,
          })
        : child
    )}
  </div>
);

const ModalHeader = ({ children, sticky }: ModalHeaderProps) => (
  <header
    className={clsx(
      "ds-liquid-section mb-4",
      sticky && "sticky top-0 pt-5 px-6 -mx-6 border-b border-white/30 dark:border-white/10"
    )}
  >
    {children}
  </header>
);

const ModalInset = ({ children }: { children: React.ReactNode }) => (
  <div className="ds-liquid-section -mx-6 px-6 py-4 border-b border-t border-white/30 dark:border-white/10">
    {children}
  </div>
);

const ModalTitle = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <h2
    className={clsx(
      "ds-liquid-popup-title mb-2.5 text-[20px] font-bold leading-[1.28] tracking-[-0.02em]",
      className
    )}
  >
    {children}
  </h2>
);

const ModalSubtitle = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <p
    className={clsx(
      "ds-liquid-popup-desc text-[15.5px] leading-[1.44]",
      className
    )}
  >
    {children}
  </p>
);

const ModalActions = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <footer
    className={clsx(
      "ds-liquid-section sticky bottom-0 px-6 pb-6 pt-2 flex flex-col-reverse gap-3 shrink-0",
      className
    )}
  >
    {children}
  </footer>
);

const ModalAction = (props: ButtonProps) => {
  const { variant, className, onClick, ...rest } = props;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) onClick(e);
  };

  if (variant === "unstyled") {
    return (
      <Button
        {...rest}
        onClick={handleClick}
        variant="styled"
        className={clsx(
          "ds-liquid-btn-secondary w-full min-h-[48px] px-6 rounded-full font-semibold text-[16px] tracking-[-0.01em] active:scale-[0.985] transition-transform flex items-center justify-center shrink-0 border-none cursor-pointer",
          className
        )}
      >
        {props.children}
      </Button>
    );
  }
  return (
    <Button
      {...rest}
      onClick={handleClick}
      variant="styled"
      className={clsx(
        "ds-liquid-btn-primary w-full min-h-[48px] px-6 rounded-full font-semibold text-[16px] tracking-[-0.01em] active:scale-[0.985] transition-transform flex items-center justify-center border-none cursor-pointer",
        className
      )}
    >
      {props.children}
    </Button>
  );
};

export const Modal = {
  Modal: ModalModal,
  Header: ModalHeader,
  Inset: ModalInset,
  Body: ModalBody,
  Title: ModalTitle,
  Subtitle: ModalSubtitle,
  Actions: ModalActions,
  Action: ModalAction,
};
