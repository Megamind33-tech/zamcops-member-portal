import React from "react";
import { Music2 } from "lucide-react";
import { cn } from "@/lib/format";

// A clean, real-icon thumbnail used wherever a track / work / file needs a
// visual marker. Replaces the previous generated gradient "album art" — the app
// uses real icons rather than drawn artwork.
export function CoverArt({
  size = 56,
  rounded = "rounded-2xl",
  className,
}: {
  // `seed` is accepted for call-site compatibility but no longer used.
  seed?: string;
  size?: number;
  rounded?: string;
  className?: string;
  motif?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center bg-zam-orange-soft text-zam-orange",
        rounded,
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Music2 size={Math.round(size * 0.5)} />
    </span>
  );
}
