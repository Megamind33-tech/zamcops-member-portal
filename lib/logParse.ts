import { readXlsx } from "./xlsxRead";
import { normalize } from "./logText";
import type { LogField } from "./matchingSettings-const";

const MAX_GROUPS = 8000;

export type ParsedGroup = { key: string; title: string; creators: string; identifier: string; rowsCount: number; amount: number; splits: Record<string, number> };

// Read the uploaded sheet through the Log Format: header lines, footer lines,
// and which column holds the title, the creators, an identifier, the amount
// (Allocation) and the Split label (for example the station).
export function parseLog(buf: Buffer, format: { sheetNumber: number; headerLines: number; footerLines: number; fields: LogField[] }): { rows: number; groups: ParsedGroup[] } {
  const all = readXlsx(buf, format.sheetNumber);
  const headerRow = all[Math.max(0, format.headerLines - 1)] ?? [];
  const body = all.slice(format.headerLines, all.length - format.footerLines).filter((r) => r.some((c) => c.trim() !== ""));
  const idx = new Map(headerRow.map((h, i) => [h.trim().toLowerCase(), i]));
  const col = (f: LogField) => {
    const i = idx.get(f.column.trim().toLowerCase());
    if (i === undefined) throw new Error(`The file has no column “${f.column}” (the Log Format expects it on header line ${format.headerLines}).`);
    return i;
  };
  const by = (pred: (f: LogField) => boolean) => format.fields.filter(pred).map((f) => ({ f, i: col(f) }));
  const titleC = by((f) => f.columnType === "Matching" && f.targetField === "TITLE");
  const creatorC = by((f) => f.columnType === "Matching" && f.targetField === "CREATOR");
  const identC = by((f) => f.columnType === "Matching" && f.targetField === "IDENTIFIER");
  const allocC = by((f) => f.columnType === "Allocation")[0];
  const splitC = by((f) => f.columnType === "Split");
  if (titleC.length + identC.length === 0) throw new Error("The Log Format needs a Matching column for TITLE or IDENTIFIER.");

  const groups = new Map<string, ParsedGroup>();
  for (const r of body) {
    const cell = (c?: { i: number }) => (c ? (r[c.i] ?? "").trim() : "");
    const title = titleC.map(cell).join(" ").trim();
    const creators = creatorC.map(cell).filter(Boolean).join(" / ");
    const identifier = identC.map(cell).join("").replace(/[\s-]/g, "").toUpperCase();
    if (!title && !identifier) continue;
    const raw = allocC ? Number(cell(allocC).replace(/,/g, "")) : 1;
    const amount = Number.isFinite(raw) && raw > 0 ? raw : allocC ? 0 : 1;
    const key = [normalize(title), normalize(creators), identifier].join("|");
    const g = groups.get(key) ?? { key, title, creators, identifier, rowsCount: 0, amount: 0, splits: {} };
    g.rowsCount++;
    g.amount += amount;
    for (const s of splitC) {
      const label = cell(s) || "(none)";
      g.splits[label] = (g.splits[label] ?? 0) + amount;
    }
    groups.set(key, g);
  }
  if (groups.size > MAX_GROUPS) throw new Error(`The file has ${groups.size} different lines; the limit is ${MAX_GROUPS}. Split it into several files.`);
  return { rows: body.length, groups: [...groups.values()] };
}
