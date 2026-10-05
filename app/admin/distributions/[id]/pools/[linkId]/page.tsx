"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";
import { Pager, Field } from "@/components/admin/ui";
import { WorkPicker } from "@/components/admin/WorkPicker";
import { formatKwacha } from "@/lib/format";

type WorkBrief = { id: string; title: string; iswc: string; wipoId: string; holders: string[] };
type MatchRow = { n: number; ref: string; weight: number; status: "matched" | "ambiguous" | "notfound" | "duplicate" | "already"; work?: WorkBrief; candidates?: WorkBrief[] };
type Check = { rows: MatchRow[]; summary: { lines: number; matched: number; ambiguous: number; notfound: number; duplicate: number; already: number } };

type Detail = {
  link: {
    id: string;
    distribution: { id: string; periodLabel: string; status: string; code: string };
    pool: { id: string; code: string; name: string; kind: string; method: string; rightType: string } | null;
    stationId: string | null;
    stationName: string;
    kind: string;
    periodStart: string;
    periodEnd: string;
    amount: number;
    adminFeePct: number;
    status: string;
    allocatedAt: string | null;
    notes: string;
    lines: number;
    allocated: number;
    adminFee: number;
  };
  stats: { works: number; weight: number };
  page: number;
  pageSize: number;
  total: number;
  works: { id: string; workId: string; weight: number; title: string; iswc: string; wipoId: string; holders: string[] }[];
};

const Lbl = ({ children }: { children: React.ReactNode }) => <span className="mb-1 block text-[11px] font-semibold text-zam-muted">{children}</span>;
const small = "field-input h-8 w-full";
const SAMPLE = "133-507-W\nT-123.456.105-0\nBEAUTIFUL DAY 3, 12\n\"TITLE, WITH A COMMA\"\t4";

export default function PoolLinkPage() {
  const { id, linkId } = useParams<{ id: string; linkId: string }>();
  const api = `/api/admin/registry/distributions/${id}/links/${linkId}`;
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [meta, setMeta] = useState({ periodStart: "", periodEnd: "", amount: "", adminFeePct: "", notes: "" });
  const [metaDirty, setMetaDirty] = useState(false);
  const [busy, setBusy] = useState("");
  const [text, setText] = useState("");
  const [check, setCheck] = useState<Check | null>(null);
  const [choices, setChoices] = useState<Record<number, string>>({});
  const [showAll, setShowAll] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const ctl = new AbortController();
    fetch(`${api}?${new URLSearchParams({ q: term, page: String(page) })}`, { signal: ctl.signal, cache: "no-store" })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error ?? `Could not load this pool link (${r.status}).`);
        setD(b);
        setErr("");
        setSelected(new Set());
        setWeights({});
        if (!metaDirty) setMeta({ periodStart: b.link.periodStart, periodEnd: b.link.periodEnd, amount: String(b.link.amount), adminFeePct: String(b.link.adminFeePct), notes: b.link.notes });
      })
      .catch((e) => e.name !== "AbortError" && setErr(e.message));
    return () => ctl.abort();
    // metaDirty is read, not a trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, term, page, tick]);

  const published = d?.link.distribution.status === "Published";

  const call = async (url: string, init: RequestInit, fail: string) => {
    const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(b.error ?? fail);
    return b;
  };

  const saveMeta = async () => {
    setBusy("meta");
    try {
      const b = await call(api, { method: "PATCH", body: JSON.stringify(meta) }, "Could not save.");
      toast.success(b.needsAllocation ? "Saved. The amount changed, so allocate this link again." : "Saved.");
      setMetaDirty(false);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy("");
    }
  };

  const allocate = async () => {
    setBusy("allocate");
    try {
      const b = await call(`${api}/allocate`, { method: "POST" }, "Could not allocate.");
      toast.success(
        `Allocated ${formatKwacha(b.amount)} across ${b.works.toLocaleString()} works (${b.lines.toLocaleString()} lines).` +
          (b.worksWithoutShares ? ` ${b.worksWithoutShares.toLocaleString()} works have no ${d?.link.pool?.rightType.toLowerCase() ?? "performing"} shares, so ${formatKwacha(b.unidentifiedAmount)} is unidentified.` : ""),
        { duration: 9000 },
      );
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not allocate.");
    } finally {
      setBusy("");
    }
  };

  const removeWorks = async (body: { workIds?: string[]; all?: boolean }, confirm: string) => {
    if (!window.confirm(confirm)) return;
    setBusy("remove");
    try {
      const b = await call(`${api}/works`, { method: "DELETE", body: JSON.stringify(body) }, "Could not remove.");
      toast.success(`Removed ${b.removed.toLocaleString()} work${b.removed === 1 ? "" : "s"}.`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove.");
    } finally {
      setBusy("");
    }
  };

  const saveWeights = async () => {
    const items = Object.entries(weights).map(([workId, weight]) => ({ workId, weight }));
    if (!items.length) return;
    setBusy("weights");
    try {
      await call(`${api}/works`, { method: "PATCH", body: JSON.stringify({ items }) }, "Could not save the weights.");
      toast.success("Weights saved.");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the weights.");
    } finally {
      setBusy("");
    }
  };

  const runCheck = async () => {
    setBusy("check");
    try {
      const b: Check = await call(`${api}/works`, { method: "POST", body: JSON.stringify({ action: "check", text }) }, "Could not read the list.");
      setCheck(b);
      setChoices({});
      setShowAll(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read the list.");
    } finally {
      setBusy("");
    }
  };

  const addable = (check?.rows ?? []).flatMap((r) => {
    if (r.status === "matched" && r.work) return [{ workId: r.work.id, weight: r.weight }];
    if (r.status === "ambiguous" && choices[r.n]) return [{ workId: choices[r.n], weight: r.weight }];
    return [];
  });

  const addChecked = async () => {
    if (!addable.length) return;
    setBusy("add");
    try {
      const b = await call(`${api}/works`, { method: "POST", body: JSON.stringify({ action: "add", items: addable }) }, "Could not add the works.");
      toast.success(`Added ${b.added.toLocaleString()} work${b.added === 1 ? "" : "s"}${b.updated ? `, updated ${b.updated.toLocaleString()} weights` : ""}.${d?.link.status === "Allocated" ? " Allocate again to include them." : ""}`);
      setCheck(null);
      setText("");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add the works.");
    } finally {
      setBusy("");
    }
  };

  const addOne = async (w: { id: string } | null) => {
    if (!w) return;
    try {
      const b = await call(`${api}/works`, { method: "POST", body: JSON.stringify({ action: "add", items: [{ workId: w.id, weight: 1 }] }) }, "Could not add the work.");
      toast.success(b.added ? "Work added." : "That work is already on the list.");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add the work.");
    }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 4_000_000) return toast.error("That file is too large. Keep it under 4 MB.");
    setText(await f.text());
    setCheck(null);
    if (file.current) file.current.value = "";
  };

  const downloadMissing = () => {
    const lines = (check?.rows ?? []).filter((r) => r.status === "notfound" || (r.status === "ambiguous" && !choices[r.n])).map((r) => `"${r.ref.replace(/"/g, '""')}",${r.weight},${r.status}`);
    const blob = new Blob(["work,weight,problem\n" + lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "works-not-matched.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (err && !d)
    return (
      <div>
        <Link href={`/admin/distributions/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-zam-muted hover:text-zam-ink">
          <ArrowLeft size={14} /> Distribution
        </Link>
        <p className="rounded-sm bg-zam-red/10 px-4 py-3 text-sm text-zam-red">
          {err}{" "}
          <button onClick={reload} className="font-semibold underline">
            Retry
          </button>
        </p>
      </div>
    );
  if (!d)
    return (
      <div className="grid h-40 place-items-center">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-zam-line border-t-zam-orange" />
      </div>
    );

  const L = d.link;
  const problems = (check?.rows ?? []).filter((r) => r.status === "ambiguous" || r.status === "notfound");
  const shown = showAll ? (check?.rows ?? []) : problems;
  const badge = (s: MatchRow["status"]) =>
    s === "matched" ? <StatusBadge status="Approved" /> : s === "ambiguous" ? <StatusBadge status="Pending" /> : s === "notfound" ? <StatusBadge status="Rejected" /> : <StatusBadge status="Paused" />;
  const label = (s: MatchRow["status"]) => ({ matched: "Matched", ambiguous: "Pick one", notfound: "Not found", duplicate: "Repeated in list", already: "Already on the list" })[s];

  return (
    <div>
      <Link href={`/admin/distributions/${id}`} className="mb-2 inline-flex items-center gap-1 text-xs text-zam-muted hover:text-zam-ink">
        <ArrowLeft size={13} /> {L.distribution.periodLabel}
      </Link>
      <AdminHeader
        title={`${L.stationName || "Pool link"}${L.pool ? ` · ${L.pool.code}` : ""}`}
        subtitle={[L.kind, L.pool?.method, L.pool?.rightType && `${L.pool.rightType} right`, [L.periodStart, L.periodEnd].filter(Boolean).join(" → ")].filter(Boolean).join(" · ")}
        right={
          <div className="flex items-center gap-2">
            <StatusBadge status={L.status === "Allocated" ? "Approved" : "Pending"} />
            {!published && (
              <button type="button" onClick={allocate} disabled={busy === "allocate" || d.stats.works === 0 || !(L.amount > 0)} className="inline-flex h-8 items-center rounded-sm bg-zam-orange px-4 text-[13px] font-semibold text-white disabled:opacity-40">
                {busy === "allocate" ? "Allocating…" : L.status === "Allocated" ? "Re-allocate" : "Allocate"}
              </button>
            )}
          </div>
        }
      />

      {published && <p className="mb-3 rounded-sm bg-zam-amber/10 px-4 py-2 text-sm text-[#9a6a00]">This distribution is published, so this pool link is read-only.</p>}

      <div className="space-y-3">
        <Panel title="Pool link" collapsible>
          <dl className="grid gap-x-8 gap-y-3 border-b border-[#eceff3] p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Station">{L.stationName}</Field>
            <Field label="Pool">{L.pool ? `${L.pool.code}${L.pool.name ? ` — ${L.pool.name}` : ""}` : ""}</Field>
            <Field label="Works on the list">{d.stats.works.toLocaleString()}</Field>
            <Field label="Total weight">{d.stats.weight.toLocaleString()}</Field>
            <Field label="Allocated">{L.lines ? `${formatKwacha(L.allocated)} in ${L.lines.toLocaleString()} lines` : "Not yet"}</Field>
            <Field label="Admin fee withheld">{L.lines ? formatKwacha(L.adminFee) : ""}</Field>
            <Field label="Last allocated">{L.allocatedAt ? new Date(L.allocatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : ""}</Field>
          </dl>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <label className="block">
              <Lbl>Period start</Lbl>
              <input type="date" disabled={published} value={meta.periodStart} onChange={(e) => { setMeta({ ...meta, periodStart: e.target.value }); setMetaDirty(true); }} className={small} />
            </label>
            <label className="block">
              <Lbl>Period end</Lbl>
              <input type="date" disabled={published} value={meta.periodEnd} onChange={(e) => { setMeta({ ...meta, periodEnd: e.target.value }); setMetaDirty(true); }} className={small} />
            </label>
            <label className="block">
              <Lbl>Amount (ZMW)</Lbl>
              <input inputMode="decimal" disabled={published} value={meta.amount} onChange={(e) => { setMeta({ ...meta, amount: e.target.value }); setMetaDirty(true); }} className={small + " text-right"} />
            </label>
            <label className="block">
              <Lbl>Admin fee %</Lbl>
              <input inputMode="decimal" disabled={published} value={meta.adminFeePct} onChange={(e) => { setMeta({ ...meta, adminFeePct: e.target.value }); setMetaDirty(true); }} className={small + " text-right"} />
            </label>
            <label className="block">
              <Lbl>Notes</Lbl>
              <input disabled={published} value={meta.notes} onChange={(e) => { setMeta({ ...meta, notes: e.target.value }); setMetaDirty(true); }} className={small} />
            </label>
            {metaDirty && !published && (
              <div className="sm:col-span-2 lg:col-span-5">
                <button type="button" onClick={saveMeta} disabled={busy === "meta"} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-zam-orange px-4 text-[13px] font-semibold text-white disabled:opacity-50">
                  <Save size={13} /> {busy === "meta" ? "Saving…" : "Save changes"}
                </button>
              </div>
            )}
          </div>
        </Panel>

        {!published && (
          <Panel title="Add works in bulk" collapsible>
            <div className="space-y-3 p-4">
              <p className="text-[13px] text-zam-muted">
                One work per line: its WIPO id (<code>133-507-W</code> or <code>507</code>), its ISWC, or its exact title. Add a number after a tab or comma for how many times it was played; without one every work counts equally.
                Paste the list or upload a <code>.csv</code> / <code>.txt</code> file, then check it against the register before anything is added.
              </p>
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setCheck(null);
                }}
                rows={7}
                placeholder={SAMPLE}
                className="field-input w-full font-mono text-xs"
                spellCheck={false}
              />
              <div className="flex flex-wrap items-center gap-2">
                <input ref={file} type="file" accept=".csv,.txt,.tsv,text/plain,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                <button type="button" onClick={() => file.current?.click()} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-white px-3 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8]">
                  <Upload size={13} /> Upload a file
                </button>
                <button type="button" onClick={runCheck} disabled={!text.trim() || busy === "check"} className="inline-flex h-8 items-center rounded-sm bg-zam-orange px-4 text-[13px] font-semibold text-white disabled:opacity-40">
                  {busy === "check" ? "Checking…" : "Check list"}
                </button>
                <span className="text-xs text-zam-muted">{text.trim() ? `${text.split("\n").filter((l) => l.trim()).length.toLocaleString()} lines` : ""}</span>
                <span className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-zam-muted">Or add one work:</span>
                  <span className="w-64">
                    <WorkPicker value={null} onPick={addOne} />
                  </span>
                </span>
              </div>

              {check && (
                <div className="border border-[#d9dde3]">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 bg-[#f5f6f8] px-3 py-2 text-[13px]">
                    <b>{check.summary.lines.toLocaleString()} lines read</b>
                    <span className="text-zam-green">{check.summary.matched.toLocaleString()} matched</span>
                    {check.summary.ambiguous > 0 && <span className="text-[#9a6a00]">{check.summary.ambiguous.toLocaleString()} need a choice</span>}
                    {check.summary.notfound > 0 && <span className="text-zam-red">{check.summary.notfound.toLocaleString()} not found</span>}
                    {check.summary.already > 0 && <span className="text-zam-muted">{check.summary.already.toLocaleString()} already on the list</span>}
                    {check.summary.duplicate > 0 && <span className="text-zam-muted">{check.summary.duplicate.toLocaleString()} repeated</span>}
                    <label className="ml-auto flex items-center gap-1.5 text-xs">
                      <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="h-3.5 w-3.5" /> Show every line
                    </label>
                  </div>
                  {shown.length > 0 && (
                    <div className="max-h-96 overflow-auto">
                      <table className="w-full min-w-[720px]">
                        <thead>
                          <tr>
                            <Th>Line</Th>
                            <Th>You wrote</Th>
                            <Th>Result</Th>
                            <Th>Work on the register</Th>
                            <Th className="text-right">Weight</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {shown.slice(0, 500).map((r) => (
                            <tr key={r.n}>
                              <Td className="text-xs text-zam-muted">{r.n}</Td>
                              <Td className="max-w-[260px] break-words">{r.ref}</Td>
                              <Td className="whitespace-nowrap">
                                {badge(r.status)} <span className="ml-1 text-[11px] text-zam-muted">{label(r.status)}</span>
                              </Td>
                              <Td>
                                {r.status === "ambiguous" ? (
                                  <select value={choices[r.n] ?? ""} onChange={(e) => setChoices({ ...choices, [r.n]: e.target.value })} className="field-input h-8 w-full appearance-none bg-white text-xs">
                                    <option value="">— choose which work —</option>
                                    {r.candidates?.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.title} · {c.wipoId ? `133-${c.wipoId}-W` : ""} · {c.iswc || "no ISWC"} · {c.holders.join(", ") || "no holders"}
                                      </option>
                                    ))}
                                  </select>
                                ) : r.work ? (
                                  <span className="text-[13px]">
                                    <b>{r.work.title}</b> <span className="text-zam-muted">· {r.work.holders.join(", ") || "no holders"}</span>
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </Td>
                              <Td className="text-right tabular-nums">{r.weight}</Td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {shown.length > 500 && <p className="px-3 py-2 text-xs text-zam-muted">Showing the first 500 of {shown.length.toLocaleString()} lines.</p>}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 border-t border-[#d9dde3] px-3 py-2">
                    <button type="button" onClick={addChecked} disabled={!addable.length || busy === "add"} className="inline-flex h-8 items-center rounded-sm bg-zam-orange px-4 text-[13px] font-semibold text-white disabled:opacity-40">
                      {busy === "add" ? "Adding…" : `Add ${addable.length.toLocaleString()} work${addable.length === 1 ? "" : "s"}`}
                    </button>
                    {problems.length > 0 && (
                      <button type="button" onClick={downloadMissing} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-white px-3 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8]">
                        <Download size={13} /> Download the lines that did not match
                      </button>
                    )}
                    <span className="text-xs text-zam-muted">Lines not matched are left out; fix them in the file and check again.</span>
                  </div>
                </div>
              )}
            </div>
          </Panel>
        )}

        <Panel
          title={`Works on this list (${d.stats.works.toLocaleString()})`}
          right={
            <div className="flex items-center gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter: title, ISWC, id…" className="field-input h-7 w-56" />
              {!published && Object.keys(weights).length > 0 && (
                <button type="button" onClick={saveWeights} disabled={busy === "weights"} className="inline-flex h-7 items-center gap-1 rounded-sm bg-zam-orange px-3 text-xs font-semibold text-white">
                  <Save size={12} /> Save weights
                </button>
              )}
              {!published && selected.size > 0 && (
                <button type="button" onClick={() => removeWorks({ workIds: [...selected] }, `Remove ${selected.size} selected work${selected.size === 1 ? "" : "s"} from this list?`)} className="inline-flex h-7 items-center gap-1 rounded-sm bg-zam-red/10 px-3 text-xs font-semibold text-zam-red">
                  <Trash2 size={12} /> Remove {selected.size}
                </button>
              )}
              {!published && d.stats.works > 0 && selected.size === 0 && (
                <button type="button" onClick={() => removeWorks({ all: true }, `Remove all ${d.stats.works.toLocaleString()} works from this list?`)} className="text-xs font-semibold text-zam-muted underline hover:text-zam-red">
                  Clear the list
                </button>
              )}
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr>
                  {!published && (
                    <Th className="w-8">
                      <input
                        type="checkbox"
                        aria-label="Select all on this page"
                        checked={d.works.length > 0 && d.works.every((w) => selected.has(w.workId))}
                        onChange={(e) => setSelected(e.target.checked ? new Set(d.works.map((w) => w.workId)) : new Set())}
                        className="h-3.5 w-3.5"
                      />
                    </Th>
                  )}
                  <Th>Main Id</Th>
                  <Th>Title</Th>
                  <Th>Right-holders</Th>
                  <Th>ISWC</Th>
                  <Th className="text-right">Weight</Th>
                </tr>
              </thead>
              <tbody>
                {d.works.map((w) => (
                  <tr key={w.id}>
                    {!published && (
                      <Td>
                        <input
                          type="checkbox"
                          checked={selected.has(w.workId)}
                          onChange={(e) => {
                            const n = new Set(selected);
                            if (e.target.checked) n.add(w.workId);
                            else n.delete(w.workId);
                            setSelected(n);
                          }}
                          className="h-3.5 w-3.5"
                          aria-label={`Select ${w.title}`}
                        />
                      </Td>
                    )}
                    <Td className="whitespace-nowrap font-mono text-xs text-zam-muted">{w.wipoId.startsWith("local_") ? "—" : `133-${w.wipoId}-W`}</Td>
                    <Td className="font-semibold">
                      <Link href={`/admin/catalogue/${w.workId}`} className="hover:text-zam-orange">
                        {w.title}
                      </Link>
                    </Td>
                    <Td className="max-w-[280px] truncate text-xs text-zam-muted">{w.holders.join(", ") || "—"}</Td>
                    <Td className="whitespace-nowrap font-mono text-xs">{w.iswc || "—"}</Td>
                    <Td className="text-right">
                      {published ? (
                        w.weight
                      ) : (
                        <input
                          inputMode="decimal"
                          value={weights[w.workId] ?? String(w.weight)}
                          onChange={(e) => setWeights({ ...weights, [w.workId]: e.target.value })}
                          className="field-input h-7 w-20 text-right"
                          aria-label={`Weight for ${w.title}`}
                        />
                      )}
                    </Td>
                  </tr>
                ))}
                {d.works.length === 0 && (
                  <tr>
                    <Td colSpan={6} className="py-8 text-center text-zam-muted">
                      {term ? "No works on the list match that." : "No works on this list yet. Add the works played with the bulk tool above."}
                    </Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pager page={page} pageSize={d.pageSize} total={d.total} onPage={setPage} className="border-t border-[#eceff3]" />
        </Panel>
      </div>
    </div>
  );
}
