"use client";

import React, { useState } from "react";
import { Phone, Mail, MapPin, ChevronDown, MessageSquare, CheckCircle2 } from "lucide-react";
import { TopBar } from "@/components/mobile/TopBar";
import { Field, TextInput, TextArea, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

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
  const [sent, setSent] = useState(false);
  const [topic, setTopic] = useState(topics[0]);
  const [message, setMessage] = useState("");

  return (
    <div>
      <TopBar title="Support" back="/dashboard" />

      <div className="space-y-5 px-4 py-4">
        {/* Contact */}
        <section className="card px-4 py-4">
          <h3 className="mb-3 text-sm font-bold text-brand-900">Contact ZAMCOPS</h3>
          <div className="space-y-2.5">
            <a href="tel:+260211250082" className="flex items-center gap-3 text-sm text-brand-800">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <Phone size={16} />
              </span>
              +260 211 250 082
            </a>
            <a href="mailto:info@zamcops.org.zm" className="flex items-center gap-3 text-sm text-brand-800">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <Mail size={16} />
              </span>
              info@zamcops.org.zm
            </a>
            <div className="flex items-center gap-3 text-sm text-brand-800">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <MapPin size={16} />
              </span>
              ZAMCOPS House, Lusaka, Zambia
            </div>
          </div>
        </section>

        {/* Submit query */}
        <section className="card px-4 py-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-brand-900">
            <MessageSquare size={16} /> Submit a query
          </h3>
          {sent ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-700">
              <CheckCircle2 size={18} /> Your query has been sent. We&apos;ll respond within 2 working days.
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (message.trim()) setSent(true);
              }}
              className="space-y-3"
            >
              <Field label="Help topic">
                <Select value={topic} onChange={(e) => setTopic(e.target.value)}>
                  {topics.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Your message">
                <TextArea
                  placeholder="Describe your question or issue…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </Field>
              <Button type="submit" block disabled={!message.trim()}>
                Send query
              </Button>
            </form>
          )}
        </section>

        {/* FAQ */}
        <section>
          <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">FAQ</h3>
          <div className="card divide-y divide-slate-100">
            {faqs.map((f, i) => {
              const isOpen = open === i;
              return (
                <div key={i}>
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                  >
                    <span className="flex-1 text-sm font-semibold text-brand-900">{f.q}</span>
                    <ChevronDown size={18} className={"shrink-0 text-slate-400 transition " + (isOpen ? "rotate-180" : "")} />
                  </button>
                  {isOpen && <p className="px-4 pb-4 text-xs leading-relaxed text-slate-500">{f.a}</p>}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
