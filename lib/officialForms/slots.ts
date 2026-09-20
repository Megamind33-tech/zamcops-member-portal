// Where a value goes on one of the society's forms.
//
// Every position comes from assets/forms/slots.json, which scripts/map-form-slots.py
// reads straight out of the template PDFs: a dotted rule is a run of real '.'
// glyphs with real coordinates, and a printed label is a run of letters at a
// measured x. Nothing here estimates a position from a label's length, which is
// what used to put values on the wrong rule.
//
// A slot is named by where it sits — p<page>.<y>.<x>, page 1-based — so the
// maps in this directory read as coordinates with the label spelled out beside
// them, and a re-exported template makes the ids stop resolving instead of
// silently shifting every answer half an inch.

import slotData from "@/assets/forms/slots.json";
import type { TemplateName } from "@/lib/formOverlay";

export interface Slot {
  /** "blank" is a dotted rule, "text" printed words, "mark" a located substring. */
  kind: "blank" | "text" | "mark";
  page: number; // 1-based
  x: number; // left edge
  x1: number; // right edge
  y: number; // baseline, origin bottom-left
  size: number; // the size the form itself is printed at
  /** Printed words to the left of a rule on the same line, if any. */
  left?: string;
  right?: string;
  /** The words themselves, for a "text" or "mark" slot. */
  text?: string;
}

interface RawSlot {
  k: string;
  p: number;
  x: number;
  x1: number;
  y: number;
  s: number;
  left?: string;
  right?: string;
  text?: string;
}

type Sheet = { pages: number[][]; anchors: Record<string, RawSlot> };
const SHEETS = slotData as unknown as Record<string, Sheet>;

/** Width of the rule, which is how much room a value has. */
export const widthOf = (s: Slot): number => Math.max(0, s.x1 - s.x);

export function maybeSlot(template: TemplateName, id: string): Slot | null {
  const raw = SHEETS[template]?.anchors?.[id];
  if (!raw) return null;
  return {
    kind: raw.k as Slot["kind"],
    page: raw.p,
    x: raw.x,
    x1: raw.x1,
    y: raw.y,
    size: raw.s,
    left: raw.left,
    right: raw.right,
    text: raw.text,
  };
}

/**
 * A slot the map says must exist. Missing means the template was re-exported
 * and the map has not caught up — a loud failure in `npm run check:forms`,
 * long before anyone's membership form comes out wrong.
 */
export function slot(template: TemplateName, id: string): Slot {
  const s = maybeSlot(template, id);
  if (!s) throw new Error(`form template "${template}" has no slot "${id}" — re-run scripts/map-form-slots.py`);
  return s;
}

export const allSlotIds = (template: TemplateName): string[] =>
  Object.keys(SHEETS[template]?.anchors ?? {});

export const pageSize = (template: TemplateName, page: number): { width: number; height: number } => {
  const p = SHEETS[template]?.pages?.[page - 1] ?? [612, 792];
  return { width: p[0], height: p[1] };
};
