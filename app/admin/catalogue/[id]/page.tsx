"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";
import { HolderPicker } from "@/components/admin/HolderPicker";
import { Tabs, Field } from "@/components/admin/ui";
import { AuditTrail } from "@/components/admin/AuditTrail";
import { formatKwacha } from "@/lib/format";

type Share = {
  id: string;
  rightHolderId: string | null;
  nameId: string | null;
  holderName: string;
  ipiNumber: string;
  roleCode: string;
  isPublisher: boolean;
  rightType: string;
  share: number;
  territoryFormula: string;
  validFrom: string;
  validTo: string;
};
type Detail = {
  work: {
    id: string;
    wipoId: string;
    title: string;
    alternativeTitles: string[];
    status: string;
    registeredAt: string;
    domestic: boolean;
    iswc: string;
    isrc: string;
    identifiers: { code: string; label: string; value: string }[];
    genre: string;
    dates: { code: string; value: string; territory: string }[];
    extra: Record<string, string>;
    notes: string;
    createdAt: string;
  };
  declaration: { id: string; title: string; status: string } | null;
  shares: Share[];
  distributions: {
    distribution: { id: string; periodLabel: string; code: string; startDate: string; endDate: string; status: string } | null;
    lines: number;
    amount: number;
    total: number;
    adminFee: number;
    reserved: number;
  }[];
};

const RIGHT_TYPES = ["Performing", "Mechanical", "Synchronisation", "Print", "Other"];

const Label = ({ children }: { children: React.ReactNode }) => (
  <span className="mb-1.5 block text-xs font-semibold text-zam-muted">{children}</span>
);

export default function WorkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState("");
  const [form, setForm] = useState<Detail["work"] | null>(null);
  const [shares, setShares] = useState<Share[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"main" | "detail" | "history" | "audit">("main");

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/registry/works/${id}`, { cache: "no-store" });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? `Could not load this work (${r.status}).`);
      setD(b);
      setForm(b.work);
      setShares(b.shares);
      setDirty(false);
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load this work.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // warn before leaving with unsaved edits
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const set = <K extends keyof Detail["work"]>(k: K, v: Detail["work"][K]) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
    setDirty(true);
  };
  const setShare = (i: number, patch: Partial<Share>) => {
    setShares((s) => s.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
    setDirty(true);
  };

  const totals = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of shares) m.set(s.rightType || "Unspecified", (m.get(s.rightType || "Unspecified") ?? 0) + (Number(s.share) || 0));
    return [...m.entries()];
  }, [shares]);
  const overs = totals.filter(([, t]) => t > 100.01);

  const save = async () => {
    if (!form) return;
    if (!form.title.trim()) return toast.error("The work needs a title.");
    if (overs.length) return toast.error(`${overs[0][0]} shares total more than 100%.`);
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/registry/works/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          alternativeTitles: form.alternativeTitles,
          status: form.status,
          registeredAt: form.registeredAt,
          domestic: form.domestic,
          iswc: form.iswc,
          isrc: form.isrc,
          genre: form.genre,
          notes: form.notes,
          identifiers: form.identifiers,
          shares: shares.map((s) => ({
            rightHolderId: s.rightHolderId,
            nameId: s.nameId,
            roleCode: s.roleCode,
            isPublisher: s.isPublisher,
            rightType: s.rightType,
            share: s.share,
            territoryFormula: s.territoryFormula,
            validFrom: s.validFrom,
            validTo: s.validTo,
          })),
        }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? "Could not save.");
      toast.success("Work saved.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!form || !window.confirm(`Remove “${form.title}” from the register? Its shares are removed too and past distribution lines lose their link to it. This can't be undone.`)) return;
    const r = await fetch(`/api/admin/registry/works/${id}`, { method: "DELETE" });
    if (!r.ok) return toast.error("Could not remove the work.");
    toast.success("Removed from the register.");
    router.push("/admin/catalogue");
  };

  if (err)
    return (
      <div>
        <Link href="/admin/catalogue" className="mb-4 inline-flex items-center gap-1 text-sm text-zam-muted hover:text-zam-ink">
          <ArrowLeft size={14} /> Registered Works
        </Link>
        <p className="rounded-xl bg-zam-red/10 px-4 py-3 text-sm text-zam-red">
          {err}{" "}
          <button onClick={load} className="font-semibold underline">
            Retry
          </button>
        </p>
      </div>
    );
  if (!d || !form)
    return (
      <div className="grid h-40 place-items-center">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-zam-line border-t-zam-orange" />
      </div>
    );

  return (
    <div className="pb-24">
      <Link href="/admin/catalogue" className="mb-3 inline-flex items-center gap-1 text-sm text-zam-muted hover:text-zam-ink">
        <ArrowLeft size={14} /> Registered Works
      </Link>
      <AdminHeader
        title={d.work.title}
        subtitle={`WIPO id ${d.work.wipoId.startsWith("local_") ? "— (added here)" : d.work.wipoId}${d.declaration ? ` · from member declaration “${d.declaration.title}”` : ""}`}
        right={d.work.status ? <StatusBadge status={d.work.status === "ACTIVE" ? "Active" : d.work.status} /> : undefined}
      />

      <Tabs
        className="mb-3"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "main", label: "Main" },
          { key: "detail", label: "Detail" },
          { key: "history", label: "Distribution History", count: d.distributions.length },
          { key: "audit", label: "Audit" },
        ]}
      />

      <div className="space-y-3">
        {tab === "main" && (
        <>
        <Panel title="Main information" collapsible>
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block sm:col-span-2">
              <Label>Title</Label>
              <input value={form.title} onChange={(e) => set("title", e.target.value)} className="field-input h-10 w-full" />
            </label>
            <label className="block">
              <Label>Status</Label>
              <input value={form.status} onChange={(e) => set("status", e.target.value)} list="work-statuses" className="field-input h-10 w-full" />
              <datalist id="work-statuses">
                {["ACTIVE", "PENDING", "DISPUTED", "SUSPENDED", "WITHDRAWN"].map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <Label>ISWC</Label>
              <input value={form.iswc} onChange={(e) => set("iswc", e.target.value)} className="field-input h-10 w-full font-mono" />
            </label>
            <label className="block">
              <Label>ISRC</Label>
              <input value={form.isrc} onChange={(e) => set("isrc", e.target.value)} className="field-input h-10 w-full font-mono" />
            </label>
            <label className="block">
              <Label>Genre</Label>
              <input value={form.genre} onChange={(e) => set("genre", e.target.value)} className="field-input h-10 w-full" />
            </label>
            <label className="block">
              <Label>Registration date</Label>
              <input type="date" value={form.registeredAt} onChange={(e) => set("registeredAt", e.target.value)} className="field-input h-10 w-full" />
            </label>
            <label className="flex items-center gap-2 pt-6 text-sm font-medium text-zam-ink">
              <input type="checkbox" checked={form.domestic} onChange={(e) => set("domestic", e.target.checked)} className="h-4 w-4 accent-[var(--zam-orange,#e8590c)]" />
              Domestic work
            </label>

            <div className="sm:col-span-2 lg:col-span-3">
              <Label>Alternative titles (one per line)</Label>
              <textarea
                rows={Math.max(2, form.alternativeTitles.length + 1)}
                value={form.alternativeTitles.join("\n")}
                onChange={(e) => set("alternativeTitles", e.target.value.split("\n"))}
                className="field-input w-full"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <Label>Other identifiers</Label>
              <div className="space-y-2">
                {form.identifiers.map((idf, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2">
                    <input
                      value={idf.label || idf.code}
                      onChange={(e) => set("identifiers", form.identifiers.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                      placeholder="Type (e.g. ISWC)"
                      className="field-input col-span-4 h-9"
                    />
                    <input
                      value={idf.value}
                      onChange={(e) => set("identifiers", form.identifiers.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                      placeholder="Value"
                      className="field-input col-span-7 h-9 font-mono"
                    />
                    <button type="button" onClick={() => set("identifiers", form.identifiers.filter((_, j) => j !== i))} aria-label="Remove identifier" className="col-span-1 grid h-9 place-items-center rounded-lg text-zam-muted hover:bg-zam-red/10 hover:text-zam-red">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => set("identifiers", [...form.identifiers, { code: "", label: "", value: "" }])} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-zam-orange">
                <Plus size={13} /> Add identifier
              </button>
            </div>

            <label className="block sm:col-span-2 lg:col-span-3">
              <Label>Notes</Label>
              <textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} className="field-input w-full" />
            </label>
          </div>
        </Panel>

        <Panel
          title={`Shares (${shares.length})`}
          right={
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {totals.map(([t, v]) => (
                <span key={t} className={v > 100.01 ? "font-bold text-zam-red" : Math.abs(v - 100) < 0.01 ? "font-semibold text-zam-green" : "text-zam-muted"}>
                  {t} {Math.round(v * 100) / 100}%
                </span>
              ))}
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-zam-canvas">
                <tr>
                  <Th>Right-holder</Th>
                  <Th>Role</Th>
                  <Th>Right type</Th>
                  <Th className="text-right">Share %</Th>
                  <Th>Territory</Th>
                  <Th>Valid from</Th>
                  <Th>Valid to</Th>
                  <Th>Publisher</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-zam-line">
                {shares.map((s, i) => (
                  <tr key={s.id || i} className="align-top">
                    <Td className="w-[260px]">
                      <HolderPicker
                        value={s.rightHolderId || s.holderName ? { id: s.rightHolderId, name: s.holderName } : null}
                        onPick={(h) =>
                          setShare(i, h ? { rightHolderId: h.id, holderName: h.displayName, ipiNumber: h.ipiNumber, nameId: null } : { rightHolderId: null, holderName: "", ipiNumber: "", nameId: null })
                        }
                      />
                      {s.rightHolderId && (
                        <Link href={`/admin/register/${s.rightHolderId}`} className="mt-1 block text-[11px] text-zam-muted hover:text-zam-orange">
                          IPI {s.ipiNumber || "—"} · open record
                        </Link>
                      )}
                    </Td>
                    <Td>
                      <input value={s.roleCode} onChange={(e) => setShare(i, { roleCode: e.target.value.toUpperCase() })} className="field-input h-10 w-20 font-mono" maxLength={6} aria-label="Role code" />
                    </Td>
                    <Td>
                      <input value={s.rightType} onChange={(e) => setShare(i, { rightType: e.target.value })} list="right-types" className="field-input h-10 w-36" aria-label="Right type" />
                    </Td>
                    <Td className="text-right">
                      <input type="number" min={0} max={100} step={0.01} value={s.share} onChange={(e) => setShare(i, { share: e.target.value === "" ? 0 : Number(e.target.value) })} className="field-input h-10 w-24 text-right" aria-label="Share percent" />
                    </Td>
                    <Td>
                      <input value={s.territoryFormula} onChange={(e) => setShare(i, { territoryFormula: e.target.value })} className="field-input h-10 w-32" aria-label="Territory" />
                    </Td>
                    <Td>
                      <input type="date" value={s.validFrom} onChange={(e) => setShare(i, { validFrom: e.target.value })} className="field-input h-10 w-36" aria-label="Valid from" />
                    </Td>
                    <Td>
                      <input type="date" value={s.validTo} onChange={(e) => setShare(i, { validTo: e.target.value })} className="field-input h-10 w-36" aria-label="Valid to" />
                    </Td>
                    <Td className="text-center">
                      <input type="checkbox" checked={s.isPublisher} onChange={(e) => setShare(i, { isPublisher: e.target.checked })} className="mt-3 h-4 w-4" aria-label="Is publisher" />
                    </Td>
                    <Td>
                      <button type="button" onClick={() => { setShares((x) => x.filter((_, j) => j !== i)); setDirty(true); }} aria-label="Remove share" className="mt-1 grid h-8 w-8 place-items-center rounded-lg text-zam-muted hover:bg-zam-red/10 hover:text-zam-red">
                        <Trash2 size={15} />
                      </button>
                    </Td>
                  </tr>
                ))}
                {shares.length === 0 && (
                  <tr>
                    <Td colSpan={9} className="py-8 text-center text-zam-muted">
                      No shares recorded for this work yet.
                    </Td>
                  </tr>
                )}
              </tbody>
            </table>
            <datalist id="right-types">
              {RIGHT_TYPES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div className="border-t border-zam-line px-5 py-3">
            <button
              type="button"
              onClick={() => {
                setShares((x) => [...x, { id: "", rightHolderId: null, nameId: null, holderName: "", ipiNumber: "", roleCode: "", isPublisher: false, rightType: x[x.length - 1]?.rightType ?? "", share: 0, territoryFormula: "", validFrom: "", validTo: "" }]);
                setDirty(true);
              }}
              className="inline-flex items-center gap-1 text-sm font-semibold text-zam-orange"
            >
              <Plus size={14} /> Add a share
            </button>
          </div>
        </Panel>

        </>
        )}

        {tab === "history" && (
        <Panel title="List of distributions">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-zam-canvas">
                <tr>
                  <Th>Distribution</Th>
                  <Th>Period</Th>
                  <Th className="text-right">Lines</Th>
                  <Th className="text-right">Allocated</Th>
                  <Th className="text-right">Admin fee</Th>
                  <Th className="text-right">Reserved</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zam-line">
                {d.distributions.map((x, i) => (
                  <tr key={x.distribution?.id ?? i} className="hover:bg-zam-canvas/50">
                    <Td className="font-semibold">
                      {x.distribution ? (
                        <Link href={`/admin/distributions/${x.distribution.id}`} className="hover:text-zam-orange">
                          {x.distribution.periodLabel}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td className="text-xs text-zam-muted">{x.distribution ? [x.distribution.startDate, x.distribution.endDate].filter(Boolean).join(" → ") || "—" : "—"}</Td>
                    <Td className="text-right tabular-nums">{x.lines}</Td>
                    <Td className="text-right tabular-nums text-zam-orange">{formatKwacha(x.amount)}</Td>
                    <Td className="text-right tabular-nums">{formatKwacha(x.adminFee)}</Td>
                    <Td className="text-right tabular-nums">{formatKwacha(x.reserved)}</Td>
                  </tr>
                ))}
                {d.distributions.length === 0 && (
                  <tr>
                    <Td colSpan={6} className="py-8 text-center text-zam-muted">
                      This work has not been paid in any imported distribution.
                    </Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        )}

        {tab === "audit" && (
          <Panel title="Changes to this work">
            <AuditTrail targetType="Register work" targetId={id} />
          </Panel>
        )}

        {tab === "detail" && (
          <>
          <Panel title="General information">
            <dl className="grid gap-x-8 gap-y-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="WIPO id">{d.work.wipoId.startsWith("local_") ? "Added in the portal" : d.work.wipoId}</Field>
              <Field label="Status">{d.work.status}</Field>
              <Field label="Registered">{d.work.registeredAt}</Field>
              <Field label="Origin">{d.work.domestic ? "Domestic" : "International"}</Field>
              <Field label="Member declaration">
                {d.declaration ? (
                  <Link href={`/admin/works`} className="text-zam-orange hover:underline">
                    {d.declaration.title} ({d.declaration.status})
                  </Link>
                ) : null}
              </Field>
              <Field label="Created in the portal">{new Date(d.work.createdAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}</Field>
            </dl>
          </Panel>
          {(d.work.dates.length > 0 || Object.keys(d.work.extra).length > 0) && (
          <Panel title="Additional information (imported from WIPO Connect)">
            <dl className="grid gap-x-8 gap-y-1 p-5 sm:grid-cols-2">
              {d.work.dates.map((x, i) => (
                <div key={`d${i}`} className="flex justify-between gap-4 border-b border-zam-line/60 py-2 text-sm">
                  <dt className="text-zam-muted">{x.code}{x.territory ? ` (${x.territory})` : ""}</dt>
                  <dd className="font-medium">{x.value || "—"}</dd>
                </div>
              ))}
              {Object.entries(d.work.extra).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-zam-line/60 py-2 text-sm">
                  <dt className="text-zam-muted">{k.replace(/_/g, " ")}</dt>
                  <dd className="text-right font-medium">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          )}
          </>
        )}

        <div>
          <button onClick={remove} className="inline-flex items-center gap-1.5 rounded-xl bg-zam-red/10 px-3.5 py-2 text-sm font-semibold text-zam-red hover:bg-zam-red/20">
            <Trash2 size={15} /> Remove from register
          </button>
        </div>
      </div>

      {/* sticky save bar */}
      <div className={`fixed inset-x-0 bottom-0 z-30 border-t border-zam-line bg-white/95 px-4 py-3 backdrop-blur transition-transform lg:left-[250px] ${dirty ? "translate-y-0" : "translate-y-full"}`}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <span className="text-sm text-zam-muted">{overs.length ? <span className="font-semibold text-zam-red">{overs[0][0]} shares are over 100%</span> : "You have unsaved changes."}</span>
          <div className="flex gap-2">
            <button onClick={load} disabled={saving} className="h-10 rounded-xl bg-zam-canvas px-4 text-sm font-semibold text-zam-ink ring-1 ring-zam-line">
              Discard
            </button>
            <button onClick={save} disabled={saving || overs.length > 0} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-zam-orange px-5 text-sm font-semibold text-white disabled:opacity-50">
              <Save size={15} /> {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
