import React from "react";
import { cn } from "@/lib/format";

const map: Record<string, string> = {
  Approved: "bg-emerald-400/12 text-emerald-300 border-emerald-400/20",
  Active: "bg-emerald-400/12 text-emerald-300 border-emerald-400/20",
  Paid: "bg-emerald-400/12 text-emerald-300 border-emerald-400/20",
  Accepted: "bg-emerald-400/12 text-emerald-300 border-emerald-400/20",
  Pending: "bg-gold-400/12 text-gold-300 border-gold-400/20",
  Submitted: "bg-gold-400/12 text-gold-300 border-gold-400/20",
  "Offer sent": "bg-gold-400/12 text-gold-300 border-gold-400/20",
  Processing: "bg-brand-400/14 text-brand-200 border-brand-400/25",
  "Under Review": "bg-brand-400/14 text-brand-200 border-brand-400/25",
  "In review": "bg-brand-400/14 text-brand-200 border-brand-400/25",
  Rejected: "bg-red-400/12 text-red-300 border-red-400/20",
  Suspended: "bg-red-400/12 text-red-300 border-red-400/20",
  Declined: "bg-red-400/12 text-red-300 border-red-400/20",
  Lapsed: "bg-white/[0.06] text-night-300 border-white/10",
  Paused: "bg-white/[0.06] text-night-300 border-white/10",
};

const dot: Record<string, string> = {
  Approved: "bg-emerald-400",
  Active: "bg-emerald-400",
  Paid: "bg-emerald-400",
  Accepted: "bg-emerald-400",
  Pending: "bg-gold-400",
  Submitted: "bg-gold-400",
  "Offer sent": "bg-gold-400",
  Processing: "bg-brand-400",
  "Under Review": "bg-brand-400",
  "In review": "bg-brand-400",
  Rejected: "bg-red-400",
  Suspended: "bg-red-400",
  Declined: "bg-red-400",
  Lapsed: "bg-night-400",
  Paused: "bg-night-400",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        map[status] ?? "bg-white/[0.06] text-night-300 border-white/10",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot[status] ?? "bg-night-400")} />
      {status}
    </span>
  );
}
