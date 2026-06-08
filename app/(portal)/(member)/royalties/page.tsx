"use client";

import React, { useState } from "react";
import { Download, Radio, TrendingUp, Wallet } from "lucide-react";
import { TopBar } from "@/components/mobile/TopBar";
import { EmptyState } from "@/components/ui/Misc";
import { useMemberData } from "@/lib/store";
import { formatKwacha } from "@/lib/format";

const periods = ["All time", "Q1 2026", "2025"];

export default function RoyaltiesScreen() {
  const { royalty } = useMemberData();
  const [period, setPeriod] = useState("All time");

  if (!royalty || royalty.totalEstimated === 0) {
    return (
      <div>
        <TopBar title="Royalties" back="/dashboard" />
        <div className="px-4 py-6">
          <EmptyState
            icon={<Wallet size={22} />}
            title="No royalty activity yet"
            message="Once your registered works are detected on radio and broadcast, royalty usage will appear here."
          />
        </div>
      </div>
    );
  }

  const logs =
    period === "All time"
      ? royalty.usageLogs
      : royalty.usageLogs.filter((l) => l.period === period);

  return (
    <div>
      <TopBar title="Royalties" subtitle="Copyright usage & reporting" back="/dashboard" />

      <div className="space-y-5 px-4 py-4">
        {/* Hero total */}
        <div className="rounded-2xl bg-brand-700 px-5 py-5 text-white shadow-card">
          <p className="text-xs text-brand-100">Total estimated royalties</p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight">
            {formatKwacha(royalty.totalEstimated, royalty.currency)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/10 px-3 py-2.5">
              <p className="text-[11px] text-brand-100">Pending</p>
              <p className="text-sm font-bold">{formatKwacha(royalty.pending, royalty.currency)}</p>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2.5">
              <p className="text-[11px] text-brand-100">Paid</p>
              <p className="text-sm font-bold">{formatKwacha(royalty.paid, royalty.currency)}</p>
            </div>
          </div>
        </div>

        {/* Period filter */}
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={
                "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition " +
                (period === p ? "bg-brand-600 text-white" : "bg-white text-slate-500 shadow-card")
              }
            >
              {p}
            </button>
          ))}
        </div>

        {/* Top songs */}
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
            <TrendingUp size={14} /> Top detected songs
          </h3>
          <div className="card divide-y divide-slate-100">
            {royalty.topSongs.map((s, i) => (
              <div key={s.title} className="flex items-center gap-3 px-4 py-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gold-500/10 text-xs font-bold text-gold-600">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-brand-900">{s.title}</p>
                  <p className="text-xs text-slate-500">{s.plays.toLocaleString()} plays detected</p>
                </div>
                <span className="text-sm font-bold text-brand-700">
                  {formatKwacha(s.amount, royalty.currency)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Usage logs */}
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Radio size={14} /> Radio / usage logs
          </h3>
          <div className="card divide-y divide-slate-100">
            {logs.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-slate-400">
                No usage logs for {period}.
              </p>
            )}
            {logs.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-brand-900">{l.songTitle}</p>
                  <p className="truncate text-xs text-slate-500">
                    {l.source} · {l.plays} plays · {l.period}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-brand-700">
                  {formatKwacha(l.estimatedAmount, royalty.currency)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <a
          href="/statements"
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white"
        >
          <Download size={18} /> Download statement
        </a>
        <p className="pb-2 text-center text-[11px] text-slate-400">
          Figures are estimates based on detected usage and may differ from final distributions.
        </p>
      </div>
    </div>
  );
}
