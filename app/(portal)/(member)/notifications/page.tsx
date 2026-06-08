"use client";

import React from "react";
import { CheckCheck, Info, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { TopBar } from "@/components/mobile/TopBar";
import { EmptyState } from "@/components/ui/Misc";
import { Illustration } from "@/components/media/Illustration";
import { useApp, useMemberData } from "@/lib/store";
import { timeAgo, cn } from "@/lib/format";
import type { AppNotification } from "@/types";

const styles: Record<
  AppNotification["type"],
  { icon: React.ComponentType<{ size?: number }>; kicker: string; ring: string; fg: string; glow: string; wash: string }
> = {
  info: {
    icon: Info,
    kicker: "Update",
    ring: "ring-brand-400/30",
    fg: "text-brand-200",
    glow: "rgba(84,96,248,0.32)",
    wash: "rgba(84,96,248,0.07)",
  },
  success: {
    icon: CheckCircle2,
    kicker: "Approved",
    ring: "ring-emerald-400/30",
    fg: "text-emerald-300",
    glow: "rgba(16,185,129,0.32)",
    wash: "rgba(16,185,129,0.07)",
  },
  warning: {
    icon: AlertTriangle,
    kicker: "Action needed",
    ring: "ring-gold-400/30",
    fg: "text-gold-300",
    glow: "rgba(245,166,35,0.32)",
    wash: "rgba(245,166,35,0.07)",
  },
  action: {
    icon: FileText,
    kicker: "Review",
    ring: "ring-accent-400/30",
    fg: "text-accent-300",
    glow: "rgba(25,224,138,0.32)",
    wash: "rgba(25,224,138,0.07)",
  },
};

export default function NotificationsScreen() {
  const { markNotificationRead, markAllRead } = useApp();
  const { notifications } = useMemberData();
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div>
      <TopBar
        title="Notifications"
        back="/dashboard"
        right={
          hasUnread ? (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-brand-300 ring-1 ring-white/10 hover:bg-white/[0.1]"
            >
              <CheckCheck size={14} /> Mark all
            </button>
          ) : undefined
        }
      />

      <div className="px-4 py-4">
        {notifications.length === 0 ? (
          <EmptyState art={<Illustration name="inbox" />} title="You're all caught up" message="New updates about your submissions and royalties will show here." />
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const s = styles[n.type];
              const Icon = s.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => markNotificationRead(n.id)}
                  className={cn(
                    "card group relative flex w-full items-start gap-3.5 overflow-hidden px-4 py-4 text-left transition hover:bg-white/[0.03]",
                    !n.read ? "ring-1 ring-white/[0.14]" : "opacity-70"
                  )}
                >
                  <span
                    className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl transition group-hover:scale-110"
                    style={{ background: s.glow, opacity: n.read ? 0.12 : 0.4 }}
                  />
                  <span
                    className="pointer-events-none absolute inset-0"
                    style={{ background: `linear-gradient(115deg, ${s.wash} 0%, transparent 60%)` }}
                  />

                  <span className={cn("relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/[0.05] ring-1", s.ring, s.fg)}>
                    <Icon size={18} />
                    {!n.read && (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent-400 shadow-[0_0_8px_rgba(47,231,154,0.8)]" />
                    )}
                  </span>
                  <div className="relative min-w-0 flex-1">
                    <p className={cn("text-[10px] font-bold uppercase tracking-[0.2em]", s.fg)}>{s.kicker}</p>
                    <p className="mt-0.5 truncate text-[15px] font-bold leading-tight text-white">{n.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-night-300">{n.body}</p>
                    <p className="mt-1.5 text-[10px] uppercase tracking-[0.16em] text-night-500">{timeAgo(n.createdAt)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
