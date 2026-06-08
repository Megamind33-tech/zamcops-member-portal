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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(84,96,248,0.22),transparent_68%)]" />
      <div className="pointer-events-none absolute -right-24 top-28 h-72 w-72 rounded-full bg-iris-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-28 top-72 h-80 w-80 rounded-full bg-brand-500/12 blur-3xl" />
      <div className="relative z-10 flex-1 pb-4">{children}</div>
      <BottomNav />
    </div>
  );
}
