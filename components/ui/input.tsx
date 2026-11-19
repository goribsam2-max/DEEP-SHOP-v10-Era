import * as React from "react"

import { cn } from "../../lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "ds-apple-input flex h-11 w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.12] bg-[#F2F2F7] dark:bg-[#2C2C2E] px-4 py-2.5 text-[15px] text-[#1D1D1F] dark:text-[#F5F5F7] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#86868B] dark:placeholder:text-[#8E8E93] focus-visible:outline-none focus-visible:bg-white dark:focus-visible:bg-[#1C1C1E] focus-visible:border-[#0071E3] dark:focus-visible:border-[#0A84FF] focus-visible:ring-3 focus-visible:ring-[#0071E3]/16 dark:focus-visible:ring-[#0A84FF]/24 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
