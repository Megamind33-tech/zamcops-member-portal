import React from "react";
import { cn } from "@/lib/format";

function isImageSrc(src?: string) {
  if (!src) return false;
  return (
    src.startsWith("data:image") ||
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("blob:") ||
    src.startsWith("/")
  );
}

export function CoverArt({
  size = 56,
  rounded = "rounded-2xl",
  className,
  src,
  fill,
}: {
  seed?: string;
  src?: string;
  size?: number;
  rounded?: string;
  className?: string;
  motif?: boolean;
  /** Stretch to the parent box (catalogue sleeves). */
  fill?: boolean;
}) {
  const dim = fill ? undefined : { width: size, height: size };
  const box = fill ? "h-full w-full" : "shrink-0";

  if (isImageSrc(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={cn(box, "object-cover", rounded, className)}
        style={dim}
      />
    );
  }

  // Empty sleeve — a vinyl disc on kraft board, not a generic icon tile.
  return (
    <span
      className={cn(box, "relative inline-grid place-items-center overflow-hidden", rounded, className)}
      style={dim}
      aria-hidden
    >
      <span className="absolute inset-0 bg-[#2c241c]" />
      <span className="absolute inset-[14%] rounded-full border-[9px] border-black/55 bg-[#16110d] shadow-inner" />
      <span className="absolute inset-[40%] rounded-full bg-[#c4a35a]" />
      <span className="absolute inset-[46%] rounded-full bg-[#1a1510]" />
    </span>
  );
}
