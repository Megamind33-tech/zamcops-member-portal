"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td } from "@/components/admin/widgets";

type Row = { id: string; name: string; description: string; works: number; updatedAt: string };

// Work sets — named, reusable lists of works (WIPO Connect: Works > Set). Add a
// whole set to a distribution pool link instead of listing the works again.
export default function WorkSetsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [tick, setTick] = useState(0);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", description: "" });
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/admin/work-sets?q=${encodeURIComponent(q)}`, { signal: ctl.signal, cache: "no-store" })
        .then(async (r) => {
          const b = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(b.error ?? `Could not load the work sets (${r.status}).`);
          setRows(b.sets);
          setErr("");
        })
        .catch((e) => e.name !== "AbortError" && setErr(e.message));
    }, 250);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q, tick]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/admin/work-sets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return toast.error(b.error ?? "Could not create the work set.");
    toast.success("Work set created. Open it to add works.");
    setDraft({ name: "", description: "" });
    setAdding(false);
    reload();
  };

  return (
    <div>
      <AdminHeader
        title="Work Sets"
        subtitle="Named, reusable lists of works"
        right={
          <div className="flex items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="field-input h-8 w-48" />
            <button type="button" onClick={() => setAdding((v) => !v)} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-zam-orange px-3 text-[13px] font-semibold text-white">
              <Plus size={13} /> Add Work Set
            </button>
          </div>
        }
      />
      {adding && (
        <form onSubmit={add} className="card mb-3 grid gap-3 p-3 sm:grid-cols-3">
          <input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name (e.g. ZNBC top 100, Q1 2026)" className="field-input h-8 w-full" />
          <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description (optional)" className="field-input h-8 w-full" />
          <div>
            <button type="submit" disabled={!draft.name.trim()} className="inline-flex h-8 items-center rounded-sm bg-zam-orange px-4 text-[13px] font-semibold text-white disabled:opacity-40">
              Create
            </button>
          </div>
        </form>
      )}
      {err && <p className="mb-3 rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}
      <Panel title="Results">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Description</Th>
                <Th className="text-right"># Works</Th>
                <Th>Updated</Th>
              </tr>
            </thead>
            <tbody>
              {!rows && !err && (
                <tr>
                  <Td colSpan={4} className="py-6 text-center text-zam-muted">
                    Loading…
                  </Td>
                </tr>
              )}
              {rows?.map((s) => (
                <tr key={s.id}>
                  <Td className="font-semibold">
                    <Link href={`/admin/work-sets/${s.id}`} className="hover:text-zam-orange">
                      {s.name}
                    </Link>
                  </Td>
                  <Td className="text-zam-muted">{s.description || "—"}</Td>
                  <Td className="text-right tabular-nums">{s.works.toLocaleString()}</Td>
                  <Td className="whitespace-nowrap text-xs text-zam-muted">{new Date(s.updatedAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}</Td>
                </tr>
              ))}
              {rows && rows.length === 0 && (
                <tr>
                  <Td colSpan={4} className="py-8 text-center text-zam-muted">
                    No work sets yet.
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
