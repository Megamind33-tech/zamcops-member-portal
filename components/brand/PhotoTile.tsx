import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function PhotoTile({
  href,
  src,
  alt,
  title,
  body,
}: {
  href: string;
  src: string;
  alt: string;
  title: string;
  body: string;
}) {
  return (
    <Link href={href} className="group relative block min-h-[280px] overflow-hidden rounded-3xl shadow-[0_16px_40px_rgba(28,25,23,0.16)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 p-6 text-white">
        <h3 className="font-display text-2xl font-semibold">{title}</h3>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-white/80">{body}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
          Continue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
