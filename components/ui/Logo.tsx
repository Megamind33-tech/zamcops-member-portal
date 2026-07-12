import React from "react";

// The official ZAMCOPS logo, served from a trimmed, transparent-background
// cut of the artwork so it fills its box and sits directly on any light
// surface. Call sites that place it on a dark surface get a compact white
// chip behind it (set `onDark`) so the tagline stays legible.
// `subtitle` (e.g. "Staff Console") renders alongside for the admin console.
export function Logo({
  size = 34,
  onDark = true,
  subtitle,
}: {
  /** rendered height of the artwork in px */
  size?: number;
  /** kept for call-site compatibility */
  withText?: boolean;
  onDark?: boolean;
  subtitle?: string;
  tagline?: boolean;
}) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/zamcops-logo-mark.png"
      alt="ZAMCOPS — Zambian Music Copyright Protection Society"
      style={{ height: size, width: "auto" }}
      draggable={false}
    />
  );

  return (
    <div className="flex items-center gap-2.5">
      {onDark ? (
        <span className="inline-flex items-center rounded-lg bg-white px-2 py-1.5 shadow-sm">{img}</span>
      ) : (
        img
      )}
      {subtitle !== undefined && (
        <span
          className="flex flex-col justify-center self-stretch border-l pl-2.5 text-[10px] font-bold uppercase leading-tight tracking-[0.16em]"
          style={{
            color: onDark ? "#cfd4e2" : "#5b6577",
            borderColor: onDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)",
          }}
        >
          {subtitle.split(" ").map((w, i) => (
            <span key={i} className="block">
              {w}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
