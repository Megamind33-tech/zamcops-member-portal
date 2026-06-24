"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud as UploadCloudIcon,
  FileAudio as FileAudioIcon,
  Image as ImageIcon,
  FileText as FileTextIcon,
  CheckCircle2 as CheckCircle2Icon,
  X as XIcon,
} from "lucide-react";
import { twMerge } from "tailwind-merge";

type Kind = "audio" | "image" | "document";

const iconMap: Record<Kind, React.ReactNode> = {
  audio: <FileAudioIcon className="h-5 w-5" />,
  image: <ImageIcon className="h-5 w-5" />,
  document: <FileTextIcon className="h-5 w-5" />,
};

export function FilePicker({
  label,
  hint,
  kind = "document",
  value,
  onChange,
  className,
}: {
  label: string;
  hint?: string;
  kind?: Kind;
  value?: string;
  onChange?: (name: string | undefined) => void;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  function handleFiles(files: FileList | null) {
    if (files && files[0]) onChange?.(files[0].name);
  }

  if (value) {
    return (
      <div
        className={twMerge(
          "rounded-xl border border-zam-green/30 bg-zam-green-soft p-3 flex items-center gap-3",
          className
        )}
      >
        <span className="h-9 w-9 rounded-lg bg-white text-zam-green flex items-center justify-center shrink-0">
          {iconMap[kind]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zam-ink truncate">{value}</p>
          <p className="text-xs text-zam-green inline-flex items-center gap-1">
            <CheckCircle2Icon className="h-3 w-3" /> Ready to submit
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange?.(undefined)}
          className="text-zam-muted hover:text-zam-red p-1 rounded-lg"
          aria-label="Remove file"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => ref.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={twMerge(
        "w-full rounded-xl border-2 border-dashed p-4 flex items-center gap-3 text-left transition-colors",
        drag
          ? "border-zam-orange bg-zam-orange-soft"
          : "border-zam-line bg-zam-canvas hover:border-zam-orange/50 hover:bg-zam-orange-soft/40",
        className
      )}
    >
      <span className="h-9 w-9 rounded-lg bg-white text-zam-muted flex items-center justify-center shrink-0">
        <UploadCloudIcon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zam-ink">{label}</p>
        <p className="text-xs text-zam-muted">{hint || "Click to browse or drag a file here"}</p>
      </div>
      <input ref={ref} type="file" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
    </button>
  );
}
