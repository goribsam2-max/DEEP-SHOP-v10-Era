import * as React from "react"

import { cn } from "../../lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "ds-apple-input flex min-h-[92px] w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.12] bg-[#F2F2F7] dark:bg-[#2C2C2E] px-3.5 py-2.5 text-[15px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] dark:focus-visible:ring-[#0A84FF] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
