"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"

import { cn } from "../../lib/utils"

export interface LogoItem {
  /** The label text displayed next to the icon */
  label: string
  /** The icon name from the Icons object */
  icon: React.ReactNode
  /** Animation delay in seconds (use negative values for staggered effect) */
  animationDelay: number
  /** Animation duration in seconds */
  animationDuration: number
  /** The row number where this logo should appear (1-based) */
  row: number
}

export interface LogoTimelineProps {
  /** Array of logo items to display */
  items: LogoItem[]
  /** Optional title text to display in the center */
  title?: string
  /** Height of the timeline container */
  height?: string
  /** Additional className for the container */
  className?: string
  /** Icon size in pixels (default: 16) */
  iconSize?: number
  /** Whether to show separator lines between rows (default: true) */
  showRowSeparator?: boolean
  /** Whether to animate logos only on hover (default: false) */
  animateOnHover?: boolean
}

export function LogoTimeline({
  items,
  title,
  height = "h-[400px] sm:h-[800px]",
  className,
  iconSize = 16,
  showRowSeparator = true,
  animateOnHover = false,
}: LogoTimelineProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Group items by row
  const rowsMap = new Map<number, LogoItem[]>()
  items.forEach((item) => {
    if (!rowsMap.has(item.row)) {
      rowsMap.set(item.row, [])
    }
    rowsMap.get(item.row)?.push(item)
  })

  // Convert map to sorted array
  const rows = Array.from(rowsMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, rowItems]) => rowItems)

  return (
    <section className={cn("w-full py-6 overflow-hidden", className)}>
      <style>{`
        @keyframes marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-marquee-left {
          animation: marquee-left var(--duration, 30s) linear infinite;
        }
        .animate-marquee-right {
          animation: marquee-right var(--duration, 30s) linear infinite;
        }
      `}</style>
      
      {title && (
        <div className="flex justify-between items-center mb-4">
          <h2
            className="text-[20px] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight"
            style={{ fontFamily: "'Comfortaa', cursive", letterSpacing: "-0.02em" }}
          >
            {title}
          </h2>
        </div>
      )}

      <div className="flex flex-col gap-3.5">
        {rows.map((rowItems, rowIndex) => {
          if (rowItems.length === 0) return null;
          // Triple or quadruple items to ensure they fill the screen and loop seamlessly
          const duplicatedItems = [...rowItems, ...rowItems, ...rowItems, ...rowItems];
          const isEven = rowIndex % 2 === 0;
          const animationClass = isEven ? "animate-marquee-left" : "animate-marquee-right";
          
          return (
            <div 
              key={rowIndex} 
              className="relative w-full overflow-hidden select-none py-1"
              onMouseEnter={() => animateOnHover && setIsHovered(true)}
              onMouseLeave={() => animateOnHover && setIsHovered(false)}
            >
              <div 
                className={cn("flex gap-3 w-max flex-nowrap", animationClass)}
                style={{
                  "--duration": "25s",
                  animationPlayState: animateOnHover && !isHovered ? "paused" : "running",
                } as React.CSSProperties}
              >
                {duplicatedItems.map((logo, logoIdx) => (
                  <div
                    key={`${rowIndex}-${logo.label}-${logoIdx}`}
                    className={cn(
                      "flex items-center gap-2.5 px-4 py-2 whitespace-nowrap rounded-full shadow-sm border transition-colors shrink-0 max-w-full",
                      "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200",
                      "border-zinc-200/80 dark:border-zinc-800/80 hover:border-violet-500 dark:hover:border-violet-500/80"
                    )}
                  >
                    {logo.icon}
                    <span className="text-xs md:text-sm font-semibold truncate">
                      {logo.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
