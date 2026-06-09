"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Music2,
  Disc3,
  FolderOpen,
  Wallet,
  CalendarRange,
  Handshake,
  BarChart3,
  LogOut,
  Smartphone,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useAdminAuth } from "@/lib/adminAuth";
import { cn } from "@/lib/format";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/members", label: "Member Applications", icon: Users },
  { href: "/admin/works", label: "Work Declarations", icon: FileText },
  { href: "/admin/songs", label: "Song Submissions", icon: Music2 },
  { href: "/admin/albums", label: "Album Submissions", icon: Disc3 },
  { href: "/admin/files", label: "Uploaded Files", icon: FolderOpen },
  { href: "/admin/royalties", label: "Royalty Summary", icon: Wallet },
  { href: "/admin/distributions", label: "Distributions", icon: CalendarRange },
  { href: "/admin/licensing", label: "Licensing Desk", icon: Handshake },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAdminAuth();
  const active = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const doLogout = async () => {
    await logout();
    router.replace("/admin/login");
  };

  return (
    <div className="min-h-[100dvh] bg-night-950 text-white lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.07] bg-night-900/80 backdrop-blur-xl lg:flex">
        <div className="border-b border-white/[0.07] px-5 py-5">
          <Logo size={36} subtitle="Staff Console" />
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active(n.href, n.exact)
                  ? "bg-accent-500 text-night-950 shadow-[0_14px_30px_-12px_rgba(255,138,61,0.6)]"
                  : "text-night-300 hover:bg-white/[0.05] hover:text-white"
              )}
            >
              <n.icon size={18} />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-1 border-t border-white/[0.07] p-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-night-300 transition hover:bg-white/[0.05] hover:text-white"
          >
            <Smartphone size={18} /> Member App
          </Link>
          <button
            onClick={doLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/10"
          >
            <LogOut size={18} /> Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar + horizontal nav */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between border-b border-white/[0.07] bg-night-900/80 px-4 py-3 backdrop-blur-xl">
          <Logo size={32} subtitle="Staff Console" />
          <button onClick={doLogout} className="rounded-lg bg-red-500/12 p-2 text-red-300">
            <LogOut size={16} />
          </button>
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-white/[0.07] bg-night-900/80 px-3 py-2 backdrop-blur-xl">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                active(n.href, n.exact)
                  ? "bg-accent-500 text-night-950"
                  : "bg-white/[0.05] text-night-300 hover:text-white"
              )}
            >
              {n.label}
            </Link>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-x-hidden p-4 lg:p-8">{children}</main>
    </div>
  );
}

// Shared header + table primitives for admin pages.
export function AdminHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight text-white lg:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-night-300">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
