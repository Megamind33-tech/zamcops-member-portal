"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";
import { formatDate } from "@/lib/format";

type Group = { id: string; name: string; code: string; kind: string; status: string; description: string; memberCount: number; updatedAt: string };
type GroupApp = {
  id: string;
  ownerId: string;
  status: string;
  payload: Record<string, unknown>;
  submittedAt?: string;
  updatedAt: string;
  owner?: { id: string; fullName: string; memberNumber: string };
};

const KINDS = ["Group", "Band", "Ensemble", "Estate", "Publisher", "Other"];

export default function GroupsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"register" | "applications">("register");
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [apps, setApps] = useState<GroupApp[] | null>(null);
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", kind: "Group", code: "" });

  useEffect(() => {
    const t = setTimeout(() => setTerm(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const ctl = new AbortController();
    setErr("");
    const url = tab === "register" ? `/api/admin/groups?q=${encodeURIComponent(term)}` : "/api/admin/applications?formType=Group";
    fetch(url, { signal: ctl.signal, cache: "no-store" })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error ?? `Could not load (${r.status}).`);
        if (tab === "register") setGroups(b.groups);
        else setApps(b.applications);
      })
      .catch((e) => e.name !== "AbortError" && setErr(e.message));
    return () => ctl.abort();
  }, [tab, term, tick]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/admin/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return toast.error(b.error ?? "Could not create the group.");
    router.push(`/admin/groups/${b.id}`);
  };

  const shownApps = (apps ?? []).filter((a) => {
    if (!term) return true;
    const hay = `${a.owner?.fullName ?? ""} ${a.owner?.memberNumber ?? ""} ${String(a.payload.groupName ?? "")}`.toLowerCase();
    return hay.includes(term.toLowerCase());
  });

  return (
    <div>
      <AdminHeader
        title="Groups"
        subtitle="Bands, ensembles, estates and other collectives of right-holders"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search groups…" className="field-input h-10 w-64" />
            {tab === "register" && (
              <button onClick={() => setAdding((v) => !v)} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-zam-orange px-3.5 text-sm font-semibold text-white">
                <Plus size={15} /> New group
              </button>
            )}
          </div>
        }
      />

      <div className="mb-5 flex gap-2">
        {([["register", "Register groups"], ["applications", "Group applications"]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={
              "inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors " +
              (tab === k ? "border-zam-orange bg-zam-orange text-white" : "border-zam-line bg-white text-zam-muted hover:bg-zam-canvas hover:text-zam-ink")
            }
          >
            {label}
          </button>
        ))}
      </div>

      {adding && tab === "register" && (
        <form onSubmit={create} className="card mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_160px_160px_auto]">
          <input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Group name" className="field-input h-10" />
          <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} className="field-input h-10 appearance-none bg-white">
            {KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="Code (optional)" className="field-input h-10" />
          <button type="submit" disabled={!draft.name.trim()} className="h-10 rounded-xl bg-zam-orange px-4 text-sm font-semibold text-white disabled:opacity-40">
            Create &amp; open
          </button>
        </form>
      )}

      {err && (
        <p className="mb-4 rounded-xl bg-zam-red/10 px-4 py-3 text-sm text-zam-red">
          {err}{" "}
          <button onClick={() => setTick((t) => t + 1)} className="font-semibold underline">
            Retry
          </button>
        </p>
      )}

      {tab === "register" ? (
        <Panel title={groups ? `${groups.length} groups` : "Loading…"}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-zam-canvas">
                <tr>
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Code</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Members</Th>
                  <Th>Updated</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zam-line">
                {groups?.map((g) => (
                  <tr key={g.id} className="hover:bg-zam-canvas/50">
                    <Td>
                      <Link href={`/admin/groups/${g.id}`} className="font-semibold text-zam-ink hover:text-zam-orange">
                        {g.name}
                      </Link>
                      {g.description && <span className="block max-w-[420px] truncate text-xs text-zam-muted">{g.description}</span>}
                    </Td>
                    <Td className="text-xs">{g.kind}</Td>
                    <Td className="font-mono text-xs">{g.code || "—"}</Td>
                    <Td><StatusBadge status={g.status} /></Td>
                    <Td className="text-right tabular-nums">{g.memberCount}</Td>
                    <Td className="text-xs text-zam-muted">{formatDate(g.updatedAt)}</Td>
                  </tr>
                ))}
                {groups && groups.length === 0 && (
                  <tr>
                    <Td colSpan={6} className="py-10 text-center text-zam-muted">
                      {term ? "No groups match." : "No groups yet — create one with “New group”."}
                    </Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : (
        <Panel title={apps ? `${shownApps.length} group applications` : "Loading…"}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-zam-canvas">
                <tr>
                  <Th>Group</Th>
                  <Th>Applicant account</Th>
                  <Th className="text-right">Members listed</Th>
                  <Th>Status</Th>
                  <Th>Updated</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zam-line">
                {shownApps.map((a) => {
                  const rows = Array.isArray(a.payload.groupMembers) ? (a.payload.groupMembers as unknown[]).length : 0;
                  return (
                    <tr key={a.id} className="hover:bg-zam-canvas/50">
                      <Td>
                        <Link href={`/admin/members/${a.ownerId}`} className="font-semibold text-zam-ink hover:text-zam-orange">
                          {String(a.payload.groupName || a.owner?.fullName || "Unnamed group")}
                        </Link>
                      </Td>
                      <Td className="text-xs text-zam-muted">{a.owner ? `${a.owner.fullName} · ${a.owner.memberNumber}` : "—"}</Td>
                      <Td className="text-right tabular-nums">{rows}</Td>
                      <Td><StatusBadge status={a.status} /></Td>
                      <Td className="text-xs text-zam-muted">{formatDate(a.updatedAt)}</Td>
                    </tr>
                  );
                })}
                {apps && shownApps.length === 0 && (
                  <tr>
                    <Td colSpan={5} className="py-10 text-center text-zam-muted">No group applications.</Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
