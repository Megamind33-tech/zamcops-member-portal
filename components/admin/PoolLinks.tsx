"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Panel, Th, Td, StatusBadge } from "./widgets";
import { formatKwacha } from "@/lib/format";

type LinkRow = {
  id: string;
  seq: number;
  pool: { id: string; code: string; className: string; method: string; rightType: string; creationClass: string } | null;
  className: string;
  subClass: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  currency: string;
  status: string;
  lastError: string;
  works: number;
  lines: number;
  allocated: number;
  reserved: number;
};
type Pool = { id: string; code: string; name: string; className: string; subClass: string; rightType: string; method: string; adminFeePct: number };

const Lbl = ({ children }: { children: React.ReactNode }) => <span className="mb-1 block text-[11px] font-semibold text-zam-muted">{children}</span>;
const small = "field-input h-8 w-full";
const tone = (s: string) => (s === "Allocated" ? "Approved" : s === "Failed" ? "Rejected" : s === "Allocating" ? "Processing" : "Pending");

// The "Distribution Pool Link" panel of a distribution run, as in WIPO Connect:
// Main Id, Distribution Pool, Creation Class, Right Type, Distribution Method,
// Class, Sub Class, Period, # of Works, Status, Amount. The Class and Sub Class
// of a link are free text (for example RADIO / ZNBC-RADIO). A row opens the pool
// link window (Main · Covered Works · Results) where it is allocated.
export function PoolLinks({ distributionId, onChanged }: { distributionId: string; onChanged: () => void }) {
  const router = useRouter();
  const [data, setData] = useState<{ locked: string; links: LinkRow[]; totalAmount: number; suggestions: { classes: string[]; subClasses: string[] } } | null>(null);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);
  const [filter, setFilter] = useState("");
  const [adding, setAdding] = useState(false);
  const [pools, setPools] = useState<Pool[]>([]);
  const [busy, setBusy] = useState("");
  const [f, setF] = useState({ poolId: "", className: "", subClass: "", periodStart: "", periodEnd: "", amount: "" });

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const ctl = new AbortController();
    fetch(`/api/admin/registry/distributions/${distributionId}/links`, { signal: ctl.signal, cache: "no-store" })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error ?? `Could not load the pool links (${r.status}).`);
        setData(b);
        setErr("");
      })
      .catch((e) => e.name !== "AbortError" && setErr(e.message));
    return () => ctl.abort();
  }, [distributionId, tick]);

  useEffect(() => {
    if (!adding || pools.length) return;
    fetch("/api/admin/pools?status=Open")
      .then((r) => r.json())
      .then((p) => setPools(p.pools ?? []))
      .catch(() => toast.error("Could not load the pools."));
  }, [adding, pools.length]);

  const pickPool = (poolId: string) => {
    const p = pools.find((x) => x.id === poolId);
    setF((x) => ({ ...x, poolId, className: x.className || p?.className || "", subClass: x.subClass || p?.subClass || "" }));
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.poolId) return toast.error("Choose a distribution pool.");
    setBusy("create");
    try {
      const r = await fetch(`/api/admin/registry/distributions/${distributionId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, amount: f.amount === "" ? 0 : f.amount }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? "Could not add the pool link.");
      toast.success("Pool link added. Add its works on the Covered Works tab.");
      onChanged();
      router.push(`/admin/distributions/${distributionId}/pools/${b.id}`);
    } catch (e2) {
      toast.error(e2 instanceof Error ? e2.message : "Could not add the pool link.");
    } finally {
      setBusy("");
    }
  };

  const runAll = async () => {
    setBusy("all");
    try {
      const r = await fetch(`/api/admin/registry/distributions/${distributionId}/actions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "run-all" }) });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? "Could not run the allocations.");
      const ok = (b.results as { ok: boolean }[]).filter((x) => x.ok).length;
      const bad = (b.results as { ok: boolean; seq: number; message: string }[]).filter((x) => !x.ok);
      toast.success(`Ran ${ok} allocation${ok === 1 ? "" : "s"}.${bad.length ? ` ${bad.length} could not run: ${bad.map((x) => `133-${x.seq}-DPL (${x.message})`).join("; ")}` : ""}`, { duration: 9000 });
      reload();
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not run the allocations.");
    } finally {
      setBusy("");
    }
  };

  const allocate = async (l: LinkRow) => {
    setBusy(l.id);
    try {
      const r = await fetch(`/api/admin/registry/distributions/${distributionId}/links/${l.id}/allocate`, { method: "POST" });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? "Could not allocate.");
      toast.success(`Allocated ${formatKwacha(b.amount)} across ${b.works.toLocaleString()} works (${b.lines.toLocaleString()} lines)` + (b.reserved ? ` — ${formatKwacha(b.reserved)} reserved.` : "."), { duration: 8000 });
      reload();
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not allocate.");
      reload();
    } finally {
      setBusy("");
    }
  };

  const remove = async (l: LinkRow) => {
    if (!window.confirm(`Delete 133-${l.seq}-DPL (${l.subClass || l.pool?.code || "pool link"})? Its list of works and any lines or reserves it produced are deleted too.`)) return;
    setBusy(l.id);
    try {
      const r = await fetch(`/api/admin/registry/distributions/${distributionId}/links/${l.id}`, { method: "DELETE" });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? "Could not delete the link.");
      toast.success("Pool link deleted.");
      reload();
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete the link.");
    } finally {
      setBusy("");
    }
  };

  const locked = data?.locked ?? "";
  const unallocated = (data?.links ?? []).filter((l) => l.status !== "Allocated" && l.works > 0 && l.amount > 0).length;
  const shown = (data?.links ?? []).filter((l) => !filter.trim() || [`133-${l.seq}-DPL`, l.pool?.code, l.className, l.subClass].join(" ").toLowerCase().includes(filter.trim().toLowerCase()));

  return (
    <div className="space-y-3">
      {locked && <p className="rounded-sm bg-zam-amber/10 px-4 py-2 text-sm text-[#9a6a00]">{locked}</p>}
      {err && <p className="rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}

      <Panel
        title="Distribution Pool Link"
        right={
          <div className="flex items-center gap-2">
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter:" className="field-input h-7 w-40" />
            {!locked && unallocated > 0 && (
              <button type="button" onClick={runAll} disabled={busy === "all"} className="inline-flex h-7 items-center rounded-sm bg-white px-3 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8] disabled:opacity-50">
                {busy === "all" ? "Running…" : `Run all allocations (${unallocated})`}
              </button>
            )}
            {!locked && (
              <button type="button" onClick={() => setAdding((v) => !v)} className="inline-flex h-7 items-center gap-1.5 rounded-sm bg-zam-orange px-3 text-[13px] font-semibold text-white">
                <Plus size={13} /> Add
              </button>
            )}
          </div>
        }
      >
        {adding && (
          <form onSubmit={create} className="grid gap-3 border-b border-[#eceff3] bg-[#fafbfc] p-4 sm:grid-cols-2 lg:grid-cols-6">
            <label className="block lg:col-span-2">
              <Lbl>Distribution Pool</Lbl>
              <select value={f.poolId} onChange={(e) => pickPool(e.target.value)} className={small + " appearance-none bg-white"}>
                <option value="">— choose —</option>
                {pools.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} · {p.method} · {p.rightType}
                  </option>
                ))}
              </select>
              {pools.length === 0 && (
                <span className="mt-1 block text-[11px] text-zam-muted">
                  No pools yet — <Link href="/admin/pools" className="text-zam-orange underline">create one</Link>.
                </span>
              )}
            </label>
            <label className="block">
              <Lbl>Class</Lbl>
              <input value={f.className} onChange={(e) => setF({ ...f, className: e.target.value })} list="dpl-classes" className={small} placeholder="e.g. RADIO" />
              <datalist id="dpl-classes">
                {[...new Set(["RADIO", "TELEVISION", "CONCERT", ...(data?.suggestions.classes ?? [])])].map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <Lbl>Sub Class</Lbl>
              <input value={f.subClass} onChange={(e) => setF({ ...f, subClass: e.target.value })} list="dpl-subclasses" className={small} placeholder="e.g. ZNBC-RADIO" />
              <datalist id="dpl-subclasses">
                {(data?.suggestions.subClasses ?? []).map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <Lbl>Start Date</Lbl>
              <input type="date" value={f.periodStart} onChange={(e) => setF({ ...f, periodStart: e.target.value })} className={small} />
            </label>
            <label className="block">
              <Lbl>End Date</Lbl>
              <input type="date" value={f.periodEnd} onChange={(e) => setF({ ...f, periodEnd: e.target.value })} className={small} />
            </label>
            <label className="block">
              <Lbl>Amount (ZMW)</Lbl>
              <input inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} className={small + " text-right"} placeholder="0.00" />
            </label>
            <div className="flex items-end gap-2 lg:col-span-5">
              <button type="submit" disabled={busy === "create"} className="inline-flex h-8 items-center rounded-sm bg-zam-orange px-4 text-[13px] font-semibold text-white disabled:opacity-50">
                {busy === "create" ? "Adding…" : "Save and open"}
              </button>
              <button type="button" onClick={() => setAdding(false)} className="inline-flex h-8 items-center rounded-sm bg-white px-4 text-[13px] font-semibold ring-1 ring-[#bfc5ce]">
                Cancel
              </button>
              <span className="text-xs text-zam-muted">Admin fees, reserve type and allocation methods are set on the pool link itself.</span>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr>
                <Th>Main Id</Th>
                <Th>Distribution Pool</Th>
                <Th>Creation Class</Th>
                <Th>Right Type</Th>
                <Th>Distribution Method</Th>
                <Th>Class</Th>
                <Th>Sub Class</Th>
                <Th>Period</Th>
                <Th className="text-right"># of Works</Th>
                <Th>Status</Th>
                <Th className="text-right">Amount</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {!data && !err && (
                <tr>
                  <Td colSpan={12} className="py-6 text-center text-zam-muted">
                    Loading…
                  </Td>
                </tr>
              )}
              {shown.map((l) => (
                <tr key={l.id}>
                  <Td className="whitespace-nowrap font-mono text-xs">
                    <Link href={`/admin/distributions/${distributionId}/pools/${l.id}`} className="font-semibold hover:text-zam-orange">
                      133-{l.seq}-DPL
                    </Link>
                  </Td>
                  <Td className="font-mono text-xs">{l.pool?.code ?? "—"}</Td>
                  <Td>{l.pool?.creationClass ?? "—"}</Td>
                  <Td>{l.pool?.rightType === "Performing" ? "PR" : l.pool?.rightType === "Mechanical" ? "MR" : (l.pool?.rightType ?? "—")}</Td>
                  <Td>{l.pool?.method ?? "—"}</Td>
                  <Td>{l.className || "—"}</Td>
                  <Td className="font-semibold">{l.subClass || "—"}</Td>
                  <Td className="whitespace-nowrap text-xs text-zam-muted">{[l.periodStart, l.periodEnd].filter(Boolean).join(" - ") || "—"}</Td>
                  <Td className="text-right tabular-nums">{l.works ? l.works.toLocaleString() : ""}</Td>
                  <Td className="whitespace-nowrap">
                    <StatusBadge status={tone(l.status)} />
                    <span className="ml-1.5 text-[11px] text-zam-muted" title={l.lastError}>
                      {l.status}
                    </span>
                  </Td>
                  <Td className="text-right tabular-nums">
                    {l.currency === "ZMW" ? formatKwacha(l.amount) : `${l.currency} ${l.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    {l.reserved > 0 && <span className="block text-[11px] text-[#9a6a00]">{formatKwacha(l.reserved)} reserved</span>}
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Link href={`/admin/distributions/${distributionId}/pools/${l.id}`} className="inline-flex h-7 items-center rounded-sm bg-[#e6ebf1] px-2.5 text-xs font-semibold text-[#1f4e79] hover:bg-[#d6dfe9]">
                        Show Details
                      </Link>
                      {!locked && (
                        <>
                          <button type="button" disabled={busy === l.id || !l.works || !(l.amount > 0)} onClick={() => allocate(l)} title={!l.works ? "Add works first" : !(l.amount > 0) ? "Set an amount first" : "Run the allocation for this pool link"} className="inline-flex h-7 items-center rounded-sm bg-zam-orange px-2.5 text-xs font-semibold text-white disabled:opacity-40">
                            {busy === l.id ? "…" : "Run Allocation"}
                          </button>
                          <button type="button" disabled={busy === l.id} onClick={() => remove(l)} aria-label="Delete pool link" className="grid h-7 w-7 place-items-center rounded-sm text-zam-muted hover:bg-zam-red/10 hover:text-zam-red">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
              {data && shown.length === 0 && (
                <tr>
                  <Td colSpan={12} className="py-8 text-center text-zam-muted">
                    {data.links.length ? "No pool links match." : "No pool links yet. Press Add to add one."}
                  </Td>
                </tr>
              )}
            </tbody>
            {data && data.links.length > 0 && (
              <tfoot>
                <tr className="bg-[#f5f6f8] font-bold">
                  <Td colSpan={10} className="text-right text-xs text-zam-muted">
                    Total Amount
                  </Td>
                  <Td className="text-right tabular-nums">{formatKwacha(data.totalAmount)}</Td>
                  <Td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Panel>
    </div>
  );
}
