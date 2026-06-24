import React from "react";

// Official ZAMCOPS brand colours.
const ORANGE = "#F26C21";
const RED = "#E2342B";
const GREEN = "#2BA45A";

// The vinyl-record "O" used in the wordmark and as the standalone app mark.
export function LogoMark({
  size = 32,
  swoosh = false,
  className,
}: {
  size?: number;
  swoosh?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="ZAMCOPS"
    >
      {/* record body */}
      <circle cx="50" cy="50" r="46" fill={ORANGE} />
      <circle cx="50" cy="50" r="37" fill="none" stroke="#fff" strokeWidth="2" opacity="0.45" />
      <circle cx="50" cy="50" r="24" fill="#fff" />
      <circle cx="50" cy="50" r="12" fill={ORANGE} />
      <circle cx="50" cy="50" r="4" fill="#fff" />
      {/* Zambian-flag swoosh trailing the disc */}
      {swoosh && (
        <g fill="none" strokeLinecap="round">
          <path d="M70 70 q22 6 28 -6" stroke={ORANGE} strokeWidth="6" />
          <path d="M68 80 q24 8 32 -4" stroke={RED} strokeWidth="5" />
          <path d="M66 89 q26 9 34 -1" stroke={GREEN} strokeWidth="4" />
        </g>
      )}
    </svg>
  );
}

const TAGLINE: { word: string; color?: string }[] = [
  { word: "ZAMBIAN" },
  { word: "MUSIC", color: ORANGE },
  { word: "COPYRIGHT", color: RED },
  { word: "PROTECTION" },
  { word: "SOCIETY", color: GREEN },
];

// Full lockup: ZAMC●PS wordmark + (tagline | subtitle).
// `onDark` controls the neutral colours so it reads on dark or light surfaces.
export function Logo({
  size = 34,
  withText = true,
  onDark = true,
  subtitle,
  tagline = true,
}: {
  size?: number;
  withText?: boolean;
  onDark?: boolean;
  subtitle?: string;
  tagline?: boolean;
}) {
  const neutral = onDark ? "#ffffff" : "#161c2b";
  const disc = Math.round(size * 0.92);

  if (!withText) return <LogoMark size={size} swoosh />;

  return (
    <div className="flex items-center gap-2.5">
      {/* Wordmark with the vinyl O */}
      <div
        className="flex items-center font-display font-extrabold leading-none tracking-[-0.02em]"
        style={{ fontSize: size, color: ORANGE }}
      >
        <span>ZAMC</span>
        <LogoMark size={disc} className="mx-[0.02em]" />
        <span>PS</span>
      </div>

      {subtitle !== undefined ? (
        <span
          className="ml-0.5 self-stretch border-l pl-2.5 text-[10px] font-bold uppercase leading-tight tracking-[0.16em]"
          style={{ color: onDark ? "#cfd4e2" : "#5b6577", borderColor: onDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)" }}
        >
          {subtitle.split(" ").map((w, i) => (
            <span key={i} className="block">
              {w}
            </span>
          ))}
        </span>
      ) : (
        tagline && (
          <span
            className="hidden flex-wrap gap-x-[0.32em] text-[8px] font-extrabold uppercase tracking-[0.08em] sm:flex"
            style={{ maxWidth: size * 6 }}
          >
            {TAGLINE.map((t) => (
              <span key={t.word} style={{ color: t.color ?? neutral }}>
                {t.word}
              </span>
            ))}
          </span>
        )
      )}
    </div>
  );
}
