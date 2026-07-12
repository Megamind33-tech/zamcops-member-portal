"use client";

// Reusable signature capture: draw on a transparent canvas or upload an image
// (which is converted to a transparent PNG client-side). The result is stored
// once on the member record and applied to every document they must sign.

import React, { useRef, useState } from "react";
import { Eraser, PenLine, Upload, Check } from "lucide-react";
import { Button } from "@/components/zam/Button";
import { fileToTransparentPng } from "@/lib/signatureImage";

const CANVAS_W = 560;
const CANVAS_H = 200;

export function SignaturePad({
  value,
  onSave,
  saving,
}: {
  value: string; // currently stored signature (data URL) or ""
  onSave: (image: string) => Promise<{ ok: boolean; error?: string }>;
  saving: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);
  const [mode, setMode] = useState<"draw" | "upload">("draw");
  const [dirty, setDirty] = useState(false);
  const [uploadPreview, setUploadPreview] = useState("");
  const [error, setError] = useState("");

  const ctx = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const c = canvas.getContext("2d");
    if (!c) return null;
    c.lineWidth = 2.4;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.strokeStyle = "#1a2340";
    return c;
  };

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const c = ctx();
    if (!c) return;
    const { x, y } = pos(e);
    c.beginPath();
    c.moveTo(x, y);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const c = ctx();
    if (!c) return;
    const { x, y } = pos(e);
    c.lineTo(x, y);
    c.stroke();
    hasInk.current = true;
    setDirty(true);
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, CANVAS_W, CANVAS_H);
    hasInk.current = false;
    setDirty(false);
  };

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    try {
      setUploadPreview(await fileToTransparentPng(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process that image.");
    }
  };

  const save = async () => {
    setError("");
    let image = "";
    if (mode === "draw") {
      if (!hasInk.current) return setError("Draw your signature first.");
      image = canvasRef.current?.toDataURL("image/png") ?? "";
    } else {
      if (!uploadPreview) return setError("Choose a signature image first.");
      image = uploadPreview;
    }
    const res = await onSave(image);
    if (!res.ok) return setError(res.error || "Could not save your signature.");
    setUploadPreview("");
    clear();
  };

  return (
    <div className="space-y-4">
      {value && (
        <div className="flex items-center gap-4 rounded-2xl border border-zam-green/30 bg-zam-green/5 p-4">
          <div className="rounded-xl border border-zam-line bg-white px-4 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Your stored signature" className="h-14 w-auto max-w-[220px] object-contain" />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-zam-ink">
              <Check size={15} className="text-zam-green" /> Signature on file
            </p>
            <p className="mt-0.5 text-xs text-zam-muted">
              This signature is applied to every section of your documents that requires it. Save a new one below to
              replace it.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("draw")}
          className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition ${
            mode === "draw" ? "bg-zam-orange-soft text-zam-orange-dark" : "text-zam-muted hover:bg-zam-canvas"
          }`}
        >
          <PenLine size={15} /> Draw
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition ${
            mode === "upload" ? "bg-zam-orange-soft text-zam-orange-dark" : "text-zam-muted hover:bg-zam-canvas"
          }`}
        >
          <Upload size={15} /> Upload
        </button>
      </div>

      {mode === "draw" ? (
        <div>
          <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-zam-line bg-[linear-gradient(180deg,#fff,rgba(250,240,233,0.4))]">
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="block h-44 w-full cursor-crosshair touch-none select-none"
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={end}
              onPointerLeave={end}
            />
            <span className="pointer-events-none absolute inset-x-8 bottom-8 border-b border-zam-muted/40" />
            <span className="pointer-events-none absolute bottom-3 left-8 text-[11px] text-zam-muted/70">
              Sign above the line
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" icon={<Eraser size={14} />} onClick={clear}>
              Clear
            </Button>
            <Button type="button" size="sm" loading={saving} onClick={save} disabled={!dirty}>
              {value ? "Replace signature" : "Save signature"}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zam-line bg-white px-6 py-8 text-center hover:border-zam-orange/50">
            <Upload size={22} className="text-zam-muted" />
            <span className="text-sm font-semibold text-zam-ink">Upload a photo or scan of your signature</span>
            <span className="text-xs text-zam-muted">
              PNG or JPEG on a white background — we make the background transparent automatically.
            </span>
            <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={pickFile} />
          </label>
          {uploadPreview && (
            <div className="mt-3 flex items-center gap-3">
              <div className="rounded-xl border border-zam-line bg-zam-canvas px-4 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={uploadPreview} alt="Signature preview" className="h-14 w-auto max-w-[220px] object-contain" />
              </div>
              <Button type="button" size="sm" loading={saving} onClick={save}>
                {value ? "Replace signature" : "Save signature"}
              </Button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm font-medium text-zam-red">{error}</p>}
    </div>
  );
}
