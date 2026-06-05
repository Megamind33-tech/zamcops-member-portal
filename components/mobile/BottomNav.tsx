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
    <nav className="sticky bottom-0 z-30 mt-auto">
      <div className="relative border-t border-slate-100 bg-white/95 shadow-nav backdrop-blur">
        {/* Center submit FAB — quick action for Submit Song / Declare Work */}
        <Link
          href="/submit"
          aria-label="Submit song or declare work"
          className="absolute -top-7 left-1/2 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-gold-500 text-brand-900 shadow-fab ring-4 ring-white transition active:scale-95"
        >
          <Plus size={26} strokeWidth={2.5} />
        </Link>

        <ul className="grid grid-cols-5 items-end px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
          {tabs.slice(0, 2).map((t) => (
            <NavItem key={t.href} {...t} active={isActive(t.href)} />
          ))}
          {/* spacer under the FAB */}
          <li aria-hidden className="flex flex-col items-center">
            <span className="h-7" />
            <span className="text-[10px] font-semibold text-gold-600">Submit</span>
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
          "flex flex-col items-center gap-1 rounded-xl py-1.5 transition",
          active ? "text-brand-700" : "text-slate-400 hover:text-brand-600"
        )}
      >
        <Icon size={22} strokeWidth={active ? 2.4 : 2} />
        <span className={cn("text-[10px]", active ? "font-bold" : "font-medium")}>{label}</span>
      </Link>
    </li>
  );
}
