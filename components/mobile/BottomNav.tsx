"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Disc3, Home, Plus, Radio, UserRound } from "lucide-react";
import { cn } from "@/lib/format";

const tabs = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/works", label: "Works", icon: Disc3 },
  { href: "/royalties", label: "Royalties", icon: Radio },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="sticky bottom-0 z-30 mt-auto px-3 pb-3">
      <div className="relative rounded-[1.75rem] border border-white/10 bg-night-850/85 shadow-nav backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-accent-400/70 to-transparent" />
        {/* Faint equalizer silhouette — the "music OS" texture, barely-there. */}
        <div className="pointer-events-none absolute inset-x-10 bottom-2 flex items-end justify-between opacity-[0.05]">
          {[7, 13, 9, 16, 8, 14, 10, 6].map((h, i) => (
            <span key={i} className="w-1 rounded-full bg-white" style={{ height: `${h}px` }} />
          ))}
        </div>

        <Link
          href="/submit"
          aria-label="Submit song or declare work"
          className="absolute -top-7 left-1/2 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-accent-500 text-night-950 shadow-[0_18px_40px_-14px_rgba(255,138,61,0.65)] ring-[5px] ring-night-900 transition active:scale-95"
        >
          <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.5),transparent_55%)]" />
          <Plus size={26} strokeWidth={2.5} className="relative" />
        </Link>

        <ul className="relative grid grid-cols-5 items-end px-2 pb-[max(env(safe-area-inset-bottom),0.65rem)] pt-2.5">
          {tabs.slice(0, 2).map((t) => (
            <NavItem key={t.href} {...t} active={isActive(t.href)} />
          ))}
          <li aria-hidden className="flex flex-col items-center">
            <span className="h-7" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-400">Submit</span>
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
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  active: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "group relative flex flex-col items-center gap-1.5 rounded-2xl px-3 py-2 transition",
          active ? "text-white" : "text-night-400 hover:text-night-200"
        )}
      >
        {active && (
          <span className="pointer-events-none absolute inset-x-1 -top-0.5 bottom-1.5 rounded-2xl bg-accent-500/12 ring-1 ring-accent-400/25">
            <span className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_30%,rgba(255,138,61,0.28),transparent_70%)]" />
          </span>
        )}
        <Icon size={21} strokeWidth={active ? 2.3 : 1.9} className="relative" />
        <span className={cn("relative text-[10px]", active ? "font-bold text-accent-300" : "font-medium")}>
          {label}
        </span>
        <span
          className={cn(
            "relative h-1 w-1 rounded-full transition",
            active ? "bg-accent-400 shadow-[0_0_8px_rgba(255,172,92,0.8)]" : "bg-transparent"
          )}
        />
      </Link>
    </li>
  );
}
