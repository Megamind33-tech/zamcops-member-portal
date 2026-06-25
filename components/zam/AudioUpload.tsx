"use client";

import React, { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Music, UploadCloud, Trash2, Loader2, CheckCircle2 } from "lucide-react";

const INLINE_MAX = 4 * 1024 * 1024; // inline fallback limit (serverless body)

function prettySize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Uploads the actual audio file (not just its name) so staff can download and
// play it. The binary is stored on an UploadFile row via /api/member/upload.
export function AudioUpload({
  label,
  hint,
  value,
  onChange,
  linkedTo,
}: {
  label: string;
  hint?: string;
  value?: string; // file name once uploaded
  onChange: (fileName: string) => void;
  linkedTo?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploadId, setUploadId] = useState<string>("");

  // Record an already-uploaded Blob file on an UploadFile row.
  const recordBlob = async (file: File, blobUrl: string): Promise<string> => {
    const res = await fetch("/api/member/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: blobUrl,
        fileName: file.name,
        fileType: "Audio",
        fileSize: file.size,
        mimeType: file.type,
        linkedTo: linkedTo || "",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not save the upload.");
    return data.id as string;
  };

  // Inline fallback for small files when no Blob store is connected.
  const inlineUpload = async (file: File): Promise<string> => {
    if (file.size > INLINE_MAX)
      throw new Error(`File is too large (${prettySize(file.size)}). Blob storage isn't connected — max 4MB without it.`);
    const qs = new URLSearchParams({ type: "Audio", name: file.name, linkedTo: linkedTo || "" });
    const res = await fetch(`/api/member/upload?${qs.toString()}`, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Upload failed.");
    return data.id as string;
  };

  const pick = async (file: File | undefined | null) => {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("audio/")) return setError("Please choose an audio file (MP3, WAV, M4A…).");

    setBusy(true);
    try {
      let id: string;
      try {
        // Preferred: direct-to-Blob upload (no size limit).
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
          contentType: file.type,
        });
        id = await recordBlob(file, blob.url);
      } catch {
        // Blob store not connected (or upload blocked) → inline fallback.
        id = await inlineUpload(file);
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadId(id);
      onChange(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (uploadId) {
      await fetch("/api/member/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: uploadId }),
      }).catch(() => {});
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setUploadId("");
    onChange("");
  };

  if (value) {
    return (
      <div className="rounded-xl border border-zam-green/30 bg-zam-green-soft p-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-zam-green">
            <Music className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-zam-ink">{value}</p>
            <p className="inline-flex items-center gap-1 text-xs text-zam-green">
              <CheckCircle2 className="h-3 w-3" /> Uploaded
            </p>
          </div>
          <button
            type="button"
            onClick={remove}
            className="rounded-lg p-1 text-zam-muted hover:text-zam-red"
            aria-label="Remove audio"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {previewUrl && <audio controls src={previewUrl} className="mt-3 h-9 w-full" />}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={busy}
        className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-zam-line bg-zam-canvas p-4 text-left transition hover:border-zam-orange/50 hover:bg-zam-orange-soft/40 disabled:opacity-60"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-zam-muted">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-zam-ink">{busy ? "Uploading…" : label}</span>
          <span className="block text-xs text-zam-muted">{hint || "MP3, WAV or M4A"}</span>
        </span>
      </button>
      {error && <p className="mt-1 text-xs text-zam-red">{error}</p>}
      <input
        ref={ref}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
