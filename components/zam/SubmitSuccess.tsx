"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Download, ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/zam/Button";
import { formatDateTime } from "@/lib/format";

export function SubmitSuccess({
  title,
  kind,
  reference,
  primaryTo = "/works",
}: {
  title: string;
  kind: string;
  reference: string;
  primaryTo?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-lg py-6"
    >
      <div className="text-center">
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zam-green-soft text-zam-green"
        >
          <CheckCircle2 className="h-9 w-9" />
        </motion.span>
        <h1 className="font-display text-2xl font-bold text-zam-ink">Submission received</h1>
        <p className="mt-1.5 text-sm text-zam-muted">
          Your {kind.toLowerCase()} is now pending review by the ZAMCOPS team.
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zam-line bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-dashed border-zam-line px-5 py-4">
          <Logo size={22} onDark={false} />
          <span className="text-xs font-semibold uppercase tracking-wide text-zam-muted">Submission Receipt</span>
        </div>
        <div className="space-y-3 p-5 text-sm">
          <Row label="Reference" value={<span className="font-mono font-semibold text-zam-ink">{reference}</span>} />
          <Row label="Type" value={kind} />
          <Row label="Title" value={<span className="font-semibold text-zam-ink">{title}</span>} />
          <Row label="Status" value={<span className="font-semibold text-zam-amber">Pending review</span>} />
          <Row label="Submitted" value={formatDateTime(new Date().toISOString())} />
        </div>
        <div className="border-t border-dashed border-zam-line bg-zam-canvas px-5 py-4">
          <Button variant="secondary" size="sm" icon={<Download className="h-4 w-4" />} className="w-full">
            Download receipt (PDF)
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link href={primaryTo} className="flex-1">
          <Button variant="secondary" className="w-full">
            View my works
          </Button>
        </Link>
        <Link href="/submit" className="flex-1">
          <Button className="w-full" icon={<ArrowRight className="h-4 w-4" />}>
            Make another submission
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-zam-muted">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
