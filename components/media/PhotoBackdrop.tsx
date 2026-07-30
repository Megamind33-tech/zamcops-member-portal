import React from "react";
import { cn } from "@/lib/format";

// A cinematic photo layer with a dark gradient scrim so foreground text stays
// readable. Sits absolutely inside a `relative` container. Photos live in
// /public/img and are license-free (see public/img/CREDITS.md).

type Photo =
  | "auth-mic"
  | "splash-stage"
  | "hero-concert"
  | "piano"
  | "synth"
  | "dj-console"
  | "mpc"
  | "hands";

export function PhotoBackdrop({
  photo,
  className,
  scrim = "strong",
  position = "center",
}: {
  photo: Photo;
  className?: string;
  scrim?: "strong" | "medium" | "soft";
  position?: string;
}) {
  const scrims: Record<string, string> = {
    strong:
      "bg-[linear-gradient(180deg,rgba(7,8,20,0.55)_0%,rgba(7,8,20,0.82)_55%,rgba(7,8,20,0.97)_100%)]",
    medium:
      "bg-[linear-gradient(180deg,rgba(7,8,20,0.45)_0%,rgba(7,8,20,0.7)_60%,rgba(7,8,20,0.92)_100%)]",
    soft: "bg-[linear-gradient(180deg,rgba(7,8,20,0.3)_0%,rgba(7,8,20,0.55)_70%,rgba(7,8,20,0.8)_100%)]",
  };
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {/* Decorative pre-sized local .webp backdrop — next/image adds nothing here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/img/${photo}.webp`}
        alt=""
        className="h-full w-full object-cover"
        style={{ objectPosition: position }}
        loading="lazy"
        decoding="async"
      />
      <div className={cn("absolute inset-0", scrims[scrim])} />
      {/* faint brand tint to marry the photo to the UI accent */}
      <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(84,96,248,0.22),transparent_70%)] mix-blend-screen" />
    </div>
  );
}
