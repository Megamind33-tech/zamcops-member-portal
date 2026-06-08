"use client";

import React from "react";
import Link from "next/link";
import { Music2, Disc3, FilePlus2, ChevronRight, Info } from "lucide-react";
import { TopBar } from "@/components/mobile/TopBar";

const options = [
  {
    href: "/submit/single",
    icon: Music2,
    title: "Submit a Single",
    body: "Upload one song with its audio, cover art and ownership splits.",
    tint: "from-accent-400 to-accent-700",
  },
  {
    href: "/submit/album",
    icon: Disc3,
    title: "Submit an Album",
    body: "Create an album and add multiple tracks, each with its own details.",
    tint: "from-gold-400 to-pop-500",
  },
  {
    href: "/works/new",
    icon: FilePlus2,
    title: "Declare a Work",
    body: "Register copyright ownership of a song, composition, beat or lyric.",
    tint: "from-iris-400 to-brand-700",
  },
];

export default function SubmitHubScreen() {
  return (
    <div>
      <TopBar title="Submit & Declare" back="/dashboard" />
      <div className="px-4 py-5">
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-xs text-night-300">
          <Info size={16} className="mt-0.5 shrink-0 text-brand-300" />
          <p>
            <span className="font-semibold">Submitting</span> a single or album registers a release.
            <span className="font-semibold"> Declaring a work</span> records the underlying copyright
            ownership — they are related but separate.
          </p>
        </div>

        <div className="space-y-3">
          {options.map((o) => (
            <Link
              key={o.href}
              href={o.href}
              className="card flex items-center gap-3 px-4 py-4 transition hover:bg-white/[0.03] active:scale-[0.99]"
            >
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${o.tint} text-white shadow-[0_14px_30px_-12px_rgba(0,0,0,0.55)] ring-1 ring-white/10`}>
                <o.icon size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white">{o.title}</p>
                <p className="text-xs text-night-300">{o.body}</p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-night-400" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
