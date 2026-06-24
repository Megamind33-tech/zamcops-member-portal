"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Handshake, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/app/(portal)/(member)/layout";
import { Card, CardHeader } from "@/components/zam/Card";
import { Field, Input, Textarea, Select } from "@/components/zam/Input";
import { Button } from "@/components/zam/Button";
import { useApp, useMemberData } from "@/lib/store";
import { cn } from "@/lib/format";
import type { LicenseUsageType } from "@/types";

const USAGE_TYPES: LicenseUsageType[] = ["Film & TV", "Advertising", "Online content", "Live events", "Other"];

export default function NewLicensableWorkScreen() {
  const { addLicensableWork } = useApp();
  const { works, singles, albums } = useMemberData();
  const [done, setDone] = useState<{ title: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [workTitle, setWorkTitle] = useState("");
  const [usageTypes, setUsageTypes] = useState<LicenseUsageType[]>([]);
  const [minFee, setMinFee] = useState("");
  const [notes, setNotes] = useState("");

  const catalogTitles = Array.from(
    new Set([...works.map((w) => w.title), ...singles.map((s) => s.title), ...albums.map((a) => a.title)])
  ).filter(Boolean);

  const toggleUsage = (t: LicenseUsageType) =>
    setUsageTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!workTitle.trim()) return setError("Choose a work to list.");
    if (usageTypes.length === 0) return setError("Pick at least one usage type you're open to.");
    setBusy(true);
    const res = await addLicensableWork({
      workTitle,
      usageTypes,
      minFee: minFee.trim() ? Number(minFee) : undefined,
      notes,
    });
    setBusy(false);
    if (res.ok && res.item) setDone({ title: res.item.workTitle });
    else setError(res.error || "Could not list this work.");
  };

  if (done) {
    return (
      <div className="mx-auto max-w-lg py-6 text-center">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zam-green-soft text-zam-green">
          <CheckCircle2 className="h-9 w-9" />
        </span>
        <h1 className="font-display text-2xl font-bold text-zam-ink">Added to the licensing pool</h1>
        <p className="mt-1.5 text-sm text-zam-muted">
          “{done.title}” is now visible to the ZAMCOPS licensing desk for sync &amp; direct enquiries.
        </p>
        <div className="mt-6 flex justify-center">
          <Link href="/licensing">
            <Button>View licensing pool</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/licensing"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-zam-muted hover:text-zam-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to licensing
      </Link>
      <PageHeader title="List a work" subtitle="Open it to sync & licensing enquiries." />

      <form onSubmit={submit} className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader title="Which work?" description="ZAMCOPS will brief enquirers using this title" />
          <div className="space-y-4 p-5">
            {catalogTitles.length > 0 && (
              <Field label="Quick-fill from your catalogue" hint="Optional — picks the title for you">
                <Select value="" onChange={(e) => e.target.value && setWorkTitle(e.target.value)}>
                  <option value="">— Choose from your catalogue —</option>
                  {catalogTitles.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Work or song title" required>
              <Input placeholder="e.g. Zambezi Sunrise" value={workTitle} onChange={(e) => setWorkTitle(e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Usage types you're open to" description="Select every kind of licensing enquiry ZAMCOPS may bring you" />
          <div className="flex flex-wrap gap-2 p-5">
            {USAGE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleUsage(t)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
                  usageTypes.includes(t)
                    ? "border-zam-orange bg-zam-orange text-white"
                    : "border-zam-line bg-white text-zam-muted hover:bg-zam-canvas hover:text-zam-ink"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Terms (optional)" description="Helps the licensing desk pre-screen enquiries on your behalf" />
          <div className="space-y-4 p-5">
            <Field label="Minimum fee (ZMW)" hint="The lowest offer ZAMCOPS should bring to you">
              <Input inputMode="decimal" placeholder="e.g. 5000" value={minFee} onChange={(e) => setMinFee(e.target.value)} />
            </Field>
            <Field label="Notes for the licensing desk">
              <Textarea
                placeholder="e.g. Open to brand campaigns but not political use…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>
        </Card>

        {error && <p className="text-sm text-zam-red">{error}</p>}

        <Button type="submit" size="lg" className="w-full" loading={busy} icon={<Handshake className="h-4 w-4" />}>
          List this work
        </Button>
      </form>
    </div>
  );
}
