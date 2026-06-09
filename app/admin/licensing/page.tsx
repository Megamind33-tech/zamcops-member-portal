"use client";

import React, { useState } from "react";
import { Handshake, Disc3, Inbox, Banknote, CheckCircle2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { AdminStat, Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";
import { Select, TextInput } from "@/components/ui/Field";
import { useAdminData } from "@/lib/adminClient";
import { formatKwacha, formatDate } from "@/lib/format";
import type { LicenseRequestStatus } from "@/types";

const STATUSES: LicenseRequestStatus[] = ["Submitted", "In review", "Offer sent", "Accepted", "Declined"];

export default function AdminLicensingPage() {
  const { members, licensableWorks, licenseRequests, setLicenseRequestStatus } = useAdminData();
  const [drafts, setDrafts] = useState<Record<string, { status: LicenseRequestStatus; proposedFee: string; facilitationFee: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const nameFor = (id: string) => members.find((m) => m.id === id)?.fullName ?? "Unknown";
  const titleFor = (workId: string) => licensableWorks.find((w) => w.id === workId)?.workTitle ?? "—";

  const draftFor = (r: (typeof licenseRequests)[number]) =>
    drafts[r.id] ?? {
      status: r.status,
      proposedFee: r.proposedFee != null ? String(r.proposedFee) : "",
      facilitationFee: r.facilitationFee != null ? String(r.facilitationFee) : "",
    };

  const setDraft = (id: string, patch: Partial<{ status: LicenseRequestStatus; proposedFee: string; facilitationFee: string }>) =>
    setDrafts((d) => ({ ...d, [id]: { ...draftFor(licenseRequests.find((r) => r.id === id)!), ...d[id], ...patch } }));

  const save = async (id: string) => {
    const d = draftFor(licenseRequests.find((r) => r.id === id)!);
    setSavingId(id);
    await setLicenseRequestStatus(id, d.status, {
      proposedFee: d.proposedFee.trim() ? Number(d.proposedFee) : undefined,
      facilitationFee: d.facilitationFee.trim() ? Number(d.facilitationFee) : undefined,
    });
    setSavingId(null);
    setDrafts((cur) => {
      const next = { ...cur };
      delete next[id];
      return next;
    });
  };

  const accepted = licenseRequests.filter((r) => r.status === "Accepted");
  const open = licenseRequests.filter((r) => r.status !== "Accepted" && r.status !== "Declined");
  const facilitationTotal = accepted.reduce((s, r) => s + (r.facilitationFee ?? 0), 0);

  return (
    <div>
      <AdminHeader
        title="Licensing Desk"
        subtitle="Broker sync & direct licensing enquiries between businesses and members"
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AdminStat icon={<Disc3 size={18} />} label="Listed works" value={licensableWorks.length} />
        <AdminStat icon={<Inbox size={18} />} label="Open enquiries" value={open.length} tone="gold" />
        <AdminStat icon={<CheckCircle2 size={18} />} label="Accepted deals" value={accepted.length} tone="emerald" />
        <AdminStat icon={<Banknote size={18} />} label="Facilitation fees earned" value={formatKwacha(facilitationTotal)} tone="amber" />
      </div>

      <div className="space-y-6">
        <Panel title="Licensing pool — member-listed works">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-white/[0.03]">
                <tr>
                  <Th>Work</Th>
                  <Th>Member</Th>
                  <Th>Usage types</Th>
                  <Th>Min. fee</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {licensableWorks.map((w) => (
                  <tr key={w.id} className="hover:bg-white/[0.03]">
                    <Td className="font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <Handshake size={14} className="text-emerald-300" />
                        {w.workTitle}
                      </div>
                    </Td>
                    <Td>{nameFor(w.ownerId)}</Td>
                    <Td className="text-xs text-night-300">{w.usageTypes.join(", ")}</Td>
                    <Td className="text-night-300">{w.minFee != null ? formatKwacha(w.minFee) : "—"}</Td>
                    <Td>
                      <StatusBadge status={w.status} />
                    </Td>
                  </tr>
                ))}
                {licensableWorks.length === 0 && (
                  <tr>
                    <Td colSpan={5} className="py-8 text-center text-night-400">
                      No works have been listed for licensing yet.
                    </Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Inbound enquiries">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px]">
              <thead className="bg-white/[0.03]">
                <tr>
                  <Th>Work / Member</Th>
                  <Th>Requester</Th>
                  <Th>Usage</Th>
                  <Th>Proposed fee</Th>
                  <Th>Facilitation fee</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Save</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {licenseRequests.map((r) => {
                  const d = draftFor(r);
                  const dirty =
                    d.status !== r.status ||
                    d.proposedFee !== (r.proposedFee != null ? String(r.proposedFee) : "") ||
                    d.facilitationFee !== (r.facilitationFee != null ? String(r.facilitationFee) : "");
                  return (
                    <tr key={r.id} className="hover:bg-white/[0.03]">
                      <Td className="font-semibold text-white">
                        {titleFor(r.workId)}
                        <span className="block text-xs font-normal text-night-400">{nameFor(r.ownerId)}</span>
                      </Td>
                      <Td className="text-xs text-night-300">
                        {r.requesterCompany || r.requesterName}
                        <span className="block text-night-400">{r.requesterEmail}</span>
                      </Td>
                      <Td className="text-xs text-night-300">
                        {r.usageType}
                        <span className="block text-night-500">{formatDate(r.createdAt)}</span>
                      </Td>
                      <Td>
                        <TextInput
                          inputMode="decimal"
                          placeholder="0.00"
                          value={d.proposedFee}
                          onChange={(e) => setDraft(r.id, { proposedFee: e.target.value })}
                          className="h-9 w-28"
                        />
                      </Td>
                      <Td>
                        <TextInput
                          inputMode="decimal"
                          placeholder="0.00"
                          value={d.facilitationFee}
                          onChange={(e) => setDraft(r.id, { facilitationFee: e.target.value })}
                          className="h-9 w-28"
                        />
                      </Td>
                      <Td>
                        <Select
                          value={d.status}
                          onChange={(e) => setDraft(r.id, { status: e.target.value as LicenseRequestStatus })}
                          className="h-9 w-[9.5rem]"
                        >
                          {STATUSES.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </Select>
                      </Td>
                      <Td className="text-right">
                        <button
                          onClick={() => save(r.id)}
                          disabled={savingId === r.id || !dirty}
                          className="rounded-lg bg-accent-500/15 px-3 py-1.5 text-xs font-semibold text-accent-300 transition hover:bg-accent-500/25 disabled:opacity-40"
                        >
                          {savingId === r.id ? "Saving…" : "Save"}
                        </button>
                      </Td>
                    </tr>
                  );
                })}
                {licenseRequests.length === 0 && (
                  <tr>
                    <Td colSpan={7} className="py-8 text-center text-night-400">
                      No licensing enquiries yet — these arrive once businesses contact ZAMCOPS about a listed work.
                    </Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="border-t border-white/[0.07] px-5 py-3 text-xs text-night-400">
            Move an enquiry through <strong className="text-night-200">Submitted → In review → Offer sent → Accepted/Declined</strong>,
            recording the proposed fee for the member and ZAMCOPS&apos; facilitation fee — the member is notified at every status change.
          </p>
        </Panel>
      </div>
    </div>
  );
}
