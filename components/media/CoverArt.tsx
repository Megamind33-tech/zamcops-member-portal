import React from "react";
import { cn } from "@/lib/format";

// Deterministic, license-free "album art" generated from a seed string so that
// every song / work / album gets its own vibrant cover — the way a real music
// library looks — without shipping any bitmap assets.

const PALETTES: [string, string, string][] = [
  ["#5460f8", "#7338e0", "#8b5cf6"], // indigo → violet
  ["#f63d8b", "#7338e0", "#5460f8"], // magenta → indigo
  ["#f5a623", "#f63d8b", "#7338e0"], // amber → magenta
  ["#1e9e8a", "#3a7bd5", "#5460f8"], // teal → blue
  ["#ff6fae", "#a87dff", "#5460f8"], // pink → violet
  ["#ffc24d", "#ff6fae", "#a87dff"], // gold → pink
  ["#3a47e0", "#8b5cf6", "#f63d8b"], // blue → pink
  ["#8b5cf6", "#5460f8", "#1e9e8a"], // violet → teal
];

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Pulls the same palette the artwork is painted from, so surrounding chrome
// can bleed the cover's colour the way a "now playing" screen recolours itself.
export function coverPalette(seed: string): [string, string, string] {
  return PALETTES[hash(seed || "zamcops") % PALETTES.length];
}

export function coverGlow(seed: string, alpha = 0.32): string {
  const [a] = coverPalette(seed);
  const r = parseInt(a.slice(1, 3), 16);
  const g = parseInt(a.slice(3, 5), 16);
  const b = parseInt(a.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function CoverArt({
  seed,
  size = 56,
  rounded = "rounded-2xl",
  className,
  motif = true,
}: {
  seed: string;
  size?: number;
  rounded?: string;
  className?: string;
  motif?: boolean;
}) {
  const h = hash(seed || "zamcops");
  const [a, b, c] = PALETTES[h % PALETTES.length];
  const angle = (h >> 3) % 360;
  const id = `cv${(h % 100000).toString(36)}`;
  // A little equalizer/soundwave silhouette unique per seed.
  const bars = Array.from({ length: 7 }, (_, i) => 18 + ((h >> (i * 2)) % 64));

  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden", rounded, className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 100 100" width={size} height={size} className="absolute inset-0">
        <defs>
          <linearGradient id={id} gradientTransform={`rotate(${angle} 0.5 0.5)`}>
            <stop offset="0%" stopColor={a} />
            <stop offset="55%" stopColor={b} />
            <stop offset="100%" stopColor={c} />
          </linearGradient>
          <radialGradient id={`${id}h`} cx="28%" cy="22%" r="75%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="45%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill={`url(#${id})`} />
        <rect width="100" height="100" fill={`url(#${id}h)`} />
        {motif && (
          <g opacity="0.9">
            {bars.map((bar, i) => (
              <rect
                key={i}
                x={14 + i * 11}
                y={88 - bar}
                width="6"
                height={bar}
                rx="3"
                fill="rgba(255,255,255,0.85)"
                opacity={0.35 + (i % 3) * 0.18}
              />
            ))}
          </g>
        )}
      </svg>
    </span>
  );
}
