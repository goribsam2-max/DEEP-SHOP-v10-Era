import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

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
      className={cn(
        "group relative flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left transition-all cursor-pointer",
        "hover:bg-zinc-100/90 dark:hover:bg-zinc-800/70",
        "data-[state=checked]:border-zinc-300 dark:data-[state=checked]:border-zinc-700 data-[state=checked]:bg-white dark:data-[state=checked]:bg-zinc-800/90 data-[state=checked]:shadow-2xs",
        className
      )}
      {...props}
    >
      {/* Numeric Star Label */}
      <div className="flex items-center gap-1 w-11 shrink-0 tabular-nums">
        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
          {stars}
        </span>
        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
      </div>

      {/* Zero-Inline-Style SVG Progress Track */}
      <div className="flex-1 h-2 rounded-full bg-zinc-200/80 dark:bg-zinc-800 overflow-hidden">
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
            className="fill-amber-400 transition-all duration-500"
          />
        </svg>
      </div>

      {/* Percentage & Count */}
      <div className="flex items-center justify-end gap-1.5 w-20 shrink-0 tabular-nums text-xs">
        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
          {percentage}%
        </span>
        <span className="text-zinc-400 dark:text-zinc-500">
          ({count.toLocaleString()})
        </span>
      </div>
    </RadioGroupPrimitive.Item>
  );
});
ReviewFilterItem.displayName = "ReviewFilterItem";

export { ReviewFilterGroup, ReviewFilterItem };
