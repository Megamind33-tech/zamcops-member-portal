import React from "react";
import { twMerge } from "tailwind-merge";

interface Chip {
  label: string;
  value: string;
  count?: number;
}

export function FilterChips({
  chips,
  active,
  onChange,
  className,
}: {
  chips: Chip[];
  active: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={twMerge("flex flex-wrap items-center gap-2", className)}>
      {chips.map((c) => {
        const isActive = c.value === active;
        return (
          <button
            key={c.value}
            onClick={() => onChange(c.value)}
            className={twMerge(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 h-9 text-sm font-semibold border transition-colors",
              isActive
                ? "bg-zam-orange text-white border-zam-orange"
                : "bg-white text-zam-muted border-zam-line hover:bg-zam-canvas hover:text-zam-ink"
            )}
          >
            {c.label}
            {typeof c.count === "number" && (
              <span
                className={twMerge(
                  "text-xs rounded-full px-1.5 py-0.5 min-w-[20px]",
                  isActive ? "bg-white/25" : "bg-zam-canvas"
                )}
              >
                {c.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
