"use client";

import React, { useState } from "react";
import { Download, Radio, TrendingUp, CalendarCheck2 } from "lucide-react";
import { TopBar } from "@/components/mobile/TopBar";
import { EmptyState } from "@/components/ui/Misc";
import { CoverArt } from "@/components/media/CoverArt";
import { Illustration } from "@/components/media/Illustration";
import { useMemberData } from "@/lib/store";
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
      <div>
        <TopBar title="Royalties" back="/dashboard" />
        <div className="px-4 py-6">
          <EmptyState
            art={<Illustration name="royalty" />}
            title="No royalty activity yet"
            message="Once your registered works are detected on radio and broadcast — and ZAMCOPS publishes its next distribution — your confirmed payouts will appear here."
          />
        </div>
      </div>
    );
  }

  const logs =
    period === "All time"
      ? royalty?.usageLogs ?? []
      : (royalty?.usageLogs ?? []).filter((l) => l.period === period);

  return (
    <div>
      <TopBar title="Royalties" subtitle="Confirmed payouts & detected usage" back="/dashboard" />

      <div className="space-y-5 px-4 py-4">
        {/* Hero — confirmed, published payout only. We never show speculative figures here. */}
        <div className="relative overflow-hidden rounded-[1.75rem] bg-night-900 px-5 py-5 text-white shadow-[0_30px_70px_-30px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
          <div className="pointer-events-none absolute inset-0">
            <img src="/img/dj-console.webp" alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,rgba(5,5,12,0.6)_0%,rgba(5,5,12,0.85)_55%,rgba(5,5,12,0.96)_100%)]" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-500/15 blur-3xl" />
          <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Last distribution</p>
          <p className="relative mt-1.5 font-display text-3xl font-extrabold tracking-tight text-white">
            {lastDistribution ? formatKwacha(lastDistribution.amount, lastDistribution.currency) : formatKwacha(0)}
          </p>
          <p className="relative mt-1 text-xs text-white/60">
            {lastDistribution
              ? `${lastDistribution.periodLabel} · published ${formatDate(lastDistribution.publishedAt ?? lastDistribution.createdAt)}`
              : "Confirmed once ZAMCOPS publishes its next distribution"}
          </p>
          <div className="relative mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/12 bg-black/20 px-3 py-2.5 backdrop-blur">
              <p className="text-[11px] text-white/60">Lifetime confirmed</p>
              <p className="text-sm font-bold text-white">{formatKwacha(lifetimeDistributed)}</p>
            </div>
            <div className="rounded-xl border border-white/12 bg-black/20 px-3 py-2.5 backdrop-blur">
              <p className="text-[11px] text-white/60">Periods published</p>
              <p className="text-sm font-bold text-white">{distributions.length}</p>
            </div>
          </div>
        </div>

        {/* Distribution history — the gated, confirmed record. */}
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider text-night-300">
            <CalendarCheck2 size={14} /> Distribution history
          </h3>
          <div className="card divide-y divide-white/[0.06]">
            {distributions.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-night-400">
                Nothing published yet — your first confirmed payout will appear here once ZAMCOPS closes a distribution period.
              </p>
            )}
            {distributions.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{d.periodLabel}</p>
                  <p className="truncate text-xs text-night-400">
                    Published {formatDate(d.publishedAt ?? d.createdAt)}
                    {d.topSongs[0] ? ` · led by “${d.topSongs[0].title}”` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-emerald-300">
                  {formatKwacha(d.amount, d.currency)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {hasDetectedActivity && (
          <>
            {/* Period filter */}
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
              {periods.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={
                    "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition " +
                    (period === p ? "bg-accent-500 text-night-950 ring-1 ring-accent-300/30" : "border border-white/10 bg-white/[0.05] text-night-300 hover:bg-white/[0.08]")
                  }
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Top songs */}
            {royalty!.topSongs.length > 0 && (
              <section>
                <h3 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider text-night-300">
                  <TrendingUp size={14} /> Top detected songs
                </h3>
                <div className="card divide-y divide-white/[0.06]">
                  {royalty!.topSongs.map((s, i) => (
                    <div key={s.title} className="flex items-center gap-3 px-4 py-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent-500/12 text-xs font-bold text-accent-300 ring-1 ring-accent-400/20">
                        {i + 1}
                      </span>
                      <CoverArt seed={s.title} size={40} rounded="rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{s.title}</p>
                        <p className="text-xs text-night-400">{s.plays.toLocaleString()} plays detected</p>
                      </div>
                      <span className="text-sm font-bold text-night-300">
                        ~{formatKwacha(s.amount, royalty!.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

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
                    <span className="shrink-0 text-sm font-bold text-night-300">
                      ~{formatKwacha(l.estimatedAmount, royalty!.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <p className="px-1 text-center text-[11px] text-night-400">
              Detected-usage figures are indicative only — they show what ZAMCOPS is tracking, not a promised payout. Your confirmed earnings are the published distribution amounts above.
            </p>
          </>
        )}

        <a
          href="/statements"
          className="flex items-center justify-center gap-2 rounded-xl bg-accent-500 py-3 text-sm font-semibold text-night-950 shadow-[0_16px_38px_-14px_rgba(255,138,61,0.6)] ring-1 ring-accent-300/30 transition hover:bg-accent-400"
        >
          <Download size={18} /> Download statement
        </a>
      </div>
    </div>
  );
}
