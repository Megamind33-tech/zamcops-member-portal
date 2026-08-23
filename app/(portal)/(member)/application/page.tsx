"use client";

// The official ZAMCOPS membership application — Individual / Group / Publisher —
// digitised field-for-field from the paper forms as a multi-step wizard with
// draft saving, signature capture and execution of the Deed of Assignment.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Save, CheckCircle2, Clock,
  AlertTriangle, PenLine, ScrollText, Send, Plus, Trash2, FileDown, User, Users, Building2,
} from "lucide-react";
import { PageHeader } from "../layout";
import { Card, CardHeader } from "@/components/zam/Card";
import { Button } from "@/components/zam/Button";
import { Field, Input, Select, Textarea } from "@/components/zam/Input";
import { SignaturePad } from "@/components/member/SignaturePad";
import { useApp } from "@/lib/store";
import { cn, formatDate } from "@/lib/format";
import {
  FORM_DEFS, FORM_TYPES, DECLARATION_TEXT, missingRequiredFields,
  type ApplicationFormType, type AppSection, type AppField,
} from "@/lib/applicationForms";
import { DEED_TITLE, DEED_RECITAL, DEED_CLAUSES } from "@/lib/deedText";
import type { MembershipApplication, Member } from "@/types";

type Payload = Record<string, unknown>;

const TYPE_META: Record<ApplicationFormType, { icon: React.ReactNode; blurb: string }> = {
  Individual: { icon: <User size={20} />, blurb: "Composers and authors of musical works who are not applying as a group." },
  Group: { icon: <Users size={20} />, blurb: "A group of composers and authors applying together, with a representative." },
  Publisher: { icon: <Building2 size={20} />, blurb: "An individual or company that publishes musical works." },
};

// Sensible starting answers taken from the member's account profile.
function prefill(formType: ApplicationFormType, m: Member): Payload {
  if (formType === "Individual") {
    const parts = m.fullName.trim().split(/\s+/);
    return {
      surname: parts.length > 1 ? parts[parts.length - 1] : "",
      firstName: parts.slice(0, Math.max(1, parts.length - 1)).join(" "),
      pseudonyms: m.stageName || "",
      sex: m.gender || "",
      dateOfBirth: m.dateOfBirth || "",
      nationality: "Zambian",
      placeOfBirth: "Zambia",
      passportNo: m.nrcOrPassport || "",
      resAddress: [m.address, m.district, m.province].filter(Boolean).join(", "),
      accountNumber: m.bankAccount || "",
      bankAddress: m.bankName || "",
      successorName: m.nextOfKinName || "",
    };
  }
  if (formType === "Group") {
    return {
      groupName: m.stageName || "",
      country: "Zambia",
      repName: m.fullName,
      passportOrIdNumber: m.nrcOrPassport || "",
      homeAddress: [m.address, m.district, m.province].filter(Boolean).join(", "),
      cell: m.phone,
      homeEmail: m.email,
      bankAccount: m.bankAccount || "",
    };
  }
  return {
    corporateName: m.stageName || m.fullName,
    country: "Zambia",
    headquartersAddress: [m.address, m.district, m.province].filter(Boolean).join(", "),
    cell: m.phone,
    hqEmail: m.email,
    bankAccount: m.bankAccount || "",
  };
}

export default function ApplicationPage() {
  const { currentMember, refresh } = useApp();
  const [application, setApplication] = useState<MembershipApplication | null>(null);
  const [signature, setSignature] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/member/application");
    if (res.ok) {
      const d = await res.json();
      setApplication(d.application);
      setSignature(d.signature || "");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !currentMember) {
    return (
      <div className="grid h-64 place-items-center">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-zam-line border-t-zam-orange" />
      </div>
    );
  }

  const status = application?.status;
  const showWizard = editing || !application || status === "Draft";

  return (
    <div>
      <PageHeader
        title="Membership Application"
        subtitle="The official ZAMCOPS application — complete it to have your membership reviewed and approved."
      />

      {!showWizard && status === "Submitted" && (
        <StatusCard
          icon={<Clock size={22} />}
          tone="amber"
          title="Application submitted — under review"
          body={`Your ${application!.formType.toLowerCase()} membership application was submitted on ${formatDate(
            application!.submittedAt!
          )}. ZAMCOPS staff are reviewing it; you'll be notified of the decision.`}
        />
      )}

      {!showWizard && status === "Approved" && (
        <StatusCard
          icon={<CheckCircle2 size={22} />}
          tone="green"
          title={`Membership approved${application?.membershipClass ? ` — ${application.membershipClass.toUpperCase()} member` : ""}`}
          body="Congratulations! Your signed application form, Deed of Assignment and admission letter are ready."
          action={
            <Link href="/documents">
              <Button icon={<FileDown size={16} />}>Go to My Documents</Button>
            </Link>
          }
        />
      )}

      {!showWizard && status === "Rejected" && (
        <StatusCard
          icon={<AlertTriangle size={22} />}
          tone="red"
          title="Application not approved"
          body={
            application!.rejectionReason
              ? `Reason: ${application!.rejectionReason}. You can correct your application and resubmit it.`
              : "You can correct your application and resubmit it."
          }
          action={<Button onClick={() => setEditing(true)}>Edit & resubmit</Button>}
        />
      )}

      {showWizard && (
        <Wizard
          member={currentMember}
          application={application}
          signature={signature}
          onSignatureSaved={setSignature}
          onDone={async () => {
            setEditing(false);
            await load();
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function StatusCard({
  icon, tone, title, body, action,
}: {
  icon: React.ReactNode;
  tone: "amber" | "green" | "red";
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  const tones = {
    amber: "border-zam-amber/40 bg-zam-amber/5 text-zam-amber",
    green: "border-zam-green/40 bg-zam-green/5 text-zam-green",
    red: "border-zam-red/40 bg-zam-red/5 text-zam-red",
  };
  return (
    <Card className={cn("flex flex-col gap-4 border p-6 sm:flex-row sm:items-center", tones[tone])}>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white shadow-sm">{icon}</span>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-lg font-bold text-zam-ink">{title}</h2>
        <p className="mt-1 text-sm text-zam-muted">{body}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </Card>
  );
}

function Wizard({
  member, application, signature, onSignatureSaved, onDone,
}: {
  member: Member;
  application: MembershipApplication | null;
  signature: string;
  onSignatureSaved: (img: string) => void;
  onDone: () => Promise<void>;
}) {
  const defaultType: ApplicationFormType =
    application?.formType ?? (member.role === "Publisher" ? "Publisher" : "Individual");
  const [formType, setFormType] = useState<ApplicationFormType>(defaultType);
  const [payload, setPayload] = useState<Payload>(
    () => (application?.payload as Payload) ?? prefill(defaultType, member)
  );
  const [step, setStep] = useState(0); // 0 = form type; 1..n = sections; then signature, deed, review
  const [deedAgreed, setDeedAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingSig, setSavingSig] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const def = FORM_DEFS[formType];
  const sectionCount = def.sections.length;
  const SIG = sectionCount + 1;
  const DEED = sectionCount + 2;
  const REVIEW = sectionCount + 3;
  const totalSteps = REVIEW + 1;

  const missing = useMemo(() => missingRequiredFields(def, payload), [def, payload]);
  const set = (key: string, value: unknown) => setPayload((p) => ({ ...p, [key]: value }));

  const pickType = (t: ApplicationFormType) => {
    if (t === formType) return;
    setFormType(t);
    setPayload((p) => ({ ...prefill(t, member), ...p }));
  };

  const saveDraft = async (silent = false) => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/member/application", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formType, payload }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not save your draft.");
      return false;
    }
    if (!silent) {
      setNotice("Draft saved.");
      setTimeout(() => setNotice(""), 2500);
    }
    return true;
  };

  const saveSignature = async (image: string) => {
    setSavingSig(true);
    const res = await fetch("/api/member/signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image }),
    });
    setSavingSig(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return { ok: false, error: d.error as string };
    }
    onSignatureSaved(image);
    return { ok: true };
  };

  const submit = async () => {
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/member/application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formType, payload, deedAgreed }),
    });
    setSubmitting(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setError(d.error || "Could not submit your application.");
    await onDone();
  };

  const next = async () => {
    if (step >= 1 && step <= sectionCount) await saveDraft(true);
    setStep((s) => Math.min(totalSteps - 1, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const back = () => {
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const stepLabel =
    step === 0
      ? "Application type"
      : step <= sectionCount
        ? def.sections[step - 1].title
        : step === SIG
          ? "Your signature"
          : step === DEED
            ? "Deed of Assignment"
            : "Review & submit";

  return (
    <div className="space-y-4">
      {/* Progress */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-zam-ink">
            Step {step + 1} of {totalSteps} — {stepLabel}
          </p>
          <div className="flex items-center gap-2">
            {notice && <span className="text-xs font-semibold text-zam-green">{notice}</span>}
            <Button variant="secondary" size="sm" icon={<Save size={14} />} loading={saving} onClick={() => saveDraft()}>
              Save draft
            </Button>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zam-canvas">
          <div
            className="h-full rounded-full bg-zam-orange transition-all"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </Card>

      {/* Step body */}
      {step === 0 && (
        <Card>
          <CardHeader
            title="Which application form applies to you?"
            description="This matches the official ZAMCOPS paper forms — pick the one for your situation."
          />
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            {FORM_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => pickType(t)}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition",
                  formType === t
                    ? "border-zam-orange bg-zam-orange-soft"
                    : "border-zam-line bg-white hover:border-zam-orange/40"
                )}
              >
                <span
                  className={cn(
                    "grid h-10 w-10 place-items-center rounded-xl",
                    formType === t ? "bg-zam-orange text-white" : "bg-zam-canvas text-zam-muted"
                  )}
                >
                  {TYPE_META[t].icon}
                </span>
                <span className="font-display text-sm font-bold text-zam-ink">{t} membership</span>
                <span className="text-xs text-zam-muted">{TYPE_META[t].blurb}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {step >= 1 && step <= sectionCount && (
        <SectionStep section={def.sections[step - 1]} payload={payload} set={set} />
      )}

      {step === SIG && (
        <Card>
          <CardHeader
            title="Your signature"
            description="Sign once — your signature is applied to the declaration on your application form and to the Deed of Assignment."
          />
          <div className="p-5">
            <SignaturePad value={signature} onSave={saveSignature} saving={savingSig} />
          </div>
        </Card>
      )}

      {step === DEED && (
        <DeedStep member={member} formType={formType} payload={payload} signature={signature} agreed={deedAgreed} setAgreed={setDeedAgreed} />
      )}

      {step === REVIEW && (
        <Card>
          <CardHeader title="Review & submit" description="Check that everything is in order, then submit for review." />
          <div className="space-y-3 p-5">
            <ChecklistRow ok={missing.length === 0} label="Required fields completed" detail={missing.length > 0 ? `Missing: ${missing.slice(0, 4).join("; ")}${missing.length > 4 ? "…" : ""}` : undefined} />
            <ChecklistRow ok={!!signature} label="Signature on file" detail={!signature ? "Add your signature in the previous step." : undefined} />
            <ChecklistRow ok={deedAgreed} label="Deed of Assignment executed" detail={!deedAgreed ? "Read and agree to the deed in the previous step." : undefined} />
            <div className="rounded-2xl bg-zam-canvas p-4 text-sm text-zam-muted">
              <p className="font-semibold text-zam-ink">Declaration</p>
              <p className="mt-1">{DECLARATION_TEXT}</p>
            </div>
            {error && <p className="text-sm font-medium text-zam-red">{error}</p>}
            <Button
              icon={<Send size={16} />}
              loading={submitting}
              disabled={missing.length > 0 || !signature || !deedAgreed}
              onClick={submit}
              className="w-full sm:w-auto"
            >
              Submit application
            </Button>
          </div>
        </Card>
      )}

      {error && step !== REVIEW && <p className="text-sm font-medium text-zam-red">{error}</p>}

      {/* Nav */}
      <div className="flex items-center justify-between">
        <Button variant="secondary" icon={<ChevronLeft size={16} />} onClick={back} disabled={step === 0}>
          Back
        </Button>
        {step < REVIEW && (
          <Button onClick={next}>
            Continue <ChevronRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}

function ChecklistRow({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full",
          ok ? "bg-zam-green/15 text-zam-green" : "bg-zam-amber/15 text-zam-amber"
        )}
      >
        {ok ? <CheckCircle2 size={15} /> : <Clock size={14} />}
      </span>
      <div>
        <p className="text-sm font-semibold text-zam-ink">{label}</p>
        {detail && <p className="text-xs text-zam-muted">{detail}</p>}
      </div>
    </div>
  );
}

function SectionStep({ section, payload, set }: { section: AppSection; payload: Payload; set: (k: string, v: unknown) => void }) {
  return (
    <Card>
      <CardHeader title={section.title} description={section.description} />
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        {(section.fields ?? []).map((f) => (
          <FieldControl key={f.key} field={f} payload={payload} set={set} />
        ))}
      </div>
      {section.repeat && <RepeatEditor repeat={section.repeat} payload={payload} set={set} />}
    </Card>
  );
}

function FieldControl({ field: f, payload, set }: { field: AppField; payload: Payload; set: (k: string, v: unknown) => void }) {
  if (f.showIf && String(payload[f.showIf.key] ?? "") !== f.showIf.value) return null;
  const value = payload[f.key];

  if (f.type === "textarea") {
    return (
      <Field label={f.label} hint={f.hint} required={f.required} className="sm:col-span-2">
        <Textarea value={String(value ?? "")} onChange={(e) => set(f.key, e.target.value)} rows={3} />
      </Field>
    );
  }
  if (f.type === "select") {
    return (
      <Field label={f.label} hint={f.hint} required={f.required}>
        <Select value={String(value ?? "")} onChange={(e) => set(f.key, e.target.value)}>
          <option value="">Select…</option>
          {(f.options ?? []).map((o) => (
            <option key={o}>{o}</option>
          ))}
        </Select>
      </Field>
    );
  }
  if (f.type === "yesno") {
    return (
      <Field label={f.label} hint={f.hint} required={f.required} className="sm:col-span-2">
        <div className="flex gap-2">
          {(f.options ?? ["Yes", "No"]).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => set(f.key, o)}
              className={cn(
                "h-10 rounded-xl border px-5 text-sm font-semibold transition",
                String(value ?? "") === o
                  ? "border-zam-orange bg-zam-orange-soft text-zam-orange-dark"
                  : "border-zam-line bg-white text-zam-muted hover:border-zam-orange/40"
              )}
            >
              {o}
            </button>
          ))}
        </div>
      </Field>
    );
  }
  if (f.type === "checkboxes") {
    const selected: string[] = Array.isArray(value) ? (value as string[]) : [];
    const toggle = (o: string) =>
      set(f.key, selected.includes(o) ? selected.filter((s) => s !== o) : [...selected, o]);
    return (
      <Field label={f.label} hint={f.hint} required={f.required} className="sm:col-span-2">
        <div className="flex flex-wrap gap-2">
          {(f.options ?? []).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              className={cn(
                "h-10 rounded-xl border px-5 text-sm font-semibold transition",
                selected.includes(o)
                  ? "border-zam-orange bg-zam-orange-soft text-zam-orange-dark"
                  : "border-zam-line bg-white text-zam-muted hover:border-zam-orange/40"
              )}
            >
              {o}
            </button>
          ))}
        </div>
      </Field>
    );
  }
  return (
    <Field label={f.label} hint={f.hint} required={f.required}>
      <Input
        type={f.type === "date" ? "date" : "text"}
        value={String(value ?? "")}
        onChange={(e) => set(f.key, e.target.value)}
      />
    </Field>
  );
}

function RepeatEditor({
  repeat, payload, set,
}: {
  repeat: NonNullable<AppSection["repeat"]>;
  payload: Payload;
  set: (k: string, v: unknown) => void;
}) {
  const rows: Record<string, string>[] = Array.isArray(payload[repeat.key])
    ? (payload[repeat.key] as Record<string, string>[])
    : [];
  const update = (i: number, col: string, v: string) => {
    const nextRows = rows.map((r, idx) => (idx === i ? { ...r, [col]: v } : r));
    set(repeat.key, nextRows);
  };
  const add = () => set(repeat.key, [...rows, Object.fromEntries(repeat.columns.map((c) => [c.key, ""]))]);
  const remove = (i: number) => set(repeat.key, rows.filter((_, idx) => idx !== i));

  return (
    <div className="border-t border-zam-line p-5">
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="grid flex-1 gap-2 sm:grid-cols-3">
              {repeat.columns.map((c) => (
                <Field key={c.key} label={i === 0 ? c.label : undefined}>
                  <Input value={row[c.key] ?? ""} onChange={(e) => update(i, c.key, e.target.value)} placeholder={c.label} />
                </Field>
              ))}
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-zam-line text-zam-muted hover:border-zam-red/40 hover:text-zam-red"
              aria-label="Remove row"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-zam-muted">Nothing added yet.</p>}
        <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={add}>
          {repeat.addLabel}
        </Button>
      </div>
    </div>
  );
}

function DeedStep({
  member, formType, payload, signature, agreed, setAgreed,
}: {
  member: Member;
  formType: ApplicationFormType;
  payload: Payload;
  signature: string;
  agreed: boolean;
  setAgreed: (v: boolean) => void;
}) {
  const p = payload as Record<string, string>;
  const assignor =
    formType === "Individual"
      ? [p.firstName, p.surname].filter(Boolean).join(" ") || member.fullName
      : formType === "Group"
        ? p.groupName || member.fullName
        : p.corporateName || member.fullName;
  const today = formatDate(new Date().toISOString());

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <ScrollText size={17} className="text-zam-orange" /> {DEED_TITLE} (incl. Mechanical)
          </span>
        }
        description="Read the deed carefully — by executing it you assign the performing, synchronising and mechanical rights in your works to ZAMCOPS to manage on your behalf."
      />
      <div className="p-5">
        <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-2xl border border-zam-line bg-zam-canvas/60 p-5 text-sm leading-relaxed text-zam-ink">
          {DEED_RECITAL.map((line, i) => {
            const text = line.replace("{{DATE}}", today).replace("{{ASSIGNOR}}", `${assignor} (${member.memberNumber})`);
            const emphasis = line.includes("{{ASSIGNOR}}") || line.startsWith("ZAMBIA");
            return (
              <p key={i} className={cn(emphasis && "font-bold")}>
                {text}
              </p>
            );
          })}
          {DEED_CLAUSES.map((c, i) => (
            <p key={`c${i}`} className={cn(c.indent && "pl-4")}>
              {c.heading && <strong>{c.heading} </strong>}
              {c.body}
            </p>
          ))}
        </div>

        {/* Execution preview */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-zam-line p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-zam-muted">Signed by or for and on behalf of the Assignor</p>
            {signature ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signature} alt="Your signature" className="mt-2 h-14 w-auto max-w-[220px] object-contain" />
            ) : (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-zam-amber">
                <PenLine size={14} /> Add your signature in the previous step.
              </p>
            )}
            <p className="mt-1 border-t border-zam-line pt-1.5 text-sm font-bold text-zam-ink">{assignor}</p>
            <p className="text-xs text-zam-muted">The Assignor · {today}</p>
          </div>
          <div className="rounded-2xl border border-dashed border-zam-line bg-zam-canvas/40 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-zam-muted">Signed for and on behalf of the Society</p>
            <p className="mt-3 text-sm text-zam-muted">
              Counter-signed by the <strong>Board Secretary</strong> when your membership is approved — your copy of the
              fully signed deed will appear under My Documents.
            </p>
          </div>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-zam-line p-4 hover:border-zam-orange/50">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-5 w-5 accent-[#F26C21]"
          />
          <span className="text-sm text-zam-ink">
            I, <strong>{assignor}</strong>, have read and understood this Deed of Assignment and execute it with the
            signature stored on my file, assigning the rights described above to ZAMCOPS for the duration of my
            membership.
          </span>
        </label>
      </div>
    </Card>
  );
}
