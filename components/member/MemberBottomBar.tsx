"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Music, Plus, Coins, User } from "lucide-react";
import { cn } from "@/lib/format";

const items = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true },
  { to: "/works", label: "Works", icon: Music },
  { to: "/submit", label: "Register", icon: Plus, primary: true },
  { to: "/royalties", label: "Royalties", icon: Coins },
  { to: "/profile", label: "Profile", icon: User },
];

export function MemberBottomBar() {
  const pathname = usePathname();
  const active = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-zam-line bg-[#FBF7F0] px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
      {items.map((item) => {
        const on = active(item.to, item.exact);
        if (item.primary) {
          return (
            <Link
              key={item.to}
              href={item.to}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-zam-muted"
            >
              <span className="-mt-5 flex flex-col items-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zam-orange text-white shadow-card-lg">
                  <item.icon className="h-6 w-6" />
                </span>
                <span className="mt-0.5 text-zam-muted">{item.label}</span>
              </span>
            </Link>
          );
        }
        return (
          <Link
            key={item.to}
            href={item.to}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold",
              on ? "text-zam-orange" : "text-zam-muted"
            )}
          >
            <item.icon className={cn("h-5 w-5", on && "text-zam-orange")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
