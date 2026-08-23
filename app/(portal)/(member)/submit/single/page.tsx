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
import { AudioUpload } from "@/components/zam/AudioUpload";
import { CoverUpload } from "@/components/zam/CoverUpload";
import { FilePicker } from "@/components/zam/FilePicker";
import { SubmitSuccess } from "@/components/zam/SubmitSuccess";
import { useApp } from "@/lib/store";
import { GENRES, LANGUAGES } from "@/data/reference";
import { uid } from "@/lib/format";
import type { OwnershipSplit, WorkType } from "@/types";

const WORK_TYPES: WorkType[] = ["Song", "Instrumental", "Composition", "Arrangement"];

const splitsValid = (splits: OwnershipSplit[]) =>
  splits.length > 0 && splits.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0) === 100;

export default function RegisterWorkScreen() {
  const { addWork, currentMember } = useApp();
  const owner = currentMember?.stageName || currentMember?.fullName || "";
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
    arrangers: "",
    publisher: "",
    publisherIpi: "",
    performedBy: owner,
    isrc: "",
    iswc: "",
    dateCreated: "",
    lyricsFile: "",
  });
  const [splits, setSplits] = useState<OwnershipSplit[]>([
    { id: uid("split"), party: currentMember?.fullName ?? "", role: "Composer", percentage: 100 },
  ]);
  const [audioFile, setAudioFile] = useState("");
  const [coverArt, setCoverArt] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const list = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean);

  const valid = form.title.trim() !== "" && !!audioFile && !!coverArt && splitsValid(splits);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) return setError("A work title is required.");
    if (!audioFile) return setError("Please attach the song (audio file).");
    if (!coverArt) return setError("Please attach the artwork.");
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
      arrangers: list(form.arrangers),
      publisher: form.publisher,
      publisherIpi: form.publisherIpi,
      performedBy: form.performedBy,
      ownershipSplits: splits,
      isrc: form.isrc,
      iswc: form.iswc,
      audioFile,
      coverArt,
      lyricsFile: form.lyricsFile,
      dateCreated: form.dateCreated,
    });
    setBusy(false);
    if (res.ok && res.item) {
      toast.success("Song and artwork submitted for registration");
      setDone({ ref: `SR-W-${res.item.id.slice(-5).toUpperCase()}`, title: res.item.title });
    } else {
      setError(res.error || "Could not submit this work.");
    }
  };

  if (done) {
    return <SubmitSuccess title={done.title} kind="Work registration" reference={done.ref} primaryTo="/works" />;
  }

  return (
    <div>
      <Link
        href="/submit"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-zam-muted hover:text-zam-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="mt-4">
        <PageHeader
          title="Register a work"
          subtitle="Send the song and its artwork together. Credit composers, authors, arrangers and publishers. Related rights are not registered here."
        />
      </div>

      <form onSubmit={submit} className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader title="Work" />
            <div className="p-5 space-y-4">
              <Field label="Title" required>
                <Input placeholder="Title of the musical work" value={form.title} onChange={set("title")} />
              </Field>
              <Field label="Alternative title">
                <Input value={form.alternativeTitle} onChange={set("alternativeTitle")} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Type" required>
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
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Date created">
                  <Input type="date" value={form.dateCreated} onChange={set("dateCreated")} />
                </Field>
                <Field label="Recording credit" hint="How the recording is credited — not a related-rights claim">
                  <Input value={form.performedBy} onChange={set("performedBy")} />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Composers, authors, arrangers and publishers"
              description="Separate multiple names with commas. Arrangers receive a share. Performers and producers are not rights holders in this register."
            />
            <div className="p-5 space-y-4">
              <Field label="Composer(s)" required>
                <Input placeholder="Name 1, Name 2" value={form.composers} onChange={set("composers")} />
              </Field>
              <Field label="Author(s)">
                <Input placeholder="Name 1, Name 2" value={form.authors} onChange={set("authors")} />
              </Field>
              <Field label="Arranger(s)">
                <Input placeholder="Name 1, Name 2" value={form.arrangers} onChange={set("arrangers")} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Publisher">
                  <Input value={form.publisher} onChange={set("publisher")} />
                </Field>
                <Field label="Publisher IPI / CAE">
                  <Input placeholder="00000000000" value={form.publisherIpi} onChange={set("publisherIpi")} />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Song and artwork" description="Both files are required and are registered together." />
            <div className="p-5 space-y-5">
              <AudioUpload
                label="Song (audio)"
                hint="WAV or MP3 of the work"
                value={audioFile}
                onChange={setAudioFile}
                linkedTo={form.title}
              />
              <CoverUpload
                label="Artwork"
                hint="Sleeve or cover image — min. 1400×1400px"
                value={coverArt}
                onChange={setCoverArt}
              />
              <FilePicker
                label="Lyrics (optional)"
                kind="document"
                value={form.lyricsFile}
                onChange={(name) => setForm((f) => ({ ...f, lyricsFile: name ?? "" }))}
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="ISRC" hint="Recording identifier, if known">
                  <Input placeholder="ZM-A01-26-…" value={form.isrc} onChange={set("isrc")} />
                </Field>
                <Field label="ISWC" hint="Work identifier, if known">
                  <Input placeholder="T-000.000.000-0" value={form.iswc} onChange={set("iswc")} />
                </Field>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6 space-y-4">
          <Card>
            <CardHeader title="Ownership splits" description="Must total 100% across composers, authors, arrangers and publishers." />
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
            {busy ? "Submitting…" : "Register song and artwork"}
          </Button>
        </div>
      </form>
    </div>
  );
}
