"use client";

import React from "react";
import { Handshake, Plus, Inbox, Trash2, Banknote, Music } from "lucide-react";
import { PageHeader } from "@/app/(portal)/(member)/layout";
import { Card, CardHeader } from "@/components/zam/Card";
import { StatusBadge } from "@/components/zam/StatusBadge";
import { EmptyState } from "@/components/zam/Misc";
import { Button } from "@/components/zam/Button";
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
      <PageHeader
        title="Licensing & sync"
        subtitle={`${licensableWorks.length} work${licensableWorks.length === 1 ? "" : "s"} open to licensing`}
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => (window.location.href = "/licensing/new")}>
            List a work
          </Button>
        }
      />

      {/* Desk intro */}
      <Card className="mb-6 p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-zam-green-soft text-zam-green">
            <Handshake className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-zam-ink">ZAMCOPS Licensing Desk</p>
            <p className="mt-1 text-sm leading-relaxed text-zam-muted">
              Open select works to sync &amp; direct licensing — film, TV, ads, brand and live-event use. ZAMCOPS brokers
              every enquiry on your behalf and only earns a facilitation fee when a deal is accepted.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Licensable works */}
        <Card>
          <CardHeader title="Licensable works" description="Your pool, open to enquiries" />
          {licensableWorks.length === 0 ? (
            <EmptyState
              icon={<Handshake className="h-7 w-7" />}
              title="No works listed yet"
              description="List a song, album or declared work so businesses can enquire about licensing it through ZAMCOPS."
              action={
                <Button icon={<Plus className="h-4 w-4" />} onClick={() => (window.location.href = "/licensing/new")}>
                  List a work
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-zam-line">
              {licensableWorks.map((w) => (
                <div key={w.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-zam-orange-soft text-zam-orange">
                        <Music className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-zam-ink">{w.workTitle}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {w.usageTypes.map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-zam-canvas px-2 py-0.5 text-[11px] font-semibold text-zam-muted"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={w.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-zam-line pt-2.5 text-xs text-zam-muted">
                    <span className="inline-flex items-center gap-1">
                      <Banknote className="h-3.5 w-3.5" />
                      {w.minFee != null ? `Min. fee ${formatKwacha(w.minFee)}` : "No minimum fee set"}
                    </span>
                    <button
                      onClick={() => withdraw(w.id, w.workTitle)}
                      disabled={withdrawingId === w.id}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-zam-muted transition hover:bg-red-50 hover:text-zam-red disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {withdrawingId === w.id ? "Withdrawing…" : "Withdraw"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Inbound enquiries */}
        <Card>
          <CardHeader title="Licensing enquiries" description="Inbound interest from businesses" />
          {licenseRequests.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-7 w-7" />}
              title="No enquiries yet"
              description="When a business asks ZAMCOPS to license one of your pooled works, the enquiry and its progress will appear here."
            />
          ) : (
            <div className="divide-y divide-zam-line">
              {licenseRequests.map((r) => (
                <div key={r.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-zam-ink">{titleFor(r.workId)}</p>
                      <p className="truncate text-xs text-zam-muted">
                        {r.requesterCompany || r.requesterName} · {r.usageType}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.description && <p className="mt-2 text-xs leading-relaxed text-zam-muted">{r.description}</p>}
                  <div className="mt-3 flex items-center justify-between border-t border-zam-line pt-2.5 text-xs text-zam-muted">
                    <span>{r.proposedFee != null ? `Proposed ${formatKwacha(r.proposedFee)}` : "No fee proposed yet"}</span>
                    <span>{formatDate(r.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
