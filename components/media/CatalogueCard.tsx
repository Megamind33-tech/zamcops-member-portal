import React from "react";
import Link from "next/link";
import { CoverArt } from "@/components/media/CoverArt";
import { StatusBadge } from "@/components/zam/StatusBadge";
import type { ReviewStatus } from "@/types";

export function CatalogueCard({
  title,
  meta,
  coverSrc,
  status,
  href,
  footer,
}: {
  title: string;
  meta?: string;
  coverSrc?: string;
  status?: ReviewStatus;
  href?: string;
  footer?: React.ReactNode;
}) {
  const inner = (
    <>
      <div className="aspect-square overflow-hidden rounded-xl bg-[#2a221c] shadow-[0_12px_28px_rgba(28,25,23,0.14)] ring-1 ring-black/[0.06] transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_18px_36px_rgba(28,25,23,0.18)]">
        <CoverArt src={coverSrc} seed={title} fill rounded="rounded-none" />
      </div>
      <div className="mt-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-zam-ink">{title}</p>
          {meta && <p className="mt-0.5 truncate text-sm text-zam-muted">{meta}</p>}
        </div>
        {status && <StatusBadge status={status} />}
      </div>
      {footer}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="group block">
        {inner}
      </Link>
    );
  }
  return <div className="group">{inner}</div>;
}
