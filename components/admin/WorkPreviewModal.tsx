"use client";

// The admin-side preview of a single work declaration — opened from the works
// review table so staff can see everything about the submission in one place
// and complete the office's own boxes on it: the distribution key (a
// contributor's confirmed share) and the file number / factor assigned once a
// work reaches the register. Those boxes only ever print on the office's copy
// of the declaration (see lib/officialForms/workDeclaration.ts), which is what
// "Download declaration" here renders.
//
// This intentionally does not touch a contributor's identity evidence (NRC,
// affirmation letter) — that was settled when the member declared the work.
// Editing a share here corrects a figure on an already-accepted contributor,
// not admits a new, unverified one, so the member-facing lookup/upload flow in
// components/zam/SplitsEditor.tsx is not reused.

import React, { useEffect, useState } from "react";
import { X, Plus, Trash2, CheckCircle2, AlertTriangle, Download, Save } from "lucide-react";
import { Field, Input, Select } from "@/components/zam/Input";
import { Progress } from "@/components/zam/Misc";
import { StatusBadge } from "@/components/admin/widgets";
import { CONTRIBUTOR_ROLES, normalizeContributorRole } from "@/lib/roles";
import { shareOf, splitsTotal, splitsTotalOk } from "@/lib/works";
import { formatDate, uid } from "@/lib/format";
import type { OwnershipSplit, WorkDeclaration } from "@/types";

export function WorkPreviewModal({
  work,
  ownerName,
  onClose,
  onSave,
}: {
  work: WorkDeclaration;
  ownerName: string;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [splits, setSplits] = useState<OwnershipSplit[]>(work.ownershipSplits);
  const [fields, setFields] = useState({
    title: work.title ?? "",
    alternativeTitle: work.alternativeTitle ?? "",
    workType: work.workType ?? "Song",
    genre: work.genre ?? "",
    language: work.language ?? "",
    duration: work.duration ?? "",
    yearComposed: work.yearComposed ?? "",
    isrc: work.isrc ?? "",
    iswc: work.iswc ?? "",
    soundCarrier: work.soundCarrier ?? "",
    instruments: work.instruments ?? "",
    publisher: work.publisher ?? "",
    publisherIpi: work.publisherIpi ?? "",
  });
  const setField = (k: keyof typeof fields, v: string) => {
    setFields((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };
  const [fileNo, setFileNo] = useState(work.fileNo ?? "");
  const [factor, setFactor] = useState(work.factor ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  const perfTotal = splitsTotal(splits, "performancePct");
  const recTotal = splitsTotal(splits, "recordingPct");
  const valid = splitsTotalOk(splits);
  const ok100 = (n: number) => Math.abs(n - 100) < 0.51;

  const mark = () => setDirty(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const update = (i: number, patch: Partial<OwnershipSplit>) => {
    setSplits((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
    mark();
  };
  const add = () => {
    setSplits((prev) => [...prev, { id: uid("split"), party: "", role: "Composer", performancePct: 0, recordingPct: 0 }]);
    mark();
  };
  const remove = (i: number) => {
    setSplits((prev) => prev.filter((_, idx) => idx !== i));
    mark();
  };

  const save = async () => {
    setError("");
    if (!fields.title.trim()) return setError("The work needs a title.");
    if (splits.some((s) => !s.party.trim())) return setError("Every creator needs a name.");
    if (!valid) return setError("Both the performance and recording columns must total 100% before saving.");
    setBusy(true);
    const res = await onSave({ ...fields, ownershipSplits: splits, fileNo, factor });
    setBusy(false);
    if (!res.ok) return setError(res.error || "Could not save.");
    setDirty(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zam-ink/50 p-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zam-line px-6 py-4">
          <div className="min-w-0">
            <p className="truncate font-display text-base font-bold text-zam-ink">{work.title}</p>
            <p className="mt-0.5 text-xs text-zam-muted">
              {ownerName} · {work.workType} · {work.genre || "—"} · Submitted {formatDate(work.submittedAt)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge status={work.status} />
            <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-zam-muted hover:bg-zam-canvas hover:text-zam-ink">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Title" className="sm:col-span-2">
              <Input value={fields.title} onChange={(e) => setField("title", e.target.value)} />
            </Field>
            <Field label="Alternative title">
              <Input value={fields.alternativeTitle} onChange={(e) => setField("alternativeTitle", e.target.value)} />
            </Field>
            <Field label="Type">
              <Select value={fields.workType} onChange={(e) => setField("workType", e.target.value)}>
                {["Song", "Instrumental", "Arrangement"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="Genre">
              <Input value={fields.genre} onChange={(e) => setField("genre", e.target.value)} />
            </Field>
            <Field label="Language">
              <Input value={fields.language} onChange={(e) => setField("language", e.target.value)} />
            </Field>
            <Field label="Duration">
              <Input value={fields.duration} onChange={(e) => setField("duration", e.target.value)} placeholder="mm:ss" />
            </Field>
            <Field label="Year composed">
              <Input value={fields.yearComposed} onChange={(e) => setField("yearComposed", e.target.value)} />
            </Field>
            <Field label="ISRC">
              <Input value={fields.isrc} onChange={(e) => setField("isrc", e.target.value)} />
            </Field>
            <Field label="ISWC">
              <Input value={fields.iswc} onChange={(e) => setField("iswc", e.target.value)} />
            </Field>
            <Field label="Sound carrier">
              <Input value={fields.soundCarrier} onChange={(e) => setField("soundCarrier", e.target.value)} />
            </Field>
            <Field label="Instruments">
              <Input value={fields.instruments} onChange={(e) => setField("instruments", e.target.value)} />
            </Field>
            <Field label="Publisher">
              <Input value={fields.publisher} onChange={(e) => setField("publisher", e.target.value)} />
            </Field>
            <Field label="Publisher IPI">
              <Input value={fields.publisherIpi} onChange={(e) => setField("publisherIpi", e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="File number" hint="Assigned once entered on the register">
              <Input value={fileNo} onChange={(e) => { setFileNo(e.target.value); mark(); }} placeholder="e.g. 2026/0431" />
            </Field>
            <Field label="Factor">
              <Input value={factor} onChange={(e) => { setFactor(e.target.value); mark(); }} placeholder="e.g. 1.0" />
            </Field>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-zam-ink">Distribution key</p>
            <div className="space-y-3">
              {splits.map((s, i) => {
                const role = normalizeContributorRole(String(s.role || "Composer"));
                return (
                  <div key={s.id || i} className="grid grid-cols-12 items-center gap-2 rounded-xl border border-zam-line bg-zam-canvas/60 p-2.5">
                    <Input
                      className="col-span-5"
                      placeholder="Creator name"
                      value={s.party}
                      onChange={(e) => update(i, { party: e.target.value })}
                    />
                    <Select
                      className="col-span-4"
                      value={role}
                      onChange={(e) => update(i, { role: normalizeContributorRole(e.target.value) })}
                    >
                      {CONTRIBUTOR_ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </Select>
                    <div className="relative col-span-1">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        className="pr-5 text-right"
                        aria-label="Performance share"
                        title="Performance / broadcast share"
                        value={shareOf(s, "performancePct")}
                        onChange={(e) => update(i, { performancePct: Number(e.target.value) })}
                      />
                      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-zam-muted">%</span>
                    </div>
                    <div className="relative col-span-1">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        className="pr-5 text-right"
                        aria-label="Recording share"
                        title="Recording / mechanical share"
                        value={shareOf(s, "recordingPct")}
                        onChange={(e) => update(i, { recordingPct: Number(e.target.value) })}
                      />
                      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-zam-muted">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      aria-label="Remove creator"
                      className="col-span-1 grid h-9 place-items-center rounded-lg text-zam-muted hover:bg-red-50 hover:text-zam-red"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={add}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-zam-orange hover:bg-zam-orange-soft"
            >
              <Plus size={14} /> Add a creator
            </button>

            <div className={`mt-3 rounded-xl border p-3 ${valid ? "border-zam-green/30 bg-zam-green-soft" : "border-zam-amber/40 bg-zam-amber-soft"}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${valid ? "text-zam-green" : "text-[#B8791A]"}`}>
                  {valid ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  {valid ? "Both columns total 100%" : "Each column must total 100%"}
                </span>
                <span className="flex items-center gap-3 text-xs font-bold">
                  <span className={ok100(perfTotal) ? "text-zam-green" : "text-[#B8791A]"}>
                    Perf {Math.round(perfTotal * 100) / 100}%
                  </span>
                  <span className={ok100(recTotal) ? "text-zam-green" : "text-[#B8791A]"}>
                    Rec {Math.round(recTotal * 100) / 100}%
                  </span>
                </span>
              </div>
              <Progress value={perfTotal} tone={ok100(perfTotal) ? "green" : "orange"} className="mb-1.5" />
              <Progress value={recTotal} tone={ok100(recTotal) ? "green" : "orange"} />
            </div>
          </div>

          {error && <p className="text-sm font-medium text-zam-red">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-zam-line px-6 py-4">
          <a
            href={`/api/admin/works/${work.id}/declaration`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-zam-canvas px-3.5 py-2 text-sm font-semibold text-zam-ink ring-1 ring-zam-line transition hover:bg-zam-line/50"
          >
            <Download size={15} /> Download declaration
          </a>
          <button
            type="button"
            onClick={save}
            disabled={busy || !dirty}
            className="inline-flex items-center gap-1.5 rounded-xl bg-zam-orange px-4 py-2 text-sm font-semibold text-white transition hover:bg-zam-orange-dark disabled:opacity-50"
          >
            <Save size={15} /> {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
