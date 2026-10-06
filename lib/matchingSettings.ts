import { prisma } from "@/lib/db";
import seed from "@/data/wipo/matching-settings.json";

import { COLUMN_TYPES, FIELD_TYPES, PRECISIONS, DISTR_STATUSES, type LogField, type LogWeight } from "@/lib/matchingSettings-const";

let seeded: Promise<void> | null = null;

// WIPO's own log formats, sources and allocation methods are created the first time they are read.
export function ensureMatchingSettings(): Promise<void> {
  seeded ??= (async () => {
    if ((await prisma.logFormat.count()) > 0) return;
    const ids = new Map<string, string>();
    for (const f of seed.formats) {
      const row = await prisma.logFormat.create({
        data: { name: f.name, fileFormat: f.fileFormat, creationClass: f.creationClass, targetCreationClass: f.targetCreationClass, headerLines: f.headerLines, footerLines: f.footerLines, sheetNumber: f.sheetNumber, manageComponent: true, fields: f.fields },
      });
      ids.set(f.name, row.id);
    }
    for (const s of seed.sources) {
      await prisma.logSource.create({
        data: {
          name: s.name, formatId: ids.get(s.format)!, minThreshold: s.minThreshold, maxThreshold: s.maxThreshold, precision: s.precision, roles: s.roles, distrStatus: s.distrStatus,
          creatorsByPerformer: s.creatorsByPerformer, similarity: s.similarity, numberOfWorks: s.numberOfWorks, historyEntries: s.historyEntries, weights: s.weights,
        },
      });
    }
    for (const m of seed.allocationMethods) await prisma.logAllocationMethod.create({ data: { name: m.name, formatId: ids.get(m.format)!, formula: m.formula } });
  })().catch((e) => {
    seeded = null;
    throw e;
  });
  return seeded;
}

const num = (v: unknown): number | null => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

export function readFormat(b: Record<string, unknown>) {
  const name = String(b.name ?? "").trim().slice(0, 120);
  if (!name) return { error: "Name is required." };
  const headerLines = num(b.headerLines) ?? 0;
  const footerLines = num(b.footerLines) ?? 0;
  const sheetNumber = num(b.sheetNumber) ?? 1;
  if ([headerLines, footerLines, sheetNumber].some((n) => Number.isNaN(n) || n < 0)) return { error: "Header lines, footer lines and sheet must be whole numbers." };
  const fields: LogField[] = (Array.isArray(b.fields) ? b.fields : []).map((x: Record<string, unknown>) => ({
    column: String(x.column ?? "").trim().slice(0, 120),
    columnType: String(x.columnType ?? ""),
    targetField: String(x.targetField ?? ""),
    fieldType: String(x.fieldType ?? "String"),
    targetCode: String(x.targetCode ?? "").trim().slice(0, 40),
  }));
  for (const f of fields) {
    if (!f.column) return { error: "Every field needs a Column Name." };
    if (!(COLUMN_TYPES as readonly string[]).includes(f.columnType)) return { error: `Column ${f.column}: choose a Column Type.` } as const;
    if (f.columnType === "Matching" && !f.targetField) return { error: `Column ${f.column}: a Matching column needs a Target Field.` } as const;
    if (!(FIELD_TYPES as readonly string[]).includes(f.fieldType)) return { error: `Column ${f.column}: choose a Target Field Type.` } as const;
  }
  if (new Set(fields.map((f) => f.column.toLowerCase())).size !== fields.length) return { error: "Two fields have the same Column Name." };
  if (fields.filter((f) => f.columnType === "Allocation").length > 1) return { error: "A log format has at most one Allocation column." };
  return {
    name, fileFormat: "XLSX", creationClass: String(b.creationClass ?? "MW"), targetCreationClass: String(b.targetCreationClass ?? "MW"),
    headerLines, footerLines, sheetNumber, manageComponent: b.manageComponent === true, fields,
  } as const;
}

export function readSource(b: Record<string, unknown>) {
  const name = String(b.name ?? "").trim().slice(0, 120);
  if (!name) return { error: "Name is required." };
  if (!b.formatId) return { error: "Choose a Log Format." };
  const min = num(b.minThreshold);
  const max = num(b.maxThreshold);
  if (min == null || max == null || Number.isNaN(min) || Number.isNaN(max) || min < 0 || max > 100 || min > max) return { error: "Min Final Threshold and Max Final Threshold must be between 0 and 100, Min not above Max." };
  const similarity = num(b.similarity);
  if (Number.isNaN(similarity) || (similarity != null && (similarity < 0 || similarity > 100))) return { error: "Similarity must be between 0 and 100." };
  const numberOfWorks = num(b.numberOfWorks);
  if (Number.isNaN(numberOfWorks) || (numberOfWorks != null && numberOfWorks < 1)) return { error: "# Works to keep must be a positive number." };
  const historyEntries = num(b.historyEntries) ?? 0;
  if (Number.isNaN(historyEntries) || historyEntries < 0) return { error: "Number of Entries must be a whole number." };
  const weights: LogWeight[] = (Array.isArray(b.weights) ? b.weights : []).map((w: Record<string, unknown>) => ({
    column: String(w.column ?? ""), weight: num(w.weight), similarity: num(w.similarity), method: String(w.method ?? ""), priority: num(w.priority),
  }));
  return {
    name, formatId: String(b.formatId), minThreshold: min, maxThreshold: max, precision: (PRECISIONS as readonly string[]).includes(String(b.precision)) ? String(b.precision) : "0.1",
    roles: Array.isArray(b.roles) ? b.roles.map(String) : [], distrStatus: (DISTR_STATUSES as readonly string[]).includes(String(b.distrStatus)) ? String(b.distrStatus) : "",
    creatorsByPerformer: b.creatorsByPerformer === true, similarity, numberOfWorks: numberOfWorks == null ? null : Math.round(numberOfWorks), historyEntries: Math.round(historyEntries), weights,
  } as const;
}
