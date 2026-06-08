"use client";

import React from "react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge, ReviewActions } from "@/components/admin/widgets";
import { useAdminData } from "@/lib/adminClient";
import { formatDate } from "@/lib/format";

export default function AdminWorksPage() {
  const { works, members, setReviewStatus } = useAdminData();
  const nameFor = (id: string) => members.find((m) => m.id === id)?.fullName ?? "Unknown";

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
                    {w.title}
                    <span className="block text-xs font-normal text-night-400">
                      {w.genre} · {w.language}
                    </span>
                  </Td>
                  <Td>{w.workType}</Td>
                  <Td>{nameFor(w.ownerId)}</Td>
                  <Td className="text-xs text-night-300">
                    {w.ownershipSplits.map((s) => `${s.party} ${s.percentage}%`).join(", ")}
                  </Td>
                  <Td className="text-night-300">{formatDate(w.submittedAt)}</Td>
                  <Td>
                    <StatusBadge status={w.status} />
                  </Td>
                  <Td>
                    <ReviewActions
                      disabled={w.status === "Approved" || w.status === "Rejected"}
                      onApprove={() => setReviewStatus("work", w.id, "Approved")}
                      onReject={() => setReviewStatus("work", w.id, "Rejected")}
                    />
                  </Td>
                </tr>
              ))}
              {works.length === 0 && (
                <tr>
                  <Td className="py-8 text-center text-night-400">No work declarations yet.</Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
