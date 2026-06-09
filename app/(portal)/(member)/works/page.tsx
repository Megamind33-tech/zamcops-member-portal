"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FilePlus2, Clock } from "lucide-react";
import { TopBar } from "@/components/mobile/TopBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Misc";
import { ButtonLink } from "@/components/ui/Button";
import { CoverArt } from "@/components/media/CoverArt";
import { Illustration } from "@/components/media/Illustration";
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
            className="grid h-9 w-9 place-items-center rounded-full bg-accent-500 text-night-950 shadow-[0_14px_30px_-12px_rgba(255,138,61,0.6)] ring-1 ring-accent-300/30"
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
                (filter === f ? "bg-accent-500 text-night-950 ring-1 ring-accent-300/30" : "bg-white/[0.06] text-night-300 ring-1 ring-white/10 hover:bg-white/[0.1]")
              }
            >
              {f}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <EmptyState
            art={<Illustration name="works" />}
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
                    <CoverArt seed={w.title} size={44} rounded="rounded-xl" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{w.title}</p>
                      <p className="truncate text-xs text-night-300">
                        {w.workType} · {w.genre} · {w.language}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5 text-[11px] text-night-400">
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
