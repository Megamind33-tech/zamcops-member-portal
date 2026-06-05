import React from "react";
import { cn } from "@/lib/format";

const map: Record<string, string> = {
  Approved: "bg-emerald-50 text-emerald-700",
  Active: "bg-emerald-50 text-emerald-700",
  Paid: "bg-emerald-50 text-emerald-700",
  Pending: "bg-amber-50 text-amber-700",
  Processing: "bg-blue-50 text-blue-700",
  "Under Review": "bg-blue-50 text-blue-700",
  Rejected: "bg-red-50 text-red-600",
  Suspended: "bg-red-50 text-red-600",
  Lapsed: "bg-slate-100 text-slate-600",
};

const dot: Record<string, string> = {
  Approved: "bg-emerald-500",
  Active: "bg-emerald-500",
  Paid: "bg-emerald-500",
  Pending: "bg-amber-500",
  Processing: "bg-blue-500",
  "Under Review": "bg-blue-500",
  Rejected: "bg-red-500",
  Suspended: "bg-red-500",
  Lapsed: "bg-slate-400",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("pill", map[status] ?? "bg-slate-100 text-slate-600", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot[status] ?? "bg-slate-400")} />
      {status}
    </span>
  );
}
