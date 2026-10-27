import React from "react";
import { cn } from "../../lib/utils";

export const IosSpinner: React.FC<{
  className?: string;
  size?: number;
  color?: string;
}> = ({ className, size = 18 }) => {
  const sizeClass =
    size >= 36
      ? "w-24 h-5 rounded-full"
      : size >= 26
      ? "w-16 h-4 rounded-full"
      : "w-10 h-3.5 rounded-full";
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block ds-skeleton align-middle", sizeClass, className)}
    />
  );
};
