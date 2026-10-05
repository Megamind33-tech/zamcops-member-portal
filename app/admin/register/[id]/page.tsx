"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Link2, Pencil, Send } from "lucide-react";
import { toast } from "sonner";
import { Panel, Th, Td } from "@/components/admin/widgets";
import { Tabs } from "@/components/admin/ui";
import { AuditTrail } from "@/components/admin/AuditTrail";
import { HolderEditForm } from "@/components/admin/HolderEditForm";

type Detail = {
  holder: {
    id: string;
    wipoId: string;
    kind: string;
    displayName: string;
    firstName: string;
    lastName: string;
    ipiNumber: string;
    ipiBaseNumber: string;
    identifiers: { code: string; label: string; value: string }[];
    nrc: string;
    sex: string;
    birthDate: string;
    deathDate: string;
    status: string;
    isAffiliated: boolean;
    affiliatedFrom: string;
    region: string;
    nextOfKin: string;
    spouse: string;
    matchedBy: string;
    member: { id: string; memberNumber: string; fullName: string } | null;
    names: { id: string; name: string; firstName: string; nameType: string; ipiNameNumber: string }[];
    addresses: {
      id: string;
      line1: string;
      line2: string;
      line3: string;
      city: string;
      province: string;
      postcode: string;
      country: string;
      addressType: string;
    }[];
    contacts: { id: string; contactType: string; value: string; email: string; phone: string; contactName: string }[];
  };
  suggestions: { id: string; memberNumber: string; fullName: string; stageName: string }[];
  invite: { email: string; typedEmail: string; sentAt: string | null; expiresAt: string | null; count: number; canSend: boolean };
  shareCount: number;
  shares: {
    id: string;
    work: { id: string; title: string; wipoId: string; iswc: string };
    roleCode: string;
    isPublisher: boolean;
    rightType: string;
    share: number;
    territoryFormula: string;
  }[];
  distributions: { lines: number; totalAmount: number };
};

const Row = ({ k, v }: { k: string; v?: React.ReactNode }) => (
  <div className="flex justify-between gap-4 border-b border-zam-line/60 py-2 text-sm last:border-0">
    <dt className="text-zam-muted">{k}</dt>
    <dd className="text-right font-medium text-zam-ink">{v || "—"}</dd>
  </div>
);

export default function RightHolderPage() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState<"main" | "works" | "audit">("main");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/register/holders/${id}`)
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw new Error(b.error ?? "Could not load this right-holder.");
        setD(b);
        setEmail(b.invite.typedEmail || b.invite.email);
      })
      .catch((e) => setErr(e.message));
  }, [id, tick]);

  const [mq, setMq] = useState("");
  const [found, setFound] = useState<
    { id: string; memberNumber: string; fullName: string; stageName: string; rightHolder: { displayName: string } | null }[]
  >([]);

  useEffect(() => {
    if (mq.trim().length < 2) {
      setFound([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/admin/register/members?q=${encodeURIComponent(mq)}`)
        .then((r) => r.json())
        .then((b) => setFound(b.members ?? []))
        .catch(() => setFound([]));
    }, 300);
    return () => clearTimeout(t);
  }, [mq]);

  const link = async (body: { memberId?: string; unlink?: boolean }, ok: string) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/register/holders/${id}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error ?? "That did not work.");
      toast.success(ok);
      setMq("");
      setTick((t) => t + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  };

  const call = async (body: { email?: string; send?: boolean }, ok: string) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/register/holders/${id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error ?? "That did not work.");
      toast.success(ok.replace("{to}", b.sentTo ?? ""));
      setTick((t) => t + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  };

  if (err) return <p className="rounded-xl bg-zam-red/10 px-4 py-3 text-sm text-zam-red">{err}</p>;
  if (!d) return <p className="text-sm text-zam-muted">Loading…</p>;
  const h = d.holder;
  const wipocos = h.identifiers.find((i) => i.code === "WIPOCOS")?.value;

  return (
    <div>
      <Link
        href="/admin/register"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-zam-muted hover:text-zam-ink"
      >
        <ArrowLeft size={14} /> Right-holders
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-zam-ink">{h.displayName}</h1>
          <p className="text-sm text-zam-muted">
            {h.kind}
            {h.status && ` · ${h.status.toLowerCase()}`}
            {h.isAffiliated && ` · affiliated${h.affiliatedFrom ? ` since ${h.affiliatedFrom}` : ""}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => {
            setTab("main");
            setEditing(true);
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-white px-3 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8]"
        >
          <Pencil size={13} /> Edit
        </button>
        {h.member ? (
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/members/${h.member.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zam-line bg-white px-3 py-2 text-sm font-semibold text-zam-orange"
            >
              <Link2 size={14} /> Portal member {h.member.memberNumber}
            </Link>
            <button
              disabled={busy}
              onClick={() =>
                window.confirm("Unlink this register entry from the member? Their account keeps the details already copied.") &&
                link({ unlink: true }, "Unlinked.")
              }
              className="text-xs font-semibold text-zam-muted underline hover:text-zam-red"
            >
              Unlink
            </button>
          </div>
        ) : (
          <span className="rounded-sm bg-zam-canvas px-3 py-1.5 text-sm text-zam-muted">No portal account</span>
        )}
        </div>
      </div>

      <Tabs
        className="mb-3"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "main", label: "Main" },
          { key: "works", label: "Works", count: d.shareCount },
          { key: "audit", label: "Audit" },
        ]}
      />

      {editing && tab === "main" && (
        <HolderEditForm
          holder={{ ...h, firstName: h.firstName ?? "", lastName: h.lastName ?? "" }}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            setTick((t) => t + 1);
          }}
        />
      )}

      {tab === "audit" && (
        <Panel title="Changes to this right-holder">
          <AuditTrail targetType="Right-holder" targetId={id} />
        </Panel>
      )}

      {!editing && tab === "main" && !h.member && (
        <div className="mb-5">
          <Panel title="Link to a portal member">
            <div className="space-y-3 px-5 py-4">
              <p className="text-sm text-zam-muted">
                If this person already has a portal account (for example under a stage name), link it here. Their works and IPI details then
                show on their member page, and the society&apos;s details are copied onto the account.
              </p>
              {d.suggestions.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-zam-muted">Possible matches</p>
                  <ul className="divide-y divide-zam-line rounded-xl border border-zam-line">
                    {d.suggestions.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                        <span>
                          <span className="font-semibold">{m.fullName}</span>
                          {m.stageName && <span className="text-zam-muted"> · {m.stageName}</span>}
                          <span className="ml-2 font-mono text-xs text-zam-muted">{m.memberNumber}</span>
                        </span>
                        <button
                          disabled={busy}
                          onClick={() => link({ memberId: m.id }, `Linked to ${m.memberNumber}.`)}
                          className="rounded-lg bg-zam-orange px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                        >
                          Link
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <input
                value={mq}
                onChange={(e) => setMq(e.target.value)}
                placeholder="Search members by name, stage name, number or email…"
                className="field-input h-10 w-full max-w-md"
              />
              {found.length > 0 && (
                <ul className="divide-y divide-zam-line rounded-xl border border-zam-line">
                  {found.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span>
                        <span className="font-semibold">{m.fullName}</span>
                        {m.stageName && <span className="text-zam-muted"> · {m.stageName}</span>}
                        <span className="ml-2 font-mono text-xs text-zam-muted">{m.memberNumber}</span>
                        {m.rightHolder && <span className="ml-2 text-xs text-zam-red">already linked to {m.rightHolder.displayName}</span>}
                      </span>
                      <button
                        disabled={busy || !!m.rightHolder}
                        onClick={() => link({ memberId: m.id }, `Linked to ${m.memberNumber}.`)}
                        className="rounded-lg bg-zam-orange px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        Link
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>
        </div>
      )}

      {!h.member && (
        <div className="mb-5">
          <Panel title="Portal invitation">
            <div className="space-y-3 px-5 py-4">
              <p className="text-sm text-zam-muted">
                This person is on the society&apos;s register but has no portal account. Add an email address and send an invitation:
                signing up through the link creates their account and links it to this record.
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="field-input h-10 w-72"
                />
                <button
                  disabled={busy || email.trim().toLowerCase() === d.invite.typedEmail}
                  onClick={() => call({ email }, "Email saved.")}
                  className="h-10 rounded-xl border border-zam-line bg-white px-3.5 text-sm font-semibold text-zam-ink disabled:opacity-40"
                >
                  Save email
                </button>
                <button
                  disabled={
                    busy || !d.invite.email || !d.invite.canSend || email.trim().toLowerCase() !== (d.invite.typedEmail || d.invite.email)
                  }
                  onClick={() => call({ send: true }, "Invitation sent to {to}.")}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-zam-orange px-3.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  <Send size={14} /> {d.invite.sentAt ? "Send again" : "Send invitation"}
                </button>
              </div>
              {d.invite.sentAt && (
                <p className="text-xs text-zam-muted">
                  Last sent {new Date(d.invite.sentAt).toLocaleString()} ({d.invite.count} sent in all)
                  {d.invite.expiresAt &&
                    ` · link ${new Date(d.invite.expiresAt) > new Date() ? "expires" : "expired"} ${new Date(d.invite.expiresAt).toLocaleDateString()}`}
                  . Sending again replaces the earlier link.
                </p>
              )}
              {!d.invite.canSend && (
                <p className="text-xs text-zam-red">
                  Email sending is not set up on the server yet (RESEND_API_KEY), so invitations cannot be sent.
                </p>
              )}
              {!d.invite.email && <p className="text-xs text-zam-muted">No email is on file — type one above and save it.</p>}
            </div>
          </Panel>
        </div>
      )}

      {!editing && tab === "main" && (
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Identity" collapsible>
          <dl className="px-5 py-2">
            <Row k="IPI name number" v={h.ipiNumber} />
            <Row k="IPI base number" v={h.ipiBaseNumber} />
            <Row k="WIPOCOS ID" v={wipocos} />
            <Row k="NRC / ID" v={h.nrc} />
            <Row k="WIPO Connect ID" v={h.wipoId} />
            <Row k="Sex" v={h.sex} />
            <Row k="Born" v={h.birthDate} />
            <Row k="Died" v={h.deathDate} />
            <Row k="Region" v={h.region} />
            <Row k="Next of kin" v={h.nextOfKin} />
            <Row k="Spouse" v={h.spouse} />
            {h.member && <Row k="Linked to portal by" v={h.matchedBy} />}
          </dl>
        </Panel>

        <div className="space-y-5">
          <Panel title={`Addresses (${h.addresses.length})`}>
            <ul className="divide-y divide-zam-line">
              {h.addresses.map((a) => (
                <li key={a.id} className="px-5 py-3 text-sm">
                  {[a.line1, a.line2, a.line3, a.city, a.province, a.postcode].filter(Boolean).join(", ") || "—"}
                  {a.addressType && <span className="ml-2 text-[11px] text-zam-muted">{a.addressType}</span>}
                </li>
              ))}
              {h.addresses.length === 0 && <li className="px-5 py-3 text-sm text-zam-muted">None on file.</li>}
            </ul>
          </Panel>
          <Panel title={`Contacts (${h.contacts.length})`}>
            <ul className="divide-y divide-zam-line">
              {h.contacts.map((c) => (
                <li key={c.id} className="px-5 py-3 text-sm">
                  {[c.email, c.phone, c.value]
                    .filter(Boolean)
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .join(" · ") || "—"}
                  {c.contactType && <span className="ml-2 text-[11px] text-zam-muted">{c.contactType}</span>}
                </li>
              ))}
              {h.contacts.length === 0 && <li className="px-5 py-3 text-sm text-zam-muted">None on file.</li>}
            </ul>
          </Panel>
          {h.names.length > 1 && (
            <Panel title={`Known names (${h.names.length})`}>
              <ul className="divide-y divide-zam-line">
                {h.names.map((n) => (
                  <li key={n.id} className="flex justify-between px-5 py-3 text-sm">
                    <span>{[n.firstName, n.name].filter(Boolean).join(" ")}</span>
                    <span className="font-mono text-xs text-zam-muted">{n.ipiNameNumber}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
      )}

      {tab === "works" && (
      <div>
        <Panel
          title={`Works (${d.shareCount.toLocaleString()} shares)`}
          right={
            d.distributions.lines > 0 && (
              <span className="text-xs text-zam-muted">
                {d.distributions.lines.toLocaleString()} distribution lines ·{" "}
                {d.distributions.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} allocated
              </span>
            )
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-zam-line bg-zam-canvas/60">
                  <Th>Work</Th>
                  <Th>ISWC</Th>
                  <Th>Role</Th>
                  <Th>Right</Th>
                  <Th className="text-right">Share</Th>
                  <Th>Territory</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zam-line">
                {d.shares.map((s) => (
                  <tr key={s.id}>
                    <Td className="font-medium">
                      <Link href={`/admin/catalogue/${s.work.id}`} className="hover:text-zam-orange">
                        {s.work.title}
                      </Link>
                    </Td>
                    <Td className="font-mono text-xs">{s.work.iswc || "—"}</Td>
                    <Td>
                      {s.roleCode}
                      {s.isPublisher && " (publisher)"}
                    </Td>
                    <Td>{s.rightType || "—"}</Td>
                    <Td className="text-right tabular-nums">{s.share}</Td>
                    <Td className="text-xs text-zam-muted">{s.territoryFormula || "—"}</Td>
                  </tr>
                ))}
                {d.shares.length === 0 && (
                  <tr>
                    <Td colSpan={6} className="py-8 text-center text-zam-muted">
                      No works on the register.
                    </Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {d.shareCount > d.shares.length && (
            <p className="border-t border-zam-line px-5 py-3 text-xs text-zam-muted">
              Showing the first {d.shares.length} of {d.shareCount.toLocaleString()}.
            </p>
          )}
        </Panel>
      </div>
      )}
    </div>
  );
}
