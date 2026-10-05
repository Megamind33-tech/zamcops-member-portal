"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Link2, Send } from "lucide-react";
import { toast } from "sonner";
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
  email: string;
  inviteStatus: "member" | "invited" | "ready" | "noemail";
  inviteSentAt: string | null;
};
type Result = {
  page: number;
  pageSize: number;
  total: number;
  stats: { all: number; withIpi: number; linked: number; ready: number; invited: number; noEmail: number; affiliated: number; other: number };
  holders: Holder[];
};

const FILTERS = [
  { key: "", label: "All" },
  { key: "ipi", label: "With IPI number" },
  { key: "member", label: "Portal members" },
  { key: "ready", label: "Ready to invite" },
  { key: "invited", label: "Invited" },
  { key: "noemail", label: "Need an email" },
] as const;

const INVITE_LABEL: Record<Holder["inviteStatus"], string> = {
  member: "Has an account",
  invited: "Invited",
  ready: "Ready to invite",
  noemail: "No email yet",
};

export function RegisterList({ embedded = false, scope }: { embedded?: boolean; scope?: "affiliated" | "other" }) {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);
  const [sending, setSending] = useState(false);

  const sendBatch = async () => {
    if (!data?.stats.ready) return;
    const n = Math.min(50, data.stats.ready);
    if (!window.confirm(`Send invitation emails to ${n} right-holder${n === 1 ? "" : "s"} now? (${data.stats.ready} are ready in total.)`)) return;
    setSending(true);
    try {
      const r = await fetch("/api/admin/register/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error ?? "Could not send invites.");
      toast.success(`Sent ${b.sent} invite${b.sent === 1 ? "" : "s"}${b.skipped ? ` · ${b.skipped} skipped` : ""} · ${b.remaining} still waiting`);
      setTick((t) => t + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send invites.");
    } finally {
      setSending(false);
    }
  };

  // arriving from a member page with ?q=
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q");
    if (initial) setQ(initial);
  }, []);

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
    const params = new URLSearchParams({ q: term, filter, page: String(page), ...(scope ? { scope } : {}) });
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
  }, [term, filter, page, tick, scope]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const subtitle = data
    ? scope === "affiliated"
      ? `${data.stats.affiliated.toLocaleString()} ZAMCOPS members on the society register · ${data.stats.linked} with a portal account · ${data.stats.invited} invited · ${data.stats.ready.toLocaleString()} ready to invite`
      : scope === "other"
        ? `${data.stats.other.toLocaleString()} other right-holders on the register (not shown as ZAMCOPS members)`
        : `${data.stats.all.toLocaleString()} on the register · ${data.stats.linked} with a portal account · ${data.stats.invited} invited · ${data.stats.ready.toLocaleString()} ready to invite · ${data.stats.noEmail.toLocaleString()} need an email`
    : "WIPO Connect register";

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, IPI, NRC, WIPOCOS ID…"
        className="field-input h-10 w-72"
      />
      <button
        onClick={sendBatch}
        disabled={sending || !data?.stats.ready}
        className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-zam-orange px-3.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        <Send size={14} /> {sending ? "Sending…" : "Send invites"}
      </button>
    </div>
  );

  return (
    <div>
      {embedded ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zam-muted">{subtitle}</p>
          {controls}
        </div>
      ) : (
        <AdminHeader title="Right-holders" subtitle={subtitle} right={controls} />
      )}

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
        title={data ? `${data.total.toLocaleString()} ${scope === "affiliated" ? "ZAMCOPS members" : "right-holders"}` : "Loading…"}
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
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-zam-line bg-zam-canvas/60">
                <Th>Name</Th>
                <Th>IPI number</Th>
                <Th>IPI base</Th>
                <Th>WIPOCOS ID</Th>
                <Th>NRC</Th>
                <Th>Status</Th>
                <Th className="text-right">Works</Th>
                <Th>Portal account</Th>
                <Th>Invite</Th>
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
                  <Td className="text-xs">
                    <span className={h.inviteStatus === "noemail" ? "text-zam-muted" : "font-medium text-zam-ink"}>
                      {INVITE_LABEL[h.inviteStatus]}
                    </span>
                    {h.email && h.inviteStatus !== "member" && <div className="text-[11px] text-zam-muted">{h.email}</div>}
                  </Td>
                </tr>
              ))}
              {data && data.holders.length === 0 && (
                <tr>
                  <Td colSpan={9} className="py-10 text-center text-zam-muted">
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
