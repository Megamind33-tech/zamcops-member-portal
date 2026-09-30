// Turns an uploaded Excel workbook of royalty-distribution line items into
// per-member DistributionEntry rows.
//
// The source is the collecting society's own export (see the sample
// "Individual Account" statement): one usage line per row — a category
// (Television), a source within it (Power TV), the licence window it was
// billed under, and an amount. A member's statement is every line that
// belongs to them, grouped back up into that same shape.
//
// The export identifies an artist by an account number from that other
// system (e.g. "133-20034-R") — it is not a ZAMCOPS member number, and nothing
// on our side has ever seen it before the first import. Once a row is matched
// to a member by name or member number, that account number is remembered on
// the member (Member.externalRef) so every later month's import for the same
// account resolves without a name match.

import * as XLSX from "xlsx";
import type { DistributionLine } from "@/types";

export interface ImportRow {
  memberNumber: string;
  externalRef: string;
  memberName: string;
  category: string;
  source: string;
  workCode: string;
  periodStart: string;
  periodEnd: string;
  rightType: string;
  currency: string;
  amount: number;
  adminFee: number;
}

export interface ImportedMemberGroup {
  key: string; // memberNumber, or externalRef, or normalized name — however it grouped
  memberNumber: string;
  externalRef: string;
  memberName: string;
  lines: DistributionLine[];
  grossAmount: number;
  adminFee: number;
  netAmount: number;
  currency: string;
}

const HEADER_ALIASES: Record<string, keyof ImportRow> = {
  "member number": "memberNumber",
  "membernumber": "memberNumber",
  "zamcops number": "memberNumber",
  "account ref": "externalRef",
  "account number": "externalRef",
  "external ref": "externalRef",
  "statement id": "externalRef",
  "member name": "memberName",
  "artist": "memberName",
  "name": "memberName",
  "category": "category",
  "type of use": "category",
  "source": "source",
  "broadcaster": "source",
  "station": "source",
  "work code": "workCode",
  "license code": "workCode",
  "licence code": "workCode",
  "period start": "periodStart",
  "license start": "periodStart",
  "licence start": "periodStart",
  "period end": "periodEnd",
  "license end": "periodEnd",
  "licence end": "periodEnd",
  "right type": "rightType",
  "right": "rightType",
  "currency": "currency",
  "amount": "amount",
  "net amount": "amount",
  "admin fee": "adminFee",
};

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

function num(v: unknown): number {
  if (typeof v === "number") return v;
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

export class ImportParseError extends Error {}

/** Reads the workbook's first sheet into raw, column-mapped rows. */
export function parseDistributionWorkbook(buffer: Buffer): ImportRow[] {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch {
    throw new ImportParseError("Could not read this file — is it a valid .xlsx workbook?");
  }
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new ImportParseError("The workbook has no sheets.");
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: "" });
  if (raw.length === 0) throw new ImportParseError("The sheet has no rows.");

  const rows: ImportRow[] = [];
  for (const r of raw) {
    const row: ImportRow = {
      memberNumber: "",
      externalRef: "",
      memberName: "",
      category: "",
      source: "",
      workCode: "",
      periodStart: "",
      periodEnd: "",
      rightType: "",
      currency: "ZMW",
      amount: 0,
      adminFee: 0,
    };
    for (const [header, value] of Object.entries(r)) {
      const key = HEADER_ALIASES[header.trim().toLowerCase()];
      if (!key) continue;
      if (key === "amount" || key === "adminFee") row[key] = num(value);
      else if (key === "currency") row.currency = cell(value).toUpperCase().replace(/^ZM$/, "ZMW") || "ZMW";
      else row[key] = cell(value);
    }
    // A row with no amount and no identity is a blank spreadsheet line, not data.
    if (!row.amount && !row.memberNumber && !row.externalRef && !row.memberName && !row.category) continue;
    rows.push(row);
  }
  if (rows.length === 0) throw new ImportParseError("No usable rows were found — check the column headers match the template.");
  return rows;
}

/** Case/whitespace/order-insensitive so "MUSHAI, STEVEN" matches "Steven Mushai". */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

export interface MatchableMember {
  id: string;
  fullName: string;
  memberNumber: string;
  externalRef: string;
}

export interface MatchResult {
  member: MatchableMember | null;
  /** True when this match should be learned onto the member for next time. */
  learnExternalRef: boolean;
}

export function matchMember(row: ImportRow, members: MatchableMember[]): MatchResult {
  if (row.externalRef) {
    const byRef = members.find((m) => m.externalRef && m.externalRef === row.externalRef);
    if (byRef) return { member: byRef, learnExternalRef: false };
  }
  if (row.memberNumber) {
    const byNumber = members.find((m) => m.memberNumber.toLowerCase() === row.memberNumber.toLowerCase());
    if (byNumber) return { member: byNumber, learnExternalRef: !!row.externalRef && !byNumber.externalRef };
  }
  if (row.memberName) {
    const needle = normalizeName(row.memberName);
    const byName = members.find((m) => normalizeName(m.fullName) === needle);
    if (byName) return { member: byName, learnExternalRef: !!row.externalRef && !byName.externalRef };
  }
  return { member: null, learnExternalRef: false };
}

export interface GroupedImport {
  matched: { member: MatchableMember; group: ImportedMemberGroup; learnExternalRef: boolean }[];
  unmatched: ImportedMemberGroup[];
}

/** Groups parsed rows by the member they resolve to, summing lines into one statement each. */
export function groupImportRows(rows: ImportRow[], members: MatchableMember[]): GroupedImport {
  const matched = new Map<string, { member: MatchableMember; group: ImportedMemberGroup; learnExternalRef: boolean }>();
  const unmatchedByKey = new Map<string, ImportedMemberGroup>();

  for (const row of rows) {
    const { member, learnExternalRef } = matchMember(row, members);
    const line: DistributionLine = {
      category: row.category,
      source: row.source,
      workCode: row.workCode,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      rightType: row.rightType,
      currency: row.currency,
      amount: row.amount,
    };

    if (member) {
      const existing = matched.get(member.id);
      if (existing) {
        existing.group.lines.push(line);
        existing.group.grossAmount += row.amount;
        existing.group.adminFee += row.adminFee;
        existing.learnExternalRef = existing.learnExternalRef || learnExternalRef;
      } else {
        matched.set(member.id, {
          member,
          learnExternalRef,
          group: {
            key: member.id,
            memberNumber: member.memberNumber,
            externalRef: row.externalRef || member.externalRef,
            memberName: member.fullName,
            lines: [line],
            grossAmount: row.amount,
            adminFee: row.adminFee,
            netAmount: 0,
            currency: row.currency,
          },
        });
      }
    } else {
      const key = row.externalRef || row.memberNumber || normalizeName(row.memberName) || `row-${unmatchedByKey.size}`;
      const existing = unmatchedByKey.get(key);
      if (existing) {
        existing.lines.push(line);
        existing.grossAmount += row.amount;
        existing.adminFee += row.adminFee;
      } else {
        unmatchedByKey.set(key, {
          key,
          memberNumber: row.memberNumber,
          externalRef: row.externalRef,
          memberName: row.memberName || "(name not given)",
          lines: [line],
          grossAmount: row.amount,
          adminFee: row.adminFee,
          netAmount: 0,
          currency: row.currency,
        });
      }
    }
  }

  const finish = (g: ImportedMemberGroup) => {
    g.netAmount = g.grossAmount - g.adminFee;
    return g;
  };
  return {
    matched: Array.from(matched.values()).map((m) => ({ ...m, group: finish(m.group) })),
    unmatched: Array.from(unmatchedByKey.values()).map(finish),
  };
}
