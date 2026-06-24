import React from "react";
import { twMerge } from "tailwind-merge";

type Tone = "green" | "amber" | "blue" | "red" | "gray" | "orange";

const toneMap: Record<Tone, { dot: string; bg: string; text: string }> = {
  green: { dot: "bg-zam-green", bg: "bg-zam-green-soft", text: "text-zam-green" },
  amber: { dot: "bg-zam-amber", bg: "bg-zam-amber-soft", text: "text-[#B8791A]" },
  blue: { dot: "bg-zam-blue", bg: "bg-zam-blue-soft", text: "text-zam-blue" },
  red: { dot: "bg-zam-red", bg: "bg-red-50", text: "text-zam-red" },
  gray: { dot: "bg-zam-muted", bg: "bg-zam-canvas", text: "text-zam-muted" },
  orange: { dot: "bg-zam-orange", bg: "bg-zam-orange-soft", text: "text-zam-orange-dark" },
};

export function statusTone(status: string): Tone {
  const s = status.toLowerCase();
  if (["approved", "active", "accepted", "published", "paid"].includes(s)) return "green";
  if (["pending", "lapsed", "draft"].includes(s)) return "amber";
  if (["under review", "processing", "in review", "submitted"].includes(s)) return "blue";
  if (["rejected", "suspended", "declined"].includes(s)) return "red";
  return "gray";
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = toneMap[statusTone(status)];
  return (
    <span
      className={twMerge(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        tone.bg,
        tone.text,
        className
      )}
    >
      <span className={twMerge("h-1.5 w-1.5 rounded-full", tone.dot)} />
      {status}
    </span>
  );
}
