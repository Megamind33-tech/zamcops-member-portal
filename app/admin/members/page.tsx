"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, X, Ban, RotateCcw, Download, ChevronRight } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";
import { useAdminData } from "@/lib/adminClient";
import { formatDate, initials } from "@/lib/format";
import { downloadMembers } from "@/lib/export";
import type { Member } from "@/types";

export default function AdminMembersPage() {
  const { members, setMemberStatus } = useAdminData();
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const shown = members.filter(
    (m) =>
      m.fullName.toLowerCase().includes(q.toLowerCase()) ||
      m.stageName.toLowerCase().includes(q.toLowerCase()) ||
      m.memberNumber.toLowerCase().includes(q.toLowerCase())
  );

  const pendingCount = members.filter((m) => m.membershipStatus === "Pending").length;

  const act = async (id: string, status: string) => {
    setBusyId(id);
    await setMemberStatus(id, status);
    setBusyId(null);
  };

  return (
    <div>
      <AdminHeader
        title="Member Applications"
        subtitle={`${members.length} registered · ${pendingCount} pending review`}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search members…"
              className="field-input h-10 w-48"
            />
            <button
              onClick={() => downloadMembers(shown, "csv")}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white/[0.06] px-3 text-xs font-semibold text-night-200 ring-1 ring-white/10 hover:text-white"
            >
              <Download size={14} /> CSV
            </button>
            <button
              onClick={() => downloadMembers(shown, "xls")}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white/[0.06] px-3 text-xs font-semibold text-night-200 ring-1 ring-white/10 hover:text-white"
            >
              <Download size={14} /> Excel
            </button>
          </div>
        }
      />
      <Panel title="Members">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-white/[0.03]">
              <tr>
                <Th>Member</Th>
                <Th>Member no.</Th>
                <Th>Role</Th>
                <Th>Contact</Th>
                <Th>Joined</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {shown.map((m) => (
                <tr key={m.id} className="hover:bg-white/[0.03]">
                  <Td>
                    <Link href={`/admin/members/${m.id}`} className="group flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-500 text-xs font-bold text-night-950">
                        {initials(m.stageName || m.fullName)}
                      </span>
                      <div>
                        <p className="font-semibold text-white group-hover:text-accent-300">{m.fullName}</p>
                        <p className="text-xs text-night-300">{m.stageName || "—"}</p>
                      </div>
                      <ChevronRight size={15} className="text-night-500 opacity-0 transition group-hover:opacity-100" />
                    </Link>
                  </Td>
                  <Td className="font-mono text-xs">{m.memberNumber}</Td>
                  <Td>{m.role}</Td>
                  <Td>
                    <p className="text-xs text-night-300">{m.email}</p>
                    <p className="text-xs text-night-400">{m.phone}</p>
                  </Td>
                  <Td className="text-night-300">{formatDate(m.joinedAt)}</Td>
                  <Td>
                    <StatusBadge status={m.membershipStatus} />
                  </Td>
                  <Td>
                    <MemberActions member={m} busy={busyId === m.id} onAct={(s) => act(m.id, s)} />
                  </Td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <Td className="py-8 text-center text-night-400">No members match your search.</Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function ActBtn({
  onClick,
  disabled,
  tone,
  icon,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  tone: "approve" | "reject" | "neutral";
  icon: React.ReactNode;
  label: string;
}) {
  const tones = {
    approve: "bg-emerald-400/12 text-emerald-300 hover:bg-emerald-400/20",
    reject: "bg-red-400/12 text-red-300 hover:bg-red-400/20",
    neutral: "bg-white/[0.06] text-night-200 hover:bg-white/[0.12]",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${tones[tone]}`}
    >
      {icon} {label}
    </button>
  );
}

// Context-appropriate membership controls based on current status.
function MemberActions({
  member,
  busy,
  onAct,
}: {
  member: Member;
  busy: boolean;
  onAct: (status: string) => void;
}) {
  const s = member.membershipStatus;
  return (
    <div className="flex justify-end gap-2">
      {(s === "Pending" || s === "Rejected") && (
        <ActBtn tone="approve" disabled={busy} onClick={() => onAct("Active")} icon={<Check size={14} />} label="Approve" />
      )}
      {s === "Pending" && (
        <ActBtn tone="reject" disabled={busy} onClick={() => onAct("Rejected")} icon={<X size={14} />} label="Reject" />
      )}
      {s === "Active" && (
        <ActBtn tone="reject" disabled={busy} onClick={() => onAct("Suspended")} icon={<Ban size={14} />} label="Suspend" />
      )}
      {(s === "Suspended" || s === "Lapsed") && (
        <ActBtn tone="approve" disabled={busy} onClick={() => onAct("Active")} icon={<RotateCcw size={14} />} label="Reactivate" />
      )}
    </div>
  );
}
