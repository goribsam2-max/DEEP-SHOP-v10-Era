"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "../../lib/utils"
import { triggerToggleHaptic } from "../../lib/haptics"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, onClick, ...props }, ref) => (
  <SwitchPrimitives.Root
    data-haptic="toggle"
    onClick={(e) => {
      triggerToggleHaptic();
      onClick?.(e);
    }}
    className={cn(
      "peer inline-flex h-[30px] w-[50px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] dark:focus-visible:ring-[#0A84FF] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[#34C759] dark:data-[state=checked]:bg-[#30D158] data-[state=unchecked]:bg-[#E5E5EA] dark:data-[state=unchecked]:bg-[#39393D]",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-[26px] w-[26px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.18),0_1px_1px_rgba(0,0,0,0.08)] ring-0 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
