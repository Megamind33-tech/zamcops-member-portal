"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge, ReviewActions } from "@/components/admin/widgets";
import { useAdminData } from "@/lib/adminClient";
import { CoverArt } from "@/components/media/CoverArt";
import { Illustration } from "@/components/media/Illustration";
import { formatDate } from "@/lib/format";

export default function AdminAlbumsPage() {
  const { albums, setReviewStatus, deleteSubmission } = useAdminData();

  const del = async (id: string, title: string) => {
    if (!window.confirm(`Permanently delete the album “${title}”? This can't be undone.`)) return;
    await deleteSubmission("album", id);
  };

  return (
    <div>
      <AdminHeader title="Album Submissions Review" subtitle={`${albums.length} albums`} />
      <Panel title="Albums">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-white/[0.03]">
              <tr>
                <Th>Album</Th>
                <Th>Artist</Th>
                <Th>Tracks</Th>
                <Th>Release</Th>
                <Th>Submitted</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {albums.map((a) => (
                <tr key={a.id} className="align-top hover:bg-white/[0.03]">
                  <Td className="font-semibold text-white">
                    <div className="flex items-center gap-3">
                      {a.coverArt ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.coverArt} alt={`${a.title} cover`} className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-zam-line" />
                      ) : (
                        <CoverArt seed={a.title} size={40} rounded="rounded-lg" />
                      )}
                      <div className="min-w-0">
                        {a.title}
                        <span className="mt-1 block text-xs font-normal text-night-400">
                          {a.tracks.map((t) => t.title).join(" · ")}
                        </span>
                      </div>
                    </div>
                  </Td>
                  <Td>{a.artistName}</Td>
                  <Td>{a.tracks.length}</Td>
                  <Td className="text-night-300">{a.releaseDate ? formatDate(a.releaseDate) : "—"}</Td>
                  <Td className="text-night-300">{formatDate(a.submittedAt)}</Td>
                  <Td>
                    <StatusBadge status={a.status} />
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-2">
                      <ReviewActions
                        disabled={a.status === "Approved" || a.status === "Rejected"}
                        onApprove={() => setReviewStatus("album", a.id, "Approved")}
                        onReject={(reason) => setReviewStatus("album", a.id, "Rejected", reason)}
                      />
                      <button
                        onClick={() => del(a.id, a.title)}
                        title="Delete album"
                        className="inline-flex items-center gap-1 rounded-lg bg-zam-red/10 px-2.5 py-1.5 text-xs font-semibold text-zam-red transition hover:bg-zam-red/20"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
              {albums.length === 0 && (
                <tr>
                  <Td className="py-8 text-center text-night-400">
                    <div className="flex flex-col items-center gap-3">
                      <Illustration name="vinyl" />
                      <span>No album submissions yet.</span>
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
