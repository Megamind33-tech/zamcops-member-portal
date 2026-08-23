"use client";

import React from "react";
import { formatDateTime, cn } from "@/lib/format";
import type { SupportThreadMessage } from "@/types";

export function SupportThread({
  messages,
  tone = "member",
}: {
  messages: SupportThreadMessage[];
  tone?: "member" | "admin";
}) {
  if (messages.length === 0) return null;
  const admin = tone === "admin";
  return (
    <div className="space-y-2">
      {messages.map((m, i) => {
        const staff = m.author === "staff";
        return (
          <div
            key={`${m.at}-${i}`}
            className={cn(
              "rounded-xl px-3 py-2.5 text-sm",
              admin
                ? staff
                  ? "bg-zam-green/10 text-night-100"
                  : "bg-white/[0.04] text-white"
                : staff
                  ? "bg-zam-canvas text-zam-ink"
                  : "bg-zam-orange-soft/50 text-zam-ink",
            )}
          >
            <p className={cn("text-[10px] font-bold uppercase tracking-wide", admin ? "text-night-400" : "text-zam-muted")}>
              {staff ? "ZAMCOPS" : admin ? "Member" : "You"} · {formatDateTime(m.at)}
            </p>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed">{m.body}</p>
          </div>
        );
      })}
    </div>
  );
}
