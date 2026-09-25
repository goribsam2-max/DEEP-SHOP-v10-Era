import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[#204ecf] text-white hover:bg-[#1940b5] dark:bg-[#3b82f6] dark:hover:bg-[#2563eb] rounded-full shadow-[0_7px_29px_0px_rgba(100,100,111,0.2)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-all font-semibold",
        destructive:
          "bg-red-600 text-white shadow-[0_7px_29px_0px_rgba(239,68,68,0.2)] hover:bg-red-700 dark:bg-red-700 dark:text-white rounded-full transition-all",
        outline:
          "border border-[#989b9f] bg-transparent text-zinc-900 dark:text-zinc-100 hover:border-[#204ecf] hover:text-[#204ecf] dark:hover:border-[#3b82f6] dark:hover:text-[#3b82f6] rounded-full shadow-none transition-all",
        secondary:
          "bg-[#f1f1f0] text-[#08102b] dark:bg-[#2d2d30] dark:text-[#fffdfc] rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.05)] hover:bg-[#e6e6e6] dark:hover:bg-[#3f3f46] transition-all",
        ghost: "hover:bg-[#f1f1f0] hover:text-[#204ecf] dark:hover:bg-[#2d2d30] dark:hover:text-[#3b82f6] text-zinc-900 dark:text-zinc-100 rounded-full transition-all",
        link: "text-[#204ecf] dark:text-[#3b82f6] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-full px-3 text-xs",
        lg: "h-10 rounded-full px-8",
        icon: "h-9 w-9",
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
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
