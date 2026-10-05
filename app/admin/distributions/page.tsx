"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td } from "@/components/admin/widgets";
import { Pager } from "@/components/admin/ui";
import { formatKwacha } from "@/lib/format";

type Row = {
  id: string;
  code: string;
  name: string;
  method: string;
  dpls: number;
  sum: number;
  allocated: number;
  status: "Done" | "To be Completed";
  published: boolean;
  runAt: string | null;
  hasLogBased: boolean;
};
type Result = { page: number; pageSize: number; total: number; totalAll: number; rows: Row[] };

const small = "field-input h-8 w-full";

// WIPO Connect's Distribution list: Main Id, Name, Method, # of DPLs, Sum
// Amounts, Allocated Amount, Status, Run Date — with the details, Pend. Works,
// Close and delete buttons on each run. Open runs are shown by default.
export default function DistributionPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Open");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [data, setData] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", startDate: "", endDate: "", deadline: "", notes: "" });
  const [busy, setBusy] = useState("");
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
    fetch(`/api/admin/registry/distributions?${new URLSearchParams({ status, q: term, page: String(page), pageSize: String(pageSize) })}`, { signal: ctl.signal, cache: "no-store" })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error ?? `Could not load the distributions (${r.status}).`);
        setData(b);
        setErr("");
      })
      .catch((e) => e.name !== "AbortError" && setErr(e.message));
    return () => ctl.abort();
  }, [status, term, page, pageSize, tick]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("create");
    try {
      const r = await fetch("/api/admin/registry/distributions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? "Could not add the distribution.");
      toast.success(`Distribution ${b.code} added.`);
      router.push(`/admin/distributions/${b.id}`);
    } catch (e2) {
      toast.error(e2 instanceof Error ? e2.message : "Could not add the distribution.");
      setBusy("");
    }
  };

  const act = async (r: Row, action: "close") => {
    if (!window.confirm(`Close distribution ${r.code}? It becomes Done and can no longer be changed until it is reopened.`)) return;
    setBusy(r.id);
    try {
      const res = await fetch(`/api/admin/registry/distributions/${r.id}/actions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const b = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(b.error ?? "That did not work.");
      toast.success(`${r.code} closed.`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy("");
    }
  };

  const remove = async (r: Row) => {
    if (!window.confirm(`Delete distribution ${r.code} “${r.name}”? Its pool links, allocation lines, reserves and member payouts are deleted too. This can't be undone.`)) return;
    setBusy(r.id);
    try {
      const res = await fetch(`/api/admin/registry/distributions/${r.id}`, { method: "DELETE" });
      const b = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(b.error ?? "Could not delete the distribution.");
      toast.success("Distribution deleted.");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete the distribution.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div>
      <AdminHeader title="Distribution" />

      {adding && (
        <form onSubmit={create} className="card mb-3 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block lg:col-span-2">
            <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Name</span>
            <input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={small} placeholder="e.g. 2026 SEPTEMBER DISTRIBUTION" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Start Date</span>
            <input type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} className={small} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-zam-muted">End Date</span>
            <input type="date" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} className={small} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Deadline</span>
            <input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} className={small} />
          </label>
          <label className="block sm:col-span-2 lg:col-span-3">
            <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Narrative</span>
            <input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className={small} />
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <button type="submit" disabled={busy === "create" || !f.name.trim()} className="inline-flex h-8 items-center rounded-sm bg-zam-orange px-4 text-[13px] font-semibold text-white disabled:opacity-40">
              {busy === "create" ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="inline-flex h-8 items-center rounded-sm bg-white px-4 text-[13px] font-semibold ring-1 ring-[#bfc5ce]">
              Cancel
            </button>
          </div>
        </form>
      )}

      {err && <p className="mb-3 rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}

      <Panel
        title="Results"
        right={
          <button type="button" onClick={() => setAdding((v) => !v)} className="inline-flex h-7 items-center gap-1.5 rounded-sm bg-zam-orange px-3 text-[13px] font-semibold text-white">
            <Plus size={13} /> Add Distribution
          </button>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eceff3] px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="relative">
              <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-zam-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter:" className="field-input h-8 w-52 pl-7" />
            </span>
            <label className="flex items-center gap-2 text-[13px] text-zam-muted">
              Show
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="field-input h-8 w-auto appearance-none bg-white pr-6">
                {[25, 50, 100, 200].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
              entries
            </label>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-zam-muted">
            Status
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="field-input h-8 w-auto appearance-none bg-white pr-8">
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
              <option value="all">All</option>
            </select>
          </label>
        </div>

        {data && <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} className="border-b border-[#eceff3]" />}
        {data && data.total !== data.totalAll && <p className="px-3 py-1 text-[11px] text-zam-muted">Filtered from {data.totalAll.toLocaleString()} total entries</p>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr>
                <Th>Main Id</Th>
                <Th>Name</Th>
                <Th>Method</Th>
                <Th className="text-right"># of DPLs</Th>
                <Th className="text-right">Sum Amounts</Th>
                <Th className="text-right">Allocated Amount</Th>
                <Th>Status</Th>
                <Th>Run Date</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {!data && !err && (
                <tr>
                  <Td colSpan={9} className="py-6 text-center text-zam-muted">
                    Loading…
                  </Td>
                </tr>
              )}
              {data?.rows.map((r) => (
                <tr key={r.id}>
                  <Td className="whitespace-nowrap font-mono text-xs">
                    <Link href={`/admin/distributions/${r.id}`} className="font-semibold hover:text-zam-orange">
                      {r.code || "—"}
                    </Link>
                  </Td>
                  <Td>{r.name}</Td>
                  <Td>{r.method || "—"}</Td>
                  <Td className="text-right tabular-nums">{r.dpls || ""}</Td>
                  <Td className="whitespace-nowrap text-right tabular-nums">{formatKwacha(r.sum)}</Td>
                  <Td className="whitespace-nowrap text-right tabular-nums">{formatKwacha(r.allocated)}</Td>
                  <Td>
                    <span className={"inline-block rounded-sm px-2 py-0.5 text-[12px] " + (r.status === "Done" ? "bg-[#d9f2e3] text-[#17683a]" : "bg-[#fff3c4] text-[#7a5b00]")}>{r.status}</span>
                    {r.published && <span className="ml-1.5 text-[11px] text-zam-muted" title="Synced with the member portal">· on portal</span>}
                  </Td>
                  <Td className="whitespace-nowrap text-xs">{r.runAt ? new Date(r.runAt).toLocaleString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).replace(/(\d+)\/(\d+)\/(\d+)/, "$3/$2/$1") : ""}</Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Link href={`/admin/distributions/${r.id}`} aria-label="Show details" title="Show details" className="grid h-7 w-7 place-items-center rounded-sm bg-[#286090] text-white hover:bg-[#204d74]">
                        <Search size={13} />
                      </Link>
                      <Link href={`/admin/distributions/${r.id}?tab=pending`} className="inline-flex h-7 items-center rounded-sm bg-[#286090] px-2 text-[11px] font-semibold text-white hover:bg-[#204d74]">
                        Pend. Works
                      </Link>
                      {r.status !== "Done" && !r.published && (
                        <button type="button" disabled={busy === r.id} onClick={() => act(r, "close")} className="inline-flex h-7 items-center rounded-sm bg-[#7a8a99] px-2 text-[11px] font-semibold text-white hover:bg-[#667785] disabled:opacity-50">
                          Close
                        </button>
                      )}
                      {r.status !== "Done" && !r.published && (
                        <button type="button" disabled={busy === r.id} onClick={() => remove(r)} aria-label="Delete distribution" className="grid h-7 w-7 place-items-center rounded-sm bg-[#286090] text-white hover:bg-zam-red disabled:opacity-50">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
              {data && data.rows.length === 0 && (
                <tr>
                  <Td colSpan={9} className="py-8 text-center text-zam-muted">
                    No distributions {term ? "match that" : status === "Open" ? "are open" : "here"}. Press Add Distribution to start one.
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
