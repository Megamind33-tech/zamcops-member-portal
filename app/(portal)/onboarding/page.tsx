"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/zam/Button";
import { Logo } from "@/components/ui/Logo";

const slides = [
  {
    kicker: "01 — Register",
    title: "Your music, protected",
    body: "Declare your songs, compositions, beats and lyrics so your copyright ownership is recorded and protected.",
  },
  {
    kicker: "02 — Track",
    title: "Follow every submission",
    body: "Track every single, album and work declaration from submission through to review and approval.",
  },
  {
    kicker: "03 — Earn",
    title: "See your royalties",
    body: "Estimated, pending and paid royalties from radio and broadcast usage of your music across Zambia.",
  },
  {
    kicker: "04 — Belong",
    title: "Manage your membership",
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
    <div className="min-h-[100dvh] flex flex-col bg-zam-canvas">
      <header className="flex items-center justify-between p-6">
        <div className="bg-white rounded-2xl px-4 py-3 inline-flex shadow-card">
          <Logo size={30} onDark={false} />
        </div>
        <button
          onClick={finish}
          className="text-sm font-semibold text-zam-muted transition hover:text-zam-ink"
        >
          Skip
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div key={i} className="w-full max-w-md text-center">
          <div className="zam-flagline w-16 mx-auto" />
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-zam-orange">
            {slide.kicker}
          </p>
          <h1 className="mt-3 font-display font-bold text-3xl text-zam-ink leading-tight">
            {slide.title}
          </h1>
          <p className="mt-4 text-zam-muted leading-relaxed">{slide.body}</p>

          <div className="mt-8 flex items-center justify-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={
                  "h-1.5 rounded-full transition-all " +
                  (idx === i ? "w-8 bg-zam-orange" : "w-2 bg-zam-line")
                }
              />
            ))}
          </div>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-md space-y-3 p-6">
        {last ? (
          <>
            <Button className="w-full" onClick={finish} icon={<ArrowRight size={18} />}>
              Get started
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => router.replace("/login")}>
              I already have an account
            </Button>
          </>
        ) : (
          <>
            <Button className="w-full" onClick={() => setI((v) => v + 1)} icon={<ArrowRight size={18} />}>
              Continue
            </Button>
            <Link
              href="/login"
              className="block text-center text-sm font-semibold text-zam-muted hover:text-zam-ink"
            >
              I already have an account
            </Link>
          </>
        )}
      </footer>
    </div>
  );
}
