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
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent-500 px-3.5 py-2 text-sm font-semibold text-night-950 transition hover:bg-accent-400"
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
                <span className="mb-1.5 block text-xs font-semibold text-night-300">Period label</span>
                <input
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  placeholder="e.g. Q2 2026"
                  className="field-input h-10 w-full"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold text-night-300">Notes (optional, internal only)</span>
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
                  className="rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-night-950 transition hover:bg-accent-400 disabled:opacity-40"
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
              <thead className="bg-white/[0.03]">
                <tr>
                  <Th>Period</Th>
                  <Th>Status</Th>
                  <Th>Entries</Th>
                  <Th>Total</Th>
                  <Th>Published</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {distributions.map((d) => {
                  const total = d.entries.reduce((s, e) => s + e.amount, 0);
                  return (
                    <tr key={d.id} className="hover:bg-white/[0.03]">
                      <Td className="font-semibold text-white">{d.periodLabel}</Td>
                      <Td>
                        <StatusBadge status={d.status} />
                      </Td>
                      <Td>{d.entries.length}</Td>
                      <Td className="text-accent-300">{formatKwacha(total)}</Td>
                      <Td className="text-night-300">{d.publishedAt ? formatDate(d.publishedAt) : "—"}</Td>
                      <Td>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setSelectedId(selectedId === d.id ? null : d.id)}
                            className="rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-xs font-semibold text-night-200 transition hover:bg-white/[0.1] hover:text-white"
                          >
                            {selectedId === d.id ? "Hide entries" : "Manage entries"}
                          </button>
                          {d.status === "Draft" && (
                            <button
                              onClick={() => publish(d.id, d.periodLabel)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/12 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
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
                    <Td colSpan={6} className="py-8 text-center text-night-400">
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
                <thead className="bg-white/[0.03]">
                  <tr>
                    <Th>Member</Th>
                    <Th>Confirmed payout (ZMW)</Th>
                    <Th className="text-right">Save</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {members.map((m) => {
                    const entry = selected.entries.find((e) => e.ownerId === m.id);
                    const value = drafts[m.id] ?? (entry ? String(entry.amount) : "");
                    return (
                      <tr key={m.id} className="hover:bg-white/[0.03]">
                        <Td className="font-semibold text-white">
                          {m.fullName} <span className="font-normal text-night-400">· {m.memberNumber}</span>
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
                            className="rounded-lg bg-accent-500/15 px-3 py-1.5 text-xs font-semibold text-accent-300 transition hover:bg-accent-500/25 disabled:opacity-40"
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
            <p className="border-t border-white/[0.07] px-5 py-3 text-xs text-night-400">
              Set each member&apos;s confirmed payout, then{" "}
              <strong className="text-night-200">publish</strong> the period from the table above — that is the moment members are notified and can see their earnings.
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}
