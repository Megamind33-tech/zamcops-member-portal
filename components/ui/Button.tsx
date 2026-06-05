import React from "react";
import Link from "next/link";
import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "gold" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm",
  gold: "bg-gold-500 text-brand-900 hover:bg-gold-600 hover:text-white shadow-sm",
  secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-100",
  ghost: "bg-transparent text-brand-700 hover:bg-brand-50",
  danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-sm",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:opacity-50 disabled:pointer-events-none select-none";

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
