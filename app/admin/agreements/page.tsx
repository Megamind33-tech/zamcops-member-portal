"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td } from "@/components/admin/widgets";
import { Pager } from "@/components/admin/ui";

type Row = { id: string; code: string; assignor: string; assignee: string; type: string; creationClass: string; works: number; territory: string; rightTypes: string[]; effectiveEnd: string; status: string; active: boolean };
type Result = { page: number; pageSize: number; total: number; canManage: boolean; options: { types: string[]; statuses: string[]; rightCategories: string[] }; rows: Row[] };

const small = "field-input h-8 w-full";
const EMPTY = { identifier: "", statusCode: "", fkType: "", includeInactive: false, assignorName: "", assigneeName: "", rightTypeCode: "" };
const TYPE_LABEL: Record<string, string> = { General: "General Agreement", Implied: "Implied Agreement", "Specific Exclude": "Specific Exclude Agreement", "Specific Include": "Specific Include Agreement" };

// WIPO Connect Agreements and Mandates > Browse
export default function AgreementsPage() {
  const [f, setF] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState<string[]>([]);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ page: String(page) });
    for (const [k, v] of Object.entries(applied)) if (v) qs.set(k, v === true ? "1" : String(v));
    const r = await fetch(`/api/admin/agreements?${qs}`, { cache: "no-store" });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return setErr(b.error ?? `Could not load (${r.status}).`);
    setData(b);
    setErr("");
    setSel([]);
  }, [applied, page]);
  useEffect(() => {
    load();
  }, [load]);

  const bulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${sel.length} agreement(s)?`)) return;
    const res = await Promise.all(sel.map((id) => fetch(`/api/admin/agreements/${id}`, { method: "DELETE" })));
    const failed = res.filter((r) => !r.ok).length;
    if (failed) toast.error(`${failed} could not be deleted.`);
    else toast.success("Deleted.");
    load();
  };

  const field = (label: string, el: React.ReactNode) => (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-zam-muted">{label}</span>
      {el}
    </label>
  );

  return (
    <div>
      <AdminHeader
        title="Agreements and Mandates"
        subtitle="Rights assigned between right owners"
        right={
          data?.canManage ? (
            <Link href="/admin/agreements/new" className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-[#286090] px-3 text-[13px] font-semibold text-white hover:bg-[#204d76]">
              <Plus size={13} /> Add Agreement
            </Link>
          ) : undefined
        }
      />
      <form
        className="card mb-3 grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(f);
          setPage(1);
        }}
      >
        {field("Code", <input value={f.identifier} onChange={(e) => setF({ ...f, identifier: e.target.value })} className={small} />)}
        {field(
          "Status",
          <select value={f.statusCode} onChange={(e) => setF({ ...f, statusCode: e.target.value })} className={small + " appearance-none bg-white"}>
            <option value=""></option>
            {data?.options.statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>,
        )}
        {field(
          "Agreement Type",
          <select value={f.fkType} onChange={(e) => setF({ ...f, fkType: e.target.value })} className={small + " appearance-none bg-white"}>
            <option value=""></option>
            {data?.options.types.map((s) => (
              <option key={s} value={s}>
                {TYPE_LABEL[s]}
              </option>
            ))}
          </select>,
        )}
        <label className="flex items-end gap-1.5 pb-1.5 text-[13px]">
          <input type="checkbox" checked={f.includeInactive} onChange={(e) => setF({ ...f, includeInactive: e.target.checked })} /> Include Inactive
        </label>
        {field("Assignor", <input value={f.assignorName} onChange={(e) => setF({ ...f, assignorName: e.target.value })} className={small} />)}
        {field("Assignee", <input value={f.assigneeName} onChange={(e) => setF({ ...f, assigneeName: e.target.value })} className={small} />)}
        {field(
          "Right Category",
          <select value={f.rightTypeCode} onChange={(e) => setF({ ...f, rightTypeCode: e.target.value })} className={small + " appearance-none bg-white"}>
            <option value=""></option>
            {data?.options.rightCategories.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>,
        )}
        <div className="flex items-end gap-2 sm:justify-end">
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
      <Panel
        title="Agreements"
        right={
          data?.canManage && (
            <button type="button" disabled={sel.length === 0} onClick={bulkDelete} className="h-7 rounded-sm bg-white px-3 text-[12px] font-semibold text-zam-red ring-1 ring-[#bfc5ce] hover:bg-zam-red/5 disabled:opacity-40">
              Bulk Actions: Delete ({sel.length})
            </button>
          )
        }
      >
        {data && <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} className="border-b border-[#eceff3]" />}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr>
                <Th />
                <Th>Code</Th>
                <Th>Assignor</Th>
                <Th>Assignee</Th>
                <Th>Type</Th>
                <Th>Creation Class</Th>
                <Th># of Works</Th>
                <Th>Territory</Th>
                <Th>Right Category</Th>
                <Th>Effective End Date</Th>
                <Th>Status</Th>
                <Th>Active</Th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.length === 0 && (
                <tr>
                  <Td colSpan={12} className="py-6 text-center text-zam-muted">
                    No data available in table
                  </Td>
                </tr>
              )}
              {data?.rows.map((r) => (
                <tr key={r.id} className="hover:bg-[#f3f7fb]">
                  <Td>
                    <input type="checkbox" checked={sel.includes(r.id)} onChange={(e) => setSel((x) => (e.target.checked ? [...x, r.id] : x.filter((i) => i !== r.id)))} />
                  </Td>
                  <Td>
                    <Link href={`/admin/agreements/${r.id}`} className="font-medium text-[#286090] hover:underline">
                      {r.code}
                    </Link>
                  </Td>
                  <Td>{r.assignor}</Td>
                  <Td>{r.assignee}</Td>
                  <Td>{TYPE_LABEL[r.type] ?? r.type}</Td>
                  <Td>{r.creationClass}</Td>
                  <Td>{r.works}</Td>
                  <Td>{r.territory}</Td>
                  <Td>{r.rightTypes.join(", ")}</Td>
                  <Td>{r.effectiveEnd}</Td>
                  <Td>{r.status}</Td>
                  <Td>{r.active ? "Yes" : "No"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
