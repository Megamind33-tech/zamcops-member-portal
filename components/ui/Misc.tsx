import React from "react";
import { cn } from "@/lib/format";

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}>
      <div
        className="h-full rounded-full bg-gold-500 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
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
    <div className="mb-2 flex items-center justify-between px-1">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h2>
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
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      {icon && (
        <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-brand-800">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-slate-500">{message}</p>
      {action && <div className="mt-4">{action}</div>}
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
