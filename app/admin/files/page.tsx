"use client";

import React, { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";
import { useAdminData } from "@/lib/adminClient";
import { CoverArt } from "@/components/media/CoverArt";
import { Illustration } from "@/components/media/Illustration";
import { formatDate } from "@/lib/format";
import type { UploadStatus } from "@/types";

const filters: ("All" | UploadStatus)[] = ["All", "Pending", "Processing", "Approved", "Rejected"];

export default function AdminFilesPage() {
  const { uploads, members } = useAdminData();
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const nameFor = (id: string) => members.find((m) => m.id === id)?.fullName ?? "Unknown";
  const shown = uploads.filter((u) => filter === "All" || u.status === filter);

  return (
    <div>
      <AdminHeader title="Uploaded Files" subtitle={`${uploads.length} files across all members`} />
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "rounded-full px-3.5 py-1.5 text-xs font-semibold " +
              (filter === f ? "brand-gradient text-white shadow-fab" : "bg-white/[0.06] text-night-300 ring-1 ring-white/10 hover:text-white")
            }
          >
            {f}
          </button>
        ))}
      </div>
      <Panel title="Files">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-white/[0.03]">
              <tr>
                <Th>File name</Th>
                <Th>Type</Th>
                <Th>Linked to</Th>
                <Th>Member</Th>
                <Th>Uploaded</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {shown.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.03]">
                  <Td className="font-mono text-xs font-semibold text-white">
                    <div className="flex items-center gap-3">
                      <CoverArt seed={u.fileName} size={40} rounded="rounded-lg" />
                      <span>{u.fileName}</span>
                    </div>
                  </Td>
                  <Td>{u.fileType}</Td>
                  <Td className="text-night-300">{u.linkedTo ?? "—"}</Td>
                  <Td>{nameFor(u.ownerId)}</Td>
                  <Td className="text-night-300">{formatDate(u.uploadedAt)}</Td>
                  <Td>
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={u.status} />
                      {u.rejectionReason && (
                        <span className="text-[11px] text-red-300">{u.rejectionReason}</span>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <Td className="py-8 text-center text-night-400">
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
