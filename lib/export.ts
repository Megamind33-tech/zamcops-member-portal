import type { Member, WorkDeclaration, SongSubmission, AlbumSubmission } from "@/types";
import type { AdminDistribution } from "@/lib/adminClient";
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

// Generic CSV download (UTF-8 BOM so Excel opens it cleanly).
export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [
    headers.map((h) => csvCell(h)).join(","),
    ...rows.map((r) => r.map((c) => csvCell(String(c ?? ""))).join(",")),
  ];
  triggerDownload("\ufeff" + lines.join("\n"), "text/csv;charset=utf-8", filename);
}

// Full repertoire — every declared work and registered release, one row each.
export function downloadRepertoire(
  works: WorkDeclaration[],
  singles: SongSubmission[],
  albums: AlbumSubmission[],
  memberName: (ownerId: string) => string
) {
  const stamp = new Date().toISOString().slice(0, 10);
  const rows: (string | number)[][] = [
    ...works.map((w) => ["Work Declaration", w.title, memberName(w.ownerId), w.workType, w.genre, w.isrc || "", w.status, formatDate(w.submittedAt)]),
    ...singles.map((x) => ["Single", x.title, memberName(x.ownerId), x.artistName, x.genre, x.isrc || "", x.status, formatDate(x.submittedAt)]),
    ...albums.map((a) => ["Album", a.title, memberName(a.ownerId), a.artistName, `${a.tracks.length} tracks`, "", a.status, formatDate(a.submittedAt)]),
  ];
  downloadCSV(
    `zamcops-repertoire-${stamp}.csv`,
    ["Kind", "Title", "Member", "Performed by / type", "Genre/Tracks", "ISRC", "Status", "Submitted"],
    rows
  );
}

// Distribution payouts — one row per member entry per period.
export function downloadDistributions(
  distributions: AdminDistribution[],
  memberLabel: (ownerId: string) => { name: string; number: string }
) {
  const stamp = new Date().toISOString().slice(0, 10);
  const rows: (string | number)[][] = distributions.flatMap((d) =>
    d.entries.map((e) => {
      const m = memberLabel(e.ownerId);
      return [d.periodLabel, d.status, m.number, m.name, e.amount.toFixed(2), e.currency];
    })
  );
  downloadCSV(
    `zamcops-distributions-${stamp}.csv`,
    ["Period", "Period Status", "Member No.", "Member", "Amount", "Currency"],
    rows
  );
}
