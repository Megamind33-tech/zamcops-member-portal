"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/format";

export function TopBar({
  title,
  subtitle,
  back,
  right,
  sticky = true,
}: {
  title: string;
  subtitle?: string;
  back?: boolean | string;
  right?: React.ReactNode;
  sticky?: boolean;
}) {
  const router = useRouter();
  const backClasses =
    "grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-night-200 transition hover:bg-white/[0.1] hover:text-white";
  return (
    <header
      className={cn(
        "relative z-30 overflow-hidden border-b border-white/[0.07] bg-night-900/70 px-3 py-3 backdrop-blur-2xl",
        sticky && "sticky top-0"
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/50 to-transparent" />
      <div className="pointer-events-none absolute -right-8 top-1 h-16 w-16 rounded-full bg-iris-500/15 blur-2xl" />
      <div className="relative flex items-center gap-2">
        {back ? (
          typeof back === "string" ? (
            <Link href={back} className={backClasses}>
              <ChevronLeft size={20} />
            </Link>
          ) : (
            <button onClick={() => router.back()} className={backClasses} aria-label="Go back">
              <ChevronLeft size={20} />
            </button>
          )
        ) : (
          <span className="w-1" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold-400">ZAMCOPS</p>
          <h1 className="truncate font-display text-[1.15rem] font-semibold tracking-tight text-white">
            {title}
          </h1>
          {subtitle && <p className="truncate text-[11px] text-night-300">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}
