"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ShieldCheck, UserPlus, Trash2, History } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td } from "@/components/admin/widgets";
import { Field, TextInput } from "@/components/ui/Field";
import { formatDate } from "@/lib/format";

interface StaffAccount {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface AuditEntry {
  id: string;
  adminName: string;
  adminEmail: string;
  action: string;
  targetType: string;
  summary: string;
  createdAt: string;
}

export default function AdminTeamPage() {
  const [admins, setAdmins] = useState<StaffAccount[]>([]);
  const [me, setMe] = useState("");
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const [usersRes, auditRes] = await Promise.all([fetch("/api/admin/users"), fetch("/api/admin/audit")]);
    if (usersRes.ok) {
      const d = await usersRes.json();
      setAdmins(d.admins ?? []);
      setMe(d.me ?? "");
    }
    if (auditRes.ok) setLogs((await auditRes.json()).logs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: d.error || "Could not create the account." });
    setForm({ name: "", email: "", password: "" });
    setMsg({ ok: true, text: "Staff account created — they can sign in at /admin/login." });
    await load();
  };

  const remove = async (a: StaffAccount) => {
    if (!window.confirm(`Remove the staff account for ${a.name} <${a.email}>? They will no longer be able to sign in.`)) return;
    setBusy(true);
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: d.error || "Could not remove the account." });
    await load();
  };

  return (
    <div>
      <AdminHeader title="Team & Activity" subtitle="Named staff accounts and the audit trail of console actions" />

      <div className="mb-6 grid items-start gap-6 lg:grid-cols-2">
        <Panel title={`Staff accounts (${admins.length})`}>
          {admins.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-night-400">{loading ? "Loading…" : "No staff accounts yet."}</p>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {admins.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-zam-orange-soft text-zam-orange">
                    <ShieldCheck size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {a.name}
                      {a.id === me && <span className="ml-2 rounded-full bg-zam-green/12 px-2 py-0.5 text-[10px] font-bold text-zam-green">You</span>}
                    </p>
                    <p className="truncate text-xs text-night-400">
                      {a.email} · joined {formatDate(a.createdAt)}
                    </p>
                  </div>
                  {a.id !== me && (
                    <button
                      onClick={() => remove(a)}
                      disabled={busy}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-night-400 transition hover:bg-zam-red/10 hover:text-zam-red disabled:opacity-40"
                      aria-label={`Remove ${a.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Add a staff account">
          <form onSubmit={create} className="space-y-3 p-5">
            <Field label="Full name">
              <TextInput placeholder="e.g. Mary Zulu" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Staff email">
              <TextInput type="email" placeholder="name@zamcops.org.zm" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field label="Password (min. 8 characters)">
              <TextInput type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </Field>
            {msg && <p className={`text-sm font-medium ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.text}</p>}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-night-950 hover:bg-accent-400 disabled:opacity-50"
            >
              <UserPlus size={15} /> {busy ? "Saving…" : "Create account"}
            </button>
            <p className="text-xs text-night-400">
              Every console action is recorded against the signed-in account below, so give each staff member their own login.
            </p>
          </form>
        </Panel>
      </div>

      <Panel title="Activity log" right={<History size={15} className="text-night-400" />}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-white/[0.03]">
              <tr>
                <Th>When</Th>
                <Th>Staff</Th>
                <Th>Action</Th>
                <Th>Detail</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-white/[0.03]">
                  <Td className="whitespace-nowrap text-xs text-night-400">{formatDate(l.createdAt)}</Td>
                  <Td className="text-sm font-semibold text-white">{l.adminName}</Td>
                  <Td>
                    <span className="rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-xs text-night-300">{l.action}</span>
                  </Td>
                  <Td className="text-sm text-night-300">{l.summary || l.targetType}</Td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <Td colSpan={4} className="py-8 text-center text-night-400">
                    {loading ? "Loading…" : "No activity recorded yet — actions taken from now on will appear here."}
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
