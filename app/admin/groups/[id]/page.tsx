"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";
import { HolderPicker } from "@/components/admin/HolderPicker";
import { Tabs } from "@/components/admin/ui";
import { AuditTrail } from "@/components/admin/AuditTrail";

type Member = {
  id: string;
  rightHolderId: string | null;
  displayName: string;
  ipiNumber: string;
  memberId: string | null;
  memberNumber: string;
  role: string;
  sharePct: number;
  notes: string;
};
type Group = { id: string; name: string; code: string; kind: string; status: string; description: string; notes: string };

const KINDS = ["Group", "Band", "Ensemble", "Estate", "Publisher", "Other"];

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [err, setErr] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"main" | "audit">("main");

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/groups/${id}`, { cache: "no-store" });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? `Could not load this group (${r.status}).`);
      setGroup(b.group);
      setMembers(b.members);
      setDirty(false);
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load this group.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const setG = <K extends keyof Group>(k: K, v: Group[K]) => {
    setGroup((g) => (g ? { ...g, [k]: v } : g));
    setDirty(true);
  };
  const setM = (i: number, patch: Partial<Member>) => {
    setMembers((m) => m.map((x, j) => (j === i ? { ...x, ...patch } : x)));
    setDirty(true);
  };
  const shareTotal = members.reduce((s, m) => s + (Number(m.sharePct) || 0), 0);

  const save = async () => {
    if (!group) return;
    if (!group.name.trim()) return toast.error("The group needs a name.");
    if (shareTotal > 100.01) return toast.error("Member shares total more than 100%.");
    if (members.some((m) => !m.rightHolderId && !m.displayName.trim())) return toast.error("Every member needs a name or a right-holder.");
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: group.name,
          kind: group.kind,
          status: group.status,
          code: group.code,
          description: group.description,
          notes: group.notes,
          members: members.map((m) => ({ rightHolderId: m.rightHolderId, displayName: m.displayName, role: m.role, sharePct: m.sharePct, notes: m.notes })),
        }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? "Could not save.");
      toast.success("Group saved.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!group || !window.confirm(`Delete the group “${group.name}”? The right-holders in it are not deleted.`)) return;
    const r = await fetch(`/api/admin/groups/${id}`, { method: "DELETE" });
    if (!r.ok) return toast.error("Could not delete the group.");
    toast.success("Group deleted.");
    router.push("/admin/groups");
  };

  if (err)
    return (
      <div>
        <Link href="/admin/groups" className="mb-4 inline-flex items-center gap-1 text-sm text-zam-muted hover:text-zam-ink">
          <ArrowLeft size={14} /> Groups
        </Link>
        <p className="rounded-xl bg-zam-red/10 px-4 py-3 text-sm text-zam-red">
          {err}{" "}
          <button onClick={load} className="font-semibold underline">Retry</button>
        </p>
      </div>
    );
  if (!group)
    return (
      <div className="grid h-40 place-items-center">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-zam-line border-t-zam-orange" />
      </div>
    );

  return (
    <div className="pb-24">
      <Link href="/admin/groups" className="mb-3 inline-flex items-center gap-1 text-sm text-zam-muted hover:text-zam-ink">
        <ArrowLeft size={14} /> Groups
      </Link>
      <AdminHeader title={group.name || "Unnamed group"} subtitle={`${group.kind} · ${members.length} member${members.length === 1 ? "" : "s"}`} right={<StatusBadge status={group.status} />} />

      <Tabs
        className="mb-3"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "main", label: "Main" },
          { key: "audit", label: "Audit" },
        ]}
      />

      {tab === "audit" && (
        <Panel title="Changes to this group">
          <AuditTrail targetType="Group" targetId={id} />
        </Panel>
      )}

      {tab === "main" && (
      <div className="space-y-3">
        <Panel title="Group details" collapsible>
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-zam-muted">Name</span>
              <input value={group.name} onChange={(e) => setG("name", e.target.value)} className="field-input h-10 w-full" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-zam-muted">Type</span>
              <select value={group.kind} onChange={(e) => setG("kind", e.target.value)} className="field-input h-10 w-full appearance-none bg-white">
                {KINDS.map((k) => (<option key={k}>{k}</option>))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-zam-muted">Status</span>
              <select value={group.status} onChange={(e) => setG("status", e.target.value)} className="field-input h-10 w-full appearance-none bg-white">
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-zam-muted">Code</span>
              <input value={group.code} onChange={(e) => setG("code", e.target.value)} className="field-input h-10 w-full font-mono" />
            </label>
            <label className="block sm:col-span-2 lg:col-span-3">
              <span className="mb-1.5 block text-xs font-semibold text-zam-muted">Description</span>
              <input value={group.description} onChange={(e) => setG("description", e.target.value)} className="field-input h-10 w-full" />
            </label>
            <label className="block sm:col-span-2 lg:col-span-4">
              <span className="mb-1.5 block text-xs font-semibold text-zam-muted">Internal notes</span>
              <textarea rows={3} value={group.notes} onChange={(e) => setG("notes", e.target.value)} className="field-input w-full" />
            </label>
          </div>
        </Panel>

        <Panel title={`Members (${members.length})`} right={members.some((m) => m.sharePct) && <span className={`text-xs font-semibold ${shareTotal > 100.01 ? "text-zam-red" : "text-zam-muted"}`}>Shares {Math.round(shareTotal * 100) / 100}%</span>}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-zam-canvas">
                <tr>
                  <Th>Right-holder / name</Th>
                  <Th>Role</Th>
                  <Th className="text-right">Share %</Th>
                  <Th>Notes</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-zam-line">
                {members.map((m, i) => (
                  <tr key={m.id || i} className="align-top">
                    <Td className="w-[300px]">
                      <HolderPicker
                        value={m.rightHolderId || m.displayName ? { id: m.rightHolderId, name: m.displayName } : null}
                        onPick={(h) => setM(i, h ? { rightHolderId: h.id, displayName: h.displayName, ipiNumber: h.ipiNumber } : { rightHolderId: null, displayName: "", ipiNumber: "" })}
                        placeholder="Search register, or type a name below"
                      />
                      {!m.rightHolderId && (
                        <input value={m.displayName} onChange={(e) => setM(i, { displayName: e.target.value })} placeholder="Name (not on the register)" className="field-input mt-1 h-9 w-full" />
                      )}
                      {m.rightHolderId && (
                        <Link href={`/admin/register/${m.rightHolderId}`} className="mt-1 block text-[11px] text-zam-muted hover:text-zam-orange">
                          IPI {m.ipiNumber || "—"}{m.memberNumber ? ` · ${m.memberNumber}` : ""} · open record
                        </Link>
                      )}
                    </Td>
                    <Td><input value={m.role} onChange={(e) => setM(i, { role: e.target.value })} placeholder="e.g. Lead" className="field-input h-10 w-40" /></Td>
                    <Td className="text-right"><input type="number" min={0} max={100} step={0.01} value={m.sharePct} onChange={(e) => setM(i, { sharePct: e.target.value === "" ? 0 : Number(e.target.value) })} className="field-input h-10 w-24 text-right" /></Td>
                    <Td><input value={m.notes} onChange={(e) => setM(i, { notes: e.target.value })} className="field-input h-10 w-full" /></Td>
                    <Td>
                      <button type="button" onClick={() => { setMembers((x) => x.filter((_, j) => j !== i)); setDirty(true); }} aria-label="Remove member" className="mt-1 grid h-8 w-8 place-items-center rounded-lg text-zam-muted hover:bg-zam-red/10 hover:text-zam-red">
                        <Trash2 size={15} />
                      </button>
                    </Td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr><Td colSpan={5} className="py-8 text-center text-zam-muted">No members in this group yet.</Td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-zam-line px-5 py-3">
            <button type="button" onClick={() => { setMembers((x) => [...x, { id: "", rightHolderId: null, displayName: "", ipiNumber: "", memberId: null, memberNumber: "", role: "", sharePct: 0, notes: "" }]); setDirty(true); }} className="inline-flex items-center gap-1 text-sm font-semibold text-zam-orange">
              <Plus size={14} /> Add a member
            </button>
          </div>
        </Panel>

        <button onClick={remove} className="inline-flex items-center gap-1.5 rounded-xl bg-zam-red/10 px-3.5 py-2 text-sm font-semibold text-zam-red hover:bg-zam-red/20">
          <Trash2 size={15} /> Delete group
        </button>
      </div>
      )}

      <div className={`fixed inset-x-0 bottom-0 z-30 border-t border-zam-line bg-white/95 px-4 py-3 backdrop-blur transition-transform lg:left-[250px] ${dirty ? "translate-y-0" : "translate-y-full"}`}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <span className="text-sm text-zam-muted">You have unsaved changes.</span>
          <div className="flex gap-2">
            <button onClick={load} disabled={saving} className="h-10 rounded-xl bg-zam-canvas px-4 text-sm font-semibold text-zam-ink ring-1 ring-zam-line">Discard</button>
            <button onClick={save} disabled={saving} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-zam-orange px-5 text-sm font-semibold text-white disabled:opacity-50">
              <Save size={15} /> {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
