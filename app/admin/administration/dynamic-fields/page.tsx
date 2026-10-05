"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td } from "@/components/admin/widgets";

type Field = { id: string; entity: string; label: string; type: string; options: string; required: boolean };
type Data = { entities: string[]; types: string[]; canManage: boolean; fields: Field[] };

const small = "field-input h-8 w-full";

// WIPO Connect Administration > Dynamic Fields — one add button per kind of record.
export default function DynamicFieldsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [f, setF] = useState({ label: "", type: "Text", options: "", required: false });

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/dynamic-fields", { cache: "no-store" });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return setErr(b.error ?? `Could not load (${r.status}).`);
    setData(b);
    setErr("");
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    const r = await fetch("/api/admin/dynamic-fields", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, entity: adding }) });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return toast.error(b.error ?? "Could not add the field.");
    toast.success("Field added.");
    setAdding(null);
    setF({ label: "", type: "Text", options: "", required: false });
    load();
  };

  const remove = async (x: Field) => {
    if (!window.confirm(`Are you sure you want to delete “${x.label}” from ${x.entity}?`)) return;
    const r = await fetch(`/api/admin/dynamic-fields?id=${x.id}`, { method: "DELETE" });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return toast.error(b.error ?? "Could not delete.");
    load();
  };

  return (
    <div>
      <AdminHeader title="Dynamic Fields" subtitle="Extra fields on records" />
      {err && <p className="mb-3 rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}
      {data && (
        <div className="space-y-3">
          {data.canManage && (
            <div className="card flex flex-wrap gap-2 p-3">
              {data.entities.map((e) => (
                <button key={e} type="button" onClick={() => setAdding(e)} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-[#286090] px-3 text-[13px] font-semibold text-white hover:bg-[#204d76]">
                  <Plus size={13} /> {e}
                </button>
              ))}
            </div>
          )}
          {adding && (
            <Panel title={`Add field to ${adding}`}>
              <div className="grid gap-3 p-3 sm:grid-cols-4">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Label</span>
                  <input autoFocus value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} className={small} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Type</span>
                  <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={small + " appearance-none bg-white"}>
                    {data.types.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                {f.type === "List" && (
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Values (comma separated)</span>
                    <input value={f.options} onChange={(e) => setF({ ...f, options: e.target.value })} className={small} />
                  </label>
                )}
                <label className="flex items-end gap-1.5 pb-1.5 text-[13px]">
                  <input type="checkbox" checked={f.required} onChange={(e) => setF({ ...f, required: e.target.checked })} /> Required
                </label>
              </div>
              <div className="flex gap-2 border-t border-[#eceff3] px-3 py-2">
                <button type="button" onClick={add} className="h-8 rounded-sm bg-[#286090] px-4 text-[13px] font-semibold text-white hover:bg-[#204d76]">
                  Save
                </button>
                <button type="button" onClick={() => setAdding(null)} className="h-8 rounded-sm bg-white px-4 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8]">
                  Cancel
                </button>
              </div>
            </Panel>
          )}
          <Panel title="Dynamic Fields">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Record</Th>
                  <Th>Label</Th>
                  <Th>Type</Th>
                  <Th>Values</Th>
                  <Th>Required</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {data.fields.length === 0 && (
                  <tr>
                    <Td colSpan={6} className="py-6 text-center text-zam-muted">
                      No data available in table
                    </Td>
                  </tr>
                )}
                {data.fields.map((x) => (
                  <tr key={x.id}>
                    <Td>{x.entity}</Td>
                    <Td>{x.label}</Td>
                    <Td>{x.type}</Td>
                    <Td>{x.options}</Td>
                    <Td>{x.required ? "Yes" : "No"}</Td>
                    <Td className="text-right">
                      {data.canManage && (
                        <button type="button" onClick={() => remove(x)} aria-label="Delete" className="text-zam-muted hover:text-zam-red">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
      )}
    </div>
  );
}
