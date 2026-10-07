"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Plus, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";
import { Pager } from "@/components/admin/ui";
import { CREATION_CLASSES } from "@/lib/poolConst";

type Row = {
  id: string;
  wipoId: string;
  title: string;
  status: string;
  genre: string;
  iswc: string;
  isrc: string;
  domestic: boolean;
  creationClass: string;
  distributable: string;
  registeredAt: string;
  shareCount: number;
  holders: string[];
  moreHolders: boolean;
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
  const urlCc = useSearchParams().get("cc") ?? "";
  useEffect(() => {
    setPage(1);
  }, [urlCc]);
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);
  const [adding, setAdding] = useState(false);
  const [showAdv, setShowAdv] = useState(false);
  const [adv, setAdv] = useState({ holder: "", genre: "", from: "", to: "", cc: "", repertoire: "" });
  const [advTerm, setAdvTerm] = useState(adv);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const initial = sp.get("q");
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
    const t = setTimeout(() => {
      setAdvTerm(adv);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [adv]);

  const queryString = (extra: Record<string, string> = {}) =>
    new URLSearchParams({ q: term, filter, status, holder: advTerm.holder, genre: advTerm.genre, from: advTerm.from, to: advTerm.to, cc: advTerm.cc || urlCc, repertoire: advTerm.repertoire, ...extra }).toString();

  useEffect(() => {
    const ctl = new AbortController();
    const params = new URLSearchParams({ q: term, filter, status, holder: advTerm.holder, genre: advTerm.genre, from: advTerm.from, to: advTerm.to, cc: advTerm.cc || urlCc, repertoire: advTerm.repertoire, page: String(page) });
    setErr("");
    fetch(`/api/admin/registry/works?${params}`, { signal: ctl.signal })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error ?? `Could not load the register (${r.status}).`);
        setData(b as Result);
      })
      .catch((e) => e.name !== "AbortError" && setErr(e.message));
    return () => ctl.abort();
  }, [term, filter, status, advTerm, page, tick, urlCc]);

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
              className="field-input h-8 w-72"
            />
            <button
              onClick={() => setShowAdv((v) => !v)}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-white px-3 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8]"
            >
              <SlidersHorizontal size={13} /> Advanced search
            </button>
            <a
              href={`/api/admin/registry/works?${queryString({ format: "csv" })}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-white px-3 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8]"
            >
              <Download size={13} /> Export CSV
            </a>
            <a
              href={`/api/admin/registry/works?${queryString({ format: "csv", all: "1" })}`}
              title="Every work that matches, not just the first 20,000, with alternative titles"
              className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-white px-3 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8]"
            >
              <Download size={13} /> Export all
            </a>
            <button
              onClick={() => setAdding((v) => !v)}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-zam-orange px-3 text-[13px] font-semibold text-white"
            >
              <Plus size={13} /> Add work
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

      {showAdv && (
        <div className="card mb-3 grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["holder", "Right Owners Name(s)"],
              ["genre", "Genre in WIPOCOS"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="block">
              <span className="mb-1 block text-[11px] font-semibold text-zam-muted">{label}</span>
              <input value={adv[k]} onChange={(e) => setAdv({ ...adv, [k]: e.target.value })} className="field-input h-8 w-full" />
            </label>
          ))}
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Registration From</span>
            <input type="date" value={adv.from} onChange={(e) => setAdv({ ...adv, from: e.target.value })} className="field-input h-8 w-full" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Registration To</span>
            <input type="date" value={adv.to} onChange={(e) => setAdv({ ...adv, to: e.target.value })} className="field-input h-8 w-full" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Creation Class</span>
            <select value={adv.cc} onChange={(e) => setAdv({ ...adv, cc: e.target.value })} className="field-input h-8 w-full appearance-none bg-white">
              <option value=""></option>
              {CREATION_CLASSES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Domestic Repertoire</span>
            <select value={adv.repertoire} onChange={(e) => setAdv({ ...adv, repertoire: e.target.value })} className="field-input h-8 w-full appearance-none bg-white">
              <option value=""></option>
              <option value="domestic">Domestic</option>
              <option value="foreign">Foreign</option>
            </select>
          </label>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setFilter(f.key);
              setPage(1);
            }}
            className={
              "inline-flex h-7 items-center rounded-sm border px-3 text-[13px] font-semibold transition-colors " +
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
            className="field-input h-7 w-auto appearance-none bg-white pr-8 text-sm"
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
        title="Results"
      >
        {data && <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} className="border-b border-[#eceff3]" />}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-zam-line bg-zam-canvas/60">
                <Th>Main Id</Th>
                <Th>Int. Id</Th>
                <Th>Title</Th>
                <Th>Rights Owners</Th>
                <Th>Creation Class</Th>
                <Th>Repertoire</Th>
                <Th>Distributable Status</Th>
                <Th>Date</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zam-line">
              {!data && !err && (
                <tr>
                  <Td colSpan={9} className="py-10 text-center text-zam-muted">
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-zam-line border-t-zam-orange" />
                  </Td>
                </tr>
              )}
              {data?.works.map((w) => (
                <tr key={w.id}>
                  <Td className="whitespace-nowrap font-mono text-xs text-zam-muted">{w.wipoId.startsWith("local_") ? "—" : `133-${w.wipoId}-W`}</Td>
                  <Td className="font-mono text-[11px] leading-tight">
                    {w.iswc && <div>ISWC: {w.iswc}</div>}
                    {w.isrc && <div>ISRC: {w.isrc}</div>}
                  </Td>
                  <Td>
                    <Link href={`/admin/catalogue/${w.id}`} className="font-semibold text-[#286090] hover:underline">
                      {w.title}
                    </Link>
                  </Td>
                  <Td className="max-w-[260px] truncate text-xs text-zam-muted">{w.holders.length ? w.holders.join(", ") + (w.moreHolders ? " …" : "") : ""}</Td>
                  <Td>{w.creationClass}</Td>
                  <Td>{w.domestic ? "Domestic" : "Foreign"}</Td>
                  <Td className="text-xs">{w.distributable}</Td>
                  <Td className="whitespace-nowrap text-xs">{w.registeredAt}</Td>
                  <Td>{w.status ? <StatusBadge status={w.status === "ACTIVE" ? "Active" : w.status} /> : "—"}</Td>
                </tr>
              ))}
              {data && data.works.length === 0 && (
                <tr>
                  <Td colSpan={9} className="py-10 text-center text-zam-muted">
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
