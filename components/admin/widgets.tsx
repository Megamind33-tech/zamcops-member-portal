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
    brand: "bg-brand-50 text-brand-600",
    gold: "bg-gold-500/10 text-gold-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className={cn("grid h-10 w-10 place-items-center rounded-xl", tones[tone])}>{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
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
    <section className="overflow-hidden rounded-2xl bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle text-sm text-slate-700", className)}>{children}</td>;
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
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
      >
        <Check size={14} /> Approve
      </button>
      <button
        onClick={onReject}
        disabled={disabled}
        className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-40"
      >
        <X size={14} /> Reject
      </button>
    </div>
  );
}
