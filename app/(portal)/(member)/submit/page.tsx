"use client";

import React from "react";
import Link from "next/link";
import { Music2, Disc3, FilePlus2, ArrowRight, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/app/(portal)/(member)/layout";
import { Card } from "@/components/zam/Card";

const options = [
  {
    href: "/works/new",
    icon: FilePlus2,
    tag: "Copyright",
    title: "Declare a Work",
    body: "Register the underlying composition — songwriters, publishers and ownership splits. Do this once per song to record who owns it.",
  },
  {
    href: "/submit/single",
    icon: Music2,
    tag: "Release",
    title: "Submit a Single",
    body: "Register a finished recording of one song — master audio, cover art and credits — for distribution and royalties.",
  },
  {
    href: "/submit/album",
    icon: Disc3,
    tag: "Release",
    title: "Submit an Album",
    body: "Register a multi-track release — front & back covers plus each track's audio and details.",
  },
];

export default function SubmitHubScreen() {
  return (
    <div>
      <PageHeader
        title="Submit"
        subtitle="Declare a work or register a new release with ZAMCOPS."
      />

      <div className="grid md:grid-cols-3 gap-5">
        {options.map((o) => (
          <Link key={o.href} href={o.href} className="group">
            <Card className="p-6 h-full hover:shadow-card-lg hover:border-zam-orange/40 transition">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zam-orange-soft text-zam-orange group-hover:bg-zam-orange group-hover:text-white transition-colors">
                <o.icon className="h-6 w-6" />
              </span>
              <span className="mt-4 inline-block rounded-full bg-zam-canvas px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-zam-muted">
                {o.tag}
              </span>
              <h3 className="mt-3 font-display font-semibold text-lg text-zam-ink">{o.title}</h3>
              <p className="mt-1 text-sm text-zam-muted">{o.body}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-zam-orange">
                Start <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-zam-line bg-white p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zam-green-soft text-zam-green">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-zam-ink">Work vs. release — what's the difference?</p>
          <p className="mt-0.5 text-sm text-zam-muted">
            A <strong>work</strong> is the composition itself — the songwriting and who owns it (declared once).
            A <strong>release</strong> is a specific recording of that work — a single or album you put out.
            Most songs need both: declare the work, then submit the release. Every submission is reviewed before it's registered.
          </p>
        </div>
      </div>
    </div>
  );
}
