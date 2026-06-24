"use client";

import React, { useState } from "react";
import { Phone, Mail, MapPin, ChevronDown, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/app/(portal)/(member)/layout";
import { Card, CardHeader } from "@/components/zam/Card";
import { Field, Textarea, Select, Input } from "@/components/zam/Input";
import { Button } from "@/components/zam/Button";

const faqs = [
  {
    q: "What is the difference between a work declaration and a song submission?",
    a: "A work declaration records the copyright ownership of the underlying musical work (composition, lyrics, beat). A song submission registers a specific release (single or album) and its files. You typically do both.",
  },
  {
    q: "How are royalties calculated?",
    a: "Royalties are estimated from detected usage of your registered works on radio, TV and broadcast platforms. Final distributions are confirmed after reconciliation each quarter.",
  },
  {
    q: "Why is my submission still pending?",
    a: "Submissions are reviewed by ZAMCOPS staff to verify ownership and file quality. You'll receive a notification once the status changes.",
  },
  {
    q: "How do I update my payout details?",
    a: "Go to Profile & KYC, update your bank or mobile money details under Payout details, and save.",
  },
];

const topics = ["Membership", "Work declarations", "Submissions & uploads", "Royalties & payouts", "Account & login"];

export default function SupportScreen() {
  const [open, setOpen] = useState<number | null>(0);
  const [message, setMessage] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    toast.success("Your query has been sent — we'll respond within 2 working days.");
    setMessage("");
    (e.target as HTMLFormElement).reset();
  };

  const contacts = [
    { icon: Phone, label: "Phone", value: "+260 211 250 082" },
    { icon: Mail, label: "Email", value: "info@zamcops.org.zm" },
    { icon: MapPin, label: "Office", value: "ZAMCOPS House, Lusaka, Zambia" },
  ];

  return (
    <div>
      <PageHeader title="Support" subtitle="Get help from the ZAMCOPS team." />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Submit a query" description="Tell us what you need help with and we'll get back to you." />
            <form onSubmit={submit} className="space-y-4 p-5">
              <Field label="Help topic">
                <Select name="topic" defaultValue={topics[0]}>
                  {topics.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Your message" required>
                <Textarea
                  placeholder="Describe your question or issue…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" disabled={!message.trim()}>
                  Send query
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <Card>
          <CardHeader title="Contact ZAMCOPS" />
          <div className="space-y-4 p-5">
            {contacts.map((c) => (
              <div key={c.label} className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zam-orange-soft text-zam-orange">
                  <c.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-zam-muted">{c.label}</p>
                  <p className="text-sm font-medium text-zam-ink">{c.value}</p>
                </div>
              </div>
            ))}
            <div className="flex items-start gap-2.5 rounded-xl bg-zam-canvas p-3.5">
              <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-zam-orange" />
              <p className="text-xs text-zam-muted">Office hours: Mon–Fri, 08:00–17:00 CAT.</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Frequently asked questions" />
        <div className="divide-y divide-zam-line">
          {faqs.map((f, i) => (
            <div key={i}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-zam-canvas/50"
              >
                <span className="font-semibold text-zam-ink">{f.q}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-zam-muted transition-transform ${open === i ? "rotate-180" : ""}`}
                />
              </button>
              {open === i && <p className="px-5 pb-4 text-sm leading-relaxed text-zam-muted">{f.a}</p>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
