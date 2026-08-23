"use client";

import React, { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { ImagePlus, Trash2, Loader2 } from "lucide-react";

// Resize an image to fit within `max`px (keeping aspect — no crop, so the full
// artwork is preserved) onto a canvas.
function resizeToCanvas(file: File, max = 1200, quality = 0.85): Promise<{ canvas: HTMLCanvasElement; quality: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file is not a valid image."));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported."));
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ canvas, quality });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

async function r2Upload(blob: Blob, fileName: string): Promise<string | null> {
  const pres = await fetch("/api/storage/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName,
      contentType: "image/jpeg",
      fileSize: blob.size,
    }),
  });
  if (pres.status === 501) return null;
  const data = await pres.json().catch(() => ({}));
  if (!pres.ok) return null;
  const put = await fetch(data.uploadUrl, {
    method: "PUT",
    body: blob,
    headers: { "Content-Type": "image/jpeg" },
  });
  if (!put.ok) return null;
  return data.url as string;
}

// Prefer R2, then Vercel Blob, then a compact inline JPEG so the work POST
// body stays small enough for Vercel.
async function processCover(file: File): Promise<string> {
  const { canvas, quality } = await resizeToCanvas(file);
  const blob: Blob | null = await new Promise((res) => canvas.toBlob((b) => res(b), "image/jpeg", quality));
  if (blob) {
    const name = `cover-${Date.now()}.jpg`;
    const r2 = await r2Upload(blob, name).catch(() => null);
    if (r2) return r2;
    try {
      const result = await upload(name, blob, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        contentType: "image/jpeg",
      });
      return result.url;
    } catch {
      /* no remote store connected → inline fallback */
    }
  }
  return canvas.toDataURL("image/jpeg", quality);
}

export function CoverUpload({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value?: string;
  onChange: (dataUrl: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = async (file: File | undefined | null) => {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) return setError("Please choose an image file.");
    if (file.size > 15 * 1024 * 1024) return setError("Image is too large (max 15MB).");
    setBusy(true);
    try {
      onChange(await processCover(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not process the image.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-zam-ink">{label}</span>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="group relative grid h-40 w-40 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-dashed border-zam-line bg-[#2c241c] text-white/70 transition hover:border-zam-orange/60"
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="h-full w-full object-cover" />
          ) : busy ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <ImagePlus className="h-6 w-6" />
          )}
          {value && (
            <span className="absolute inset-0 hidden place-items-center bg-zam-ink/45 text-white group-hover:grid">
              <ImagePlus className="h-5 w-5" />
            </span>
          )}
        </button>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => ref.current?.click()}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zam-line bg-white px-3 text-sm font-semibold text-zam-ink transition hover:bg-zam-canvas disabled:opacity-50"
            >
              <ImagePlus className="h-4 w-4" /> {value ? "Replace" : "Upload"}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                disabled={busy}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-zam-muted transition hover:bg-red-50 hover:text-zam-red disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> Remove
              </button>
            )}
          </div>
          {hint && <p className="mt-1.5 text-xs text-zam-muted">{hint}</p>}
          {error && <p className="mt-1 text-xs text-zam-red">{error}</p>}
        </div>
      </div>

      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
