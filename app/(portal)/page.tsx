"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { PhotoBackdrop } from "@/components/media/PhotoBackdrop";
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
    <div className="relative flex flex-1 flex-col overflow-hidden bg-black text-white">
      <PhotoBackdrop photo="splash-stage" scrim="strong" position="center" />

      <div className="relative z-10 flex flex-1 flex-col justify-end px-7 pb-16">
        <div className="animate-fade-up">
          <div className="flex items-end gap-1.5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className="w-2 origin-bottom rounded-full bg-accent-500 animate-equalize"
                style={{ height: 28, animationDelay: `${i * 0.12}s`, animationDuration: `${0.9 + (i % 3) * 0.25}s` }}
              />
            ))}
          </div>
          <div className="mt-5">
            <Logo size={46} onDark tagline={false} />
          </div>
          <p className="mt-3 text-[12px] font-bold uppercase tracking-[0.26em] text-white/70">
            Member Portal
          </p>
          <p className="mt-5 max-w-[18rem] text-[13px] leading-relaxed text-white/55">
            Zambian Music Copyright Protection Society
          </p>
        </div>
      </div>
    </div>
  );
}
