"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/app/(portal)/(member)/layout";
import { Card, CardHeader } from "@/components/zam/Card";
import { Button } from "@/components/zam/Button";
import { Field, Input, Select } from "@/components/zam/Input";
import { SplitsEditor } from "@/components/zam/SplitsEditor";
import { FilePicker } from "@/components/zam/FilePicker";
import { AudioUpload } from "@/components/zam/AudioUpload";
import { SubmitSuccess } from "@/components/zam/SubmitSuccess";
import { useApp } from "@/lib/store";
import { GENRES } from "@/data/reference";
import { uid } from "@/lib/format";
import type { OwnershipSplit } from "@/types";

const splitsValid = (splits: OwnershipSplit[]) =>
  splits.length > 0 && splits.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0) === 100;

export default function SingleSubmissionScreen() {
  const { addSingle, currentMember } = useApp();
  const [done, setDone] = useState<{ ref: string; title: string } | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    artistName: currentMember?.stageName || currentMember?.fullName || "",
    featuredArtists: "",
    producer: "",
    genre: "Afro-Pop",
    releaseDate: "",
    isrc: "",
    audioFile: "",
    coverArt: "",
    lyricsFile: "",
  });
  const [splits, setSplits] = useState<OwnershipSplit[]>([
    { id: uid("split"), party: currentMember?.stageName || currentMember?.fullName || "", role: "Performer", percentage: 100 },
  ]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const setFile = (k: keyof typeof form) => (name: string | undefined) =>
    setForm((f) => ({ ...f, [k]: name ?? "" }));

  const [busy, setBusy] = useState(false);

  const valid = form.title.trim() !== "" && !!form.audioFile && splitsValid(splits);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) return setError("Song title is required.");
    if (!form.audioFile) return setError("Please attach an audio file.");
    if (!splitsValid(splits)) return setError("Ownership splits must total exactly 100%.");
    setBusy(true);
    const res = await addSingle({
      title: form.title,
      artistName: form.artistName,
      featuredArtists: form.featuredArtists,
      producer: form.producer,
      genre: form.genre,
      releaseDate: form.releaseDate,
      isrc: form.isrc,
      audioFile: form.audioFile,
      coverArt: form.coverArt,
      lyricsFile: form.lyricsFile,
      ownershipSplits: splits,
    });
    setBusy(false);
    if (res.ok && res.item) {
      toast.success("Single submitted");
      setDone({ ref: `SR-S-${res.item.id.slice(-5).toUpperCase()}`, title: res.item.title });
    } else {
      setError(res.error || "Could not submit single.");
    }
  };

  if (done) {
    return <SubmitSuccess title={done.title} kind="Single Submission" reference={done.ref} primaryTo="/uploads" />;
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
        <PageHeader title="Submit a Single" subtitle="Register one release with its audio and splits." />
      </div>

      <form onSubmit={submit} className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader title="Song details" />
            <div className="p-5 space-y-4">
              <Field label="Song title" required>
                <Input placeholder="e.g. Night Drive" value={form.title} onChange={set("title")} />
              </Field>
              <Field label="Artist name" required>
                <Input value={form.artistName} onChange={set("artistName")} />
              </Field>
              <Field label="Featured artists">
                <Input placeholder="e.g. Wezi" value={form.featuredArtists} onChange={set("featuredArtists")} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Producer">
                  <Input value={form.producer} onChange={set("producer")} />
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
                <Field label="Release date">
                  <Input type="date" value={form.releaseDate} onChange={set("releaseDate")} />
                </Field>
                <Field label="ISRC" hint="Recording identifier, if known">
                  <Input placeholder="ZM-A01-26-…" value={form.isrc} onChange={set("isrc")} />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Files" />
            <div className="p-5 space-y-3">
              <AudioUpload
                label="Upload master audio"
                hint="WAV or high-quality MP3 · max 4MB"
                value={form.audioFile}
                onChange={(name) => setFile("audioFile")(name)}
                linkedTo={form.title}
              />
              <FilePicker
                label="Cover art"
                kind="image"
                hint="Min. 1400×1400px"
                value={form.coverArt}
                onChange={setFile("coverArt")}
              />
              <FilePicker
                label="Lyrics (optional)"
                kind="document"
                value={form.lyricsFile}
                onChange={setFile("lyricsFile")}
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
            icon={<Send className="h-5 w-5" />}
          >
            {busy ? "Submitting…" : "Submit single"}
          </Button>
        </div>
      </form>
    </div>
  );
}
