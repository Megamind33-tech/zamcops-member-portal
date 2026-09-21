import React from "react";

// The ZAMCOPS wordmark.
//
// The supplied artwork carries the society's full name baked into it as a
// hairline of type under the letters. At the sizes a logo is actually used —
// 28 to 36px tall in a sidebar or above a sign-in card — that line renders
// about four pixels high and reads as grey noise, which is the single thing
// that made every page look unfinished. The artwork here is the same mark with
// that line lifted out (the flag swoosh is untouched), and the name is set as
// real text beside it when there is room for it.

const ART = "/brand/zamcops-wordmark.png";
const RATIO = 485 / 114; // the trimmed artwork's aspect

export function Logo({
  size = 34,
  onDark = true,
  subtitle,
  withName = false,
}: {
  /** rendered height of the wordmark in px */
  size?: number;
  /** kept for call-site compatibility */
  withText?: boolean;
  onDark?: boolean;
  /** a short label set beside the mark, one word per line */
  subtitle?: string;
  /** set the society's full name under the mark, as live text */
  withName?: boolean;
  tagline?: boolean;
}) {
  const mark = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ART}
      alt="ZAMCOPS — Zambian Music Copyright Protection Society"
      width={Math.round(size * RATIO)}
      height={size}
      style={{ height: size, width: "auto" }}
      className={onDark ? "drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]" : undefined}
      draggable={false}
      decoding="async"
    />
  );

  if (withName) {
    return (
      <div className="flex flex-col items-start gap-1.5">
        {mark}
        <span
          className="block text-[10px] font-semibold uppercase leading-none tracking-[0.2em]"
          style={{ color: onDark ? "rgba(255,255,255,0.62)" : "#6B6158" }}
        >
          Zambian Music Copyright Protection Society
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      {mark}
      {subtitle !== undefined && (
        <span
          className="flex flex-col justify-center self-stretch border-l pl-2.5 text-[10px] font-bold uppercase leading-tight tracking-[0.16em]"
          style={{
            color: onDark ? "rgba(255,255,255,0.7)" : "#6B6158",
            borderColor: onDark ? "rgba(255,255,255,0.18)" : "#E6DDD0",
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
