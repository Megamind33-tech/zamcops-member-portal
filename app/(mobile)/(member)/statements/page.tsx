"use client";

import React, { useState } from "react";
import { Download, ReceiptText, FileText, Wallet } from "lucide-react";
import { TopBar } from "@/components/mobile/TopBar";
import { EmptyState } from "@/components/ui/Misc";
import { useApp, useMemberData } from "@/lib/store";
import { formatDate, formatKwacha } from "@/lib/format";
import type { Statement, StatementType } from "@/types";

const tabs: ("All" | StatementType)[] = [
  "All",
  "Membership Receipt",
  "Submission Receipt",
  "Royalty Statement",
];

const icon: Record<StatementType, React.ComponentType<{ size?: number }>> = {
  "Membership Receipt": ReceiptText,
  "Submission Receipt": FileText,
  "Royalty Statement": Wallet,
};

export default function StatementsScreen() {
  const { currentMember } = useApp();
  const { statements } = useMemberData();
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const shown = statements.filter((s) => tab === "All" || s.type === tab);

  // Generates a simple downloadable receipt/statement document (no backend yet).
  const download = (s: Statement) => {
    const lines = [
      "ZAMCOPS — Zambian Music Copyright Protection Society",
      "============================================",
      `Document type : ${s.type}`,
      `Title         : ${s.title}`,
      `Reference     : ${s.reference}`,
      `Member        : ${currentMember?.fullName} (${currentMember?.memberNumber})`,
      `Issued        : ${formatDate(s.issuedAt)}`,
      s.amount != null ? `Amount        : ${formatKwacha(s.amount)}` : "",
      "",
      "This document is computer-generated for the ZAMCOPS member portal prototype.",
    ].filter(Boolean);
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${s.reference}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <TopBar title="Statements & Receipts" back="/dashboard" />

      <div className="px-4 py-4">
        <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition " +
                (tab === t ? "bg-brand-600 text-white" : "bg-white text-slate-500 shadow-card")
              }
            >
              {t === "All" ? "All" : t.replace(" Receipt", "").replace(" Statement", "")}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <EmptyState
            icon={<ReceiptText size={22} />}
            title="No documents yet"
            message="Receipts and statements are generated as you register, submit and earn royalties."
          />
        ) : (
          <div className="space-y-3">
            {shown.map((s) => {
              const Icon = icon[s.type];
              return (
                <div key={s.id} className="card flex items-center gap-3 px-4 py-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-brand-900">{s.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {s.reference} · {formatDate(s.issuedAt)}
                      {s.amount != null ? ` · ${formatKwacha(s.amount)}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => download(s)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100"
                    aria-label="Download"
                  >
                    <Download size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
