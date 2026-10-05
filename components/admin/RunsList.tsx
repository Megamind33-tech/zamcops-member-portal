"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";

type Run = {
  id: string;
  periodLabel: string;
  code: string;
  status: string;
  startDate: string;
  endDate: string;
  imported: boolean;
  memberPayouts: number;
  lines: number;
  allocated: number;
  adminFee: number;
  reserved: number;
};

export const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// The society's distribution runs — the history imported from WIPO Connect and
// anything run here — each opening into its full allocation.
export function RunsList() {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/admin/register/distributions")
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw new Error(b.error ?? "Could not load the distribution runs.");
        setRuns((b.runs as Run[]).filter((x) => x.lines > 0 || x.imported));
      })
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <p className="rounded-xl bg-zam-red/10 px-4 py-3 text-sm text-zam-red">{err}</p>;
  if (!runs) return <p className="text-sm text-zam-muted">Loading…</p>;

  const needle = q.trim().toLowerCase();
  const shown = runs.filter((r) => !needle || `${r.periodLabel} ${r.code}`.toLowerCase().includes(needle));
  const total = runs.reduce((s, r) => s + r.allocated, 0);

  return (
    <Panel
      title={`${runs.length} distribution runs · ${money(total)} allocated in all`}
      right={
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name or code…" className="field-input h-9 w-56" />
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-zam-line bg-zam-canvas/60">
              <Th>Distribution</Th>
              <Th>Period</Th>
              <Th>Status</Th>
              <Th className="text-right">Lines</Th>
              <Th className="text-right">Allocated</Th>
              <Th className="text-right">Admin fee</Th>
              <Th className="text-right">Reserved</Th>
              <Th className="text-right">Member payouts</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zam-line">
            {shown.map((r) => (
              <tr key={r.id} className="hover:bg-zam-canvas/50">
                <Td>
                  <Link href={`/admin/distributions/${r.id}`} className="font-semibold text-zam-ink hover:text-zam-orange">
                    {r.periodLabel}
                  </Link>
                  {r.code && <div className="text-[11px] text-zam-muted">{r.code}</div>}
                </Td>
                <Td className="text-xs">{r.startDate || r.endDate ? `${r.startDate || "…"} → ${r.endDate || "…"}` : "—"}</Td>
                <Td>
                  <StatusBadge status={r.status} />
                </Td>
                <Td className="text-right tabular-nums">{r.lines.toLocaleString()}</Td>
                <Td className="text-right tabular-nums">{money(r.allocated)}</Td>
                <Td className="text-right tabular-nums">{money(r.adminFee)}</Td>
                <Td className="text-right tabular-nums">{money(r.reserved)}</Td>
                <Td className="text-right tabular-nums">{r.memberPayouts}</Td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <Td colSpan={8} className="py-8 text-center text-zam-muted">
                  No distribution runs match.
                </Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
