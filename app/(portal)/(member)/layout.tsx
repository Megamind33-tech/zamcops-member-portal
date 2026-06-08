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
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-1 flex-col overflow-hidden bg-canvas">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(31,79,126,0.12),transparent_65%)]" />
      <div className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-gold-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-56 h-80 w-80 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="relative z-10 flex-1 pb-4">{children}</div>
      <BottomNav />
    </div>
  );
}
