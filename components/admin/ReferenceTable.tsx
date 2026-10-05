"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td } from "@/components/admin/widgets";
import { Pager } from "@/components/admin/ui";

type Row = Record<string, unknown> & { id: string };
type Kind = "cmo" | "territories" | "creation-classes" | "identifiers";

const small = "field-input h-8 w-full";
const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);
const fee = (v: unknown) => (typeof v === "number" ? String(v) : "");

// WIPO Connect "Operational" tables. CMO and Territories are read-only lists;
// the Reference Table (creation classes) and Identifiers can be added to and
// edited from their own window, like WIPO's "Add Creation Class" / "Add Identifier".
const CONFIG: Record<Kind, { title: string; subtitle: string; addLabel?: string; cols: { h: string; v: (r: Row) => React.ReactNode }[] }> = {
  cmo: {
    title: "CMO",
    subtitle: "Collective management organizations",
    cols: [
      { h: "Code", v: (r) => String(r.code) },
      { h: "Acronym", v: (r) => String(r.acronym) },
      { h: "Name", v: (r) => String(r.name) },
      { h: "Country of Origin", v: (r) => String(r.country) },
      { h: "Type", v: (r) => String(r.type) },
      { h: "Creation Class", v: (r) => String(r.creationClass) },
    ],
  },
  territories: {
    title: "Territories",
    subtitle: "CISAC Territory Information System",
    cols: [
      { h: "TISN", v: (r) => String(r.tisn) },
      { h: "TISA", v: (r) => String(r.tisa) },
      { h: "Name", v: (r) => String(r.name) },
      { h: "Type", v: (r) => String(r.type) },
      { h: "Start Date", v: (r) => String(r.startDate) },
      { h: "End Date", v: (r) => String(r.endDate) },
    ],
  },
  "creation-classes": {
    title: "Reference Table",
    subtitle: "Creation Class",
    addLabel: "Add Creation Class",
    cols: [
      { h: "Code", v: (r) => String(r.code) },
      { h: "Name", v: (r) => String(r.name) },
      { h: "Description", v: (r) => <span className="line-clamp-2 max-w-[22rem]">{String(r.description)}</span> },
      { h: "Work Share Base", v: (r) => (r.shareBase == null ? "" : String(r.shareBase)) },
      { h: "Work Identifier", v: (r) => arr(r.identifiers).join(", ") },
      { h: "Work Additional Fields", v: (r) => <span className="line-clamp-2 max-w-[18rem]">{arr(r.additionalFields).join(", ")}</span> },
      { h: "Domestic Work", v: (r) => arr(r.domesticRoles).join(", ") },
      { h: "Domestic Admin. Fee", v: (r) => fee(r.domesticFee) },
      { h: "International Revenue Admin. Fee", v: (r) => fee(r.intlRevenueFee) },
      { h: "International Admin. Fee", v: (r) => fee(r.intlFee) },
      { h: "Reserved Admin. Fee", v: (r) => fee(r.reservedFee) },
    ],
  },
  identifiers: {
    title: "Identifiers",
    subtitle: "International and local identifiers",
    addLabel: "Add Identifier",
    cols: [
      { h: "Code", v: (r) => String(r.code) },
      { h: "Acronym", v: (r) => String(r.acronym) },
      { h: "Name", v: (r) => String(r.name) },
      { h: "Creation Classes", v: (r) => arr(r.classes).join(", ") },
      { h: "Entity", v: (r) => String(r.entity) },
      { h: "Type", v: (r) => String(r.type) },
    ],
  },
};

function Lbl({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-zam-muted">{t}</span>
      {children}
    </label>
  );
}

function Editor({ kind, row, onClose, onDone }: { kind: "creation-classes" | "identifiers"; row: Row | null; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState<Record<string, string>>(() => {
    const r: Record<string, unknown> = row ?? {};
    return {
      code: String(r.code ?? ""),
      name: String(r.name ?? ""),
      description: String(r.description ?? ""),
      shareBase: r.shareBase == null ? "" : String(r.shareBase),
      identifiers: arr(r.identifiers).join(", "),
      additionalFields: arr(r.additionalFields).join(", "),
      roles: arr(r.roles).join(", "),
      domesticRoles: arr(r.domesticRoles).join(", "),
      domesticFee: fee(r.domesticFee),
      intlRevenueFee: fee(r.intlRevenueFee),
      intlFee: fee(r.intlFee),
      reservedFee: fee(r.reservedFee),
      acronym: String(r.acronym ?? ""),
      entity: String(r.entity ?? "Work"),
      type: String(r.type ?? "Local"),
      classes: arr(r.classes).join(", "),
    };
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV((x) => ({ ...x, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    try {
      const r = await fetch(row ? `/api/admin/reference/${kind}/${row.id}` : `/api/admin/reference/${kind}`, {
        method: row ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? "Could not save.");
      toast.success("Saved.");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!row || !window.confirm(`Are you sure you want to delete ${String(row.code)}?`)) return;
    const r = await fetch(`/api/admin/reference/${kind}/${row.id}`, { method: "DELETE" });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return toast.error(b.error ?? "Could not delete.");
    toast.success("Deleted.");
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="mt-8 w-full max-w-3xl rounded-sm bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#d9dde3] bg-[#f5f6f8] px-3 py-2">
          <h2 className="text-[13px] font-bold text-[#1f4e79]">{row ? (kind === "identifiers" ? "Identifier" : "Creation Class") : CONFIG[kind].addLabel}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-zam-muted hover:text-zam-ink">
            <X size={16} />
          </button>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <Lbl t="Code">
            <input value={v.code} onChange={set("code")} disabled={!!row} className={small} />
          </Lbl>
          {kind === "creation-classes" ? (
            <>
              <Lbl t="Name">
                <input value={v.name} onChange={set("name")} className={small} />
              </Lbl>
              <div className="sm:col-span-2">
                <Lbl t="Description">
                  <textarea value={v.description} onChange={set("description")} rows={2} className="field-input w-full" />
                </Lbl>
              </div>
              <Lbl t="Work Share Base">
                <input value={v.shareBase} onChange={set("shareBase")} inputMode="numeric" className={small} />
              </Lbl>
              <Lbl t="Work Identifier (comma separated)">
                <input value={v.identifiers} onChange={set("identifiers")} className={small} />
              </Lbl>
              <div className="sm:col-span-2">
                <Lbl t="Work Additional Fields (comma separated)">
                  <textarea value={v.additionalFields} onChange={set("additionalFields")} rows={2} className="field-input w-full" />
                </Lbl>
              </div>
              <Lbl t="Roles (comma separated)">
                <input value={v.roles} onChange={set("roles")} className={small} />
              </Lbl>
              <Lbl t="Domestic Work (roles)">
                <input value={v.domesticRoles} onChange={set("domesticRoles")} className={small} />
              </Lbl>
              <Lbl t="Domestic Admin. Fee (%)">
                <input value={v.domesticFee} onChange={set("domesticFee")} inputMode="decimal" className={small} />
              </Lbl>
              <Lbl t="International Revenue Admin. Fee (%)">
                <input value={v.intlRevenueFee} onChange={set("intlRevenueFee")} inputMode="decimal" className={small} />
              </Lbl>
              <Lbl t="International Admin. Fee (%)">
                <input value={v.intlFee} onChange={set("intlFee")} inputMode="decimal" className={small} />
              </Lbl>
              <Lbl t="Reserved Admin. Fee (%)">
                <input value={v.reservedFee} onChange={set("reservedFee")} inputMode="decimal" className={small} />
              </Lbl>
            </>
          ) : (
            <>
              <Lbl t="Acronym">
                <input value={v.acronym} onChange={set("acronym")} className={small} />
              </Lbl>
              <Lbl t="Name">
                <input value={v.name} onChange={set("name")} className={small} />
              </Lbl>
              <Lbl t="Creation Classes (comma separated)">
                <input value={v.classes} onChange={set("classes")} className={small} />
              </Lbl>
              <Lbl t="Entity">
                <select value={v.entity} onChange={set("entity")} className={small + " appearance-none bg-white"}>
                  <option>Work</option>
                  <option>Right Owner</option>
                </select>
              </Lbl>
              <Lbl t="Type">
                <select value={v.type} onChange={set("type")} className={small + " appearance-none bg-white"}>
                  <option>Shared</option>
                  <option>Local</option>
                </select>
              </Lbl>
            </>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-[#d9dde3] px-4 py-3">
          <div>
            {row && (
              <button type="button" onClick={remove} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-white px-3 text-[13px] font-semibold text-zam-red ring-1 ring-[#bfc5ce] hover:bg-zam-red/5">
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-8 rounded-sm bg-white px-4 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8]">
              Cancel
            </button>
            <button type="button" onClick={save} disabled={busy} className="h-8 rounded-sm bg-[#286090] px-4 text-[13px] font-semibold text-white hover:bg-[#204d76] disabled:opacity-60">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReferenceTable({ kind }: { kind: Kind }) {
  const cfg = CONFIG[kind];
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ page: number; pageSize: number; total: number; rows: Row[] } | null>(null);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);
  const [edit, setEdit] = useState<Row | "new" | null>(null);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const editable = kind === "creation-classes" || kind === "identifiers";

  useEffect(() => {
    const ctl = new AbortController();
    fetch(`/api/admin/reference/${kind}?${new URLSearchParams({ q: applied, page: String(page) })}`, { signal: ctl.signal, cache: "no-store" })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error ?? `Could not load (${r.status}).`);
        setData(b);
        setErr("");
      })
      .catch((e) => e.name !== "AbortError" && setErr(e.message));
    return () => ctl.abort();
  }, [kind, applied, page, tick]);

  return (
    <div>
      <AdminHeader
        title={cfg.title}
        subtitle={cfg.subtitle}
        right={
          editable && cfg.addLabel ? (
            <button type="button" onClick={() => setEdit("new")} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-[#286090] px-3 text-[13px] font-semibold text-white hover:bg-[#204d76]">
              <Plus size={13} /> {cfg.addLabel}
            </button>
          ) : undefined
        }
      />

      <form
        className="card mb-3 flex flex-wrap items-end gap-3 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(q.trim());
          setPage(1);
        }}
      >
        <label className="block w-64">
          <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Search</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} className={small} />
        </label>
        <button type="submit" className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-[#286090] px-3 text-[13px] font-semibold text-white hover:bg-[#204d76]">
          <Search size={13} /> Search
        </button>
        <button
          type="button"
          onClick={() => {
            setQ("");
            setApplied("");
            setPage(1);
          }}
          className="h-8 rounded-sm bg-white px-3 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8]"
        >
          Clear
        </button>
      </form>

      {err && <p className="mb-3 rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}

      <Panel title={cfg.title}>
        {data && data.total > data.pageSize && <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} className="border-b border-[#eceff3]" />}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr>
                {cfg.cols.map((c) => (
                  <Th key={c.h}>{c.h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!data && !err && (
                <tr>
                  <Td colSpan={cfg.cols.length} className="py-6 text-center text-zam-muted">
                    Loading…
                  </Td>
                </tr>
              )}
              {data?.rows.length === 0 && (
                <tr>
                  <Td colSpan={cfg.cols.length} className="py-6 text-center text-zam-muted">
                    No data available in table
                  </Td>
                </tr>
              )}
              {data?.rows.map((r) => (
                <tr key={r.id} onClick={editable ? () => setEdit(r) : undefined} className={editable ? "cursor-pointer hover:bg-[#f3f7fb]" : undefined}>
                  {cfg.cols.map((c) => (
                    <Td key={c.h}>{c.v(r)}</Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && <p className="border-t border-[#eceff3] px-3 py-2 text-[12px] text-zam-muted">{data.total} entries</p>}
      </Panel>

      {edit && editable && (
        <Editor
          kind={kind}
          row={edit === "new" ? null : edit}
          onClose={() => setEdit(null)}
          onDone={() => {
            setEdit(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
