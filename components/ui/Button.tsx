import React from "react";
import Link from "next/link";
import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "gold" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "brand-gradient text-white shadow-fab hover:brightness-110 ring-1 ring-white/10",
  gold:
    "bg-gradient-to-r from-gold-400 to-gold-500 text-night-950 shadow-gold hover:from-gold-300 hover:to-gold-400 ring-1 ring-gold-300/30",
  secondary:
    "bg-white/[0.06] text-white border border-white/12 hover:bg-white/[0.1] backdrop-blur",
  ghost: "bg-transparent text-night-200 hover:bg-white/[0.06] hover:text-white",
  danger:
    "bg-red-500/12 text-red-300 hover:bg-red-500/20 border border-red-500/25",
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
