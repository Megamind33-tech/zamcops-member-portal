"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Mail, Phone, MapPin, ChevronRight, Contact } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { StatusBadge } from "@/components/admin/widgets";
import { Avatar } from "@/components/zam/Misc";
import { useAdminData } from "@/lib/adminClient";
import { downloadMembers } from "@/lib/export";
import { formatDate } from "@/lib/format";

const STATUSES = ["All", "Active", "Pending", "Suspended", "Lapsed", "Rejected"] as const;

export default function AdminDirectoryPage() {
  const { members } = useAdminData();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("All");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members.filter((m) => {
      const matchStatus = status === "All" || m.membershipStatus === status;
      const matchQ =
        !needle ||
        m.fullName.toLowerCase().includes(needle) ||
        m.stageName.toLowerCase().includes(needle) ||
        m.memberNumber.toLowerCase().includes(needle) ||
        m.email.toLowerCase().includes(needle) ||
        (m.province ?? "").toLowerCase().includes(needle);
      return matchStatus && matchQ;
    });
  }, [members, q, status]);

  const countFor = (s: (typeof STATUSES)[number]) =>
    s === "All" ? members.length : members.filter((m) => m.membershipStatus === s).length;

  return (
    <div>
      <AdminHeader
        title="All Members"
        subtitle={`${members.length} registered members in the ZAMCOPS directory`}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, number, email…"
              className="field-input-lite h-10 w-56"
            />
            <button
              onClick={() => downloadMembers(shown, "csv")}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-zam-line bg-white px-3 text-xs font-semibold text-zam-ink hover:bg-zam-canvas"
            >
              <Download size={14} /> CSV
            </button>
            <button
              onClick={() => downloadMembers(shown, "xls")}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-zam-line bg-white px-3 text-xs font-semibold text-zam-ink hover:bg-zam-canvas"
            >
              <Download size={14} /> Excel
            </button>
          </div>
        }
      />

      {/* Status filter */}
      <div className="mb-5 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={
              "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors " +
              (status === s
                ? "border-zam-orange bg-zam-orange text-white"
                : "border-zam-line bg-white text-zam-muted hover:bg-zam-canvas hover:text-zam-ink")
            }
          >
            {s}
            <span
              className={
                "min-w-[20px] rounded-full px-1.5 py-0.5 text-xs " +
                (status === s ? "bg-white/25" : "bg-zam-canvas")
              }
            >
              {countFor(s)}
            </span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card-lite grid place-items-center gap-3 py-16 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-zam-orange-soft text-zam-orange">
            <Contact size={26} />
          </span>
          <p className="font-display font-semibold text-zam-ink">No members match your search</p>
          <p className="text-sm text-zam-muted">Try a different name, number or status.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((m) => (
            <Link
              key={m.id}
              href={`/admin/members/${m.id}`}
              className="card-lite group flex flex-col gap-3 p-4 transition hover:border-zam-orange/40 hover:shadow-card-lg"
            >
              <div className="flex items-start gap-3">
                <Avatar name={m.stageName || m.fullName} src={m.profilePhoto || undefined} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-zam-ink group-hover:text-zam-orange-dark">{m.fullName}</p>
                  <p className="truncate text-xs text-zam-muted">{m.stageName || "—"}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-zam-muted">{m.memberNumber}</p>
                </div>
                <StatusBadge status={m.membershipStatus} />
              </div>

              <div className="space-y-1.5 border-t border-zam-line pt-3 text-xs text-zam-muted">
                <p className="flex items-center gap-1.5">
                  <Contact size={13} className="shrink-0 text-zam-muted/70" /> {m.role}
                  {m.province ? (
                    <>
                      <MapPin size={13} className="ml-1 shrink-0 text-zam-muted/70" /> {m.province}
                    </>
                  ) : null}
                </p>
                <p className="flex items-center gap-1.5 truncate">
                  <Mail size={13} className="shrink-0 text-zam-muted/70" /> <span className="truncate">{m.email}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone size={13} className="shrink-0 text-zam-muted/70" /> {m.phone}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-zam-line pt-2.5 text-[11px] text-zam-muted">
                <span>Joined {formatDate(m.joinedAt)}</span>
                <span className="inline-flex items-center gap-0.5 font-semibold text-zam-orange opacity-0 transition group-hover:opacity-100">
                  View profile <ChevronRight size={13} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
