"use client";

import React from "react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge, ReviewActions } from "@/components/admin/widgets";
import { useAdminData } from "@/lib/adminClient";
import { formatDate } from "@/lib/format";

export default function AdminAlbumsPage() {
  const { albums, setReviewStatus } = useAdminData();

  return (
    <div>
      <AdminHeader title="Album Submissions Review" subtitle={`${albums.length} albums`} />
      <Panel title="Albums">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-50">
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
            <tbody className="divide-y divide-slate-100">
              {albums.map((a) => (
                <tr key={a.id} className="align-top hover:bg-slate-50">
                  <Td className="font-semibold text-slate-900">
                    {a.title}
                    <span className="mt-1 block text-xs font-normal text-slate-400">
                      {a.tracks.map((t) => t.title).join(" · ")}
                    </span>
                  </Td>
                  <Td>{a.artistName}</Td>
                  <Td>{a.tracks.length}</Td>
                  <Td className="text-slate-500">{a.releaseDate ? formatDate(a.releaseDate) : "—"}</Td>
                  <Td className="text-slate-500">{formatDate(a.submittedAt)}</Td>
                  <Td>
                    <StatusBadge status={a.status} />
                  </Td>
                  <Td>
                    <ReviewActions
                      disabled={a.status === "Approved" || a.status === "Rejected"}
                      onApprove={() => setReviewStatus("album", a.id, "Approved")}
                      onReject={() => setReviewStatus("album", a.id, "Rejected")}
                    />
                  </Td>
                </tr>
              ))}
              {albums.length === 0 && (
                <tr>
                  <Td className="py-8 text-center text-slate-400">No album submissions yet.</Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
