"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "../../lib/utils"

import { triggerHaptic } from "../../lib/haptics"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, onPointerDown, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    onPointerDown={(e) => {
      triggerHaptic("selection")
      onPointerDown?.(e)
    }}
    className={cn(
      "peer h-5 w-5 shrink-0 rounded-md border border-black/[0.22] dark:border-white/[0.24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] dark:focus-visible:ring-[#0A84FF] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[#0071E3] data-[state=checked]:border-[#0071E3] data-[state=checked]:text-white dark:data-[state=checked]:bg-[#0A84FF] dark:data-[state=checked]:border-[#0A84FF] active:scale-90 transition-all cursor-pointer",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center")}
    >
      <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
