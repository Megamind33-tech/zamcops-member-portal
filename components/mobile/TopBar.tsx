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
        "z-30 flex items-center gap-2 border-b border-slate-100 bg-white/95 px-3 py-3 backdrop-blur",
        sticky && "sticky top-0"
      )}
    >
      {back ? (
        typeof back === "string" ? (
          <Link
            href={back}
            className="grid h-9 w-9 place-items-center rounded-full text-brand-700 hover:bg-brand-50"
          >
            <ChevronLeft size={20} />
          </Link>
        ) : (
          <button
            onClick={() => router.back()}
            className="grid h-9 w-9 place-items-center rounded-full text-brand-700 hover:bg-brand-50"
            aria-label="Go back"
          >
            <ChevronLeft size={20} />
          </button>
        )
      ) : (
        <span className="w-1" />
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-bold text-brand-900">{title}</h1>
        {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
