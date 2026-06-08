import React from "react";
import { cn } from "@/lib/format";

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-brand-100/70 ring-1 ring-inset ring-brand-100",
        className
      )}
    >
      <div
        className="relative h-full rounded-full bg-gradient-to-r from-gold-400 via-gold-500 to-brand-500 shadow-glow transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      >
        <span className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)] opacity-70" />
      </div>
    </div>
  );
}

export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 px-1">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold-600">Section</p>
        <h2 className="font-display text-lg font-semibold tracking-tight text-brand-900">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card relative flex flex-col items-center overflow-hidden px-6 py-10 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(31,79,126,0.08),transparent_45%)]" />
      {icon && (
        <div className="relative mb-4 grid h-14 w-14 place-items-center rounded-[1.25rem] bg-gradient-to-br from-brand-50 to-white text-brand-600 ring-1 ring-brand-100">
          {icon}
        </div>
      )}
      <p className="relative text-sm font-semibold text-brand-900">{title}</p>
      <p className="relative mt-1 max-w-xs text-xs text-slate-500">{message}</p>
      {action && <div className="relative mt-5">{action}</div>}
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold text-brand-900">{value || "—"}</span>
    </div>
  );
}
