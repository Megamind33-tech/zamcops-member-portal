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
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAdminAuth();
  const active = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const doLogout = () => {
    logout();
    router.replace("/admin/login");
  };

  return (
    <div className="min-h-[100dvh] bg-slate-100 lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="border-b border-slate-100 px-5 py-5">
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
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <n.icon size={18} />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-1 border-t border-slate-100 p-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <Smartphone size={18} /> Member App
          </Link>
          <button
            onClick={doLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut size={18} /> Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar + horizontal nav */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <Logo size={32} subtitle="Staff Console" />
          <button onClick={doLogout} className="rounded-lg bg-red-50 p-2 text-red-600">
            <LogOut size={16} />
          </button>
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
                active(n.href, n.exact) ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
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
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 lg:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
