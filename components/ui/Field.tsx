import React from "react";
import { cn } from "@/lib/format";

export function Field({
  label,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="field-label">
        {label}
        {required && <span className="text-pop-400"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-night-400">{hint}</span>}
    </label>
  );
}

export const TextInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function TextInput({ className, ...props }, ref) {
  return <input ref={ref} className={cn("field-input", className)} {...props} />;
});

export const TextArea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn("field-input min-h-[88px] resize-y", className)} {...props} />;
});

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "field-input appearance-none bg-night-850 [&>option]:bg-night-850 [&>option]:text-white",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

// A touch-friendly faux file picker that records the chosen file name only.
// The app does not upload binary files yet.
export function FilePicker({
  label,
  accept,
  value,
  onPick,
  hint,
}: {
  label: string;
  accept?: string;
  value?: string;
  onPick: (fileName: string) => void;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-3 text-sm transition hover:border-brand-400/60 hover:bg-white/[0.06]">
        <span className={cn("truncate", value ? "font-medium text-white" : "text-night-400")}>
          {value || "Tap to choose a file"}
        </span>
        <span className="shrink-0 rounded-xl brand-gradient px-3 py-1.5 text-xs font-semibold text-white">
          Browse
        </span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f.name);
          }}
        />
      </label>
    </Field>
  );
}
