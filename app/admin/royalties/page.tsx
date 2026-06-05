"use client";

import React from "react";
import { Wallet, Clock, CheckCircle2, Radio } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { AdminStat, Panel, Th, Td } from "@/components/admin/widgets";
import { useApp } from "@/lib/store";
import { formatKwacha } from "@/lib/format";

export default function AdminRoyaltiesPage() {
  const { royalty, members } = useApp();
  const summaries = Object.values(royalty);
  const nameFor = (id: string) => members.find((m) => m.id === id)?.fullName ?? "Unknown";

  const totalEstimated = summaries.reduce((s, r) => s + r.totalEstimated, 0);
  const totalPending = summaries.reduce((s, r) => s + r.pending, 0);
  const totalPaid = summaries.reduce((s, r) => s + r.paid, 0);
  const totalPlays = summaries.reduce(
    (s, r) => s + r.usageLogs.reduce((a, l) => a + l.plays, 0),
    0
  );

  return (
    <div>
      <AdminHeader title="Royalty Summary" subtitle="Aggregated copyright usage and distributions" />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AdminStat icon={<Wallet size={18} />} label="Total estimated" value={formatKwacha(totalEstimated)} />
        <AdminStat icon={<Clock size={18} />} label="Pending" value={formatKwacha(totalPending)} tone="amber" />
        <AdminStat icon={<CheckCircle2 size={18} />} label="Paid" value={formatKwacha(totalPaid)} tone="emerald" />
        <AdminStat icon={<Radio size={18} />} label="Plays detected" value={totalPlays.toLocaleString()} tone="gold" />
      </div>

      <Panel title="Per-member royalties">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-slate-50">
              <tr>
                <Th>Member</Th>
                <Th>Estimated</Th>
                <Th>Pending</Th>
                <Th>Paid</Th>
                <Th>Top song</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summaries.map((r) => (
                <tr key={r.ownerId} className="hover:bg-slate-50">
                  <Td className="font-semibold text-slate-900">{nameFor(r.ownerId)}</Td>
                  <Td>{formatKwacha(r.totalEstimated, r.currency)}</Td>
                  <Td className="text-amber-600">{formatKwacha(r.pending, r.currency)}</Td>
                  <Td className="text-emerald-600">{formatKwacha(r.paid, r.currency)}</Td>
                  <Td className="text-slate-500">{r.topSongs[0]?.title ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
