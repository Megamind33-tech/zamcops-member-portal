"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { ButtonLink, Button } from "@/components/ui/Button";

// Full-screen confirmation shown after a successful submission, with the
// generated reference acting as a lightweight submission receipt.
export function SubmitSuccess({
  title,
  reference,
  message,
  primaryHref,
  primaryLabel,
  onAgain,
}: {
  title: string;
  reference: string;
  message: string;
  primaryHref: string;
  primaryLabel: string;
  onAgain?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center animate-scale-in">
      <div className="grid h-20 w-20 place-items-center rounded-3xl bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-400/20 shadow-glow">
        <CheckCircle2 size={44} />
      </div>
      <h2 className="mt-5 font-display text-xl font-bold text-white">{title}</h2>
      <p className="mt-2 max-w-xs text-sm text-night-300">{message}</p>

      <div className="mt-5 w-full max-w-xs rounded-2xl border border-dashed border-white/10 bg-white/[0.04] px-4 py-3">
        <p className="text-[11px] uppercase tracking-wide text-night-400">Reference</p>
        <p className="font-mono text-sm font-bold text-brand-300">{reference}</p>
      </div>

      <div className="mt-8 w-full max-w-xs space-y-3">
        <ButtonLink href={primaryHref} block size="lg">
          {primaryLabel}
        </ButtonLink>
        {onAgain && (
          <Button variant="ghost" block onClick={onAgain}>
            Submit another
          </Button>
        )}
      </div>
    </div>
  );
}
