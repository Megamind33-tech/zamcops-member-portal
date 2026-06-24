import React from "react";
import { twMerge } from "tailwind-merge";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "bg-zam-orange text-white hover:bg-zam-orange-dark border border-transparent shadow-sm",
  secondary: "bg-white text-zam-ink hover:bg-zam-canvas border border-zam-line shadow-sm",
  ghost: "bg-transparent text-zam-muted hover:bg-zam-canvas hover:text-zam-ink border border-transparent",
  danger: "bg-zam-red text-white hover:bg-red-600 border border-transparent shadow-sm",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={twMerge(
        "inline-flex items-center justify-center rounded-xl font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zam-orange/40 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
