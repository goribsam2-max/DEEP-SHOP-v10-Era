import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-x-1.5 rounded-full bg-white dark:bg-[#2C2C2E] px-2.5 py-1 text-[11px] font-semibold tracking-[-0.005em] whitespace-nowrap border border-black/[0.08] dark:border-white/[0.12] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:ring-offset-1",
  {
    variants: {
      variant: {
        default:
          "text-[#1D1D1F] dark:text-[#F5F5F7]",
        secondary:
          "text-[#6E6E73] dark:text-[#98989D] bg-[#F2F2F7] dark:bg-[#2C2C2E]",
        destructive:
          "text-[#D70015] dark:text-[#FF453A] bg-[#FF3B30]/10 dark:bg-[#FF453A]/15 border-[#FF3B30]/20",
        outline: "text-[#1D1D1F] dark:text-[#F5F5F7] bg-transparent",
      },
      size: {
        default: "",
        sm: "px-2 py-0.5 text-[10px]",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
