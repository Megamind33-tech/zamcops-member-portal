import React from "react";
import { cn } from "@/lib/format";

export function Logo({
  size = 36,
  withText = true,
  light = false,
  subtitle = "Copyright Society",
}: {
  size?: number;
  withText?: boolean;
  light?: boolean;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 font-black text-white shadow-fab ring-4 ring-white/70"
        style={{ width: size, height: size, fontSize: size * 0.42 }}
        aria-hidden
      >
        Z
      </span>
      {withText && (
        <span className="leading-tight">
          <span
            className={cn(
              "block font-display text-[0.98rem] font-bold tracking-[0.18em]",
              light ? "text-white" : "text-brand-800"
            )}
          >
            ZAMCOPS
          </span>
          <span
            className={cn(
              "block text-[9px] font-semibold uppercase tracking-[0.24em]",
              light ? "text-brand-100" : "text-gold-600"
            )}
          >
            {subtitle}
          </span>
        </span>
      )}
    </div>
  );
}
