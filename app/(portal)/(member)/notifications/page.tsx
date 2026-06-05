"use client";

import React from "react";
import { Bell, CheckCheck, Info, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { TopBar } from "@/components/mobile/TopBar";
import { EmptyState } from "@/components/ui/Misc";
import { useApp, useMemberData } from "@/lib/store";
import { timeAgo, cn } from "@/lib/format";
import type { AppNotification } from "@/types";

const styles: Record<
  AppNotification["type"],
  { icon: React.ComponentType<{ size?: number }>; bg: string; fg: string }
> = {
  info: { icon: Info, bg: "bg-blue-50", fg: "text-blue-600" },
  success: { icon: CheckCircle2, bg: "bg-emerald-50", fg: "text-emerald-600" },
  warning: { icon: AlertTriangle, bg: "bg-amber-50", fg: "text-amber-600" },
  action: { icon: FileText, bg: "bg-brand-50", fg: "text-brand-600" },
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
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-600"
            >
              <CheckCheck size={14} /> Mark all
            </button>
          ) : undefined
        }
      />

      <div className="px-4 py-4">
        {notifications.length === 0 ? (
          <EmptyState icon={<Bell size={22} />} title="You're all caught up" message="New updates about your submissions and royalties will show here." />
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
                    "card flex w-full items-start gap-3 px-4 py-3.5 text-left transition",
                    !n.read && "ring-1 ring-brand-100"
                  )}
                >
                  <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", s.bg, s.fg)}>
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-brand-900">{n.title}</p>
                      {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-gold-500" />}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{n.body}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
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
