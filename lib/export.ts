import type { Member } from "@/types";
import { formatDate } from "@/lib/format";

const COLUMNS: { header: string; value: (m: Member) => string }[] = [
  { header: "Member No.", value: (m) => m.memberNumber },
  { header: "Full Name", value: (m) => m.fullName },
  { header: "Stage Name", value: (m) => m.stageName || "" },
  { header: "Role", value: (m) => m.role },
  { header: "Email", value: (m) => m.email },
  { header: "Phone", value: (m) => m.phone },
  { header: "NRC/Passport", value: (m) => m.nrcOrPassport || "" },
  { header: "Province", value: (m) => m.province || "" },
  { header: "District", value: (m) => m.district || "" },
  { header: "Status", value: (m) => m.membershipStatus },
  { header: "Joined", value: (m) => formatDate(m.joinedAt) },
];

function triggerDownload(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

// Exports members to CSV, or to an Excel-readable .xls (HTML table) — no deps.
export function downloadMembers(members: Member[], format: "csv" | "xls") {
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const rows = [
      COLUMNS.map((c) => c.header).join(","),
      ...members.map((m) => COLUMNS.map((c) => csvCell(c.value(m))).join(",")),
    ];
    triggerDownload("﻿" + rows.join("\n"), "text/csv;charset=utf-8", `zamcops-members-${stamp}.csv`);
    return;
  }

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const head = `<tr>${COLUMNS.map((c) => `<th>${esc(c.header)}</th>`).join("")}</tr>`;
  const body = members
    .map((m) => `<tr>${COLUMNS.map((c) => `<td>${esc(c.value(m))}</td>`).join("")}</tr>`)
    .join("");
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1">${head}${body}</table></body></html>`;
  triggerDownload(html, "application/vnd.ms-excel", `zamcops-members-${stamp}.xls`);
}
