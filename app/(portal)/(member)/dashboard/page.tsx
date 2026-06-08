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
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { useApp, useMemberData } from "@/lib/store";
import { profileCompletion } from "@/lib/member";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionTitle } from "@/components/ui/Misc";
import { CoverArt, coverGlow } from "@/components/media/CoverArt";
import { formatKwacha, timeAgo, cn } from "@/lib/format";

export default function DashboardScreen() {
  const { currentMember } = useApp();
  const { works, singles, albums, notifications, royalty } = useMemberData();
  const member = currentMember!;
  const completion = profileCompletion(member);

  const catalog = [
    ...singles.map((s) => ({ id: s.id, title: s.title, sub: s.genre || "Single", status: s.status, kind: "Single", date: s.submittedAt })),
    ...albums.map((a) => ({ id: a.id, title: a.title, sub: `${a.tracks.length} tracks`, status: a.status, kind: "Album", date: a.submittedAt })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  const pending =
    works.filter((w) => w.status === "Pending").length +
    singles.filter((s) => s.status === "Pending" || s.status === "Under Review").length +
    albums.filter((a) => a.status === "Pending").length;
  const unread = notifications.filter((n) => !n.read).length;
  const latest = notifications.slice(0, 3);

  const quickActions = [
    { href: "/submit/single", label: "Submit song", hint: "Capture a new release", icon: Music2, tint: "from-accent-400 to-accent-700" },
    { href: "/works/new", label: "Declare work", hint: "Record ownership details", icon: FilePlus2, tint: "from-iris-400 to-brand-700" },
    { href: "/submit/album", label: "Upload album", hint: "Package tracks together", icon: Disc3, tint: "from-gold-400 to-pop-500" },
    { href: "/profile", label: "Update profile", hint: "Keep KYC current", icon: UserCog, tint: "from-pop-400 to-iris-700" },
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
        className="relative overflow-hidden rounded-[2.2rem] bg-night-900 px-5 py-5 text-white shadow-[0_30px_70px_-30px_rgba(0,0,0,0.8)] ring-1 ring-white/10 animate-fade-up"
        style={{ animationDelay: "40ms" }}
      >
        <div className="pointer-events-none absolute inset-0">
          <img src="/img/hero-concert.webp" alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(5,5,12,0.55)_0%,rgba(5,5,12,0.82)_55%,rgba(5,5,12,0.95)_100%)]" />
        <div className="pointer-events-none absolute -left-16 -top-10 h-48 w-48 rounded-full bg-accent-500/15 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.26em] text-white backdrop-blur">
              <Sparkles size={12} className="text-accent-400" />
              Member portal
            </div>

            <div className="min-w-0">
              <p className="text-sm text-white/80">Good to see you</p>
              <h1 className="mt-1 truncate font-display text-[2rem] font-bold leading-none tracking-tight sm:text-[2.15rem]">
                {member.stageName || member.fullName}
              </h1>
              <p className="mt-2 max-w-[20rem] text-sm leading-relaxed text-white/85">
                Your studio for declarations, submissions and royalties.
              </p>
            </div>
          </div>

          <Link
            href="/notifications"
            className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/15 bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
            aria-label="Open notifications"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent-400 px-1 text-[10px] font-bold text-night-950">
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

        <div className="relative mt-5 flex items-center justify-between gap-3 rounded-[1.5rem] border border-white/15 bg-black/15 px-4 py-3 backdrop-blur">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-white/70">
              Member code
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="font-mono text-sm font-semibold text-white">{member.memberNumber}</p>
              <StatusBadge status={member.membershipStatus} className="border-white/30 bg-white/90 text-night-900" />
            </div>
          </div>

          <div className="flex items-end gap-1">
            {[12, 18, 10, 24, 16, 20].map((height, index) => (
              <span
                key={index}
                className="w-1.5 origin-bottom rounded-full bg-gradient-to-t from-accent-600/60 to-accent-300 animate-equalize"
                style={{ height: `${height}px`, animationDelay: `${index * 0.12}s`, animationDuration: `${0.9 + (index % 3) * 0.3}s` }}
              />
            ))}
          </div>
        </div>

        <div className="relative mt-4 rounded-[1.4rem] border border-white/12 bg-black/20 px-4 py-3 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-white/70">
                Royalty snapshot
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                {formatKwacha(royalty?.totalEstimated ?? 0)}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
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
        {catalog.length > 0 && (
          <section className="animate-fade-up" style={{ animationDelay: "70ms" }}>
            <SectionTitle
              title="Your catalog"
              action={
                <Link href="/works" className="text-xs font-semibold text-brand-300">
                  See all
                </Link>
              }
            />
            <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1">
              {catalog.map((item, index) => (
                <Link
                  key={item.id}
                  href="/works"
                  className="group relative w-[150px] shrink-0 animate-fade-up"
                  style={{ animationDelay: `${90 + index * 40}ms` }}
                >
                  <div className="relative">
                    <span
                      className="pointer-events-none absolute -inset-7 rounded-full opacity-70 blur-2xl transition group-hover:opacity-100"
                      style={{ background: coverGlow(item.title, 0.4) }}
                    />
                    <CoverArt
                      seed={item.title}
                      size={150}
                      rounded="rounded-[1.4rem]"
                      className="relative shadow-[0_28px_60px_-22px_rgba(0,0,0,0.75)] ring-1 ring-white/10 transition duration-300 group-hover:-translate-y-1 group-hover:ring-white/25"
                    />
                    <span className="absolute right-2 top-2">
                      <StatusBadge status={item.status} className="bg-night-950/70 backdrop-blur-md" />
                    </span>
                  </div>
                  <p className="mt-2.5 truncate text-[13px] font-bold leading-tight text-white">{item.title}</p>
                  <p className="truncate text-[11px] text-night-400">
                    {item.kind} · {item.sub}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="animate-fade-up" style={{ animationDelay: "100ms" }}>
          <SectionTitle title="Quick actions" />
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => (
              <Link
                key={action.href}
                href={action.href}
                className={cn(
                  "group relative isolate flex aspect-[5/4] flex-col justify-between overflow-hidden rounded-[1.6rem] bg-gradient-to-br p-4 shadow-[0_20px_45px_-20px_rgba(0,0,0,0.65)] ring-1 ring-white/10 transition duration-200 hover:-translate-y-0.5 active:translate-y-px animate-fade-up",
                  action.tint
                )}
                style={{ animationDelay: `${80 + index * 40}ms` }}
              >
                <action.icon
                  size={92}
                  strokeWidth={1.1}
                  className="pointer-events-none absolute -bottom-6 -right-6 text-white/[0.16] transition duration-300 group-hover:scale-110 group-hover:text-white/25"
                />
                <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-black/20 text-white ring-1 ring-white/15 backdrop-blur">
                  <action.icon size={16} />
                </span>
                <div className="relative">
                  <p className="text-[15px] font-bold leading-tight tracking-tight text-white">{action.label}</p>
                  <p className="mt-1 flex items-center gap-1 text-[11px] leading-snug text-white/70">
                    {action.hint}
                    <ArrowUpRight size={12} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section
          className="grain relative isolate overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-night-800/70 p-5 shadow-card backdrop-blur-xl animate-fade-up"
          style={{ animationDelay: "160ms" }}
        >
          <span className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent-500/14 blur-[80px]" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.28em] text-accent-400">
                <Wallet size={12} />
                This quarter's earnings
              </p>
              <p className="mt-2 font-display text-[2.4rem] font-bold leading-none tracking-tight text-white">
                {formatKwacha(royalty?.totalEstimated ?? 0)}
              </p>
              <p className="mt-1.5 text-xs text-night-400">Estimated across all detected airplay and streams</p>
            </div>
            <Link
              href="/royalties"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.06] text-night-300 ring-1 ring-white/10 transition hover:bg-white/[0.1] hover:text-white"
              aria-label="Open royalties"
            >
              <ChevronRight size={16} />
            </Link>
          </div>

          {(() => {
            const paid = royalty?.paid ?? 0;
            const pending = royalty?.pending ?? 0;
            const total = Math.max(paid + pending, 1);
            return (
              <div className="relative mt-5">
                <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <span className="h-full bg-gradient-to-r from-accent-500 to-accent-300" style={{ width: `${(paid / total) * 100}%` }} />
                  <span className="h-full bg-gradient-to-r from-gold-500/70 to-gold-400/70" style={{ width: `${(pending / total) * 100}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-accent-400" />
                    <span className="text-xs text-night-300">Paid</span>
                    <span className="font-display text-sm font-bold text-white">{formatKwacha(paid)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-gold-400" />
                    <span className="text-xs text-night-300">Pending</span>
                    <span className="font-display text-sm font-bold text-white">{formatKwacha(pending)}</span>
                  </span>
                </div>
              </div>
            );
          })()}
        </section>

        <section className="animate-fade-up" style={{ animationDelay: "220ms" }}>
          <SectionTitle
            title="Latest updates"
            action={
              <Link href="/notifications" className="text-xs font-semibold text-brand-300">
                See all
              </Link>
            }
          />
          <div className="card divide-y divide-white/[0.06] overflow-hidden">
            {latest.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-night-400">
                No notifications yet.
              </p>
            )}
            {latest.map((notification) => (
              <Link
                key={notification.id}
                href="/notifications"
                className="flex items-start gap-3 px-4 py-3.5 transition hover:bg-white/[0.03]"
              >
                <span
                  className={
                    "mt-1 h-2.5 w-2.5 shrink-0 rounded-full " +
                    (notification.read ? "bg-night-600" : "bg-accent-400 shadow-[0_0_10px_rgba(47,231,154,0.55)]")
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{notification.title}</p>
                  <p className="mt-0.5 truncate text-xs text-night-400">{notification.body}</p>
                </div>
                <span className="shrink-0 text-[10px] text-night-500">
                  {timeAgo(notification.createdAt)}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="card relative overflow-hidden p-4 animate-fade-up" style={{ animationDelay: "280ms" }}>
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent-500/12 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-accent-400">
                Next step
              </p>
              <h3 className="mt-1 font-display text-xl font-bold tracking-tight text-white">
                {nextStep.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-night-300">{nextStep.body}</p>
            </div>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[1.1rem] bg-white/[0.06] text-brand-300 ring-1 ring-white/10">
              <Clock size={18} />
            </span>
          </div>
          <Link
            href={nextStep.href}
            className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-accent-500 px-4 py-2.5 text-sm font-semibold text-night-950 shadow-[0_14px_30px_-12px_rgba(25,224,138,0.6)] transition hover:bg-accent-400"
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
    <div className="rounded-2xl border border-white/12 bg-white/10 px-3 py-3 backdrop-blur">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/75">{label}</p>
      <p className="mt-2 font-display text-[1.35rem] font-bold leading-none text-white">{value}</p>
      <p className="mt-1 text-[11px] text-white/70">{caption}</p>
    </div>
  );
}

function MiniChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-left backdrop-blur">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">{label}</p>
      <p className="mt-1 truncate text-xs font-semibold text-white">{value}</p>
    </div>
  );
}
