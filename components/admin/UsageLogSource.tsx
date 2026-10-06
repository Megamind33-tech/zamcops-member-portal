"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Panel, Th, Td } from "@/components/admin/widgets";

type Log = { id: string; fileCode: string; filename: string; uploadedAt: string; rows: number; groups: number; processed: number; errors: number; status: string; priority: number; linkId: string | null };
type Opt = { id: string; name: string };
type LinkInfo = { pool: { logSourceId: string | null; logMethodId: string | null } | null; logSourceId: string | null; logMethodId: string | null };

const small = "field-input h-8 w-full";

// WIPO's pool link "Source" tab (Log Based pools): which Log Source and Log
// Allocation Method apply, and the usage log files imported for this link.
export function SourceTab({ linkId, distributionId, link, locked, onChange }: { linkId: string; distributionId: string; link: LinkInfo; locked: boolean; onChange: () => void }) {
  const [sources, setSources] = useState<Opt[]>([]);
  const [methods, setMethods] = useState<Opt[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [src, setSrc] = useState(link.logSourceId ?? "");
  const [meth, setMeth] = useState(link.logMethodId ?? "");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const loadLogs = useCallback(async () => {
    const r = await fetch("/api/admin/usage-logs?page=1", { cache: "no-store" });
    const b = await r.json().catch(() => ({}));
    if (r.ok) setLogs((b.rows as Log[]).filter((l) => l.linkId === linkId));
  }, [linkId]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/matching-settings/sources", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/matching-settings/allocation-methods", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([s, m]) => {
        setSources(s.rows ?? []);
        setMethods(m.rows ?? []);
      })
      .catch(() => {});
    loadLogs();
  }, [loadLogs]);

  const effectiveSource = src || link.pool?.logSourceId || "";

  const saveSettings = async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/registry/distributions/${distributionId}/links/${linkId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ logSourceId: src || null, logMethodId: meth || null }) });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? "Could not save.");
      toast.success("Saved.");
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const upload = async (f: File) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", f);
      fd.set("linkId", linkId);
      const r = await fetch("/api/admin/usage-logs", { method: "POST", body: fd });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? "The import failed.");
      toast.success("Usage log imported and matched.");
      await loadLogs();
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The import failed.");
      await loadLogs();
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  };

  const remove = async (l: Log) => {
    if (!window.confirm(`Are you sure you want to delete ${l.filename}?`)) return;
    const r = await fetch(`/api/admin/usage-logs?id=${l.id}`, { method: "DELETE" });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return toast.error(b.error ?? "Could not delete.");
    loadLogs();
    onChange();
  };

  return (
    <div className="space-y-3">
      <Panel title="Log Source">
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Log Source {link.pool?.logSourceId ? "(empty = the pool’s)" : ""}</span>
            <select value={src} disabled={locked} onChange={(e) => setSrc(e.target.value)} className={small + " appearance-none bg-white"}>
              <option value=""></option>
              {sources.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Log Allocation Method {link.pool?.logMethodId ? "(empty = the pool’s)" : ""}</span>
            <select value={meth} disabled={locked} onChange={(e) => setMeth(e.target.value)} className={small + " appearance-none bg-white"}>
              <option value=""></option>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!locked && (
          <div className="border-t border-[#eceff3] px-4 py-2">
            <button type="button" onClick={saveSettings} disabled={busy} className="h-8 rounded-sm bg-[#286090] px-4 text-[13px] font-semibold text-white hover:bg-[#204d76] disabled:opacity-60">
              Save
            </button>
          </div>
        )}
      </Panel>

      <Panel
        title="Usage Logs"
        right={
          !locked && (
            <>
              <input ref={file} type="file" accept=".xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              <button type="button" disabled={busy || !effectiveSource} title={effectiveSource ? "" : "Choose a Log Source first"} onClick={() => file.current?.click()} className="inline-flex h-7 items-center gap-1 rounded-sm bg-[#286090] px-3 text-[12px] font-semibold text-white hover:bg-[#204d76] disabled:opacity-50">
                <Upload size={12} /> {busy ? "Working…" : "Import usage log (.xlsx)"}
              </button>
            </>
          )
        }
      >
        <table className="w-full">
          <thead>
            <tr>
              <Th>File Code</Th>
              <Th>Filename</Th>
              <Th>Upload Date</Th>
              <Th>Rows Count</Th>
              <Th>Groups Count</Th>
              <Th>Matched</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <Td colSpan={8} className="py-6 text-center text-zam-muted">
                  No usage log imported for this pool link.
                </Td>
              </tr>
            )}
            {logs.map((l) => (
              <tr key={l.id}>
                <Td className="font-mono text-xs">{l.fileCode}</Td>
                <Td>{l.filename}</Td>
                <Td>{new Date(l.uploadedAt).toLocaleString()}</Td>
                <Td>{l.rows}</Td>
                <Td>{l.groups}</Td>
                <Td>
                  {l.processed} / {l.groups}
                </Td>
                <Td>{l.status}</Td>
                <Td className="text-right">
                  {!locked && (
                    <button type="button" aria-label="Delete" onClick={() => remove(l)} className="text-zam-muted hover:text-zam-red">
                      <Trash2 size={14} />
                    </button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-[#eceff3] px-4 py-2 text-[12px] text-zam-muted">
          Lines that are not matched automatically wait in{" "}
          <Link href={`/admin/pending-matches?dpl=${linkId}`} className="text-[#286090] underline">
            Pending Matches
          </Link>
          ; only matched lines are paid when the allocation is run.
        </p>
      </Panel>
    </div>
  );
}

