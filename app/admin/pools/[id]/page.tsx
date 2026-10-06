"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Archive, ArrowLeft, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, StatusBadge } from "@/components/admin/widgets";
import { AuditTrail } from "@/components/admin/AuditTrail";
import { Tabs } from "@/components/admin/ui";
import { CREATION_CLASSES, POOL_METHODS, POOL_RIGHT_TYPES, RESERVE_TYPE_LIST } from "@/lib/poolConst";

type Method = { id: string; name: string; target: string };
type Form = {
  code: string;
  name: string;
  className: string;
  subClass: string;
  method: string;
  creationClass: string;
  rightType: string;
  adminFeePct: string;
  workRoles: string[];
  workMethodId: string;
  roMethodId: string;
  logSourceId: string;
  logMethodId: string;
  reallocateWithinWork: boolean;
  workShareTolerance: string;
  internationalRevenueStream: boolean;
  reserveType: string;
  notes: string;
  active: boolean;
};
const BLANK: Form = {
  code: "",
  name: "",
  className: "",
  subClass: "",
  method: "Work List",
  creationClass: "MW",
  rightType: "Performing",
  adminFeePct: "0",
  workRoles: [],
  workMethodId: "",
  roMethodId: "",
  logSourceId: "",
  logMethodId: "",
  reallocateWithinWork: true,
  workShareTolerance: "0",
  internationalRevenueStream: false,
  reserveType: "",
  notes: "",
  active: true,
};

const Lbl = ({ children, hint }: { children: React.ReactNode; hint?: string }) => (
  <span className="mb-1 block text-[11px] font-semibold text-zam-muted">
    {children}
    {hint && <span className="ml-1 font-normal text-zam-muted/80">{hint}</span>}
  </span>
);
const small = "field-input h-8 w-full";

const METHOD_HELP: Record<string, string> = {
  "Work List": "Shares the amount across a list of works (the works played). Fully supported.",
  "Log Based": "Shares the amount by the usage logs sent by the broadcaster: import a log on the pool link, match its lines to works in Pending Matches, then run the allocation.",
  "RO List": "Pays a fixed list of right-holders directly. Recorded on the pool.",
  Reserve: "Pays out of reserved money held from earlier runs. Recorded on the pool.",
  Analogy: "Shares by analogy with the results of another pool. Recorded on the pool.",
  CRD: "Collective rights distribution. Recorded on the pool.",
};

export default function PoolPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const router = useRouter();
  const [f, setF] = useState<Form>(BLANK);
  const [loaded, setLoaded] = useState(isNew);
  const [err, setErr] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [methods, setMethods] = useState<Method[]>([]);
  const [logSources, setLogSources] = useState<{ id: string; name: string }[]>([]);
  const [logMethods, setLogMethods] = useState<{ id: string; name: string }[]>([]);
  const [knownRoles, setKnownRoles] = useState<string[]>([]);
  const [links, setLinks] = useState(0);
  const [tab, setTab] = useState<"main" | "audit">("main");
  const [roleText, setRoleText] = useState("");

  const load = useCallback(async () => {
    try {
      const m = await fetch("/api/admin/allocation-methods", { cache: "no-store" }).then((r) => r.json());
      setMethods(m.methods ?? []);
      const [ls, lm] = await Promise.all([
        fetch("/api/admin/matching-settings/sources", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { rows: [] })),
        fetch("/api/admin/matching-settings/allocation-methods", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { rows: [] })),
      ]);
      setLogSources(ls.rows ?? []);
      setLogMethods(lm.rows ?? []);
      if (isNew) return;
      const r = await fetch(`/api/admin/pools/${id}`, { cache: "no-store" });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? `Could not load this pool (${r.status}).`);
      const p = b.pool;
      setF({
        code: p.code,
        name: p.name,
        className: p.className,
        subClass: p.subClass,
        method: p.method,
        creationClass: p.creationClass,
        rightType: p.rightType,
        adminFeePct: String(p.adminFeePct),
        workRoles: p.workRoles,
        workMethodId: p.workMethodId ?? "",
        roMethodId: p.roMethodId ?? "",
        logSourceId: p.logSourceId ?? "",
        logMethodId: p.logMethodId ?? "",
        reallocateWithinWork: p.reallocateWithinWork,
        workShareTolerance: String(p.workShareTolerance),
        internationalRevenueStream: p.internationalRevenueStream,
        reserveType: p.reserveType,
        notes: p.notes,
        active: p.active,
      });
      setKnownRoles(b.knownRoles ?? []);
      setLinks(p.links);
      setDirty(false);
      setLoaded(true);
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load this pool.");
    }
  }, [id, isNew]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setDirty(true);
  };

  const body = () => ({ ...f, workMethodId: f.workMethodId || null, roMethodId: f.roMethodId || null, logSourceId: f.logSourceId || null, logMethodId: f.logMethodId || null });

  const save = async () => {
    if (!f.code.trim()) return toast.error("Give the pool a code.");
    setSaving(true);
    try {
      const r = await fetch(isNew ? "/api/admin/pools" : `/api/admin/pools/${id}`, { method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body()) });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? "Could not save.");
      toast.success(isNew ? "Pool created." : "Pool saved.");
      setDirty(false);
      if (isNew) router.replace(`/admin/pools/${b.id}`);
      else await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    const r = await fetch(`/api/admin/pools/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !f.active }) });
    if (!r.ok) return toast.error("Could not change the status.");
    toast.success(f.active ? "Pool archived." : "Pool reopened.");
    await load();
  };

  const remove = async () => {
    if (!window.confirm(`Delete the pool ${f.code}?`)) return;
    const r = await fetch(`/api/admin/pools/${id}`, { method: "DELETE" });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return toast.error(b.error ?? "Could not delete the pool.");
    toast.success("Pool deleted.");
    router.push("/admin/pools");
  };

  const addRole = (code: string) => {
    const c = code.trim().toUpperCase();
    if (!c || f.workRoles.includes(c)) return;
    set("workRoles", [...f.workRoles, c]);
    setRoleText("");
  };

  if (err)
    return (
      <div>
        <Link href="/admin/pools" className="mb-4 inline-flex items-center gap-1 text-sm text-zam-muted hover:text-zam-ink">
          <ArrowLeft size={14} /> Distribution Pools
        </Link>
        <p className="rounded-sm bg-zam-red/10 px-4 py-3 text-sm text-zam-red">
          {err}{" "}
          <button onClick={load} className="font-semibold underline">
            Retry
          </button>
        </p>
      </div>
    );
  if (!loaded)
    return (
      <div className="grid h-40 place-items-center">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-zam-line border-t-zam-orange" />
      </div>
    );

  const workMethods = methods.filter((m) => m.target === "Work");
  const roMethods = methods.filter((m) => m.target === "Right owner");

  return (
    <div className="pb-24">
      <Link href="/admin/pools" className="mb-2 inline-flex items-center gap-1 text-xs text-zam-muted hover:text-zam-ink">
        <ArrowLeft size={13} /> Distribution Pools
      </Link>
      <AdminHeader
        title={isNew ? "New distribution pool" : f.code}
        subtitle={isNew ? "Set up a reusable pool" : [f.name, f.method, `${links} pool link${links === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
        right={!isNew && <StatusBadge status={f.active ? "Active" : "Paused"} />}
      />

      {!isNew && (
        <Tabs
          className="mb-3"
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "main", label: "Main" },
            { key: "audit", label: "Audit" },
          ]}
        />
      )}

      {tab === "audit" && !isNew && (
        <Panel title="Changes to this pool">
          <AuditTrail targetType="Pool" targetId={id} />
        </Panel>
      )}

      {tab === "main" && (
        <div className="space-y-3">
          <Panel title="General information" collapsible>
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <Lbl>Code</Lbl>
                <input value={f.code} onChange={(e) => set("code", e.target.value)} className={small + " font-mono"} placeholder="e.g. TV-WL-01" />
              </label>
              <label className="block sm:col-span-1 lg:col-span-3">
                <Lbl>Name</Lbl>
                <input value={f.name} onChange={(e) => set("name", e.target.value)} className={small} />
              </label>
              <label className="block">
                <Lbl>Distribution method</Lbl>
                <select value={f.method} onChange={(e) => set("method", e.target.value)} className={small + " appearance-none bg-white"}>
                  {POOL_METHODS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <Lbl>Creation class</Lbl>
                <select value={f.creationClass} onChange={(e) => set("creationClass", e.target.value)} className={small + " appearance-none bg-white"}>
                  {[...new Set([...CREATION_CLASSES, f.creationClass])].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <Lbl>Right type</Lbl>
                <select value={f.rightType} onChange={(e) => set("rightType", e.target.value)} className={small + " appearance-none bg-white"}>
                  {POOL_RIGHT_TYPES.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <Lbl hint="(domestic)">Admin fee %</Lbl>
                <input inputMode="decimal" value={f.adminFeePct} onChange={(e) => set("adminFeePct", e.target.value)} className={small + " text-right"} />
              </label>
              <label className="block">
                <Lbl>Class</Lbl>
                <input value={f.className} onChange={(e) => set("className", e.target.value)} list="pool-classes" className={small} placeholder="e.g. RADIO" />
                <datalist id="pool-classes">
                  {["RADIO", "TELEVISION", "CONCERT"].map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
              <label className="block">
                <Lbl>Sub class</Lbl>
                <input value={f.subClass} onChange={(e) => set("subClass", e.target.value)} className={small} placeholder="optional" />
              </label>
              <p className="text-xs text-zam-muted sm:col-span-2">{METHOD_HELP[f.method]}</p>
            </div>
          </Panel>

          <Panel title="How the money is shared" collapsible>
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block sm:col-span-2">
                <Lbl hint="(formula over the work's weight; empty = the weight as it is)">Work allocation method</Lbl>
                <select value={f.workMethodId} onChange={(e) => set("workMethodId", e.target.value)} className={small + " appearance-none bg-white"}>
                  <option value="">— weight as it is —</option>
                  {workMethods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <Lbl hint="(formula over each right-holder's share; empty = the share as it is)">Right owner allocation method</Lbl>
                <select value={f.roMethodId} onChange={(e) => set("roMethodId", e.target.value)} className={small + " appearance-none bg-white"}>
                  <option value="">— share as it is —</option>
                  {roMethods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              {f.method === "Log Based" && (
                <>
                  <label className="block sm:col-span-2">
                    <Lbl hint="(how log lines are read and matched — Matching Settings)">Log Source</Lbl>
                    <select value={f.logSourceId} onChange={(e) => set("logSourceId", e.target.value)} className={small + " appearance-none bg-white"}>
                      <option value=""></option>
                      {logSources.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block sm:col-span-2">
                    <Lbl hint="(formula over the log's Allocation column)">Log Allocation Method</Lbl>
                    <select value={f.logMethodId} onChange={(e) => set("logMethodId", e.target.value)} className={small + " appearance-none bg-white"}>
                      <option value=""></option>
                      {logMethods.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              <p className="text-xs text-zam-muted sm:col-span-4">
                Create methods under <Link href="/admin/allocation-methods" className="text-zam-orange underline">Allocation Methods</Link>.
              </p>

              <div className="sm:col-span-2 lg:col-span-4">
                <Lbl hint="(pay only these roles; leave empty to pay every role)">Work roles</Lbl>
                <div className="flex flex-wrap items-center gap-1.5">
                  {f.workRoles.map((r) => (
                    <button key={r} type="button" onClick={() => set("workRoles", f.workRoles.filter((x) => x !== r))} className="inline-flex items-center gap-1 rounded-sm bg-[#e6ebf1] px-2 py-1 font-mono text-xs font-semibold text-[#1f4e79] hover:bg-zam-red/10 hover:text-zam-red" title="Remove">
                      {r} ×
                    </button>
                  ))}
                  <input
                    value={roleText}
                    onChange={(e) => setRoleText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addRole(roleText);
                      }
                    }}
                    placeholder="Add a role code…"
                    className="field-input h-7 w-36 font-mono"
                    list="known-roles"
                  />
                  <datalist id="known-roles">
                    {knownRoles.map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                  <button type="button" onClick={() => addRole(roleText)} className="h-7 rounded-sm bg-white px-2.5 text-xs font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce]">
                    Add
                  </button>
                </div>
              </div>

              <label className="block">
                <Lbl hint="(% either side of 100)">Work share tolerance</Lbl>
                <input inputMode="decimal" value={f.workShareTolerance} onChange={(e) => set("workShareTolerance", e.target.value)} className={small + " text-right"} />
              </label>
              <label className="flex items-center gap-2 pt-5 text-[13px] sm:col-span-2">
                <input type="checkbox" checked={f.reallocateWithinWork} onChange={(e) => set("reallocateWithinWork", e.target.checked)} className="h-4 w-4" />
                <span>
                  <b>Reallocate within the work</b>
                  <span className="block text-xs text-zam-muted">If a work&apos;s shares don&apos;t total 100%, share its whole part among them. Off: pay only what is declared and reserve the rest.</span>
                </span>
              </label>
              <label className="block">
                <Lbl>Reserve type</Lbl>
                <select value={f.reserveType} onChange={(e) => set("reserveType", e.target.value)} className={small + " appearance-none bg-white"}>
                  <option value="">—</option>
                  {RESERVE_TYPE_LIST.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-[13px] sm:col-span-2">
                <input type="checkbox" checked={f.internationalRevenueStream} onChange={(e) => set("internationalRevenueStream", e.target.checked)} className="h-4 w-4" />
                <span>
                  <b>International revenue stream</b>
                  <span className="block text-xs text-zam-muted">Foreign right-holders pay the international revenue admin fee instead of the international admin fee.</span>
                </span>
              </label>
              <label className="block sm:col-span-2 lg:col-span-4">
                <Lbl>Comment</Lbl>
                <textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} className="field-input w-full" />
              </label>
            </div>
          </Panel>

          {!isNew && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={archive} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-white px-3 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8]">
                <Archive size={13} /> {f.active ? "Archive" : "Reopen"}
              </button>
              <button type="button" onClick={remove} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-zam-red/10 px-3 text-[13px] font-semibold text-zam-red hover:bg-zam-red/20">
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        </div>
      )}

      <div className={`fixed inset-x-0 bottom-0 z-30 border-t border-[#d9dde3] bg-white px-4 py-2.5 transition-transform lg:left-[250px] ${dirty || isNew ? "translate-y-0" : "translate-y-full"}`}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <span className="text-sm text-zam-muted">{isNew ? "Fill in the pool and save it." : "You have unsaved changes."}</span>
          <div className="flex gap-2">
            {!isNew && (
              <button onClick={load} disabled={saving} className="h-8 rounded-sm bg-zam-canvas px-4 text-[13px] font-semibold ring-1 ring-zam-line">
                Discard
              </button>
            )}
            <button onClick={save} disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-zam-orange px-5 text-[13px] font-semibold text-white disabled:opacity-50">
              <Save size={13} /> {saving ? "Saving…" : isNew ? "Create pool" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
