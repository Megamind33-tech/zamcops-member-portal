"use client";

import React from "react";
import { CheckCheck, Info, CheckCircle2, AlertTriangle, FileText, Bell } from "lucide-react";
import { useApp, useMemberData } from "@/lib/store";
import { PageHeader } from "@/app/(portal)/(member)/layout";
import { Card } from "@/components/zam/Card";
import { Button } from "@/components/zam/Button";
import { EmptyState } from "@/components/zam/Misc";
import { timeAgo, cn } from "@/lib/format";
import type { AppNotification } from "@/types";

const styles: Record<AppNotification["type"], { icon: React.ComponentType<{ size?: number }>; tile: string }> = {
  info: { icon: Info, tile: "bg-zam-blue-soft text-zam-blue" },
  success: { icon: CheckCircle2, tile: "bg-zam-green-soft text-zam-green" },
  warning: { icon: AlertTriangle, tile: "bg-zam-amber-soft text-[#B8791A]" },
  action: { icon: FileText, tile: "bg-zam-orange-soft text-zam-orange" },
};

export default function NotificationsScreen() {
  const { markNotificationRead, markAllRead } = useApp();
  const { notifications } = useMemberData();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : "You're all caught up"}
        action={
          unread > 0 ? (
            <Button variant="secondary" icon={<CheckCheck size={16} />} onClick={() => markAllRead()}>
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Bell size={28} />}
            title="You're all caught up"
            description="New updates about your submissions and royalties will show here."
          />
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-zam-line">
            {notifications.map((n) => {
              const s = styles[n.type];
              const Icon = s.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => markNotificationRead(n.id)}
                  className={cn(
                    "flex w-full items-start gap-3.5 px-5 py-4 text-left transition-colors hover:bg-zam-canvas",
                    !n.read && "bg-zam-orange-soft/30"
                  )}
                >
                  <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", s.tile)}>
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-zam-ink">{n.title}</p>
                      {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-zam-orange" />}
                    </div>
                    <p className="mt-0.5 text-sm text-zam-muted">{n.body}</p>
                    <p className="mt-1.5 text-xs text-zam-muted">{timeAgo(n.createdAt)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
