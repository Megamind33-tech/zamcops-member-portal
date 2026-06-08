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
  Sparkles,
  ArrowUpRight,
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
    {
      href: "/submit/single",
      label: "Submit song",
      hint: "Capture a new release",
      icon: Music2,
    },
    {
      href: "/works/new",
      label: "Declare work",
      hint: "Record ownership details",
      icon: FilePlus2,
    },
    {
      href: "/submit/album",
      label: "Upload album",
      hint: "Package tracks together",
      icon: Disc3,
    },
    {
      href: "/profile",
      label: "Update profile",
      hint: "Keep KYC current",
      icon: UserCog,
    },
  ];

  const nextStep =
    completion < 100
      ? {
          title: "Finish your profile",
          body: "Complete KYC details to speed up review and royalty payouts.",
          href: "/profile",
          cta: "Continue KYC",
        }
      : pending > 0
        ? {
            title: "Track your reviews",
            body: "Your latest declarations are waiting in the review queue.",
            href: "/notifications",
            cta: "See updates",
          }
        : {
            title: "Stay in rhythm",
            body: "Everything is in good order. Check back for new royalty activity.",
            href: "/royalties",
            cta: "Open royalties",
          };

  return (
    <div className="px-4 pb-6 pt-4">
      <section
        className="relative overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-5 py-5 text-white shadow-[0_24px_60px_rgba(16,45,73,0.22)] animate-fade-up"
        style={{ animationDelay: "40ms" }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,0.08),transparent_36%,rgba(255,255,255,0.04)_64%,transparent)]" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-gold-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-brand-50">
              <Sparkles size={12} className="text-gold-400" />
              Member portal
            </div>

            <div className="min-w-0">
              <p className="text-sm text-brand-100/90">Good to see you</p>
              <h1 className="mt-1 truncate font-display text-[2rem] leading-none tracking-tight sm:text-[2.15rem]">
                {member.stageName || member.fullName}
              </h1>
              <p className="mt-2 max-w-[20rem] text-sm leading-relaxed text-brand-50/90">
                A calmer, richer home for declarations, submissions and royalties.
              </p>
            </div>
          </div>

          <Link
            href="/notifications"
            className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur transition hover:bg-white/10"
            aria-label="Open notifications"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold-400 px-1 text-[10px] font-bold text-brand-900">
                {unread}
              </span>
            )}
          </Link>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2.5">
          <MetricTile label="KYC" value={`${completion}%`} caption={completion < 100 ? "in progress" : "complete"} />
          <MetricTile label="Pending" value={String(pending)} caption="in review" />
          <MetricTile label="Works" value={String(works.length)} caption="declared" />
        </div>

        <div className="relative mt-5 flex items-center justify-between gap-3 rounded-[1.5rem] border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-brand-100/75">
              Member code
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="font-mono text-sm font-semibold text-white">{member.memberNumber}</p>
              <StatusBadge status={member.membershipStatus} className="bg-white/90 text-brand-900" />
            </div>
          </div>

          <div className="flex items-end gap-1">
            {[12, 18, 10, 24, 16, 20].map((height, index) => (
              <span
                key={index}
                className="w-1.5 rounded-full bg-gradient-to-t from-gold-400/40 to-gold-400"
                style={{ height: `${height}px` }}
              />
            ))}
          </div>
        </div>

        <div className="relative mt-4 rounded-[1.4rem] border border-white/10 bg-brand-900/25 px-4 py-3 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-brand-100/75">
                Royalty snapshot
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                {formatKwacha(royalty?.totalEstimated ?? 0)}
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-brand-50">
              Live
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <MiniChip label="Estimated" value={formatKwacha(royalty?.totalEstimated ?? 0)} />
            <MiniChip label="Pending" value={formatKwacha(royalty?.pending ?? 0)} />
            <MiniChip label="Paid" value={formatKwacha(royalty?.paid ?? 0)} />
          </div>
        </div>
      </section>

      <div className="mt-5 space-y-5">
        <section className="animate-fade-up" style={{ animationDelay: "100ms" }}>
          <SectionTitle title="Quick actions" />
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => (
              <Link
                key={action.href}
                href={action.href}
                className="group card relative overflow-hidden px-4 py-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-glow active:translate-y-px"
                style={{ animationDelay: `${80 + index * 40}ms` }}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(31,79,126,0.08),transparent_42%)] opacity-0 transition group-hover:opacity-100" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="grid h-11 w-11 place-items-center rounded-[1.1rem] bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                      <action.icon size={18} />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-brand-900">{action.label}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{action.hint}</p>
                  </div>
                  <ArrowUpRight size={16} className="mt-1 text-slate-400 transition group-hover:text-brand-600" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="card overflow-hidden animate-fade-up" style={{ animationDelay: "160ms" }}>
          <div className="border-b border-white/70 bg-gradient-to-r from-brand-50/80 to-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-brand-800">
                <Wallet size={16} className="text-gold-600" />
                Royalty summary
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              A quick look at what is estimated, pending, and paid.
            </p>
          </div>

          <div className="grid grid-cols-3 divide-x divide-slate-100 px-2 py-4 text-center">
            <RoyaltyStat label="Estimated" value={royalty?.totalEstimated ?? 0} />
            <RoyaltyStat label="Pending" value={royalty?.pending ?? 0} />
            <RoyaltyStat label="Paid" value={royalty?.paid ?? 0} />
          </div>
        </section>

        <section className="animate-fade-up" style={{ animationDelay: "220ms" }}>
          <SectionTitle
            title="Latest updates"
            action={
              <Link href="/notifications" className="text-xs font-semibold text-brand-600">
                See all
              </Link>
            }
          />
          <div className="card divide-y divide-slate-100 overflow-hidden">
            {latest.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-slate-400">
                No notifications yet.
              </p>
            )}
            {latest.map((notification) => (
              <Link
                key={notification.id}
                href="/notifications"
                className="flex items-start gap-3 px-4 py-3.5 transition hover:bg-brand-50/40"
              >
                <span
                  className={
                    "mt-1 h-2.5 w-2.5 shrink-0 rounded-full shadow-sm " +
                    (notification.read ? "bg-slate-200" : "bg-gold-500")
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-brand-900">{notification.title}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{notification.body}</p>
                </div>
                <span className="shrink-0 text-[10px] text-slate-400">
                  {timeAgo(notification.createdAt)}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="card overflow-hidden bg-gradient-to-br from-white to-brand-50/60 p-4 animate-fade-up" style={{ animationDelay: "280ms" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold-600">
                Next step
              </p>
              <h3 className="mt-1 font-display text-xl font-semibold tracking-tight text-brand-900">
                {nextStep.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{nextStep.body}</p>
            </div>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[1.1rem] bg-brand-50 text-brand-700 ring-1 ring-brand-100">
              <Clock size={18} />
            </span>
          </div>
          <Link
            href={nextStep.href}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-800 px-4 py-2.5 text-sm font-semibold text-white shadow-fab transition hover:bg-brand-700"
          >
            {nextStep.cta}
            <ChevronRight size={16} />
          </Link>
        </section>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 backdrop-blur">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-100/80">{label}</p>
      <p className="mt-2 font-display text-[1.35rem] font-semibold leading-none text-white">{value}</p>
      <p className="mt-1 text-[11px] text-brand-100/75">{caption}</p>
    </div>
  );
}

function MiniChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-left backdrop-blur">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-100/70">{label}</p>
      <p className="mt-1 truncate text-xs font-semibold text-white">{value}</p>
    </div>
  );
}

function RoyaltyStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-1">
      <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-1 font-display text-sm font-semibold text-brand-900">{formatKwacha(value)}</p>
    </div>
  );
}
