"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";
import { Pager } from "@/components/admin/ui";
import { formatKwacha } from "@/lib/format";
import { CREATION_CLASSES, POOL_RIGHT_TYPES, RESERVE_STATUSES, RESERVE_TYPE_LIST, STATION_KINDS } from "@/lib/poolConst";

type Row = {
  id: string;
  distributionId: string;
  distribution: string;
  linkId: string | null;
  dpl: string;
  className: string;
  subClass: string;
  creationClass: string;
  rightType: string;
  reserveType: string;
  reservedAt: string;
  closedAt: string | null;
  amount: number;
  distributable: number;
  distributed: number;
  status: string;
  notes: string;
};
type Result = { page: number; pageSize: number; total: number; totals: { amount: number; distributable: number; distributed: number }; distributions: { id: string; periodLabel: string; code: string }[]; rows: Row[] };

const small = "field-input h-8 w-full";
const badge = (s: string) => (s === "Open" ? "Pending" : s === "In Distribution" ? "Processing" : s === "Closed" ? "Approved" : "Paused");

// Reserve Management — money held back by allocations, searched and moved
// through Open / In Distribution / Prescribed / Closed like WIPO Connect.
export default function ReservesPage() {
  const [f, setF] = useState({ distributionId: "", className: "", creationClass: "", rightType: "", reserveType: "", status: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  const qs = (extra: Record<string, string> = {}) => new URLSearchParams(Object.entries({ ...f, ...extra }).filter(([, v]) => v)).toString();

  useEffect(() => {
    const ctl = new AbortController();
    fetch(`/api/admin/reserves?${qs({ page: String(page) })}`, { signal: ctl.signal, cache: "no-store" })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error ?? `Could not load the reserves (${r.status}).`);
        setData(b);
        setErr("");
      })
      .catch((e) => e.name !== "AbortError" && setErr(e.message));
    return () => ctl.abort();
    // qs is derived from f
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, page, tick]);

  const set = (k: keyof typeof f, v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    setPage(1);
  };

  const move = async (r: Row, status: string) => {
    const word = status === "Prescribed" ? "let this reserve prescribe" : status === "Closed" ? "close this reserve" : null;
    if (word && !window.confirm(`Are you sure you want to ${word} (${formatKwacha(r.amount)})?`)) return;
    const res = await fetch(`/api/admin/reserves/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const b = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(b.error ?? "Could not update the reserve.");
    toast.success(`Reserve is now ${status}.`);
    reload();
  };

  return (
    <div>
      <AdminHeader
        title="Reserve Management"
        subtitle="Money held back by allocations until it can be paid"
        right={
          <a href={`/api/admin/reserves?${qs({ format: "csv" })}`} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-white px-3 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8]">
            <Download size={13} /> Export results
          </a>
        }
      />

      <div className="card mb-3 grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Distribution</span>
          <select value={f.distributionId} onChange={(e) => set("distributionId", e.target.value)} className={small + " appearance-none bg-white"}>
            <option value="">All</option>
            {data?.distributions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code ? `${d.code} · ` : ""}
                {d.periodLabel}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Class</span>
          <select value={f.className} onChange={(e) => set("className", e.target.value)} className={small + " appearance-none bg-white"}>
            <option value="">All</option>
            {STATION_KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Creation class</span>
          <select value={f.creationClass} onChange={(e) => set("creationClass", e.target.value)} className={small + " appearance-none bg-white"}>
            <option value="">All</option>
            {CREATION_CLASSES.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Right type</span>
          <select value={f.rightType} onChange={(e) => set("rightType", e.target.value)} className={small + " appearance-none bg-white"}>
            <option value="">All</option>
            {POOL_RIGHT_TYPES.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Reserve type</span>
          <select value={f.reserveType} onChange={(e) => set("reserveType", e.target.value)} className={small + " appearance-none bg-white"}>
            <option value="">All</option>
            {RESERVE_TYPE_LIST.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Status</span>
          <select value={f.status} onChange={(e) => set("status", e.target.value)} className={small + " appearance-none bg-white"}>
            <option value="">All</option>
            {RESERVE_STATUSES.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Reserved from</span>
          <input type="date" value={f.from} onChange={(e) => set("from", e.target.value)} className={small} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Reserved to</span>
          <input type="date" value={f.to} onChange={(e) => set("to", e.target.value)} className={small} />
        </label>
      </div>

      {err && <p className="mb-3 rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}

      <Panel title="Results">
        {data && <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} className="border-b border-[#eceff3]" />}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr>
                <Th>Distribution</Th>
                <Th>DPL</Th>
                <Th>Class</Th>
                <Th>Sub class</Th>
                <Th>CC</Th>
                <Th>RT</Th>
                <Th>Reserve type</Th>
                <Th>Reserved date</Th>
                <Th>Closed / prescribed</Th>
                <Th className="text-right">Amount</Th>
                <Th className="text-right">Distributable</Th>
                <Th className="text-right">Distributed</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {!data && !err && (
                <tr>
                  <Td colSpan={14} className="py-6 text-center text-zam-muted">
                    Loading…
                  </Td>
                </tr>
              )}
              {data?.rows.map((r) => (
                <tr key={r.id}>
                  <Td className="whitespace-nowrap">
                    <Link href={`/admin/distributions/${r.distributionId}`} className="hover:text-zam-orange">
                      {r.distribution}
                    </Link>
                  </Td>
                  <Td className="font-mono text-xs">
                    {r.linkId ? (
                      <Link href={`/admin/distributions/${r.distributionId}/pools/${r.linkId}`} className="hover:text-zam-orange">
                        {r.dpl}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>{r.className || "—"}</Td>
                  <Td>{r.subClass || "—"}</Td>
                  <Td>{r.creationClass}</Td>
                  <Td>{r.rightType === "Performing" ? "PR" : r.rightType === "Mechanical" ? "MR" : r.rightType}</Td>
                  <Td>{r.reserveType}</Td>
                  <Td className="whitespace-nowrap text-xs">{r.reservedAt.slice(0, 10)}</Td>
                  <Td className="whitespace-nowrap text-xs">{r.closedAt ? r.closedAt.slice(0, 10) : "—"}</Td>
                  <Td className="text-right tabular-nums">{formatKwacha(r.amount)}</Td>
                  <Td className="text-right tabular-nums">{formatKwacha(r.distributable)}</Td>
                  <Td className="text-right tabular-nums">{formatKwacha(r.distributed)}</Td>
                  <Td className="whitespace-nowrap">
                    <StatusBadge status={badge(r.status)} /> <span className="ml-1 text-[11px] text-zam-muted">{r.status}</span>
                  </Td>
                  <Td>
                    <select
                      aria-label="Change status"
                      value=""
                      onChange={(e) => e.target.value && move(r, e.target.value)}
                      className="field-input h-7 w-28 appearance-none bg-white text-xs"
                    >
                      <option value="">Move to…</option>
                      {RESERVE_STATUSES.filter((s) => s !== r.status).map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Td>
                </tr>
              ))}
              {data && data.rows.length === 0 && (
                <tr>
                  <Td colSpan={14} className="py-8 text-center text-zam-muted">
                    No reserves match. Reserves appear when an allocation holds money back — an unidentified share, a non-member, shares that do not add up, or a disputed work.
                  </Td>
                </tr>
              )}
            </tbody>
            {data && data.rows.length > 0 && (
              <tfoot>
                <tr className="bg-[#f5f6f8] font-bold">
                  <Td colSpan={9} className="text-right text-xs text-zam-muted">
                    Total of all {data.total.toLocaleString()} matching
                  </Td>
                  <Td className="text-right tabular-nums">{formatKwacha(data.totals.amount)}</Td>
                  <Td className="text-right tabular-nums">{formatKwacha(data.totals.distributable)}</Td>
                  <Td className="text-right tabular-nums">{formatKwacha(data.totals.distributed)}</Td>
                  <Td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Panel>
    </div>
  );
}
