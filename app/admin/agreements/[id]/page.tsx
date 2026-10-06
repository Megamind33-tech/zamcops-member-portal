"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td } from "@/components/admin/widgets";
import { Tabs } from "@/components/admin/ui";
import { HolderPick } from "@/components/admin/HolderPick";
import { WorkPicker } from "@/components/admin/WorkPicker";
import { AGREEMENT_TYPES, AGREEMENT_STATUSES, SOURCE_TYPES, WORK_ASSOCIATIONS, rightTypesFor } from "@/lib/agreementFields";
import { CREATION_CLASSES } from "@/lib/poolConst";

type Comment = { at: string; by: string; text: string };
type W = { id: string; wipoId: string; title: string; iswc: string };
type Detail = { canManage: boolean; agreement: Record<string, unknown> & { id: string; active: boolean; comments: Comment[] }; covered: W[]; excluded: W[] };

const small = "field-input h-8 w-full";
const BLANK = {
  type: "General", creationClass: "", assignorId: null as string | null, assignorName: "", assigneeId: null as string | null, assigneeName: "", code: "", signatureDate: "", sourceType: "", sourceDetail: "",
  startDate: "", endDate: "", effectiveStart: "", effectiveEnd: "", rightTypes: [] as string[], territory: "", shareValue: "", workAssociation: "", status: "Valid",
};
type Form = typeof BLANK;

function Lbl({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-zam-muted">{t}</span>
      {children}
    </label>
  );
}

function WorkList({ id, rows, excluded, canManage, onChange }: { id: string; rows: W[]; excluded: boolean; canManage: boolean; onChange: () => void }) {
  const [sets, setSets] = useState<{ id: string; name: string }[]>([]);
  const [setId, setSetId] = useState("");
  useEffect(() => {
    fetch("/api/admin/work-sets", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => setSets(b.sets ?? []))
      .catch(() => {});
  }, []);

  const add = async (body: Record<string, unknown>) => {
    const r = await fetch(`/api/admin/agreements/${id}/works`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, excluded }) });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return toast.error(b.error ?? "Could not add.");
    toast.success(`${b.added} added${b.skipped ? `, ${b.skipped} already there` : ""}.`);
    onChange();
  };
  const remove = async (w: W) => {
    const r = await fetch(`/api/admin/agreements/${id}/works?workId=${w.id}${excluded ? "&excluded=1" : ""}`, { method: "DELETE" });
    if (!r.ok) return toast.error("Could not remove.");
    onChange();
  };

  return (
    <div>
      {canManage && (
        <div className="grid gap-3 border-b border-[#eceff3] p-3 sm:grid-cols-2">
          <Lbl t={excluded ? "Add Works to exclude" : "Add Work"}>
            <WorkPicker value={null} onPick={(w) => w && add({ workIds: [w.id] })} />
          </Lbl>
          {!excluded && (
            <Lbl t="Add Work Set">
              <div className="flex gap-2">
                <select value={setId} onChange={(e) => setSetId(e.target.value)} className={small + " appearance-none bg-white"}>
                  <option value=""></option>
                  {sets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button type="button" disabled={!setId} onClick={() => add({ workSetId: setId })} className="h-8 rounded-sm bg-[#286090] px-3 text-[13px] font-semibold text-white disabled:opacity-50">
                  Add
                </button>
              </div>
            </Lbl>
          )}
        </div>
      )}
      <table className="w-full">
        <thead>
          <tr>
            <Th>Main Id</Th>
            <Th>Title</Th>
            <Th>ISWC</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <Td colSpan={4} className="py-6 text-center text-zam-muted">
                No data available in table
              </Td>
            </tr>
          )}
          {rows.map((w) => (
            <tr key={w.id}>
              <Td className="font-mono text-xs">{w.wipoId}</Td>
              <Td>{w.title}</Td>
              <Td>{w.iswc}</Td>
              <Td className="text-right">
                {canManage && (
                  <button type="button" aria-label="Remove" onClick={() => remove(w)} className="text-zam-muted hover:text-zam-red">
                    <Trash2 size={14} />
                  </button>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// WIPO Connect agreement window: Main / Covered Works / Excluded Works.
export default function AgreementPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === "new";
  const [d, setD] = useState<Detail | null>(null);
  const [f, setF] = useState<Form>(BLANK);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<"main" | "covered" | "excluded">("main");
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");

  const load = useCallback(async () => {
    if (isNew) return;
    const r = await fetch(`/api/admin/agreements/${id}`, { cache: "no-store" });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return setErr(b.error ?? `Could not load (${r.status}).`);
    setD(b);
    const a = b.agreement;
    setF({
      type: a.type, creationClass: a.creationClass, assignorId: a.assignorId, assignorName: a.assignorName, assigneeId: a.assigneeId, assigneeName: a.assigneeName, code: a.code,
      signatureDate: a.signatureDate, sourceType: a.sourceType, sourceDetail: a.sourceDetail, startDate: a.startDate, endDate: a.endDate, effectiveStart: a.effectiveStart,
      effectiveEnd: a.effectiveEnd, rightTypes: a.rightTypes ?? [], territory: a.territory, shareValue: a.shareValue == null ? "" : String(a.shareValue), workAssociation: a.workAssociation, status: a.status,
    });
  }, [id, isNew]);
  useEffect(() => {
    load();
  }, [load]);

  const canManage = isNew || !!d?.canManage;
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const rt = rightTypesFor(f.creationClass);

  const save = async () => {
    setBusy(true);
    try {
      const r = await fetch(isNew ? "/api/admin/agreements" : `/api/admin/agreements/${id}`, { method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? "Could not save.");
      toast.success("Saved.");
      if (isNew) router.replace(`/admin/agreements/${b.id}`);
      else load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const addComment = async () => {
    const r = await fetch(`/api/admin/agreements/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comment }) });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return toast.error(b.error ?? "Could not add the comment.");
    setComment("");
    load();
  };

  const tabs: { key: "main" | "covered" | "excluded"; label: string; count?: number }[] = [{ key: "main", label: "Main" }];
  if (!isNew) {
    if (f.type !== "Specific Exclude") tabs.push({ key: "covered", label: "Covered Works", count: d?.covered.length });
    if (f.type !== "Specific Include") tabs.push({ key: "excluded", label: "Excluded Works", count: d?.excluded.length });
  }

  return (
    <div>
      <AdminHeader
        title={isNew ? "Add Agreement" : `Agreement ${f.code}`}
        subtitle={isNew ? "Agreements and Mandates" : d ? `${d.agreement.active ? "Active" : "Not active"} · ${f.status}` : ""}
        right={
          <Link href="/admin/agreements" className="inline-flex h-8 items-center rounded-sm bg-white px-3 text-[13px] font-semibold text-[#1f4e79] ring-1 ring-[#bfc5ce] hover:bg-[#eef3f8]">
            Back to list
          </Link>
        }
      />
      {err && <p className="mb-3 rounded-sm bg-zam-red/10 px-4 py-2 text-sm text-zam-red">{err}</p>}
      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-3" />

      {tab === "main" && (
        <div className="space-y-3">
          <Panel title="Agreement">
            <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
              <Lbl t="Agreement Type">
                <select value={f.type} onChange={set("type")} disabled={!isNew} className={small + " appearance-none bg-white"}>
                  {AGREEMENT_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Lbl>
              <Lbl t="Creation Class">
                <select value={f.creationClass} onChange={(e) => setF((x) => ({ ...x, creationClass: e.target.value, rightTypes: x.rightTypes.filter((r) => rightTypesFor(e.target.value).includes(r)) }))} disabled={!canManage} className={small + " appearance-none bg-white"}>
                  <option value=""></option>
                  {CREATION_CLASSES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Lbl>
              <Lbl t="Code">
                <input value={f.code} onChange={set("code")} disabled={!canManage} className={small} />
              </Lbl>
              <Lbl t="Assignor">
                <HolderPick value={{ id: f.assignorId, name: f.assignorName }} disabled={!canManage} onPick={(h) => setF((x) => ({ ...x, assignorId: h.id, assignorName: h.name }))} />
              </Lbl>
              <Lbl t="Assignee">
                <HolderPick value={{ id: f.assigneeId, name: f.assigneeName }} disabled={!canManage} onPick={(h) => setF((x) => ({ ...x, assigneeId: h.id, assigneeName: h.name }))} />
              </Lbl>
              <Lbl t="Status">
                <select value={f.status} onChange={set("status")} disabled={!canManage} className={small + " appearance-none bg-white"}>
                  {AGREEMENT_STATUSES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Lbl>
              <Lbl t="Signature Date">
                <input type="date" value={f.signatureDate} onChange={set("signatureDate")} disabled={!canManage} className={small} />
              </Lbl>
              <Lbl t="Source Type">
                <select value={f.sourceType} onChange={set("sourceType")} disabled={!canManage} className={small + " appearance-none bg-white"}>
                  <option value=""></option>
                  {SOURCE_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Lbl>
              <Lbl t="Source Detail">
                <input value={f.sourceDetail} onChange={set("sourceDetail")} disabled={!canManage} className={small} />
              </Lbl>
              <Lbl t="Start Date">
                <input type="date" value={f.startDate} onChange={set("startDate")} disabled={!canManage} className={small} />
              </Lbl>
              <Lbl t="End Date">
                <input type="date" value={f.endDate} onChange={set("endDate")} disabled={!canManage} className={small} />
              </Lbl>
              <div />
              <Lbl t="Effective Start Date">
                <input type="date" value={f.effectiveStart} onChange={set("effectiveStart")} disabled={!canManage} className={small} />
              </Lbl>
              <Lbl t="Effective End Date">
                <input type="date" value={f.effectiveEnd} onChange={set("effectiveEnd")} disabled={!canManage} className={small} />
              </Lbl>
              <div />
              <div>
                <span className="mb-1 block text-[11px] font-semibold text-zam-muted">Right Category</span>
                <div className="flex min-h-8 flex-wrap items-center gap-3 rounded-sm border border-[#d9dde3] px-2">
                  {rt.length === 0 && <span className="text-[12px] text-zam-muted">{f.creationClass ? "None for this creation class" : "Choose a creation class"}</span>}
                  {rt.map((r) => (
                    <label key={r} className="flex items-center gap-1.5 text-[13px]">
                      <input type="checkbox" disabled={!canManage} checked={f.rightTypes.includes(r)} onChange={(e) => setF((x) => ({ ...x, rightTypes: e.target.checked ? [...x.rightTypes, r] : x.rightTypes.filter((i) => i !== r) }))} />
                      {r}
                    </label>
                  ))}
                </div>
              </div>
              <Lbl t="Territory">
                <input value={f.territory} onChange={set("territory")} disabled={!canManage} placeholder="e.g. +2WL" className={small} />
              </Lbl>
              <Lbl t="Shares">
                <input value={f.shareValue} onChange={set("shareValue")} disabled={!canManage} inputMode="decimal" className={small} />
              </Lbl>
              {(f.type === "Specific Include" || f.type === "Specific Exclude") && (
                <Lbl t="Work Association">
                  <select value={f.workAssociation} onChange={set("workAssociation")} disabled={!canManage} className={small + " appearance-none bg-white"}>
                    <option value=""></option>
                    {WORK_ASSOCIATIONS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Lbl>
              )}
            </div>
            {canManage && (
              <div className="border-t border-[#eceff3] px-3 py-2">
                <button type="button" onClick={save} disabled={busy} className="h-8 rounded-sm bg-[#286090] px-4 text-[13px] font-semibold text-white hover:bg-[#204d76] disabled:opacity-60">
                  Save
                </button>
              </div>
            )}
          </Panel>

          {!isNew && d && (
            <Panel title="Comment(s)">
              <div className="space-y-2 p-3">
                {d.agreement.comments.length === 0 && <p className="text-[13px] text-zam-muted">No comments yet.</p>}
                {d.agreement.comments.map((c, i) => (
                  <p key={i} className="text-[13px]">
                    <span className="text-zam-muted">
                      {new Date(c.at).toLocaleString()} · {c.by}:
                    </span>{" "}
                    {c.text}
                  </p>
                ))}
                {canManage && (
                  <div className="flex gap-2">
                    <input value={comment} onChange={(e) => setComment(e.target.value)} className={small} />
                    <button type="button" onClick={addComment} disabled={!comment.trim()} className="h-8 rounded-sm bg-[#286090] px-3 text-[13px] font-semibold text-white disabled:opacity-50">
                      Add
                    </button>
                  </div>
                )}
              </div>
            </Panel>
          )}
        </div>
      )}

      {tab === "covered" && d && (
        <Panel title="Covered Works">
          {f.type === "General" || f.type === "Implied" ? <p className="border-b border-[#eceff3] px-3 py-2 text-[12px] text-zam-muted">This agreement applies to every work of creation class {f.creationClass}, except the works listed under Excluded Works.</p> : null}
          <WorkList id={id} rows={d.covered} excluded={false} canManage={canManage && f.type === "Specific Include"} onChange={load} />
        </Panel>
      )}
      {tab === "excluded" && d && (
        <Panel title="Excluded Works">
          <WorkList id={id} rows={d.excluded} excluded canManage={canManage && f.type !== "Specific Include"} onChange={load} />
        </Panel>
      )}
    </div>
  );
}
