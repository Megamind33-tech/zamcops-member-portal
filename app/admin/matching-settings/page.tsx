"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td } from "@/components/admin/widgets";
import { CREATION_CLASSES } from "@/lib/poolConst";
import { WORK_ROLE_CODES } from "@/lib/parameters";
import { COLUMN_TYPES, FIELD_TYPES, TARGET_FIELDS, PRE_MATCH_METHODS, PRECISIONS, DISTR_STATUSES, type LogField, type LogWeight } from "@/lib/matchingSettings-const";

type Format = { id: string; name: string; fileFormat: string; creationClass: string; targetCreationClass: string; headerLines: number; footerLines: number; sheetNumber: number; manageComponent: boolean; fields: LogField[] };
type Source = {
  id: string; name: string; formatId: string; minThreshold: number; maxThreshold: number; precision: string; roles: string[]; distrStatus: string; creatorsByPerformer: boolean;
  similarity: number | null; numberOfWorks: number | null; historyEntries: number; weights: LogWeight[];
};
type Method = { id: string; name: string; formatId: string; formula: string };

const small = "field-input h-8 w-full";
const btn = "h-8 rounded-sm bg-[#286090] px-4 text-[13px] font-semibold text-white hover:bg-[#204d76] disabled:opacity-60";
const btn2 = "h-8 rounded-sm bg-white px-4 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8]";

function Lbl({ t, children, className }: { t: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={"block " + (className ?? "")}>
      <span className="mb-1 block text-[11px] font-semibold text-zam-muted">{t}</span>
      {children}
    </label>
  );
}

function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="mt-8 w-full max-w-3xl rounded-sm bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#d9dde3] bg-[#f5f6f8] px-3 py-2">
          <h2 className="text-[13px] font-bold text-[#1f4e79]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-zam-muted hover:text-zam-ink">
            <X size={16} />
          </button>
        </div>
        {children}
        <div className="flex items-center justify-between gap-2 border-t border-[#d9dde3] px-4 py-3">{footer}</div>
      </div>
    </div>
  );
}

async function send(kind: string, id: string | null, body: unknown, method?: string) {
  const r = await fetch(id ? `/api/admin/matching-settings/${kind}/${id}` : `/api/admin/matching-settings/${kind}`, {
    method: method ?? (id ? "PATCH" : "POST"),
    headers: { "Content-Type": "application/json" },
    body: method === "DELETE" ? undefined : JSON.stringify(body),
  });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.error ?? "Could not save.");
  return b;
}

function FormatEditor({ row, onClose, onDone }: { row: Format | null; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState({ name: row?.name ?? "", creationClass: row?.creationClass ?? "MW", targetCreationClass: row?.targetCreationClass ?? "MW", headerLines: String(row?.headerLines ?? 1), footerLines: String(row?.footerLines ?? 0), sheetNumber: String(row?.sheetNumber ?? 1), manageComponent: row?.manageComponent ?? false });
  const [fields, setFields] = useState<LogField[]>(row?.fields ?? []);
  const [busy, setBusy] = useState(false);
  const upd = (i: number, k: keyof LogField, val: string) => setFields((f) => f.map((x, j) => (j === i ? { ...x, [k]: val } : x)));
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      toast.success("Done.");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={row ? "Log Format" : "Add Log Format"}
      onClose={onClose}
      footer={
        <>
          <div>
            {row && (
              <button type="button" disabled={busy} onClick={() => window.confirm(`Are you sure you want to delete ${row.name}?`) && run(() => send("formats", row.id, null, "DELETE"))} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-white px-3 text-[13px] font-semibold text-zam-red ring-1 ring-[#bfc5ce]">
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className={btn2} onClick={onClose}>
              Cancel
            </button>
            <button type="button" className={btn} disabled={busy} onClick={() => run(() => send("formats", row?.id ?? null, { ...v, fields }))}>
              Save
            </button>
          </div>
        </>
      }
    >
      <div className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Lbl t="Name">
            <input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={small} />
          </Lbl>
          <Lbl t="File Format">
            <select disabled className={small + " bg-white"}>
              <option>XLSX</option>
            </select>
          </Lbl>
          <Lbl t="# Sheet">
            <input value={v.sheetNumber} onChange={(e) => setV({ ...v, sheetNumber: e.target.value })} className={small} />
          </Lbl>
          <Lbl t="# Header lines">
            <input value={v.headerLines} onChange={(e) => setV({ ...v, headerLines: e.target.value })} className={small} />
          </Lbl>
          <Lbl t="# Footer lines">
            <input value={v.footerLines} onChange={(e) => setV({ ...v, footerLines: e.target.value })} className={small} />
          </Lbl>
          <label className="flex items-end gap-1.5 pb-1.5 text-[13px]">
            <input type="checkbox" checked={v.manageComponent} onChange={(e) => setV({ ...v, manageComponent: e.target.checked })} /> Component
          </label>
          <Lbl t="Creation Class">
            <select value={v.creationClass} onChange={(e) => setV({ ...v, creationClass: e.target.value })} className={small + " appearance-none bg-white"}>
              {CREATION_CLASSES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Lbl>
          <Lbl t="Target Creation Class">
            <select value={v.targetCreationClass} onChange={(e) => setV({ ...v, targetCreationClass: e.target.value })} className={small + " appearance-none bg-white"}>
              {CREATION_CLASSES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Lbl>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-[12px] font-bold text-[#1f4e79]">Fields</h3>
            <button type="button" onClick={() => setFields([...fields, { column: "", columnType: "Matching", targetField: "TITLE", fieldType: "String", targetCode: "" }])} className="inline-flex items-center gap-1 text-[12px] text-[#286090]">
              <Plus size={12} /> Add
            </button>
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr>
                <Th>Column Name</Th>
                <Th>Column Type</Th>
                <Th>Target Field</Th>
                <Th>Target Field Type</Th>
                <Th>Target Field Code</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {fields.map((f, i) => (
                <tr key={i}>
                  <td className="p-1">
                    <input value={f.column} onChange={(e) => upd(i, "column", e.target.value)} className={small} />
                  </td>
                  <td className="p-1">
                    <select value={f.columnType} onChange={(e) => upd(i, "columnType", e.target.value)} className={small + " appearance-none bg-white"}>
                      {COLUMN_TYPES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1">
                    <select value={f.targetField} disabled={f.columnType !== "Matching"} onChange={(e) => upd(i, "targetField", e.target.value)} className={small + " appearance-none bg-white"}>
                      <option value=""></option>
                      {TARGET_FIELDS.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1">
                    <select value={f.fieldType} onChange={(e) => upd(i, "fieldType", e.target.value)} className={small + " appearance-none bg-white"}>
                      {FIELD_TYPES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1">
                    <input value={f.targetCode} onChange={(e) => upd(i, "targetCode", e.target.value)} className={small} />
                  </td>
                  <td className="p-1">
                    <button type="button" aria-label="Remove" onClick={() => setFields(fields.filter((_, j) => j !== i))} className="text-zam-muted hover:text-zam-red">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}

function SourceEditor({ row, formats, onClose, onDone }: { row: Source | null; formats: Format[]; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState({
    name: row?.name ?? "", formatId: row?.formatId ?? "", minThreshold: String(row?.minThreshold ?? 80), maxThreshold: String(row?.maxThreshold ?? 100), precision: row?.precision ?? "0.1",
    distrStatus: row?.distrStatus ?? "", creatorsByPerformer: row?.creatorsByPerformer ?? false, similarity: row?.similarity == null ? "" : String(row.similarity),
    numberOfWorks: row?.numberOfWorks == null ? "" : String(row.numberOfWorks), historyEntries: String(row?.historyEntries ?? 0),
  });
  const [roles, setRoles] = useState<string[]>(row?.roles ?? []);
  const [weights, setWeights] = useState<LogWeight[]>(row?.weights ?? []);
  const [busy, setBusy] = useState(false);
  const fmt = formats.find((f) => f.id === v.formatId);
  // One weight row per Matching column of the chosen format
  const cols = (fmt?.fields ?? []).filter((f) => f.columnType === "Matching").map((f) => f.column);
  const wFor = (c: string): LogWeight => weights.find((w) => w.column === c) ?? { column: c, weight: null, similarity: null, method: "", priority: null };
  const setW = (c: string, k: keyof LogWeight, val: string) =>
    setWeights((all) => {
      const cur = all.find((w) => w.column === c) ?? wFor(c);
      const next = { ...cur, [k]: k === "method" ? val : val === "" ? null : Number(val) };
      return [...all.filter((w) => w.column !== c), next];
    });
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      toast.success("Done.");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={row ? "Log Source" : "Add Log Source"}
      onClose={onClose}
      footer={
        <>
          <div>
            {row && (
              <button type="button" disabled={busy} onClick={() => window.confirm(`Are you sure you want to delete ${row.name}?`) && run(() => send("sources", row.id, null, "DELETE"))} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-white px-3 text-[13px] font-semibold text-zam-red ring-1 ring-[#bfc5ce]">
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className={btn2} onClick={onClose}>
              Cancel
            </button>
            <button type="button" className={btn} disabled={busy} onClick={() => run(() => send("sources", row?.id ?? null, { ...v, roles, weights: cols.map(wFor), creatorsByPerformer: v.creatorsByPerformer }))}>
              Save
            </button>
          </div>
        </>
      }
    >
      <div className="space-y-4 p-4">
        <section>
          <h3 className="mb-2 text-[12px] font-bold text-[#1f4e79]">General Information</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Lbl t="Name">
              <input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={small} />
            </Lbl>
            <Lbl t="Log Format">
              <select value={v.formatId} onChange={(e) => setV({ ...v, formatId: e.target.value })} className={small + " appearance-none bg-white"}>
                <option value=""></option>
                {formats.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </Lbl>
            <Lbl t="Min Final Threshold (%)">
              <input value={v.minThreshold} onChange={(e) => setV({ ...v, minThreshold: e.target.value })} className={small} />
            </Lbl>
            <Lbl t="Max Final Threshold (%)">
              <input value={v.maxThreshold} onChange={(e) => setV({ ...v, maxThreshold: e.target.value })} className={small} />
            </Lbl>
            <Lbl t="Precision threshold">
              <select value={v.precision} onChange={(e) => setV({ ...v, precision: e.target.value })} className={small + " appearance-none bg-white"}>
                {PRECISIONS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Lbl>
            <Lbl t="Work Distributable Status Threshold">
              <select value={v.distrStatus} onChange={(e) => setV({ ...v, distrStatus: e.target.value })} className={small + " appearance-none bg-white"}>
                <option value=""></option>
                {DISTR_STATUSES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Lbl>
            <label className="flex items-center gap-1.5 text-[13px] sm:col-span-2">
              <input type="checkbox" checked={v.creatorsByPerformer} onChange={(e) => setV({ ...v, creatorsByPerformer: e.target.checked })} /> Include Creators-Performers Matching
            </label>
            <div className="sm:col-span-2">
              <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Creator Work Role</span>
              <div className="flex flex-wrap gap-x-3 gap-y-1 rounded-sm border border-[#d9dde3] p-2">
                {WORK_ROLE_CODES.map((r) => (
                  <label key={r} className="flex items-center gap-1 text-[12px]">
                    <input type="checkbox" checked={roles.includes(r)} onChange={(e) => setRoles((x) => (e.target.checked ? [...x, r] : x.filter((i) => i !== r)))} />
                    {r}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section>
          <h3 className="mb-2 text-[12px] font-bold text-[#1f4e79]">Weights and Priority</h3>
          {cols.length === 0 ? (
            <p className="text-[12px] text-zam-muted">Choose a Log Format with Matching columns.</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr>
                  <Th>Column Name</Th>
                  <Th>Weight</Th>
                  <Th>Similarity (%)</Th>
                  <Th>Pre-Matching Method</Th>
                  <Th>Priority</Th>
                </tr>
              </thead>
              <tbody>
                {cols.map((c) => {
                  const w = wFor(c);
                  return (
                    <tr key={c}>
                      <td className="p-1 font-medium">{c}</td>
                      <td className="p-1">
                        <input value={w.weight ?? ""} onChange={(e) => setW(c, "weight", e.target.value)} className={small} />
                      </td>
                      <td className="p-1">
                        <input value={w.similarity ?? ""} onChange={(e) => setW(c, "similarity", e.target.value)} className={small} />
                      </td>
                      <td className="p-1">
                        <select value={w.method} onChange={(e) => setW(c, "method", e.target.value)} className={small + " appearance-none bg-white"}>
                          <option value=""></option>
                          {PRE_MATCH_METHODS.map((p) => (
                            <option key={p}>{p}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-1">
                        <input value={w.priority ?? ""} onChange={(e) => setW(c, "priority", e.target.value)} className={small} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
        <section>
          <h3 className="mb-2 text-[12px] font-bold text-[#1f4e79]">Fuzzy Pre-Matching Settings</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Lbl t="Similarity (%)">
              <input value={v.similarity} onChange={(e) => setV({ ...v, similarity: e.target.value })} className={small} />
            </Lbl>
            <Lbl t="# Works to keep">
              <input value={v.numberOfWorks} onChange={(e) => setV({ ...v, numberOfWorks: e.target.value })} className={small} />
            </Lbl>
          </div>
        </section>
        <section>
          <h3 className="mb-2 text-[12px] font-bold text-[#1f4e79]">History</h3>
          <Lbl t="Number of Entries" className="max-w-xs">
            <input value={v.historyEntries} onChange={(e) => setV({ ...v, historyEntries: e.target.value })} className={small} />
          </Lbl>
        </section>
      </div>
    </Modal>
  );
}

function MethodEditor({ row, formats, onClose, onDone }: { row: Method | null; formats: Format[]; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState({ name: row?.name ?? "", formatId: row?.formatId ?? "", formula: row?.formula ?? "" });
  const [busy, setBusy] = useState(false);
  const fmt = formats.find((f) => f.id === v.formatId);
  const allocCols = (fmt?.fields ?? []).filter((f) => f.columnType === "Allocation").map((f) => `$${f.column}$`);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      toast.success("Done.");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={row ? "Log Allocation Method" : "Add Log Allocation Method"}
      onClose={onClose}
      footer={
        <>
          <div>
            {row && (
              <button type="button" disabled={busy} onClick={() => window.confirm(`Are you sure you want to delete ${row.name}?`) && run(() => send("allocation-methods", row.id, null, "DELETE"))} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-white px-3 text-[13px] font-semibold text-zam-red ring-1 ring-[#bfc5ce]">
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className={btn2} onClick={onClose}>
              Cancel
            </button>
            <button type="button" className={btn} disabled={busy} onClick={() => run(() => send("allocation-methods", row?.id ?? null, v))}>
              Save
            </button>
          </div>
        </>
      }
    >
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <Lbl t="Name">
          <input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={small} />
        </Lbl>
        <Lbl t="Log Format">
          <select value={v.formatId} onChange={(e) => setV({ ...v, formatId: e.target.value })} className={small + " appearance-none bg-white"}>
            <option value=""></option>
            {formats.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </Lbl>
        <Lbl t="Formula" className="sm:col-span-2">
          <input value={v.formula} onChange={(e) => setV({ ...v, formula: e.target.value })} className={small + " font-mono"} />
          {allocCols.length > 0 && <span className="mt-1 block text-[11px] text-zam-muted">Fields of this format: {allocCols.join("  ")}</span>}
        </Lbl>
      </div>
    </Modal>
  );
}

// WIPO Connect Matching and Distribution > Matching Settings
export default function MatchingSettingsPage() {
  const [formats, setFormats] = useState<Format[] | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [err, setErr] = useState("");
  const [edit, setEdit] = useState<{ kind: "f" | "s" | "m"; row: Format | Source | Method | null } | null>(null);

  const load = useCallback(async () => {
    const get = async (k: string) => {
      const r = await fetch(`/api/admin/matching-settings/${k}`, { cache: "no-store" });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? `Could not load (${r.status}).`);
      return b;
    };
    try {
      const [f, s, m] = await Promise.all([get("formats"), get("sources"), get("allocation-methods")]);
      setFormats(f.rows);
      setSources(s.rows);
      setMethods(m.rows);
      setCanManage(f.canManage);
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load.");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const fname = (id: string) => formats?.find((f) => f.id === id)?.name ?? "";
  const addBtn = (label: string, kind: "f" | "s" | "m") =>
    canManage && (
      <button type="button" onClick={() => setEdit({ kind, row: null })} className="inline-flex h-7 items-center gap-1 rounded-sm bg-[#286090] px-3 text-[12px] font-semibold text-white hover:bg-[#204d76]">
        <Plus size={12} /> {label}
      </button>
    );
  const done = () => {
    setEdit(null);
    load();
  };

  return (
    <div>
      <AdminHeader title="Matching Settings" subtitle="How usage logs are read, matched and weighed" />
      {err && <p className="mb-3 rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}
      <div className="space-y-3">
        <Panel title="Log Format" right={addBtn("Add Log Format", "f")}>
          <table className="w-full">
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>File Format</Th>
                <Th>Creation Class</Th>
                <Th># Header Lines</Th>
                <Th># Footer lines</Th>
                <Th># Sheet</Th>
              </tr>
            </thead>
            <tbody>
              {formats?.map((f) => (
                <tr key={f.id} onClick={() => setEdit({ kind: "f", row: f })} className="cursor-pointer hover:bg-[#f3f7fb]">
                  <Td>{f.name}</Td>
                  <Td>{f.fileFormat}</Td>
                  <Td>{f.creationClass}</Td>
                  <Td>{f.headerLines}</Td>
                  <Td>{f.footerLines}</Td>
                  <Td>{f.sheetNumber}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Log Source" right={addBtn("Add Log Source", "s")}>
          <table className="w-full">
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Log Format</Th>
                <Th>Pre-matching similarity</Th>
                <Th># Works</Th>
                <Th>Min Threshold</Th>
                <Th>Max Threshold</Th>
                <Th># History Entries</Th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} onClick={() => setEdit({ kind: "s", row: s })} className="cursor-pointer hover:bg-[#f3f7fb]">
                  <Td>{s.name}</Td>
                  <Td>{fname(s.formatId)}</Td>
                  <Td>{s.similarity ?? ""}</Td>
                  <Td>{s.numberOfWorks ?? ""}</Td>
                  <Td>{s.minThreshold.toFixed(2)}</Td>
                  <Td>{s.maxThreshold.toFixed(2)}</Td>
                  <Td>{s.historyEntries}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Log Allocation Method" right={addBtn("Add Log Allocation Method", "m")}>
          <table className="w-full">
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Log Format</Th>
              </tr>
            </thead>
            <tbody>
              {methods.map((m) => (
                <tr key={m.id} onClick={() => setEdit({ kind: "m", row: m })} className="cursor-pointer hover:bg-[#f3f7fb]">
                  <Td>{m.name}</Td>
                  <Td>{fname(m.formatId)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
      {edit?.kind === "f" && <FormatEditor row={edit.row as Format | null} onClose={() => setEdit(null)} onDone={done} />}
      {edit?.kind === "s" && formats && <SourceEditor row={edit.row as Source | null} formats={formats} onClose={() => setEdit(null)} onDone={done} />}
      {edit?.kind === "m" && formats && <MethodEditor row={edit.row as Method | null} formats={formats} onClose={() => setEdit(null)} onDone={done} />}
    </div>
  );
}
