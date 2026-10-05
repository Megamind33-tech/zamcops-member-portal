"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Panel, Th, Td, StatusBadge } from "./widgets";
import { Pager } from "./ui";

type Result = {
  page: number;
  pageSize: number;
  total: number;
  notRun: number;
  byStatus: { status: string; count: number }[];
  works: { id: string; workId: string; title: string; iswc: string; wipoId: string; registryStatus: string; status: string; note: string; linkId: string; linkSeq: number; station: string }[];
};

// "Pend. Works" — the works in this run's pool links that could not be paid in
// full, with the reason. Fix the work (its shares or status) and run the pool
// link again.
export function PendingWorks({ distributionId, refresh }: { distributionId: string; refresh: number }) {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Result | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const ctl = new AbortController();
    fetch(`/api/admin/registry/distributions/${distributionId}/pending?${new URLSearchParams({ q: term, page: String(page) })}`, { signal: ctl.signal, cache: "no-store" })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error ?? `Could not load the pending works (${r.status}).`);
        setData(b);
        setErr("");
      })
      .catch((e) => e.name !== "AbortError" && setErr(e.message));
    return () => ctl.abort();
  }, [distributionId, term, page, refresh]);

  return (
    <div className="space-y-3">
      {err && <p className="rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}
      {data && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-sm border border-[#d9dde3] bg-white px-4 py-2 text-[13px]">
          {data.byStatus.length === 0 && <span className="text-zam-muted">No works on any pool link yet.</span>}
          {data.byStatus.map((s) => (
            <span key={s.status} className={s.status === "Not distributable" ? "text-zam-red" : s.status === "Partially distributable" ? "text-[#9a6a00]" : s.status === "Fully distributable" ? "text-zam-green" : "text-zam-muted"}>
              <b>{s.count.toLocaleString()}</b> {s.status.toLowerCase()}
            </span>
          ))}
          {data.notRun > 0 && <span className="text-zam-muted">Some links have not been run yet — their works show as &ldquo;not run&rdquo;.</span>}
        </div>
      )}
      <Panel
        title="Pending works"
        right={<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter: title, ISWC…" className="field-input h-7 w-52" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr>
                <Th>Main Id</Th>
                <Th>Work title</Th>
                <Th>Register status</Th>
                <Th>Pool link</Th>
                <Th>Distributable status</Th>
                <Th>Reason</Th>
              </tr>
            </thead>
            <tbody>
              {!data && !err && (
                <tr>
                  <Td colSpan={6} className="py-6 text-center text-zam-muted">
                    Loading…
                  </Td>
                </tr>
              )}
              {data?.works.map((w) => (
                <tr key={w.id}>
                  <Td className="whitespace-nowrap font-mono text-xs text-zam-muted">{w.wipoId.startsWith("local_") ? "—" : `133-${w.wipoId}-W`}</Td>
                  <Td className="font-semibold">
                    <Link href={`/admin/catalogue/${w.workId}`} className="hover:text-zam-orange">
                      {w.title}
                    </Link>
                  </Td>
                  <Td className="text-xs">{w.registryStatus || "—"}</Td>
                  <Td className="whitespace-nowrap text-xs">
                    <Link href={`/admin/distributions/${distributionId}/pools/${w.linkId}`} className="font-mono hover:text-zam-orange">
                      133-{w.linkSeq}-DPL
                    </Link>
                    {w.station && <span className="ml-1 text-zam-muted">{w.station}</span>}
                  </Td>
                  <Td className="whitespace-nowrap">
                    <StatusBadge status={w.status === "Not distributable" ? "Rejected" : "Pending"} /> <span className="ml-1 text-[11px] text-zam-muted">{w.status}</span>
                  </Td>
                  <Td className="text-xs text-zam-muted">{w.note || "—"}</Td>
                </tr>
              ))}
              {data && data.works.length === 0 && (
                <tr>
                  <Td colSpan={6} className="py-8 text-center text-zam-muted">
                    {term ? "No pending works match that." : "No pending works. Every allocated work was paid in full — or no pool link has been run yet."}
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data && <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} className="border-t border-[#eceff3]" />}
      </Panel>
    </div>
  );
}
