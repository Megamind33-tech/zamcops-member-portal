import React from "react";

// Cohesive, palette-matched spot illustrations for empty states. Hand-built
// SVG (license-free) so empty screens feel designed rather than blank.

type Name = "vinyl" | "waveform" | "royalty" | "inbox" | "upload" | "works";

export function Illustration({ name, size = 132 }: { name: Name; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 200 200", fill: "none" as const };
  return (
    <svg {...common} role="img" aria-hidden>
      <defs>
        <linearGradient id="il-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5460f8" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="il-b" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#f63d8b" />
          <stop offset="100%" stopColor="#ffc24d" />
        </linearGradient>
        <radialGradient id="il-glow" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor="rgba(139,92,246,0.35)" />
          <stop offset="100%" stopColor="rgba(139,92,246,0)" />
        </radialGradient>
      </defs>

      <circle cx="100" cy="92" r="78" fill="url(#il-glow)" />

      {name === "vinyl" && (
        <g>
          <circle cx="100" cy="96" r="60" fill="#141627" stroke="url(#il-a)" strokeWidth="2" />
          <circle cx="100" cy="96" r="48" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
          <circle cx="100" cy="96" r="38" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
          <circle cx="100" cy="96" r="20" fill="url(#il-b)" />
          <circle cx="100" cy="96" r="5" fill="#141627" />
        </g>
      )}

      {name === "waveform" && (
        <g strokeLinecap="round">
          {Array.from({ length: 15 }).map((_, i) => {
            const x = 38 + i * 9.2;
            const h = [22, 40, 64, 34, 78, 48, 90, 56, 86, 40, 70, 30, 58, 38, 24][i];
            return (
              <line
                key={i}
                x1={x}
                y1={96 - h / 2}
                x2={x}
                y2={96 + h / 2}
                stroke={i % 2 ? "url(#il-b)" : "url(#il-a)"}
                strokeWidth="6"
              />
            );
          })}
        </g>
      )}

      {name === "royalty" && (
        <g>
          <rect x="44" y="118" width="24" height="34" rx="5" fill="url(#il-a)" />
          <rect x="80" y="92" width="24" height="60" rx="5" fill="url(#il-a)" />
          <rect x="116" y="70" width="24" height="82" rx="5" fill="url(#il-b)" />
          <path d="M44 100 L92 78 L128 56 L150 44" stroke="#ffc24d" strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="150" cy="44" r="7" fill="#ffc24d" />
        </g>
      )}

      {name === "inbox" && (
        <g>
          <rect x="50" y="70" width="100" height="64" rx="12" fill="#141627" stroke="url(#il-a)" strokeWidth="2" />
          <path d="M50 92 h28 l8 14 h28 l8-14 h28" fill="none" stroke="url(#il-a)" strokeWidth="2" />
          <circle cx="140" cy="68" r="12" fill="url(#il-b)" />
        </g>
      )}

      {name === "upload" && (
        <g>
          <rect x="52" y="104" width="96" height="44" rx="12" fill="#141627" stroke="url(#il-a)" strokeWidth="2" />
          <path d="M100 100 V52" stroke="url(#il-b)" strokeWidth="6" strokeLinecap="round" />
          <path d="M80 72 L100 50 L120 72" stroke="url(#il-b)" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}

      {name === "works" && (
        <g>
          <rect x="58" y="58" width="84" height="84" rx="16" fill="#141627" stroke="url(#il-a)" strokeWidth="2" />
          <circle cx="92" cy="118" r="11" fill="url(#il-b)" />
          <path d="M103 118 V74 l28-7 v40" stroke="url(#il-a)" strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="120" cy="111" r="11" fill="url(#il-a)" />
        </g>
      )}
    </svg>
  );
}
