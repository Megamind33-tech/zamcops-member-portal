"use client";

import React, { useEffect, useState } from "react";
import { Td, Th } from "./widgets";
import { Pager } from "./ui";

type Entry = {
  id: string;
  adminName: string;
  action: string;
  summary: string;
  changes: string;
  createdAt: string;
};
type Change = { field: string; from: string; to: string };

const parse = (s: string): Change[] => {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

// One record's history — the Audit tab: who changed it, when, and which field
// went from what to what. Fed by /api/admin/audit?targetType=&targetId=.
export function AuditTrail({ targetType, targetId }: { targetType: string; targetId: string }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; pageSize: number; logs: Entry[] } | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const ctl = new AbortController();
    setErr("");
    fetch(`/api/admin/audit?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}&page=${page}`, { signal: ctl.signal })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error ?? `Could not load the history (${r.status}).`);
        setData(b);
      })
      .catch((e) => e.name !== "AbortError" && setErr(e.message));
    return () => ctl.abort();
  }, [targetType, targetId, page]);

  if (err) return <p className="p-4 text-sm text-zam-red">{err}</p>;
  if (!data) return <p className="p-4 text-sm text-zam-muted">Loading history…</p>;

  const rows = data.logs.flatMap((l) => {
    const ch = parse(l.changes);
    const when = new Date(l.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
    if (ch.length === 0) return [{ key: l.id, who: l.adminName, when, field: l.summary || l.action, from: "", to: "" }];
    return ch.map((c, i) => ({ key: `${l.id}-${i}`, who: l.adminName, when, field: c.field, from: c.from, to: c.to }));
  });

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr>
              <Th>Author of the change</Th>
              <Th>Change date</Th>
              <Th>Modified field</Th>
              <Th>Previous value</Th>
              <Th>Updated value</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <Td>{r.who}</Td>
                <Td className="whitespace-nowrap">{r.when}</Td>
                <Td>{r.field}</Td>
                <Td className="max-w-[260px] break-words text-zam-muted">{r.from || "—"}</Td>
                <Td className="max-w-[260px] break-words">{r.to || "—"}</Td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <Td colSpan={5} className="py-6 text-center text-zam-muted">
                  No changes have been recorded for this record yet.
                </Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} className="border-t border-[#eceff3]" />
    </div>
  );
}
