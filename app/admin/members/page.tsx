"use client";

import React, { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";
import { useAdminData } from "@/lib/adminClient";
import { formatDate, initials } from "@/lib/format";

export default function AdminMembersPage() {
  const { members } = useAdminData();
  const [q, setQ] = useState("");
  const shown = members.filter(
    (m) =>
      m.fullName.toLowerCase().includes(q.toLowerCase()) ||
      m.stageName.toLowerCase().includes(q.toLowerCase()) ||
      m.memberNumber.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <AdminHeader
        title="Member Applications"
        subtitle={`${members.length} registered members`}
        right={
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search members…"
            className="field-input h-10 w-56"
          />
        }
      />
      <Panel title="Members">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-white/[0.03]">
              <tr>
                <Th>Member</Th>
                <Th>Member no.</Th>
                <Th>Role</Th>
                <Th>Contact</Th>
                <Th>Joined</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {shown.map((m) => (
                <tr key={m.id} className="hover:bg-white/[0.03]">
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-500 text-xs font-bold text-night-950">
                        {initials(m.stageName || m.fullName)}
                      </span>
                      <div>
                        <p className="font-semibold text-white">{m.fullName}</p>
                        <p className="text-xs text-night-300">{m.stageName}</p>
                      </div>
                    </div>
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
