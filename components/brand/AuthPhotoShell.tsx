import React from "react";
import { Logo } from "@/components/ui/Logo";

/**
 * Full-bleed photographic auth layout — concert/studio photography with a
 * cream paper card for the form. Used on sign-in, register, and password reset.
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
    <div className="relative min-h-[100dvh] bg-[#1a1612]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />

      <div className="relative z-10 mx-auto grid min-h-[100dvh] max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2 lg:px-10">
        <div className="hidden text-white lg:block">
          <div className="inline-flex rounded-2xl bg-white px-4 py-3 shadow-card-lg">
            <Logo size={30} onDark={false} />
          </div>
          <p className="mt-10 text-xs font-bold uppercase tracking-[0.22em] text-zam-orange">{kicker}</p>
          {headline && (
            <h2 className="mt-3 max-w-md font-display text-4xl font-semibold leading-[1.15]">{headline}</h2>
          )}
          {body && <p className="mt-4 max-w-md text-base leading-relaxed text-white/80">{body}</p>}
          <p className="mt-16 text-[11px] text-white/45">Photography from Unsplash · ZAMCOPS member portal</p>
        </div>

        <div className={`mx-auto w-full ${wide ? "max-w-xl" : "max-w-md"}`}>
          <div className="mb-6 flex justify-center lg:hidden">
            <div className="inline-flex rounded-2xl bg-white px-4 py-3 shadow-card-lg">
              <Logo size={30} onDark={false} />
            </div>
          </div>
          <div className="rounded-3xl border border-white/20 bg-[#FBF7F0]/95 p-6 shadow-[0_28px_70px_rgba(0,0,0,0.4)] sm:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
