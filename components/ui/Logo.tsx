import React from "react";

export function Logo({
  size = 36,
  withText = true,
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
        className="relative grid shrink-0 place-items-center overflow-hidden rounded-[0.85rem] brand-gradient font-black text-white shadow-fab ring-1 ring-white/20"
        style={{ width: size, height: size, fontSize: size * 0.44 }}
        aria-hidden
      >
        <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.4),transparent_45%)]" />
        <span className="relative">Z</span>
      </span>
      {withText && (
        <span className="leading-tight">
          <span className="block font-display text-[0.98rem] font-bold tracking-[0.14em] text-white">
            ZAMCOPS
          </span>
          <span className="block text-[9px] font-semibold uppercase tracking-[0.22em] text-gold-400">
            {subtitle}
          </span>
        </span>
      )}
    </div>
  );
}
