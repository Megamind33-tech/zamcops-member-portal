// Finds where to write on an official form by looking for the words already
// printed on it.
//
// The membership forms carry roughly a hundred boxes between them, each a label
// followed by a dotted rule. Recording a coordinate for every one would be a
// wall of numbers that no reader could check and that a re-export would
// silently invalidate — which has already happened once, when a fresh export of
// the work declaration moved every row by about 40pt.
//
// So a field names the label it belongs to, and the position is read from
// assets/forms/anchors.json, regenerated from the templates by
// `npm run map:forms`. A label that stops matching is then a loud failure at
// issue time rather than a value written quietly into the wrong box.

import { readFileSync } from "node:fs";
import path from "node:path";
import type { TemplateName } from "@/lib/formOverlay";

interface Run {
  t: string;
  x: number;
  y: number;
  w: number;
}
interface Page {
  page: number;
  width: number;
  height: number;
  runs: Run[];
}
type Anchors = Record<string, { pages: Page[] }>;

let cache: Anchors | null = null;

function anchors(): Anchors {
  if (!cache) {
    cache = JSON.parse(
      readFileSync(path.join(process.cwd(), "assets", "forms", "anchors.json"), "utf8"),
    ) as Anchors;
  }
  return cache;
}

// Punctuation and spacing differ between the transcription in
// lib/applicationForms.ts and what the PDF prints ("NRC / Passport number" vs
// "Passport no:"), and the dotted rules are part of the same run. Comparing on
// letters and digits alone lets a label match its printed form without every
// map entry carrying the exact glyphs.
const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

// The society's letterhead prints "E-mail: zamcops@zamnet.zm" and
// "Website: www.zamcops.org.zm" at the top of every form, and in reading order
// they come first. Without this a member's email address would be written into
// the page header instead of onto the rule beside the word further down.
const LETTERHEAD = /zamcops|zamnet|telefax|anchor house|p\.?o\.? box|nonprofit|cisac/i;

// Index just past the label inside a run, matching it the way norm() does:
// on letters and digits, ignoring the punctuation and dots between them.
function endOfLabel(run: string, label: string): number {
  const chars = label.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!chars) return run.length;
  let ci = 0;
  for (let i = 0; i < run.length; i++) {
    const c = run[i].toLowerCase();
    if (c >= "a" && c <= "z") {
      if (c === chars[ci]) ci++;
      else ci = c === chars[0] ? 1 : 0;
    } else if (c >= "0" && c <= "9") {
      if (c === chars[ci]) ci++;
      else ci = c === chars[0] ? 1 : 0;
    }
    // Punctuation, spaces and dotted rules are skipped, as norm() skips them.
    if (ci === chars.length) return i + 1;
  }
  // Not found as a sequence — fall back to the first dotted gap, or the whole run.
  const dots = run.search(/[…._]{2,}/);
  return dots > 0 ? dots : run.length;
}

export interface Anchor {
  page: number;
  /** Left edge of the matched label. */
  x: number;
  /** Baseline of the matched label. */
  y: number;
  /** Right edge of the whole run, dotted rule included. */
  right: number;
  /** Right edge of the label's words, where its rule begins. */
  afterLabel: number;
}

/**
 * Locates a printed label. `label` matches when its letters and digits appear
 * in a run; `occurrence` picks between repeats, in reading order.
 */
export function findAnchor(
  template: TemplateName,
  label: string,
  opts: { page?: number; occurrence?: number } = {},
): Anchor | null {
  const doc = anchors()[template];
  if (!doc) return null;
  const want = norm(label);
  if (!want) return null;

  const hits: Anchor[] = [];
  for (const p of doc.pages) {
    if (opts.page && p.page !== opts.page) continue;
    // Reading order: down the page, then across.
    const runs = [...p.runs].sort((a, b) => b.y - a.y || a.x - b.x);
    for (const r of runs) {
      if (!norm(r.t).includes(want)) continue;
      if (LETTERHEAD.test(r.t)) continue;
      // Where THIS label's words end. A run often carries two boxes at once —
      // "Corporate name……………… Spellings, Marks" is a single run — so measuring
      // from the run's first dotted gap would put both values in the first box,
      // printed on top of each other. The label is located inside the run and
      // the rule taken to start where its own words stop.
      //
      // The run's width covers letters and dots alike, so a character's share
      // of it is only an approximation; values are written a few points clear
      // rather than exactly on the boundary.
      const labelEnd = endOfLabel(r.t, label);
      const afterLabel = r.x + (r.w * labelEnd) / Math.max(r.t.length, 1);
      hits.push({ page: p.page, x: r.x, y: r.y, right: r.x + r.w, afterLabel });
    }
  }
  if (hits.length === 0) return null;
  return hits[Math.min(opts.occurrence ?? 0, hits.length - 1)];
}

/** Every anchor matching a label, in reading order — for repeated rules. */
export function findAllAnchors(template: TemplateName, label: string, page?: number): Anchor[] {
  const out: Anchor[] = [];
  for (let i = 0; ; i++) {
    const a = findAnchor(template, label, { page, occurrence: i });
    if (!a) break;
    // findAnchor clamps past the end, so stop when it starts repeating.
    if (out.length && a.page === out[out.length - 1].page && a.y === out[out.length - 1].y && a.x === out[out.length - 1].x) break;
    out.push(a);
  }
  return out;
}
