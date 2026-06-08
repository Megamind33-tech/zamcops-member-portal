import React from "react";
import Link from "next/link";
import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "gold" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-brand-600 via-brand-700 to-brand-800 text-white shadow-fab hover:from-brand-500 hover:via-brand-600 hover:to-brand-700",
  gold:
    "bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600 text-brand-900 shadow-glow hover:from-gold-300 hover:via-gold-400 hover:to-gold-500 hover:text-brand-950",
  secondary: "bg-white/90 text-brand-700 border border-brand-100 shadow-sm hover:bg-white",
  ghost: "bg-transparent text-brand-700 hover:bg-brand-50/80",
  danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 shadow-sm",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-sm",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 select-none active:translate-y-px";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  block,
  className,
  children,
  ...rest
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], block && "w-full", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  block,
  className,
  children,
}: CommonProps & { href: string }) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], block && "w-full", className)}
    >
      {children}
    </Link>
  );
}
