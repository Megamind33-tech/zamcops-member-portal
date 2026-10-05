"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/format";

// Tab strip in the manner of WIPO Connect's record windows (Main · Detail ·
// Distribution History · Audit). Controlled: the page owns the active tab.
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (k: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("flex flex-wrap gap-0 border-b border-[#c9d0d9]", className)}>
      {tabs.map((t) => {
        const on = t.key === value;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={on}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              "-mb-px border border-b-0 px-4 py-1.5 text-[13px] transition",
              on ? "border-[#c9d0d9] bg-white font-bold text-[#1f4e79]" : "border-transparent text-zam-muted hover:text-[#1f4e79]"
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 rounded-sm bg-[#e6ebf1] px-1.5 text-[11px] text-[#1f4e79]">{t.count.toLocaleString()}</span>}
          </button>
        );
      })}
    </div>
  );
}

// "Showing 1 to 50 of 100,598 entries" with Previous / Next, like the grids in
// WIPO Connect. `page` is 1-based.
export function Pager({
  page,
  pageSize,
  total,
  onPage,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  className?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn = "grid h-7 w-7 place-items-center border border-[#bfc5ce] bg-white text-[#1f4e79] disabled:opacity-40";
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 text-xs text-zam-muted", className)}>
      <span>
        Showing {from.toLocaleString()} to {to.toLocaleString()} of {total.toLocaleString()} entries
      </span>
      <span className="flex items-center gap-1">
        <button type="button" className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft size={14} />
        </button>
        <span className="px-2">
          Page {page.toLocaleString()} of {pages.toLocaleString()}
        </span>
        <button type="button" className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight size={14} />
        </button>
      </span>
    </div>
  );
}

// A label / value pair for read-only record fields.
export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[11px] font-semibold text-zam-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-[13px] text-zam-ink">{children || "—"}</dd>
    </div>
  );
}
