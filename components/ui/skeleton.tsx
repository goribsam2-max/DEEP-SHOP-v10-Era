"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const skeletonVariants = cva("ds-skeleton rounded-2xl", {
  variants: {
    variant: {
      default: "rounded-2xl",
      secondary: "rounded-xl opacity-85",
      text: "rounded-md",
      circle: "rounded-full",
      avatar: "rounded-full",
    },
    size: {
      sm: "h-4",
      default: "h-6",
      lg: "h-8",
      xl: "h-10",
      "2xl": "h-12",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  width?: string | number;
  height?: string | number;
  duration?: number;
  shimmer?: boolean;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, size, width: _w, height: _h, duration: _d, shimmer: _s, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Skeleton.displayName = "Skeleton";

export { Skeleton, skeletonVariants };
