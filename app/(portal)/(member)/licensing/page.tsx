"use client";

import React from "react";
import Link from "next/link";
import { Handshake, Plus, Inbox, Trash2, Banknote } from "lucide-react";
import { TopBar } from "@/components/mobile/TopBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Misc";
import { ButtonLink } from "@/components/ui/Button";
import { CoverArt } from "@/components/media/CoverArt";
import { useApp, useMemberData } from "@/lib/store";
import { formatKwacha, formatDate } from "@/lib/format";

export default function LicensingScreen() {
  const { withdrawLicensableWork } = useApp();
  const { licensableWorks, licenseRequests } = useMemberData();
  const [withdrawingId, setWithdrawingId] = React.useState<string | null>(null);

  const titleFor = (workId: string) => licensableWorks.find((w) => w.id === workId)?.workTitle ?? "Your work";

  const withdraw = async (id: string, title: string) => {
    if (!confirm(`Withdraw "${title}" from the licensing pool? Businesses will no longer be able to enquire about it.`)) return;
    setWithdrawingId(id);
    await withdrawLicensableWork(id);
    setWithdrawingId(null);
  };

  return (
    <div>
      <TopBar
        title="Licensing & sync"
        subtitle={`${licensableWorks.length} listed`}
        right={
          <Link
            href="/licensing/new"
            className="grid h-9 w-9 place-items-center rounded-full bg-accent-500 text-night-950 shadow-[0_14px_30px_-12px_rgba(255,138,61,0.6)] ring-1 ring-accent-300/30"
            aria-label="List a work for licensing"
          >
            <Plus size={17} />
          </Link>
        }
      />

      <div className="space-y-6 px-4 py-4">
        <section className="card relative overflow-hidden p-4">
          <span className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-accent-500/12 blur-3xl" />
          <div className="relative flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-700 text-white ring-1 ring-white/15">
              <Handshake size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">ZAMCOPS Licensing Desk</p>
              <p className="mt-1 text-xs leading-relaxed text-night-300">
                Open select works to sync &amp; direct licensing — film, TV, ads, brand and live-event use. ZAMCOPS brokers
                every enquiry on your behalf and only earns a facilitation fee when a deal is accepted.
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3 px-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-accent-400">Your pool</p>
              <h2 className="font-display text-lg font-bold tracking-tight text-white">Licensable works</h2>
            </div>
          </div>

          {licensableWorks.length === 0 ? (
            <EmptyState
              icon={<Handshake size={26} />}
              title="No works listed yet"
              message="List a song, album or declared work so businesses can enquire about licensing it through ZAMCOPS."
              action={
                <ButtonLink href="/licensing/new" size="sm">
                  <Plus size={16} /> List a work
                </ButtonLink>
              }
            />
          ) : (
            <div className="space-y-3">
              {licensableWorks.map((w) => (
                <div key={w.id} className="card px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <CoverArt seed={w.workTitle} size={44} rounded="rounded-xl" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{w.workTitle}</p>
                        <p className="mt-0.5 flex flex-wrap gap-1.5">
                          {w.usageTypes.map((t) => (
                            <span key={t} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-night-300 ring-1 ring-white/10">
                              {t}
                            </span>
                          ))}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={w.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5 text-[11px] text-night-400">
                    <span className="inline-flex items-center gap-1">
                      <Banknote size={12} /> {w.minFee != null ? `Min. fee ${formatKwacha(w.minFee)}` : "No minimum fee set"}
                    </span>
                    <button
                      onClick={() => withdraw(w.id, w.workTitle)}
                      disabled={withdrawingId === w.id}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-night-400 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
                    >
                      <Trash2 size={12} /> {withdrawingId === w.id ? "Withdrawing…" : "Withdraw"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3 px-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-accent-400">Inbound</p>
              <h2 className="font-display text-lg font-bold tracking-tight text-white">Licensing enquiries</h2>
            </div>
          </div>

          {licenseRequests.length === 0 ? (
            <EmptyState
              icon={<Inbox size={26} />}
              title="No enquiries yet"
              message="When a business asks ZAMCOPS to license one of your pooled works, the enquiry and its progress will appear here."
            />
          ) : (
            <div className="card divide-y divide-white/[0.06] overflow-hidden">
              {licenseRequests.map((r) => (
                <div key={r.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{titleFor(r.workId)}</p>
                      <p className="truncate text-xs text-night-300">
                        {r.requesterCompany || r.requesterName} · {r.usageType}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.description && <p className="mt-2 text-xs leading-relaxed text-night-400">{r.description}</p>}
                  <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5 text-[11px] text-night-400">
                    <span>
                      {r.proposedFee != null ? `Proposed ${formatKwacha(r.proposedFee)}` : "No fee proposed yet"}
                    </span>
                    <span>{formatDate(r.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
