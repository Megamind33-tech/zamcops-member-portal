"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { FilePlus2, Music } from "lucide-react";
import { useMemberData } from "@/lib/store";
import { PageHeader } from "@/app/(portal)/(member)/layout";
import { Card } from "@/components/zam/Card";
import { Button } from "@/components/zam/Button";
import { StatusBadge } from "@/components/zam/StatusBadge";
import { FilterChips } from "@/components/zam/FilterChips";
import { SearchInput, EmptyState } from "@/components/zam/Misc";
import { TableShell, Th, Td, Tr } from "@/components/zam/Table";
import { formatDate } from "@/lib/format";
import type { ReviewStatus } from "@/types";

const filters: ("All" | ReviewStatus)[] = ["All", "Pending", "Approved", "Rejected"];

export default function WorksScreen() {
  const { works } = useMemberData();
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return works.filter((w) => {
      const matchFilter = filter === "All" || w.status === filter;
      const matchQuery =
        !q ||
        w.title.toLowerCase().includes(q) ||
        (w.genre ?? "").toLowerCase().includes(q) ||
        (w.isrc ?? "").toLowerCase().includes(q);
      return matchFilter && matchQuery;
    });
  }, [works, filter, query]);

  const chips = filters.map((f) => ({
    label: f,
    value: f,
    count: f === "All" ? works.length : works.filter((w) => w.status === f).length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Works"
        subtitle={`${works.length} declared`}
        action={
          <Link href="/works/new">
            <Button icon={<FilePlus2 size={16} />}>Declare a work</Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterChips chips={chips} active={filter} onChange={(v) => setFilter(v as (typeof filters)[number])} />
        <SearchInput
          placeholder="Search title, genre, ISRC…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:w-72"
        />
      </div>

      {shown.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Music size={28} />}
            title="No work declarations"
            description="Declare a musical work to record its copyright ownership and splits."
            action={
              <Link href="/works/new">
                <Button size="sm" icon={<FilePlus2 size={16} />}>
                  Declare a work
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <TableShell>
              <thead>
                <Tr>
                  <Th>Title</Th>
                  <Th>Type</Th>
                  <Th>Genre</Th>
                  <Th>Splits</Th>
                  <Th>ISRC</Th>
                  <Th>Created</Th>
                  <Th>Status</Th>
                </Tr>
              </thead>
              <tbody>
                {shown.map((w) => (
                  <Tr key={w.id}>
                    <Td className="font-semibold text-zam-ink">{w.title}</Td>
                    <Td className="text-zam-muted">{w.workType}</Td>
                    <Td className="text-zam-muted">{w.genre}</Td>
                    <Td className="text-zam-muted">{w.ownershipSplits.length}</Td>
                    <Td className="font-mono text-xs text-zam-muted">{w.isrc || "—"}</Td>
                    <Td className="text-zam-muted">{formatDate(w.submittedAt)}</Td>
                    <Td>
                      <StatusBadge status={w.status} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableShell>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {shown.map((w) => (
              <Card key={w.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zam-ink">{w.title}</p>
                    <p className="mt-0.5 truncate text-sm text-zam-muted">
                      {w.workType} · {w.genre} · {w.language}
                    </p>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-zam-line pt-2.5 text-xs text-zam-muted">
                  <span>{formatDate(w.submittedAt)}</span>
                  <span>
                    {w.ownershipSplits.length} split{w.ownershipSplits.length === 1 ? "" : "s"}
                    {w.isrc ? ` · ISRC ${w.isrc}` : ""}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
