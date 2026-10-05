"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Radio, Trash2, Tv } from "lucide-react";
import { toast } from "sonner";
import { Panel, Th, Td, StatusBadge } from "./widgets";
import { formatKwacha } from "@/lib/format";
import { STATION_KINDS } from "@/lib/poolConst";

type LinkRow = {
  id: string;
  seq: number;
  reserved: number;
  lastError: string;
  pool: { id: string; code: string; kind: string; method: string; rightType: string } | null;
  stationId: string | null;
  stationName: string;
  kind: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  adminFeePct: number;
  status: string;
  works: number;
  lines: number;
  allocated: number;
  adminFee: number;
};
type Pool = { id: string; code: string; name: string; kind: string; method: string; rightType: string; adminFeePct: number; active: boolean };
type Station = { id: string; name: string; kind: string; active: boolean };

const Lbl = ({ children }: { children: React.ReactNode }) => <span className="mb-1 block text-[11px] font-semibold text-zam-muted">{children}</span>;

// The "Distribution Pool Link" table of a distribution run: each row is one
// pool's money for one radio / TV station and period, with its list of works.
export function PoolLinks({ distributionId, onChanged }: { distributionId: string; onChanged: () => void }) {
  const [data, setData] = useState<{ locked: string; links: LinkRow[]; totalAmount: number } | null>(null);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);
  const [adding, setAdding] = useState(false);
  const [pools, setPools] = useState<Pool[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [busy, setBusy] = useState<string>("");
  const [f, setF] = useState({ poolId: "", stationId: "", newName: "", newKind: "Radio", periodStart: "", periodEnd: "", amount: "", adminFeePct: "", notes: "" });

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
    if (!adding || pools.length || stations.length) return;
    Promise.all([fetch("/api/admin/pools").then((r) => r.json()), fetch("/api/admin/stations?active=1").then((r) => r.json())])
      .then(([p, s]) => {
        setPools((p.pools ?? []).filter((x: Pool) => x.active));
        setStations(s.stations ?? []);
      })
      .catch(() => toast.error("Could not load pools and stations."));
  }, [adding, pools.length, stations.length]);

  const pickPool = (poolId: string) => {
    const p = pools.find((x) => x.id === poolId);
    setF((x) => ({ ...x, poolId, adminFeePct: p ? String(p.adminFeePct) : x.adminFeePct }));
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.poolId && !f.stationId && !f.newName.trim()) return toast.error("Choose a pool or a station.");
    setBusy("create");
    try {
      const r = await fetch(`/api/admin/registry/distributions/${distributionId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poolId: f.poolId || undefined,
          stationId: f.stationId || undefined,
          newStation: !f.stationId && f.newName.trim() ? { name: f.newName, kind: f.newKind } : undefined,
          periodStart: f.periodStart,
          periodEnd: f.periodEnd,
          amount: f.amount === "" ? 0 : f.amount,
          adminFeePct: f.adminFeePct,
          notes: f.notes,
        }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? "Could not add the pool link.");
      toast.success("Pool link added. Open its works to add the list of works played.");
      setAdding(false);
      setF({ poolId: "", stationId: "", newName: "", newKind: "Radio", periodStart: "", periodEnd: "", amount: "", adminFeePct: "", notes: "" });
      setStations([]);
      reload();
      onChanged();
    } catch (e2) {
      toast.error(e2 instanceof Error ? e2.message : "Could not add the pool link.");
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
      toast.success(
        `Allocated ${formatKwacha(b.amount)} across ${b.works.toLocaleString()} works (${b.lines.toLocaleString()} lines)` + (b.reserved ? ` — ${formatKwacha(b.reserved)} reserved.` : "."),
        { duration: 8000 },
      );
      reload();
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not allocate.");
    } finally {
      setBusy("");
    }
  };

  const remove = async (l: LinkRow) => {
    if (!window.confirm(`Remove the pool link for ${l.stationName || l.pool?.code || "this link"}? Its list of works and any lines it allocated are removed too.`)) return;
    setBusy(l.id);
    try {
      const r = await fetch(`/api/admin/registry/distributions/${distributionId}/links/${l.id}`, { method: "DELETE" });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? "Could not remove the link.");
      toast.success("Pool link removed.");
      reload();
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove the link.");
    } finally {
      setBusy("");
    }
  };

  const small = "field-input h-8 w-full";
  const published = !!data?.locked;
  const unallocated = (data?.links ?? []).filter((l) => l.status !== "Allocated" && l.works > 0 && l.amount > 0).length;

  const runAll = async () => {
    setBusy("all");
    try {
      const r = await fetch(`/api/admin/registry/distributions/${distributionId}/actions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "run-all" }) });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? "Could not run the allocations.");
      const ok = (b.results as { ok: boolean }[]).filter((x) => x.ok).length;
      const bad = (b.results as { ok: boolean; seq: number; station: string; message: string }[]).filter((x) => !x.ok);
      toast.success(`Ran ${ok} allocation${ok === 1 ? "" : "s"}.${bad.length ? ` ${bad.length} could not run: ${bad.map((x) => `133-${x.seq}-DPL (${x.message})`).join("; ")}` : ""}`, { duration: 9000 });
      reload();
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not run the allocations.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-3">
      {published && <p className="rounded-sm bg-zam-amber/10 px-4 py-2 text-sm text-[#9a6a00]">{data?.locked}</p>}
      {err && <p className="rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}

      <Panel
        title="Distribution pool links"
        right={
          !published && (
            <div className="flex items-center gap-2">
              {unallocated > 0 && (
                <button type="button" onClick={runAll} disabled={busy === "all"} className="inline-flex h-7 items-center rounded-sm bg-white px-3 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8] disabled:opacity-50">
                  {busy === "all" ? "Running…" : `Run all allocations (${unallocated})`}
                </button>
              )}
              <button type="button" onClick={() => setAdding((v) => !v)} className="inline-flex h-7 items-center gap-1.5 rounded-sm bg-zam-orange px-3 text-[13px] font-semibold text-white">
                <Plus size={13} /> Add radio / TV pool link
              </button>
            </div>
          )
        }
      >
        {adding && (
          <form onSubmit={create} className="grid gap-3 border-b border-[#eceff3] bg-[#fafbfc] p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <Lbl>Distribution pool</Lbl>
              <select value={f.poolId} onChange={(e) => pickPool(e.target.value)} className={small + " appearance-none bg-white"}>
                <option value="">— none —</option>
                {pools.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} · {p.kind} · {p.rightType}
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
              <Lbl>Radio / TV station</Lbl>
              <select value={f.stationId} onChange={(e) => setF({ ...f, stationId: e.target.value })} className={small + " appearance-none bg-white"}>
                <option value="">— new station… —</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.kind})
                  </option>
                ))}
              </select>
            </label>
            {!f.stationId && (
              <>
                <label className="block">
                  <Lbl>New station name</Lbl>
                  <input value={f.newName} onChange={(e) => setF({ ...f, newName: e.target.value })} placeholder="e.g. HOPE TV, Radio Phoenix" className={small} />
                </label>
                <label className="block">
                  <Lbl>Station type</Lbl>
                  <select value={f.newKind} onChange={(e) => setF({ ...f, newKind: e.target.value })} className={small + " appearance-none bg-white"}>
                    {STATION_KINDS.map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <label className="block">
              <Lbl>Period start</Lbl>
              <input type="date" value={f.periodStart} onChange={(e) => setF({ ...f, periodStart: e.target.value })} className={small} />
            </label>
            <label className="block">
              <Lbl>Period end</Lbl>
              <input type="date" value={f.periodEnd} onChange={(e) => setF({ ...f, periodEnd: e.target.value })} className={small} />
            </label>
            <label className="block">
              <Lbl>Amount to share out (ZMW)</Lbl>
              <input inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} className={small + " text-right"} placeholder="0.00" />
            </label>
            <label className="block">
              <Lbl>Admin fee %</Lbl>
              <input inputMode="decimal" value={f.adminFeePct} onChange={(e) => setF({ ...f, adminFeePct: e.target.value })} className={small + " text-right"} placeholder="0" />
            </label>
            <label className="block sm:col-span-2 lg:col-span-4">
              <Lbl>Notes</Lbl>
              <input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className={small} />
            </label>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
              <button type="submit" disabled={busy === "create"} className="inline-flex h-8 items-center rounded-sm bg-zam-orange px-4 text-[13px] font-semibold text-white disabled:opacity-50">
                {busy === "create" ? "Adding…" : "Add pool link"}
              </button>
              <button type="button" onClick={() => setAdding(false)} className="inline-flex h-8 items-center rounded-sm bg-white px-4 text-[13px] font-semibold ring-1 ring-[#bfc5ce]">
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr>
                <Th>Main Id</Th>
                <Th>Pool</Th>
                <Th>Class</Th>
                <Th>Station</Th>
                <Th>Period</Th>
                <Th className="text-right"># Works</Th>
                <Th>Status</Th>
                <Th className="text-right">Amount</Th>
                <Th className="text-right">Allocated</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {!data && !err && (
                <tr>
                  <Td colSpan={10} className="py-6 text-center text-zam-muted">
                    Loading…
                  </Td>
                </tr>
              )}
              {data?.links.map((l) => {
                const Icon = l.kind === "Radio" ? Radio : Tv;
                return (
                  <tr key={l.id}>
                    <Td className="whitespace-nowrap font-mono text-xs">
                      <Link href={`/admin/distributions/${distributionId}/pools/${l.id}`} className="hover:text-zam-orange">
                        133-{l.seq}-DPL
                      </Link>
                    </Td>
                    <Td className="font-mono text-xs">{l.pool?.code ?? "—"}</Td>
                    <Td className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon size={13} className="text-[#55789e]" />
                        {l.kind || "—"}
                      </span>
                    </Td>
                    <Td className="font-semibold">
                      <Link href={`/admin/distributions/${distributionId}/pools/${l.id}`} className="hover:text-zam-orange">
                        {l.stationName || "—"}
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-zam-muted">{[l.periodStart, l.periodEnd].filter(Boolean).join(" → ") || "—"}</Td>
                    <Td className="text-right tabular-nums">{l.works ? l.works.toLocaleString() : <span className="text-[#9a6a00]">none</span>}</Td>
                    <Td>
                      <StatusBadge status={l.status === "Allocated" ? "Approved" : l.status === "Failed" ? "Rejected" : l.status === "Allocating" ? "Processing" : "Pending"} className="whitespace-nowrap" />
                      <span className="ml-1.5 text-[11px] text-zam-muted" title={l.lastError}>
                        {l.status}
                      </span>
                    </Td>
                    <Td className="text-right tabular-nums">{formatKwacha(l.amount)}</Td>
                    <Td className="text-right tabular-nums">
                      {l.lines ? formatKwacha(l.allocated) : "—"}
                      {l.reserved > 0 && <span className="block text-[11px] text-[#9a6a00]">{formatKwacha(l.reserved)} reserved</span>}
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <Link href={`/admin/distributions/${distributionId}/pools/${l.id}`} className="inline-flex h-7 items-center rounded-sm bg-[#e6ebf1] px-2.5 text-xs font-semibold text-[#1f4e79] hover:bg-[#d6dfe9]">
                          Works
                        </Link>
                        {!published && (
                          <>
                            <button type="button" disabled={busy === l.id || !l.works || !(l.amount > 0)} onClick={() => allocate(l)} title={!l.works ? "Add works first" : !(l.amount > 0) ? "Set an amount first" : "Run the allocation for this pool link"} className="inline-flex h-7 items-center rounded-sm bg-zam-orange px-2.5 text-xs font-semibold text-white disabled:opacity-40">
                              {busy === l.id ? "…" : l.status === "Allocated" ? "Re-run" : "Run"}
                            </button>
                            <button type="button" disabled={busy === l.id} onClick={() => remove(l)} aria-label="Remove pool link" className="grid h-7 w-7 place-items-center rounded-sm text-zam-muted hover:bg-zam-red/10 hover:text-zam-red">
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
              {data && data.links.length === 0 && (
                <tr>
                  <Td colSpan={10} className="py-8 text-center text-zam-muted">
                    No pool links yet. Add a radio or TV station with the money to share and the works it played.
                  </Td>
                </tr>
              )}
            </tbody>
            {data && data.links.length > 0 && (
              <tfoot>
                <tr className="bg-[#f5f6f8] font-bold">
                  <Td colSpan={7} className="text-right text-xs text-zam-muted">
                    Total
                  </Td>
                  <Td className="text-right tabular-nums">{formatKwacha(data.totalAmount)}</Td>
                  <Td className="text-right tabular-nums">{formatKwacha(data.links.reduce((s, l) => s + l.allocated, 0))}</Td>
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
