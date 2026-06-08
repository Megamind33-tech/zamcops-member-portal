"use client";

import React, { useState } from "react";
import { Handshake } from "lucide-react";
import { TopBar } from "@/components/mobile/TopBar";
import { Field, TextInput, TextArea, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { SubmitSuccess } from "@/components/SubmitSuccess";
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
      <>
        <TopBar title="Listed for licensing" back="/licensing" />
        <SubmitSuccess
          title="Added to the licensing pool"
          message={`“${done.title}” is now visible to ZAMCOPS' licensing desk for sync & direct enquiries.`}
          reference="ZAMCOPS LICENSING DESK"
          primaryHref="/licensing"
          primaryLabel="View licensing pool"
        />
      </>
    );
  }

  return (
    <div>
      <TopBar title="List a work" subtitle="Open it to sync & licensing" back="/licensing" />
      <form onSubmit={submit} className="space-y-5 px-4 py-4">
        <section className="card px-4 py-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-700 text-white ring-1 ring-white/15">
              <Handshake size={18} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Which work?</h3>
              <p className="text-[11px] text-night-400">ZAMCOPS will brief enquirers using this title</p>
            </div>
          </div>
          <div className="space-y-3">
            {catalogTitles.length > 0 && (
              <Field label="Quick-fill from your catalog" hint="Optional — picks the title for you">
                <Select value="" onChange={(e) => e.target.value && setWorkTitle(e.target.value)}>
                  <option value="">— Choose from your catalog —</option>
                  {catalogTitles.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Work or song title" required>
              <TextInput placeholder="e.g. Zambezi Sunrise" value={workTitle} onChange={(e) => setWorkTitle(e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="card px-4 py-4">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-white">Usage types you&apos;re open to</h3>
            <p className="text-[11px] text-night-400">Select every kind of licensing enquiry ZAMCOPS may bring you</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {USAGE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleUsage(t)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition",
                  usageTypes.includes(t)
                    ? "bg-accent-500 text-night-950 ring-1 ring-accent-300/30"
                    : "bg-white/[0.06] text-night-300 ring-1 ring-white/10 hover:bg-white/[0.1]"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        <section className="card px-4 py-4">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-white">Terms (optional)</h3>
            <p className="text-[11px] text-night-400">Helps the licensing desk pre-screen enquiries on your behalf</p>
          </div>
          <div className="space-y-3">
            <Field label="Minimum fee (ZMW)" hint="The lowest offer ZAMCOPS should bring to you">
              <TextInput inputMode="decimal" placeholder="e.g. 5000" value={minFee} onChange={(e) => setMinFee(e.target.value)} />
            </Field>
            <Field label="Notes for the licensing desk">
              <TextArea
                rows={3}
                placeholder="e.g. Open to brand campaigns but not political use…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>
        </section>

        {error && (
          <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300">{error}</p>
        )}

        <Button type="submit" block size="lg" disabled={busy}>
          <Handshake size={18} /> {busy ? "Listing…" : "List this work"}
        </Button>
      </form>
    </div>
  );
}
