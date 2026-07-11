"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Phone, Mail, MapPin, ChevronDown, LifeBuoy, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/app/(portal)/(member)/layout";
import { Card, CardHeader } from "@/components/zam/Card";
import { Field, Textarea, Select } from "@/components/zam/Input";
import { Button } from "@/components/zam/Button";
import { StatusBadge } from "@/components/zam/StatusBadge";
import { formatDate } from "@/lib/format";
import type { SupportTicket } from "@/types";

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
  const [topic, setTopic] = useState(topics[0]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  const loadTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/member/support");
      if (res.ok) setTickets((await res.json()).tickets ?? []);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    const res = await fetch("/api/member/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, message }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Could not send your query — please try again.");
      return;
    }
    toast.success("Your query has been sent — we'll respond within 2 working days.");
    setMessage("");
    await loadTickets();
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
                <Select value={topic} onChange={(e) => setTopic(e.target.value)}>
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
                <Button type="submit" disabled={!message.trim() || busy}>
                  {busy ? "Sending…" : "Send query"}
                </Button>
              </div>
            </form>
          </Card>

          {tickets.length > 0 && (
            <Card>
              <CardHeader title="Your recent queries" description="Staff replies also arrive as notifications." />
              <div className="divide-y divide-zam-line">
                {tickets.map((t) => (
                  <div key={t.id} className="flex items-start gap-3 px-5 py-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zam-orange-soft text-zam-orange">
                      <MessageSquareText size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-zam-ink">{t.topic}</p>
                        <StatusBadge status={t.status === "Open" ? "Pending" : "Approved"} />
                        <span className="ml-auto text-xs text-zam-muted">{formatDate(t.createdAt)}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-zam-muted">{t.message}</p>
                      {t.reply && (
                        <p className="mt-2 rounded-xl bg-zam-canvas px-3 py-2 text-sm text-zam-ink">
                          <span className="text-xs font-bold uppercase tracking-wide text-zam-muted">ZAMCOPS · </span>
                          {t.reply}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
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
