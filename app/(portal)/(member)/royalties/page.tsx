"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Download, Radio, Info } from "lucide-react";
import { useMemberData } from "@/lib/store";
import { PageHeader } from "@/app/(portal)/(member)/layout";
import { Card, CardHeader } from "@/components/zam/Card";
import { Button } from "@/components/zam/Button";
import { Progress, EmptyState } from "@/components/zam/Misc";
import { TableShell, Th, Td, Tr } from "@/components/zam/Table";
import { formatKwacha, formatDate } from "@/lib/format";

const periods = ["All time", "Q1 2026", "2025"];

export default function RoyaltiesScreen() {
  const { royalty, distributions } = useMemberData();
  const [period, setPeriod] = useState("All time");

  const lastDistribution = distributions[0] ?? null;
  const lifetimeDistributed = distributions.reduce((s, d) => s + d.amount, 0);
  const hasDetectedActivity = !!royalty && (royalty.usageLogs.length > 0 || royalty.topSongs.length > 0);

  if (!lastDistribution && !hasDetectedActivity) {
    return (
      <div className="space-y-6">
        <PageHeader title="Royalties" subtitle="Confirmed payouts & detected usage" />
        <Card>
          <EmptyState
            icon={<Radio size={28} />}
            title="No royalty activity yet"
            description="Once your registered works are detected on radio and broadcast — and ZAMCOPS publishes its next distribution — your confirmed payouts will appear here."
          />
        </Card>
      </div>
    );
  }

  const logs =
    period === "All time"
      ? royalty?.usageLogs ?? []
      : (royalty?.usageLogs ?? []).filter((l) => l.period === period);

  const totalEstimated = royalty?.totalEstimated ?? lastDistribution?.amount ?? 0;
  const pending = royalty?.pending ?? 0;
  const paid = royalty?.paid ?? lifetimeDistributed;
  const currency = royalty?.currency ?? lastDistribution?.currency ?? "ZMW";
  const maxPlays = Math.max(1, ...(royalty?.topSongs ?? []).map((s) => s.plays));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Royalties"
        subtitle="Confirmed payouts & detected usage"
        action={
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-11 rounded-xl border border-zam-line bg-white px-3 text-sm text-zam-ink focus:border-zam-orange focus:outline-none focus:ring-2 focus:ring-zam-orange/20"
            >
              {periods.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <Link href="/statements">
              <Button variant="secondary" icon={<Download size={16} />}>
                Download statement
              </Button>
            </Link>
          </div>
        }
      />

      <div className="rounded-xl border border-zam-blue/20 bg-zam-blue-soft p-3.5">
        <div className="flex items-start gap-2.5 text-sm text-zam-ink">
          <Info size={16} className="mt-0.5 shrink-0 text-zam-blue" />
          <span>
            Detected-usage figures are indicative estimates only — they show what ZAMCOPS is tracking, not a promised payout.
            Your confirmed earnings are the published distribution amounts.
          </span>
        </div>
      </div>

      {/* Hero tiles */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-zam-ink p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Total estimated</p>
          <p className="mt-2 font-display text-3xl font-bold">{formatKwacha(totalEstimated, currency)}</p>
          {lastDistribution && (
            <p className="mt-1 text-xs text-white/60">
              {lastDistribution.periodLabel} · published {formatDate(lastDistribution.publishedAt ?? lastDistribution.createdAt)}
            </p>
          )}
        </Card>
        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-zam-muted">Pending</p>
          <p className="mt-2 font-display text-3xl font-bold text-zam-amber">{formatKwacha(pending, currency)}</p>
        </Card>
        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-zam-muted">Paid</p>
          <p className="mt-2 font-display text-3xl font-bold text-zam-green">{formatKwacha(paid, currency)}</p>
        </Card>
      </div>

      {/* Usage logs */}
      <Card>
        <CardHeader title="Radio & TV usage logs" description="Detected plays of your registered works." />
        {logs.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zam-muted">No usage logs for {period}.</p>
        ) : (
          <div className="p-4">
            <TableShell>
              <thead>
                <Tr>
                  <Th>Song</Th>
                  <Th>Source</Th>
                  <Th>Plays</Th>
                  <Th>Period</Th>
                  <Th className="text-right">Estimated</Th>
                </Tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <Tr key={l.id}>
                    <Td className="font-semibold text-zam-ink">{l.songTitle}</Td>
                    <Td className="text-zam-muted">{l.source}</Td>
                    <Td className="text-zam-muted">{l.plays.toLocaleString()}</Td>
                    <Td className="text-zam-muted">{l.period}</Td>
                    <Td className="text-right font-semibold text-zam-ink">~{formatKwacha(l.estimatedAmount, currency)}</Td>
                  </Tr>
                ))}
              </tbody>
            </TableShell>
          </div>
        )}
      </Card>

      {/* Top songs */}
      {royalty && royalty.topSongs.length > 0 && (
        <Card>
          <CardHeader title="Top detected songs" />
          <div className="divide-y divide-zam-line">
            {royalty.topSongs.map((s, i) => (
              <div key={s.title} className="px-5 py-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-zam-orange-soft text-xs font-bold text-zam-orange">
                      {i + 1}
                    </span>
                    <p className="truncate font-semibold text-zam-ink">{s.title}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-zam-muted">~{formatKwacha(s.amount, currency)}</span>
                </div>
                <Progress value={(s.plays / maxPlays) * 100} />
                <p className="mt-1 text-xs text-zam-muted">{s.plays.toLocaleString()} plays detected</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
