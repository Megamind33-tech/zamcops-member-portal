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
    body: "Register copyright ownership of a song, composition, beat or lyric.",
  },
  {
    href: "/submit/single",
    icon: Music2,
    tag: "Release",
    title: "Submit a Single",
    body: "Upload one song with its audio, cover art and ownership splits.",
  },
  {
    href: "/submit/album",
    icon: Disc3,
    tag: "Release",
    title: "Submit an Album",
    body: "Create an album and add multiple tracks, each with its own details.",
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
          <p className="text-sm font-semibold text-zam-ink">Every submission is reviewed</p>
          <p className="mt-0.5 text-sm text-zam-muted">
            Our team verifies each work and release before it is registered. Submitting a single or album
            registers a release, while declaring a work records the underlying copyright ownership.
          </p>
        </div>
      </div>
    </div>
  );
}
