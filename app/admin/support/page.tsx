"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Inbox, CheckCircle2, KeyRound, RotateCcw, Send, MessageSquare } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { AdminStat, Panel, StatusBadge } from "@/components/admin/widgets";
import { TextArea } from "@/components/ui/Field";
import { SupportThread } from "@/components/zam/SupportThread";
import { useAdminData } from "@/lib/adminClient";
import { formatDate } from "@/lib/format";
import type { SupportTicket } from "@/types";

export default function AdminSupportPage() {
  const { supportTickets, members, setTicketStatus, loading } = useAdminData();
  const [tab, setTab] = useState<"Open" | "Resolved">("Open");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const open = supportTickets.filter((t) => t.status === "Open");
  const resets = open.filter((t) => t.topic === "Password reset");
  const shown = supportTickets.filter((t) => t.status === tab);

  const memberFor = (t: SupportTicket) => members.find((m) => m.id === t.ownerId);

  const send = async (t: SupportTicket, close: boolean) => {
    const text = replies[t.id]?.trim() || "";
    if (!text && !close) return;
    setBusyId(t.id);
    await setTicketStatus(t.id, close ? "Resolved" : "Open", text || undefined);
    setBusyId(null);
    setReplies((r) => ({ ...r, [t.id]: "" }));
  };

  const reopen = async (t: SupportTicket) => {
    setBusyId(t.id);
    await setTicketStatus(t.id, "Open");
    setBusyId(null);
  };

  return (
    <div>
      <AdminHeader title="Support Inbox" subtitle="Threaded conversations with members, plus signed-out password-reset requests" />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <AdminStat icon={<Inbox size={18} />} label="Open conversations" value={open.length} tone="gold" />
        <AdminStat icon={<KeyRound size={18} />} label="Password resets waiting" value={resets.length} tone="amber" />
        <AdminStat icon={<CheckCircle2 size={18} />} label="Resolved" value={supportTickets.length - open.length} tone="emerald" />
      </div>

      <div className="mb-4 inline-flex gap-1 rounded-xl border border-zam-line bg-white p-1">
        {(["Open", "Resolved"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors " +
              (tab === t ? "bg-zam-orange text-white" : "text-zam-muted hover:text-zam-ink")
            }
          >
            {t} ({t === "Open" ? open.length : supportTickets.length - open.length})
          </button>
        ))}
      </div>

      <Panel title={tab === "Open" ? "Open tickets" : "Resolved tickets"}>
        {shown.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-night-400">
            {loading ? "Loading…" : tab === "Open" ? "No open conversations — inbox zero." : "Nothing resolved yet."}
          </p>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {shown.map((t) => {
              const m = memberFor(t);
              const isReset = t.topic === "Password reset";
              const draft = replies[t.id] ?? "";
              return (
                <div key={t.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs font-semibold text-night-300">{t.topic}</span>
                    <StatusBadge status={t.status === "Open" ? "Pending" : "Approved"} className="!text-[10px]" />
                    <span className="ml-auto text-xs text-night-400">{formatDate(t.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-xs text-night-400">
                    {m ? (
                      <>
                        From{" "}
                        <Link href={`/admin/members/${m.id}`} className="font-semibold text-accent-300 hover:underline">
                          {m.fullName}
                        </Link>{" "}
                        · <span className="font-mono">{m.memberNumber}</span> · {m.email}
                      </>
                    ) : (
                      <>
                        Signed-out request · contact: <span className="font-mono">{t.contact || "unknown"}</span> (no matching
                        account)
                      </>
                    )}
                  </p>
                  {isReset && m && t.status === "Open" && (
                    <p className="mt-1.5 text-xs text-night-300">
                      Verify the member&apos;s identity, then issue a temporary password from{" "}
                      <Link href={`/admin/members/${m.id}`} className="font-semibold text-accent-300 hover:underline">
                        their member page
                      </Link>{" "}
                      and close this ticket.
                    </p>
                  )}

                  <div className="mt-3">
                    <SupportThread messages={t.thread} tone="admin" />
                  </div>

                  {t.status === "Open" ? (
                    <div className="mt-3 space-y-2">
                      <TextArea
                        rows={2}
                        placeholder={m ? "Reply to the member (sent as an in-app notice)…" : "Internal note (requester has no account)…"}
                        value={draft}
                        onChange={(e) => setReplies((r) => ({ ...r, [t.id]: e.target.value }))}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => send(t, false)}
                          disabled={busyId === t.id || !draft.trim()}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.12] disabled:opacity-40"
                        >
                          <MessageSquare size={14} /> {busyId === t.id ? "Saving…" : "Send reply"}
                        </button>
                        <button
                          onClick={() => send(t, true)}
                          disabled={busyId === t.id}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-zam-green/12 px-4 py-2.5 text-sm font-semibold text-zam-green transition hover:bg-zam-green/20 disabled:opacity-40"
                        >
                          <Send size={14} /> {busyId === t.id ? "Saving…" : draft.trim() ? "Reply & close" : "Close ticket"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => reopen(t)}
                      disabled={busyId === t.id}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-night-300 transition hover:bg-white/[0.1] disabled:opacity-40"
                    >
                      <RotateCcw size={13} /> Reopen
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
