import React from "react";

interface SpinnerProps {
  size?: number;
  color?: string;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 20, className = "" }) => {
  const sizeClass =
    size >= 32
      ? "w-20 h-4 rounded-full"
      : size >= 22
      ? "w-14 h-3.5 rounded-full"
      : "w-9 h-3 rounded-full";
  return (
    <span
      aria-hidden="true"
      className={`inline-block ds-skeleton align-middle ${sizeClass} ${className}`}
    />
  );
};
