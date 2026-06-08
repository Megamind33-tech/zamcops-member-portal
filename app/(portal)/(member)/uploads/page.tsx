"use client";

import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { TopBar } from "@/components/mobile/TopBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Misc";
import { ButtonLink } from "@/components/ui/Button";
import { CoverArt } from "@/components/media/CoverArt";
import { Illustration } from "@/components/media/Illustration";
import { useMemberData } from "@/lib/store";
import { formatDate } from "@/lib/format";
import type { UploadStatus } from "@/types";

const filters: ("All" | UploadStatus)[] = ["All", "Pending", "Processing", "Approved", "Rejected"];

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
                (filter === f ? "brand-gradient text-white shadow-fab ring-1 ring-white/10" : "border border-white/10 bg-white/[0.05] text-night-300 hover:bg-white/[0.08]")
              }
            >
              {f}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <EmptyState
            art={<Illustration name="upload" />}
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
              return (
                <div key={u.id} className="card px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <CoverArt seed={u.fileName} size={44} rounded="rounded-xl" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{u.fileName}</p>
                        <p className="truncate text-xs text-night-400">
                          {u.fileType}
                          {u.linkedTo ? ` · ${u.linkedTo}` : ""} · {formatDate(u.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={u.status} />
                  </div>
                  {u.status === "Rejected" && u.rejectionReason && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
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
