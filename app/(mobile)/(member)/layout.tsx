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
      <div className="flex flex-1 items-center justify-center">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-1 flex-col bg-canvas">
      <div className="flex-1 pb-4">{children}</div>
      <BottomNav />
    </div>
  );
}
