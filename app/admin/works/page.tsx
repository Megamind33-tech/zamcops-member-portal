"use client";

import React from "react";
import { FileText, Trash2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge, ReviewActions } from "@/components/admin/widgets";
import { useAdminData } from "@/lib/adminClient";
import { CoverArt } from "@/components/media/CoverArt";
import { Illustration } from "@/components/media/Illustration";
import { cn, formatDate } from "@/lib/format";
import { shareOf } from "@/lib/works";
import type { OwnershipSplit } from "@/types";

// What a reviewer actually decides on: is the studio letter there, and is every
// party either a member on file or backed by an NRC and an affirmation letter.
// Listing one line per party repeated the Splits column beside it and made the
// row as tall as the work had contributors.
function EvidenceCell({ work }: { work: { studioReceipt?: string; ownershipSplits: OwnershipSplit[] } }) {
  const splits = work.ownershipSplits ?? [];
  const onFile = splits.filter((s) => s.knownMember || s.memberNumber);
  const short = splits.filter(
    (s) => !(s.knownMember || s.memberNumber) && !(s.nrc && s.affirmationLetter),
  );
  return (
    <div
      className="w-[180px] space-y-0.5"
      title={splits
        .map(
          (s) =>
            `${s.party}: ${
              s.knownMember || s.memberNumber
                ? s.memberNumber || "member on file"
                : [s.nrc ? `NRC ${s.nrc}` : "NRC missing", s.affirmationLetter ? "letter" : "letter missing"].join(" · ")
            }`,
        )
        .join("\n")}
    >
      <span className={cn("block truncate", work.studioReceipt ? "text-zam-ink" : "text-zam-red")}>
        {work.studioReceipt ? "Studio letter on file" : "No studio receipt"}
      </span>
      <span className="block text-zam-muted">
        {onFile.length} of {splits.length} parties on file
      </span>
      {short.length > 0 && (
        <span className="block font-semibold text-zam-red">{short.length} missing NRC or letter</span>
      )}
    </div>
  );
}

export default function AdminWorksPage() {
  const { works, members, setReviewStatus, reissueWorkDocuments, deleteSubmission } = useAdminData();
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
          <table className="w-full min-w-[1040px]">
            <thead className="bg-zam-canvas">
              <tr>
                <Th>Title</Th>
                <Th>Type</Th>
                <Th>Declared by</Th>
                <Th>Splits</Th>
                <Th>Evidence</Th>
                <Th>Submitted</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zam-line">
              {works.map((w) => (
                <tr key={w.id} className="hover:bg-zam-canvas">
                  <Td className="font-semibold text-zam-ink">
                    <div className="flex items-center gap-3">
                      <CoverArt src={w.coverArt} seed={w.title} size={40} rounded="rounded-lg" />
                      <div className="min-w-0">
                        {w.title}
                        <span className="block text-xs font-normal text-zam-muted">
                          {w.genre} · {w.language}
                        </span>
                      </div>
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap">{w.workType}</Td>
                  <Td className="whitespace-nowrap">{nameFor(w.ownerId)}</Td>
                  <Td className="text-xs text-zam-muted">
                    <div
                      className="w-[210px] space-y-0.5"
                      title={w.ownershipSplits
                        .map(
                          (s) =>
                            `${s.party} — performance ${shareOf(s, "performancePct")}%, recording ${shareOf(s, "recordingPct")}%${
                              s.ipiNumber ? ` · IPI ${s.ipiNumber}` : ""
                            }`,
                        )
                        .join("\n")}
                    >
                      {w.ownershipSplits.slice(0, 2).map((s, i) => (
                        <span key={s.id || `${s.party}-${i}`} className="block truncate">
                          <span className="text-zam-ink">{s.party}</span>{" "}
                          {shareOf(s, "performancePct")}/{shareOf(s, "recordingPct")}%
                        </span>
                      ))}
                      {w.ownershipSplits.length > 2 && (
                        <span className="block text-zam-muted/70">+{w.ownershipSplits.length - 2} more</span>
                      )}
                      {w.ownershipSplits.length === 0 && <span className="block">No shares declared</span>}
                    </div>
                  </Td>
                  <Td className="text-xs">
                    <EvidenceCell work={w} />
                  </Td>
                  <Td className="whitespace-nowrap text-zam-muted">{formatDate(w.submittedAt)}</Td>
                  <Td>
                    <StatusBadge status={w.status} />
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-2">
                      <ReviewActions
                        disabled={w.status === "Approved" || w.status === "Rejected"}
                        onApprove={() => setReviewStatus("work", w.id, "Approved")}
                        onReject={(reason) => setReviewStatus("work", w.id, "Rejected", reason)}
                        onUnderReview={() => setReviewStatus("work", w.id, "Under Review")}
                      />
                      {w.status === "Approved" && (
                        <button
                          onClick={() => reissueWorkDocuments(w.id)}
                          title="Re-issue the clearance certificate for this submission"
                          className="inline-flex items-center gap-1 rounded-lg bg-zam-canvas px-2.5 py-1.5 text-xs font-semibold text-zam-ink transition hover:bg-zam-line/60"
                        >
                          <FileText size={14} /> Re-issue
                        </button>
                      )}
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
                  <Td className="py-8 text-center text-zam-muted">
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
