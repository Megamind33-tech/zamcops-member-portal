import React from "react";

// The official ZAMCOPS logo. The artwork has a white background, so it sits in
// a subtle white plaque to read cleanly on the app's dark surfaces.
// `subtitle` (e.g. "Staff Console") renders alongside for the admin console.
export function Logo({
  size = 34,
  onDark = true,
  subtitle,
}: {
  size?: number;
  /** kept for call-site compatibility */
  withText?: boolean;
  onDark?: boolean;
  subtitle?: string;
  tagline?: boolean;
}) {
  const h = Math.round(size * 1.45);
  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-flex items-center rounded-lg bg-white px-2 py-1 ring-1 ring-black/5 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/zamcops-logo.png" alt="ZAMCOPS — Zambian Music Copyright Protection Society" style={{ height: h, width: "auto" }} />
      </span>
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
