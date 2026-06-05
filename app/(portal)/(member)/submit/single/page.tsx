"use client";

import React, { useState } from "react";
import { Send } from "lucide-react";
import { TopBar } from "@/components/mobile/TopBar";
import { Field, TextInput, Select, FilePicker } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { SplitEditor, splitsValid } from "@/components/SplitEditor";
import { SubmitSuccess } from "@/components/SubmitSuccess";
import { useApp } from "@/lib/store";
import { GENRES } from "@/data/reference";
import { uid } from "@/lib/format";
import type { OwnershipSplit } from "@/types";

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
    audioFile: "",
    coverArt: "",
    lyricsFile: "",
  });
  const [splits, setSplits] = useState<OwnershipSplit[]>([
    { id: uid("split"), party: currentMember?.stageName || currentMember?.fullName || "", role: "Performer", percentage: 100 },
  ]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const setFile = (k: keyof typeof form) => (name: string) => setForm((f) => ({ ...f, [k]: name }));

  const [busy, setBusy] = useState(false);

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
      audioFile: form.audioFile,
      coverArt: form.coverArt,
      lyricsFile: form.lyricsFile,
      ownershipSplits: splits,
    });
    setBusy(false);
    if (res.ok && res.item) setDone({ ref: `SR-S-${res.item.id.slice(-5).toUpperCase()}`, title: res.item.title });
    else setError(res.error || "Could not submit single.");
  };

  if (done) {
    return (
      <>
        <TopBar title="Single submitted" back="/dashboard" />
        <SubmitSuccess
          title="Single submitted"
          message={`“${done.title}” has been submitted and is pending review.`}
          reference={done.ref}
          primaryHref="/uploads"
          primaryLabel="Track submission"
        />
      </>
    );
  }

  return (
    <div>
      <TopBar title="Submit a Single" back="/submit" />
      <form onSubmit={submit} className="space-y-5 px-4 py-4">
        <Section title="Song details">
          <Field label="Song title" required>
            <TextInput placeholder="e.g. Night Drive" value={form.title} onChange={set("title")} />
          </Field>
          <Field label="Artist name" required>
            <TextInput value={form.artistName} onChange={set("artistName")} />
          </Field>
          <Field label="Featured artists">
            <TextInput placeholder="e.g. Wezi" value={form.featuredArtists} onChange={set("featuredArtists")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Producer">
              <TextInput value={form.producer} onChange={set("producer")} />
            </Field>
            <Field label="Genre">
              <Select value={form.genre} onChange={set("genre")}>
                {GENRES.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Release date">
            <TextInput type="date" value={form.releaseDate} onChange={set("releaseDate")} />
          </Field>
        </Section>

        <Section title="Files">
          <FilePicker label="Audio file" accept="audio/*" value={form.audioFile} onPick={setFile("audioFile")} hint="WAV or high-quality MP3" />
          <FilePicker label="Cover art" accept="image/*" value={form.coverArt} onPick={setFile("coverArt")} hint="Min. 1400×1400px" />
          <FilePicker label="Lyrics (optional)" accept=".pdf,.txt,.doc,.docx" value={form.lyricsFile} onPick={setFile("lyricsFile")} />
        </Section>

        <Section title="Ownership splits" subtitle="Confirm the split — must total 100%">
          <SplitEditor splits={splits} onChange={setSplits} />
        </Section>

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>
        )}

        <Button type="submit" block size="lg" disabled={busy}>
          <Send size={18} /> {busy ? "Submitting…" : "Submit single"}
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
