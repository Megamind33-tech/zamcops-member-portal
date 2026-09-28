"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Download, Search, X } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge, ReviewActions } from "@/components/admin/widgets";
import { useAdminData } from "@/lib/adminClient";
import { CoverArt } from "@/components/media/CoverArt";
import { Illustration } from "@/components/media/Illustration";
import { formatDate } from "@/lib/format";
import type { UploadStatus } from "@/types";

const filters: ("All" | UploadStatus)[] = ["All", "Pending", "Processing", "Approved", "Rejected"];

export default function AdminFilesPage() {
  const { uploads, members, setFileStatus } = useAdminData();
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const nameFor = (id: string) => members.find((m) => m.id === id)?.fullName ?? "Unknown";

  // This list is every file from every member — a society with a few thousand
  // submissions makes scrolling it to find one artist's file impractical.
  // Their Uploaded Files section on their own member page is the intended way
  // to find a specific artist's paperwork now; this search is a fallback for
  // when only the file or member name is known and not which member page to
  // open.
  const needle = q.trim().toLowerCase();
  const shown = uploads.filter((u) => {
    if (filter !== "All" && u.status !== filter) return false;
    if (!needle) return true;
    return (
      u.fileName.toLowerCase().includes(needle) ||
      (u.linkedTo ?? "").toLowerCase().includes(needle) ||
      nameFor(u.ownerId).toLowerCase().includes(needle)
    );
  });

  const act = async (id: string, status: "Approved" | "Rejected") => {
    setBusyId(id);
    await setFileStatus(id, status);
    setBusyId(null);
  };

  return (
    <div>
      <AdminHeader title="Uploaded Files" subtitle={`${uploads.length} files across all members`} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "rounded-full px-3.5 py-1.5 text-xs font-semibold " +
              (filter === f ? "bg-zam-orange text-white ring-1 ring-zam-orange" : "bg-zam-canvas text-zam-muted ring-1 ring-zam-line hover:text-zam-ink")
            }
          >
            {f}
          </button>
        ))}
        {/* A specific artist's files are better found on their own member
            page (Documents & Files there); this is for when only the file
            name or the member's name is known. */}
        <div className="relative ml-auto w-full max-w-[260px]">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zam-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search file or member name…"
            className="w-full rounded-full bg-zam-canvas py-1.5 pl-8 pr-7 text-xs ring-1 ring-zam-line placeholder:text-zam-muted focus:outline-none focus:ring-zam-orange"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zam-muted hover:text-zam-ink"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>
      <Panel title="Files">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-zam-canvas">
              <tr>
                <Th>File name</Th>
                <Th>Type</Th>
                <Th>Linked to</Th>
                <Th>Member</Th>
                <Th>Uploaded</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zam-line">
              {shown.map((u) => (
                <tr key={u.id} className="hover:bg-zam-canvas">
                  <Td className="font-mono text-xs font-semibold text-zam-ink">
                    <div className="flex items-start gap-3">
                      <CoverArt seed={u.fileName} size={40} rounded="rounded-lg" />
                      <div className="min-w-0">
                        <span className="block max-w-[240px] truncate">{u.fileName}</span>
                        {u.fileSize ? (
                          <span className="block text-[11px] font-sans font-normal text-zam-muted">
                            {(u.fileSize / 1024 / 1024).toFixed(2)} MB
                          </span>
                        ) : null}
                        {u.hasFile && u.fileType === "Audio" && (
                          <audio
                            controls
                            preload="none"
                            src={`/api/admin/files/${u.id}`}
                            className="mt-2 h-8 w-[240px] max-w-full"
                          />
                        )}
                      </div>
                    </div>
                  </Td>
                  <Td>{u.fileType}</Td>
                  <Td className="text-zam-muted">{u.linkedTo ?? "—"}</Td>
                  <Td>
                    <Link href={`/admin/members/${u.ownerId}`} className="font-semibold text-zam-orange hover:underline">
                      {nameFor(u.ownerId)}
                    </Link>
                  </Td>
                  <Td className="text-zam-muted">{formatDate(u.uploadedAt)}</Td>
                  <Td>
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={u.status} />
                      {u.rejectionReason && (
                        <span className="text-[11px] text-zam-red">{u.rejectionReason}</span>
                      )}
                    </div>
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {u.hasFile && (
                        <a
                          href={`/api/admin/files/${u.id}?download=1`}
                          className="inline-flex items-center gap-1 rounded-lg bg-zam-canvas px-2.5 py-1.5 text-xs font-semibold text-zam-ink ring-1 ring-zam-line transition hover:bg-white"
                        >
                          <Download size={14} /> Download
                        </a>
                      )}
                      {u.status === "Pending" || u.status === "Processing" ? (
                        <ReviewActions
                          disabled={busyId === u.id}
                          onApprove={() => act(u.id, "Approved")}
                          onReject={() => act(u.id, "Rejected")}
                        />
                      ) : (
                        !u.hasFile && <span className="text-xs italic text-zam-muted">No actions</span>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <Td colSpan={7} className="py-8 text-center text-zam-muted">
                    <div className="flex flex-col items-center gap-3">
                      <Illustration name="upload" />
                      <span>No files match this filter.</span>
                    </div>
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
