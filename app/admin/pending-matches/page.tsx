"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td } from "@/components/admin/widgets";
import { Pager } from "@/components/admin/ui";
import { WorkPicker } from "@/components/admin/WorkPicker";

type Cand = { workId: string; title: string; score: number };
type Row = {
  id: string; title: string; creators: string; identifier: string; rows: number; amount: number; score: number | null; status: string; matchedBy: string;
  work: { id: string; title: string; wipoId: string } | null; candidates: Cand[]; dplMainId: string; linkId: string | null; estimated: number;
};
type Result = { page: number; pageSize: number; total: number; canManage: boolean; statuses: string[]; rows: Row[] };

const small = "field-input h-8 w-full";
const BLANK = { amountFrom: "", amountTo: "", status: "", creator: "", class: "", subClass: "", dpl: "" };

// WIPO Connect Matching and Distribution > Pending Matches
function PendingMatches() {
  const sp = useSearchParams();
  const initial = { ...BLANK, dpl: sp.get("dpl") ?? "" };
  const [f, setF] = useState(initial);
  const [applied, setApplied] = useState(initial);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ page: String(page) });
    for (const [k, v] of Object.entries(applied)) if (v) qs.set(k, v);
    const r = await fetch(`/api/admin/pending-matches?${qs}`, { cache: "no-store" });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return setErr(b.error ?? `Could not load (${r.status}).`);
    setData(b);
    setErr("");
  }, [applied, page]);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, action: string, workId?: string) => {
    const r = await fetch("/api/admin/pending-matches", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action, workId }) });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return toast.error(b.error ?? "Could not save.");
    toast.success(action === "match" ? "Matched." : action === "ignore" ? "Ignored." : "Match removed.");
    setOpen(null);
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
      <AdminHeader title="Pending Matches" subtitle="Usage log lines waiting to be matched to a work" />
      <form
        className="card mb-3 grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(f);
          setPage(1);
        }}
      >
        {field("Amount From", <input value={f.amountFrom} onChange={(e) => setF({ ...f, amountFrom: e.target.value })} inputMode="decimal" className={small} />)}
        {field("Amount To", <input value={f.amountTo} onChange={(e) => setF({ ...f, amountTo: e.target.value })} inputMode="decimal" className={small} />)}
        {field(
          "Matching status",
          <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className={small + " appearance-none bg-white"}>
            <option value="">To be matched / Possible / Not matched</option>
            {data?.statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>,
        )}
        {field("Creator", <input value={f.creator} onChange={(e) => setF({ ...f, creator: e.target.value })} className={small} />)}
        {field("Class", <input value={f.class} onChange={(e) => setF({ ...f, class: e.target.value })} className={small} />)}
        {field("Sub Class", <input value={f.subClass} onChange={(e) => setF({ ...f, subClass: e.target.value })} className={small} />)}
        <div className="flex items-end gap-2 lg:col-span-2 lg:justify-end">
          <button
            type="button"
            onClick={() => {
              setF(BLANK);
              setApplied(BLANK);
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
      {applied.dpl && <p className="mb-2 text-[12px] text-zam-muted">Showing one pool link only. Clear to see every line.</p>}
      {err && <p className="mb-3 rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}
      <Panel title="Pending Matches">
        {data && <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} className="border-b border-[#eceff3]" />}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr>
                <Th>Title</Th>
                <Th>Creators</Th>
                <Th>Identifiers</Th>
                <Th>Result</Th>
                <Th>Status</Th>
                <Th>Distr.</Th>
                <Th className="text-right">Estimated Amount</Th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.length === 0 && (
                <tr>
                  <Td colSpan={7} className="py-6 text-center text-zam-muted">
                    No data available in table
                  </Td>
                </tr>
              )}
              {data?.rows.map((r) => (
                <React.Fragment key={r.id}>
                  <tr onClick={() => setOpen(open === r.id ? null : r.id)} className="cursor-pointer hover:bg-[#f3f7fb]">
                    <Td>{r.title}</Td>
                    <Td>{r.creators}</Td>
                    <Td className="font-mono text-xs">{r.identifier}</Td>
                    <Td>{r.work ? `${r.work.title} (${r.score ?? ""}%)` : r.score != null ? `${r.score}%` : ""}</Td>
                    <Td>{r.status}</Td>
                    <Td className="font-mono text-xs">{r.dplMainId}</Td>
                    <Td className="text-right">{r.estimated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Td>
                  </tr>
                  {open === r.id && (
                    <tr>
                      <Td colSpan={7} className="bg-[#fafbfc]">
                        <div className="space-y-2 p-1">
                          <p className="text-[12px] text-zam-muted">
                            {r.rows} row(s) in the log. {r.matchedBy ? `Matched by ${r.matchedBy}.` : ""}
                          </p>
                          {r.candidates.length > 0 && (
                            <ul className="space-y-1">
                              {r.candidates.map((c) => (
                                <li key={c.workId} className="flex items-center justify-between gap-3 text-[13px]">
                                  <span>
                                    {c.title} <span className="text-zam-muted">· {c.score}%</span>
                                  </span>
                                  {data.canManage && (
                                    <button type="button" onClick={() => act(r.id, "match", c.workId)} className="h-7 rounded-sm bg-[#286090] px-3 text-[12px] font-semibold text-white hover:bg-[#204d76]">
                                      Match
                                    </button>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                          {data.canManage && (
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="w-72">
                                <WorkPicker value={null} onPick={(w) => w && act(r.id, "match", w.id)} placeholder="Match to another work…" />
                              </div>
                              <button type="button" onClick={() => act(r.id, "ignore")} className="h-8 rounded-sm bg-white px-3 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8]">
                                Ignore
                              </button>
                              {r.work && (
                                <button type="button" onClick={() => act(r.id, "remove")} className="h-8 rounded-sm bg-white px-3 text-[13px] font-semibold text-zam-red ring-1 ring-[#bfc5ce] hover:bg-zam-red/5">
                                  Remove match
                                </button>
                              )}
                            </div>
                          )}
                        </div>
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

export default function PendingMatchesPage() {
  return (
    <Suspense fallback={null}>
      <PendingMatches />
    </Suspense>
  );
}
