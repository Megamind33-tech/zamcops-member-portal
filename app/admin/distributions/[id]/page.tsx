"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { AdminStat, Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";
import { formatKwacha } from "@/lib/format";
import { CalendarRange, Coins, Users, FileText } from "lucide-react";

type Row = Record<string, string | number | boolean | null>;
type Result = {
  distribution: {
    id: string;
    periodLabel: string;
    code: string;
    status: string;
    notes: string;
    startDate: string;
    endDate: string;
    publishedAt: string | null;
    imported: boolean;
    entryCount: number;
  };
  summary: { lines: number; holders: number; works: number; amount: number; total: number; adminFee: number; reserved: number; disputed: number };
  view: "holders" | "works" | "lines";
  page: number;
  pageSize: number;
  total: number;
  rows: Row[];
};

const VIEWS = [
  { key: "holders", label: "By right-holder" },
  { key: "works", label: "By work" },
  { key: "lines", label: "Every line" },
] as const;

export default function DistributionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [view, setView] = useState<"holders" | "works" | "lines">("holders");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);
  const [editing, setEditing] = useState(false);
  const [meta, setMeta] = useState({ periodLabel: "", code: "", startDate: "", endDate: "", notes: "" });
  const [lineEdit, setLineEdit] = useState<{ id: string; amount: string; adminFee: string; reserved: string; disputed: boolean } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const ctl = new AbortController();
    const params = new URLSearchParams({ view, q: term, page: String(page) });
    setErr("");
    fetch(`/api/admin/registry/distributions/${id}?${params}`, { signal: ctl.signal, cache: "no-store" })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error ?? `Could not load this distribution (${r.status}).`);
        setData(b as Result);
      })
      .catch((e) => e.name !== "AbortError" && setErr(e.message));
    return () => ctl.abort();
  }, [id, view, term, page, tick]);

  const d = data?.distribution;
  const startEdit = useCallback(() => {
    if (!d) return;
    setMeta({ periodLabel: d.periodLabel, code: d.code, startDate: d.startDate, endDate: d.endDate, notes: d.notes });
    setEditing(true);
  }, [d]);

  const saveMeta = async () => {
    const r = await fetch("/api/admin/distributions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...meta }),
    });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return toast.error(b.error ?? "Could not save.");
    toast.success("Distribution updated.");
    setEditing(false);
    setTick((t) => t + 1);
  };

  const saveLine = async () => {
    if (!lineEdit) return;
    const r = await fetch(`/api/admin/registry/distributions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineId: lineEdit.id, amount: lineEdit.amount, adminFee: lineEdit.adminFee, reserved: lineEdit.reserved, disputed: lineEdit.disputed }),
    });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return toast.error(b.error ?? "Could not save the line.");
    toast.success("Line updated.");
    setLineEdit(null);
    setTick((t) => t + 1);
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const csvHref = `/api/admin/registry/distributions/${id}?${new URLSearchParams({ view, q: term, format: "csv" })}`;

  if (err && !data)
    return (
      <div>
        <Link href="/admin/distributions" className="mb-4 inline-flex items-center gap-1 text-sm text-zam-muted hover:text-zam-ink">
          <ArrowLeft size={14} /> Distributions
        </Link>
        <p className="rounded-xl bg-zam-red/10 px-4 py-3 text-sm text-zam-red">
          {err}{" "}
          <button onClick={() => setTick((t) => t + 1)} className="font-semibold underline">
            Retry
          </button>
        </p>
      </div>
    );
  if (!data || !d)
    return (
      <div className="grid h-40 place-items-center">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-zam-line border-t-zam-orange" />
      </div>
    );

  const s = data.summary;
  const range = [d.startDate, d.endDate].filter(Boolean).join(" → ");

  return (
    <div>
      <Link href="/admin/distributions" className="mb-3 inline-flex items-center gap-1 text-sm text-zam-muted hover:text-zam-ink">
        <ArrowLeft size={14} /> Distributions
      </Link>
      <AdminHeader
        title={d.periodLabel}
        subtitle={[d.code && `Code ${d.code}`, range, d.imported ? "Imported from WIPO Connect" : "Created in the portal"].filter(Boolean).join(" · ")}
        right={
          <div className="flex items-center gap-2">
            <StatusBadge status={d.status} />
            <button onClick={startEdit} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-3.5 text-sm font-semibold text-zam-ink ring-1 ring-zam-line hover:bg-zam-canvas">
              <Pencil size={14} /> Edit details
            </button>
          </div>
        }
      />

      {editing && (
        <Panel
          title="Edit distribution details"
          right={
            <button onClick={() => setEditing(false)} aria-label="Cancel" className="text-zam-muted hover:text-zam-ink">
              <X size={16} />
            </button>
          }
        >
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-zam-muted">Name / label</span>
              <input value={meta.periodLabel} onChange={(e) => setMeta({ ...meta, periodLabel: e.target.value })} className="field-input h-10 w-full" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-zam-muted">Code</span>
              <input value={meta.code} onChange={(e) => setMeta({ ...meta, code: e.target.value })} className="field-input h-10 w-full" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-zam-muted">Start date</span>
              <input type="date" value={meta.startDate} onChange={(e) => setMeta({ ...meta, startDate: e.target.value })} className="field-input h-10 w-full" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-zam-muted">End date</span>
              <input type="date" value={meta.endDate} onChange={(e) => setMeta({ ...meta, endDate: e.target.value })} className="field-input h-10 w-full" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-zam-muted">Notes</span>
              <textarea rows={3} value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} className="field-input w-full" />
            </label>
            <div className="sm:col-span-2">
              <button onClick={saveMeta} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-zam-orange px-4 text-sm font-semibold text-white">
                <Save size={14} /> Save
              </button>
            </div>
          </div>
        </Panel>
      )}

      <div className="mb-6 mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AdminStat icon={<Coins size={18} />} label="Allocated" value={formatKwacha(s.amount)} tone="amber" />
        <AdminStat icon={<Users size={18} />} label="Right-holders paid" value={s.holders.toLocaleString()} />
        <AdminStat icon={<FileText size={18} />} label="Works" value={s.works.toLocaleString()} tone="gold" />
        <AdminStat icon={<CalendarRange size={18} />} label={`Lines${s.disputed ? ` · ${s.disputed} disputed` : ""}`} value={s.lines.toLocaleString()} tone="emerald" />
      </div>
      {(s.adminFee > 0 || s.reserved > 0) && (
        <p className="mb-4 text-xs text-zam-muted">
          Admin fee withheld {formatKwacha(s.adminFee)} · Reserved {formatKwacha(s.reserved)} · Gross {formatKwacha(s.total)}
        </p>
      )}
      {d.notes && <p className="mb-4 rounded-xl bg-zam-canvas px-4 py-3 text-sm text-zam-muted">{d.notes}</p>}
      {s.lines === 0 && (
        <p className="mb-4 rounded-xl bg-zam-amber/10 px-4 py-3 text-sm text-[#9a6a00]">
          This period has no allocation lines.
          {d.entryCount > 0 ? ` It has ${d.entryCount} member payouts — manage them from the Distributions list.` : " Import the WIPO Connect export to bring in past allocations."}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => {
              setView(v.key);
              setPage(1);
              setLineEdit(null);
            }}
            className={
              "inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors " +
              (view === v.key ? "border-zam-orange bg-zam-orange text-white" : "border-zam-line bg-white text-zam-muted hover:bg-zam-canvas hover:text-zam-ink")
            }
          >
            {v.label}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, IPI, work…" className="field-input ml-auto h-9 w-64" />
        <a href={csvHref} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-semibold text-zam-ink ring-1 ring-zam-line hover:bg-zam-canvas">
          <Download size={14} /> CSV
        </a>
      </div>

      {err && <p className="mb-3 rounded-xl bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}

      <Panel
        title={`${data.total.toLocaleString()} ${view === "holders" ? "right-holders" : view === "works" ? "works" : "lines"}`}
        right={
          <div className="flex items-center gap-2 text-xs text-zam-muted">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-zam-line bg-white disabled:opacity-40" aria-label="Previous page">
              <ChevronLeft size={14} />
            </button>
            <span>
              Page {page} of {pages.toLocaleString()}
            </span>
            <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-zam-line bg-white disabled:opacity-40" aria-label="Next page">
              <ChevronRight size={14} />
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          {view === "lines" ? (
            <table className="w-full min-w-[960px]">
              <thead className="bg-zam-canvas">
                <tr>
                  <Th>Right-holder</Th>
                  <Th>Work</Th>
                  <Th>Role</Th>
                  <Th>Right</Th>
                  <Th className="text-right">Amount</Th>
                  <Th className="text-right">Admin fee</Th>
                  <Th className="text-right">Reserved</Th>
                  <Th>Disputed</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-zam-line">
                {data.rows.map((r) => {
                  const rid = String(r.id);
                  const on = lineEdit?.id === rid;
                  return (
                    <tr key={rid} className="hover:bg-zam-canvas/50">
                      <Td>{r.holderId ? <Link className="font-semibold hover:text-zam-orange" href={`/admin/register/${r.holderId}`}>{String(r.holder)}</Link> : String(r.holder)}</Td>
                      <Td>{r.workId ? <Link className="hover:text-zam-orange" href={`/admin/catalogue/${r.workId}`}>{String(r.work)}</Link> : String(r.work)}</Td>
                      <Td className="font-mono text-xs">{String(r.roleCode) || "—"}</Td>
                      <Td className="text-xs">{String(r.rightType) || "—"}</Td>
                      {on ? (
                        <>
                          <Td className="text-right"><input value={lineEdit.amount} onChange={(e) => setLineEdit({ ...lineEdit, amount: e.target.value })} className="field-input h-9 w-28 text-right" inputMode="decimal" /></Td>
                          <Td className="text-right"><input value={lineEdit.adminFee} onChange={(e) => setLineEdit({ ...lineEdit, adminFee: e.target.value })} className="field-input h-9 w-24 text-right" inputMode="decimal" /></Td>
                          <Td className="text-right"><input value={lineEdit.reserved} onChange={(e) => setLineEdit({ ...lineEdit, reserved: e.target.value })} className="field-input h-9 w-24 text-right" inputMode="decimal" /></Td>
                          <Td><input type="checkbox" checked={lineEdit.disputed} onChange={(e) => setLineEdit({ ...lineEdit, disputed: e.target.checked })} className="h-4 w-4" /></Td>
                          <Td>
                            <div className="flex gap-1">
                              <button onClick={saveLine} className="rounded-lg bg-zam-orange px-2.5 py-1.5 text-xs font-semibold text-white">Save</button>
                              <button onClick={() => setLineEdit(null)} className="rounded-lg bg-zam-canvas px-2.5 py-1.5 text-xs font-semibold">Cancel</button>
                            </div>
                          </Td>
                        </>
                      ) : (
                        <>
                          <Td className="text-right tabular-nums text-zam-orange">{formatKwacha(Number(r.amount))}</Td>
                          <Td className="text-right tabular-nums">{formatKwacha(Number(r.adminFee))}</Td>
                          <Td className="text-right tabular-nums">{formatKwacha(Number(r.reserved))}</Td>
                          <Td>{r.disputed ? <span className="text-xs font-semibold text-zam-red">Disputed</span> : "—"}</Td>
                          <Td>
                            <button onClick={() => setLineEdit({ id: rid, amount: String(r.amount), adminFee: String(r.adminFee), reserved: String(r.reserved), disputed: !!r.disputed })} className="rounded-lg bg-zam-canvas px-2.5 py-1.5 text-xs font-semibold text-zam-ink hover:bg-zam-line/60">
                              Edit
                            </button>
                          </Td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[720px]">
              <thead className="bg-zam-canvas">
                <tr>
                  <Th>{view === "holders" ? "Right-holder" : "Work"}</Th>
                  <Th>{view === "holders" ? "IPI" : "ISWC"}</Th>
                  <Th className="text-right">Lines</Th>
                  <Th className="text-right">Allocated</Th>
                  <Th className="text-right">Admin fee</Th>
                  <Th className="text-right">Reserved</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zam-line">
                {data.rows.map((r, i) => (
                  <tr key={String(r.id ?? i)} className="hover:bg-zam-canvas/50">
                    <Td className="font-semibold">
                      {r.id ? (
                        <Link href={view === "holders" ? `/admin/register/${r.id}` : `/admin/catalogue/${r.id}`} className="hover:text-zam-orange">
                          {String(r.name)}
                        </Link>
                      ) : (
                        String(r.name)
                      )}
                    </Td>
                    <Td className="font-mono text-xs">{String(r.ipiNumber) || "—"}</Td>
                    <Td className="text-right tabular-nums">{Number(r.lines)}</Td>
                    <Td className="text-right tabular-nums text-zam-orange">{formatKwacha(Number(r.amount))}</Td>
                    <Td className="text-right tabular-nums">{formatKwacha(Number(r.adminFee))}</Td>
                    <Td className="text-right tabular-nums">{formatKwacha(Number(r.reserved))}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {data.rows.length === 0 && <p className="px-5 py-8 text-center text-sm text-zam-muted">Nothing to show{term ? " for that search" : ""}.</p>}
        </div>
      </Panel>
    </div>
  );
}
