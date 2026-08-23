import React from "react";

// Official ZAMCOPS wordmark — transparent PNG, no chip or card behind it.
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
  return (
    <div className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/zamcops-logo-mark.png"
        alt="ZAMCOPS — Zambian Music Copyright Protection Society"
        width={Math.round(size * (488 / 122))}
        height={size}
        style={{ height: size, width: "auto" }}
        className={onDark ? "drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]" : undefined}
        draggable={false}
        decoding="async"
      />
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
