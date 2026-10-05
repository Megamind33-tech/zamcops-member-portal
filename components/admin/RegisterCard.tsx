"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BookUser } from "lucide-react";
import { Panel } from "@/components/admin/widgets";

type Entry = { id: string; displayName: string; ipiNumber: string; ipiBaseNumber: string; wipocosId: string; shareCount: number };

// On a member's page: the society-register entry linked to this account, with
// the number of works it holds shares in, or a way to go and find it.
export function RegisterCard({ memberId, searchHint }: { memberId: string; searchHint: string }) {
  const [entry, setEntry] = useState<Entry | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    fetch(`/api/admin/register/holders?memberId=${encodeURIComponent(memberId)}`)
      .then((r) => r.json())
      .then((d) => live && setEntry(d.holders?.[0] ?? null))
      .catch(() => live && setEntry(null));
    return () => {
      live = false;
    };
  }, [memberId]);

  if (entry === undefined) return null;

  return (
    <Panel title="Society register (WIPO Connect)">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
        {entry ? (
          <>
            <div>
              <p className="font-semibold text-zam-ink">{entry.displayName}</p>
              <p className="mt-0.5 text-xs text-zam-muted">
                {entry.ipiNumber ? `IPI ${entry.ipiNumber}` : "No IPI number"}
                {entry.wipocosId && ` · WIPOCOS ${entry.wipocosId}`} · {entry.shareCount.toLocaleString()} work{entry.shareCount === 1 ? "" : "s"} on the register
              </p>
            </div>
            <Link href={`/admin/register/${entry.id}`} className="inline-flex items-center gap-1.5 font-semibold text-zam-orange">
              <BookUser size={14} /> Open register entry
            </Link>
          </>
        ) : (
          <>
            <p className="text-zam-muted">Not linked to the society register, so no works or IPI details are connected to this account.</p>
            <Link
              href={`/admin/register?q=${encodeURIComponent(searchHint)}`}
              className="inline-flex items-center gap-1.5 font-semibold text-zam-orange"
            >
              <BookUser size={14} /> Find on the register
            </Link>
          </>
        )}
      </div>
    </Panel>
  );
}
