"use client";

import React from "react";
import Link from "next/link";
import {
  Bell,
  Music2,
  FilePlus2,
  Disc3,
  UserCog,
  Wallet,
  ChevronRight,
  Clock,
  Library,
} from "lucide-react";
import { useApp, useMemberData } from "@/lib/store";
import { profileCompletion } from "@/lib/member";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProgressBar, SectionTitle } from "@/components/ui/Misc";
import { formatKwacha, timeAgo, initials } from "@/lib/format";

export default function DashboardScreen() {
  const { currentMember } = useApp();
  const { works, singles, albums, notifications, royalty } = useMemberData();
  const member = currentMember!;
  const completion = profileCompletion(member);

  const pending =
    works.filter((w) => w.status === "Pending").length +
    singles.filter((s) => s.status === "Pending" || s.status === "Under Review").length +
    albums.filter((a) => a.status === "Pending").length;
  const unread = notifications.filter((n) => !n.read).length;
  const latest = notifications.slice(0, 3);

  const quickActions = [
    { href: "/submit/single", label: "Submit Song", icon: Music2 },
    { href: "/works/new", label: "Declare Work", icon: FilePlus2 },
    { href: "/submit/album", label: "Upload Album", icon: Disc3 },
    { href: "/profile", label: "Update Profile", icon: UserCog },
  ];

  return (
    <div>
      {/* Brand header */}
      <header className="rounded-b-3xl bg-brand-700 px-5 pb-6 pt-7 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-sm font-bold">
              {initials(member.stageName || member.fullName)}
            </span>
            <div>
              <p className="text-xs text-brand-100">Welcome back</p>
              <p className="text-base font-bold">{member.stageName || member.fullName}</p>
            </div>
          </div>
          <Link
            href="/notifications"
            className="relative grid h-10 w-10 place-items-center rounded-full bg-white/10"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-brand-900">
                {unread}
              </span>
            )}
          </Link>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
          <div>
            <p className="text-[11px] text-brand-100">Membership</p>
            <p className="font-mono text-sm font-semibold">{member.memberNumber}</p>
          </div>
          <StatusBadge status={member.membershipStatus} className="bg-white/90" />
        </div>
      </header>

      <div className="space-y-5 px-4 py-5">
        {/* Profile completion */}
        <Link href="/profile" className="card block px-4 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-brand-900">Profile completion</p>
            <span className="text-sm font-bold text-gold-600">{completion}%</span>
          </div>
          <ProgressBar value={completion} className="mt-3" />
          <p className="mt-2 text-xs text-slate-500">
            {completion < 100
              ? "Complete your KYC to speed up verification and royalty payouts."
              : "Your profile is complete. "}
            <span className="font-semibold text-brand-600">Review →</span>
          </p>
        </Link>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<Clock size={18} />} label="Pending submissions" value={pending} href="/uploads" />
          <StatCard icon={<Library size={18} />} label="Registered works" value={works.length} href="/works" />
        </div>

        {/* Royalty summary */}
        <Link href="/royalties" className="card block overflow-hidden">
          <div className="flex items-center justify-between bg-brand-50/60 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-brand-800">
              <Wallet size={16} className="text-gold-600" /> Royalty summary
            </span>
            <ChevronRight size={16} className="text-slate-400" />
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100 px-2 py-4 text-center">
            <RoyaltyStat label="Estimated" value={royalty?.totalEstimated ?? 0} />
            <RoyaltyStat label="Pending" value={royalty?.pending ?? 0} />
            <RoyaltyStat label="Paid" value={royalty?.paid ?? 0} />
          </div>
        </Link>

        {/* Quick actions */}
        <div>
          <SectionTitle title="Quick actions" />
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="card flex items-center gap-3 px-4 py-3.5 transition active:scale-[0.98]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <a.icon size={18} />
                </span>
                <span className="text-sm font-semibold text-brand-900">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Latest notifications */}
        <div>
          <SectionTitle
            title="Latest notifications"
            action={
              <Link href="/notifications" className="text-xs font-semibold text-brand-600">
                See all
              </Link>
            }
          />
          <div className="card divide-y divide-slate-100">
            {latest.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-slate-400">No notifications yet.</p>
            )}
            {latest.map((n) => (
              <Link key={n.id} href="/notifications" className="flex items-start gap-3 px-4 py-3.5">
                <span
                  className={
                    "mt-1 h-2 w-2 shrink-0 rounded-full " +
                    (n.read ? "bg-slate-200" : "bg-gold-500")
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-brand-900">{n.title}</p>
                  <p className="truncate text-xs text-slate-500">{n.body}</p>
                </div>
                <span className="shrink-0 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="card flex flex-col gap-2 px-4 py-4">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">{icon}</span>
      <span className="text-2xl font-extrabold text-brand-900">{value}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </Link>
  );
}

function RoyaltyStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-1">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xs font-bold text-brand-900">{formatKwacha(value)}</p>
    </div>
  );
}
