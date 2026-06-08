"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { useApp } from "@/lib/store";

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
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-brand-800 via-brand-700 to-brand-600 text-white">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-600/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-gold-500/20 blur-3xl" />

      <div className="z-10 flex flex-col items-center gap-6 animate-scale-in">
        <span className="grid h-24 w-24 place-items-center rounded-[28px] bg-white text-4xl font-black text-brand-700 shadow-2xl ring-8 ring-white/10">
          Z
        </span>
        <div className="text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight">ZAMCOPS</h1>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.28em] text-brand-100">
            Member Portal
          </p>
        </div>
      </div>

      <div className="absolute bottom-12 z-10 flex flex-col items-center gap-3">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        <p className="max-w-[18rem] text-center text-[11px] text-brand-100/90">
          Zambian Music Copyright Protection Society
        </p>
      </div>
    </div>
  );
}
