"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Plus, Trash2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/app/(portal)/(member)/layout";
import { Card, CardHeader } from "@/components/zam/Card";
import { Button } from "@/components/zam/Button";
import { Field, Input, Select } from "@/components/zam/Input";
import { SplitsEditor } from "@/components/zam/SplitsEditor";
import { AudioUpload } from "@/components/zam/AudioUpload";
import { CoverUpload } from "@/components/zam/CoverUpload";
import { DocumentUpload } from "@/components/zam/DocumentUpload";
import { SubmitSuccess } from "@/components/zam/SubmitSuccess";
import { useApp } from "@/lib/store";
import { GENRES } from "@/data/reference";
import { uid } from "@/lib/format";
import { contributorGaps, splitsTotalOk } from "@/lib/works";
import type { OwnershipSplit, Track } from "@/types";

function newTrack(owner: string, ownerMemberNumber?: string, ownerId?: string): Track {
  return {
    id: uid("trk"),
    title: "",
    duration: "",
    genre: "Afro-Pop",
    contributors: [],
    ownershipSplits: [
      {
        id: uid("split"),
        party: owner,
        role: "Composer",
        percentage: 100,
        knownMember: true,
        memberId: ownerId,
        memberNumber: ownerMemberNumber,
      },
    ],
    isrc: "",
    audioFile: "",
  };
}

export default function AlbumSubmissionScreen() {
  const { addAlbum, currentMember } = useApp();
  const ownerName = currentMember?.fullName ?? "";
  const ownerMemberNumber = currentMember?.memberNumber ?? "";
  const recordingCredit = currentMember?.stageName || ownerName;
  const owner = { fullName: ownerName, memberNumber: ownerMemberNumber };
  const [done, setDone] = useState<{ ref: string; title: string } | null>(null);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState(recordingCredit);
  const [releaseDate, setReleaseDate] = useState("");
  const [coverArt, setCoverArt] = useState("");
  const [backCover, setBackCover] = useState("");
  const [studioReceipt, setStudioReceipt] = useState("");
  const [tracks, setTracks] = useState<Track[]>([newTrack(ownerName, ownerMemberNumber, currentMember?.id)]);
  const [open, setOpen] = useState<string | null>(tracks[0]?.id ?? null);
  const [busy, setBusy] = useState(false);

  const updateTrack = (id: string, patch: Partial<Track>) =>
    setTracks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const addTrack = () => {
    const t = newTrack(ownerName, ownerMemberNumber, currentMember?.id);
    setTracks((ts) => [...ts, t]);
    setOpen(t.id);
  };
  const removeTrack = (id: string) => setTracks((ts) => ts.filter((t) => t.id !== id));

  const trackReady = (t: Track) =>
    t.title.trim() !== "" &&
    !!t.audioFile &&
    splitsTotalOk(t.ownershipSplits) &&
    contributorGaps(t.ownershipSplits, owner).length === 0;

  const valid = title.trim() !== "" && !!coverArt && !!studioReceipt && tracks.length > 0 && tracks.every(trackReady);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) return setError("Album title is required.");
    if (!coverArt) return setError("Please attach the front artwork.");
    if (!studioReceipt) return setError("Upload the studio letter or receipt — required for every album.");
    if (tracks.length === 0) return setError("Add at least one track.");
    if (tracks.some((t) => !t.title.trim())) return setError("Every track needs a title.");
    if (tracks.some((t) => !t.audioFile)) return setError("Every track needs its audio file.");
    if (tracks.some((t) => !splitsTotalOk(t.ownershipSplits)))
      return setError("Each track's ownership splits must total 100%.");
    for (const t of tracks) {
      const gaps = contributorGaps(t.ownershipSplits, owner);
      if (gaps.length) return setError(`On “${t.title || "a track"}”: ${gaps[0]}`);
    }
    setBusy(true);
    const res = await addAlbum({ title, artistName, releaseDate, coverArt, backCover, studioReceipt, tracks });
    setBusy(false);
    if (res.ok && res.item) {
      toast.success("Album submitted");
      setDone({ ref: `SR-A-${res.item.id.slice(-5).toUpperCase()}`, title: res.item.title });
    } else {
      setError(res.error || "Could not submit album.");
    }
  };

  if (done) {
    return <SubmitSuccess title={done.title} kind="Album Submission" reference={done.ref} primaryTo="/uploads" />;
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
          title="Register an album"
          subtitle="Tracks, artwork, and the studio letter or receipt in one submission. Creators are listed once per track."
        />
      </div>

      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardHeader title="Album details" />
          <div className="p-5 space-y-4">
            <Field label="Album title" required>
              <Input placeholder="e.g. Kalulu Tales" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Recording credit" hint="How the release is credited — not a related-rights claim">
              <Input value={artistName} onChange={(e) => setArtistName(e.target.value)} />
            </Field>
            <Field label="Release date">
              <Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <CoverUpload label="Front artwork" hint="Min. 1400×1400px" value={coverArt} onChange={setCoverArt} />
              <CoverUpload label="Back artwork" hint="Tracklist / sleeve" value={backCover} onChange={setBackCover} />
            </div>
            <DocumentUpload
              label="Studio letter or receipt"
              hint="Required for an album — letter or payment receipt from the studio"
              value={studioReceipt}
              onChange={setStudioReceipt}
              linkedTo={`${title || "Album"} — studio receipt`}
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title={`Tracklist (${tracks.length})`}
            action={
              <Button type="button" variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={addTrack}>
                Add track
              </Button>
            }
          />
          <div className="p-5 space-y-3">
            {tracks.map((t, idx) => {
              const isOpen = open === t.id;
              const ok = trackReady(t);
              return (
                <div key={t.id} className="rounded-2xl border border-zam-line overflow-hidden">
                  <div className="flex items-center gap-3 bg-zam-canvas px-4 py-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        ok ? "bg-zam-green text-white" : "bg-white text-zam-muted border border-zam-line"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : t.id)}
                      className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-zam-ink"
                    >
                      {t.title || `Track ${idx + 1}`}
                    </button>
                    {tracks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTrack(t.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-zam-muted hover:bg-red-50 hover:text-zam-red"
                        aria-label="Remove track"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : t.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-zam-muted hover:bg-white"
                      aria-label="Toggle track"
                    >
                      <ChevronDown className={"h-4 w-4 transition " + (isOpen ? "rotate-180" : "")} />
                    </button>
                  </div>

                  {isOpen && (
                    <div className="space-y-4 border-t border-zam-line bg-white px-4 py-4">
                      <Field label="Track title" required>
                        <Input value={t.title} onChange={(e) => updateTrack(t.id, { title: e.target.value })} />
                      </Field>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Duration" hint="mm:ss">
                          <Input
                            placeholder="03:30"
                            value={t.duration}
                            onChange={(e) => updateTrack(t.id, { duration: e.target.value })}
                          />
                        </Field>
                        <Field label="Genre">
                          <Select value={t.genre} onChange={(e) => updateTrack(t.id, { genre: e.target.value })}>
                            {GENRES.map((g) => (
                              <option key={g}>{g}</option>
                            ))}
                          </Select>
                        </Field>
                      </div>
                      <Field label="ISRC" hint="Recording identifier, if known">
                        <Input
                          placeholder="ZM-A01-26-…"
                          value={t.isrc ?? ""}
                          onChange={(e) => updateTrack(t.id, { isrc: e.target.value })}
                        />
                      </Field>
                      <AudioUpload
                        label="Track audio"
                        hint="WAV or MP3 — required"
                        value={t.audioFile}
                        onChange={(name) => updateTrack(t.id, { audioFile: name })}
                        linkedTo={`${title || "Album"} · ${t.title || `Track ${idx + 1}`}`}
                      />
                      <div>
                        <span className="block text-sm font-semibold text-zam-ink mb-1.5">Creators and ownership</span>
                        <SplitsEditor
                          splits={t.ownershipSplits}
                          onChange={(next) => updateTrack(t.id, { ownershipSplits: next as OwnershipSplit[] })}
                          ownerName={ownerName}
                          ownerMemberNumber={ownerMemberNumber}
                          workTitle={t.title || `Track ${idx + 1}`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
          {busy ? "Submitting…" : "Register album"}
        </Button>
      </form>
    </div>
  );
}
