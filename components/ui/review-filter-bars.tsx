import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "../../lib/haptics";

const ReviewFilterGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root
    ref={ref}
    className={cn("flex flex-col gap-2 w-full", className)}
    {...props}
  />
));
ReviewFilterGroup.displayName = RadioGroupPrimitive.Root.displayName;

const ReviewFilterItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & {
    stars: number;
    count: number;
    total: number;
  }
>(({ className, stars, count, total, ...props }, ref) => {
  const percentage = total <= 0 ? 0 : Math.round((count / total) * 100);

  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      onClick={() => triggerHaptic("selection")}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left transition-all cursor-pointer active:scale-[0.985]",
        "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]",
        "data-[state=checked]:border-[#0071E3]/40 dark:data-[state=checked]:border-[#0A84FF]/45 data-[state=checked]:bg-[#0071E3]/[0.06] dark:data-[state=checked]:bg-[#0A84FF]/[0.12]",
        className
      )}
      {...props}
    >
      {/* Numeric Star Label */}
      <div className="flex items-center gap-1 w-11 shrink-0 tabular-nums">
        <span className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
          {stars}
        </span>
        <Star className="w-3.5 h-3.5 text-[#FF9500] dark:text-[#FF9F0A] fill-[#FF9500] dark:fill-[#FF9F0A] shrink-0" />
      </div>

      {/* Zero-Inline-Style SVG Progress Track */}
      <div className="flex-1 h-2 rounded-full bg-black/[0.08] dark:bg-white/[0.1] overflow-hidden">
        <svg
          viewBox="0 0 100 8"
          preserveAspectRatio="none"
          className="w-full h-full block"
        >
          <rect
            x="0"
            y="0"
            width={percentage}
            height="8"
            rx="4"
            className="fill-[#FF9500] dark:fill-[#FF9F0A] transition-all duration-500"
          />
        </svg>
      </div>

      {/* Percentage & Count */}
      <div className="flex items-center justify-end gap-1.5 w-20 shrink-0 tabular-nums text-xs">
        <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
          {percentage}%
        </span>
        <span className="text-[#6E6E73] dark:text-[#98989D]">
          ({count.toLocaleString()})
        </span>
      </div>
    </RadioGroupPrimitive.Item>
  );
});
ReviewFilterItem.displayName = "ReviewFilterItem";

export { ReviewFilterGroup, ReviewFilterItem };
