"use client";

// Staff review of a member's official membership application: the submitted
// answers (rendered from the same form definition the member filled in), the
// staff-only "for official use" fields, and the decision actions — approve
// (counter-sign & issue the document set), reject, or re-issue documents.

import React, { useCallback, useEffect, useState } from "react";
import { X, FileDown, RefreshCcw, Save, ScrollText, Pencil, Plus, Trash2 } from "lucide-react";
import { Panel, StatusBadge } from "@/components/admin/widgets";
import { formatDate } from "@/lib/format";
import { FORM_DEFS, ADMIN_FIELDS, type ApplicationFormType, type ApplicationFormDef } from "@/lib/applicationForms";
import type { MembershipApplication } from "@/types";

const MEMBERSHIP_CLASSES = ["CANDIDATE", "ASSOCIATE", "FULL"];

async function postJSON(url: string, body: unknown, method = "POST") {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export function ApplicationPanel({ ownerId, onDecided }: { ownerId: string; onDecided: () => Promise<void> }) {
  const [application, setApplication] = useState<MembershipApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminFields, setAdminFields] = useState<Record<string, string>>({});
  const [membershipClass, setMembershipClass] = useState("CANDIDATE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/applications?ownerId=${ownerId}`);
    if (res.ok) {
      const d = await res.json();
      const app = (d.applications as MembershipApplication[])[0] ?? null;
      setApplication(app);
      if (app) {
        setAdminFields({ ...app.adminFields });
        setMembershipClass(app.membershipClass || "CANDIDATE");
      }
    }
    setLoading(false);
  }, [ownerId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveAdminFields = async () => {
    setBusy(true);
    setError("");
    const { res, data } = await postJSON("/api/admin/applications", { ownerId, adminFields }, "PATCH");
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not save.");
    setNotice("Internal fields saved.");
    setTimeout(() => setNotice(""), 2500);
  };

  const startEditing = () => {
    if (!application) return;
    setAnswers(JSON.parse(JSON.stringify(application.payload ?? {})));
    setEditing(true);
    setError("");
  };

  const saveAnswers = async () => {
    setBusy(true);
    setError("");
    const { res, data } = await postJSON("/api/admin/applications", { ownerId, payload: answers }, "PATCH");
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not save the answers.");
    setEditing(false);
    setNotice("Answers saved.");
    setTimeout(() => setNotice(""), 2500);
    await load();
    await onDecided();
  };

  const decide = async (action: "reject" | "regenerate") => {
    let reason: string | undefined;
    if (action === "reject") {
      const answer = window.prompt("Why is this application being rejected? The member will see this explanation.", "");
      if (answer === null) return;
      reason = answer.trim();
    }

    setBusy(true);
    setError("");
    // Save any pending internal fields first so they print on the generated form.
    await postJSON("/api/admin/applications", { ownerId, adminFields }, "PATCH");
    const { res, data } = await postJSON("/api/admin/applications", { ownerId, action, membershipClass, reason });
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not complete the action.");
    await load();
    await onDecided();
  };

  if (loading) {
    return (
      <Panel title="Membership Application">
        <div className="grid h-24 place-items-center">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-zam-line border-t-zam-orange" />
        </div>
      </Panel>
    );
  }

  if (!application) {
    return (
      <Panel title="Membership Application">
        <p className="px-5 py-6 text-sm text-zam-muted">
          This member has not completed the official membership application yet. They fill it in under
          &ldquo;Membership&rdquo; in the member app; it appears here once submitted.
        </p>
      </Panel>
    );
  }

  const def = FORM_DEFS[application.formType as ApplicationFormType];
  const payload = application.payload as Record<string, unknown>;
  const s = application.status;

  return (
    <Panel
      title={`Membership Application — ${application.formType}`}
      right={
        <div className="flex items-center gap-2">
          {!editing && (
            <button
              onClick={startEditing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zam-canvas px-2.5 py-1.5 text-xs font-semibold text-zam-ink ring-1 ring-zam-line transition hover:bg-zam-line/50"
            >
              <Pencil size={13} /> Edit answers
            </button>
          )}
          <StatusBadge status={s} />
        </div>
      }
    >
      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-zam-muted">
          {application.submittedAt && <span>Submitted {formatDate(application.submittedAt)}</span>}
          {application.deedAgreedAt && (
            <span className="inline-flex items-center gap-1.5">
              <ScrollText size={14} className="text-zam-blue" /> Deed of Assignment executed{" "}
              {formatDate(application.deedAgreedAt)}
            </span>
          )}
          {application.membershipClass && <span>Class: {application.membershipClass.toUpperCase()}</span>}
          {application.rejectionReason && (
            <span className="text-zam-red">Rejection reason: {application.rejectionReason}</span>
          )}
        </div>

        {editing && (
          <AnswerEditor
            def={def}
            answers={answers}
            setAnswers={setAnswers}
            busy={busy}
            onSave={saveAnswers}
            onCancel={() => setEditing(false)}
          />
        )}

        {/* Submitted answers, section by section */}
        <div className={editing ? "hidden" : "grid gap-x-8 gap-y-4 lg:grid-cols-2"}>
          {def.sections.map((section) => (
            <div key={section.id}>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-zam-muted">{section.title}</p>
              <div className="space-y-1">
                {(section.fields ?? []).map((f) => {
                  if (f.showIf && String(payload[f.showIf.key] ?? "") !== f.showIf.value) return null;
                  const v = payload[f.key];
                  const text = Array.isArray(v) ? v.join(", ") : String(v ?? "").trim();
                  return (
                    <div key={f.key} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-zam-muted">{f.label}</span>
                      <span className="text-right font-medium text-zam-ink">{text || "—"}</span>
                    </div>
                  );
                })}
                {section.repeat &&
                  (() => {
                    const rows = Array.isArray(payload[section.repeat!.key])
                      ? (payload[section.repeat!.key] as Record<string, string>[])
                      : [];
                    return rows.length === 0 ? (
                      <p className="text-sm text-zam-muted">None declared.</p>
                    ) : (
                      <div className="mt-1 space-y-1">
                        {rows.map((row, i) => (
                          <p key={i} className="text-sm text-zam-ink">
                            {section.repeat!.columns.map((c) => row[c.key]).filter(Boolean).join(" · ") || "—"}
                          </p>
                        ))}
                      </div>
                    );
                  })()}
              </div>
            </div>
          ))}
        </div>

        {/* For official use only */}
        <div className="rounded-2xl bg-zam-canvas p-4 ring-1 ring-zam-line">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-zam-muted">For official use only</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ADMIN_FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="field-label">{f.label}</span>
                <input
                  type={f.type === "date" ? "date" : "text"}
                  value={adminFields[f.key] ?? ""}
                  onChange={(e) => setAdminFields((a) => ({ ...a, [f.key]: e.target.value }))}
                  className="field-input"
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={saveAdminFields}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zam-canvas px-4 py-2 text-sm font-semibold text-zam-muted transition hover:bg-zam-canvas disabled:opacity-40"
            >
              <Save size={15} /> Save internal fields
            </button>
            {notice && <span className="text-xs font-semibold text-zam-green">{notice}</span>}
          </div>
        </div>

        {/* Decision */}
        <div className="flex flex-wrap items-center gap-3 border-t border-zam-line pt-4">
          {s === "Submitted" && (
            <>
              <label className="flex items-center gap-2 text-sm text-zam-muted">
                Admit as
                <select
                  value={membershipClass}
                  onChange={(e) => setMembershipClass(e.target.value)}
                  className="field-input h-10 w-auto appearance-none bg-white pr-8 [&>option]:bg-white [&>option]:text-zam-ink"
                >
                  {MEMBERSHIP_CLASSES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                member
              </label>
              <button
                onClick={() => decide("reject")}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-400/15 px-4 py-2 text-sm font-semibold text-zam-red transition hover:bg-red-400/25 disabled:opacity-40"
              >
                <X size={15} /> Reject
              </button>
              <p className="w-full text-xs text-zam-muted">
                There is no approval to give here. The applicant is admitted when the society accepts their first work,
                so approving a submission under <strong className="font-semibold text-zam-ink">Work Declarations</strong>{" "}
                is what approves this application — and it issues the completed application form, the Deed of Assignment
                counter-signed by the Board Secretary, the admission letter signed by the General Manager, and the
                clearance letter for that submission. Both official signatures must be on file first. The class
                chosen above is the one the admission letter will carry.
              </p>
            </>
          )}
          {s === "Approved" && (
            <>
              <button
                onClick={() => decide("regenerate")}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-zam-canvas px-4 py-2 text-sm font-semibold text-zam-muted transition hover:bg-zam-canvas disabled:opacity-40"
              >
                <RefreshCcw size={15} /> Regenerate documents
              </button>
              <p className="text-xs text-zam-muted">
                Re-issues the document set with the current data and official signatures — the member&apos;s downloads
                are replaced.
              </p>
            </>
          )}
          {s === "Draft" && <p className="text-sm text-zam-muted">The member is still completing this application.</p>}
          {s === "Rejected" && (
            <p className="text-sm text-zam-muted">Rejected — the member can correct and resubmit it.</p>
          )}
          {error && <p className="w-full text-sm font-medium text-zam-red">{error}</p>}
        </div>
      </div>
    </Panel>
  );
}

// Compact download link staff can use to open a stored document.
export function AdminDocDownload({ id, hasFile }: { id: string; hasFile?: boolean }) {
  if (!hasFile) return null;
  return (
    <a
      href={`/api/admin/member-documents/${id}`}
      target="_blank"
      rel="noreferrer"
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zam-muted transition hover:bg-zam-canvas hover:text-zam-ink"
      aria-label="Download document"
    >
      <FileDown size={15} />
    </a>
  );
}

// Edits every answer the form defines — text, choices and repeating tables such
// as a group's member list — from the same definition the applicant filled in.
function AnswerEditor({
  def,
  answers,
  setAnswers,
  busy,
  onSave,
  onCancel,
}: {
  def: ApplicationFormDef;
  answers: Record<string, unknown>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  busy: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = (k: string, v: unknown) => setAnswers((a) => ({ ...a, [k]: v }));
  return (
    <div className="space-y-5 rounded-2xl bg-white p-4 ring-1 ring-zam-orange/40">
      {def.sections.map((section) => (
        <div key={section.id}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-zam-muted">{section.title}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(section.fields ?? []).map((f) => {
              if (f.showIf && String(answers[f.showIf.key] ?? "") !== f.showIf.value) return null;
              const v = answers[f.key];
              const common = "field-input w-full";
              return (
                <label key={f.key} className={f.type === "textarea" ? "block sm:col-span-2" : "block"}>
                  <span className="field-label">{f.label}</span>
                  {f.type === "textarea" ? (
                    <textarea rows={3} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} className={common} />
                  ) : f.type === "select" || f.type === "yesno" ? (
                    <select value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} className={common + " h-10 appearance-none bg-white"}>
                      <option value="" />
                      {(f.type === "yesno" ? ["Yes", "No"] : f.options ?? []).map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : f.type === "checkboxes" ? (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                      {(f.options ?? []).map((o) => {
                        const cur = Array.isArray(v) ? (v as string[]) : [];
                        return (
                          <label key={o} className="flex items-center gap-1.5 text-sm">
                            <input
                              type="checkbox"
                              checked={cur.includes(o)}
                              onChange={(e) => set(f.key, e.target.checked ? [...cur, o] : cur.filter((x) => x !== o))}
                            />
                            {o}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <input type={f.type === "date" ? "date" : "text"} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} className={common + " h-10"} />
                  )}
                </label>
              );
            })}
          </div>
          {section.repeat && (
            <div className="mt-2 space-y-2">
              {(Array.isArray(answers[section.repeat.key]) ? (answers[section.repeat.key] as Record<string, string>[]) : []).map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  {section.repeat!.columns.map((c) => (
                    <input
                      key={c.key}
                      value={row[c.key] ?? ""}
                      placeholder={c.label}
                      onChange={(e) =>
                        set(
                          section.repeat!.key,
                          (answers[section.repeat!.key] as Record<string, string>[]).map((r, j) => (j === i ? { ...r, [c.key]: e.target.value } : r)),
                        )
                      }
                      className="field-input h-10 min-w-0 flex-1"
                    />
                  ))}
                  <button
                    type="button"
                    aria-label="Remove row"
                    onClick={() => set(section.repeat!.key, (answers[section.repeat!.key] as Record<string, string>[]).filter((_, j) => j !== i))}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-zam-muted hover:bg-zam-red/10 hover:text-zam-red"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  set(section.repeat!.key, [
                    ...(Array.isArray(answers[section.repeat!.key]) ? (answers[section.repeat!.key] as Record<string, string>[]) : []),
                    Object.fromEntries(section.repeat!.columns.map((c) => [c.key, ""])),
                  ])
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-zam-orange"
              >
                <Plus size={13} /> {section.repeat.addLabel}
              </button>
            </div>
          )}
        </div>
      ))}
      <div className="flex items-center gap-2 border-t border-zam-line pt-3">
        <button onClick={onSave} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-zam-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          <Save size={15} /> {busy ? "Saving…" : "Save answers"}
        </button>
        <button onClick={onCancel} disabled={busy} className="rounded-xl bg-zam-canvas px-4 py-2 text-sm font-semibold text-zam-ink ring-1 ring-zam-line">
          Cancel
        </button>
      </div>
    </div>
  );
}
