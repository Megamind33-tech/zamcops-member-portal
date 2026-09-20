// Turns a set of marks into the finished document a member receives.
//
// Every official document the portal issues is one of the society's own PDFs
// with a member's details written onto it. This is the one place that turns
// "here is what to write and where" into bytes, so each generator in
// lib/documents.ts and lib/workDocuments.ts is only a mapping from a database
// row to a list of marks.

import { stampForm, type Stamp, type TemplateName } from "@/lib/formOverlay";
import type { GeneratedPdf } from "@/lib/pdfKit";

export async function renderOfficialForm(opts: {
  template: TemplateName;
  stamps: Stamp[];
  fileName: string;
  reference: string;
}): Promise<GeneratedPdf> {
  const pdf = await stampForm({ template: opts.template, stamps: opts.stamps });
  return { fileName: opts.fileName, reference: opts.reference, base64: pdf.toString("base64") };
}

/**
 * A date the way the society's forms are filled in — 02/09/2026. Every one of
 * them prints its dates into narrow boxes, so this is the short form, not a
 * spelled-out month.
 */
export function formDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(date.getDate())}/${p(date.getMonth() + 1)}/${date.getFullYear()}`;
}
