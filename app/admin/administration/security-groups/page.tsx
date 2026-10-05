"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td } from "@/components/admin/widgets";

type Perm = { code: string; name: string; description: string };
type Group = { id: string; name: string; description: string; note: string; permissions: string[]; users: { id: string; name: string; email: string }[] };
type Data = { permissions: Perm[]; canManage: boolean; groups: Group[] };

const small = "field-input h-8 w-full";

function Editor({ g, perms, onClose, onDone }: { g: Group | null; perms: Perm[]; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(g?.name ?? "");
  const [description, setDescription] = useState(g?.description ?? "");
  const [note, setNote] = useState(g?.note ?? "");
  const [sel, setSel] = useState<string[]>(g?.permissions ?? []);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const r = await fetch(g ? `/api/admin/security-groups/${g.id}` : "/api/admin/security-groups", {
        method: g ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, note, permissions: sel }),
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
    if (!g || !window.confirm(`Are you sure you want to delete ${g.name}?`)) return;
    const r = await fetch(`/api/admin/security-groups/${g.id}`, { method: "DELETE" });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return toast.error(b.error ?? "Could not delete.");
    toast.success("Deleted.");
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="mt-8 w-full max-w-3xl rounded-sm bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#d9dde3] bg-[#f5f6f8] px-3 py-2">
          <h2 className="text-[13px] font-bold text-[#1f4e79]">{g ? "Security Group" : "Add Security Group"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-zam-muted hover:text-zam-ink">
            <X size={16} />
          </button>
        </div>
        <div className="grid gap-3 p-4">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={small} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Description</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={small} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Note</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="field-input w-full" />
          </label>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zam-muted">Permissions ({sel.length})</span>
              <span className="flex gap-3 text-[12px] text-[#286090]">
                <button type="button" onClick={() => setSel(perms.map((p) => p.code))}>
                  Select all
                </button>
                <button type="button" onClick={() => setSel([])}>
                  Clear
                </button>
              </span>
            </div>
            <div className="grid max-h-72 gap-x-4 gap-y-1 overflow-y-auto rounded-sm border border-[#d9dde3] p-2 sm:grid-cols-2">
              {perms.map((p) => (
                <label key={p.code} className="flex items-center gap-1.5 text-[13px]">
                  <input type="checkbox" checked={sel.includes(p.code)} onChange={(e) => setSel((x) => (e.target.checked ? [...x, p.code] : x.filter((c) => c !== p.code)))} />
                  {p.description}
                </label>
              ))}
            </div>
          </div>
          {g && (
            <p className="text-[12px] text-zam-muted">
              Users: {g.users.length ? g.users.map((u) => u.name || u.email).join(", ") : "none — add accounts to this group from User Accounts."}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-[#d9dde3] px-4 py-3">
          <div>
            {g && (
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

// WIPO Connect Administration > Security Groups
export default function SecurityGroupsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [edit, setEdit] = useState<Group | "new" | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/security-groups", { cache: "no-store" });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return setErr(b.error ?? `Could not load (${r.status}).`);
    setData(b);
    setErr("");
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <AdminHeader
        title="Security Groups"
        subtitle="What each group of staff may open and change"
        right={
          data?.canManage ? (
            <button type="button" onClick={() => setEdit("new")} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-[#286090] px-3 text-[13px] font-semibold text-white hover:bg-[#204d76]">
              <Plus size={13} /> Add Security Group
            </button>
          ) : undefined
        }
      />
      {err && <p className="mb-3 rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}
      <Panel title="Security Groups">
        <table className="w-full">
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Description</Th>
              <Th>Permissions</Th>
            </tr>
          </thead>
          <tbody>
            {data?.groups.map((g) => (
              <tr key={g.id} onClick={data.canManage ? () => setEdit(g) : undefined} className={data.canManage ? "cursor-pointer hover:bg-[#f3f7fb]" : undefined}>
                <Td>{g.name}</Td>
                <Td>{g.description}</Td>
                <Td>{g.permissions.length}</Td>
              </tr>
            ))}
            {!data && !err && (
              <tr>
                <Td colSpan={3} className="py-6 text-center text-zam-muted">
                  Loading…
                </Td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
      {edit && data && (
        <Editor
          g={edit === "new" ? null : edit}
          perms={data.permissions}
          onClose={() => setEdit(null)}
          onDone={() => {
            setEdit(null);
            load();
          }}
        />
      )}
    </div>
  );
}
