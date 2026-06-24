"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Check, X, Ban, RotateCcw, Music2, FileText, Disc3,
  Paperclip, Trash2, IdCard, MapPin, Wallet, Users, FilePlus2,
} from "lucide-react";
import { Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";
import { Field, TextInput, Select, FilePicker } from "@/components/ui/Field";
import { useAdminData } from "@/lib/adminClient";
import { formatDate, initials } from "@/lib/format";
import type { MemberDocType } from "@/types";

const DOC_TYPES: MemberDocType[] = ["Clearance Letter", "Deed of Assignment", "Contract", "ID Document", "Other"];

export default function AdminMemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    members, singles, works, albums, uploads, memberDocuments,
    setMemberStatus, attachDocument, removeDocument, loading,
  } = useAdminData();

  const member = members.find((m) => m.id === id);
  const mSingles = singles.filter((s) => s.ownerId === id);
  const mWorks = works.filter((w) => w.ownerId === id);
  const mAlbums = albums.filter((a) => a.ownerId === id);
  const mUploads = uploads.filter((u) => u.ownerId === id);
  const mDocs = memberDocuments.filter((d) => d.ownerId === id);

  const [busy, setBusy] = useState(false);
  const act = async (status: string) => {
    setBusy(true);
    await setMemberStatus(id, status);
    setBusy(false);
  };

  if (loading && !member) {
    return <div className="grid h-64 place-items-center"><span className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-brand-400" /></div>;
  }
  if (!member) {
    return (
      <div className="py-16 text-center text-night-300">
        <p>Member not found.</p>
        <Link href="/admin/members" className="mt-3 inline-block text-accent-300">← Back to members</Link>
      </div>
    );
  }

  const s = member.membershipStatus;

  return (
    <div className="space-y-6">
      <Link href="/admin/members" className="inline-flex items-center gap-1.5 text-sm font-semibold text-night-300 hover:text-white">
        <ArrowLeft size={16} /> All members
      </Link>

      {/* Header */}
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-500 text-lg font-bold text-night-950">
            {initials(member.stageName || member.fullName)}
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-white">{member.fullName}</h1>
            <p className="text-sm text-night-300">
              {member.stageName ? `${member.stageName} · ` : ""}{member.role} · <span className="font-mono">{member.memberNumber}</span>
            </p>
            <div className="mt-1.5"><StatusBadge status={s} /></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(s === "Pending" || s === "Rejected") && <Btn tone="approve" busy={busy} onClick={() => act("Active")} icon={<Check size={15} />} label="Approve" />}
          {s === "Pending" && <Btn tone="reject" busy={busy} onClick={() => act("Rejected")} icon={<X size={15} />} label="Reject" />}
          {s === "Active" && <Btn tone="reject" busy={busy} onClick={() => act("Suspended")} icon={<Ban size={15} />} label="Suspend" />}
          {(s === "Suspended" || s === "Lapsed") && <Btn tone="approve" busy={busy} onClick={() => act("Active")} icon={<RotateCcw size={15} />} label="Reactivate" />}
        </div>
      </div>

      {/* Profile / KYC */}
      <Panel title="Profile & KYC">
        <div className="grid gap-x-8 gap-y-1 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Group icon={<IdCard size={14} />} title="Identity">
            <Row label="Full name" value={member.fullName} />
            <Row label="Stage name" value={member.stageName} />
            <Row label="NRC / passport" value={member.nrcOrPassport} />
            <Row label="Date of birth" value={member.dateOfBirth} />
            <Row label="Gender" value={member.gender} />
          </Group>
          <Group icon={<MapPin size={14} />} title="Contact & location">
            <Row label="Email" value={member.email} />
            <Row label="Phone" value={member.phone} />
            <Row label="Province" value={member.province} />
            <Row label="District" value={member.district} />
            <Row label="Address" value={member.address} />
          </Group>
          <Group icon={<Wallet size={14} />} title="Payout">
            <Row label="Bank" value={member.bankName} />
            <Row label="Account" value={member.bankAccount} />
            <Row label="Mobile money" value={member.mobileMoneyNumber} />
            <Row label="Joined" value={formatDate(member.joinedAt)} />
          </Group>
          <Group icon={<Users size={14} />} title="Next of kin">
            <Row label="Name" value={member.nextOfKinName} />
            <Row label="Phone" value={member.nextOfKinPhone} />
          </Group>
        </div>
      </Panel>

      {/* Songs / Works / Albums */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ListPanel title="Submitted Songs" icon={<Music2 size={15} />} count={mSingles.length}
          rows={mSingles.map((x) => ({ id: x.id, main: x.title, sub: `${x.genre}${x.featuredArtists ? ` · ft. ${x.featuredArtists}` : ""}`, status: x.status }))} />
        <ListPanel title="Work Declarations" icon={<FileText size={15} />} count={mWorks.length}
          rows={mWorks.map((x) => ({ id: x.id, main: x.title, sub: `${x.workType} · ${x.genre}`, status: x.status }))} />
        <ListPanel title="Albums" icon={<Disc3 size={15} />} count={mAlbums.length}
          rows={mAlbums.map((x) => ({ id: x.id, main: x.title, sub: `${x.tracks.length} tracks`, status: x.status }))} />
        <ListPanel title="Uploaded Files" icon={<Paperclip size={15} />} count={mUploads.length}
          rows={mUploads.map((x) => ({ id: x.id, main: x.fileName, sub: `${x.fileType}${x.linkedTo ? ` · ${x.linkedTo}` : ""}`, status: x.status }))} />
      </div>

      {/* Documents */}
      <DocumentsPanel
        docs={mDocs}
        onAttach={(p) => attachDocument({ ownerId: id, ...p })}
        onRemove={removeDocument}
      />
    </div>
  );
}

function Btn({ tone, busy, onClick, icon, label }: { tone: "approve" | "reject"; busy: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  const tones = { approve: "bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/25", reject: "bg-red-400/15 text-red-300 hover:bg-red-400/25" };
  return (
    <button onClick={onClick} disabled={busy} className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-40 ${tones[tone]}`}>
      {icon} {label}
    </button>
  );
}

function Group({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="py-2">
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-night-400">{icon} {title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-night-400">{label}</span>
      <span className="text-right font-medium text-white">{value?.trim() ? value : "—"}</span>
    </div>
  );
}

function ListPanel({ title, icon, count, rows }: { title: string; icon: React.ReactNode; count: number; rows: { id: string; main: string; sub: string; status: string }[] }) {
  return (
    <Panel title={`${title} (${count})`}>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-night-400">Nothing submitted yet.</p>
      ) : (
        <div className="divide-y divide-white/[0.06]">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-brand-200">{icon}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{r.main}</p>
                <p className="truncate text-xs text-night-400">{r.sub}</p>
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function DocumentsPanel({
  docs,
  onAttach,
  onRemove,
}: {
  docs: { id: string; docType: string; fileName: string; reference?: string; note?: string; uploadedAt: string }[];
  onAttach: (p: { docType: string; fileName: string; reference?: string; note?: string }) => Promise<{ ok: boolean; error?: string }>;
  onRemove: (id: string) => void;
}) {
  const [docType, setDocType] = useState<MemberDocType>("Clearance Letter");
  const [fileName, setFileName] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fileName.trim()) return setError("Choose a file to attach.");
    setBusy(true);
    const res = await onAttach({ docType, fileName, reference, note });
    setBusy(false);
    if (!res.ok) return setError(res.error || "Could not attach.");
    setFileName(""); setReference(""); setNote(""); setDocType("Clearance Letter");
  };

  return (
    <Panel title={`Official Documents (${docs.length})`}>
      <div className="grid gap-6 p-5 lg:grid-cols-2">
        {/* Existing docs */}
        <div className="space-y-2">
          {docs.length === 0 && <p className="text-sm text-night-400">No documents attached yet.</p>}
          {docs.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/[0.06]">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-500/15 text-brand-200"><FileText size={16} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{d.docType}</p>
                <p className="truncate text-xs text-night-400">
                  {d.fileName}{d.reference ? ` · ${d.reference}` : ""} · {formatDate(d.uploadedAt)}
                </p>
                {d.note && <p className="truncate text-xs text-night-500">{d.note}</p>}
              </div>
              <button onClick={() => onRemove(d.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-night-400 hover:bg-red-400/15 hover:text-red-300" aria-label="Remove document">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        {/* Attach form */}
        <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
          <p className="flex items-center gap-1.5 text-sm font-bold text-white"><FilePlus2 size={15} /> Attach a document</p>
          <Field label="Document type">
            <Select value={docType} onChange={(e) => setDocType(e.target.value as MemberDocType)}>
              {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          <FilePicker label="File" accept=".pdf,.doc,.docx,image/*" value={fileName} onPick={setFileName} hint="PDF or scanned document" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reference"><TextInput placeholder="e.g. DOA-2026-014" value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
            <Field label="Note"><TextInput placeholder="Optional" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          </div>
          {error && <p className="text-xs font-medium text-red-300">{error}</p>}
          <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 py-2.5 text-sm font-semibold text-night-950 hover:bg-accent-400 disabled:opacity-50">
            <Paperclip size={15} /> {busy ? "Attaching…" : "Attach document"}
          </button>
        </form>
      </div>
    </Panel>
  );
}
