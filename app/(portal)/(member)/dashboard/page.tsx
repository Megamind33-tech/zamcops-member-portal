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
  ArrowRight,
  Clock,
  CheckCircle2,
  Info,
  AlertTriangle,
} from "lucide-react";
import { useApp, useMemberData } from "@/lib/store";
import { profileCompletion } from "@/lib/member";
import { PageHeader } from "@/app/(portal)/(member)/layout";
import { Card, CardHeader } from "@/components/zam/Card";
import { Button } from "@/components/zam/Button";
import { StatusBadge } from "@/components/zam/StatusBadge";
import { Progress, Avatar } from "@/components/zam/Misc";
import { formatKwacha, timeAgo } from "@/lib/format";

const notifIcon = {
  info: { icon: Info, tile: "bg-zam-blue-soft text-zam-blue" },
  success: { icon: CheckCircle2, tile: "bg-zam-green-soft text-zam-green" },
  warning: { icon: AlertTriangle, tile: "bg-zam-amber-soft text-[#B8791A]" },
  action: { icon: FilePlus2, tile: "bg-zam-orange-soft text-zam-orange" },
} as const;

export default function DashboardScreen() {
  const { currentMember } = useApp();
  const { works, singles, albums, notifications, distributions, royalty } = useMemberData();
  const member = currentMember!;
  const completion = profileCompletion(member);

  const lifetimeDistributed = distributions.reduce((s, d) => s + d.amount, 0);
  const hour = new Date().getHours();
  const greeting =
    hour < 5 ? "Still up" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : hour < 21 ? "Good evening" : "Late session";

  const pending =
    works.filter((w) => w.status === "Pending").length +
    singles.filter((s) => s.status === "Pending" || s.status === "Under Review").length +
    albums.filter((a) => a.status === "Pending").length;
  const unread = notifications.filter((n) => !n.read).length;
  const latest = notifications.slice(0, 4);

  const totalEstimated = royalty?.totalEstimated ?? 0;
  const royaltyPending = royalty?.pending ?? 0;
  const royaltyPaid = royalty?.paid ?? lifetimeDistributed;

  const stats = [
    { label: "Works declared", value: works.length, href: "/works", icon: FilePlus2 },
    { label: "In review", value: pending, href: "/works", icon: Clock },
    { label: "Notifications", value: unread, href: "/notifications", icon: Bell },
  ];

  const quickActions = [
    { href: "/submit/single", label: "Submit song", hint: "Capture a new release", icon: Music2 },
    { href: "/works/new", label: "Declare work", hint: "Record ownership details", icon: FilePlus2 },
    { href: "/submit/album", label: "Upload album", hint: "Package tracks together", icon: Disc3 },
    { href: "/profile", label: "Update profile", hint: "Keep KYC current", icon: UserCog },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Your studio for declarations, submissions and royalties." />

      {/* Welcome */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={member.fullName} src={member.profilePhoto} size={56} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-display text-2xl font-bold text-zam-ink">
                  {greeting}, {member.stageName || member.fullName.split(" ")[0]}
                </h2>
                <StatusBadge status={member.membershipStatus} />
              </div>
              <p className="mt-1 text-sm text-zam-muted">
                <span className="font-mono">{member.memberNumber}</span> · {member.role}
              </p>
            </div>
          </div>
          <Link href="/submit" className="shrink-0">
            <Button icon={<FilePlus2 size={16} />}>New submission</Button>
          </Link>
        </div>

        {completion < 100 && (
          <div className="border-t border-zam-line bg-zam-canvas px-5 py-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-zam-ink">Profile completion</span>
              <span className="font-semibold text-zam-orange">{completion}%</span>
            </div>
            <Progress value={completion} />
            <Link href="/profile" className="mt-2.5 inline-flex items-center gap-1 text-sm font-semibold text-zam-orange hover:underline">
              Finish KYC <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="h-full p-5 transition-colors hover:border-zam-orange">
              <div className="flex items-center gap-4">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-zam-orange-soft text-zam-orange">
                  <s.icon size={20} />
                </span>
                <div>
                  <p className="font-display text-3xl font-bold text-zam-ink">{s.value}</p>
                  <p className="text-sm text-zam-muted">{s.label}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Royalty summary */}
      <Card>
        <CardHeader
          title="Royalties"
          action={
            <Link href="/royalties" className="inline-flex items-center gap-1 text-sm font-semibold text-zam-orange hover:underline">
              View all <ArrowRight size={14} />
            </Link>
          }
        />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <div className="rounded-2xl bg-zam-ink p-5 text-white">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/70">
              <Wallet size={14} /> Total estimated
            </p>
            <p className="mt-2 font-display text-2xl font-bold">{formatKwacha(totalEstimated)}</p>
          </div>
          <div className="rounded-xl border border-zam-line p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zam-muted">Pending</p>
            <p className="mt-2 font-display text-2xl font-bold text-zam-amber">{formatKwacha(royaltyPending)}</p>
          </div>
          <div className="rounded-xl border border-zam-line p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zam-muted">Paid</p>
            <p className="mt-2 font-display text-2xl font-bold text-zam-green">{formatKwacha(royaltyPaid)}</p>
          </div>
        </div>
      </Card>

      {/* Quick actions */}
      <Card>
        <CardHeader title="Quick actions" />
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group flex flex-col gap-3 rounded-2xl border border-zam-line p-4 transition-colors hover:border-zam-orange hover:bg-zam-orange-soft/40"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-zam-orange-soft text-zam-orange">
                <a.icon size={20} />
              </span>
              <div>
                <p className="font-semibold text-zam-ink">{a.label}</p>
                <p className="mt-0.5 text-sm text-zam-muted">{a.hint}</p>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      {/* Latest notifications */}
      <Card>
        <CardHeader
          title="Latest notifications"
          action={
            <Link href="/notifications" className="inline-flex items-center gap-1 text-sm font-semibold text-zam-orange hover:underline">
              See all <ArrowRight size={14} />
            </Link>
          }
        />
        {latest.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zam-muted">No notifications yet.</p>
        ) : (
          <div className="divide-y divide-zam-line">
            {latest.map((n) => {
              const meta = notifIcon[n.type];
              const Icon = meta.icon;
              return (
                <Link key={n.id} href="/notifications" className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-zam-canvas">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${meta.tile}`}>
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zam-ink">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-zam-muted">{n.body}</p>
                  </div>
                  <span className="shrink-0 text-xs text-zam-muted">{timeAgo(n.createdAt)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
