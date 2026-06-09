"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { BottomNav } from "@/components/mobile/BottomNav";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const { ready, currentMember } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (ready && !currentMember) router.replace("/login");
  }, [ready, currentMember, router]);

  if (!ready || !currentMember) {
    return (
      <div className="flex min-h-[100dvh] flex-1 items-center justify-center bg-canvas">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-brand-400" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-1 flex-col overflow-hidden">
      {/* Primary hero halo — brand indigo dome behind the topbar/balance area */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_110%_60%_at_50%_-10%,rgba(84,96,248,0.26),transparent_68%)]" />
      {/* Iris violet sparkle — top-right corner energy */}
      <div className="pointer-events-none absolute -right-20 top-24 h-64 w-64 rounded-full bg-iris-500/[0.14] blur-3xl" />
      {/* Brand mid-left ambient depth */}
      <div className="pointer-events-none absolute -left-24 top-80 h-72 w-72 rounded-full bg-brand-500/[0.10] blur-3xl" />
      {/* Warm amber stage glow — bottom-right, evokes royalty/stage-light warmth */}
      <div className="pointer-events-none absolute -bottom-16 right-0 h-56 w-56 rounded-full bg-gold-500/[0.08] blur-3xl" />
      <div className="relative z-10 flex-1 pb-4">{children}</div>
      <BottomNav />
    </div>
  );
}
