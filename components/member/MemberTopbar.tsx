"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Bell, ChevronRight, LogOut, User, Settings } from "lucide-react";
import { useApp } from "@/lib/store";
import { Avatar } from "@/components/zam/Misc";
import { StatusBadge } from "@/components/zam/StatusBadge";

export function MemberTopbar({ breadcrumb, onMenu }: { breadcrumb: string; onMenu: () => void }) {
  const { currentMember, notifications, logout } = useApp();
  const router = useRouter();
  const unread = notifications.filter((n) => !n.read).length;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const m = currentMember;
  const doLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-zam-line bg-white/90 px-4 backdrop-blur lg:px-6">
      <button onClick={onMenu} className="p-1 text-zam-muted lg:hidden" aria-label="Open menu">
        <Menu className="h-6 w-6" />
      </button>

      <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-sm sm:flex">
        <Link href="/dashboard" className="font-medium text-zam-muted hover:text-zam-ink">
          Portal
        </Link>
        <ChevronRight className="h-4 w-4 text-zam-muted/60" />
        <span className="font-semibold text-zam-ink">{breadcrumb}</span>
      </nav>

      <Link
        href="/notifications"
        className="relative ml-auto flex h-10 w-10 items-center justify-center rounded-xl border border-zam-line bg-white text-zam-muted hover:bg-zam-canvas hover:text-zam-ink"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zam-orange px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </Link>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-zam-canvas"
        >
          <Avatar name={m?.fullName || "Member"} src={m?.profilePhoto} size={36} />
          <span className="hidden flex-col items-start leading-tight sm:flex">
            <span className="text-sm font-semibold text-zam-ink">{m?.stageName || m?.fullName}</span>
            <span className="text-xs text-zam-muted">{m?.memberNumber}</span>
          </span>
        </button>
        {menuOpen && (
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-zam-line bg-white p-2 shadow-card-lg">
            <div className="mb-1 border-b border-zam-line px-3 py-2.5">
              <p className="text-sm font-semibold text-zam-ink">{m?.fullName}</p>
              <p className="mb-2 text-xs text-zam-muted">{m?.email}</p>
              {m?.membershipStatus && <StatusBadge status={m.membershipStatus} />}
            </div>
            <button
              onClick={() => {
                router.push("/profile");
                setMenuOpen(false);
              }}
              className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-zam-ink hover:bg-zam-canvas"
            >
              <User className="h-4 w-4 text-zam-muted" /> Profile
            </button>
            <button
              onClick={() => {
                router.push("/settings");
                setMenuOpen(false);
              }}
              className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-zam-ink hover:bg-zam-canvas"
            >
              <Settings className="h-4 w-4 text-zam-muted" /> Settings
            </button>
            <button
              onClick={doLogout}
              className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-zam-red hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
