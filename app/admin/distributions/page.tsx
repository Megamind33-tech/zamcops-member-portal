"use client";

import React, { useState } from "react";
import { CalendarRange, Plus, Send, Users, Wallet } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { AdminStat, Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";
import { useAdminData } from "@/lib/adminClient";
import { formatKwacha, formatDate } from "@/lib/format";

export default function AdminDistributionsPage() {
  const { members, distributions, createDistribution, setDistributionStatus, saveDistributionEntry } = useAdminData();
  const [showNew, setShowNew] = useState(false);
  const [periodLabel, setPeriodLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const selected = distributions.find((d) => d.id === selectedId) ?? null;
  const published = distributions.filter((d) => d.status === "Published");
  const totalPaidOut = published.reduce((s, d) => s + d.entries.reduce((a, e) => a + e.amount, 0), 0);

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodLabel.trim()) return;
    setCreating(true);
    const r = await createDistribution({ periodLabel, notes });
    setCreating(false);
    if (r.ok) {
      setPeriodLabel("");
      setNotes("");
      setShowNew(false);
      if (r.item) setSelectedId(r.item.id);
    }
  };

  const saveOne = async (ownerId: string) => {
    if (!selected) return;
    const raw = drafts[ownerId];
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 0) return;
    setSavingId(ownerId);
    await saveDistributionEntry({ distributionId: selected.id, ownerId, amount });
    setSavingId(null);
    setDrafts((d) => {
      const next = { ...d };
      delete next[ownerId];
      return next;
    });
  };

  const publish = async (id: string, label: string) => {
    if (!confirm(`Publish "${label}"? Members will immediately see their confirmed payouts for this period.`)) return;
    await setDistributionStatus(id, "Published");
  };

  return (
    <div>
      <AdminHeader
        title="Distributions"
        subtitle="Members only see confirmed earnings once a period is published — this is the visibility gate"
        right={
          <button
            onClick={() => setShowNew((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-zam-orange px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-zam-orange-dark"
          >
            <Plus size={16} /> New period
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AdminStat icon={<CalendarRange size={18} />} label="Periods" value={distributions.length} />
        <AdminStat icon={<Send size={18} />} label="Published" value={published.length} tone="emerald" />
        <AdminStat icon={<Users size={18} />} label="Members" value={members.length} tone="gold" />
        <AdminStat icon={<Wallet size={18} />} label="Paid out (published)" value={formatKwacha(totalPaidOut)} tone="amber" />
      </div>

      {showNew && (
        <div className="mb-6">
          <Panel title="New distribution period">
            <form onSubmit={submitNew} className="grid gap-3 p-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-zam-muted">Period label</span>
                <input
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  placeholder="e.g. Q2 2026"
                  className="field-input h-10 w-full"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold text-zam-muted">Notes (optional, internal only)</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="field-input w-full"
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={creating || !periodLabel.trim()}
                  className="rounded-xl bg-zam-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zam-orange-dark disabled:opacity-40"
                >
                  {creating ? "Creating…" : "Create draft period"}
                </button>
              </div>
            </form>
          </Panel>
        </div>
      )}

      <div className="space-y-6">
        <Panel title="Distribution periods">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-zam-canvas">
                <tr>
                  <Th>Period</Th>
                  <Th>Status</Th>
                  <Th>Entries</Th>
                  <Th>Total</Th>
                  <Th>Published</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zam-line">
                {distributions.map((d) => {
                  const total = d.entries.reduce((s, e) => s + e.amount, 0);
                  return (
                    <tr key={d.id} className="hover:bg-zam-canvas">
                      <Td className="font-semibold text-zam-ink">{d.periodLabel}</Td>
                      <Td>
                        <StatusBadge status={d.status} />
                      </Td>
                      <Td>{d.entries.length}</Td>
                      <Td className="text-zam-orange">{formatKwacha(total)}</Td>
                      <Td className="text-zam-muted">{d.publishedAt ? formatDate(d.publishedAt) : "—"}</Td>
                      <Td>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setSelectedId(selectedId === d.id ? null : d.id)}
                            className="rounded-lg bg-zam-canvas px-2.5 py-1.5 text-xs font-semibold text-zam-ink transition hover:bg-zam-canvas hover:text-zam-ink"
                          >
                            {selectedId === d.id ? "Hide entries" : "Manage entries"}
                          </button>
                          {d.status === "Draft" && (
                            <button
                              onClick={() => publish(d.id, d.periodLabel)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/12 px-2.5 py-1.5 text-xs font-semibold text-zam-green transition hover:bg-emerald-500/20"
                            >
                              <Send size={14} /> Publish
                            </button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
                {distributions.length === 0 && (
                  <tr>
                    <Td colSpan={6} className="py-8 text-center text-zam-muted">
                      No distribution periods yet — create one to get started.
                    </Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        {selected && (
          <Panel title={`Entries — ${selected.periodLabel}`} right={<StatusBadge status={selected.status} />}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-zam-canvas">
                  <tr>
                    <Th>Member</Th>
                    <Th>Confirmed payout (ZMW)</Th>
                    <Th className="text-right">Save</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zam-line">
                  {members.map((m) => {
                    const entry = selected.entries.find((e) => e.ownerId === m.id);
                    const value = drafts[m.id] ?? (entry ? String(entry.amount) : "");
                    return (
                      <tr key={m.id} className="hover:bg-zam-canvas">
                        <Td className="font-semibold text-zam-ink">
                          {m.fullName} <span className="font-normal text-zam-muted">· {m.memberNumber}</span>
                        </Td>
                        <Td>
                          <input
                            value={value}
                            onChange={(e) => setDrafts((d) => ({ ...d, [m.id]: e.target.value }))}
                            inputMode="decimal"
                            placeholder="0.00"
                            className="field-input h-9 w-32"
                          />
                        </Td>
                        <Td className="text-right">
                          <button
                            onClick={() => saveOne(m.id)}
                            disabled={savingId === m.id || !drafts[m.id]}
                            className="rounded-lg bg-zam-orange/15 px-3 py-1.5 text-xs font-semibold text-zam-orange transition hover:bg-zam-orange/25 disabled:opacity-40"
                          >
                            {savingId === m.id ? "Saving…" : entry ? "Update" : "Add"}
                          </button>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="border-t border-zam-line px-5 py-3 text-xs text-zam-muted">
              Set each member&apos;s confirmed payout, then{" "}
              <strong className="text-zam-ink">publish</strong> the period from the table above — that is the moment members are notified and can see their earnings.
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}
