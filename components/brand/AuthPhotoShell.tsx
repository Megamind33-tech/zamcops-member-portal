import React from "react";
import { Logo } from "@/components/ui/Logo";

/**
 * Full-bleed photographic auth layout. The photo is preloaded and the logo
 * sits on the picture itself — no white card around the mark.
 */
export function AuthPhotoShell({
  src,
  alt,
  kicker = "Member portal",
  headline,
  body,
  wide,
  children,
}: {
  src: string;
  alt: string;
  kicker?: string;
  headline?: string;
  body?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#2a1f18]">
      <link rel="preload" as="image" href={src} />
      <link rel="preload" as="image" href="/brand/zamcops-logo-mark.png" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/20" />

      <div className="relative z-10 mx-auto grid min-h-[100dvh] max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2 lg:px-10">
        <div className="hidden text-white lg:block">
          <Logo size={36} onDark />
          <p className="mt-10 text-xs font-bold uppercase tracking-[0.22em] text-zam-orange">{kicker}</p>
          {headline && (
            <h2 className="mt-3 max-w-md font-display text-4xl font-semibold leading-[1.15]">{headline}</h2>
          )}
          {body && <p className="mt-4 max-w-md text-base leading-relaxed text-white/80">{body}</p>}
        </div>

        <div className={`mx-auto w-full ${wide ? "max-w-xl" : "max-w-md"}`}>
          <div className="mb-6 flex justify-center lg:hidden">
            <Logo size={34} onDark />
          </div>
          <div className="rounded-3xl border border-white/20 bg-[#FBF7F0]/95 p-6 shadow-[0_28px_70px_rgba(0,0,0,0.4)] sm:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
