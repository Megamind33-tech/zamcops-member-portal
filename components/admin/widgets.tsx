import React from "react";
import { cn } from "@/lib/format";
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
    brand: "bg-zam-orange-soft text-zam-orange",
    gold: "bg-zam-amber/15 text-zam-amber",
    emerald: "bg-zam-green/12 text-zam-green",
    amber: "bg-zam-amber/15 text-zam-amber",
  };
  return (
    <div className="card-lite p-4">
      <div className="flex items-center justify-between">
        <span className={cn("grid h-10 w-10 place-items-center rounded-xl", tones[tone])}>{icon}</span>
      </div>
      <p className="mt-3 font-display text-2xl font-bold text-zam-ink">{value}</p>
      <p className="text-xs text-zam-muted">{label}</p>
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
    <section className="card-lite overflow-hidden">
      <div className="flex items-center justify-between border-b border-zam-line px-5 py-3.5">
        <h2 className="text-sm font-bold text-zam-ink">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zam-muted", className)}>
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
    <td colSpan={colSpan} className={cn("px-4 py-3 align-middle text-sm text-zam-ink", className)}>
      {children}
    </td>
  );
}

// Light status badge for the staff console (the member app keeps the dark
// variant in components/ui/StatusBadge).
const badgeMap: Record<string, string> = {
  Approved: "bg-zam-green/12 text-zam-green ring-zam-green/25",
  Active: "bg-zam-green/12 text-zam-green ring-zam-green/25",
  Paid: "bg-zam-green/12 text-zam-green ring-zam-green/25",
  Accepted: "bg-zam-green/12 text-zam-green ring-zam-green/25",
  Pending: "bg-zam-amber/15 text-[#9a6a00] ring-zam-amber/30",
  Submitted: "bg-zam-amber/15 text-[#9a6a00] ring-zam-amber/30",
  "Offer sent": "bg-zam-amber/15 text-[#9a6a00] ring-zam-amber/30",
  Processing: "bg-zam-blue/12 text-zam-blue ring-zam-blue/25",
  "Under Review": "bg-zam-blue/12 text-zam-blue ring-zam-blue/25",
  "In review": "bg-zam-blue/12 text-zam-blue ring-zam-blue/25",
  Rejected: "bg-zam-red/10 text-zam-red ring-zam-red/25",
  Suspended: "bg-zam-red/10 text-zam-red ring-zam-red/25",
  Declined: "bg-zam-red/10 text-zam-red ring-zam-red/25",
  Lapsed: "bg-zam-canvas text-zam-muted ring-zam-line",
  Paused: "bg-zam-canvas text-zam-muted ring-zam-line",
};

const dotMap: Record<string, string> = {
  Approved: "bg-zam-green",
  Active: "bg-zam-green",
  Paid: "bg-zam-green",
  Accepted: "bg-zam-green",
  Pending: "bg-zam-amber",
  Submitted: "bg-zam-amber",
  "Offer sent": "bg-zam-amber",
  Processing: "bg-zam-blue",
  "Under Review": "bg-zam-blue",
  "In review": "bg-zam-blue",
  Rejected: "bg-zam-red",
  Suspended: "bg-zam-red",
  Declined: "bg-zam-red",
  Lapsed: "bg-zam-muted",
  Paused: "bg-zam-muted",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
        badgeMap[status] ?? "bg-zam-canvas text-zam-muted ring-zam-line",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotMap[status] ?? "bg-zam-muted")} />
      {status}
    </span>
  );
}

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
        className="inline-flex items-center gap-1 rounded-lg bg-zam-green/10 px-2.5 py-1.5 text-xs font-semibold text-zam-green transition hover:bg-zam-green/20 disabled:opacity-40"
      >
        <Check size={14} /> Approve
      </button>
      <button
        onClick={onReject}
        disabled={disabled}
        className="inline-flex items-center gap-1 rounded-lg bg-zam-red/10 px-2.5 py-1.5 text-xs font-semibold text-zam-red transition hover:bg-zam-red/20 disabled:opacity-40"
      >
        <X size={14} /> Reject
      </button>
    </div>
  );
}
