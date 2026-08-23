import React from "react";
import { Music2 } from "lucide-react";
import { cn } from "@/lib/format";

function isImageSrc(src?: string) {
  if (!src) return false;
  return src.startsWith("data:image") || src.startsWith("http://") || src.startsWith("https://");
}

export function CoverArt({
  size = 56,
  rounded = "rounded-2xl",
  className,
  src,
}: {
  seed?: string;
  src?: string;
  size?: number;
  rounded?: string;
  className?: string;
  motif?: boolean;
}) {
  if (isImageSrc(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={cn("shrink-0 object-cover", rounded, className)}
        style={{ width: size, height: size }}
      />
    );
  }

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
