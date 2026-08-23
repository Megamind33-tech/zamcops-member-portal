"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, FolderUp, FileAudio, Image, FileText, File } from "lucide-react";
import { useMemberData } from "@/lib/store";
import { PageHeader } from "@/app/(portal)/(member)/layout";
import { Card } from "@/components/zam/Card";
import { Button } from "@/components/zam/Button";
import { StatusBadge } from "@/components/zam/StatusBadge";
import { FilterChips } from "@/components/zam/FilterChips";
import { EmptyState } from "@/components/zam/Misc";
import { TableShell, Th, Td, Tr } from "@/components/zam/Table";
import { formatDate } from "@/lib/format";
import type { UploadFile, UploadStatus } from "@/types";

const filters: ("All" | UploadStatus)[] = ["All", "Pending", "Processing", "Approved", "Rejected"];

const fileIcon: Record<UploadFile["fileType"], React.ComponentType<{ size?: number }>> = {
  Audio: FileAudio,
  "Cover Art": Image,
  Lyrics: FileText,
  Document: File,
};

export default function UploadsScreen() {
  const { uploads } = useMemberData();
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");

  const shown = useMemo(
    () => uploads.filter((u) => filter === "All" || u.status === filter),
    [uploads, filter]
  );
  const rejected = shown.filter((u) => u.status === "Rejected" && u.rejectionReason);

  const chips = filters.map((f) => ({
    label: f,
    value: f,
    count: f === "All" ? uploads.length : uploads.filter((u) => u.status === f).length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Files" subtitle={`${uploads.length} files attached to your registrations`} />

      <FilterChips chips={chips} active={filter} onChange={(v) => setFilter(v as (typeof filters)[number])} />

      {rejected.map((u) => (
        <div key={u.id} className="rounded-2xl border border-zam-red/30 bg-red-50 p-4">
          <div className="flex items-start gap-2.5 text-sm text-zam-red">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>
              <span className="font-semibold">{u.fileName}</span> was rejected: {u.rejectionReason}
            </span>
          </div>
        </div>
      ))}

      {shown.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FolderUp size={28} />}
            title="No uploads yet"
            description="Files attached to registered works appear here with their review status."
            action={
              <Link href="/submit">
                <Button size="sm">Submit music</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <TableShell>
          <thead>
            <Tr>
              <Th>File</Th>
              <Th>Type</Th>
              <Th>Linked to</Th>
              <Th>Uploaded</Th>
              <Th>Status</Th>
            </Tr>
          </thead>
          <tbody>
            {shown.map((u) => {
              const Icon = fileIcon[u.fileType] ?? File;
              return (
                <Tr key={u.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-zam-canvas text-zam-muted">
                        <Icon size={16} />
                      </span>
                      <span className="font-semibold text-zam-ink">{u.fileName}</span>
                    </div>
                  </Td>
                  <Td className="text-zam-muted">{u.fileType}</Td>
                  <Td className="text-zam-muted">{u.linkedTo || "—"}</Td>
                  <Td className="text-zam-muted">{formatDate(u.uploadedAt)}</Td>
                  <Td>
                    <StatusBadge status={u.status} />
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}
