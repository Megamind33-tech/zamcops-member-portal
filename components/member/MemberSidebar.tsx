"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Music,
  Upload,
  FolderUp,
  Coins,
  ReceiptText,
  Bell,
  User,
  Handshake,
  LifeBuoy,
  Settings,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/format";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/works", label: "My Works", icon: Music },
  { to: "/submit", label: "Submit", icon: Upload },
  { to: "/uploads", label: "Music Uploads", icon: FolderUp },
  { to: "/royalties", label: "Royalties", icon: Coins },
  { to: "/statements", label: "Statements", icon: ReceiptText },
  { to: "/licensing", label: "Licensing", icon: Handshake },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/support", label: "Support", icon: LifeBuoy },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function MemberSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { notifications } = useApp();
  const unread = notifications.filter((n) => !n.read).length;
  const active = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-zam-ink/40 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          "fixed top-0 z-50 flex h-[100dvh] w-64 shrink-0 flex-col border-r border-zam-line bg-white transition-transform lg:sticky lg:z-auto lg:translate-x-0",
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-zam-line px-5">
          <Logo size={26} onDark={false} />
          <button onClick={onClose} className="p-1 text-zam-muted lg:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="zam-flagline mx-5 mt-3" />

        <nav className="no-scrollbar flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((item) => {
            const on = active(item.to, item.exact);
            return (
              <Link
                key={item.to}
                href={item.to}
                onClick={onClose}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                  on ? "bg-zam-orange-soft text-zam-orange-dark" : "text-zam-muted hover:bg-zam-canvas hover:text-zam-ink"
                )}
              >
                <item.icon className={cn("h-[18px] w-[18px]", on && "text-zam-orange")} />
                <span className="flex-1">{item.label}</span>
                {item.label === "Notifications" && unread > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zam-orange px-1.5 text-xs font-bold text-white">
                    {unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zam-line p-3">
          <div className="rounded-xl bg-zam-canvas p-3">
            <p className="text-xs font-semibold text-zam-ink">ZAMCOPS member</p>
            <p className="mt-0.5 text-xs text-zam-muted">Protecting your music rights across Zambia.</p>
          </div>
        </div>
      </aside>
    </>
  );
}
