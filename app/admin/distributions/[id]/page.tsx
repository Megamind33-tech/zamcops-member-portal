"use client";

import React, { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { toast } from "sonner";
import { AdminStat, Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";
import { money } from "@/components/admin/RunsList";

type Row = {
  id: string | null;
  label: string;
  sub: string;
  memberId: string | null;
  lines: number;
  amount: number;
  adminFee: number;
  reserved: number;
};
type Detail = {
  run: {
    id: string;
    periodLabel: string;
    code: string;
    status: string;
    startDate: string;
    endDate: string;
    notes: string;
    imported: boolean;
    memberPayouts: number;
  };
  totals: { lines: number; allocated: number; adminFee: number; reserved: number; rightHolders: number; works: number };
  view: "holders" | "works";
  page: number;
  pageSize: number;
  total: number;
  rows: Row[];
};
type Line = {
  id: string;
  work: { id: string; title: string; iswc: string } | null;
  rightHolder: { id: string; displayName: string } | null;
  roleCode: string;
  rightType: string;
  amount: number;
  total: number;
  adminFee: number;
  reserved: number;
  disputed: boolean;
};

export default function DistributionRunPage() {
  const { id } = useParams<{ id: string }>();
  const [view, setView] = useState<"holders" | "works">("holders");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(() => {
    let live = true;
    fetch(`/api/admin/register/distributions/${id}?${new URLSearchParams({ view, q: term, page: String(page) })}`)
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw new Error(b.error ?? "Could not load this distribution.");
        if (live) setD(b);
      })
      .catch((e) => live && setErr(e.message));
    return () => {
      live = false;
    };
  }, [id, view, term, page]);
  useEffect(load, [load]);

  const toggle = async (rowId: string | null) => {
    if (!rowId) return;
    if (open === rowId) {
      setOpen(null);
      return;
    }
    setOpen(rowId);
    setLines(null);
    const r = await fetch(`/api/admin/register/distributions/${id}/statement?${view === "holders" ? "holder" : "work"}=${rowId}`);
    const b = await r.json();
    setLines(r.ok ? b.lines : []);
  };

  const prepare = async () => {
    if (
      !window.confirm(
        "Prepare member payouts from this run? Every right owner linked to a portal account gets an entry with what they were allocated. Nothing is shown to members until you publish the run.",
      )
    )
      return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/register/distributions/${id}/entries`, { method: "POST" });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error ?? "Could not prepare payouts.");
      toast.success(`Payouts prepared for ${b.members} member${b.members === 1 ? "" : "s"}. The run is ${b.status}.`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not prepare payouts.");
    } finally {
      setBusy(false);
    }
  };

  if (err) return <p className="rounded-xl bg-zam-red/10 px-4 py-3 text-sm text-zam-red">{err}</p>;
  if (!d) return <p className="text-sm text-zam-muted">Loading…</p>;
  const pages = Math.max(1, Math.ceil(d.total / d.pageSize));

  return (
    <div>
      <Link
        href="/admin/distributions"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-zam-muted hover:text-zam-ink"
      >
        <ArrowLeft size={14} /> Distributions
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-zam-ink">{d.run.periodLabel}</h1>
          <p className="text-sm text-zam-muted">
            {d.run.code && `${d.run.code} · `}
            {d.run.startDate || d.run.endDate ? `${d.run.startDate || "…"} → ${d.run.endDate || "…"}` : "No period dates"}
            {d.run.imported && " · imported from WIPO Connect"}
          </p>
          {d.run.notes && <p className="mt-1 max-w-2xl text-sm text-zam-muted">{d.run.notes}</p>}
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={d.run.status} />
          <button
            onClick={prepare}
            disabled={busy || d.totals.lines === 0}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-zam-orange px-3.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Users size={14} /> {busy ? "Preparing…" : d.run.memberPayouts ? "Refresh member payouts" : "Prepare member payouts"}
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <AdminStat icon={<span>Σ</span>} label="Allocated" value={money(d.totals.allocated)} />
        <AdminStat icon={<span>%</span>} label="Admin fee" value={money(d.totals.adminFee)} tone="gold" />
        <AdminStat icon={<span>R</span>} label="Reserved" value={money(d.totals.reserved)} tone="amber" />
        <AdminStat icon={<span>#</span>} label="Right owners" value={d.totals.rightHolders.toLocaleString()} tone="emerald" />
        <AdminStat icon={<span>♪</span>} label="Works" value={d.totals.works.toLocaleString()} />
      </div>
      {d.run.memberPayouts > 0 && (
        <p className="mb-4 rounded-xl bg-zam-green/10 px-4 py-2.5 text-sm text-zam-ink">
          Member payouts exist for {d.run.memberPayouts} member{d.run.memberPayouts === 1 ? "" : "s"}.{" "}
          {d.run.status === "Published"
            ? "They can see them now."
            : "Members see nothing until this run is published from the Distributions page."}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-zam-line bg-white p-1">
          {(
            [
              ["holders", "By right owner"],
              ["works", "By work"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => {
                setView(k);
                setPage(1);
                setOpen(null);
              }}
              className={
                "rounded-lg px-4 py-2 text-sm font-semibold transition-colors " +
                (view === k ? "bg-zam-orange text-white" : "text-zam-muted hover:text-zam-ink")
              }
            >
              {label}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={view === "works" ? "Search a work title…" : "Search a right owner…"}
          className="field-input h-10 w-72"
        />
      </div>

      <Panel
        title={`${d.total.toLocaleString()} ${view === "works" ? "works" : "right owners"}`}
        right={
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
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-zam-line bg-zam-canvas/60">
                <Th>{view === "works" ? "Work" : "Right owner"}</Th>
                <Th className="text-right">Lines</Th>
                <Th className="text-right">Allocated</Th>
                <Th className="text-right">Admin fee</Th>
                <Th className="text-right">Reserved</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zam-line">
              {d.rows.map((r, i) => (
                <Fragment key={r.id ?? `none-${i}`}>
                  <tr className={"hover:bg-zam-canvas/50 " + (r.id ? "cursor-pointer" : "")} onClick={() => toggle(r.id)}>
                    <Td>
                      <span className="font-semibold text-zam-ink">{r.label}</span>
                      {r.memberId && (
                        <span className="ml-2 rounded bg-zam-green/12 px-1.5 py-0.5 text-[10px] font-bold text-zam-green">
                          portal member
                        </span>
                      )}
                      {r.sub && <div className="text-[11px] text-zam-muted">{r.sub}</div>}
                    </Td>
                    <Td className="text-right tabular-nums">{r.lines}</Td>
                    <Td className="text-right font-semibold tabular-nums">{money(r.amount)}</Td>
                    <Td className="text-right tabular-nums">{money(r.adminFee)}</Td>
                    <Td className="text-right tabular-nums">{money(r.reserved)}</Td>
                  </tr>
                  {open && open === r.id && (
                    <tr>
                      <td colSpan={5} className="bg-zam-canvas/50 px-6 py-4">
                        {!lines ? (
                          <p className="text-sm text-zam-muted">Loading…</p>
                        ) : (
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-[11px] uppercase tracking-wider text-zam-muted">
                                <th className="py-1.5">{view === "works" ? "Right owner" : "Work"}</th>
                                <th>Role</th>
                                <th>Right</th>
                                <th className="text-right">Amount</th>
                                <th className="text-right">Fee</th>
                                <th className="text-right">Reserved</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lines.map((l) => (
                                <tr key={l.id} className="border-t border-zam-line/70">
                                  <td className="py-1.5">
                                    {view === "works" ? (
                                      l.rightHolder ? (
                                        <Link href={`/admin/register/${l.rightHolder.id}`} className="hover:text-zam-orange">
                                          {l.rightHolder.displayName}
                                        </Link>
                                      ) : (
                                        "—"
                                      )
                                    ) : l.work ? (
                                      <Link href={`/admin/registry/${l.work.id}`} className="hover:text-zam-orange">
                                        {l.work.title}
                                      </Link>
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                  <td>{l.roleCode || "—"}</td>
                                  <td>{l.rightType || "—"}</td>
                                  <td className="text-right tabular-nums">{money(l.amount)}</td>
                                  <td className="text-right tabular-nums">{money(l.adminFee)}</td>
                                  <td className="text-right tabular-nums">
                                    {money(l.reserved)}
                                    {l.disputed && " ⚠"}
                                  </td>
                                </tr>
                              ))}
                              {lines.length === 0 && (
                                <tr>
                                  <td colSpan={6} className="py-2 text-zam-muted">
                                    No lines.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {d.rows.length === 0 && (
                <tr>
                  <Td colSpan={5} className="py-8 text-center text-zam-muted">
                    Nothing matches.
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
