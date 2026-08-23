"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, FilePlus2, Music, Trash2, Lock, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { useApp, useMemberData } from "@/lib/store";
import { PageHeader } from "@/app/(portal)/(member)/layout";
import { Card } from "@/components/zam/Card";
import { Button } from "@/components/zam/Button";
import { StatusBadge } from "@/components/zam/StatusBadge";
import { FilterChips } from "@/components/zam/FilterChips";
import { SearchInput, EmptyState } from "@/components/zam/Misc";
import { TableShell, Th, Td, Tr } from "@/components/zam/Table";
import { CatalogueCard } from "@/components/media/CatalogueCard";
import { CoverArt } from "@/components/media/CoverArt";
import { formatDate } from "@/lib/format";
import type { ReviewStatus } from "@/types";

const filters: ("All" | ReviewStatus)[] = ["All", "Pending", "Under Review", "Approved", "Rejected"];

export default function WorksScreen() {
  const { works } = useMemberData();
  const { deleteWork } = useApp();
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [view, setView] = useState<"covers" | "list">("covers");

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
        title="My catalogue"
        subtitle={`${works.length} registered — song and artwork together`}
        action={
          <Link href="/submit/single">
            <Button icon={<FilePlus2 size={16} />}>Register a work</Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterChips chips={chips} active={filter} onChange={(v) => setFilter(v as (typeof filters)[number])} />
        <div className="flex items-center gap-2">
          <SearchInput
            placeholder="Search title, genre, ISRC…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:w-72"
          />
          <div className="hidden overflow-hidden rounded-xl border border-zam-line bg-white md:flex">
            <button
              type="button"
              onClick={() => setView("covers")}
              className={`grid h-10 w-10 place-items-center ${view === "covers" ? "bg-zam-orange-soft text-zam-orange" : "text-zam-muted"}`}
              aria-label="Cover grid"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`grid h-10 w-10 place-items-center ${view === "list" ? "bg-zam-orange-soft text-zam-orange" : "text-zam-muted"}`}
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>
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
        works.length === 0 ? (
          <Link
            href="/submit/single"
            className="group relative block overflow-hidden rounded-3xl shadow-[0_12px_32px_rgba(28,25,23,0.12)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/piano.webp" alt="" className="h-64 w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-7 text-white">
              <p className="font-display text-2xl font-semibold">Your catalogue is empty</p>
              <p className="mt-1 max-w-lg text-sm text-white/80">
                Register a musical work by sending the song and its artwork together — sleeves first, the way a
                release is promoted.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold">
                Register a work
              </span>
            </div>
          </Link>
        ) : (
          <Card>
            <EmptyState
              icon={<Music size={28} />}
              title="No matching works"
              description="Try another search or filter."
            />
          </Card>
        )
      ) : (
        <>
          <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 ${view === "list" ? "md:hidden" : ""}`}>
            {shown.map((w) => (
              <CatalogueCard
                key={w.id}
                title={w.title}
                meta={[w.workType, w.genre].filter(Boolean).join(" · ")}
                coverSrc={w.coverArt}
                status={w.status}
                footer={
                  <div className="mt-2 flex items-center justify-between text-xs text-zam-muted">
                    <span>{formatDate(w.submittedAt)}</span>
                    {w.status === "Approved" ? (
                      <span className="inline-flex items-center gap-1 italic">
                        <Lock size={12} /> Registered
                      </span>
                    ) : (
                      <button
                        onClick={() => remove(w.id, w.title)}
                        disabled={busyId === w.id}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold transition hover:bg-red-50 hover:text-zam-red disabled:opacity-40"
                      >
                        <Trash2 size={12} /> {busyId === w.id ? "Deleting…" : "Delete"}
                      </button>
                    )}
                  </div>
                }
              />
            ))}
          </div>
          {view === "list" && (
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
                  <Td className="font-semibold text-zam-ink">
                    <div className="flex items-center gap-3">
                      <CoverArt src={w.coverArt} seed={w.title} size={40} rounded="rounded-lg" />
                      <span>{w.title}</span>
                    </div>
                  </Td>
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
          )}
        </>
      )}
    </div>
  );
}
