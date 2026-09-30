// Generates a member's royalty statement for one distribution period — the
// same stationery as the society's other official documents (lib/pdfKit.ts),
// carrying the figures a DistributionEntry holds: the gross/admin fee/net
// revenue summary, and the category → source → usage-line breakdown an
// imported statement supplies (see lib/distributionImport.ts). A hand-entered
// entry (no imported lines) still produces a valid statement — just without a
// breakdown table.

import { jsPDF } from "jspdf";
import { W, MUTED, calloutRow, fmtDate, gridTable, letterhead, output, sectionHeading, type GeneratedPdf } from "@/lib/pdfKit";
import { formatKwacha } from "@/lib/format";
import type { DistributionLine } from "@/types";

export interface StatementMember {
  fullName: string;
  memberNumber: string;
}

export interface StatementDistribution {
  periodLabel: string;
  publishedAt: Date | string | null;
}

export interface StatementEntry {
  amount: number;
  grossAmount: number;
  adminFee: number;
  currency: string;
  lines: DistributionLine[];
  externalRef?: string;
}

export function generateDistributionStatementPdf(opts: {
  member: StatementMember;
  distribution: StatementDistribution;
  entry: StatementEntry;
  reference: string;
}): GeneratedPdf {
  const { member, distribution, entry } = opts;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const p = letterhead(doc, "Royalty Statement", `${distribution.periodLabel} — ${member.fullName}`);

  calloutRow(p, [
    { label: "Reference", value: opts.reference },
    { label: "Distribution", value: distribution.periodLabel },
    { label: "Member", value: member.memberNumber },
    { label: "Published", value: distribution.publishedAt ? fmtDate(distribution.publishedAt) : "—" },
  ]);

  calloutRow(p, [
    { label: "Gross revenue", value: formatKwacha(entry.grossAmount, entry.currency) },
    { label: "Admin fee", value: formatKwacha(entry.adminFee, entry.currency) },
    { label: "Net revenue", value: formatKwacha(entry.amount, entry.currency) },
  ]);

  if (entry.lines.length > 0) {
    sectionHeading(p, "Distribution summary");
    gridTable(
      p,
      [
        { label: "Category", width: 2.2 },
        { label: "Source", width: 2.2 },
        { label: "Work / licence code", width: 1.8 },
        { label: "Licence period", width: 2.2 },
        { label: "Right", width: 1 },
        { label: "Amount", width: 1.6, align: "right" },
      ],
      entry.lines.map((l) => [
        l.category || "—",
        l.source || "—",
        l.workCode || "—",
        l.periodStart || l.periodEnd ? `${l.periodStart || "—"} to ${l.periodEnd || "—"}` : "—",
        l.rightType || "—",
        formatKwacha(l.amount, l.currency || entry.currency),
      ]),
      { totalRow: ["", "", "", "", "Total", formatKwacha(entry.grossAmount, entry.currency)] },
    );
  }

  p.ensure(10);
  p.y += 4;
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.text(
    `Verify this statement with the ZAMCOPS office quoting reference ${opts.reference}.`,
    W / 2,
    p.y,
    { align: "center" },
  );

  return output(doc, `Statement-${distribution.periodLabel.replace(/\s+/g, "-")}-${member.memberNumber}.pdf`, opts.reference);
}
