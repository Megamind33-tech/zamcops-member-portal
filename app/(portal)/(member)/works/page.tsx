"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, FilePlus2, Music, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";
import { useApp, useMemberData } from "@/lib/store";
import { PageHeader } from "@/app/(portal)/(member)/layout";
import { Card } from "@/components/zam/Card";
import { Button } from "@/components/zam/Button";
import { StatusBadge } from "@/components/zam/StatusBadge";
import { FilterChips } from "@/components/zam/FilterChips";
import { SearchInput, EmptyState } from "@/components/zam/Misc";
import { TableShell, Th, Td, Tr } from "@/components/zam/Table";
import { formatDate } from "@/lib/format";
import type { ReviewStatus } from "@/types";

const filters: ("All" | ReviewStatus)[] = ["All", "Pending", "Under Review", "Approved", "Rejected"];

export default function WorksScreen() {
  const { works } = useMemberData();
  const { deleteWork } = useApp();
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const remove = async (id: string, title: string) => {
    if (!window.confirm(`Delete the declaration for “${title}”? This can't be undone.`)) return;
    setBusyId(id);
    const res = await deleteWork(id);
    setBusyId(null);
    if (res.ok) toast.success("Work declaration deleted.");
    else toast.error(res.error || "Could not delete this declaration.");
  };

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

  const rejected = shown.filter((w) => w.status === "Rejected" && w.rejectionReason);

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

      {rejected.map((w) => (
        <div key={w.id} className="rounded-2xl border border-zam-red/30 bg-red-50 p-4">
          <div className="flex items-start gap-2.5 text-sm text-zam-red">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>
              <span className="font-semibold">“{w.title}”</span> was rejected: {w.rejectionReason}
            </span>
          </div>
        </div>
      ))}

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
                  <Th className="text-right">Actions</Th>
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
                    <Td className="text-right">
                      {w.status === "Approved" ? (
                        <span className="inline-flex items-center gap-1 text-xs italic text-zam-muted">
                          <Lock size={12} /> Registered
                        </span>
                      ) : (
                        <button
                          onClick={() => remove(w.id, w.title)}
                          disabled={busyId === w.id}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-zam-muted transition hover:bg-red-50 hover:text-zam-red disabled:opacity-40"
                        >
                          <Trash2 size={14} /> {busyId === w.id ? "Deleting…" : "Delete"}
                        </button>
                      )}
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
                <div className="mt-2 flex justify-end">
                  {w.status === "Approved" ? (
                    <span className="inline-flex items-center gap-1 text-xs italic text-zam-muted">
                      <Lock size={12} /> Registered — contact ZAMCOPS to amend
                    </span>
                  ) : (
                    <button
                      onClick={() => remove(w.id, w.title)}
                      disabled={busyId === w.id}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-zam-muted transition hover:bg-red-50 hover:text-zam-red disabled:opacity-40"
                    >
                      <Trash2 size={14} /> {busyId === w.id ? "Deleting…" : "Delete"}
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
