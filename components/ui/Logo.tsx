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
        className="grid shrink-0 place-items-center rounded-xl bg-brand-600 font-black text-white shadow-sm"
        style={{ width: size, height: size, fontSize: size * 0.42 }}
        aria-hidden
      >
        Z
      </span>
      {withText && (
        <span className="leading-tight">
          <span
            className={cn(
              "block text-sm font-extrabold tracking-tight",
              light ? "text-white" : "text-brand-800"
            )}
          >
            ZAMCOPS
          </span>
          <span
            className={cn(
              "block text-[9px] font-bold uppercase tracking-[0.18em]",
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
