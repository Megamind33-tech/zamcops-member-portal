import React from "react";
import { cn } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Check, X } from "lucide-react";

export function AdminStat({
  icon,
  label,
  value,
  tone = "brand",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone?: "brand" | "gold" | "emerald" | "amber";
}) {
  const tones: Record<string, string> = {
    brand: "bg-brand-500/15 text-brand-200 ring-brand-400/20",
    gold: "bg-gold-500/15 text-gold-300 ring-gold-400/20",
    emerald: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20",
    amber: "bg-amber-500/15 text-amber-300 ring-amber-400/20",
  };
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className={cn("grid h-10 w-10 place-items-center rounded-xl ring-1", tones[tone])}>{icon}</span>
      </div>
      <p className="mt-3 font-display text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-night-300">{label}</p>
    </div>
  );
}

export function Panel({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
        <h2 className="text-sm font-bold text-white">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-night-400", className)}>
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={cn("px-4 py-3 align-middle text-sm text-night-200", className)}>
      {children}
    </td>
  );
}

export { StatusBadge };

// Approve / reject controls for a review queue row.
export function ReviewActions({
  onApprove,
  onReject,
  disabled,
}: {
  onApprove: () => void;
  onReject: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2">
      <button
        onClick={onApprove}
        disabled={disabled}
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/12 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-40"
      >
        <Check size={14} /> Approve
      </button>
      <button
        onClick={onReject}
        disabled={disabled}
        className="inline-flex items-center gap-1 rounded-lg bg-red-500/12 px-2.5 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-40"
      >
        <X size={14} /> Reject
      </button>
    </div>
  );
}
