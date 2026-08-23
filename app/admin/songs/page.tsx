"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge, ReviewActions } from "@/components/admin/widgets";
import { useAdminData } from "@/lib/adminClient";
import { CoverArt } from "@/components/media/CoverArt";
import { Illustration } from "@/components/media/Illustration";
import { formatDate } from "@/lib/format";

export default function AdminSongsPage() {
  const { singles, setReviewStatus, deleteSubmission } = useAdminData();

  const del = async (id: string, title: string) => {
    if (!window.confirm(`Permanently delete the single “${title}”? This can't be undone.`)) return;
    await deleteSubmission("single", id);
  };

  return (
    <div>
      <AdminHeader title="Song registrations" subtitle={`${singles.length} songs with artwork`} />
      <Panel title="Singles">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="bg-white/[0.03]">
              <tr>
                <Th>Title</Th>
                <Th>Performed by</Th>
                <Th>Genre</Th>
                <Th>Files</Th>
                <Th>Submitted</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {singles.map((s) => (
                <tr key={s.id} className="hover:bg-white/[0.03]">
                  <Td className="font-semibold text-white">
                    <div className="flex items-center gap-3">
                      <CoverArt src={s.coverArt} seed={s.title} size={40} rounded="rounded-lg" />
                      <span>{s.title}</span>
                    </div>
                  </Td>
                  <Td>
                    {s.artistName || "—"}
                  </Td>
                  <Td>{s.genre}</Td>
                  <Td className="text-xs text-night-300">
                    {[s.audioFile && "Audio", s.coverArt && "Cover", s.lyricsFile && "Lyrics"]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </Td>
                  <Td className="text-night-300">{formatDate(s.submittedAt)}</Td>
                  <Td>
                    <StatusBadge status={s.status} />
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-2">
                      <ReviewActions
                        disabled={s.status === "Approved" || s.status === "Rejected"}
                        onApprove={() => setReviewStatus("single", s.id, "Approved")}
                        onReject={(reason) => setReviewStatus("single", s.id, "Rejected", reason)}
                        onUnderReview={() => setReviewStatus("single", s.id, "Under Review")}
                      />
                      <button
                        onClick={() => del(s.id, s.title)}
                        title="Delete single"
                        className="inline-flex items-center gap-1 rounded-lg bg-zam-red/10 px-2.5 py-1.5 text-xs font-semibold text-zam-red transition hover:bg-zam-red/20"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
              {singles.length === 0 && (
                <tr>
                  <Td className="py-8 text-center text-night-400">
                    <div className="flex flex-col items-center gap-3">
                      <Illustration name="waveform" />
                      <span>No song submissions yet.</span>
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
