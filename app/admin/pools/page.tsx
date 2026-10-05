"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";

type Pool = {
  id: string;
  code: string;
  name: string;
  className: string;
  subClass: string;
  method: string;
  creationClass: string;
  rightType: string;
  adminFeePct: number;
  workMethodName: string;
  roMethodName: string;
  active: boolean;
  links: number;
};

// Distribution pools — WIPO Connect's reusable setups (for example TV-WL-01):
// the method, creation class and right type a block of money is shared by, the
// work and right-owner allocation methods, and how shortfalls are handled.
export default function PoolsPage() {
  const [rows, setRows] = useState<Pool[] | null>(null);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("Open");
  const [q, setQ] = useState("");

  useEffect(() => {
    const ctl = new AbortController();
    setRows(null);
    fetch(`/api/admin/pools?status=${status}`, { signal: ctl.signal, cache: "no-store" })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error ?? `Could not load the pools (${r.status}).`);
        setRows(b.pools);
        setErr("");
      })
      .catch((e) => e.name !== "AbortError" && setErr(e.message));
    return () => ctl.abort();
  }, [status]);

  const shown = (rows ?? []).filter((p) => !q.trim() || [p.code, p.name, p.className, p.subClass, p.method].join(" ").toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div>
      <AdminHeader
        title="Distribution Pools"
        subtitle="Reusable setups a distribution's pool links draw on"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" className="field-input h-8 w-44" />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="field-input h-8 w-auto appearance-none bg-white pr-8" aria-label="Status">
              <option>Open</option>
              <option>Archived</option>
              <option value="all">All</option>
            </select>
            <Link href="/admin/pools/new" className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-zam-orange px-3 text-[13px] font-semibold text-white">
              <Plus size={13} /> Add Distribution Pool
            </Link>
          </div>
        }
      />
      {err && <p className="mb-3 rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}
      <Panel title="Results">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr>
                <Th>Code</Th>
                <Th>Class</Th>
                <Th>Sub class</Th>
                <Th>Creation class</Th>
                <Th>RT</Th>
                <Th>Distribution method</Th>
                <Th>Work allocation</Th>
                <Th>RO allocation</Th>
                <Th className="text-right">Admin fee</Th>
                <Th className="text-right">Links</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {!rows && !err && (
                <tr>
                  <Td colSpan={11} className="py-6 text-center text-zam-muted">
                    Loading…
                  </Td>
                </tr>
              )}
              {shown.map((p) => (
                <tr key={p.id}>
                  <Td className="font-mono text-xs font-bold">
                    <Link href={`/admin/pools/${p.id}`} className="hover:text-zam-orange">
                      {p.code}
                    </Link>
                    {p.name && <span className="ml-2 font-sans font-normal text-zam-muted">{p.name}</span>}
                  </Td>
                  <Td>{p.className || "—"}</Td>
                  <Td>{p.subClass || "—"}</Td>
                  <Td>{p.creationClass}</Td>
                  <Td>{p.rightType === "Performing" ? "PR" : p.rightType === "Mechanical" ? "MR" : p.rightType}</Td>
                  <Td>{p.method}</Td>
                  <Td className="text-xs">{p.workMethodName || "—"}</Td>
                  <Td className="text-xs">{p.roMethodName || "—"}</Td>
                  <Td className="text-right tabular-nums">{p.adminFeePct}%</Td>
                  <Td className="text-right tabular-nums">{p.links}</Td>
                  <Td>
                    <StatusBadge status={p.active ? "Active" : "Paused"} />
                  </Td>
                </tr>
              ))}
              {rows && shown.length === 0 && (
                <tr>
                  <Td colSpan={11} className="py-8 text-center text-zam-muted">
                    No pools here. A pool such as TV-WL-01 says which class of use and which right a block of money pays.
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
