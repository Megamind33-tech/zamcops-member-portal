import React from "react";
import { twMerge } from "tailwind-merge";
import { Search as SearchIcon } from "lucide-react";
import { initials } from "@/lib/format";

// ---- Progress bar ----
export function Progress({
  value,
  className,
  tone = "orange",
}: {
  value: number;
  className?: string;
  tone?: "orange" | "green";
}) {
  const color = tone === "green" ? "bg-zam-green" : "bg-zam-orange";
  return (
    <div className={twMerge("h-2 w-full rounded-full bg-zam-line overflow-hidden", className)}>
      <div
        className={twMerge("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// ---- Search input ----
export function SearchInput({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={twMerge("relative", className)}>
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zam-muted" />
      <input
        className="w-full h-10 rounded-xl border border-zam-line bg-white pl-9 pr-3 text-sm text-zam-ink placeholder:text-zam-muted/70 focus:outline-none focus:border-zam-orange focus:ring-2 focus:ring-zam-orange/20"
        {...rest}
      />
    </div>
  );
}

// ---- Avatar ----
export function Avatar({
  name,
  src,
  size = 40,
  className,
}: {
  name: string;
  src?: string;
  size?: number;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={twMerge("rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={twMerge(
        "inline-flex items-center justify-center rounded-full bg-zam-orange-soft text-zam-orange-dark font-display font-semibold",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}

// ---- Empty state ----
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={twMerge("flex flex-col items-center justify-center text-center py-14 px-6", className)}>
      <div className="h-16 w-16 rounded-2xl bg-zam-orange-soft flex items-center justify-center text-zam-orange mb-4">
        {icon}
      </div>
      <h3 className="font-display font-semibold text-zam-ink">{title}</h3>
      {description && <p className="text-sm text-zam-muted mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ---- Skeleton ----
export function Skeleton({ className }: { className?: string }) {
  return <div className={twMerge("animate-pulse rounded-lg bg-zam-line/70", className)} />;
}
