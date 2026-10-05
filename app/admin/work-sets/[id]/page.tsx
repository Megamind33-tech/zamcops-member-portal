"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td } from "@/components/admin/widgets";
import { Pager } from "@/components/admin/ui";
import { AuditTrail } from "@/components/admin/AuditTrail";
import { Tabs } from "@/components/admin/ui";
import { BulkWorkAdd } from "@/components/admin/BulkWorkAdd";

type Detail = {
  set: { id: string; name: string; description: string; works: number; weight: number };
  page: number;
  pageSize: number;
  total: number;
  works: { id: string; workId: string; weight: number; title: string; iswc: string; wipoId: string; holders: string[] }[];
};

export default function WorkSetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const api = `/api/admin/work-sets/${id}`;
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [meta, setMeta] = useState({ name: "", description: "" });
  const [metaDirty, setMetaDirty] = useState(false);
  const [tab, setTab] = useState<"works" | "audit">("works");
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const ctl = new AbortController();
    fetch(`${api}?${new URLSearchParams({ q: term, page: String(page) })}`, { signal: ctl.signal, cache: "no-store" })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error ?? `Could not load this work set (${r.status}).`);
        setD(b);
        setErr("");
        setSelected(new Set());
        setWeights({});
        if (!metaDirty) setMeta({ name: b.set.name, description: b.set.description });
      })
      .catch((e) => e.name !== "AbortError" && setErr(e.message));
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, term, page, tick]);

  const send = async (url: string, method: string, body: unknown, fail: string) => {
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(b.error ?? fail);
    return b;
  };

  const saveMeta = async () => {
    try {
      await send(api, "PATCH", meta, "Could not save.");
      toast.success("Saved.");
      setMetaDirty(false);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    }
  };

  const removeWorks = async (body: { workIds?: string[]; all?: boolean }, confirm: string) => {
    if (!window.confirm(confirm)) return;
    try {
      const b = await send(`${api}/items`, "DELETE", body, "Could not remove.");
      toast.success(`Removed ${b.removed.toLocaleString()} work${b.removed === 1 ? "" : "s"}.`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove.");
    }
  };

  const saveWeights = async () => {
    try {
      await send(`${api}/items`, "PATCH", { items: Object.entries(weights).map(([workId, weight]) => ({ workId, weight })) }, "Could not save the weights.");
      toast.success("Weights saved.");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the weights.");
    }
  };

  const remove = async () => {
    if (!d || !window.confirm(`Delete the work set “${d.set.name}”? The works themselves are not deleted.`)) return;
    try {
      await send(api, "DELETE", null, "Could not delete.");
      toast.success("Work set deleted.");
      router.push("/admin/work-sets");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete.");
    }
  };

  if (err && !d)
    return (
      <div>
        <Link href="/admin/work-sets" className="mb-4 inline-flex items-center gap-1 text-sm text-zam-muted hover:text-zam-ink">
          <ArrowLeft size={14} /> Work Sets
        </Link>
        <p className="rounded-sm bg-zam-red/10 px-4 py-3 text-sm text-zam-red">
          {err}{" "}
          <button onClick={reload} className="font-semibold underline">
            Retry
          </button>
        </p>
      </div>
    );
  if (!d)
    return (
      <div className="grid h-40 place-items-center">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-zam-line border-t-zam-orange" />
      </div>
    );

  return (
    <div>
      <Link href="/admin/work-sets" className="mb-2 inline-flex items-center gap-1 text-xs text-zam-muted hover:text-zam-ink">
        <ArrowLeft size={13} /> Work Sets
      </Link>
      <AdminHeader title={d.set.name} subtitle={`${d.set.works.toLocaleString()} works`} />
      <Tabs
        className="mb-3"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "works", label: "Works", count: d.set.works },
          { key: "audit", label: "Audit" },
        ]}
      />

      {tab === "audit" && (
        <Panel title="Changes to this work set">
          <AuditTrail targetType="Work set" targetId={id} />
        </Panel>
      )}

      {tab === "works" && (
        <div className="space-y-3">
          <Panel title="General information" collapsible>
            <div className="grid gap-3 p-4 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Name</span>
                <input value={meta.name} onChange={(e) => { setMeta({ ...meta, name: e.target.value }); setMetaDirty(true); }} className="field-input h-8 w-full" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Description</span>
                <input value={meta.description} onChange={(e) => { setMeta({ ...meta, description: e.target.value }); setMetaDirty(true); }} className="field-input h-8 w-full" />
              </label>
              <div className="flex gap-2 sm:col-span-3">
                {metaDirty && (
                  <button type="button" onClick={saveMeta} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-zam-orange px-4 text-[13px] font-semibold text-white">
                    <Save size={13} /> Save changes
                  </button>
                )}
                <button type="button" onClick={remove} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-sm bg-zam-red/10 px-3 text-[13px] font-semibold text-zam-red hover:bg-zam-red/20">
                  <Trash2 size={13} /> Delete set
                </button>
              </div>
            </div>
          </Panel>

          <Panel title="Add works in bulk" collapsible>
            <BulkWorkAdd
              endpoint={`${api}/items`}
              onAdded={({ added, updated }) => {
                toast.success(`Added ${added.toLocaleString()} work${added === 1 ? "" : "s"}${updated ? `, updated ${updated.toLocaleString()} weights` : ""}.`);
                reload();
              }}
            />
          </Panel>

          <Panel
            title={`Works in this set (${d.set.works.toLocaleString()})`}
            right={
              <div className="flex items-center gap-2">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter: title, ISWC, id…" className="field-input h-7 w-52" />
                {Object.keys(weights).length > 0 && (
                  <button type="button" onClick={saveWeights} className="inline-flex h-7 items-center gap-1 rounded-sm bg-zam-orange px-3 text-xs font-semibold text-white">
                    <Save size={12} /> Save weights
                  </button>
                )}
                {selected.size > 0 ? (
                  <button type="button" onClick={() => removeWorks({ workIds: [...selected] }, `Remove ${selected.size} selected work${selected.size === 1 ? "" : "s"} from this set?`)} className="inline-flex h-7 items-center gap-1 rounded-sm bg-zam-red/10 px-3 text-xs font-semibold text-zam-red">
                    <Trash2 size={12} /> Remove {selected.size}
                  </button>
                ) : (
                  d.set.works > 0 && (
                    <button type="button" onClick={() => removeWorks({ all: true }, `Remove all ${d.set.works.toLocaleString()} works from this set?`)} className="text-xs font-semibold text-zam-muted underline hover:text-zam-red">
                      Clear the set
                    </button>
                  )
                )}
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr>
                    <Th className="w-8">
                      <input type="checkbox" aria-label="Select all on this page" checked={d.works.length > 0 && d.works.every((w) => selected.has(w.workId))} onChange={(e) => setSelected(e.target.checked ? new Set(d.works.map((w) => w.workId)) : new Set())} className="h-3.5 w-3.5" />
                    </Th>
                    <Th>Main Id</Th>
                    <Th>Title</Th>
                    <Th>Right-holders</Th>
                    <Th>ISWC</Th>
                    <Th className="text-right">Weight</Th>
                  </tr>
                </thead>
                <tbody>
                  {d.works.map((w) => (
                    <tr key={w.id}>
                      <Td>
                        <input
                          type="checkbox"
                          aria-label={`Select ${w.title}`}
                          checked={selected.has(w.workId)}
                          onChange={(e) => {
                            const n = new Set(selected);
                            if (e.target.checked) n.add(w.workId);
                            else n.delete(w.workId);
                            setSelected(n);
                          }}
                          className="h-3.5 w-3.5"
                        />
                      </Td>
                      <Td className="whitespace-nowrap font-mono text-xs text-zam-muted">{w.wipoId.startsWith("local_") ? "—" : `133-${w.wipoId}-W`}</Td>
                      <Td className="font-semibold">
                        <Link href={`/admin/catalogue/${w.workId}`} className="hover:text-zam-orange">
                          {w.title}
                        </Link>
                      </Td>
                      <Td className="max-w-[280px] truncate text-xs text-zam-muted">{w.holders.join(", ") || "—"}</Td>
                      <Td className="whitespace-nowrap font-mono text-xs">{w.iswc || "—"}</Td>
                      <Td className="text-right">
                        <input inputMode="decimal" value={weights[w.workId] ?? String(w.weight)} onChange={(e) => setWeights({ ...weights, [w.workId]: e.target.value })} className="field-input h-7 w-20 text-right" aria-label={`Weight for ${w.title}`} />
                      </Td>
                    </tr>
                  ))}
                  {d.works.length === 0 && (
                    <tr>
                      <Td colSpan={6} className="py-8 text-center text-zam-muted">
                        {term ? "No works in the set match that." : "No works in this set yet."}
                      </Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pager page={page} pageSize={d.pageSize} total={d.total} onPage={setPage} className="border-t border-[#eceff3]" />
          </Panel>
        </div>
      )}
    </div>
  );
}
