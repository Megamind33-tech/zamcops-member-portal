"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  Music,
  Upload,
  Coins,
  ReceiptText,
  Bell,
  User,
  LifeBuoy,
  Settings,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/format";

const nav = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true },
  { to: "/works", label: "My catalogue", icon: Music },
  { to: "/submit", label: "Register a work", icon: Upload },
  { to: "/royalties", label: "Royalties", icon: Coins },
  { to: "/statements", label: "Statements", icon: ReceiptText },
  { to: "/application", label: "Membership", icon: ClipboardList },
  { to: "/documents", label: "Documents", icon: FileText },
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
          "fixed top-0 z-50 flex h-[100dvh] w-64 shrink-0 flex-col border-r border-zam-line bg-[#FBF7F0] transition-transform lg:sticky lg:z-auto lg:translate-x-0",
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
                  on ? "bg-zam-orange-soft text-zam-orange-dark" : "text-zam-muted hover:bg-white hover:text-zam-ink"
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
          <div className="overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/piano.webp" alt="" className="h-20 w-full object-cover" />
            <div className="bg-white p-3">
              <p className="text-xs font-semibold text-zam-ink">Composers, authors, publishers</p>
              <p className="mt-0.5 text-xs text-zam-muted">Register works with artwork. Follow royalties as they are distributed.</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
