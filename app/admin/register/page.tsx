"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Link2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";

type Holder = {
  id: string;
  wipoId: string;
  displayName: string;
  kind: string;
  ipiNumber: string;
  ipiBaseNumber: string;
  wipocosId: string;
  nrc: string;
  status: string;
  isAffiliated: boolean;
  shareCount: number;
  member: { id: string; memberNumber: string } | null;
};
type Result = {
  page: number;
  pageSize: number;
  total: number;
  stats: { all: number; withIpi: number; linked: number };
  holders: Holder[];
};

const FILTERS = [
  { key: "", label: "All" },
  { key: "ipi", label: "With IPI number" },
  { key: "member", label: "Portal members" },
] as const;

export default function RegisterPage() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Result | null>(null);
  const [err, setErr] = useState("");

  // debounce typing so each keystroke is not a query over 20k rows
  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let live = true;
    const params = new URLSearchParams({ q: term, filter, page: String(page) });
    setErr("");
    fetch(`/api/admin/register/holders?${params}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Could not load the register.");
        return body as Result;
      })
      .then((d) => live && setData(d))
      .catch((e) => live && setErr(e.message));
    return () => {
      live = false;
    };
  }, [term, filter, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <AdminHeader
        title="Right-holders"
        subtitle={
          data
            ? `${data.stats.all.toLocaleString()} on the WIPO Connect register · ${data.stats.withIpi.toLocaleString()} with an IPI number · ${data.stats.linked} linked to portal members`
            : "WIPO Connect register"
        }
        right={
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, IPI, NRC, WIPOCOS ID…"
            className="field-input h-10 w-72"
          />
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setFilter(f.key);
              setPage(1);
            }}
            className={
              "inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors " +
              (filter === f.key
                ? "border-zam-orange bg-zam-orange text-white"
                : "border-zam-line bg-white text-zam-muted hover:bg-zam-canvas hover:text-zam-ink")
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {err && <p className="mb-4 rounded-xl bg-zam-red/10 px-4 py-3 text-sm text-zam-red">{err}</p>}

      <Panel
        title={data ? `${data.total.toLocaleString()} right-holders` : "Loading…"}
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
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="border-b border-zam-line bg-zam-canvas/60">
                <Th>Name</Th>
                <Th>IPI number</Th>
                <Th>IPI base</Th>
                <Th>WIPOCOS ID</Th>
                <Th>NRC</Th>
                <Th>Status</Th>
                <Th className="text-right">Works</Th>
                <Th>Portal</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zam-line">
              {data?.holders.map((h) => (
                <tr key={h.id} className="hover:bg-zam-canvas/50">
                  <Td>
                    <Link href={`/admin/register/${h.id}`} className="font-semibold text-zam-ink hover:text-zam-orange">
                      {h.displayName}
                    </Link>
                    {h.kind !== "Person" && <span className="ml-2 text-[11px] text-zam-muted">{h.kind}</span>}
                  </Td>
                  <Td className="font-mono text-xs">{h.ipiNumber || "—"}</Td>
                  <Td className="font-mono text-xs">{h.ipiBaseNumber || "—"}</Td>
                  <Td className="font-mono text-xs">{h.wipocosId || "—"}</Td>
                  <Td className="font-mono text-xs">{h.nrc || "—"}</Td>
                  <Td>{h.status ? <StatusBadge status={h.status === "ACTIVE" ? "Active" : h.status} /> : "—"}</Td>
                  <Td className="text-right tabular-nums">{h.shareCount.toLocaleString()}</Td>
                  <Td>
                    {h.member ? (
                      <Link
                        href={`/admin/members/${h.member.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-zam-orange"
                      >
                        <Link2 size={12} /> {h.member.memberNumber}
                      </Link>
                    ) : (
                      <span className="text-xs text-zam-muted">No account</span>
                    )}
                  </Td>
                </tr>
              ))}
              {data && data.holders.length === 0 && (
                <tr>
                  <Td colSpan={8} className="py-10 text-center text-zam-muted">
                    No right-holders match.
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
