import React from "react";
import { MANDATE_LINE } from "@/lib/roles";

export function MandateNote({ className }: { className?: string }) {
  return (
    <p className={className ?? "rounded-xl border border-zam-line bg-[#FBF7F0] px-3.5 py-2.5 text-xs leading-relaxed text-zam-muted"}>
      {MANDATE_LINE}
    </p>
  );
}
