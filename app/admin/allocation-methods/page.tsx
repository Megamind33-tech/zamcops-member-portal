"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td } from "@/components/admin/widgets";

type Method = { id: string; name: string; target: "Work" | "Right owner"; formula: string; description: string; used: number };

const HELP: Record<string, { fields: string[]; examples: string[] }> = {
  Work: {
    fields: ["$Weight$  (the work's plays / weight on the list)", "$Work$.shares   $Work$.domestic   $Work$.year   $Work$.genre   $Work$.title"],
    examples: ["$Weight$", "sqrt($Weight$)", "log($Weight$ + 1)", "min($Weight$, 10)", "if($Work$.domestic == 1, $Weight$ * 2, $Weight$)"],
  },
  "Right owner": {
    fields: ["$Weight$  (the right-holder's declared share %)", "$Role$  (their role code, e.g. 'CA')", "$Ro$.affiliated   $Ro$.share   $Ro$.kind", "$Work$.shares   $Work$.domestic   $Work$.year"],
    examples: ["$Weight$", "if($Role$ == 'CA', $Weight$ * 1.5, $Weight$)", "if($Ro$.affiliated == 1, $Weight$, $Weight$ / 2)"],
  },
};

function Editor({ target, initial, onDone, onCancel }: { target: "Work" | "Right owner"; initial: Method | null; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [formula, setFormula] = useState(initial?.formula ?? "$Weight$");
  const [check, setCheck] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const help = HELP[target];

  const test = async () => {
    const r = await fetch("/api/admin/allocation-methods", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ check: formula }) });
    const b = await r.json().catch(() => ({}));
    setCheck(b.ok ? { ok: true, text: `Works. With a sample weight of 1 it gives ${b.sample}.` } : { ok: false, text: b.error ?? "That formula could not be read." });
  };

  const save = async () => {
    setBusy(true);
    try {
      const r = await fetch(initial ? `/api/admin/allocation-methods/${initial.id}` : "/api/admin/allocation-methods", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, formula, target }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? "Could not save.");
      toast.success(initial ? "Method saved." : "Method created.");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3 border-b border-[#eceff3] bg-[#fafbfc] p-4 lg:grid-cols-2">
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Name</span>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="field-input h-8 w-full" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Description</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="field-input h-8 w-full" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Formula</span>
          <textarea
            value={formula}
            onChange={(e) => {
              setFormula(e.target.value);
              setCheck(null);
            }}
            rows={4}
            spellCheck={false}
            className="field-input w-full font-mono text-xs"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={test} className="h-8 rounded-sm bg-white px-3 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8]">
            Check formula
          </button>
          <button type="button" onClick={save} disabled={busy || !name.trim()} className="h-8 rounded-sm bg-zam-orange px-4 text-[13px] font-semibold text-white disabled:opacity-40">
            {busy ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={onCancel} className="h-8 rounded-sm bg-white px-3 text-[13px] font-semibold ring-1 ring-[#bfc5ce]">
            Cancel
          </button>
          {check && <span className={"text-xs font-semibold " + (check.ok ? "text-zam-green" : "text-zam-red")}>{check.text}</span>}
        </div>
      </div>
      <div className="text-[13px] text-zam-muted">
        <p className="mb-1 font-semibold text-zam-ink">The formula can use:</p>
        <ul className="mb-2 list-disc pl-5">
          {help.fields.map((f) => (
            <li key={f}>
              <code className="text-xs">{f}</code>
            </li>
          ))}
        </ul>
        <p className="mb-1">
          Operators <code>+ - * / ^</code> and comparisons <code>== != &lt; &gt;</code>; functions <code>sqrt log exp abs min max round floor ceil pow if(cond, a, b)</code>.
        </p>
        <p className="mb-1 font-semibold text-zam-ink">Examples:</p>
        <ul className="list-disc pl-5">
          {help.examples.map((e) => (
            <li key={e}>
              <button type="button" onClick={() => { setFormula(e); setCheck(null); }} className="text-left font-mono text-xs text-[#1f4e79] hover:underline">
                {e}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Section({ target, rows, reload }: { target: "Work" | "Right owner"; rows: Method[]; reload: () => void }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const list = rows.filter((m) => m.target === target);

  const remove = async (m: Method) => {
    if (!window.confirm(`Delete the method “${m.name}”?`)) return;
    const r = await fetch(`/api/admin/allocation-methods/${m.id}`, { method: "DELETE" });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return toast.error(b.error ?? "Could not delete.");
    toast.success("Method deleted.");
    reload();
  };

  return (
    <Panel
      title={`${target === "Work" ? "Work" : "Right Owner"} Allocation Method`}
      right={
        <button type="button" onClick={() => { setAdding((v) => !v); setEditing(null); }} className="inline-flex h-7 items-center gap-1.5 rounded-sm bg-zam-orange px-3 text-[13px] font-semibold text-white">
          <Plus size={13} /> Add {target === "Work" ? "Work" : "Right Owner"} Allocation Method
        </button>
      }
    >
      {adding && <Editor target={target} initial={null} onDone={() => { setAdding(false); reload(); }} onCancel={() => setAdding(false)} />}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Formula</Th>
              <Th className="text-right">Used by</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {list.map((m) =>
              editing === m.id ? (
                <tr key={m.id}>
                  <td colSpan={4} className="p-0">
                    <Editor target={target} initial={m} onDone={() => { setEditing(null); reload(); }} onCancel={() => setEditing(null)} />
                  </td>
                </tr>
              ) : (
                <tr key={m.id}>
                  <Td className="font-semibold">
                    {m.name}
                    {m.description && <span className="block text-xs font-normal text-zam-muted">{m.description}</span>}
                  </Td>
                  <Td className="font-mono text-xs">{m.formula}</Td>
                  <Td className="text-right tabular-nums">{m.used}</Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => { setEditing(m.id); setAdding(false); }} className="rounded-sm bg-[#e6ebf1] px-2.5 py-1 text-xs font-semibold text-[#1f4e79] hover:bg-[#d6dfe9]">
                        Edit
                      </button>
                      <button type="button" aria-label={`Delete ${m.name}`} onClick={() => remove(m)} className="grid h-7 w-7 place-items-center rounded-sm text-zam-muted hover:bg-zam-red/10 hover:text-zam-red">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Td>
                </tr>
              ),
            )}
            {list.length === 0 && (
              <tr>
                <Td colSpan={4} className="py-6 text-center text-zam-muted">
                  None yet — without one, the {target === "Work" ? "weight" : "share"} is used as it stands.
                </Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export default function AllocationMethodsPage() {
  const [rows, setRows] = useState<Method[] | null>(null);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const ctl = new AbortController();
    fetch("/api/admin/allocation-methods", { signal: ctl.signal, cache: "no-store" })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error ?? `Could not load the methods (${r.status}).`);
        setRows(b.methods);
        setErr("");
      })
      .catch((e) => e.name !== "AbortError" && setErr(e.message));
    return () => ctl.abort();
  }, [tick]);

  return (
    <div>
      <AdminHeader title="Allocation Methods" subtitle="Formulas a distribution pool uses to weight works and right-holders" />
      {err && <p className="mb-3 rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}
      <div className="space-y-3">
        <Section target="Work" rows={rows ?? []} reload={reload} />
        <Section target="Right owner" rows={rows ?? []} reload={reload} />
      </div>
    </div>
  );
}
