"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";
import { isAppleShoppingRoute } from "@/lib/shoppingRoute";
import { triggerHaptic } from "../../lib/haptics";

function isShoppingPortalActive() {
  return typeof window !== "undefined" && isAppleShoppingRoute(window.location.pathname);
}

const AlertDialog = AlertDialogPrimitive.Root;

const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const isAppleShop = isShoppingPortalActive();
  return (
    <AlertDialogPrimitive.Overlay
      className={cn(
        isAppleShop ? "ds-apple-portal ds-apple-backdrop" : "ds-liquid-backdrop",
        "fixed inset-0 z-[200] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
      ref={ref}
    />
  );
});
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => {
  const isAppleShop = isShoppingPortalActive();
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        className={cn(
          isAppleShop
            ? "ds-apple-portal ds-apple-modal rounded-[26px]"
            : "ds-liquid-glass-popup",
          "fixed left-[50%] top-[50%] z-[201] grid w-[calc(100%-2.5rem)] max-w-[356px] translate-x-[-50%] translate-y-[-50%] gap-5 px-6 pt-7 pb-6 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
});
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-2 text-left", className)}
    {...props}
  />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse gap-3 pt-1", className)}
    {...props}
  />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn(
      "ds-liquid-popup-title ds-apple-display text-[20px] font-semibold leading-[1.24] tracking-[-0.025em]",
      className
    )}
    {...props}
  />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn(
      "ds-liquid-popup-desc text-[15px] leading-[1.46]",
      className
    )}
    {...props}
  />
));
AlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName;

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, onPointerDown, ...props }, ref) => {
  const isAppleShop = isShoppingPortalActive();
  return (
    <AlertDialogPrimitive.Action
      ref={ref}
      onPointerDown={(e) => {
        triggerHaptic("light");
        onPointerDown?.(e);
      }}
      className={cn(
        isAppleShop ? "ds-apple-btn-primary" : "ds-liquid-btn-primary",
        "w-full min-h-[48px] px-5 rounded-full text-[15px] font-semibold tracking-[-0.01em] flex items-center justify-center transition-transform active:scale-[0.97] cursor-pointer",
        className
      )}
      {...props}
    />
  );
});
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, onPointerDown, ...props }, ref) => {
  const isAppleShop = isShoppingPortalActive();
  return (
    <AlertDialogPrimitive.Cancel
      ref={ref}
      onPointerDown={(e) => {
        triggerHaptic("light");
        onPointerDown?.(e);
      }}
      className={cn(
        isAppleShop ? "ds-apple-btn-secondary" : "ds-liquid-btn-secondary",
        "w-full min-h-[48px] px-5 rounded-full text-[15px] font-semibold tracking-[-0.01em] flex items-center justify-center transition-transform active:scale-[0.97] cursor-pointer mt-0",
        className
      )}
      {...props}
    />
  );
});
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

const AlertDialogClose = AlertDialogPrimitive.Cancel;

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogClose,
};
