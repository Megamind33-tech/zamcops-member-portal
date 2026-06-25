"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/app/(portal)/(member)/layout";
import { Card, CardHeader } from "@/components/zam/Card";
import { Button } from "@/components/zam/Button";
import { Field, Input, Select } from "@/components/zam/Input";
import { SplitsEditor } from "@/components/zam/SplitsEditor";
import { FilePicker } from "@/components/zam/FilePicker";
import { SubmitSuccess } from "@/components/zam/SubmitSuccess";
import { useApp } from "@/lib/store";
import { GENRES, LANGUAGES } from "@/data/reference";
import { uid } from "@/lib/format";
import type { OwnershipSplit, WorkType } from "@/types";

const WORK_TYPES: WorkType[] = ["Song", "Instrumental", "Beat", "Composition", "Lyric", "Arrangement"];

const splitsValid = (splits: OwnershipSplit[]) =>
  splits.length > 0 && splits.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0) === 100;

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
    publisherIpi: "",
    isrc: "",
    iswc: "",
    dateCreated: "",
  });
  const [splits, setSplits] = useState<OwnershipSplit[]>([
    { id: uid("split"), party: currentMember?.fullName ?? "", role: "Composer", percentage: 100 },
  ]);
  const [audioFile, setAudioFile] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const list = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean);

  const [busy, setBusy] = useState(false);

  const valid = form.title.trim() !== "" && splitsValid(splits);

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
      publisherIpi: form.publisherIpi,
      ownershipSplits: splits,
      isrc: form.isrc,
      iswc: form.iswc,
      audioFile,
      dateCreated: form.dateCreated,
    });
    setBusy(false);
    if (res.ok && res.item) {
      toast.success("Work declaration submitted");
      setDone({ ref: `SR-W-${res.item.id.slice(-5).toUpperCase()}`, title: res.item.title });
    } else {
      setError(res.error || "Could not submit declaration.");
    }
  };

  if (done) {
    return <SubmitSuccess title={done.title} kind="Work Declaration" reference={done.ref} primaryTo="/works" />;
  }

  return (
    <div>
      <Link
        href="/submit"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-zam-muted hover:text-zam-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Submit
      </Link>

      <div className="mt-4">
        <PageHeader title="Declare a Work" subtitle="Record copyright ownership of your composition." />
      </div>

      <form onSubmit={submit} className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader title="Work details" />
            <div className="p-5 space-y-4">
              <Field label="Work title" required>
                <Input placeholder="e.g. Zambezi Sunrise" value={form.title} onChange={set("title")} />
              </Field>
              <Field label="Alternative title">
                <Input value={form.alternativeTitle} onChange={set("alternativeTitle")} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Work type" required>
                  <Select value={form.workType} onChange={set("workType")}>
                    {WORK_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Duration" hint="mm:ss">
                  <Input placeholder="03:48" value={form.duration} onChange={set("duration")} />
                </Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
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
                <Input type="date" value={form.dateCreated} onChange={set("dateCreated")} />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Contributors" description="Separate multiple names with commas." />
            <div className="p-5 space-y-4">
              <Field label="Composer(s)">
                <Input placeholder="Name 1, Name 2" value={form.composers} onChange={set("composers")} />
              </Field>
              <Field label="Author / lyricist(s)">
                <Input placeholder="Name 1, Name 2" value={form.authors} onChange={set("authors")} />
              </Field>
              <Field label="Producer(s)">
                <Input placeholder="Name 1, Name 2" value={form.producers} onChange={set("producers")} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Publisher">
                  <Input placeholder="e.g. Self-Published" value={form.publisher} onChange={set("publisher")} />
                </Field>
                <Field label="Publisher IPI / CAE" hint="For cross-society registration">
                  <Input placeholder="00000000000" value={form.publisherIpi} onChange={set("publisherIpi")} />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Identifiers & publishing" description="Optional — add if available." />
            <div className="p-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="ISRC">
                  <Input placeholder="ZM-A01-26-…" value={form.isrc} onChange={set("isrc")} />
                </Field>
                <Field label="ISWC">
                  <Input placeholder="T-000.000.000-0" value={form.iswc} onChange={set("iswc")} />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Reference recording" description="Optional — attach an audio file of this work." />
            <div className="p-5">
              <FilePicker
                label="Audio file"
                kind="audio"
                hint="WAV or MP3 of the work"
                value={audioFile}
                onChange={(name) => setAudioFile(name ?? "")}
              />
            </div>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6 space-y-4">
          <Card>
            <CardHeader title="Ownership splits" description="Must total 100%." />
            <div className="p-5">
              <SplitsEditor splits={splits} onChange={(s) => setSplits(s as OwnershipSplit[])} />
            </div>
          </Card>

          {error && (
            <p className="rounded-xl border border-zam-red/20 bg-red-50 px-3 py-2 text-sm font-medium text-zam-red">
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            loading={busy}
            disabled={busy || !valid}
            icon={<FileCheck2 className="h-5 w-5" />}
          >
            {busy ? "Submitting…" : "Submit declaration"}
          </Button>
        </div>
      </form>
    </div>
  );
}
