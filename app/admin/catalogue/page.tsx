"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";

type Row = {
  id: string;
  wipoId: string;
  title: string;
  status: string;
  genre: string;
  iswc: string;
  isrc: string;
  domestic: boolean;
  registeredAt: string;
  shareCount: number;
  holders: string[];
};
type Result = {
  page: number;
  pageSize: number;
  total: number;
  stats: { all: number; statuses: { status: string; count: number }[] };
  works: Row[];
};

const FILTERS = [
  { key: "", label: "All" },
  { key: "nosplits", label: "No shares recorded" },
  { key: "noiswc", label: "No ISWC" },
  { key: "domestic", label: "Domestic" },
] as const;

export default function CataloguePage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

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
    const ctl = new AbortController();
    const params = new URLSearchParams({ q: term, filter, status, page: String(page) });
    setErr("");
    fetch(`/api/admin/registry/works?${params}`, { signal: ctl.signal })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error ?? `Could not load the register (${r.status}).`);
        setData(b as Result);
      })
      .catch((e) => e.name !== "AbortError" && setErr(e.message));
    return () => ctl.abort();
  }, [term, filter, status, page, tick]);

  const create = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTitle.trim()) return;
      const r = await fetch("/api/admin/registry/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) return toast.error(b.error ?? "Could not add the work.");
      router.push(`/admin/catalogue/${b.id}`);
    },
    [newTitle, router],
  );

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <AdminHeader
        title="Registered Works"
        subtitle={data ? `${data.stats.all.toLocaleString()} works on the society register` : "The society register of works"}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, ISWC, ISRC…"
              className="field-input h-10 w-72"
            />
            <button
              onClick={() => setAdding((v) => !v)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-zam-orange px-3.5 text-sm font-semibold text-white"
            >
              <Plus size={15} /> Add work
            </button>
          </div>
        }
      />

      {adding && (
        <form onSubmit={create} className="card mb-5 flex flex-wrap items-center gap-3 p-4">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title of the new work"
            className="field-input h-10 w-80 max-w-full"
          />
          <button type="submit" disabled={!newTitle.trim()} className="h-10 rounded-xl bg-zam-orange px-4 text-sm font-semibold text-white disabled:opacity-40">
            Create &amp; open
          </button>
        </form>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setFilter(f.key);
              setPage(1);
            }}
            className={
              "inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors " +
              (filter === f.key ? "border-zam-orange bg-zam-orange text-white" : "border-zam-line bg-white text-zam-muted hover:bg-zam-canvas hover:text-zam-ink")
            }
          >
            {f.label}
          </button>
        ))}
        {data && data.stats.statuses.filter((s) => s.status).length > 1 && (
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="field-input h-9 w-auto appearance-none bg-white pr-8 text-sm"
            aria-label="Filter by status"
          >
            <option value="">Any status</option>
            {data.stats.statuses
              .filter((s) => s.status)
              .map((s) => (
                <option key={s.status} value={s.status}>
                  {s.status} ({s.count.toLocaleString()})
                </option>
              ))}
          </select>
        )}
      </div>

      {err && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-zam-red/10 px-4 py-3 text-sm text-zam-red">
          <span>{err}</span>
          <button onClick={() => setTick((t) => t + 1)} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      <Panel
        title={data ? `${data.total.toLocaleString()} works` : "Loading…"}
        right={
          data && (
            <div className="flex items-center gap-2 text-xs text-zam-muted">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-zam-line bg-white disabled:opacity-40" aria-label="Previous page">
                <ChevronLeft size={14} />
              </button>
              <span>
                Page {page} of {pages.toLocaleString()}
              </span>
              <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-zam-line bg-white disabled:opacity-40" aria-label="Next page">
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
                <Th>Right-holders</Th>
                <Th>ISWC</Th>
                <Th>ISRC</Th>
                <Th>Genre</Th>
                <Th>Registered</Th>
                <Th>Status</Th>
                <Th className="text-right">Shares</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zam-line">
              {!data && !err && (
                <tr>
                  <Td colSpan={8} className="py-10 text-center text-zam-muted">
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-zam-line border-t-zam-orange" />
                  </Td>
                </tr>
              )}
              {data?.works.map((w) => (
                <tr key={w.id} className="hover:bg-zam-canvas/50">
                  <Td>
                    <Link href={`/admin/catalogue/${w.id}`} className="font-semibold text-zam-ink hover:text-zam-orange">
                      {w.title}
                    </Link>
                    {w.domestic && <span className="ml-2 text-[11px] text-zam-muted">Domestic</span>}
                  </Td>
                  <Td className="max-w-[260px] truncate text-xs text-zam-muted" >
                    {w.holders.length ? w.holders.join(", ") + (w.shareCount > w.holders.length ? ` +${w.shareCount - w.holders.length}` : "") : "—"}
                  </Td>
                  <Td className="font-mono text-xs">{w.iswc || "—"}</Td>
                  <Td className="font-mono text-xs">{w.isrc || "—"}</Td>
                  <Td className="text-xs">{w.genre || "—"}</Td>
                  <Td className="whitespace-nowrap text-xs text-zam-muted">{w.registeredAt || "—"}</Td>
                  <Td>{w.status ? <StatusBadge status={w.status === "ACTIVE" ? "Active" : w.status} /> : "—"}</Td>
                  <Td className="text-right tabular-nums">{w.shareCount}</Td>
                </tr>
              ))}
              {data && data.works.length === 0 && (
                <tr>
                  <Td colSpan={8} className="py-10 text-center text-zam-muted">
                    {data.stats.all === 0
                      ? "No works on the register yet. Import the WIPO Connect export, or add one with “Add work”."
                      : "No works match."}
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
