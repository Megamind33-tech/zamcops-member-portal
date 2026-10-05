"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";

type Row = {
  id: string;
  wipoId: string;
  title: string;
  status: string;
  iswc: string;
  genre: string;
  registeredAt: string;
  edited: boolean;
  shareCount: number;
  writers: string[];
};
type Result = {
  page: number;
  pageSize: number;
  total: number;
  stats: { all: number; byStatus: { status: string; count: number }[] };
  works: Row[];
};

export default function WorksRegistryPage() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Result | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q");
    if (initial) setQ(initial);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let live = true;
    setErr("");
    fetch(`/api/admin/register/works?${new URLSearchParams({ q: term, status, page: String(page) })}`)
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw new Error(b.error ?? "Could not load the works register.");
        return b as Result;
      })
      .then((d) => live && setData(d))
      .catch((e) => live && setErr(e.message));
    return () => {
      live = false;
    };
  }, [term, status, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <AdminHeader
        title="Works Registry"
        subtitle={data ? `${data.stats.all.toLocaleString()} works on the society register` : "Society register"}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, writer, ISWC, ISRC, WIPO id…"
              className="field-input h-10 w-80"
            />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="field-input h-10 w-44"
            >
              <option value="">All statuses</option>
              {data?.stats.byStatus
                .filter((s) => s.status)
                .map((s) => (
                  <option key={s.status} value={s.status}>
                    {s.status} ({s.count.toLocaleString()})
                  </option>
                ))}
            </select>
          </div>
        }
      />

      {err && <p className="mb-4 rounded-xl bg-zam-red/10 px-4 py-3 text-sm text-zam-red">{err}</p>}

      <Panel
        title={data ? `${data.total.toLocaleString()} works` : "Loading…"}
        right={
          data && (
            <div className="flex items-center gap-2 text-xs text-zam-muted">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-zam-line bg-white disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              <span>
                Page {page} of {pages.toLocaleString()}
              </span>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-zam-line bg-white disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-zam-line bg-zam-canvas/60">
                <Th>Title</Th>
                <Th>Right owners</Th>
                <Th>ISWC</Th>
                <Th>Genre</Th>
                <Th>Registered</Th>
                <Th>Status</Th>
                <Th className="text-right">Shares</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zam-line">
              {data?.works.map((w) => (
                <tr key={w.id} className="hover:bg-zam-canvas/50">
                  <Td>
                    <Link href={`/admin/registry/${w.id}`} className="font-semibold text-zam-ink hover:text-zam-orange">
                      {w.title}
                    </Link>
                    {w.edited && (
                      <span className="ml-2 rounded bg-zam-orange-soft px-1.5 py-0.5 text-[10px] font-bold text-zam-orange">edited</span>
                    )}
                    <div className="text-[11px] text-zam-muted">WIPO {w.wipoId}</div>
                  </Td>
                  <Td className="text-xs">{w.writers.length ? w.writers.join(", ") : <span className="text-zam-muted">—</span>}</Td>
                  <Td className="font-mono text-xs">{w.iswc || "—"}</Td>
                  <Td className="text-xs">{w.genre || "—"}</Td>
                  <Td className="text-xs">{w.registeredAt || "—"}</Td>
                  <Td>{w.status ? <StatusBadge status={w.status === "REGISTERED" ? "Active" : w.status} /> : "—"}</Td>
                  <Td className="text-right tabular-nums">{w.shareCount}</Td>
                </tr>
              ))}
              {data && data.works.length === 0 && (
                <tr>
                  <Td colSpan={7} className="py-10 text-center text-zam-muted">
                    No works match.
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
