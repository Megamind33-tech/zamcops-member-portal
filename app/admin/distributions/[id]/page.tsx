"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Download, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";
import { Tabs, Pager, Field } from "@/components/admin/ui";
import { AuditTrail } from "@/components/admin/AuditTrail";
import { HolderPicker } from "@/components/admin/HolderPicker";
import { WorkPicker } from "@/components/admin/WorkPicker";
import { PoolLinks } from "@/components/admin/PoolLinks";
import { PendingWorks } from "@/components/admin/PendingWorks";
import { PortalPayouts } from "@/components/admin/PortalPayouts";
import { formatKwacha } from "@/lib/format";

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
    deadline: string;
    runAt: string | null;
    closedAt: string | null;
    locked: string;
    imported: boolean;
    entryCount: number;
  };
  summary: { lines: number; holders: number; works: number; amount: number; total: number; adminFee: number; reserved: number; disputed: number };
  breakdown: {
    affiliated: { holders: number; amount: number };
    other: { holders: number; amount: number };
    unidentified: { lines: number; amount: number };
    domesticWorks: number;
    internationalWorks: number;
    unmatchedWorkLines: number;
    disputedAmount: number;
  };
  view: "holders" | "works" | "lines";
  page: number;
  pageSize: number;
  total: number;
  rows: Row[];
};

type Tab = "main" | "payouts" | "pending" | "summary" | "analysis" | "statements" | "allocations" | "audit";

const Line = ({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) => (
  <div className={"flex items-baseline justify-between gap-4 border-b border-[#eceff3] px-4 py-1.5 text-[13px] " + (strong ? "font-bold" : "")}>
    <span className="text-zam-muted">{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
);

export default function DistributionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const first = sp.get("tab");
  const [tab, setTab] = useState<Tab>(first === "pending" || first === "summary" || first === "analysis" || first === "statements" || first === "allocations" || first === "audit" || first === "payouts" ? (first as Tab) : "main");
  const [view, setView] = useState<"holders" | "works" | "lines">("holders");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);
  const [closing, setClosing] = useState(false);
  const [meta, setMeta] = useState({ periodLabel: "", code: "", startDate: "", endDate: "", deadline: "", notes: "" });
  const [metaDirty, setMetaDirty] = useState(false);
  const [unmatched, setUnmatched] = useState(false);
  const [lineEdit, setLineEdit] = useState<{
    id: string;
    amount: string;
    adminFee: string;
    reserved: string;
    disputed: boolean;
    holderId: string | null;
    holderName: string;
    workId: string | null;
    workTitle: string;
  } | null>(null);

  // Statements are the per-right-holder view; Allocations lets staff switch view.
  const activeView = tab === "statements" ? "holders" : view;

  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const ctl = new AbortController();
    const params = new URLSearchParams({ view: activeView, q: term, page: String(page) });
    if (unmatched && tab === "allocations" && activeView === "lines") params.set("filter", "unmatched");
    setErr("");
    fetch(`/api/admin/registry/distributions/${id}?${params}`, { signal: ctl.signal, cache: "no-store" })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error ?? `Could not load this distribution (${r.status}).`);
        setData(b as Result);
      })
      .catch((e) => e.name !== "AbortError" && setErr(e.message));
    return () => ctl.abort();
  }, [id, activeView, term, page, tick, unmatched, tab]);

  const d = data?.distribution;
  useEffect(() => {
    if (d && !metaDirty) setMeta({ periodLabel: d.periodLabel, code: d.code, startDate: d.startDate, endDate: d.endDate, deadline: d.deadline, notes: d.notes });
  }, [d, metaDirty]);

  const saveMeta = async () => {
    const r = await fetch("/api/admin/distributions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...meta }),
    });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return toast.error(b.error ?? "Could not save.");
    toast.success("Distribution updated.");
    setMetaDirty(false);
    setTick((t) => t + 1);
  };

  const saveLine = async () => {
    if (!lineEdit) return;
    const r = await fetch(`/api/admin/registry/distributions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lineId: lineEdit.id,
        amount: lineEdit.amount,
        adminFee: lineEdit.adminFee,
        reserved: lineEdit.reserved,
        disputed: lineEdit.disputed,
        rightHolderId: lineEdit.holderId,
        workId: lineEdit.workId,
      }),
    });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return toast.error(b.error ?? "Could not save the line.");
    toast.success("Line updated.");
    setLineEdit(null);
    setTick((t) => t + 1);
  };

  // WIPO Connect's "Sync with Portal": On shows the run's confirmed payouts to
  // members (and notifies them); Off hides them again.
  const setSync = async (on: boolean) => {
    if (!d || on === (d.status === "Published")) return;
    if (on && !window.confirm("Turn Sync with Portal on? Members with a payout in this distribution will see it immediately and be notified.")) return;
    setClosing(true);
    try {
      const r = await fetch("/api/admin/distributions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: on ? "Published" : "Draft" }) });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? "Could not change Sync with Portal.");
      toast.success(on ? "Synced with the member portal." : "Taken off the member portal.");
      setTick((t) => t + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not change Sync with Portal.");
    } finally {
      setClosing(false);
    }
  };

  const runAction = async (action: "close" | "reopen") => {
    if (action === "close" && !window.confirm("Close this distribution? It becomes Done and its allocations can no longer be changed until you reopen it.")) return;
    setClosing(true);
    try {
      const r = await fetch(`/api/admin/registry/distributions/${id}/actions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? "That did not work.");
      toast.success(action === "close" ? "Distribution closed." : "Distribution reopened.");
      setTick((t) => t + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setClosing(false);
    }
  };

  const csvHref = `/api/admin/registry/distributions/${id}?${new URLSearchParams({ view: activeView, q: term, format: "csv" })}`;

  if (err && !data)
    return (
      <div>
        <Link href="/admin/distributions" className="mb-4 inline-flex items-center gap-1 text-sm text-zam-muted hover:text-zam-ink">
          <ArrowLeft size={14} /> Distributions
        </Link>
        <p className="rounded-sm bg-zam-red/10 px-4 py-3 text-sm text-zam-red">
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
  const b = data.breakdown;
  // The rows on screen belong to the view they were fetched for; while a switch
  // is in flight they must not be drawn in the new view's columns.
  const stale = data.view !== activeView;
  const net = Math.max(0, s.amount - s.adminFee);
  const range = [d.startDate, d.endDate].filter(Boolean).join(" → ");
  const reservedSuspicious = s.amount > 0 && Math.abs(s.reserved - s.amount) < 0.01;
  const btn = "inline-flex h-8 items-center gap-1.5 rounded-sm bg-white px-3 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8]";

  return (
    <div>
      <Link href="/admin/distributions" className="mb-2 inline-flex items-center gap-1 text-xs text-zam-muted hover:text-zam-ink">
        <ArrowLeft size={13} /> Distributions
      </Link>
      <AdminHeader
        title={`${d.periodLabel} (${d.code || "—"})`}
        subtitle={d.runAt ? `Run Date: ${new Date(d.runAt).toLocaleDateString("en-GB").replace(/\//g, "/")}` : d.imported ? "Imported from WIPO Connect" : ""}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <span className={"inline-block rounded-sm px-2 py-0.5 text-[12px] " + (d.closedAt ? "bg-[#d9f2e3] text-[#17683a]" : "bg-[#fff3c4] text-[#7a5b00]")}>{d.closedAt ? "Done" : "To be Completed"}</span>
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-zam-muted">
              Sync with Portal
              <span className="inline-flex overflow-hidden rounded-sm ring-1 ring-[#bfc5ce]">
                <button type="button" disabled={closing || d.closedAt != null} onClick={() => setSync(true)} className={"px-3 py-1 text-[12px] " + (d.status === "Published" ? "bg-[#286090] text-white" : "bg-white text-zam-muted hover:bg-[#eef3f8]")}>
                  On
                </button>
                <button type="button" disabled={closing || d.closedAt != null} onClick={() => setSync(false)} className={"px-3 py-1 text-[12px] " + (d.status !== "Published" ? "bg-[#7a8a99] text-white" : "bg-white text-zam-muted hover:bg-[#eef3f8]")}>
                  Off
                </button>
              </span>
            </span>
            {d.closedAt ? (
              <button onClick={() => runAction("reopen")} disabled={closing} className={btn}>
                Reopen
              </button>
            ) : (
              d.status !== "Published" && (
                <button onClick={() => runAction("close")} disabled={closing} className={btn}>
                  {closing ? "Closing…" : "Close"}
                </button>
              )
            )}
          </div>
        }
      />

      <Tabs
        className="mb-3"
        value={tab === "pending" ? "main" : tab}
        onChange={(t) => {
          setTab(t);
          setPage(1);
          setLineEdit(null);
        }}
        tabs={[
          { key: "main", label: "Main" },
          { key: "summary", label: "Summary" },
          { key: "analysis", label: "Analysis" },
          { key: "statements", label: "Statements", count: s.holders },
          { key: "allocations", label: "Allocations", count: s.lines },
          { key: "payouts", label: "Portal payouts", count: d.entryCount || undefined },
          { key: "audit", label: "Audit" },
        ]}
      />

      {err && <p className="mb-3 rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}

      {tab === "main" && (
        <div className="space-y-3">
          <Panel
            title="General Information"
            collapsible
            right={
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => setTick((t) => t + 1)} className="grid h-6 w-6 place-items-center rounded-sm bg-[#286090] text-white hover:bg-[#204d74]" aria-label="Refresh" title="Refresh">
                  <RefreshCw size={12} />
                </button>
                <button type="button" onClick={() => setTab("pending")} className="inline-flex h-6 items-center rounded-sm bg-[#286090] px-2 text-[11px] font-semibold text-white hover:bg-[#204d74]">
                  Pending Works
                </button>
              </div>
            }
          >
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Main Id</span>
                <input value={d.code} readOnly className="field-input h-8 w-full bg-[#f1f3f6]" />
              </label>
              <label className="block lg:col-span-3">
                <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Name</span>
                <input value={meta.periodLabel} disabled={!!d.locked} onChange={(e) => { setMeta({ ...meta, periodLabel: e.target.value }); setMetaDirty(true); }} className="field-input h-8 w-full" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Start Date</span>
                <input type="date" value={meta.startDate} disabled={!!d.locked} onChange={(e) => { setMeta({ ...meta, startDate: e.target.value }); setMetaDirty(true); }} className="field-input h-8 w-full" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-zam-muted">End Date</span>
                <input type="date" value={meta.endDate} disabled={!!d.locked} onChange={(e) => { setMeta({ ...meta, endDate: e.target.value }); setMetaDirty(true); }} className="field-input h-8 w-full" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Deadline</span>
                <input type="date" value={meta.deadline} disabled={!!d.locked} onChange={(e) => { setMeta({ ...meta, deadline: e.target.value }); setMetaDirty(true); }} className="field-input h-8 w-full" />
              </label>
              <label className="block sm:col-span-2 lg:col-span-4">
                <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Narrative</span>
                <textarea rows={3} value={meta.notes} disabled={!!d.locked} onChange={(e) => { setMeta({ ...meta, notes: e.target.value }); setMetaDirty(true); }} className="field-input w-full" />
              </label>
              {metaDirty && !d.locked && (
                <div className="sm:col-span-2 lg:col-span-4">
                  <button onClick={saveMeta} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-zam-orange px-4 text-[13px] font-semibold text-white">
                    <Save size={13} /> Save
                  </button>
                </div>
              )}
            </div>
          </Panel>

          <PoolLinks distributionId={id} onChanged={() => setTick((t) => t + 1)} />

          <Panel title="Total Amount" collapsible defaultOpen={false}>
            <div className="grid sm:grid-cols-2">
              <div>
                <Line label="Total allocated" value={formatKwacha(s.amount)} strong />
                <Line label="Admin fee withheld" value={formatKwacha(s.adminFee)} />
                <Line label="Net to right-holders" value={formatKwacha(net)} />
              </div>
              <div>
                <Line label="Right-holders paid" value={s.holders.toLocaleString()} />
                <Line label="Works" value={s.works.toLocaleString()} />
                <Line label="Allocation lines" value={s.lines.toLocaleString()} />
              </div>
            </div>
          </Panel>
        </div>
      )}

      {tab === "pending" && (
        <div>
          <button type="button" onClick={() => setTab("main")} className="mb-2 inline-flex items-center gap-1 text-xs text-zam-muted hover:text-zam-ink">
            <ArrowLeft size={13} /> Main
          </button>
          <PendingWorks distributionId={id} refresh={tick} />
        </div>
      )}

      {tab === "payouts" && <PortalPayouts distributionId={id} locked={d.status === "Published" || !!d.closedAt} onChanged={() => setTick((t) => t + 1)} />}

      {tab === "summary" && (
        <div className="grid gap-3 lg:grid-cols-3">
          <Panel title="Amounts (ZMW)">
            <Line label="Affiliated right-holders" value={formatKwacha(b.affiliated.amount)} />
            <Line label="Other right-holders" value={formatKwacha(b.other.amount)} />
            <Line label="Unidentified right-holder" value={formatKwacha(b.unidentified.amount)} />
            <Line label="Sum allocated" value={formatKwacha(s.amount)} strong />
            <Line label="Admin fee withheld" value={formatKwacha(s.adminFee)} />
            <Line label="Reserved" value={formatKwacha(s.reserved)} />
            <Line label="In dispute" value={formatKwacha(b.disputedAmount)} />
          </Panel>
          <Panel title="Right-holders">
            <Line label="Affiliated (on the society register)" value={b.affiliated.holders.toLocaleString()} />
            <Line label="Other right-holders" value={b.other.holders.toLocaleString()} />
            <Line label="Total right-holders paid" value={s.holders.toLocaleString()} strong />
            <Line label="Lines with no identified right-holder" value={b.unidentified.lines.toLocaleString()} />
          </Panel>
          <Panel title="Works">
            <Line label="Domestic works" value={b.domesticWorks.toLocaleString()} />
            <Line label="International works" value={b.internationalWorks.toLocaleString()} />
            <Line label="Total works" value={s.works.toLocaleString()} strong />
            <Line label="Lines not matched to a registered work" value={b.unmatchedWorkLines.toLocaleString()} />
            <Line label="Allocation lines" value={s.lines.toLocaleString()} />
          </Panel>
        </div>
      )}

      {tab === "analysis" && (
        <div className="space-y-3">
          <Panel title="Held back from payment">
            <Line label="Reserved" value={formatKwacha(s.reserved)} />
            <Line label="In dispute" value={formatKwacha(b.disputedAmount)} />
            <Line label="Allocated to an unidentified right-holder" value={formatKwacha(b.unidentified.amount)} />
            <Line label="Admin fee withheld" value={formatKwacha(s.adminFee)} />
          </Panel>
          <Panel title="Checks">
            <ul className="space-y-1.5 p-4 text-[13px]">
              <li className={b.unidentified.lines ? "text-[#9a6a00]" : "text-zam-green"}>
                {b.unidentified.lines ? `${b.unidentified.lines.toLocaleString()} lines have no right-holder on the register (${formatKwacha(b.unidentified.amount)}). Match them to a right-holder.` : "Every line is matched to a right-holder."}
              </li>
              <li className={b.unmatchedWorkLines ? "text-[#9a6a00]" : "text-zam-green"}>
                {b.unmatchedWorkLines ? `${b.unmatchedWorkLines.toLocaleString()} lines are not matched to a registered work.` : "Every line is matched to a registered work."}
              </li>
              <li className={s.disputed ? "text-zam-red" : "text-zam-green"}>{s.disputed ? `${s.disputed.toLocaleString()} lines are disputed.` : "No lines are disputed."}</li>
              {reservedSuspicious && (
                <li className="text-[#9a6a00]">
                  The reserved total equals the whole allocated amount. That is usually an import mapping problem rather than a real reserve — compare with WIPO Connect before publishing.
                </li>
              )}
            </ul>
          </Panel>
        </div>
      )}

      {(tab === "statements" || tab === "allocations") && (
        <>
          {d.locked && tab === "allocations" && <p className="mb-2 rounded-sm bg-zam-amber/10 px-4 py-2 text-sm text-[#9a6a00]">{d.locked} Lines are read-only.</p>}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {tab === "allocations" &&
              (
                [
                  { key: "holders", label: "By right-holder" },
                  { key: "works", label: "By work" },
                  { key: "lines", label: "Every line" },
                ] as const
              ).map((v) => (
                <button
                  key={v.key}
                  onClick={() => {
                    setView(v.key);
                    setPage(1);
                    setLineEdit(null);
                  }}
                  className={"inline-flex h-8 items-center rounded-sm border px-3 text-[13px] font-semibold " + (view === v.key ? "border-[#286090] bg-[#286090] text-white" : "border-[#bfc5ce] bg-white text-[#1f4e79] hover:bg-[#eef3f8]")}
                >
                  {v.label}
                </button>
              ))}
            {tab === "allocations" && view === "lines" && (
              <label className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-[#bfc5ce] bg-white px-2.5 text-[13px] font-semibold text-[#1f4e79]">
                <input
                  type="checkbox"
                  checked={unmatched}
                  onChange={(e) => {
                    setUnmatched(e.target.checked);
                    setPage(1);
                  }}
                  className="h-3.5 w-3.5"
                />
                Unmatched only{b.unidentified.lines + b.unmatchedWorkLines > 0 ? ` (${(b.unidentified.lines + b.unmatchedWorkLines).toLocaleString()})` : ""}
              </label>
            )}
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter: name, IPI, work…" className="field-input ml-auto h-8 w-64" />
            <a href={csvHref} className={btn}>
              <Download size={13} /> Download CSV
            </a>
          </div>

          <Panel title={tab === "statements" ? "Local right-holder statements" : activeView === "holders" ? "Allocation by right-holder" : activeView === "works" ? "Allocation by work" : "Every allocation line"}>
            <div className="overflow-x-auto">
              {stale ? (
                <p className="px-5 py-8 text-center text-sm text-zam-muted">Loading…</p>
              ) : activeView === "lines" ? (
                <table className="w-full min-w-[960px]">
                  <thead>
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
                  <tbody>
                    {data.rows.map((r) => {
                      const rid = String(r.id);
                      const on = lineEdit?.id === rid;
                      return (
                        <tr key={rid}>
                          {on ? (
                            <>
                              <Td className="min-w-[200px]">
                                <HolderPicker
                                  value={lineEdit.holderId ? { id: lineEdit.holderId, name: lineEdit.holderName } : null}
                                  onPick={(h) => setLineEdit({ ...lineEdit, holderId: h?.id ?? null, holderName: h?.displayName ?? "" })}
                                />
                              </Td>
                              <Td className="min-w-[200px]">
                                <WorkPicker
                                  value={lineEdit.workId ? { id: lineEdit.workId, title: lineEdit.workTitle } : null}
                                  onPick={(w) => setLineEdit({ ...lineEdit, workId: w?.id ?? null, workTitle: w?.title ?? "" })}
                                />
                              </Td>
                            </>
                          ) : (
                            <>
                              <Td>{r.holderId ? <Link className="font-semibold hover:text-zam-orange" href={`/admin/register/${r.holderId}`}>{String(r.holder)}</Link> : <span className="font-semibold text-[#9a6a00]">Unmatched</span>}</Td>
                              <Td>{r.workId ? <Link className="hover:text-zam-orange" href={`/admin/catalogue/${r.workId}`}>{String(r.work)}</Link> : <span className="font-semibold text-[#9a6a00]">Unmatched</span>}</Td>
                            </>
                          )}
                          <Td className="font-mono text-xs">{String(r.roleCode) || "—"}</Td>
                          <Td className="text-xs">{String(r.rightType) || "—"}</Td>
                          {on ? (
                            <>
                              <Td className="text-right"><input value={lineEdit.amount} onChange={(e) => setLineEdit({ ...lineEdit, amount: e.target.value })} className="field-input h-8 w-28 text-right" inputMode="decimal" /></Td>
                              <Td className="text-right"><input value={lineEdit.adminFee} onChange={(e) => setLineEdit({ ...lineEdit, adminFee: e.target.value })} className="field-input h-8 w-24 text-right" inputMode="decimal" /></Td>
                              <Td className="text-right"><input value={lineEdit.reserved} onChange={(e) => setLineEdit({ ...lineEdit, reserved: e.target.value })} className="field-input h-8 w-24 text-right" inputMode="decimal" /></Td>
                              <Td><input type="checkbox" checked={lineEdit.disputed} onChange={(e) => setLineEdit({ ...lineEdit, disputed: e.target.checked })} className="h-4 w-4" /></Td>
                              <Td>
                                <div className="flex gap-1">
                                  <button onClick={saveLine} className="rounded-sm bg-zam-orange px-2.5 py-1 text-xs font-semibold text-white">Save</button>
                                  <button onClick={() => setLineEdit(null)} className="rounded-sm bg-zam-canvas px-2.5 py-1 text-xs font-semibold">Cancel</button>
                                </div>
                              </Td>
                            </>
                          ) : (
                            <>
                              <Td className="text-right tabular-nums">{formatKwacha(Number(r.amount))}</Td>
                              <Td className="text-right tabular-nums">{formatKwacha(Number(r.adminFee))}</Td>
                              <Td className="text-right tabular-nums">{formatKwacha(Number(r.reserved))}</Td>
                              <Td>{r.disputed ? <span className="text-xs font-semibold text-zam-red">Disputed</span> : "—"}</Td>
                              <Td>
                                <button
                                  onClick={() =>
                                    setLineEdit({
                                      id: rid,
                                      amount: String(r.amount),
                                      adminFee: String(r.adminFee),
                                      reserved: String(r.reserved),
                                      disputed: !!r.disputed,
                                      holderId: r.holderId ? String(r.holderId) : null,
                                      holderName: r.holderId ? String(r.holder) : "",
                                      workId: r.workId ? String(r.workId) : null,
                                      workTitle: r.workId ? String(r.work) : "",
                                    })
                                  } className="rounded-sm bg-[#e6ebf1] px-2.5 py-1 text-xs font-semibold text-[#1f4e79] hover:bg-[#d6dfe9]">
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
                  <thead>
                    <tr>
                      <Th>{activeView === "holders" ? "Name" : "Work"}</Th>
                      <Th>{activeView === "holders" ? "IPI" : "ISWC"}</Th>
                      <Th className="text-right">Lines</Th>
                      <Th className="text-right">{tab === "statements" ? "Gross amount" : "Allocated"}</Th>
                      <Th className="text-right">Admin fee</Th>
                      {tab === "statements" ? <Th className="text-right">Net amount</Th> : <Th className="text-right">Reserved</Th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r, i) => (
                      <tr key={String(r.id ?? i)}>
                        <Td className="font-semibold">
                          {r.id ? (
                            <Link href={activeView === "holders" ? `/admin/register/${r.id}` : `/admin/catalogue/${r.id}`} className="hover:text-zam-orange">
                              {String(r.name)}
                            </Link>
                          ) : (
                            String(r.name)
                          )}
                        </Td>
                        <Td className="font-mono text-xs">{String(r.ipiNumber) || "—"}</Td>
                        <Td className="text-right tabular-nums">{Number(r.lines)}</Td>
                        <Td className="text-right tabular-nums">{formatKwacha(Number(r.amount))}</Td>
                        <Td className="text-right tabular-nums">{formatKwacha(Number(r.adminFee))}</Td>
                        <Td className="text-right tabular-nums">{tab === "statements" ? formatKwacha(Math.max(0, Number(r.amount) - Number(r.adminFee))) : formatKwacha(Number(r.reserved))}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {!stale && data.rows.length === 0 && <p className="px-5 py-8 text-center text-sm text-zam-muted">Nothing to show{term ? " for that filter" : ""}.</p>}
            </div>
            <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} className="border-t border-[#eceff3]" />
          </Panel>
        </>
      )}

      {tab === "audit" && (
        <Panel title="Changes to this distribution">
          <AuditTrail targetType="Distribution" targetId={id} />
        </Panel>
      )}
    </div>
  );
}
