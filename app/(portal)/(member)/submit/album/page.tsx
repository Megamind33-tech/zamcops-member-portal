"use client";

import React, { useState } from "react";
import { Send, Plus, Trash2, ChevronDown, ListMusic } from "lucide-react";
import { TopBar } from "@/components/mobile/TopBar";
import { CoverArt } from "@/components/media/CoverArt";
import { Field, TextInput, Select, FilePicker } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { SplitEditor, splitsValid } from "@/components/SplitEditor";
import { SubmitSuccess } from "@/components/SubmitSuccess";
import { useApp } from "@/lib/store";
import { GENRES } from "@/data/reference";
import { uid } from "@/lib/format";
import type { Track } from "@/types";

function newTrack(owner: string): Track {
  return {
    id: uid("trk"),
    title: "",
    duration: "",
    genre: "Afro-Pop",
    contributors: [],
    ownershipSplits: [{ id: uid("split"), party: owner, role: "Performer", percentage: 100 }],
    isrc: "",
    audioFile: "",
  };
}

export default function AlbumSubmissionScreen() {
  const { addAlbum, currentMember } = useApp();
  const owner = currentMember?.stageName || currentMember?.fullName || "";
  const [done, setDone] = useState<{ ref: string; title: string } | null>(null);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState(owner);
  const [releaseDate, setReleaseDate] = useState("");
  const [coverArt, setCoverArt] = useState("");
  const [tracks, setTracks] = useState<Track[]>([newTrack(owner)]);
  const [open, setOpen] = useState<string | null>(tracks[0]?.id ?? null);

  const updateTrack = (id: string, patch: Partial<Track>) =>
    setTracks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const addTrack = () => {
    const t = newTrack(owner);
    setTracks((ts) => [...ts, t]);
    setOpen(t.id);
  };
  const removeTrack = (id: string) => setTracks((ts) => ts.filter((t) => t.id !== id));
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) return setError("Album title is required.");
    if (tracks.length === 0) return setError("Add at least one track.");
    if (tracks.some((t) => !t.title.trim())) return setError("Every track needs a title.");
    if (tracks.some((t) => !splitsValid(t.ownershipSplits)))
      return setError("Each track's ownership splits must total 100%.");
    setBusy(true);
    const res = await addAlbum({ title, artistName, releaseDate, coverArt, tracks });
    setBusy(false);
    if (res.ok && res.item) setDone({ ref: `SR-A-${res.item.id.slice(-5).toUpperCase()}`, title: res.item.title });
    else setError(res.error || "Could not submit album.");
  };

  if (done) {
    return (
      <>
        <TopBar title="Album submitted" back="/dashboard" />
        <SubmitSuccess
          title="Album submitted"
          message={`“${done.title}” has been submitted with ${tracks.length} track${
            tracks.length === 1 ? "" : "s"
          } and is pending review.`}
          reference={done.ref}
          primaryHref="/uploads"
          primaryLabel="Track submission"
        />
      </>
    );
  }

  return (
    <div>
      <TopBar title="Submit an Album" back="/submit" />
      <form onSubmit={submit} className="space-y-5 px-4 py-4">
        <section className="card px-4 py-4">
          <div className="mb-3 flex items-center gap-3">
            <CoverArt seed={title || "New album"} size={44} rounded="rounded-xl" />
            <h3 className="text-sm font-bold text-white">Album details</h3>
          </div>
          <div className="space-y-3">
            <Field label="Album title" required>
              <TextInput placeholder="e.g. Kalulu Tales" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Artist name" required>
              <TextInput value={artistName} onChange={(e) => setArtistName(e.target.value)} />
            </Field>
            <Field label="Release date">
              <TextInput type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
            </Field>
            <FilePicker label="Cover art" accept="image/*" value={coverArt} onPick={setCoverArt} hint="Min. 1400×1400px" />
          </div>
        </section>

        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-white">
              <ListMusic size={16} /> Tracklist ({tracks.length})
            </h3>
            <button
              type="button"
              onClick={addTrack}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-300 hover:text-brand-200"
            >
              <Plus size={15} /> Add track
            </button>
          </div>

          <div className="space-y-3">
            {tracks.map((t, idx) => {
              const isOpen = open === t.id;
              return (
                <div key={t.id} className="card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : t.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-xs font-bold text-brand-300 ring-1 ring-white/10">
                      {idx + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                      {t.title || `Track ${idx + 1}`}
                    </span>
                    {tracks.length > 1 && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTrack(t.id);
                        }}
                        className="grid h-8 w-8 place-items-center rounded-lg text-night-400 hover:bg-red-500/10 hover:text-red-300"
                      >
                        <Trash2 size={15} />
                      </span>
                    )}
                    <ChevronDown
                      size={18}
                      className={"shrink-0 text-night-400 transition " + (isOpen ? "rotate-180" : "")}
                    />
                  </button>

                  {isOpen && (
                    <div className="space-y-3 border-t border-white/[0.06] px-4 py-4">
                      <Field label="Track title" required>
                        <TextInput value={t.title} onChange={(e) => updateTrack(t.id, { title: e.target.value })} />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Duration" hint="mm:ss">
                          <TextInput placeholder="03:30" value={t.duration} onChange={(e) => updateTrack(t.id, { duration: e.target.value })} />
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
                        <TextInput placeholder="ZM-A01-26-…" value={t.isrc ?? ""} onChange={(e) => updateTrack(t.id, { isrc: e.target.value })} />
                      </Field>
                      <FilePicker
                        label="Audio file"
                        accept="audio/*"
                        value={t.audioFile}
                        onPick={(name) => updateTrack(t.id, { audioFile: name })}
                      />
                      <div>
                        <span className="field-label">Ownership splits</span>
                        <SplitEditor
                          compact
                          splits={t.ownershipSplits}
                          onChange={(next) => updateTrack(t.id, { ownershipSplits: next })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300">{error}</p>
        )}

        <Button type="submit" block size="lg" disabled={busy}>
          <Send size={18} /> {busy ? "Submitting…" : "Submit album"}
        </Button>
      </form>
    </div>
  );
}
