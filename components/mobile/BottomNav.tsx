"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Library, BarChart3, User, Plus } from "lucide-react";
import { cn } from "@/lib/format";

const tabs = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/works", label: "Works", icon: Library },
  { href: "/royalties", label: "Royalties", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="sticky bottom-0 z-30 mt-auto px-3 pb-3">
      <div className="relative rounded-[1.75rem] border border-white/10 bg-night-850/80 shadow-nav backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/60 to-transparent" />

        <Link
          href="/submit"
          aria-label="Submit song or declare work"
          className="absolute -top-7 left-1/2 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full brand-gradient text-white shadow-fab ring-[5px] ring-night-900 transition active:scale-95"
        >
          <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.45),transparent_55%)]" />
          <Plus size={26} strokeWidth={2.5} className="relative" />
        </Link>

        <ul className="grid grid-cols-5 items-end px-2 pb-[max(env(safe-area-inset-bottom),0.65rem)] pt-2">
          {tabs.slice(0, 2).map((t) => (
            <NavItem key={t.href} {...t} active={isActive(t.href)} />
          ))}
          <li aria-hidden className="flex flex-col items-center">
            <span className="h-7" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-300">Submit</span>
          </li>
          {tabs.slice(2).map((t) => (
            <NavItem key={t.href} {...t} active={isActive(t.href)} />
          ))}
        </ul>
      </div>
    </nav>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  active: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition",
          active
            ? "bg-white/[0.08] text-white ring-1 ring-white/10"
            : "text-night-400 hover:bg-white/[0.04] hover:text-night-200"
        )}
      >
        <Icon size={22} strokeWidth={active ? 2.4 : 2} />
        <span className={cn("text-[10px]", active ? "font-bold" : "font-medium")}>{label}</span>
      </Link>
    </li>
  );
}
