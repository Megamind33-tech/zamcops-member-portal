import React, { forwardRef } from "react";
import { twMerge } from "tailwind-merge";

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, hint, error, required, className, children }: FieldProps) {
  return (
    <label className={twMerge("block", className)}>
      {label && (
        <span className="block text-sm font-semibold text-zam-ink mb-1.5">
          {label}
          {required && <span className="text-zam-red ml-0.5">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="block text-xs text-zam-red mt-1">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-zam-muted mt-1">{hint}</span>
      ) : null}
    </label>
  );
}

const baseInput =
  "w-full h-11 rounded-xl border border-zam-line bg-white px-3.5 text-sm text-zam-ink placeholder:text-zam-muted/70 focus:outline-none focus:border-zam-orange focus:ring-2 focus:ring-zam-orange/20 transition disabled:bg-zam-canvas";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  ({ className, invalid, ...rest }, ref) => (
    <input
      ref={ref}
      className={twMerge(baseInput, invalid && "border-zam-red focus:border-zam-red focus:ring-zam-red/20", className)}
      {...rest}
    />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => (
    <textarea ref={ref} className={twMerge(baseInput, "h-auto py-2.5 min-h-[96px] resize-y", className)} {...rest} />
  )
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...rest }, ref) => (
    <select
      ref={ref}
      className={twMerge(
        baseInput,
        'pr-9 appearance-none bg-[url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%235A6470%27 stroke-width=%272%27><path d=%27M6 9l6 6 6-6%27/></svg>")] bg-no-repeat bg-[right_0.75rem_center]',
        className
      )}
      {...rest}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
