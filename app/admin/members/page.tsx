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
            <thead className="bg-slate-50">
              <tr>
                <Th>Member</Th>
                <Th>Member no.</Th>
                <Th>Role</Th>
                <Th>Contact</Th>
                <Th>Joined</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                        {initials(m.stageName || m.fullName)}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">{m.fullName}</p>
                        <p className="text-xs text-slate-500">{m.stageName}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="font-mono text-xs">{m.memberNumber}</Td>
                  <Td>{m.role}</Td>
                  <Td>
                    <p className="text-xs text-slate-600">{m.email}</p>
                    <p className="text-xs text-slate-400">{m.phone}</p>
                  </Td>
                  <Td className="text-slate-500">{formatDate(m.joinedAt)}</Td>
                  <Td>
                    <StatusBadge status={m.membershipStatus} />
                  </Td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <Td className="py-8 text-center text-slate-400">No members match your search.</Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
