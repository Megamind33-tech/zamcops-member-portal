"use client";

import React from "react";
import Link from "next/link";
import { Users, FileText, Music2, Disc3, FolderOpen, Clock, ChevronRight } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { AdminStat, Panel, Th, Td, StatusBadge } from "@/components/admin/widgets";
import { useAdminData } from "@/lib/adminClient";
import { CoverArt } from "@/components/media/CoverArt";
import { Illustration } from "@/components/media/Illustration";
import { formatDate } from "@/lib/format";

// WIPO Connect's home page: one tile per area, then one per creation class group.
const HOME_TILES = [
  { href: "/admin/register", label: "Rights Owners" },
  { href: "/admin/agreements", label: "Agreements and Mandates" },
  { href: "/admin/distributions", label: "Matching and Distribution" },
  { href: "/admin/catalogue", label: "All Creation Classes" },
  { href: "/admin/catalogue?cc=MW", label: "Musical Works" },
  { href: "/admin/catalogue?cc=AV", label: "AV Works" },
  { href: "/admin/catalogue?cc=AVP", label: "AV Productions" },
  { href: "/admin/catalogue?cc=SR", label: "Sound Recordings" },
  { href: "/admin/catalogue?cc=LW,LF,LN,DW,SM", label: "Textual Works and Publications" },
  { href: "/admin/catalogue?cc=DM", label: "Theatrical and Dance" },
  { href: "/admin/catalogue?cc=WA,PH", label: "Visual Arts" },
];

export default function AdminDashboard() {
  const { members, works, singles, albums, uploads } = useAdminData();

  const pendingWorks = works.filter((w) => w.status === "Pending").length;
  const pendingSongs = singles.filter((s) => s.status === "Pending" || s.status === "Under Review").length;
  const pendingAlbums = albums.filter((a) => a.status === "Pending").length;

  // Combine recent submissions into one activity feed.
  const recent = [
    ...works.map((w) => ({ id: w.id, kind: "Work", title: w.title, at: w.submittedAt, status: w.status })),
    ...singles.map((s) => ({ id: s.id, kind: "Single", title: s.title, at: s.submittedAt, status: s.status })),
    ...albums.map((a) => ({ id: a.id, kind: "Album", title: a.title, at: a.submittedAt, status: a.status })),
  ]
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 8);

  return (
    <div>
      <AdminHeader title="Home page" subtitle="Staff console" />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {HOME_TILES.map((t) => (
          <Link key={t.href} href={t.href} className="card flex h-20 items-center justify-center px-3 text-center text-[14px] font-semibold text-[#1f4e79] transition-colors hover:bg-[#eef3f8]">
            {t.label}
          </Link>
        ))}
      </div>

      <h2 className="mb-2 text-[13px] font-bold text-[#1f4e79]">Member portal activity</h2>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <AdminStat icon={<Users size={18} />} label="Members" value={members.length} />
        <AdminStat icon={<FileText size={18} />} label="Work declarations" value={works.length} tone="gold" />
        <AdminStat icon={<Music2 size={18} />} label="Singles" value={singles.length} tone="emerald" />
        <AdminStat icon={<Disc3 size={18} />} label="Albums" value={albums.length} tone="brand" />
        <AdminStat icon={<FolderOpen size={18} />} label="Files" value={uploads.length} tone="amber" />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <QueueCard href="/admin/works" label="Works awaiting review" count={pendingWorks} />
        <QueueCard href="/admin/songs" label="Songs awaiting review" count={pendingSongs} />
        <QueueCard href="/admin/albums" label="Albums awaiting review" count={pendingAlbums} />
      </div>

      <Panel title="Recent submissions">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead className="bg-zam-canvas">
              <tr>
                <Th>Type</Th>
                <Th>Title</Th>
                <Th>Submitted</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zam-line">
              {recent.map((r) => (
                <tr key={r.id} className="hover:bg-zam-canvas">
                  <Td>
                    <span className="rounded-md bg-zam-canvas px-2 py-0.5 text-xs font-semibold text-zam-muted">
                      {r.kind}
                    </span>
                  </Td>
                  <Td className="font-semibold text-zam-ink">
                    <div className="flex items-center gap-3">
                      <CoverArt seed={r.title} size={36} rounded="rounded-lg" />
                      <span>{r.title}</span>
                    </div>
                  </Td>
                  <Td className="text-zam-muted">{formatDate(r.at)}</Td>
                  <Td>
                    <StatusBadge status={r.status} />
                  </Td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <Td colSpan={4} className="py-8 text-center text-zam-muted">
                    <div className="flex flex-col items-center gap-3">
                      <Illustration name="inbox" size={100} />
                      <span>No recent submissions yet.</span>
                    </div>
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function QueueCard({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <Link
      href={href}
      className="card flex items-center justify-between p-5 transition hover:bg-zam-canvas"
    >
      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-zam-amber">
          <Clock size={13} /> Pending review
        </p>
        <p className="mt-1 text-3xl font-extrabold text-zam-ink">{count}</p>
        <p className="text-sm text-zam-muted">{label}</p>
      </div>
      <ChevronRight className="text-zam-muted" />
    </Link>
  );
}
