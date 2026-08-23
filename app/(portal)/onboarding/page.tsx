"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/zam/Button";
import { Logo } from "@/components/ui/Logo";

const slides = [
  {
    photo: "/img/auth-mic.webp",
    alt: "Vocalist at a microphone",
    kicker: "01 — Membership",
    title: "Composers, authors and publishers",
    body: "ZAMCOPS membership is open to composers and authors of musical works fixed in a tangible form, and to music publishers.",
  },
  {
    photo: "/img/piano.webp",
    alt: "Piano",
    kicker: "02 — Registration",
    title: "Register songs and artwork together",
    body: "Send each work with its recording and artwork in one submission. Credit composers, authors, arrangers and publishers. Related rights (performers, producers) are not administered.",
  },
  {
    photo: "/img/splash-stage.webp",
    alt: "Concert stage",
    kicker: "03 — Royalties",
    title: "Collection and distribution",
    body: "ZAMCOPS licenses users of copyrighted music and distributes royalties to the composers, authors and publishers who own the works.",
  },
  {
    photo: "/img/hands.webp",
    alt: "Musician's hands",
    kicker: "04 — Documents",
    title: "Your official file",
    body: "Download the membership application, Deed of Assignment and admission letter once staff have issued them.",
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
    <div className="relative min-h-[100dvh] bg-[#1a1612]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={slide.photo}
        src={slide.photo}
        alt={slide.alt}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/25" />

      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        <header className="flex items-center justify-between p-6">
          <div className="inline-flex rounded-2xl bg-white px-4 py-3 shadow-card">
            <Logo size={30} onDark={false} />
          </div>
          <button onClick={finish} className="text-sm font-semibold text-white/80 transition hover:text-white">
            Skip
          </button>
        </header>

        <main className="flex flex-1 flex-col items-center justify-end px-4 pb-4 sm:justify-center">
          <div key={i} className="w-full max-w-md rounded-3xl border border-white/15 bg-[#FBF7F0]/95 p-6 shadow-[0_28px_70px_rgba(0,0,0,0.4)] sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zam-orange">{slide.kicker}</p>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-zam-ink">{slide.title}</h1>
            <p className="mt-3 leading-relaxed text-zam-muted">{slide.body}</p>

            <div className="mt-6 flex items-center gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setI(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={
                    "h-1.5 rounded-full transition-all " + (idx === i ? "w-8 bg-zam-orange" : "w-2 bg-zam-line")
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
              <Button variant="ghost" className="w-full !text-white hover:!bg-white/10" onClick={() => router.replace("/login")}>
                I already have an account
              </Button>
            </>
          ) : (
            <>
              <Button className="w-full" onClick={() => setI((v) => v + 1)} icon={<ArrowRight size={18} />}>
                Continue
              </Button>
              <Link href="/login" className="block text-center text-sm font-semibold text-white/80 hover:text-white">
                I already have an account
              </Link>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
