"use client";

import React from "react";
import Link from "next/link";
import {
  Music2,
  FilePlus2,
  FileText,
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
import { Card, CardHeader } from "@/components/zam/Card";
import { Button } from "@/components/zam/Button";
import { StatusBadge } from "@/components/zam/StatusBadge";
import { Progress, Avatar } from "@/components/zam/Misc";
import { CatalogueCard } from "@/components/media/CatalogueCard";
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
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const pending =
    works.filter((w) => w.status === "Pending" || w.status === "Under Review").length +
    singles.filter((s) => s.status === "Pending" || s.status === "Under Review").length +
    albums.filter((a) => a.status === "Pending" || a.status === "Under Review").length;
  const latest = notifications.slice(0, 4);

  const royaltyPending = royalty?.pending ?? 0;
  const royaltyPaid = royalty?.paid ?? lifetimeDistributed;
  const lastDistribution = distributions[0] ?? null;

  const catalogue = [
    ...works.map((w) => ({
      id: w.id,
      title: w.title,
      cover: w.coverArt,
      meta: [w.workType, w.genre].filter(Boolean).join(" · "),
      status: w.status,
    })),
    ...albums.map((a) => ({
      id: a.id,
      title: a.title,
      cover: a.coverArt,
      meta: "Album",
      status: a.status,
    })),
  ].slice(0, 8);

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl shadow-[0_16px_40px_rgba(28,25,23,0.14)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/splash-stage.webp" alt="" className="h-52 w-full object-cover sm:h-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />
        <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar name={member.fullName} src={member.profilePhoto} size={56} className="ring-2 ring-white/40" />
              <div className="min-w-0 text-white">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="font-display text-2xl font-semibold sm:text-3xl">
                    {greeting}, {member.stageName || member.fullName.split(" ")[0]}
                  </h1>
                  <StatusBadge status={member.membershipStatus} />
                </div>
                <p className="mt-1 text-sm text-white/75">
                  <span className="font-mono">{member.memberNumber}</span> · {member.role}
                </p>
              </div>
            </div>
            <Link href="/submit/single" className="hidden shrink-0 sm:block">
              <Button icon={<FilePlus2 size={16} />}>Register a work</Button>
            </Link>
          </div>
          <p className="max-w-xl text-sm text-white/80">
            Register songs with artwork, keep your official documents, and follow royalty receiving and distribution.
          </p>
        </div>
      </div>

      {completion < 100 && (
        <Card className="overflow-hidden">
          <div className="bg-zam-canvas px-5 py-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-zam-ink">Profile completion</span>
              <span className="font-semibold text-zam-orange">{completion}%</span>
            </div>
            <Progress value={completion} />
            <Link href="/profile" className="mt-2.5 inline-flex items-center gap-1 text-sm font-semibold text-zam-orange hover:underline">
              Complete your profile <ArrowRight size={14} />
            </Link>
          </div>
        </Card>
      )}

      <div>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-zam-ink">Your catalogue</h2>
            <p className="mt-0.5 text-sm text-zam-muted">
              {works.length} work{works.length === 1 ? "" : "s"} registered
              {pending ? ` · ${pending} in review` : ""}
            </p>
          </div>
          <Link href="/works" className="inline-flex items-center gap-1 text-sm font-semibold text-zam-orange hover:underline">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {catalogue.length === 0 ? (
          <Link
            href="/submit/single"
            className="group relative block overflow-hidden rounded-3xl shadow-[0_12px_32px_rgba(28,25,23,0.12)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/auth-mic.webp" alt="" className="h-48 w-full object-cover sm:h-56" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white">
              <p className="font-display text-2xl font-semibold">Send your first work</p>
              <p className="mt-1 max-w-md text-sm text-white/80">
                Upload the song and its artwork together — the way a release looks on a distribution platform.
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold">
                Register a work <ArrowRight size={14} />
              </span>
            </div>
          </Link>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {catalogue.map((item) => (
              <CatalogueCard
                key={item.id}
                title={item.title}
                meta={item.meta}
                coverSrc={item.cover}
                status={item.status}
                href="/works"
              />
            ))}
          </div>
        )}
      </div>

      <Card>
        <CardHeader
          title="Royalty receiving and distribution"
          action={
            <Link href="/royalties" className="inline-flex items-center gap-1 text-sm font-semibold text-zam-orange hover:underline">
              View metrics <ArrowRight size={14} />
            </Link>
          }
        />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <div className="rounded-2xl bg-zam-ink p-5 text-white">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/70">
              <Wallet size={14} /> Distributed to you
            </p>
            <p className="mt-2 font-display text-2xl font-semibold">{formatKwacha(royaltyPaid)}</p>
            {lastDistribution && (
              <p className="mt-1 text-xs text-white/60">Latest: {lastDistribution.periodLabel}</p>
            )}
          </div>
          <div className="rounded-xl border border-zam-line bg-[#FBF7F0] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zam-muted">Pending distribution</p>
            <p className="mt-2 font-display text-2xl font-semibold text-zam-amber">{formatKwacha(royaltyPending)}</p>
          </div>
          <div className="rounded-xl border border-zam-line bg-[#FBF7F0] p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zam-muted">
              <Clock size={14} /> In review
            </p>
            <p className="mt-2 font-display text-2xl font-semibold text-zam-ink">{pending}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/submit/single", label: "Register a work", hint: "Song and artwork together", icon: Music2 },
          { href: "/application", label: "Membership form", hint: "Individual, group or publisher", icon: FilePlus2 },
          { href: "/documents", label: "Documents", hint: "PDFs issued by ZAMCOPS", icon: FileText },
          { href: "/profile", label: "Profile", hint: "Payout and contact details", icon: UserCog },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex flex-col gap-3 rounded-2xl border border-zam-line bg-white p-4 transition-colors hover:border-zam-orange hover:bg-zam-orange-soft/40"
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
                <Link key={n.id} href={n.href || "/notifications"} className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-zam-canvas">
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
