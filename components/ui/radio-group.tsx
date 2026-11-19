"use client"

import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { Circle } from "lucide-react"

import { cn } from "../../lib/utils"

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn("grid gap-2", className)}
      {...props}
      ref={ref}
    />
  )
})
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

import { triggerHaptic } from "../../lib/haptics"

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, onPointerDown, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      onPointerDown={(e) => {
        triggerHaptic("selection")
        onPointerDown?.(e)
      }}
      className={cn(
        "aspect-square h-5 w-5 rounded-full border border-black/[0.24] dark:border-white/[0.26] text-[#0071E3] dark:text-[#0A84FF] data-[state=checked]:border-[#0071E3] dark:data-[state=checked]:border-[#0A84FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] dark:focus-visible:ring-[#0A84FF] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 active:scale-90 transition-all cursor-pointer",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="h-2.5 w-2.5 fill-current text-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
})
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

export { RadioGroup, RadioGroupItem }
