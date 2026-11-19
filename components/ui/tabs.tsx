import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "../../lib/utils"

import { triggerHaptic } from "../../lib/haptics"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "ds-apple-segmented inline-flex h-10 items-center justify-center rounded-full bg-black/[0.06] dark:bg-white/[0.1] p-1 text-[#6E6E73] dark:text-[#98989D]",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, onPointerDown, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    onPointerDown={(e) => {
      triggerHaptic("selection")
      onPointerDown?.(e)
    }}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold tracking-tight transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]/60 dark:focus-visible:ring-[#0A84FF]/60 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-[#1D1D1F] data-[state=active]:shadow-xs dark:data-[state=active]:bg-[#3A3A3C] dark:data-[state=active]:text-[#F5F5F7] cursor-pointer",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
