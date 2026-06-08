"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FileMusic, Activity, BarChart3, BadgeCheck, ArrowRight } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";

const slides = [
  {
    icon: FileMusic,
    title: "Register your works",
    body: "Declare your songs, compositions, beats and lyrics so your copyright ownership is recorded and protected.",
  },
  {
    icon: Activity,
    title: "Track your submissions",
    body: "Follow every single, album and work declaration from submission through to review and approval.",
  },
  {
    icon: BarChart3,
    title: "View royalty activity",
    body: "See estimated, pending and paid royalties from radio and broadcast usage of your music across Zambia.",
  },
  {
    icon: BadgeCheck,
    title: "Manage your membership",
    body: "Keep your profile, KYC and payout details up to date and access receipts and statements anytime.",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const slide = slides[i];
  const Icon = slide.icon;
  const last = i === slides.length - 1;

  const finish = () => {
    if (typeof window !== "undefined") window.localStorage.setItem("zamcops_onboarded", "1");
    router.replace("/register");
  };

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden px-4 py-4">
      <div className="pointer-events-none absolute -left-24 top-8 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-4 h-64 w-64 rounded-full bg-gold-400/10 blur-3xl" />

      <div className="card relative z-10 flex flex-1 flex-col px-5 py-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold tracking-tight text-brand-800">ZAMCOPS</span>
          <button onClick={finish} className="text-xs font-semibold text-slate-400 hover:text-brand-600">
            Skip
          </button>
        </div>

        <div key={i} className="flex flex-1 flex-col items-center justify-center text-center animate-fade-up">
          <div className="mb-8 grid h-28 w-28 place-items-center rounded-[2rem] bg-gradient-to-br from-brand-50 to-white text-brand-600 ring-1 ring-brand-100">
            <Icon size={48} strokeWidth={1.8} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold-600">Get started</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-brand-900">
            {slide.title}
          </h2>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500">{slide.body}</p>
        </div>

        <div className="mb-6 flex justify-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={
                "h-2 rounded-full transition-all " +
                (idx === i ? "w-6 bg-gold-500" : "w-2 bg-slate-200")
              }
            />
          ))}
        </div>

        {last ? (
          <div className="space-y-3">
            <Button block size="lg" onClick={finish}>
              Get started <ArrowRight size={18} />
            </Button>
            <ButtonLink href="/login" variant="ghost" block size="md">
              I already have an account
            </ButtonLink>
          </div>
        ) : (
          <Button block size="lg" onClick={() => setI((v) => v + 1)}>
            Next <ArrowRight size={18} />
          </Button>
        )}
      </div>
    </div>
  );
}
