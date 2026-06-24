import React from "react";
import { PhotoBackdrop } from "@/components/media/PhotoBackdrop";
import { Logo } from "@/components/ui/Logo";

type Photo =
  | "auth-mic"
  | "splash-stage"
  | "hero-concert"
  | "piano"
  | "synth"
  | "dj-console"
  | "mpc"
  | "hands";

// The "Music-OS" lock-screen composition shared by every auth/intro screen:
// a full-bleed cinematic photo with content anchored to the bottom over a deep
// scrim. Oversized titles, a glass control cluster, a single solid CTA.
export function AuthScreen({
  photo,
  position,
  badge = true,
  topRight,
  children,
}: {
  photo: Photo;
  position?: string;
  badge?: boolean;
  topRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-black">
      <PhotoBackdrop photo={photo} scrim="strong" position={position} />

      {(badge || topRight) && (
        <div className="relative z-10 flex items-center justify-between px-6 pt-7">
          {badge ? <Logo size={20} onDark tagline={false} /> : <span />}
          {topRight}
        </div>
      )}

      <div className="relative z-10 mt-auto px-6 pb-8 pt-10">{children}</div>
    </div>
  );
}

// A title block for the bottom-anchored content.
export function AuthHeading({
  kicker,
  title,
  sub,
}: {
  kicker?: string;
  title: React.ReactNode;
  sub?: string;
}) {
  return (
    <div>
      {kicker && (
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-accent-400">{kicker}</p>
      )}
      <h1 className="font-display text-[2.7rem] font-bold leading-[0.95] tracking-[-0.03em] text-white">
        {title}
      </h1>
      {sub && <p className="mt-3 max-w-[19rem] text-[15px] leading-relaxed text-white/70">{sub}</p>}
    </div>
  );
}
