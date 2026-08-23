"use client";

import React from "react";
import Link from "next/link";
import { Music2, Disc3, ArrowRight } from "lucide-react";
import { PageHeader } from "@/app/(portal)/(member)/layout";
import { Card } from "@/components/zam/Card";

const options = [
  {
    href: "/submit/single",
    icon: Music2,
    title: "Register a work",
    body: "Send one song and its artwork together. Credit composers, authors, sub-authors, sub-arrangers and publishers.",
  },
  {
    href: "/submit/album",
    icon: Disc3,
    title: "Register an album",
    body: "Send several tracks with front and back artwork in one submission.",
  },
];

export default function SubmitHubScreen() {
  return (
    <div>
      <PageHeader
        title="Register works"
        subtitle="Composers, authors and publishers register musical works with ZAMCOPS — song and artwork in one submission."
      />

      <div className="grid md:grid-cols-2 gap-5">
        {options.map((o) => (
          <Link key={o.href} href={o.href} className="group">
            <Card className="p-6 h-full hover:shadow-card-lg hover:border-zam-orange/40 transition">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zam-orange-soft text-zam-orange group-hover:bg-zam-orange group-hover:text-white transition-colors">
                <o.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-display font-semibold text-lg text-zam-ink">{o.title}</h3>
              <p className="mt-1 text-sm text-zam-muted">{o.body}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-zam-orange">
                Continue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
