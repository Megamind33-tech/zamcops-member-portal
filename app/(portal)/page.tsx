"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { Logo } from "@/components/ui/Logo";

export default function SplashScreen() {
  const router = useRouter();
  const { ready, currentMember } = useApp();
  const [tick, setTick] = useState(false);

  // Brief branded splash, then route based on session / onboarding state.
  useEffect(() => {
    const t = setTimeout(() => setTick(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!tick || !ready) return;
    if (currentMember) {
      router.replace("/dashboard");
      return;
    }
    const seen =
      typeof window !== "undefined" && window.localStorage.getItem("zamcops_onboarded");
    router.replace(seen ? "/login" : "/onboarding");
  }, [tick, ready, currentMember, router]);

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-zam-canvas">
      <div className="bg-white rounded-2xl px-5 py-4 inline-flex shadow-card-lg">
        <Logo size={46} onDark={false} />
      </div>

      <div className="zam-flagline w-24 mt-6" />

      <p className="mt-5 text-xs font-bold uppercase tracking-[0.26em] text-zam-muted">
        Member Portal
      </p>

      <div className="mt-8 h-6 w-6 animate-spin rounded-full border-2 border-zam-line border-t-zam-orange" />
    </div>
  );
}
