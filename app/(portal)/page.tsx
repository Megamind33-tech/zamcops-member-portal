"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-night-950 text-white">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-600/40 blur-[90px]" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-iris-500/35 blur-[90px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-500/10 blur-[80px]" />

      <div className="z-10 flex flex-col items-center gap-7 animate-scale-in">
        <span className="relative grid h-24 w-24 place-items-center overflow-hidden rounded-[30px] brand-gradient text-5xl font-black text-white shadow-fab ring-1 ring-white/20">
          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.45),transparent_45%)]" />
          <span className="relative">Z</span>
        </span>
        <div className="text-center">
          <h1 className="font-display text-[2.4rem] font-bold tracking-tight">ZAMCOPS</h1>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.32em] text-brand-300">
            Member Portal
          </p>
        </div>

        {/* Equalizer — a little motion to signal "music". */}
        <div className="flex h-8 items-end gap-1.5">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <span
              key={i}
              className="w-1.5 origin-bottom rounded-full bg-gradient-to-t from-brand-500 to-iris-400 animate-equalize"
              style={{ height: "100%", animationDelay: `${i * 0.12}s`, animationDuration: `${0.9 + (i % 3) * 0.25}s` }}
            />
          ))}
        </div>
      </div>

      <div className="absolute bottom-12 z-10 flex flex-col items-center gap-3">
        <p className="max-w-[18rem] text-center text-[11px] text-night-300">
          Zambian Music Copyright Protection Society
        </p>
      </div>
    </div>
  );
}
