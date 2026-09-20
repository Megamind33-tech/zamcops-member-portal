"use client";

import React from "react";
import { Wallet, Clock, CheckCircle2, Radio } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { AdminStat, Panel, Th, Td } from "@/components/admin/widgets";
import { useAdminData } from "@/lib/adminClient";
import { formatKwacha } from "@/lib/format";

export default function AdminRoyaltiesPage() {
  const { royalty, members } = useAdminData();
  const summaries = royalty;
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
            <thead className="bg-zam-canvas">
              <tr>
                <Th>Member</Th>
                <Th>Estimated</Th>
                <Th>Pending</Th>
                <Th>Paid</Th>
                <Th>Top song</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zam-line">
              {summaries.map((r) => (
                <tr key={r.ownerId} className="hover:bg-zam-canvas">
                  <Td className="font-semibold text-zam-ink">{nameFor(r.ownerId)}</Td>
                  <Td>{formatKwacha(r.totalEstimated, r.currency)}</Td>
                  <Td className="text-zam-amber">{formatKwacha(r.pending, r.currency)}</Td>
                  <Td className="text-zam-green">{formatKwacha(r.paid, r.currency)}</Td>
                  <Td className="text-zam-muted">{r.topSongs[0]?.title ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
