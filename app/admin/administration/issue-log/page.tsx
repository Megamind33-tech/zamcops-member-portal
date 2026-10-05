"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td } from "@/components/admin/widgets";

type Row = { id: string; createdAt: string; source: string; message: string };

// WIPO Connect Administration > Issue Log
export default function IssueLogPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/issue-log", { cache: "no-store" });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return setErr(b.error ?? `Could not load (${r.status}).`);
    setRows(b.rows);
    setErr("");
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const clear = async () => {
    if (!window.confirm("Are you sure you want to delete all issue log entries?")) return;
    const r = await fetch("/api/admin/issue-log", { method: "DELETE" });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return toast.error(b.error ?? "Could not delete.");
    toast.success(`${b.deleted} entries deleted.`);
    load();
  };

  return (
    <div>
      <AdminHeader
        title="Issue Log"
        subtitle="Problems the system recorded, such as failed allocations"
        right={
          <button type="button" onClick={clear} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-white px-3 text-[13px] font-semibold text-zam-red ring-1 ring-[#bfc5ce] hover:bg-zam-red/5">
            <Trash2 size={13} /> Delete All
          </button>
        }
      />
      {err && <p className="mb-3 rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}
      <Panel title="Issue Log">
        <table className="w-full">
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Source</Th>
              <Th>Message</Th>
            </tr>
          </thead>
          <tbody>
            {rows?.length === 0 && (
              <tr>
                <Td colSpan={3} className="py-6 text-center text-zam-muted">
                  No data available in table
                </Td>
              </tr>
            )}
            {rows?.map((r) => (
              <tr key={r.id}>
                <Td className="whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</Td>
                <Td>{r.source}</Td>
                <Td>{r.message}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
