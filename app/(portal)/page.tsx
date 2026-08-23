"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { Logo } from "@/components/ui/Logo";

export default function SplashScreen() {
  const router = useRouter();
  const { ready, currentMember } = useApp();
  const [tick, setTick] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTick(true), 900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!tick || !ready) return;
    if (currentMember) {
      router.replace("/dashboard");
      return;
    }
    const seen = typeof window !== "undefined" && window.localStorage.getItem("zamcops_onboarded");
    router.replace(seen ? "/login" : "/onboarding");
  }, [tick, ready, currentMember, router]);

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#2a1f18]">
      <link rel="preload" as="image" href="/img/splash-stage.webp" />
      <link rel="preload" as="image" href="/brand/zamcops-logo-mark.png" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/img/splash-stage.webp"
        alt=""
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/25" />

      <div className="relative z-10 flex flex-col items-center">
        <Logo size={48} onDark />
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.26em] text-white/80">Member Portal</p>
        <div className="mt-8 h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-zam-orange" />
      </div>
    </div>
  );
}
