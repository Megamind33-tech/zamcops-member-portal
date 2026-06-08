"use client";

import React, { useState } from "react";
import { Download, Radio, TrendingUp } from "lucide-react";
import { TopBar } from "@/components/mobile/TopBar";
import { EmptyState } from "@/components/ui/Misc";
import { CoverArt } from "@/components/media/CoverArt";
import { Illustration } from "@/components/media/Illustration";
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
            art={<Illustration name="royalty" />}
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
        <div className="relative overflow-hidden rounded-2xl brand-gradient px-5 py-5 text-white shadow-glow ring-1 ring-white/10">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold-400/20 blur-3xl" />
          <p className="relative text-xs text-white/80">Total estimated royalties</p>
          <p className="relative mt-1 text-3xl font-extrabold tracking-tight">
            {formatKwacha(royalty.totalEstimated, royalty.currency)}
          </p>
          <div className="relative mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/12 bg-white/10 px-3 py-2.5 backdrop-blur">
              <p className="text-[11px] text-white/70">Pending</p>
              <p className="text-sm font-bold">{formatKwacha(royalty.pending, royalty.currency)}</p>
            </div>
            <div className="rounded-xl border border-white/12 bg-white/10 px-3 py-2.5 backdrop-blur">
              <p className="text-[11px] text-white/70">Paid</p>
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
                (period === p ? "brand-gradient text-white shadow-fab ring-1 ring-white/10" : "border border-white/10 bg-white/[0.05] text-night-300 hover:bg-white/[0.08]")
              }
            >
              {p}
            </button>
          ))}
        </div>

        {/* Top songs */}
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider text-night-300">
            <TrendingUp size={14} /> Top detected songs
          </h3>
          <div className="card divide-y divide-white/[0.06]">
            {royalty.topSongs.map((s, i) => (
              <div key={s.title} className="flex items-center gap-3 px-4 py-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gold-400/12 text-xs font-bold text-gold-300 ring-1 ring-gold-400/20">
                  {i + 1}
                </span>
                <CoverArt seed={s.title} size={40} rounded="rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{s.title}</p>
                  <p className="text-xs text-night-400">{s.plays.toLocaleString()} plays detected</p>
                </div>
                <span className="text-sm font-bold text-gold-400">
                  {formatKwacha(s.amount, royalty.currency)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Usage logs */}
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider text-night-300">
            <Radio size={14} /> Radio / usage logs
          </h3>
          <div className="card divide-y divide-white/[0.06]">
            {logs.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-night-400">
                No usage logs for {period}.
              </p>
            )}
            {logs.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{l.songTitle}</p>
                  <p className="truncate text-xs text-night-400">
                    {l.source} · {l.plays} plays · {l.period}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-brand-300">
                  {formatKwacha(l.estimatedAmount, royalty.currency)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <a
          href="/statements"
          className="flex items-center justify-center gap-2 rounded-xl brand-gradient py-3 text-sm font-semibold text-white shadow-fab ring-1 ring-white/10 transition hover:brightness-110"
        >
          <Download size={18} /> Download statement
        </a>
        <p className="pb-2 text-center text-[11px] text-night-400">
          Figures are estimates based on detected usage and may differ from final distributions.
        </p>
      </div>
    </div>
  );
}
