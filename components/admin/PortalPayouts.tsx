"use client";

import React, { useState } from "react";
import { Panel, Th, Td } from "./widgets";
import { useAdminData } from "@/lib/adminClient";

// ZAMCOPS-only: the confirmed payout each portal member sees for this
// distribution once Sync with Portal is On. (WIPO Connect has no member portal;
// this is where the society's own members' payouts are entered.)
export function PortalPayouts({ distributionId, locked, onChanged }: { distributionId: string; locked: boolean; onChanged: () => void }) {
  const { members, distributions, saveDistributionEntry } = useAdminData();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const selected = distributions.find((d) => d.id === distributionId) ?? null;

  const saveOne = async (ownerId: string) => {
    const amount = Number(drafts[ownerId]);
    if (!Number.isFinite(amount) || amount < 0) return;
    setSavingId(ownerId);
    await saveDistributionEntry({ distributionId, ownerId, amount });
    setSavingId(null);
    setDrafts((d) => {
      const next = { ...d };
      delete next[ownerId];
      return next;
    });
    onChanged();
  };

  const shown = members.filter((m) => !q.trim() || `${m.fullName} ${m.memberNumber}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <Panel title="Portal payouts" right={<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter members…" className="field-input h-7 w-52" />}>
      <p className="border-b border-[#eceff3] px-4 py-2 text-xs text-zam-muted">
        Set each member&apos;s confirmed payout for this distribution. Members see it only when <b>Sync with Portal</b> is On{locked ? " — it is locked while the distribution is on the portal or closed" : ""}.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr>
              <Th>Member</Th>
              <Th>Confirmed payout (ZMW)</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {shown.map((m) => {
              const entry = selected?.entries.find((e) => e.ownerId === m.id);
              const value = drafts[m.id] ?? (entry ? String(entry.amount) : "");
              return (
                <tr key={m.id}>
                  <Td className="font-semibold">
                    {m.fullName} <span className="font-normal text-zam-muted">· {m.memberNumber}</span>
                  </Td>
                  <Td>
                    <input value={value} disabled={locked} onChange={(e) => setDrafts((d) => ({ ...d, [m.id]: e.target.value }))} inputMode="decimal" placeholder="0.00" className="field-input h-8 w-32 text-right" />
                  </Td>
                  <Td className="text-right">
                    <button onClick={() => saveOne(m.id)} disabled={locked || savingId === m.id || !drafts[m.id]} className="rounded-sm bg-zam-orange px-3 py-1 text-xs font-semibold text-white disabled:opacity-40">
                      {savingId === m.id ? "Saving…" : entry ? "Update" : "Add"}
                    </button>
                  </Td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <Td colSpan={3} className="py-6 text-center text-zam-muted">
                  No members match.
                </Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
