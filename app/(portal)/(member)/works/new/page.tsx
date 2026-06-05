"use client";

import React, { useState } from "react";
import { FileCheck2 } from "lucide-react";
import { TopBar } from "@/components/mobile/TopBar";
import { Field, TextInput, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { SplitEditor, splitsValid } from "@/components/SplitEditor";
import { SubmitSuccess } from "@/components/SubmitSuccess";
import { useApp } from "@/lib/store";
import { GENRES, LANGUAGES } from "@/data/reference";
import { uid } from "@/lib/format";
import type { OwnershipSplit, WorkType } from "@/types";

const WORK_TYPES: WorkType[] = ["Song", "Instrumental", "Beat", "Composition", "Lyric", "Arrangement"];

export default function WorkDeclarationScreen() {
  const { addWork, currentMember } = useApp();
  const [done, setDone] = useState<{ ref: string; title: string } | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    alternativeTitle: "",
    workType: "Song" as WorkType,
    language: "Bemba",
    genre: "Afro-Pop",
    duration: "",
    composers: currentMember?.fullName ?? "",
    authors: "",
    producers: "",
    publisher: "",
    isrc: "",
    iswc: "",
    dateCreated: "",
  });
  const [splits, setSplits] = useState<OwnershipSplit[]>([
    { id: uid("split"), party: currentMember?.fullName ?? "", role: "Composer", percentage: 100 },
  ]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const list = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean);

  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) return setError("A work title is required.");
    if (!splitsValid(splits)) return setError("Ownership splits must total exactly 100%.");
    setBusy(true);
    const res = await addWork({
      title: form.title,
      alternativeTitle: form.alternativeTitle,
      workType: form.workType,
      language: form.language,
      genre: form.genre,
      duration: form.duration,
      composers: list(form.composers),
      authors: list(form.authors),
      producers: list(form.producers),
      publisher: form.publisher,
      ownershipSplits: splits,
      isrc: form.isrc,
      iswc: form.iswc,
      dateCreated: form.dateCreated,
    });
    setBusy(false);
    if (res.ok && res.item) setDone({ ref: `SR-W-${res.item.id.slice(-5).toUpperCase()}`, title: res.item.title });
    else setError(res.error || "Could not submit declaration.");
  };

  if (done) {
    return (
      <>
        <TopBar title="Work declared" back="/works" />
        <SubmitSuccess
          title="Work declaration submitted"
          message={`“${done.title}” has been recorded and is pending review by ZAMCOPS.`}
          reference={done.ref}
          primaryHref="/works"
          primaryLabel="View my works"
        />
      </>
    );
  }

  return (
    <div>
      <TopBar title="Declare a Work" subtitle="Record copyright ownership" back="/submit" />
      <form onSubmit={submit} className="space-y-5 px-4 py-4">
        <Section title="Work details">
          <Field label="Work title" required>
            <TextInput placeholder="e.g. Zambezi Sunrise" value={form.title} onChange={set("title")} />
          </Field>
          <Field label="Alternative title">
            <TextInput value={form.alternativeTitle} onChange={set("alternativeTitle")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Work type" required>
              <Select value={form.workType} onChange={set("workType")}>
                {WORK_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="Duration" hint="mm:ss">
              <TextInput placeholder="03:48" value={form.duration} onChange={set("duration")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Language">
              <Select value={form.language} onChange={set("language")}>
                {LANGUAGES.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </Select>
            </Field>
            <Field label="Genre">
              <Select value={form.genre} onChange={set("genre")}>
                {GENRES.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Date created">
            <TextInput type="date" value={form.dateCreated} onChange={set("dateCreated")} />
          </Field>
        </Section>

        <Section title="Contributors" subtitle="Separate multiple names with commas">
          <Field label="Composer(s)">
            <TextInput placeholder="Name 1, Name 2" value={form.composers} onChange={set("composers")} />
          </Field>
          <Field label="Author / lyricist(s)">
            <TextInput placeholder="Name 1, Name 2" value={form.authors} onChange={set("authors")} />
          </Field>
          <Field label="Producer(s)">
            <TextInput placeholder="Name 1, Name 2" value={form.producers} onChange={set("producers")} />
          </Field>
          <Field label="Publisher">
            <TextInput placeholder="e.g. Self-Published" value={form.publisher} onChange={set("publisher")} />
          </Field>
        </Section>

        <Section title="Ownership splits" subtitle="Must total 100%">
          <SplitEditor splits={splits} onChange={setSplits} />
        </Section>

        <Section title="Identifiers" subtitle="Optional — add if available">
          <div className="grid grid-cols-2 gap-3">
            <Field label="ISRC">
              <TextInput placeholder="ZM-A01-26-…" value={form.isrc} onChange={set("isrc")} />
            </Field>
            <Field label="ISWC">
              <TextInput placeholder="T-000.000.000-0" value={form.iswc} onChange={set("iswc")} />
            </Field>
          </div>
        </Section>

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>
        )}

        <Button type="submit" block size="lg" disabled={busy}>
          <FileCheck2 size={18} /> {busy ? "Submitting…" : "Submit declaration"}
        </Button>
      </form>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card px-4 py-4">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-brand-900">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
