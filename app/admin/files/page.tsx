"use client";

import React, { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";
import { useAdminData } from "@/lib/adminClient";
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
              (filter === f ? "bg-brand-600 text-white" : "bg-white text-slate-500 shadow-card")
            }
          >
            {f}
          </button>
        ))}
      </div>
      <Panel title="Files">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-50">
              <tr>
                <Th>File name</Th>
                <Th>Type</Th>
                <Th>Linked to</Th>
                <Th>Member</Th>
                <Th>Uploaded</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <Td className="font-mono text-xs font-semibold text-slate-900">{u.fileName}</Td>
                  <Td>{u.fileType}</Td>
                  <Td className="text-slate-500">{u.linkedTo ?? "—"}</Td>
                  <Td>{nameFor(u.ownerId)}</Td>
                  <Td className="text-slate-500">{formatDate(u.uploadedAt)}</Td>
                  <Td>
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={u.status} />
                      {u.rejectionReason && (
                        <span className="text-[11px] text-red-500">{u.rejectionReason}</span>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <Td className="py-8 text-center text-slate-400">No files match this filter.</Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
