import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

import { triggerHaptic } from "../../lib/haptics";

const buttonVariants = cva(
  "inline-flex items-center justify-center max-w-full whitespace-nowrap overflow-hidden text-ellipsis rounded-full text-sm font-semibold tracking-tight transition-all duration-150 outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0071E3]/70 dark:focus-visible:outline-[#0A84FF]/70 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[#0071E3] text-white hover:bg-[#0077ED] dark:bg-[#0A84FF] dark:hover:bg-[#1E8FFF] shadow-[0_2px_10px_-2px_rgba(0,113,227,0.34)]",
        destructive:
          "bg-[#FF3B30] text-white hover:bg-[#E0352B] dark:bg-[#FF453A] dark:hover:bg-[#FF584E] shadow-[0_2px_10px_-2px_rgba(255,59,48,0.28)]",
        outline:
          "border border-black/[0.12] dark:border-white/[0.16] bg-transparent text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]",
        secondary:
          "bg-[#E8E8ED] text-[#1D1D1F] hover:bg-[#DCDCE2] dark:bg-[#2C2C2E] dark:text-[#F5F5F7] dark:hover:bg-[#3A3A3C]",
        ghost:
          "hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[#1D1D1F] dark:text-[#F5F5F7]",
        link: "text-[#0071E3] dark:text-[#0A84FF] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 text-[14px]",
        sm: "h-9 rounded-full px-3.5 text-xs",
        lg: "h-11 rounded-full px-6 text-[15px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onPointerDown, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onPointerDown={(e: React.PointerEvent<HTMLButtonElement>) => {
          triggerHaptic("light");
          onPointerDown?.(e);
        }}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
