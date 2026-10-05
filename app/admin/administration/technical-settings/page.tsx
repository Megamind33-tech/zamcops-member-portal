"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel } from "@/components/admin/widgets";

type Conn = { baseUrl: string; username: string; hasKey: boolean };
type Data = { shared: Conn; ipi: Conn; iswc: Conn; openIpn: Conn; workValidation: string };

const small = "field-input h-8 w-full";
const CONNS: { key: "shared" | "ipi" | "iswc" | "openIpn"; title: string }[] = [
  { key: "shared", title: "Connection To Shared" },
  { key: "ipi", title: "Connection To IPI" },
  { key: "iswc", title: "Connection To ISWC" },
  { key: "openIpn", title: "Connection To Open IPN" },
];

function ConnectionPanel({ title, k, c, onSaved }: { title: string; k: string; c: Conn; onSaved: (d: Data) => void }) {
  const [baseUrl, setBaseUrl] = useState(c.baseUrl);
  const [username, setUsername] = useState(c.username);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/technical-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conn: k, baseUrl, username, password }) });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? "Could not save.");
      setPassword("");
      onSaved(b);
      toast.success(`${title} saved.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    setResult(null);
    const r = await fetch("/api/admin/technical-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conn: k }) });
    const b = await r.json().catch(() => ({}));
    setResult({ ok: !!b.ok, text: b.message ?? b.error ?? "No answer." });
    setBusy(false);
  };

  return (
    <Panel title={title}>
      <div className="grid gap-3 p-3 sm:grid-cols-3">
        <label className="block sm:col-span-3">
          <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Base URL</span>
          <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className={small} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className={small} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Password</span>
          <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={c.hasKey ? "•••••••• (saved — type to replace)" : ""} className={small} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-[#eceff3] px-3 py-2">
        <button type="button" onClick={test} disabled={busy} className="h-8 rounded-sm bg-white px-4 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8] disabled:opacity-60">
          Test
        </button>
        <button type="button" onClick={save} disabled={busy} className="h-8 rounded-sm bg-[#286090] px-4 text-[13px] font-semibold text-white hover:bg-[#204d76] disabled:opacity-60">
          Save
        </button>
        {result && <span className={result.ok ? "text-[13px] text-zam-green" : "text-[13px] text-zam-red"}>{result.text}</span>}
      </div>
    </Panel>
  );
}

// WIPO Connect Administration > Technical Settings
export default function TechnicalSettingsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [formula, setFormula] = useState("");

  useEffect(() => {
    fetch("/api/admin/technical-settings", { cache: "no-store" })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error ?? `Could not load (${r.status}).`);
        setData(b);
        setFormula(b.workValidation);
      })
      .catch((e) => setErr(e.message));
  }, []);

  const saveFormula = async () => {
    const r = await fetch("/api/admin/technical-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workValidation: formula }) });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return toast.error(b.error ?? "Could not save.");
    toast.success("Work Validation saved.");
  };

  return (
    <div>
      <AdminHeader title="Technical Settings" subtitle="Connections to outside services" />
      {err && <p className="mb-3 rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}
      {data && (
        <div className="space-y-3">
          {CONNS.map((c) => (
            <ConnectionPanel key={c.key} title={c.title} k={c.key} c={data[c.key]} onSaved={setData} />
          ))}
          <Panel title="Work Validation">
            <div className="space-y-2 p-3">
              <p className="text-[12px] text-zam-muted">The following condition formula permits to define the rule to validate a Work. The check is made when the user press the Save button in the Work screen.</p>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Formula</span>
                <textarea value={formula} onChange={(e) => setFormula(e.target.value)} rows={3} spellCheck={false} className="field-input w-full font-mono text-xs" />
              </label>
            </div>
            <div className="border-t border-[#eceff3] px-3 py-2">
              <button type="button" onClick={saveFormula} className="h-8 rounded-sm bg-[#286090] px-4 text-[13px] font-semibold text-white hover:bg-[#204d76]">
                Save
              </button>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
