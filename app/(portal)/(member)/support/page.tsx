"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Phone, Mail, MapPin, ChevronDown, LifeBuoy, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/app/(portal)/(member)/layout";
import { Card, CardHeader } from "@/components/zam/Card";
import { Field, Textarea, Select } from "@/components/zam/Input";
import { Button } from "@/components/zam/Button";
import { StatusBadge } from "@/components/zam/StatusBadge";
import { SupportThread } from "@/components/zam/SupportThread";
import { MandateNote } from "@/components/zam/MandateNote";
import { formatDate } from "@/lib/format";
import { MEMBER_SUPPORT_TOPICS } from "@/lib/support";
import type { SupportTicket } from "@/types";

const faqs = [
  {
    q: "Who can join ZAMCOPS?",
    a: "Composers and authors of musical works that have been fixed in a tangible form, and music publishers. Membership is Individual, Group or Publisher. Arrangers are not a membership class — they are credited on a work and receive a share. ZAMCOPS does not administer related rights (performers, producers, featured artists).",
  },
  {
    q: "How do I register a song?",
    a: "Open Register a work and send the audio and the artwork in the same submission. Credit composers, authors, arrangers and publishers, with splits totalling 100%. Recording credits (who performed the track) are for identification only and do not create a related-rights claim.",
  },
  {
    q: "How are royalties paid?",
    a: "ZAMCOPS licenses users of copyrighted music, then publishes a distribution. Confirmed amounts appear under Royalties once a distribution is published. Detected usage is indicative only.",
  },
  {
    q: "Where are my official PDFs?",
    a: "After membership is approved, your application form, Deed of Assignment and admission letter are on Documents. Staff may also add further PDFs to your file.",
  },
];

export default function SupportScreen() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [topic, setTopic] = useState<(typeof MEMBER_SUPPORT_TOPICS)[number]>(MEMBER_SUPPORT_TOPICS[0]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [replyBusy, setReplyBusy] = useState<string | null>(null);

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
    toast.success("Conversation started — we'll reply in this thread.");
    setMessage("");
    await loadTickets();
  };

  const followUp = async (ticket: SupportTicket) => {
    const text = (replies[ticket.id] || "").trim();
    if (!text) return;
    setReplyBusy(ticket.id);
    const res = await fetch("/api/member/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: ticket.id, message: text }),
    });
    setReplyBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Could not send your reply.");
      return;
    }
    toast.success(ticket.status === "Resolved" ? "Ticket reopened with your follow-up." : "Reply sent.");
    setReplies((r) => ({ ...r, [ticket.id]: "" }));
    await loadTickets();
  };

  const contacts = [
    { icon: Phone, label: "Phone", value: "+260 211 250 082" },
    { icon: Mail, label: "Email", value: "info@zamcops.org.zm" },
    { icon: MapPin, label: "Office", value: "ZAMCOPS House, Lusaka, Zambia" },
  ];

  return (
    <div>
      <PageHeader title="Support" subtitle="A conversation with the ZAMCOPS team — not a one-shot form." />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Start a conversation"
              description="Staff reply in this thread. You can write again on the same ticket, including after it is closed."
            />
            <form onSubmit={submit} className="space-y-4 p-5">
              <Field label="Help topic">
                <Select value={topic} onChange={(e) => setTopic(e.target.value as (typeof MEMBER_SUPPORT_TOPICS)[number])}>
                  {MEMBER_SUPPORT_TOPICS.map((t) => (
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
                  {busy ? "Sending…" : "Start conversation"}
                </Button>
              </div>
            </form>
          </Card>

          {tickets.length > 0 && (
            <Card>
              <CardHeader title="Your conversations" description="New staff replies also arrive as notifications." />
              <div className="divide-y divide-zam-line">
                {tickets.map((t) => {
                  const expanded = openId === t.id;
                  return (
                    <div key={t.id} className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setOpenId(expanded ? null : t.id)}
                        className="flex w-full items-start gap-3 text-left"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zam-orange-soft text-zam-orange">
                          <MessageSquareText size={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-zam-ink">{t.topic}</p>
                            <StatusBadge status={t.status === "Open" ? "Pending" : "Approved"} />
                            <span className="ml-auto text-xs text-zam-muted">{formatDate(t.createdAt)}</span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm text-zam-muted">
                            {t.thread[t.thread.length - 1]?.body || t.message}
                          </p>
                        </div>
                        <ChevronDown
                          className={`mt-2 h-4 w-4 shrink-0 text-zam-muted transition-transform ${expanded ? "rotate-180" : ""}`}
                        />
                      </button>
                      {expanded && (
                        <div className="mt-4 space-y-3 pl-[52px]">
                          <SupportThread messages={t.thread} />
                          <Field label={t.status === "Resolved" ? "Write again to reopen" : "Reply"}>
                            <Textarea
                              placeholder={
                                t.status === "Resolved"
                                  ? "This ticket is closed. A new message reopens it."
                                  : "Continue this conversation…"
                              }
                              value={replies[t.id] ?? ""}
                              onChange={(e) => setReplies((r) => ({ ...r, [t.id]: e.target.value }))}
                            />
                          </Field>
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              size="sm"
                              disabled={!(replies[t.id] || "").trim() || replyBusy === t.id}
                              onClick={() => followUp(t)}
                            >
                              {replyBusy === t.id ? "Sending…" : t.status === "Resolved" ? "Reopen with reply" : "Send reply"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
            <MandateNote />
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
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-zam-canvas/50"
              >
                <span className="font-semibold text-zam-ink">{f.q}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-zam-muted transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                />
              </button>
              {openFaq === i && <p className="px-5 pb-4 text-sm leading-relaxed text-zam-muted">{f.a}</p>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
