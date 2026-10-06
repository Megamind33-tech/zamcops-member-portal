"use client";

import React, { useEffect, useState } from "react";
import { Download, Search } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td } from "@/components/admin/widgets";
import { CREATION_CLASSES } from "@/lib/poolConst";
import type { BiParam } from "@/lib/biCatalogue";

type Query = { name: string; params: BiParam[]; available: boolean; why: string };
type Result = { columns: string[]; rows: (string | number)[][] };

const small = "field-input h-8 w-full";

// WIPO Connect BI & Reports > Business Intelligence
export default function BusinessIntelligencePage() {
  const [queries, setQueries] = useState<Query[]>([]);
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/admin/bi", { cache: "no-store" })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error ?? `Could not load (${r.status}).`);
        setQueries(b.queries);
      })
      .catch((e) => setErr(e.message));
  }, []);

  const q = queries.find((x) => x.name === name);

  const run = async (format: "json" | "csv") => {
    if (!q) return;
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/admin/bi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q.name, params: values, format }) });
      if (!r.ok) {
        const b = await r.json().catch(() => ({}));
        throw new Error(b.error ?? "The query failed.");
      }
      if (format === "csv") {
        const blob = await r.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${q.name.replace(/[^A-Za-z0-9]+/g, "-")}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      } else setResult(await r.json());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "The query failed.");
      if (format === "json") setResult(null);
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(result.rows.map((r) => Object.fromEntries(result.columns.map((c, i) => [c, r[i]]))), null, 2)], { type: "application/json" }));
    a.download = `${q?.name.replace(/[^A-Za-z0-9]+/g, "-") ?? "report"}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Saved.");
  };

  const input = (p: BiParam) => {
    const v = values[p.code] ?? "";
    const set = (x: string) => setValues((s) => ({ ...s, [p.code]: x }));
    if (p.type === "DATE") return <input type="date" value={v} onChange={(e) => set(e.target.value)} className={small} />;
    if (p.type === "INTEGER") return <input inputMode="numeric" value={v} onChange={(e) => set(e.target.value)} className={small} />;
    if (p.type === "MULTISELECT")
      return (
        <select multiple value={v ? v.split(",") : []} onChange={(e) => set([...e.target.selectedOptions].map((o) => o.value).join(","))} className="field-input h-24 w-full">
          {CREATION_CLASSES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      );
    if (p.type === "CMO" || /cmo/i.test(p.code))
      return (
        <select value={v} onChange={(e) => set(e.target.value)} className={small + " appearance-none bg-white"}>
          <option value=""></option>
          <option value="ALL">ALL</option>
          <option value="133">ZAMCOPS</option>
        </select>
      );
    return <input value={v} onChange={(e) => set(e.target.value)} className={small} />;
  };

  return (
    <div>
      <AdminHeader title="Business Intelligence" subtitle="Reports and queries over the register and the distributions" />
      <div className="card mb-3 grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Query</span>
          <select
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setValues({});
              setResult(null);
              setErr("");
            }}
            className={small + " appearance-none bg-white"}
          >
            <option value=""></option>
            {queries.map((x) => (
              <option key={x.name} value={x.name}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        {q?.params.map((p) => (
          <label key={p.code} className="block">
            <span className="mb-1 block text-[11px] font-semibold text-zam-muted">{p.label}</span>
            {input(p)}
          </label>
        ))}
        {q && !q.available && <p className="text-[13px] text-zam-muted sm:col-span-4">{q.why}</p>}
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4 lg:justify-end">
          <button type="button" disabled={!q?.available || busy} onClick={() => run("json")} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-[#286090] px-3 text-[13px] font-semibold text-white hover:bg-[#204d76] disabled:opacity-50">
            <Search size={13} /> Search
          </button>
          <button type="button" disabled={!q?.available || busy} onClick={() => run("csv")} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-white px-3 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8] disabled:opacity-50">
            <Download size={13} /> CSV
          </button>
          <button type="button" disabled={!result || busy} onClick={download} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-white px-3 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8] disabled:opacity-50">
            <Download size={13} /> Json
          </button>
        </div>
      </div>
      {err && <p className="mb-3 rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}
      {result && (
        <Panel title={`${q?.name ?? "Result"} — ${result.rows.length.toLocaleString()} row${result.rows.length === 1 ? "" : "s"}`}>
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr>
                  {result.columns.map((c) => (
                    <Th key={c}>{c}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.length === 0 && (
                  <tr>
                    <Td colSpan={result.columns.length} className="py-6 text-center text-zam-muted">
                      No data available in table
                    </Td>
                  </tr>
                )}
                {result.rows.slice(0, 1000).map((r, i) => (
                  <tr key={i}>
                    {r.map((v, j) => (
                      <Td key={j}>{v}</Td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.rows.length > 1000 && <p className="border-t border-[#eceff3] px-3 py-2 text-[12px] text-zam-muted">Showing the first 1,000 rows. Download the CSV for all of them.</p>}
        </Panel>
      )}
    </div>
  );
}
