"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";
import { POOL_METHODS, POOL_RIGHT_TYPES, STATION_KINDS } from "@/lib/poolConst";

type Pool = { id: string; code: string; name: string; kind: string; method: string; creationClass: string; rightType: string; adminFeePct: number; notes: string; active: boolean; links: number };

const small = "field-input h-8 w-full";
const blank = { code: "", name: "", kind: "Television", method: "Work List", creationClass: "MW", rightType: "Performing", adminFeePct: "0" };

// Distribution pools — WIPO Connect's reusable setups (for example TV-WL-01):
// what class of use the money is for, which right it pays and the admin fee.
export default function PoolsPage() {
  const [rows, setRows] = useState<Pool[] | null>(null);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(blank);
  const [edit, setEdit] = useState<(Pool & { fee: string }) | null>(null);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const ctl = new AbortController();
    fetch("/api/admin/pools", { signal: ctl.signal, cache: "no-store" })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error ?? `Could not load the pools (${r.status}).`);
        setRows(b.pools);
        setErr("");
      })
      .catch((e) => e.name !== "AbortError" && setErr(e.message));
    return () => ctl.abort();
  }, [tick]);

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
    if (await send("/api/admin/pools", "POST", draft, "Pool created.")) {
      setDraft(blank);
      setAdding(false);
    }
  };

  const save = async () => {
    if (!edit) return;
    if (
      await send(
        `/api/admin/pools/${edit.id}`,
        "PATCH",
        { code: edit.code, name: edit.name, kind: edit.kind, method: edit.method, creationClass: edit.creationClass, rightType: edit.rightType, adminFeePct: edit.fee, active: edit.active },
        "Pool saved.",
      )
    )
      setEdit(null);
  };

  return (
    <div>
      <AdminHeader
        title="Distribution Pools"
        subtitle="Reusable setups a distribution's pool links draw on"
        right={
          <button type="button" onClick={() => setAdding((v) => !v)} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-zam-orange px-3 text-[13px] font-semibold text-white">
            <Plus size={13} /> Add pool
          </button>
        }
      />

      {adding && (
        <form onSubmit={add} className="card mb-3 grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <input autoFocus value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="Code (e.g. TV-WL-01)" className={small + " font-mono"} />
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name (optional)" className={small} />
          <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} className={small + " appearance-none bg-white"} aria-label="Class of use">
            {STATION_KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <select value={draft.method} onChange={(e) => setDraft({ ...draft, method: e.target.value })} className={small + " appearance-none bg-white"} aria-label="Method">
            {POOL_METHODS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <input value={draft.creationClass} onChange={(e) => setDraft({ ...draft, creationClass: e.target.value })} placeholder="Creation class (MW)" className={small} />
          <select value={draft.rightType} onChange={(e) => setDraft({ ...draft, rightType: e.target.value })} className={small + " appearance-none bg-white"} aria-label="Right type">
            {POOL_RIGHT_TYPES.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <input inputMode="decimal" value={draft.adminFeePct} onChange={(e) => setDraft({ ...draft, adminFeePct: e.target.value })} placeholder="Admin fee %" className={small + " text-right"} />
          <div>
            <button type="submit" disabled={!draft.code.trim()} className="inline-flex h-8 items-center rounded-sm bg-zam-orange px-4 text-[13px] font-semibold text-white disabled:opacity-40">
              Create pool
            </button>
          </div>
        </form>
      )}

      {err && <p className="mb-3 rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}

      <Panel title="Results">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr>
                <Th>Code</Th>
                <Th>Name</Th>
                <Th>Class</Th>
                <Th>Method</Th>
                <Th>Creation class</Th>
                <Th>Right type</Th>
                <Th className="text-right">Admin fee</Th>
                <Th className="text-right">Used</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {!rows && !err && (
                <tr>
                  <Td colSpan={10} className="py-6 text-center text-zam-muted">
                    Loading…
                  </Td>
                </tr>
              )}
              {rows?.map((p) =>
                edit?.id === p.id ? (
                  <tr key={p.id}>
                    <Td>
                      <input value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value })} className={small + " font-mono"} />
                    </Td>
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
                      <select value={edit.method} onChange={(e) => setEdit({ ...edit, method: e.target.value })} className={small + " appearance-none bg-white"}>
                        {POOL_METHODS.map((k) => (
                          <option key={k}>{k}</option>
                        ))}
                      </select>
                    </Td>
                    <Td>
                      <input value={edit.creationClass} onChange={(e) => setEdit({ ...edit, creationClass: e.target.value })} className={small} />
                    </Td>
                    <Td>
                      <select value={edit.rightType} onChange={(e) => setEdit({ ...edit, rightType: e.target.value })} className={small + " appearance-none bg-white"}>
                        {POOL_RIGHT_TYPES.map((k) => (
                          <option key={k}>{k}</option>
                        ))}
                      </select>
                    </Td>
                    <Td className="text-right">
                      <input inputMode="decimal" value={edit.fee} onChange={(e) => setEdit({ ...edit, fee: e.target.value })} className={small + " w-20 text-right"} />
                    </Td>
                    <Td className="text-right tabular-nums">{p.links}</Td>
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
                  <tr key={p.id}>
                    <Td className="font-mono text-xs font-bold">{p.code}</Td>
                    <Td>{p.name || "—"}</Td>
                    <Td>{p.kind}</Td>
                    <Td>{p.method}</Td>
                    <Td>{p.creationClass}</Td>
                    <Td>{p.rightType}</Td>
                    <Td className="text-right tabular-nums">{p.adminFeePct}%</Td>
                    <Td className="text-right tabular-nums">{p.links}</Td>
                    <Td>
                      <StatusBadge status={p.active ? "Active" : "Paused"} />
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => setEdit({ ...p, fee: String(p.adminFeePct) })} className="rounded-sm bg-[#e6ebf1] px-2.5 py-1 text-xs font-semibold text-[#1f4e79] hover:bg-[#d6dfe9]">
                          Edit
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${p.code}`}
                          onClick={() => window.confirm(`Delete the pool ${p.code}?`) && send(`/api/admin/pools/${p.id}`, "DELETE", null, "Pool deleted.")}
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
                  <Td colSpan={10} className="py-8 text-center text-zam-muted">
                    No pools yet. A pool such as TV-WL-01 says which class of use and which right a block of money pays.
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
