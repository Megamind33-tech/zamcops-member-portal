"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td } from "@/components/admin/widgets";
import { Pager } from "@/components/admin/ui";

type Change = { field: string; from: string; to: string };
type Log = { id: string; adminName: string; adminEmail: string; action: string; targetType: string; targetId: string; summary: string; changes: string; createdAt: string };
type Result = { page: number; pageSize: number; total: number; logs: Log[]; authors: { id: string; email: string }[]; entityTypes: string[] };

const small = "field-input h-8 w-full";
const EMPTY = { entityType: "", from: "", to: "", author: "", mainId: "", terminal: false };

// WIPO Connect BI & Reports > Audit
export default function AuditPage() {
  const [f, setF] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ search: "1", page: String(page) });
    for (const [k, v] of Object.entries(applied)) if (v) qs.set(k, v === true ? "1" : String(v));
    const r = await fetch(`/api/admin/audit?${qs}`, { cache: "no-store" });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return setErr(b.error ?? `Could not load (${r.status}).`);
    setData(b);
    setErr("");
  }, [applied, page]);
  useEffect(() => {
    load();
  }, [load]);

  const changes = (l: Log): Change[] => {
    try {
      return l.changes ? JSON.parse(l.changes) : [];
    } catch {
      return [];
    }
  };

  return (
    <div>
      <AdminHeader title="Audit" subtitle="Who changed what, and when" />
      <form
        className="card mb-3 grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(f);
          setPage(1);
        }}
      >
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Entity Type</span>
          <select value={f.entityType} onChange={(e) => setF({ ...f, entityType: e.target.value })} className={small + " appearance-none bg-white"}>
            <option value=""></option>
            {data?.entityTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Start Audit Period</span>
          <input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className={small} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-zam-muted">End Audit Period</span>
          <input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className={small} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Author of the Change</span>
          <select value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} className={small + " appearance-none bg-white"}>
            <option value=""></option>
            {data?.authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.email}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Main ID</span>
          <input value={f.mainId} onChange={(e) => setF({ ...f, mainId: e.target.value })} className={small} />
        </label>
        <label className="flex items-end gap-1.5 pb-1.5 text-[13px]">
          <input type="checkbox" checked={f.terminal} onChange={(e) => setF({ ...f, terminal: e.target.checked })} /> Show only Terminal
        </label>
        <div className="flex items-end gap-2 lg:col-span-2 lg:justify-end">
          <button
            type="button"
            onClick={() => {
              setF(EMPTY);
              setApplied(EMPTY);
              setPage(1);
            }}
            className="h-8 rounded-sm bg-white px-3 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8]"
          >
            Clear
          </button>
          <button type="submit" className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-[#286090] px-3 text-[13px] font-semibold text-white hover:bg-[#204d76]">
            <Search size={13} /> Search
          </button>
        </div>
      </form>
      {err && <p className="mb-3 rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}
      <Panel title="Audit">
        {data && <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} className="border-b border-[#eceff3]" />}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Author</Th>
                <Th>Entity Type</Th>
                <Th>Main ID</Th>
                <Th>Action</Th>
                <Th>Detail</Th>
              </tr>
            </thead>
            <tbody>
              {data?.logs.length === 0 && (
                <tr>
                  <Td colSpan={6} className="py-6 text-center text-zam-muted">
                    No data available in table
                  </Td>
                </tr>
              )}
              {data?.logs.map((l) => (
                <React.Fragment key={l.id}>
                  <tr onClick={() => setOpen(open === l.id ? null : l.id)} className="cursor-pointer hover:bg-[#f3f7fb]">
                    <Td className="whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</Td>
                    <Td>{l.adminEmail || l.adminName}</Td>
                    <Td>{l.targetType}</Td>
                    <Td className="font-mono text-xs">{l.targetId}</Td>
                    <Td className="font-mono text-xs">{l.action}</Td>
                    <Td>{l.summary}</Td>
                  </tr>
                  {open === l.id && changes(l).length > 0 && (
                    <tr>
                      <Td colSpan={6} className="bg-[#fafbfc]">
                        <table className="w-full text-[12px]">
                          <tbody>
                            {changes(l).map((c, i) => (
                              <tr key={i}>
                                <td className="w-48 py-0.5 font-semibold">{c.field}</td>
                                <td className="py-0.5 text-zam-muted">{c.from || "—"}</td>
                                <td className="w-6 py-0.5">→</td>
                                <td className="py-0.5">{c.to || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </Td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
