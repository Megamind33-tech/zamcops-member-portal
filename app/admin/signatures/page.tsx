"use client";

// Official Signatures — staff upload the transparent PNG signatures that the
// system applies when documents are generated: the General Manager signs
// admission letters, the Board Secretary counter-signs Deeds of Assignment.
// A new upload supersedes the old one for all future documents; already-issued
// PDFs can be re-issued from the member's page.

import React, { useCallback, useEffect, useState } from "react";
import { PenLine, Upload, ShieldCheck, Info } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel } from "@/components/admin/widgets";
import { fileToTransparentPng } from "@/lib/signatureImage";
import { formatDate } from "@/lib/format";

interface SignatureRow {
  office: string;
  officerName: string;
  officerTitle: string;
  image: string;
  updatedAt: string;
  updatedBy: string;
}

const OFFICES = [
  {
    office: "GENERAL_MANAGER",
    label: "General Manager",
    usage: "Signs the admission letter issued to every approved member.",
  },
  {
    office: "BOARD_SECRETARY",
    label: "Board Secretary",
    usage: "Counter-signs the Deed of Assignment for and on behalf of the Society.",
  },
];

export default function AdminSignaturesPage() {
  const [rows, setRows] = useState<SignatureRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/signatures");
    if (res.ok) setRows((await res.json()).signatures);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Official Signatures"
        subtitle="Reusable signatures applied automatically when membership documents are generated."
      />

      <div className="flex items-start gap-3 rounded-2xl border border-zam-blue/25 bg-zam-blue/5 p-4">
        <Info size={18} className="mt-0.5 shrink-0 text-zam-blue" />
        <p className="text-sm text-zam-muted">
          Upload each officer&apos;s signature once — the system places it on every document that requires it.
          Replacing a signature affects documents generated from that moment on; use{" "}
          <strong className="text-zam-ink">Regenerate documents</strong> on a member&apos;s page to re-issue existing
          PDFs. These images are never exposed to members directly — they only appear inside the rendered documents.
        </p>
      </div>

      {loading ? (
        <div className="grid h-48 place-items-center">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-zam-line border-t-zam-orange" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {OFFICES.map((o) => (
            <SignatureCard
              key={o.office}
              office={o.office}
              label={o.label}
              usage={o.usage}
              current={rows.find((r) => r.office === o.office)}
              onSaved={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SignatureCard({
  office, label, usage, current, onSaved,
}: {
  office: string;
  label: string;
  usage: string;
  current?: SignatureRow;
  onSaved: () => Promise<void>;
}) {
  const [officerName, setOfficerName] = useState(current?.officerName ?? "");
  const [officerTitle, setOfficerTitle] = useState(current?.officerTitle ?? label.toUpperCase());
  const [image, setImage] = useState(""); // newly chosen image (pending save)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (current) {
      setOfficerName(current.officerName);
      setOfficerTitle(current.officerTitle);
    }
  }, [current]);

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    try {
      setImage(await fileToTransparentPng(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process that image.");
    }
  };

  const save = async () => {
    setError("");
    setSaved(false);
    if (!officerName.trim()) return setError("Enter the officer's name.");
    if (!image && !current?.image) return setError("Choose a signature image.");
    setBusy(true);
    const res = await fetch("/api/admin/signatures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ office, officerName, officerTitle, image: image || current?.image }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return setError(d.error || "Could not save the signature.");
    }
    setImage("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    await onSaved();
  };

  const preview = image || current?.image || "";

  return (
    <Panel
      title={label}
      right={
        current ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zam-green/12 px-2.5 py-1 text-[11px] font-semibold text-zam-green ring-1 ring-zam-green/25">
            <ShieldCheck size={12} /> On file
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zam-amber/15 px-2.5 py-1 text-[11px] font-semibold text-[#9a6a00] ring-1 ring-zam-amber/30">
            Missing
          </span>
        )
      }
    >
      <div className="space-y-4 p-5">
        <p className="text-sm text-zam-muted">{usage}</p>

        {/* Preview on a checkerboard so transparency is visible */}
        <div
          className="grid h-32 place-items-center rounded-2xl border border-zam-line"
          style={{
            backgroundImage:
              "linear-gradient(45deg,#f1f3f6 25%,transparent 25%,transparent 75%,#f1f3f6 75%),linear-gradient(45deg,#f1f3f6 25%,transparent 25%,transparent 75%,#f1f3f6 75%)",
            backgroundSize: "16px 16px",
            backgroundPosition: "0 0, 8px 8px",
          }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={`${label} signature`} className="max-h-24 w-auto max-w-[80%] object-contain" />
          ) : (
            <span className="flex items-center gap-2 text-sm text-zam-muted">
              <PenLine size={16} /> No signature uploaded yet
            </span>
          )}
        </div>
        {image && <p className="text-xs font-semibold text-zam-orange">New image selected — save to apply it.</p>}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-zam-ink">Officer&apos;s name</span>
            <input
              value={officerName}
              onChange={(e) => setOfficerName(e.target.value)}
              placeholder="e.g. Mirrias Siamutundo"
              className="h-11 w-full rounded-xl border border-zam-line bg-white px-3.5 text-sm text-zam-ink focus:border-zam-orange focus:outline-none focus:ring-2 focus:ring-zam-orange/20"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-zam-ink">Title</span>
            <input
              value={officerTitle}
              onChange={(e) => setOfficerTitle(e.target.value)}
              className="h-11 w-full rounded-xl border border-zam-line bg-white px-3.5 text-sm text-zam-ink focus:border-zam-orange focus:outline-none focus:ring-2 focus:ring-zam-orange/20"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-zam-line bg-white px-4 text-sm font-semibold text-zam-ink transition hover:bg-zam-canvas">
            <Upload size={15} /> {preview ? "Choose a new image" : "Choose image"}
            <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={pick} />
          </label>
          <button
            onClick={save}
            disabled={busy}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-zam-orange px-4 text-sm font-semibold text-white transition hover:bg-zam-orange-dark disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save signature"}
          </button>
          {saved && <span className="text-xs font-semibold text-zam-green">Saved.</span>}
        </div>
        <p className="text-xs text-zam-muted">
          Upload a photo or scan on a white background — the background is made transparent automatically.
          {current && (
            <>
              {" "}
              Last updated {formatDate(current.updatedAt)}
              {current.updatedBy ? ` by ${current.updatedBy}` : ""}.
            </>
          )}
        </p>
        {error && <p className="text-sm font-medium text-zam-red">{error}</p>}
      </div>
    </Panel>
  );
}
