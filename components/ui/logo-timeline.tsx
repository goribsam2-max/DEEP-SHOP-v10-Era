"use client";

import type React from "react";
import { useState } from "react";
import { cn } from "../../lib/utils";

export interface LogoItem {
  label: string;
  icon: React.ReactNode;
  animationDelay: number;
  animationDuration: number;
  row: number;
}

export interface LogoTimelineProps {
  items: LogoItem[];
  title?: string;
  height?: string;
  className?: string;
  iconSize?: number;
  showRowSeparator?: boolean;
  animateOnHover?: boolean;
}

export function LogoTimeline({
  items,
  title,
  className,
  animateOnHover = false,
}: LogoTimelineProps) {
  const [isHovered, setIsHovered] = useState(false);

  const rowsMap = new Map<number, LogoItem[]>();
  items.forEach((item) => {
    if (!rowsMap.has(item.row)) {
      rowsMap.set(item.row, []);
    }
    rowsMap.get(item.row)?.push(item);
  });

  const rows = Array.from(rowsMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, rowItems]) => rowItems);

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
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee-left,
          .animate-marquee-right {
            animation: none !important;
          }
        }
      `}</style>

      {title && (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-5 md:px-12 mb-4">
          <p className="ds-apple-eyebrow ds-apple-muted text-[11px] mb-1">
            Verified Partners
          </p>
          <h2 className="ds-apple-display text-[22px] sm:text-[26px] font-semibold">
            {title}
          </h2>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {rows.map((rowItems, rowIndex) => {
          if (rowItems.length === 0) return null;
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
                style={
                  {
                    "--duration": "28s",
                    animationPlayState:
                      animateOnHover && !isHovered ? "paused" : "running",
                  } as React.CSSProperties
                }
              >
                {duplicatedItems.map((logo, logoIdx) => (
                  <div
                    key={`${rowIndex}-${logo.label}-${logoIdx}`}
                    className="ds-apple-surface flex items-center gap-2.5 px-4 py-2 whitespace-nowrap rounded-full shrink-0 max-w-full"
                  >
                    {logo.icon}
                    <span className="text-xs md:text-sm font-medium truncate">
                      {logo.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
