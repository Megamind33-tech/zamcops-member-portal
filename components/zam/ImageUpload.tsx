"use client";

import React, { useRef, useState } from "react";
import { Camera, Trash2, Loader2 } from "lucide-react";
import { Avatar } from "@/components/zam/Misc";

// Resize/crop the chosen image to a centred square and return a compact JPEG
// data URL — small enough to store directly on the member record (no blob
// storage needed, works on serverless).
function fileToSquareDataUrl(file: File, size = 320, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file is not a valid image."));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported."));
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ImageUpload({
  value,
  name,
  onChange,
  size = 88,
}: {
  value?: string;
  name: string;
  onChange: (dataUrl: string) => void;
  size?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = async (file: File | undefined | null) => {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) return setError("Please choose an image file.");
    if (file.size > 12 * 1024 * 1024) return setError("Image is too large (max 12MB).");
    setBusy(true);
    try {
      onChange(await fileToSquareDataUrl(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not process the image.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="group relative shrink-0 rounded-full"
        aria-label="Upload profile photo"
      >
        <Avatar name={name} src={value || undefined} size={size} />
        <span className="absolute inset-0 grid place-items-center rounded-full bg-zam-ink/0 text-white opacity-0 transition group-hover:bg-zam-ink/45 group-hover:opacity-100">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
        </span>
        <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-zam-orange text-white">
          <Camera className="h-3.5 w-3.5" />
        </span>
      </button>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => ref.current?.click()}
            disabled={busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zam-line bg-white px-3 text-sm font-semibold text-zam-ink transition hover:bg-zam-canvas disabled:opacity-50"
          >
            <Camera className="h-4 w-4" /> {value ? "Change photo" : "Upload photo"}
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
        <p className="mt-1.5 text-xs text-zam-muted">JPG, PNG or GIF — squared automatically.</p>
        {error && <p className="mt-1 text-xs text-zam-red">{error}</p>}
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
