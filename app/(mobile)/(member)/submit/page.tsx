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
  },
  {
    href: "/submit/album",
    icon: Disc3,
    title: "Submit an Album",
    body: "Create an album and add multiple tracks, each with its own details.",
  },
  {
    href: "/works/new",
    icon: FilePlus2,
    title: "Declare a Work",
    body: "Register copyright ownership of a song, composition, beat or lyric.",
  },
];

export default function SubmitHubScreen() {
  return (
    <div>
      <TopBar title="Submit & Declare" back="/dashboard" />
      <div className="px-4 py-5">
        <div className="mb-4 flex items-start gap-2 rounded-2xl bg-brand-50/70 px-4 py-3 text-xs text-brand-800">
          <Info size={16} className="mt-0.5 shrink-0 text-brand-500" />
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
              className="card flex items-center gap-3 px-4 py-4 transition active:scale-[0.99]"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white">
                <o.icon size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-brand-900">{o.title}</p>
                <p className="text-xs text-slate-500">{o.body}</p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-slate-300" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
