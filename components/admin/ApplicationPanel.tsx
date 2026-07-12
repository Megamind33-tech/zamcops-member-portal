"use client";

// Staff review of a member's official membership application: the submitted
// answers (rendered from the same form definition the member filled in), the
// staff-only "for official use" fields, and the decision actions — approve
// (counter-sign & issue the document set), reject, or re-issue documents.

import React, { useCallback, useEffect, useState } from "react";
import { Check, X, FileDown, RefreshCcw, Save, ScrollText } from "lucide-react";
import { Panel, StatusBadge } from "@/components/admin/widgets";
import { formatDate } from "@/lib/format";
import { FORM_DEFS, ADMIN_FIELDS, type ApplicationFormType } from "@/lib/applicationForms";
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

  const decide = async (action: "approve" | "reject" | "regenerate") => {
    let reason: string | undefined;
    if (action === "reject") {
      const answer = window.prompt("Why is this application being rejected? The member will see this explanation.", "");
      if (answer === null) return;
      reason = answer.trim();
    }
    if (action === "approve" && !window.confirm(
      `Approve this application as a ${membershipClass} member?\n\nThis counter-signs the Deed of Assignment, issues the official document set and activates the membership.`
    )) return;

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
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-brand-400" />
        </div>
      </Panel>
    );
  }

  if (!application) {
    return (
      <Panel title="Membership Application">
        <p className="px-5 py-6 text-sm text-night-400">
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
      right={<StatusBadge status={s} />}
    >
      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-night-300">
          {application.submittedAt && <span>Submitted {formatDate(application.submittedAt)}</span>}
          {application.deedAgreedAt && (
            <span className="inline-flex items-center gap-1.5">
              <ScrollText size={14} className="text-brand-200" /> Deed of Assignment executed{" "}
              {formatDate(application.deedAgreedAt)}
            </span>
          )}
          {application.membershipClass && <span>Class: {application.membershipClass.toUpperCase()}</span>}
          {application.rejectionReason && (
            <span className="text-red-300">Rejection reason: {application.rejectionReason}</span>
          )}
        </div>

        {/* Submitted answers, section by section */}
        <div className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
          {def.sections.map((section) => (
            <div key={section.id}>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-night-400">{section.title}</p>
              <div className="space-y-1">
                {(section.fields ?? []).map((f) => {
                  if (f.showIf && String(payload[f.showIf.key] ?? "") !== f.showIf.value) return null;
                  const v = payload[f.key];
                  const text = Array.isArray(v) ? v.join(", ") : String(v ?? "").trim();
                  return (
                    <div key={f.key} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-night-400">{f.label}</span>
                      <span className="text-right font-medium text-white">{text || "—"}</span>
                    </div>
                  );
                })}
                {section.repeat &&
                  (() => {
                    const rows = Array.isArray(payload[section.repeat!.key])
                      ? (payload[section.repeat!.key] as Record<string, string>[])
                      : [];
                    return rows.length === 0 ? (
                      <p className="text-sm text-night-400">None declared.</p>
                    ) : (
                      <div className="mt-1 space-y-1">
                        {rows.map((row, i) => (
                          <p key={i} className="text-sm text-white">
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
        <div className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-night-400">For official use only</p>
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-4 py-2 text-sm font-semibold text-night-300 transition hover:bg-white/[0.1] disabled:opacity-40"
            >
              <Save size={15} /> Save internal fields
            </button>
            {notice && <span className="text-xs font-semibold text-emerald-300">{notice}</span>}
          </div>
        </div>

        {/* Decision */}
        <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
          {s === "Submitted" && (
            <>
              <label className="flex items-center gap-2 text-sm text-night-300">
                Admit as
                <select
                  value={membershipClass}
                  onChange={(e) => setMembershipClass(e.target.value)}
                  className="field-input h-10 w-auto appearance-none bg-night-850 pr-8 [&>option]:bg-night-850 [&>option]:text-white"
                >
                  {MEMBERSHIP_CLASSES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                member
              </label>
              <button
                onClick={() => decide("approve")}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-400/15 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/25 disabled:opacity-40"
              >
                <Check size={15} /> Approve & issue documents
              </button>
              <button
                onClick={() => decide("reject")}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-400/15 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-400/25 disabled:opacity-40"
              >
                <X size={15} /> Reject
              </button>
              <p className="w-full text-xs text-night-400">
                Approving generates the completed application form, the Deed of Assignment (counter-signed by the Board
                Secretary) and the admission letter (signed by the General Manager), and makes them downloadable to the
                member. Both official signatures must be on file under Official Signatures.
              </p>
            </>
          )}
          {s === "Approved" && (
            <>
              <button
                onClick={() => decide("regenerate")}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-4 py-2 text-sm font-semibold text-night-300 transition hover:bg-white/[0.1] disabled:opacity-40"
              >
                <RefreshCcw size={15} /> Regenerate documents
              </button>
              <p className="text-xs text-night-400">
                Re-issues the document set with the current data and official signatures — the member&apos;s downloads
                are replaced.
              </p>
            </>
          )}
          {s === "Draft" && <p className="text-sm text-night-400">The member is still completing this application.</p>}
          {s === "Rejected" && (
            <p className="text-sm text-night-400">Rejected — the member can correct and resubmit it.</p>
          )}
          {error && <p className="w-full text-sm font-medium text-red-300">{error}</p>}
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
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-night-400 transition hover:bg-white/[0.1] hover:text-white"
      aria-label="Download document"
    >
      <FileDown size={15} />
    </a>
  );
}
