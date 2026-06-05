"use client";

import React from "react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge, ReviewActions } from "@/components/admin/widgets";
import { useApp } from "@/lib/store";
import { formatDate } from "@/lib/format";

export default function AdminSongsPage() {
  const { singles, setReviewStatus } = useApp();

  return (
    <div>
      <AdminHeader title="Song Submissions Review" subtitle={`${singles.length} singles`} />
      <Panel title="Singles">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="bg-slate-50">
              <tr>
                <Th>Title</Th>
                <Th>Artist</Th>
                <Th>Genre</Th>
                <Th>Files</Th>
                <Th>Submitted</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {singles.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <Td className="font-semibold text-slate-900">{s.title}</Td>
                  <Td>
                    {s.artistName}
                    {s.featuredArtists ? (
                      <span className="block text-xs text-slate-400">ft. {s.featuredArtists}</span>
                    ) : null}
                  </Td>
                  <Td>{s.genre}</Td>
                  <Td className="text-xs text-slate-500">
                    {[s.audioFile && "Audio", s.coverArt && "Cover", s.lyricsFile && "Lyrics"]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </Td>
                  <Td className="text-slate-500">{formatDate(s.submittedAt)}</Td>
                  <Td>
                    <StatusBadge status={s.status} />
                  </Td>
                  <Td>
                    <ReviewActions
                      disabled={s.status === "Approved" || s.status === "Rejected"}
                      onApprove={() => setReviewStatus("single", s.id, "Approved")}
                      onReject={() => setReviewStatus("single", s.id, "Rejected")}
                    />
                  </Td>
                </tr>
              ))}
              {singles.length === 0 && (
                <tr>
                  <Td className="py-8 text-center text-slate-400">No song submissions yet.</Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
