"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td } from "@/components/admin/widgets";
import { Pager } from "@/components/admin/ui";

type Row = {
  id: string; fileCode: string; filename: string; uploadedAt: string; startedAt: string | null; endedAt: string | null; rows: number; groups: number; processed: number; errors: number;
  distribution: string; distributionId: string | null; dplMainId: string; linkId: string | null; status: string; priority: number;
};

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString() : "");
const secs = (a: string | null, b: string | null) => (a && b ? `${Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 1000))} s` : "");

// WIPO Connect Matching and Distribution > Usage Log
export default function UsageLogPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ page: number; pageSize: number; total: number; canManage: boolean; rows: Row[] } | null>(null);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/usage-logs?page=${page}`, { cache: "no-store" });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return setErr(b.error ?? `Could not load (${r.status}).`);
    setData(b);
    setErr("");
    setSel([]);
  }, [page]);
  useEffect(() => {
    load();
  }, [load]);

  const bulk = async (action: "rematch" | "priority" | "delete") => {
    if (action === "delete" && !window.confirm(`Are you sure you want to delete ${sel.length} usage log(s) and their lines?`)) return;
    setBusy(true);
    try {
      if (action === "delete") {
        const res = await Promise.all(sel.map((id) => fetch(`/api/admin/usage-logs?id=${id}`, { method: "DELETE" }).then(async (r) => ({ ok: r.ok, b: await r.json().catch(() => ({})) }))));
        const bad = res.find((x) => !x.ok);
        if (bad) toast.error(bad.b.error ?? "Could not delete.");
        else toast.success("Deleted.");
      } else {
        const r = await fetch("/api/admin/usage-logs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: sel, action }) });
        const b = await r.json().catch(() => ({}));
        if (!r.ok) toast.error(b.error ?? "Failed.");
        else toast.success(action === "rematch" ? "Re-matched." : "Priority set.");
      }
    } finally {
      setBusy(false);
      load();
    }
  };

  return (
    <div>
      <AdminHeader title="Usage Log" subtitle="Usage files imported for Log Based pool links" />
      {err && <p className="mb-3 rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}
      <Panel
        title="Usage Log"
        right={
          data?.canManage && (
            <span className="flex items-center gap-2">
              <span className="text-[12px] text-zam-muted">Bulk Actions:</span>
              {(["rematch", "priority", "delete"] as const).map((a) => (
                <button key={a} type="button" disabled={sel.length === 0 || busy} onClick={() => bulk(a)} className="h-7 rounded-sm bg-white px-3 text-[12px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8] disabled:opacity-40">
                  {a === "rematch" ? "Rematch" : a === "priority" ? "Set max priority" : "Delete"}
                </button>
              ))}
            </span>
          )
        }
      >
        {data && <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} className="border-b border-[#eceff3]" />}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr>
                <Th>
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={!!data && data.rows.length > 0 && sel.length === data.rows.length}
                    onChange={(e) => setSel(e.target.checked ? (data?.rows.map((r) => r.id) ?? []) : [])}
                  />
                </Th>
                <Th>File Code</Th>
                <Th>Filename</Th>
                <Th>Upload Date</Th>
                <Th>Matching Start Date</Th>
                <Th>Process Time</Th>
                <Th>Rows Count</Th>
                <Th>Groups Count</Th>
                <Th>Distribution</Th>
                <Th>DPL Main Id</Th>
                <Th>Status</Th>
                <Th>Priority</Th>
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
                  <Td className="font-mono text-xs">{r.fileCode}</Td>
                  <Td>{r.filename}</Td>
                  <Td className="whitespace-nowrap">{fmt(r.uploadedAt)}</Td>
                  <Td className="whitespace-nowrap">{fmt(r.startedAt)}</Td>
                  <Td>{secs(r.startedAt, r.endedAt)}</Td>
                  <Td>{r.rows}</Td>
                  <Td>{r.groups}</Td>
                  <Td>{r.distributionId ? <Link href={`/admin/distributions/${r.distributionId}`} className="text-[#286090] hover:underline">{r.distribution}</Link> : r.distribution}</Td>
                  <Td className="font-mono text-xs">
                    {r.linkId && r.distributionId ? (
                      <Link href={`/admin/distributions/${r.distributionId}/pools/${r.linkId}`} className="text-[#286090] hover:underline">
                        {r.dplMainId}
                      </Link>
                    ) : (
                      r.dplMainId
                    )}
                  </Td>
                  <Td>{r.status}</Td>
                  <Td>{r.priority}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
