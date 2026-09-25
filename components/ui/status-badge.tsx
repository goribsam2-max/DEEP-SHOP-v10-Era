import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import Icon from "../Icon"

const statusBadgeVariants = cva(
  "inline-flex items-center gap-x-2.5 rounded-full bg-[#fffdfc] dark:bg-[#2d2d30] px-3 py-1.5 text-xs font-semibold border border-[#e6e6e6] dark:border-white/15 shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_3px_12px_rgba(0,0,0,0.15)] plusui-pill",
  {
    variants: {
      status: {
        success: "",
        error: "",
        default: "",
      },
    },
    defaultVariants: {
      status: "default",
    },
  }
)

interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  leftIcon?: any
  rightIcon?: any
  leftLabel: string
  rightLabel?: string
}

export function StatusBadge({
  className,
  status,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  leftLabel,
  rightLabel,
  ...props
}: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ status }), className)} {...props}>
      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
        {LeftIcon && (
          typeof LeftIcon === "string" ? (
            <Icon 
              name={LeftIcon}
              className={cn(
                "-ml-0.5 size-4 shrink-0",
                status === "success" && "text-emerald-600 dark:text-emerald-500",
                status === "error" && "text-red-600 dark:text-red-500"
              )} 
            />
          ) : (
            <LeftIcon 
              className={cn(
                "-ml-0.5 size-4 shrink-0",
                status === "success" && "text-emerald-600 dark:text-emerald-500",
                status === "error" && "text-red-600 dark:text-red-500"
              )} 
              aria-hidden={true}
            />
          )
        )}
        {leftLabel}
      </span>
      {rightLabel && (
        <>
          <span className="h-4 w-px bg-border" />
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            {RightIcon && (
              typeof RightIcon === "string" ? (
                <Icon 
                  name={RightIcon} 
                  className="-ml-0.5 size-4 shrink-0" 
                />
              ) : (
                <RightIcon 
                  className="-ml-0.5 size-4 shrink-0" 
                  aria-hidden={true}
                />
              )
            )}
            {rightLabel}
          </span>
        </>
      )}
    </span>
  )
}
