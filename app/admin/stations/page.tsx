"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Radio, Trash2, Tv } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";
import { STATION_KINDS } from "@/lib/poolConst";

type Station = { id: string; name: string; kind: string; code: string; region: string; notes: string; active: boolean; links: number };

const small = "field-input h-8 w-full";

// The society's list of radio and television stations (and other places music
// is reported from). Pool links in a distribution pick from here.
export default function StationsPage() {
  const [rows, setRows] = useState<Station[] | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [tick, setTick] = useState(0);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", kind: "Radio", code: "", region: "" });
  const [edit, setEdit] = useState<Station | null>(null);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/admin/stations?${new URLSearchParams({ q, kind })}`, { signal: ctl.signal, cache: "no-store" })
        .then(async (r) => {
          const b = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(b.error ?? `Could not load the stations (${r.status}).`);
          setRows(b.stations);
          setErr("");
        })
        .catch((e) => e.name !== "AbortError" && setErr(e.message));
    }, 250);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q, kind, tick]);

  const send = async (url: string, method: string, body: unknown, ok: string) => {
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) {
      toast.error(b.error ?? "That did not work.");
      return false;
    }
    toast.success(ok);
    reload();
    return true;
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await send("/api/admin/stations", "POST", draft, "Station added.")) {
      setDraft({ name: "", kind: draft.kind, code: "", region: "" });
      setAdding(false);
    }
  };

  const save = async () => {
    if (!edit) return;
    if (await send(`/api/admin/stations/${edit.id}`, "PATCH", { name: edit.name, kind: edit.kind, code: edit.code, region: edit.region, notes: edit.notes, active: edit.active }, "Station saved.")) setEdit(null);
  };

  return (
    <div>
      <AdminHeader
        title="Radio & TV Stations"
        subtitle={rows ? `${rows.length.toLocaleString()} station${rows.length === 1 ? "" : "s"}` : "Stations that report music use"}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, code, region…" className="field-input h-8 w-56" />
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="field-input h-8 w-auto appearance-none bg-white pr-8" aria-label="Filter by type">
              <option value="">All types</option>
              {STATION_KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
            <button type="button" onClick={() => setAdding((v) => !v)} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-zam-orange px-3 text-[13px] font-semibold text-white">
              <Plus size={13} /> Add station
            </button>
          </div>
        }
      />

      {adding && (
        <form onSubmit={add} className="card mb-3 grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-5">
          <input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Station name (e.g. HOPE TV)" className={small + " lg:col-span-2"} />
          <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} className={small + " appearance-none bg-white"}>
            {STATION_KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="Code (optional)" className={small} />
          <input value={draft.region} onChange={(e) => setDraft({ ...draft, region: e.target.value })} placeholder="Region (optional)" className={small} />
          <div className="sm:col-span-2 lg:col-span-5">
            <button type="submit" disabled={!draft.name.trim()} className="inline-flex h-8 items-center rounded-sm bg-zam-orange px-4 text-[13px] font-semibold text-white disabled:opacity-40">
              Add station
            </button>
          </div>
        </form>
      )}

      {err && <p className="mb-3 rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}

      <Panel title="Results">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Code</Th>
                <Th>Region</Th>
                <Th className="text-right">Pool links</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {!rows && !err && (
                <tr>
                  <Td colSpan={7} className="py-6 text-center text-zam-muted">
                    Loading…
                  </Td>
                </tr>
              )}
              {rows?.map((s) =>
                edit?.id === s.id ? (
                  <tr key={s.id}>
                    <Td>
                      <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={small} />
                    </Td>
                    <Td>
                      <select value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value })} className={small + " appearance-none bg-white"}>
                        {STATION_KINDS.map((k) => (
                          <option key={k}>{k}</option>
                        ))}
                      </select>
                    </Td>
                    <Td>
                      <input value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value })} className={small} />
                    </Td>
                    <Td>
                      <input value={edit.region} onChange={(e) => setEdit({ ...edit, region: e.target.value })} className={small} />
                    </Td>
                    <Td className="text-right tabular-nums">{s.links}</Td>
                    <Td>
                      <label className="flex items-center gap-1.5 text-xs">
                        <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} className="h-3.5 w-3.5" /> Active
                      </label>
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={save} className="rounded-sm bg-zam-orange px-2.5 py-1 text-xs font-semibold text-white">
                          Save
                        </button>
                        <button type="button" onClick={() => setEdit(null)} className="rounded-sm bg-zam-canvas px-2.5 py-1 text-xs font-semibold">
                          Cancel
                        </button>
                      </div>
                    </Td>
                  </tr>
                ) : (
                  <tr key={s.id}>
                    <Td className="font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        {s.kind === "Radio" ? <Radio size={13} className="text-[#55789e]" /> : <Tv size={13} className="text-[#55789e]" />}
                        {s.name}
                      </span>
                    </Td>
                    <Td>{s.kind}</Td>
                    <Td className="font-mono text-xs">{s.code || "—"}</Td>
                    <Td>{s.region || "—"}</Td>
                    <Td className="text-right tabular-nums">{s.links}</Td>
                    <Td>
                      <StatusBadge status={s.active ? "Active" : "Paused"} />
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => setEdit(s)} className="rounded-sm bg-[#e6ebf1] px-2.5 py-1 text-xs font-semibold text-[#1f4e79] hover:bg-[#d6dfe9]">
                          Edit
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${s.name}`}
                          onClick={() => window.confirm(`Delete the station “${s.name}”?`) && send(`/api/admin/stations/${s.id}`, "DELETE", null, "Station deleted.")}
                          className="grid h-7 w-7 place-items-center rounded-sm text-zam-muted hover:bg-zam-red/10 hover:text-zam-red"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ),
              )}
              {rows && rows.length === 0 && (
                <tr>
                  <Td colSpan={7} className="py-8 text-center text-zam-muted">
                    No stations yet. Add the radio and TV stations you collect from, or add them as you build a distribution.
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
