"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";
import { Pager, Field, Tabs } from "@/components/admin/ui";
import { BulkWorkAdd } from "@/components/admin/BulkWorkAdd";
import { SourceTab } from "@/components/admin/UsageLogSource";
import { formatKwacha } from "@/lib/format";
import { RESERVE_TYPE_LIST } from "@/lib/poolConst";

type Detail = {
  locked: string;
  link: {
    id: string;
    seq: number;
    distribution: { id: string; periodLabel: string; status: string; code: string };
    pool: { id: string; code: string; name: string; className: string; method: string; rightType: string; creationClass: string; workMethod: string; roMethod: string; adminFeePct: number; logSourceId: string | null; logMethodId: string | null } | null;
    className: string;
    subClass: string;
    periodStart: string;
    periodEnd: string;
    amount: number;
    currency: string;
    adminFeePct: number;
    adminFeeIntl: number;
    adminFeeIntlRevenue: number;
    adminFeeReserved: number;
    reserveType: string;
    affiliation: string;
    workMethodId: string | null;
    roMethodId: string | null;
    logSourceId: string | null;
    logMethodId: string | null;
    status: string;
    lastError: string;
    allocatedAt: string | null;
    notes: string;
    lines: number;
    allocated: number;
    adminFee: number;
    reserved: number;
  };
  stats: { works: number; weight: number };
  page: number;
  pageSize: number;
  total: number;
  works: { id: string; workId: string; weight: number; status: string; note: string; estimated: number; title: string; iswc: string; wipoId: string; registryStatus: string; holders: string[] }[];
};
type Results = {
  summary: { allocated: number; reserved: number; paid: number; adminFee: number; net: number; lines: number; reserves: { type: string; amount: number; lines: number }[]; works: { status: string; count: number }[] };
  view: string;
  page: number;
  pageSize: number;
  total: number;
  rows: Record<string, string | number | null>[];
};
type Pool = { id: string; code: string; name: string; className: string; rightType: string; method: string; adminFeePct: number };
type Method = { id: string; name: string; target: string };
type WorkSetRow = { id: string; name: string; works: number };

const Lbl = ({ children, hint }: { children: React.ReactNode; hint?: string }) => (
  <span className="mb-1 block text-[11px] font-semibold text-zam-muted">
    {children}
    {hint && <span className="ml-1 font-normal">{hint}</span>}
  </span>
);
const small = "field-input h-8 w-full";

const statusTone = (s: string) => (s === "Allocated" ? "Approved" : s === "Failed" ? "Rejected" : s === "Allocating" ? "Processing" : "Pending");
const workTone = (s: string) => (s === "Fully distributable" ? "Approved" : s === "Partially distributable" ? "Pending" : s === "Not distributable" ? "Rejected" : "Paused");

export default function PoolLinkPage() {
  const { id, linkId } = useParams<{ id: string; linkId: string }>();
  const router = useRouter();
  const api = `/api/admin/registry/distributions/${id}/links/${linkId}`;
  const [tab, setTab] = useState<"main" | "source" | "works" | "results">("main");
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [selected, setSelected] = useState<globalThis.Set<string>>(new globalThis.Set());
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ poolId: "", className: "", subClass: "", periodStart: "", periodEnd: "", amount: "", currency: "ZMW", affiliation: "ZAMCOPS", adminFeePct: "0", adminFeeIntl: "0", adminFeeIntlRevenue: "0", adminFeeReserved: "0", reserveType: "", workMethodId: "", roMethodId: "", notes: "" });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState("");
  const [pools, setPools] = useState<Pool[]>([]);
  const [suggest, setSuggest] = useState<{ classes: string[]; subClasses: string[] }>({ classes: [], subClasses: [] });
  const [methods, setMethods] = useState<Method[]>([]);
  const [sets, setSets] = useState<WorkSetRow[]>([]);
  const [setId, setSetId] = useState("");
  const [res, setRes] = useState<Results | null>(null);
  const [rview, setRview] = useState<"works" | "holders" | "reserves">("works");
  const [rpage, setRpage] = useState(1);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    Promise.all([fetch("/api/admin/pools?status=all").then((r) => r.json()), fetch("/api/admin/allocation-methods").then((r) => r.json()), fetch("/api/admin/work-sets").then((r) => r.json()), fetch(`/api/admin/registry/distributions/${id}/links`).then((r) => r.json())])
      .then(([p, m, w, l]) => {
        setPools(p.pools ?? []);
        setMethods(m.methods ?? []);
        setSets(w.sets ?? []);
        setSuggest(l.suggestions ?? { classes: [], subClasses: [] });
      })
      .catch(() => toast.error("Could not load the pool and method lists."));
  }, [id]);

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
        setSelected(new globalThis.Set());
        setWeights({});
        if (!dirty) {
          const l = b.link;
          setForm({
            poolId: l.pool?.id ?? "",
            className: l.className,
            subClass: l.subClass,
            periodStart: l.periodStart,
            periodEnd: l.periodEnd,
            amount: String(l.amount),
            currency: l.currency,
            affiliation: l.affiliation,
            adminFeePct: String(l.adminFeePct),
            adminFeeIntl: String(l.adminFeeIntl),
            adminFeeIntlRevenue: String(l.adminFeeIntlRevenue),
            adminFeeReserved: String(l.adminFeeReserved),
            reserveType: l.reserveType,
            workMethodId: l.workMethodId ?? "",
            roMethodId: l.roMethodId ?? "",
            notes: l.notes,
          });
        }
      })
      .catch((e) => e.name !== "AbortError" && setErr(e.message));
    return () => ctl.abort();
    // dirty is read, not a trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, term, page, tick]);

  useEffect(() => {
    if (tab !== "results") return;
    const ctl = new AbortController();
    fetch(`${api}/results?${new URLSearchParams({ view: rview, page: String(rpage) })}`, { signal: ctl.signal, cache: "no-store" })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error ?? "Could not load the results.");
        setRes(b);
      })
      .catch((e) => e.name !== "AbortError" && toast.error(e.message));
    return () => ctl.abort();
  }, [api, tab, rview, rpage, tick]);

  const locked = d?.locked ?? "";

  const call = async (url: string, init: RequestInit, fail: string) => {
    const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(b.error ?? fail);
    return b;
  };

  const set = (k: keyof typeof form, v: string) => {
    setForm((x) => ({ ...x, [k]: v }));
    setDirty(true);
  };

  const save = async () => {
    setBusy("save");
    try {
      const b = await call(api, { method: "PATCH", body: JSON.stringify({ ...form, poolId: form.poolId || null, workMethodId: form.workMethodId || null, roMethodId: form.roMethodId || null }) }, "Could not save.");
      toast.success(b.needsAllocation ? "Saved. The money settings changed, so run the allocation again." : "Saved.");
      setDirty(false);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy("");
    }
  };

  const allocate = async () => {
    if (dirty && !window.confirm("You have unsaved changes. Run the allocation with the saved settings?")) return;
    setBusy("allocate");
    try {
      const b = await call(`${api}/allocate`, { method: "POST" }, "Could not allocate.");
      toast.success(
        `Allocated ${formatKwacha(b.amount)} across ${b.works.toLocaleString()} works (${b.lines.toLocaleString()} lines). ` +
          `${formatKwacha(b.paid)} paid` +
          (b.reserved ? `, ${formatKwacha(b.reserved)} reserved (${Object.entries(b.byReserve as Record<string, number>).map(([k, v]) => `${k.toLowerCase()} ${formatKwacha(v)}`).join(", ")})` : "") +
          ".",
        { duration: 10000 },
      );
      reload();
      setTab("results");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not allocate.");
      reload();
    } finally {
      setBusy("");
    }
  };

  const remove = async () => {
    if (!d || !window.confirm(`Delete pool link 133-${d.link.seq}-DPL? Its list of works and everything it allocated or reserved are removed too.`)) return;
    try {
      await call(api, { method: "DELETE" }, "Could not delete the link.");
      toast.success("Pool link deleted.");
      router.push(`/admin/distributions/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete the link.");
    }
  };

  const removeWorks = async (body: { workIds?: string[]; all?: boolean }, confirm: string) => {
    if (!window.confirm(confirm)) return;
    try {
      const b = await call(`${api}/works`, { method: "DELETE", body: JSON.stringify(body) }, "Could not remove.");
      toast.success(`Removed ${b.removed.toLocaleString()} work${b.removed === 1 ? "" : "s"}.`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove.");
    }
  };

  const saveWeights = async () => {
    try {
      await call(`${api}/works`, { method: "PATCH", body: JSON.stringify({ items: Object.entries(weights).map(([workId, weight]) => ({ workId, weight })) }) }, "Could not save the weights.");
      toast.success("Weights saved.");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the weights.");
    }
  };

  const addSet = async () => {
    if (!setId) return;
    try {
      const b = await call(`${api}/works`, { method: "POST", body: JSON.stringify({ action: "add", workSetId: setId }) }, "Could not add the work set.");
      toast.success(`Added ${b.added.toLocaleString()} work${b.added === 1 ? "" : "s"} from the set${b.updated ? `, updated ${b.updated.toLocaleString()} weights` : ""}.`);
      setSetId("");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add the work set.");
    }
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
  const poolSel = pools.find((p) => p.id === form.poolId);
  const workMethods = methods.filter((m) => m.target === "Work");
  const roMethods = methods.filter((m) => m.target === "Right owner");
  const money = (n: number) => formatKwacha(n);

  return (
    <div className="pb-20">
      <Link href={`/admin/distributions/${id}`} className="mb-2 inline-flex items-center gap-1 text-xs text-zam-muted hover:text-zam-ink">
        <ArrowLeft size={13} /> {L.distribution.periodLabel}
      </Link>
      <AdminHeader
        title={`133-${L.seq}-DPL · ${L.subClass || L.pool?.code || "Pool link"}`}
        subtitle={[L.pool?.code, L.className, L.pool?.method, L.pool?.rightType && `${L.pool.rightType} right`, [L.periodStart, L.periodEnd].filter(Boolean).join(" → ")].filter(Boolean).join(" · ")}
        right={
          <div className="flex items-center gap-2">
            <StatusBadge status={statusTone(L.status)} className="whitespace-nowrap" />
            <span className="text-xs font-semibold text-zam-muted">{L.status}</span>
            {!locked && (
              <button type="button" onClick={allocate} disabled={busy === "allocate" || d.stats.works === 0 || !(L.amount > 0)} className="inline-flex h-8 items-center rounded-sm bg-zam-orange px-4 text-[13px] font-semibold text-white disabled:opacity-40">
                {busy === "allocate" ? "Allocating…" : "Run Allocation"}
              </button>
            )}
          </div>
        }
      />

      {locked && <p className="mb-3 rounded-sm bg-zam-amber/10 px-4 py-2 text-sm text-[#9a6a00]">{locked}</p>}
      {L.status === "Failed" && L.lastError && <p className="mb-3 rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">The last allocation failed: {L.lastError}</p>}

      <Tabs
        className="mb-3"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "main", label: "Main" },
          ...(L.pool?.method === "Log Based" ? [{ key: "source" as const, label: "Source" }] : []),
          { key: "works", label: "Covered Works", count: d.stats.works },
          { key: "results", label: "Results" },
        ]}
      />

      {tab === "source" && L.pool && <SourceTab linkId={L.id} distributionId={L.distribution.id} link={L} locked={!!locked} onChange={reload} />}

      {tab === "main" && (
        <div className="space-y-3">
          <Panel title="General information" collapsible>
            <dl className="grid gap-x-8 gap-y-3 border-b border-[#eceff3] p-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Main Id">{`133-${L.seq}-DPL`}</Field>
              <Field label="Distribution method">{L.pool?.method}</Field>
              <Field label="Creation class">{L.pool?.creationClass}</Field>
              <Field label="Right type">{L.pool?.rightType}</Field>
              <Field label="Work allocation method">{L.pool?.workMethod || "weight as it is"}</Field>
              <Field label="RO allocation method">{L.pool?.roMethod || "share as it is"}</Field>
              <Field label="Works on the list">{d.stats.works.toLocaleString()}</Field>
              <Field label="Last allocated">{L.allocatedAt ? new Date(L.allocatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : ""}</Field>
            </dl>
            <fieldset disabled={!!locked} className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <Lbl>Distribution pool</Lbl>
                <select value={form.poolId} onChange={(e) => set("poolId", e.target.value)} className={small + " appearance-none bg-white"}>
                  <option value="">— none —</option>
                  {pools.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} · {p.className || p.method} · {p.rightType}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <Lbl>Class</Lbl>
                <input value={form.className} onChange={(e) => set("className", e.target.value)} list="link-classes" className={small} placeholder="e.g. RADIO" />
                <datalist id="link-classes">
                  {[...new Set(["RADIO", "TELEVISION", "CONCERT", ...suggest.classes])].map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
              <label className="block">
                <Lbl>Sub Class</Lbl>
                <input value={form.subClass} onChange={(e) => set("subClass", e.target.value)} list="link-subclasses" className={small} placeholder="e.g. ZNBC-RADIO" />
                <datalist id="link-subclasses">
                  {suggest.subClasses.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
              <label className="block">
                <Lbl>Start date</Lbl>
                <input type="date" value={form.periodStart} onChange={(e) => set("periodStart", e.target.value)} className={small} />
              </label>
              <label className="block">
                <Lbl>End date</Lbl>
                <input type="date" value={form.periodEnd} onChange={(e) => set("periodEnd", e.target.value)} className={small} />
              </label>
              <label className="block">
                <Lbl>Amount</Lbl>
                <input inputMode="decimal" value={form.amount} onChange={(e) => set("amount", e.target.value)} className={small + " text-right"} />
              </label>
              <label className="block">
                <Lbl>Currency</Lbl>
                <input value={form.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} maxLength={3} className={small + " font-mono"} />
              </label>
              <label className="block">
                <Lbl hint="(who is paid)">CMO of affiliation</Lbl>
                <select value={form.affiliation} onChange={(e) => set("affiliation", e.target.value)} className={small + " appearance-none bg-white"}>
                  <option value="ZAMCOPS">ZAMCOPS members (others are reserved)</option>
                  <option value="All">All right-holders</option>
                </select>
              </label>
              <label className="block">
                <Lbl>Reserve type</Lbl>
                <select value={form.reserveType} onChange={(e) => set("reserveType", e.target.value)} className={small + " appearance-none bg-white"}>
                  <option value="">—</option>
                  {RESERVE_TYPE_LIST.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <Lbl hint="%">Domestic admin fee</Lbl>
                <input inputMode="decimal" value={form.adminFeePct} onChange={(e) => set("adminFeePct", e.target.value)} className={small + " text-right"} />
              </label>
              <label className="block">
                <Lbl hint="%">International revenue admin fee</Lbl>
                <input inputMode="decimal" value={form.adminFeeIntlRevenue} onChange={(e) => set("adminFeeIntlRevenue", e.target.value)} className={small + " text-right"} />
              </label>
              <label className="block">
                <Lbl hint="%">International admin fee</Lbl>
                <input inputMode="decimal" value={form.adminFeeIntl} onChange={(e) => set("adminFeeIntl", e.target.value)} className={small + " text-right"} />
              </label>
              <label className="block">
                <Lbl hint="%">Reserved admin fee</Lbl>
                <input inputMode="decimal" value={form.adminFeeReserved} onChange={(e) => set("adminFeeReserved", e.target.value)} className={small + " text-right"} />
              </label>
              <label className="block sm:col-span-2">
                <Lbl hint="(overrides the pool's)">Work allocation method</Lbl>
                <select value={form.workMethodId} onChange={(e) => set("workMethodId", e.target.value)} className={small + " appearance-none bg-white"}>
                  <option value="">— use the pool&apos;s —</option>
                  {workMethods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <Lbl hint="(overrides the pool's)">Right owner allocation method</Lbl>
                <select value={form.roMethodId} onChange={(e) => set("roMethodId", e.target.value)} className={small + " appearance-none bg-white"}>
                  <option value="">— use the pool&apos;s —</option>
                  {roMethods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2 lg:col-span-4">
                <Lbl>Narrative</Lbl>
                <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} className="field-input w-full" />
              </label>
              {poolSel && poolSel.adminFeePct !== Number(form.adminFeePct) && <p className="text-xs text-zam-muted sm:col-span-2 lg:col-span-4">The pool&apos;s own domestic admin fee is {poolSel.adminFeePct}%.</p>}
            </fieldset>
          </Panel>
          {!locked && (
            <button type="button" onClick={remove} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-zam-red/10 px-3 text-[13px] font-semibold text-zam-red hover:bg-zam-red/20">
              <Trash2 size={13} /> Delete this pool link
            </button>
          )}
        </div>
      )}

      {tab === "works" && (
        <div className="space-y-3">
          {!locked && (
            <Panel title="Add works" collapsible>
              <BulkWorkAdd
                endpoint={`${api}/works`}
                onAdded={({ added, updated }) => {
                  toast.success(`Added ${added.toLocaleString()} work${added === 1 ? "" : "s"}${updated ? `, updated ${updated.toLocaleString()} weights` : ""}.${L.status === "Allocated" ? " Run the allocation again to include them." : ""}`);
                  reload();
                }}
                extra={
                  <span className="flex items-center gap-1.5 border-l border-[#d9dde3] pl-3">
                    <select value={setId} onChange={(e) => setSetId(e.target.value)} className="field-input h-8 w-52 appearance-none bg-white text-[13px]" aria-label="Work set">
                      <option value="">Add a Work Set…</option>
                      {sets.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.works.toLocaleString()})
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={addSet} disabled={!setId} className="h-8 rounded-sm bg-white px-3 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8] disabled:opacity-40">
                      Add set
                    </button>
                  </span>
                }
              />
            </Panel>
          )}

          <Panel
            title={`Covered works (${d.stats.works.toLocaleString()})`}
            right={
              <div className="flex items-center gap-2">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter: title, ISWC, id…" className="field-input h-7 w-52" />
                {!locked && Object.keys(weights).length > 0 && (
                  <button type="button" onClick={saveWeights} className="inline-flex h-7 items-center gap-1 rounded-sm bg-zam-orange px-3 text-xs font-semibold text-white">
                    <Save size={12} /> Save weights
                  </button>
                )}
                {!locked &&
                  (selected.size > 0 ? (
                    <button type="button" onClick={() => removeWorks({ workIds: [...selected] }, `Remove ${selected.size} selected work${selected.size === 1 ? "" : "s"} from this list?`)} className="inline-flex h-7 items-center gap-1 rounded-sm bg-zam-red/10 px-3 text-xs font-semibold text-zam-red">
                      <Trash2 size={12} /> Remove {selected.size}
                    </button>
                  ) : (
                    d.stats.works > 0 && (
                      <button type="button" onClick={() => removeWorks({ all: true }, `Remove all ${d.stats.works.toLocaleString()} works from this list?`)} className="text-xs font-semibold text-zam-muted underline hover:text-zam-red">
                        Clear the list
                      </button>
                    )
                  ))}
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr>
                    {!locked && (
                      <Th className="w-8">
                        <input type="checkbox" aria-label="Select all on this page" checked={d.works.length > 0 && d.works.every((w) => selected.has(w.workId))} onChange={(e) => setSelected(e.target.checked ? new globalThis.Set(d.works.map((w) => w.workId)) : new globalThis.Set())} className="h-3.5 w-3.5" />
                      </Th>
                    )}
                    <Th>Main Id</Th>
                    <Th>Work title</Th>
                    <Th>Right-holders</Th>
                    <Th>Status</Th>
                    <Th>Distributable status</Th>
                    <Th className="text-right">Weight</Th>
                    <Th className="text-right">Estimated amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {d.works.map((w) => (
                    <tr key={w.id}>
                      {!locked && (
                        <Td>
                          <input
                            type="checkbox"
                            aria-label={`Select ${w.title}`}
                            checked={selected.has(w.workId)}
                            onChange={(e) => {
                              const n = new globalThis.Set(selected);
                              if (e.target.checked) n.add(w.workId);
                              else n.delete(w.workId);
                              setSelected(n);
                            }}
                            className="h-3.5 w-3.5"
                          />
                        </Td>
                      )}
                      <Td className="whitespace-nowrap font-mono text-xs text-zam-muted">{w.wipoId.startsWith("local_") ? "—" : `133-${w.wipoId}-W`}</Td>
                      <Td className="font-semibold">
                        <Link href={`/admin/catalogue/${w.workId}`} className="hover:text-zam-orange">
                          {w.title}
                        </Link>
                      </Td>
                      <Td className="max-w-[240px] truncate text-xs text-zam-muted">{w.holders.join(", ") || "—"}</Td>
                      <Td className="text-xs">{w.registryStatus || "—"}</Td>
                      <Td className="whitespace-nowrap">
                        {w.status ? (
                          <span title={w.note}>
                            <StatusBadge status={workTone(w.status)} /> <span className="ml-1 text-[11px] text-zam-muted">{w.status}</span>
                            {w.note && <span className="block text-[11px] text-zam-muted">{w.note}</span>}
                          </span>
                        ) : (
                          <span className="text-xs text-zam-muted">Not run yet</span>
                        )}
                      </Td>
                      <Td className="text-right">
                        {locked ? (
                          w.weight
                        ) : (
                          <input inputMode="decimal" value={weights[w.workId] ?? String(w.weight)} onChange={(e) => setWeights({ ...weights, [w.workId]: e.target.value })} className="field-input h-7 w-20 text-right" aria-label={`Weight for ${w.title}`} />
                        )}
                      </Td>
                      <Td className="text-right tabular-nums">{w.estimated ? money(w.estimated) : "—"}</Td>
                    </tr>
                  ))}
                  {d.works.length === 0 && (
                    <tr>
                      <Td colSpan={8} className="py-8 text-center text-zam-muted">
                        {term ? "No works on the list match that." : "No works on this list yet. Add the works played, above."}
                      </Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pager page={page} pageSize={d.pageSize} total={d.total} onPage={setPage} className="border-t border-[#eceff3]" />
          </Panel>
        </div>
      )}

      {tab === "results" && (
        <div className="space-y-3">
          {!res || res.summary.lines === 0 ? (
            <Panel title="Results">
              <p className="p-5 text-sm text-zam-muted">{res ? "This pool link has not been allocated yet. Add works and press Run Allocation." : "Loading…"}</p>
            </Panel>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  ["Allocated", res.summary.allocated],
                  ["Paid", res.summary.paid],
                  ["Reserved", res.summary.reserved],
                  ["Admin fee", res.summary.adminFee],
                  ["Net to right-holders", res.summary.net],
                ].map(([k, v]) => (
                  <div key={String(k)} className="card p-3">
                    <p className="text-xs text-zam-muted">{k}</p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-[#1f4e79]">{money(Number(v))}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <Panel title="Held back (reserves)">
                  {res.summary.reserves.length === 0 ? (
                    <p className="p-4 text-sm text-zam-muted">Nothing was reserved. Every share was paid.</p>
                  ) : (
                    res.summary.reserves.map((r) => (
                      <div key={r.type} className="flex justify-between gap-4 border-b border-[#eceff3] px-4 py-1.5 text-[13px]">
                        <span>
                          {r.type} <span className="text-xs text-zam-muted">· {r.lines.toLocaleString()} lines</span>
                        </span>
                        <span className="tabular-nums">{money(r.amount)}</span>
                      </div>
                    ))
                  )}
                </Panel>
                <Panel title="Works">
                  {res.summary.works.map((w) => (
                    <div key={w.status} className="flex justify-between gap-4 border-b border-[#eceff3] px-4 py-1.5 text-[13px]">
                      <span>{w.status}</span>
                      <span className="tabular-nums">{w.count.toLocaleString()}</span>
                    </div>
                  ))}
                </Panel>
              </div>
            </>
          )}

          <div className="flex gap-2">
            {(["works", "holders", "reserves"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setRview(v);
                  setRpage(1);
                }}
                className={"inline-flex h-8 items-center rounded-sm border px-3 text-[13px] font-semibold " + (rview === v ? "border-[#286090] bg-[#286090] text-white" : "border-[#bfc5ce] bg-white text-[#1f4e79] hover:bg-[#eef3f8]")}
              >
                {v === "works" ? "By work" : v === "holders" ? "By right-holder" : "Reserves"}
              </button>
            ))}
          </div>

          {res && res.view === rview && (
            <Panel title={rview === "works" ? "What each work earned" : rview === "holders" ? "What each right-holder was allocated" : "Reserves from this link"}>
              <div className="overflow-x-auto">
                {rview === "works" && (
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr>
                        <Th>Work</Th>
                        <Th>Distributable status</Th>
                        <Th className="text-right">Weight</Th>
                        <Th className="text-right">Lines</Th>
                        <Th className="text-right">Allocated</Th>
                        <Th className="text-right">Reserved</Th>
                        <Th className="text-right">Admin fee</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {res.rows.map((r) => (
                        <tr key={String(r.id)}>
                          <Td className="font-semibold">
                            <Link href={`/admin/catalogue/${r.id}`} className="hover:text-zam-orange">
                              {String(r.title)}
                            </Link>
                          </Td>
                          <Td className="text-xs">
                            <StatusBadge status={workTone(String(r.status))} /> <span className="ml-1 text-zam-muted">{String(r.status)}</span>
                            {r.note ? <span className="block text-zam-muted">{String(r.note)}</span> : null}
                          </Td>
                          <Td className="text-right tabular-nums">{Number(r.weight)}</Td>
                          <Td className="text-right tabular-nums">{Number(r.lines)}</Td>
                          <Td className="text-right tabular-nums">{money(Number(r.amount))}</Td>
                          <Td className="text-right tabular-nums">{Number(r.reserved) ? money(Number(r.reserved)) : "—"}</Td>
                          <Td className="text-right tabular-nums">{money(Number(r.adminFee))}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {rview === "holders" && (
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr>
                        <Th>Right-holder</Th>
                        <Th>IPI</Th>
                        <Th>Society member</Th>
                        <Th className="text-right">Lines</Th>
                        <Th className="text-right">Allocated</Th>
                        <Th className="text-right">Reserved</Th>
                        <Th className="text-right">Admin fee</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {res.rows.map((r, i) => (
                        <tr key={String(r.id ?? i)}>
                          <Td className="font-semibold">
                            {r.id ? (
                              <Link href={`/admin/register/${r.id}`} className="hover:text-zam-orange">
                                {String(r.name)}
                              </Link>
                            ) : (
                              <span className="text-[#9a6a00]">{String(r.name)}</span>
                            )}
                          </Td>
                          <Td className="font-mono text-xs">{String(r.ipiNumber) || "—"}</Td>
                          <Td>{String(r.affiliated) || "—"}</Td>
                          <Td className="text-right tabular-nums">{Number(r.lines)}</Td>
                          <Td className="text-right tabular-nums">{money(Number(r.amount))}</Td>
                          <Td className="text-right tabular-nums">{Number(r.reserved) ? money(Number(r.reserved)) : "—"}</Td>
                          <Td className="text-right tabular-nums">{money(Number(r.adminFee))}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {rview === "reserves" && (
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr>
                        <Th>Reserve type</Th>
                        <Th>Status</Th>
                        <Th>Reserved</Th>
                        <Th className="text-right">Amount</Th>
                        <Th className="text-right">Distributable</Th>
                        <Th className="text-right">Distributed</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {res.rows.map((r) => (
                        <tr key={String(r.id)}>
                          <Td className="font-semibold">{String(r.reserveType)}</Td>
                          <Td>{String(r.status)}</Td>
                          <Td className="text-xs">{String(r.reservedAt).slice(0, 10)}</Td>
                          <Td className="text-right tabular-nums">{money(Number(r.amount))}</Td>
                          <Td className="text-right tabular-nums">{money(Number(r.distributable))}</Td>
                          <Td className="text-right tabular-nums">{money(Number(r.distributed))}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {res.rows.length === 0 && <p className="px-5 py-8 text-center text-sm text-zam-muted">Nothing to show.</p>}
              </div>
              <Pager page={rpage} pageSize={res.pageSize} total={res.total} onPage={setRpage} className="border-t border-[#eceff3]" />
              <p className="border-t border-[#eceff3] px-4 py-2 text-xs text-zam-muted">
                Full statements per right-holder are on the distribution&apos;s <Link href={`/admin/distributions/${id}`} className="text-zam-orange underline">Statements</Link> tab.
              </p>
            </Panel>
          )}
        </div>
      )}

      <div className={`fixed inset-x-0 bottom-0 z-30 border-t border-[#d9dde3] bg-white px-4 py-2.5 transition-transform lg:left-[250px] ${dirty && !locked ? "translate-y-0" : "translate-y-full"}`}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <span className="text-sm text-zam-muted">You have unsaved changes.</span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setDirty(false);
                reload();
              }}
              disabled={busy === "save"}
              className="h-8 rounded-sm bg-zam-canvas px-4 text-[13px] font-semibold ring-1 ring-zam-line"
            >
              Discard
            </button>
            <button onClick={save} disabled={busy === "save"} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-zam-orange px-5 text-[13px] font-semibold text-white disabled:opacity-50">
              <Save size={13} /> {busy === "save" ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
