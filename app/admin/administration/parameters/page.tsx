"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel } from "@/components/admin/widgets";
import { CURRENCY_CODES, PARAM_SECTIONS, type ParamField } from "@/lib/parameters";
import territories from "@/data/wipo/territories.json";

type Values = Record<string, string | boolean | string[]>;

const small = "field-input h-8 w-full";
const COUNTRIES = territories.filter((t) => t.type === "Country").map((t) => t.name);

function Input({ f, v, onChange, disabled }: { f: ParamField; v: Values[string]; onChange: (x: Values[string]) => void; disabled: boolean }) {
  if (f.kind === "check") return <input type="checkbox" disabled={disabled} checked={v === true} onChange={(e) => onChange(e.target.checked)} />;
  if (f.kind === "multi")
    return (
      <select multiple disabled={disabled} value={Array.isArray(v) ? v : []} onChange={(e) => onChange([...e.target.selectedOptions].map((o) => o.value))} className="field-input h-28 w-full">
        {f.options?.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    );
  const opts = f.kind === "territory" ? COUNTRIES : f.kind === "currency" ? CURRENCY_CODES : f.options;
  if (opts)
    return (
      <select disabled={disabled} value={String(v ?? "")} onChange={(e) => onChange(e.target.value)} className={small + " appearance-none bg-white"}>
        {opts.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    );
  return <input disabled={disabled} value={String(v ?? "")} onChange={(e) => onChange(e.target.value)} className={small} />;
}

// WIPO Connect Administration > Parameters — every section saves on its own.
export default function ParametersPage() {
  const [values, setValues] = useState<Values | null>(null);
  const [editable, setEditable] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    fetch("/api/admin/parameters", { cache: "no-store" })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error ?? `Could not load (${r.status}).`);
        setValues(b.values);
        setEditable(b.editable);
      })
      .catch((e) => setErr(e.message));
  }, []);

  const save = async (title: string, keys: string[]) => {
    if (!values) return;
    setBusy(title);
    try {
      const r = await fetch("/api/admin/parameters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: title, values: Object.fromEntries(keys.map((k) => [k, values[k]])) }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? "Could not save.");
      setValues(b.values);
      toast.success(`${title} saved.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div>
      <AdminHeader title="Parameters" subtitle="System-wide settings" />
      {err && <p className="mb-3 rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}
      {!values && !err && <p className="text-sm text-zam-muted">Loading…</p>}
      {values && (
        <div className="space-y-3">
          {PARAM_SECTIONS.map((s) => (
            <Panel key={s.title} title={s.title}>
              <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
                {s.fields.map((f) => (
                  <label key={f.key} className="block">
                    <span className="mb-1 block text-[11px] font-semibold text-zam-muted">{f.label}</span>
                    <Input f={f} v={values[f.key]} disabled={!editable} onChange={(x) => setValues((p) => ({ ...p!, [f.key]: x }))} />
                  </label>
                ))}
              </div>
              {editable && (
                <div className="border-t border-[#eceff3] px-3 py-2">
                  <button
                    type="button"
                    disabled={busy === s.title}
                    onClick={() =>
                      save(
                        s.title,
                        s.fields.map((f) => f.key),
                      )
                    }
                    className="h-8 rounded-sm bg-[#286090] px-4 text-[13px] font-semibold text-white hover:bg-[#204d76] disabled:opacity-60"
                  >
                    Save
                  </button>
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
