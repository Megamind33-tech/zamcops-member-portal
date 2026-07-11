"use client";

import React, { useState } from "react";
import { Download, ReceiptText, FileText, Wallet, Eye } from "lucide-react";
import { useApp, useMemberData } from "@/lib/store";
import { PageHeader } from "@/app/(portal)/(member)/layout";
import { Card } from "@/components/zam/Card";
import { Button } from "@/components/zam/Button";
import { EmptyState } from "@/components/zam/Misc";
import { formatDate, formatKwacha } from "@/lib/format";
import { downloadStatementPDF } from "@/lib/pdf";
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

  // Generates a branded PDF receipt/statement in the browser.
  const download = (s: Statement) => {
    if (!currentMember) return;
    downloadStatementPDF(s, currentMember);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Statements & Receipts" subtitle="Receipts and statements for your membership, submissions and royalties." />

      <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-zam-line bg-white p-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors " +
              (tab === t ? "bg-zam-orange text-white" : "text-zam-muted hover:text-zam-ink")
            }
          >
            {t === "All" ? "All" : t.replace(" Receipt", "").replace(" Statement", "")}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ReceiptText size={28} />}
            title="No documents yet"
            description="Receipts and statements are generated as you register, submit and earn royalties."
          />
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-zam-line">
            {shown.map((s) => {
              const Icon = icon[s.type];
              return (
                <div key={s.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-zam-orange-soft text-zam-orange">
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-zam-ink">{s.title}</p>
                    <p className="mt-0.5 truncate text-sm text-zam-muted">
                      Ref <span className="font-mono">{s.reference}</span> · {formatDate(s.issuedAt)}
                    </p>
                  </div>
                  {s.amount != null && (
                    <p className="font-display text-lg font-bold text-zam-ink sm:text-right">{formatKwacha(s.amount)}</p>
                  )}
                  <div className="flex shrink-0 gap-2">
                    <Button variant="secondary" size="sm" icon={<Eye size={15} />} onClick={() => download(s)}>
                      View
                    </Button>
                    <Button variant="ghost" size="sm" icon={<Download size={15} />} onClick={() => download(s)}>
                      PDF
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
