"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AuthScreen, AuthHeading } from "@/components/auth/AuthScreen";

const slides = [
  {
    photo: "synth" as const,
    kicker: "01 — Register",
    title: "Your music,\nprotected",
    body: "Declare your songs, compositions, beats and lyrics so your copyright ownership is recorded and protected.",
  },
  {
    photo: "dj-console" as const,
    kicker: "02 — Track",
    title: "Follow every\nsubmission",
    body: "Track every single, album and work declaration from submission through to review and approval.",
  },
  {
    photo: "piano" as const,
    kicker: "03 — Earn",
    title: "See your\nroyalties",
    body: "Estimated, pending and paid royalties from radio and broadcast usage of your music across Zambia.",
  },
  {
    photo: "hands" as const,
    kicker: "04 — Belong",
    title: "Manage your\nmembership",
    body: "Keep your profile, KYC and payout details up to date and access receipts and statements anytime.",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const slide = slides[i];
  const last = i === slides.length - 1;

  const finish = () => {
    if (typeof window !== "undefined") window.localStorage.setItem("zamcops_onboarded", "1");
    router.replace("/register");
  };

  return (
    <AuthScreen
      photo={slide.photo}
      topRight={
        <button onClick={finish} className="text-[13px] font-semibold text-white/70 transition hover:text-white">
          Skip
        </button>
      }
    >
      <div key={i} className="animate-fade-up">
        <AuthHeading
          kicker={slide.kicker}
          title={slide.title.split("\n").map((line, idx) => (
            <React.Fragment key={idx}>
              {line}
              {idx === 0 && <br />}
            </React.Fragment>
          ))}
          sub={slide.body}
        />
      </div>

      <div className="mt-7 flex items-center gap-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={"h-1.5 rounded-full transition-all " + (idx === i ? "w-8 bg-accent-500" : "w-2 bg-white/25")}
          />
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {last ? (
          <>
            <Button block size="lg" onClick={finish} className="h-[58px] rounded-[18px] text-[16px]">
              Get started <ArrowRight size={18} />
            </Button>
            <ButtonLink href="/login" variant="ghost" block size="md">
              I already have an account
            </ButtonLink>
          </>
        ) : (
          <Button block size="lg" onClick={() => setI((v) => v + 1)} className="h-[58px] rounded-[18px] text-[16px]">
            Next <ArrowRight size={18} />
          </Button>
        )}
      </div>
    </AuthScreen>
  );
}
