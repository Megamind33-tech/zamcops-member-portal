"use client";

import React, { useState } from "react";
import { Handshake, Disc3, Inbox, Banknote, CheckCircle2, FilePlus2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { AdminStat, Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";
import { Field, Select, Input, Textarea } from "@/components/zam/Input";
import { useAdminData } from "@/lib/adminClient";
import { formatKwacha, formatDate } from "@/lib/format";
import type { LicenseRequestStatus, LicenseUsageType } from "@/types";

const STATUSES: LicenseRequestStatus[] = ["Submitted", "In review", "Offer sent", "Accepted", "Declined"];
const USAGE_TYPES: LicenseUsageType[] = ["Film & TV", "Advertising", "Online content", "Live events", "Other"];

export default function AdminLicensingPage() {
  const { members, licensableWorks, licenseRequests, setLicenseRequestStatus, logLicenseEnquiry } = useAdminData();
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
              <thead className="bg-zam-canvas">
                <tr>
                  <Th>Work</Th>
                  <Th>Member</Th>
                  <Th>Usage types</Th>
                  <Th>Min. fee</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zam-line">
                {licensableWorks.map((w) => (
                  <tr key={w.id} className="hover:bg-zam-canvas">
                    <Td className="font-semibold text-zam-ink">
                      <div className="flex items-center gap-2">
                        <Handshake size={14} className="text-zam-green" />
                        {w.workTitle}
                      </div>
                    </Td>
                    <Td>{nameFor(w.ownerId)}</Td>
                    <Td className="text-xs text-zam-muted">{w.usageTypes.join(", ")}</Td>
                    <Td className="text-zam-muted">{w.minFee != null ? formatKwacha(w.minFee) : "—"}</Td>
                    <Td>
                      <StatusBadge status={w.status} />
                    </Td>
                  </tr>
                ))}
                {licensableWorks.length === 0 && (
                  <tr>
                    <Td colSpan={5} className="py-8 text-center text-zam-muted">
                      No works have been listed for licensing yet.
                    </Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <LogEnquiryPanel
          works={licensableWorks.map((w) => ({ id: w.id, title: w.workTitle, member: nameFor(w.ownerId) }))}
          onLog={logLicenseEnquiry}
        />

        <Panel title="Inbound enquiries">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px]">
              <thead className="bg-zam-canvas">
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
              <tbody className="divide-y divide-zam-line">
                {licenseRequests.map((r) => {
                  const d = draftFor(r);
                  const dirty =
                    d.status !== r.status ||
                    d.proposedFee !== (r.proposedFee != null ? String(r.proposedFee) : "") ||
                    d.facilitationFee !== (r.facilitationFee != null ? String(r.facilitationFee) : "");
                  return (
                    <tr key={r.id} className="hover:bg-zam-canvas">
                      <Td className="font-semibold text-zam-ink">
                        {titleFor(r.workId)}
                        <span className="block text-xs font-normal text-zam-muted">{nameFor(r.ownerId)}</span>
                      </Td>
                      <Td className="text-xs text-zam-muted">
                        {r.requesterCompany || r.requesterName}
                        <span className="block text-zam-muted">{r.requesterEmail}</span>
                      </Td>
                      <Td className="text-xs text-zam-muted">
                        {r.usageType}
                        <span className="block text-zam-muted/70">{formatDate(r.createdAt)}</span>
                      </Td>
                      <Td>
                        <Input
                          inputMode="decimal"
                          placeholder="0.00"
                          value={d.proposedFee}
                          onChange={(e) => setDraft(r.id, { proposedFee: e.target.value })}
                          className="h-9 w-28"
                        />
                      </Td>
                      <Td>
                        <Input
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
                          className="rounded-lg bg-zam-orange/15 px-3 py-1.5 text-xs font-semibold text-zam-orange transition hover:bg-zam-orange/25 disabled:opacity-40"
                        >
                          {savingId === r.id ? "Saving…" : "Save"}
                        </button>
                      </Td>
                    </tr>
                  );
                })}
                {licenseRequests.length === 0 && (
                  <tr>
                    <Td colSpan={7} className="py-8 text-center text-zam-muted">
                      No licensing enquiries yet — these arrive once businesses contact ZAMCOPS about a listed work.
                    </Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="border-t border-zam-line px-5 py-3 text-xs text-zam-muted">
            Move an enquiry through <strong className="text-zam-ink">Submitted → In review → Offer sent → Accepted/Declined</strong>,
            recording the proposed fee for the member and ZAMCOPS&apos; facilitation fee — the member is notified at every status change.
          </p>
        </Panel>
      </div>
    </div>
  );
}

// Staff capture enquiries that arrive by phone/email against a listed work —
// this is how requests enter the desk's pipeline.
function LogEnquiryPanel({
  works,
  onLog,
}: {
  works: { id: string; title: string; member: string }[];
  onLog: (p: {
    workId: string;
    requesterName: string;
    requesterCompany?: string;
    requesterEmail: string;
    usageType: string;
    description?: string;
    proposedFee?: number;
  }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const empty = { workId: "", requesterName: "", requesterCompany: "", requesterEmail: "", usageType: USAGE_TYPES[0] as string, description: "", proposedFee: "" };
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (patch: Partial<typeof empty>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!form.workId) return setMsg({ ok: false, text: "Choose the listed work being enquired about." });
    if (!form.requesterName.trim()) return setMsg({ ok: false, text: "Enter the requester's name." });
    if (!form.requesterEmail.trim()) return setMsg({ ok: false, text: "Enter the requester's email." });
    setBusy(true);
    const res = await onLog({
      workId: form.workId,
      requesterName: form.requesterName,
      requesterCompany: form.requesterCompany || undefined,
      requesterEmail: form.requesterEmail,
      usageType: form.usageType,
      description: form.description || undefined,
      proposedFee: form.proposedFee.trim() ? Number(form.proposedFee) : undefined,
    });
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: res.error || "Could not log enquiry." });
    setForm(empty);
    setMsg({ ok: true, text: "Enquiry logged — the member has been notified." });
  };

  return (
    <Panel title="Log an enquiry">
      <form onSubmit={submit} className="grid gap-4 p-5 lg:grid-cols-3">
        <Field label="Listed work">
          <Select value={form.workId} onChange={(e) => set({ workId: e.target.value })}>
            <option value="">Choose a work…</option>
            {works.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title} — {w.member}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Requester name">
          <Input placeholder="e.g. Jane Banda" value={form.requesterName} onChange={(e) => set({ requesterName: e.target.value })} />
        </Field>
        <Field label="Company (optional)">
          <Input placeholder="e.g. Kwacha Films" value={form.requesterCompany} onChange={(e) => set({ requesterCompany: e.target.value })} />
        </Field>
        <Field label="Requester email">
          <Input type="email" placeholder="name@company.com" value={form.requesterEmail} onChange={(e) => set({ requesterEmail: e.target.value })} />
        </Field>
        <Field label="Usage type">
          <Select value={form.usageType} onChange={(e) => set({ usageType: e.target.value })}>
            {USAGE_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Proposed fee (optional)">
          <Input inputMode="decimal" placeholder="0.00" value={form.proposedFee} onChange={(e) => set({ proposedFee: e.target.value })} />
        </Field>
        <div className="lg:col-span-3">
          <Field label="What do they want to use it for?">
            <Textarea rows={2} placeholder="Brief description of the intended use…" value={form.description} onChange={(e) => set({ description: e.target.value })} />
          </Field>
        </div>
        <div className="flex items-center gap-3 lg:col-span-3">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-zam-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-zam-orange-dark disabled:opacity-50"
          >
            <FilePlus2 size={15} /> {busy ? "Logging…" : "Log enquiry"}
          </button>
          {msg && <p className={`text-sm font-medium ${msg.ok ? "text-zam-green" : "text-zam-red"}`}>{msg.text}</p>}
        </div>
      </form>
    </Panel>
  );
}
