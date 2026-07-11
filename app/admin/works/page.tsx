"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge, ReviewActions } from "@/components/admin/widgets";
import { useAdminData } from "@/lib/adminClient";
import { CoverArt } from "@/components/media/CoverArt";
import { Illustration } from "@/components/media/Illustration";
import { formatDate } from "@/lib/format";

export default function AdminWorksPage() {
  const { works, members, setReviewStatus, deleteSubmission } = useAdminData();
  const nameFor = (id: string) => members.find((m) => m.id === id)?.fullName ?? "Unknown";

  const del = async (id: string, title: string) => {
    if (!window.confirm(`Permanently delete the declaration “${title}”? This removes it from the member's repertoire and can't be undone.`))
      return;
    await deleteSubmission("work", id);
  };

  return (
    <div>
      <AdminHeader title="Work Declarations Review" subtitle={`${works.length} declarations`} />
      <Panel title="Declarations">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="bg-white/[0.03]">
              <tr>
                <Th>Title</Th>
                <Th>Type</Th>
                <Th>Declared by</Th>
                <Th>Splits</Th>
                <Th>Submitted</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {works.map((w) => (
                <tr key={w.id} className="hover:bg-white/[0.03]">
                  <Td className="font-semibold text-white">
                    <div className="flex items-center gap-3">
                      <CoverArt seed={w.title} size={40} rounded="rounded-lg" />
                      <div className="min-w-0">
                        {w.title}
                        <span className="block text-xs font-normal text-night-400">
                          {w.genre} · {w.language}
                        </span>
                      </div>
                    </div>
                  </Td>
                  <Td>{w.workType}</Td>
                  <Td>{nameFor(w.ownerId)}</Td>
                  <Td className="text-xs text-night-300">
                    {w.ownershipSplits
                      .map((s) => `${s.party} ${s.percentage}%${s.ipiNumber ? ` · IPI ${s.ipiNumber}` : ""}`)
                      .join(", ")}
                  </Td>
                  <Td className="text-night-300">{formatDate(w.submittedAt)}</Td>
                  <Td>
                    <StatusBadge status={w.status} />
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-2">
                      <ReviewActions
                        disabled={w.status === "Approved" || w.status === "Rejected"}
                        onApprove={() => setReviewStatus("work", w.id, "Approved")}
                        onReject={(reason) => setReviewStatus("work", w.id, "Rejected", reason)}
                      />
                      <button
                        onClick={() => del(w.id, w.title)}
                        title="Delete declaration"
                        className="inline-flex items-center gap-1 rounded-lg bg-zam-red/10 px-2.5 py-1.5 text-xs font-semibold text-zam-red transition hover:bg-zam-red/20"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
              {works.length === 0 && (
                <tr>
                  <Td className="py-8 text-center text-night-400">
                    <div className="flex flex-col items-center gap-3">
                      <Illustration name="works" />
                      <span>No work declarations yet.</span>
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
