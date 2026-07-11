"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Contact,
  FileText,
  Music2,
  Disc3,
  FolderOpen,
  Wallet,
  CalendarRange,
  Handshake,
  BarChart3,
  LifeBuoy,
  LogOut,
  Smartphone,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  UserRound,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useAdminAuth } from "@/lib/adminAuth";
import { useAdminData } from "@/lib/adminClient";
import { cn } from "@/lib/format";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/members", label: "Member Applications", icon: Users },
  { href: "/admin/directory", label: "All Members", icon: Contact },
  { href: "/admin/works", label: "Work Declarations", icon: FileText },
  { href: "/admin/songs", label: "Song Submissions", icon: Music2 },
  { href: "/admin/albums", label: "Album Submissions", icon: Disc3 },
  { href: "/admin/files", label: "Uploaded Files", icon: FolderOpen },
  { href: "/admin/royalties", label: "Royalty Summary", icon: Wallet },
  { href: "/admin/distributions", label: "Distributions", icon: CalendarRange },
  { href: "/admin/licensing", label: "Licensing Desk", icon: Handshake },
  { href: "/admin/support", label: "Support Inbox", icon: LifeBuoy },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
];

const crumbs: Record<string, string> = Object.fromEntries(nav.map((n) => [n.href, n.label]));

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAdminAuth();
  const { members, supportTickets } = useAdminData();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const pendingMembers = members.filter((m) => m.membershipStatus === "Pending").length;
  const openTickets = supportTickets.filter((t) => t.status === "Open").length;

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Dismiss the account menu on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const active = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const isDetail = pathname.startsWith("/admin/members/") && pathname !== "/admin/members";
  const crumb = isDetail ? "Member Detail" : crumbs[pathname] || "Dashboard";

  const doLogout = async () => {
    await logout();
    router.replace("/admin/login");
  };

  return (
    <div className="admin-surface lg:flex">
      {/* Mobile drawer overlay */}
      {open && (
        <button
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-zam-ink/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar — dark ink rail; off-canvas drawer on mobile */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[264px] shrink-0 flex-col bg-zam-ink transition-transform duration-300 ease-out",
          "lg:sticky lg:top-0 lg:z-auto lg:h-[100dvh] lg:translate-x-0",
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <span className="inline-flex rounded-xl bg-white px-3 py-2 shadow-sm">
            <Logo size={26} onDark={false} />
          </span>
          <button
            onClick={() => setOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-lg text-white/70 hover:bg-white/10 lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2 border-y border-white/10 px-5 py-3">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-zam-orange/20 text-zam-orange">
            <ShieldCheck size={16} />
          </span>
          <span className="font-display text-sm font-semibold text-white">Staff Console</span>
        </div>

        <nav className="no-scrollbar flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((n) => {
            const on = active(n.href, n.exact);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  on
                    ? "bg-zam-orange font-semibold text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                <n.icon size={18} className="shrink-0" />
                <span className="flex-1 truncate">{n.label}</span>
                {n.href === "/admin/members" && pendingMembers > 0 && (
                  <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-zam-amber px-1.5 text-[11px] font-bold text-white">
                    {pendingMembers}
                  </span>
                )}
                {n.href === "/admin/support" && openTickets > 0 && (
                  <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-zam-amber px-1.5 text-[11px] font-bold text-white">
                    {openTickets}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-white/10 p-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
          >
            <Smartphone size={18} /> Member App
          </Link>
          <button
            onClick={doLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zam-red/90 transition hover:bg-zam-red/15 hover:text-zam-red"
          >
            <LogOut size={18} /> Log out
          </button>
          <p className="px-2 pt-2 text-[11px] text-white/35">ZAMCOPS Administration · 2026</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-zam-line bg-white/90 px-4 backdrop-blur-xl lg:px-6">
          <button
            onClick={() => setOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-zam-line text-zam-ink lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-sm sm:flex">
            <Link href="/admin" className="font-medium text-zam-muted hover:text-zam-ink">
              Staff
            </Link>
            {isDetail && (
              <>
                <ChevronRight size={15} className="text-zam-muted/60" />
                <Link href="/admin/members" className="font-medium text-zam-muted hover:text-zam-ink">
                  Members
                </Link>
              </>
            )}
            <ChevronRight size={15} className="text-zam-muted/60" />
            <span className="font-semibold text-zam-ink">{crumb}</span>
          </nav>

          <span className="font-display text-sm font-bold text-zam-ink sm:hidden">{crumb}</span>

          <div className="relative ml-auto" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2.5 rounded-xl p-1 pr-2 hover:bg-zam-canvas"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full brand-gradient-zam text-sm font-bold text-white">
                ZS
              </span>
              <span className="hidden flex-col items-start leading-tight sm:flex">
                <span className="text-sm font-semibold text-zam-ink">ZAMCOPS Staff</span>
                <span className="text-xs text-zam-muted">Administrator</span>
              </span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-zam-line bg-white p-2 shadow-[0_4px_16px_rgba(16,24,40,0.08)]">
                <div className="mb-1 border-b border-zam-line px-3 py-2.5">
                  <p className="text-sm font-semibold text-zam-ink">ZAMCOPS Staff</p>
                  <p className="text-xs text-zam-muted">Staff Console</p>
                </div>
                <Link
                  href="/dashboard"
                  className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-zam-ink hover:bg-zam-canvas"
                >
                  <UserRound size={16} className="text-zam-muted" /> Member App
                </Link>
                <button
                  onClick={doLogout}
                  className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-zam-red hover:bg-zam-red/10"
                >
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

// Shared page header for admin pages.
export function AdminHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-zam-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-zam-muted">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
