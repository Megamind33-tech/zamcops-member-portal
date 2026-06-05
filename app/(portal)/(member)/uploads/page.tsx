"use client";

import React, { useState } from "react";
import { FileAudio, FileImage, FileText, FileBox, AlertCircle, UploadCloud } from "lucide-react";
import { TopBar } from "@/components/mobile/TopBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Misc";
import { ButtonLink } from "@/components/ui/Button";
import { useMemberData } from "@/lib/store";
import { formatDate } from "@/lib/format";
import type { UploadFile, UploadStatus } from "@/types";

const filters: ("All" | UploadStatus)[] = ["All", "Pending", "Processing", "Approved", "Rejected"];

const typeIcon: Record<UploadFile["fileType"], React.ComponentType<{ size?: number }>> = {
  Audio: FileAudio,
  "Cover Art": FileImage,
  Lyrics: FileText,
  Document: FileBox,
};

export default function UploadsScreen() {
  const { uploads } = useMemberData();
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const shown = uploads.filter((u) => filter === "All" || u.status === filter);

  return (
    <div>
      <TopBar title="Music Uploads" subtitle={`${uploads.length} files`} back="/dashboard" />

      <div className="px-4 py-4">
        <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition " +
                (filter === f ? "bg-brand-600 text-white" : "bg-white text-slate-500 shadow-card")
              }
            >
              {f}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <EmptyState
            icon={<UploadCloud size={22} />}
            title="No uploads yet"
            message="Files you attach to singles and albums appear here with their processing status."
            action={
              <ButtonLink href="/submit" size="sm">
                Submit music
              </ButtonLink>
            }
          />
        ) : (
          <div className="space-y-3">
            {shown.map((u) => {
              const Icon = typeIcon[u.fileType];
              return (
                <div key={u.id} className="card px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                        <Icon size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-brand-900">{u.fileName}</p>
                        <p className="truncate text-xs text-slate-500">
                          {u.fileType}
                          {u.linkedTo ? ` · ${u.linkedTo}` : ""} · {formatDate(u.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={u.status} />
                  </div>
                  {u.status === "Rejected" && u.rejectionReason && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <span>{u.rejectionReason}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
