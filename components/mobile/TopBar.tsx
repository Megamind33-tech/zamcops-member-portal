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
  return (
    <header
      className={cn(
        "relative z-30 overflow-hidden border-b border-white/70 bg-white/80 px-3 py-3 backdrop-blur-2xl",
        sticky && "sticky top-0"
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/70 to-transparent" />
      <div className="pointer-events-none absolute -right-8 top-1 h-16 w-16 rounded-full bg-gold-400/10 blur-2xl" />
      <div className="relative flex items-center gap-2">
        {back ? (
          typeof back === "string" ? (
            <Link
              href={back}
              className="grid h-10 w-10 place-items-center rounded-full border border-brand-100/80 bg-brand-50/80 text-brand-700 shadow-sm transition hover:bg-brand-50"
            >
              <ChevronLeft size={20} />
            </Link>
          ) : (
            <button
              onClick={() => router.back()}
              className="grid h-10 w-10 place-items-center rounded-full border border-brand-100/80 bg-brand-50/80 text-brand-700 shadow-sm transition hover:bg-brand-50"
              aria-label="Go back"
            >
              <ChevronLeft size={20} />
            </button>
          )
        ) : (
          <span className="w-1" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold-600">ZAMCOPS</p>
          <h1 className="truncate font-display text-[1.15rem] font-semibold tracking-tight text-brand-900">
            {title}
          </h1>
          {subtitle && <p className="truncate text-[11px] text-slate-500">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}
