"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FilePlus2, Library, Music4, Clock } from "lucide-react";
import { TopBar } from "@/components/mobile/TopBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Misc";
import { ButtonLink } from "@/components/ui/Button";
import { useMemberData } from "@/lib/store";
import { formatDate } from "@/lib/format";
import type { ReviewStatus } from "@/types";

const filters: ("All" | ReviewStatus)[] = ["All", "Pending", "Approved", "Rejected"];

export default function WorksScreen() {
  const { works } = useMemberData();
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const shown = works.filter((w) => filter === "All" || w.status === filter);

  return (
    <div>
      <TopBar
        title="My Works"
        subtitle={`${works.length} declared`}
        right={
          <Link
            href="/works/new"
            className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-white"
            aria-label="Declare work"
          >
            <FilePlus2 size={17} />
          </Link>
        }
      />

      <div className="px-4 py-4">
        <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition " +
                (filter === f ? "bg-brand-600 text-white" : "bg-white text-slate-500 shadow-card")
              }
            >
              {f}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <EmptyState
            icon={<Library size={22} />}
            title="No work declarations"
            message="Declare a musical work to record its copyright ownership and splits."
            action={
              <ButtonLink href="/works/new" size="sm">
                <FilePlus2 size={16} /> Declare a work
              </ButtonLink>
            }
          />
        ) : (
          <div className="space-y-3">
            {shown.map((w) => (
              <div key={w.id} className="card px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                      <Music4 size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-brand-900">{w.title}</p>
                      <p className="truncate text-xs text-slate-500">
                        {w.workType} · {w.genre} · {w.language}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} /> {formatDate(w.submittedAt)}
                  </span>
                  <span>
                    {w.ownershipSplits.length} split{w.ownershipSplits.length === 1 ? "" : "s"}
                    {w.isrc ? ` · ISRC ${w.isrc}` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
