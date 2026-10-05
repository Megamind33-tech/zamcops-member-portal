"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td } from "@/components/admin/widgets";
import { UI_LANGUAGES, ACCOUNT_TYPES } from "@/lib/accountFields";

type Account = {
  id: string;
  email: string;
  name: string;
  firstName: string;
  language: string;
  accountType: string;
  active: boolean;
  tags: string;
  matchMin: number | null;
  matchMax: number | null;
  groups: { id: string; name: string }[];
};
type Data = { me: string; canManage: boolean; groups: { id: string; name: string }[]; accounts: Account[] };

const small = "field-input h-8 w-full";

function Lbl({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-zam-muted">{t}</span>
      {children}
    </label>
  );
}

function Editor({ acc, groups, me, onClose, onDone }: { acc: Account | null; groups: Data["groups"]; me: string; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState({
    email: acc?.email ?? "",
    name: acc?.name ?? "",
    firstName: acc?.firstName ?? "",
    language: acc?.language ?? "English",
    accountType: acc?.accountType ?? "Operator",
    active: acc ? (acc.active ? "Active" : "Not active") : "Active",
    password: "",
    password2: "",
    tags: acc?.tags ?? "",
    matchMin: acc?.matchMin == null ? "" : String(acc.matchMin),
    matchMax: acc?.matchMax == null ? "" : String(acc.matchMax),
  });
  const [groupIds, setGroupIds] = useState<string[]>(acc?.groups.map((g) => g.id) ?? []);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((x) => ({ ...x, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    try {
      const r = await fetch(acc ? `/api/admin/accounts/${acc.id}` : "/api/admin/accounts", {
        method: acc ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...v, active: v.active === "Active", groupIds }),
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
    if (!acc || !window.confirm(`Are you sure you want to delete ${acc.email}?`)) return;
    const r = await fetch(`/api/admin/accounts/${acc.id}`, { method: "DELETE" });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return toast.error(b.error ?? "Could not delete.");
    toast.success("Deleted.");
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="mt-8 w-full max-w-3xl rounded-sm bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#d9dde3] bg-[#f5f6f8] px-3 py-2">
          <h2 className="text-[13px] font-bold text-[#1f4e79]">{acc ? "User Account" : "Add User Account"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-zam-muted hover:text-zam-ink">
            <X size={16} />
          </button>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <Lbl t="Email">
            <input type="email" value={v.email} onChange={set("email")} className={small} />
          </Lbl>
          <Lbl t="Name">
            <input value={v.name} onChange={set("name")} className={small} />
          </Lbl>
          <Lbl t="First Name">
            <input value={v.firstName} onChange={set("firstName")} className={small} />
          </Lbl>
          <Lbl t="UI Language Code">
            <select value={v.language} onChange={set("language")} className={small + " appearance-none bg-white"}>
              {UI_LANGUAGES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Lbl>
          <Lbl t="Account type">
            <select value={v.accountType} onChange={set("accountType")} className={small + " appearance-none bg-white"}>
              {ACCOUNT_TYPES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Lbl>
          <Lbl t="Status">
            <select value={v.active} onChange={set("active")} disabled={acc?.id === me} className={small + " appearance-none bg-white"}>
              <option>Active</option>
              <option>Not active</option>
            </select>
          </Lbl>
          <Lbl t={acc ? "Password (leave empty to keep)" : "Password"}>
            <input type="password" autoComplete="new-password" value={v.password} onChange={set("password")} className={small} />
          </Lbl>
          <Lbl t="Repeat password">
            <input type="password" autoComplete="new-password" value={v.password2} onChange={set("password2")} className={small} />
          </Lbl>
          <Lbl t="Tags">
            <input value={v.tags} onChange={set("tags")} className={small} />
          </Lbl>
          <div />
          <Lbl t="Matching Amount Min (ZMW)">
            <input value={v.matchMin} onChange={set("matchMin")} inputMode="decimal" className={small} />
          </Lbl>
          <Lbl t="Matching Amount Max (ZMW)">
            <input value={v.matchMax} onChange={set("matchMax")} inputMode="decimal" className={small} />
          </Lbl>
          <div className="sm:col-span-2">
            <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Groups</span>
            <div className="flex flex-wrap gap-3 rounded-sm border border-[#d9dde3] p-2">
              {groups.map((g) => (
                <label key={g.id} className="flex items-center gap-1.5 text-[13px]">
                  <input type="checkbox" checked={groupIds.includes(g.id)} onChange={(e) => setGroupIds((x) => (e.target.checked ? [...x, g.id] : x.filter((i) => i !== g.id)))} />
                  {g.name}
                </label>
              ))}
              {groups.length === 0 && <span className="text-[12px] text-zam-muted">No security groups yet.</span>}
            </div>
            <p className="mt-1 text-[11px] text-zam-muted">An account in no group keeps full access.</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-[#d9dde3] px-4 py-3">
          <div>
            {acc && acc.id !== me && (
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

// WIPO Connect Administration > User Accounts
export default function AccountsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [edit, setEdit] = useState<Account | "new" | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/accounts", { cache: "no-store" });
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
        title="User Accounts"
        subtitle="Staff who can sign in to the console"
        right={
          data?.canManage ? (
            <button type="button" onClick={() => setEdit("new")} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-[#286090] px-3 text-[13px] font-semibold text-white hover:bg-[#204d76]">
              <Plus size={13} /> Add User Account
            </button>
          ) : undefined
        }
      />
      {err && <p className="mb-3 rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}
      <Panel title="User Accounts">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr>
                <Th>Email</Th>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th>Security Group(s)</Th>
              </tr>
            </thead>
            <tbody>
              {!data && !err && (
                <tr>
                  <Td colSpan={5} className="py-6 text-center text-zam-muted">
                    Loading…
                  </Td>
                </tr>
              )}
              {data?.accounts.map((a) => (
                <tr key={a.id} onClick={data.canManage ? () => setEdit(a) : undefined} className={data.canManage ? "cursor-pointer hover:bg-[#f3f7fb]" : undefined}>
                  <Td>{a.email}</Td>
                  <Td>{[a.firstName, a.name].filter(Boolean).join(" ")}</Td>
                  <Td>{a.accountType}</Td>
                  <Td>{a.active ? "Active" : "Not active"}</Td>
                  <Td>{a.groups.map((g) => g.name).join(", ")}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {edit && data && (
        <Editor
          acc={edit === "new" ? null : edit}
          groups={data.groups}
          me={data.me}
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
