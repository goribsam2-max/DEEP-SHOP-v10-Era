import React from "react";
import { Spinner } from "@/components/ui/spinner-1";
import clsx from "clsx";
import { triggerHaptic } from "../../lib/haptics";

const sizes = [
  {
    tiny: "px-2.5 h-7 text-xs",
    small: "px-3 h-9 text-xs",
    medium: "px-4 h-10 text-sm",
    large: "px-5 h-12 text-[15px]"
  },
  {
    tiny: "w-7 h-7 text-xs",
    small: "w-9 h-9 text-xs",
    medium: "w-10 h-10 text-sm",
    large: "w-12 h-12 text-[15px]"
  }
];

const types = {
  primary: "bg-[#0071E3] hover:bg-[#0077ED] dark:bg-[#0A84FF] dark:hover:bg-[#1E8FFF] text-white fill-white shadow-[0_2px_10px_-2px_rgba(0,113,227,0.34)]",
  secondary: "bg-[#E8E8ED] hover:bg-[#DCDCE2] dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] fill-current border border-black/[0.06] dark:border-white/[0.1]",
  tertiary: "bg-transparent hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[#1D1D1F] dark:text-[#F5F5F7] fill-current",
  error: "bg-[#FF3B30] hover:bg-[#E0352B] dark:bg-[#FF453A] dark:hover:bg-[#FF584E] text-white fill-white",
  warning: "bg-[#FF9500] hover:bg-[#E68600] dark:bg-[#FF9F0A] text-white fill-white"
};

const shapes = {
  square: {
    tiny: "rounded-lg",
    small: "rounded-xl",
    medium: "rounded-xl",
    large: "rounded-2xl"
  },
  circle: {
    tiny: "rounded-full",
    small: "rounded-full",
    medium: "rounded-full",
    large: "rounded-full"
  },
  rounded: {
    tiny: "rounded-full",
    small: "rounded-full",
    medium: "rounded-full",
    large: "rounded-full"
  }
};

export interface ButtonProps {
  size?: keyof typeof sizes[0];
  type?: keyof typeof types;
  variant?: "styled" | "unstyled";
  shape?: keyof typeof shapes;
  svgOnly?: boolean;
  children?: React.ReactNode;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  shadow?: boolean;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  ref?: React.Ref<HTMLButtonElement>;
  className?: string;
}

export const Button = ({
  size = "medium",
  type = "primary",
  variant = "styled",
  shape = "rounded",
  svgOnly = false,
  children,
  prefix,
  suffix,
  shadow = false,
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  ref,
  className,
  ...rest
}: ButtonProps) => {
  return (
    <button
      ref={ref}
      type={(rest as any).type || "button"}
      disabled={disabled}
      onPointerDown={() => {
        if (!disabled && !loading) triggerHaptic("light");
      }}
      onClick={onClick}
      tabIndex={0}
      className={clsx(
        "inline-flex justify-center items-center gap-1 max-w-full font-semibold tracking-tight transition-all duration-150 active:scale-[0.97] cursor-pointer",
        sizes[+svgOnly][size],
        (disabled || loading) ? "bg-black/[0.06] dark:bg-white/[0.08] text-[#86868B] border border-black/[0.06] dark:border-white/[0.08] cursor-not-allowed active:scale-100" : types[type],
        shapes[shape][size],
        shadow && "shadow-sm",
        fullWidth && "w-full",
        variant === "unstyled" ? "outline-none px-0 h-fit bg-transparent hover:bg-transparent text-[#1D1D1F] dark:text-[#F5F5F7] shadow-none" : "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]/60 dark:focus-visible:ring-[#0A84FF]/60",
        className
      )}
      {...rest}
    >
      {loading
        ? <Spinner size={size === "large" ? 20 : 16} />
        : prefix
      }
      {children != null && (
        <span className={clsx(
          "relative overflow-hidden whitespace-nowrap text-ellipsis mb-0",
          size !== "tiny" && variant !== "unstyled" && "px-1"
        )}>
          {children}
        </span>
      )}
      {!loading && suffix}
    </button>
  );
};
