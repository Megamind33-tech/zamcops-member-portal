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
    <div className="flex flex-1 flex-col bg-white px-6 pb-8 pt-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-extrabold tracking-tight text-brand-800">ZAMCOPS</span>
        <button onClick={finish} className="text-xs font-semibold text-slate-400 hover:text-brand-600">
          Skip
        </button>
      </div>

      <div key={i} className="flex flex-1 flex-col items-center justify-center text-center animate-fade-up">
        <div className="mb-8 grid h-28 w-28 place-items-center rounded-[32px] bg-brand-50 text-brand-600">
          <Icon size={48} strokeWidth={1.8} />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-brand-900">{slide.title}</h2>
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
  );
}
