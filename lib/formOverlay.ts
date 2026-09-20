// Stamps a member's details onto the society's own forms.
//
// The office supplies the forms as PDF exports of the documents it has always
// used, and those pages are the output: nothing here redraws a form or invents
// a layout. A field is a coordinate on a page plus a value, and the only marks
// this module makes are the ones a clerk would make with a pen — writing on a
// dotted line, ticking a box, signing above a rule.
//
// Coordinates are PDF points with the origin at the BOTTOM-left of the page,
// which is how the position maps in lib/officialForms/ record them, taken from
// the templates themselves rather than measured by eye.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type TemplateName = "individual" | "group" | "publisher" | "deed" | "admission" | "workdecl";

// Where the forms live. Next's standalone bundle only carries what it traces,
// so the Dockerfile copies assets/ explicitly and this resolves from the
// working directory the server actually runs in.
const templatePath = (name: TemplateName) =>
  path.join(process.cwd(), "assets", "forms", `${name}.pdf`);

export interface TextStamp {
  kind?: "text";
  page: number; // 1-based, as a reader counts them
  x: number;
  y: number;
  text: string;
  size?: number; // default 10
  bold?: boolean;
  // Shrink the text until it fits this width rather than letting it run into
  // the next printed field. A form's dotted line is a fixed length and a long
  // legal name has to live inside it.
  maxWidth?: number;
  // Shrink no further than this, so a rule that is too short for its value
  // produces small writing rather than writing nobody can read.
  minSize?: number; // default 7.5
  align?: "left" | "center";
}

export interface CoverStamp {
  kind: "cover";
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageStamp {
  kind: "image";
  page: number;
  x: number;
  y: number; // bottom edge of the placed image
  data: string; // data URL or bare base64 (PNG or JPEG)
  maxWidth: number;
  maxHeight: number;
}

export interface TickStamp {
  kind: "tick";
  page: number;
  x: number; // left edge of the tick
  y: number; // baseline it sits on
  size?: number; // height of the mark, default 9
}

/**
 * A value written across the several ruled lines a form gives it.
 *
 * The form decides how much room an answer gets — question 25 on the
 * individual form gets six rules and question 26 gets three — so the answer is
 * wrapped to those rules rather than to a width this module picks. Each line
 * carries its own page, because an address block on the group form starts at
 * the foot of one page and finishes at the head of the next.
 */
export interface ParagraphStamp {
  kind: "paragraph";
  lines: { page: number; x: number; y: number; width: number }[];
  text: string;
  size?: number; // default 11
  minSize?: number; // shrink no further than this, default 8
}

export type Stamp = TextStamp | CoverStamp | ImageStamp | TickStamp | ParagraphStamp;

function decodeImage(data: string): { bytes: Uint8Array; png: boolean } | null {
  const m = /^data:image\/(png|jpe?g);base64,(.*)$/i.exec(data.trim());
  const b64 = m ? m[2] : data.trim();
  const png = m ? m[1].toLowerCase() === "png" : true;
  try {
    const buf = Buffer.from(b64, "base64");
    if (buf.length < 8) return null;
    // Trust the magic bytes over the declared type — a mislabelled data URL is
    // common and pdf-lib throws on the wrong embedder.
    const isPng = buf[0] === 0x89 && buf[1] === 0x50;
    const isJpg = buf[0] === 0xff && buf[1] === 0xd8;
    if (!isPng && !isJpg) return null;
    return { bytes: new Uint8Array(buf), png: isPng ? true : png && !isJpg };
  } catch {
    return null;
  }
}

// Largest size at or below `size` whose rendered width fits `maxWidth`.
function fitSize(font: PDFFont, text: string, size: number, maxWidth?: number, min = 7.5): number {
  if (!maxWidth || maxWidth <= 0) return size;
  let s = size;
  while (s > min && font.widthOfTextAtSize(text, s) > maxWidth) s -= 0.25;
  return Math.max(s, min);
}

// Greedy wrap of `text` into the given line widths at `size`. Returns null if
// it does not fit, so the caller can try a smaller size.
function wrapInto(font: PDFFont, text: string, size: number, widths: number[]): string[] | null {
  const out: string[] = [];
  // A newline the member typed is a line they meant to break.
  const paras = text.split(/\r?\n/).map((t) => t.trim());
  let words: string[] = [];
  const queue = paras.flatMap((para, i) => (i ? ["\n", ...para.split(/\s+/)] : para.split(/\s+/)));
  words = queue.filter((w) => w.length > 0);

  let i = 0;
  for (const width of widths) {
    if (i >= words.length) break;
    if (words[i] === "\n") {
      i += 1;
      if (i >= words.length) break;
    }
    let line = "";
    while (i < words.length && words[i] !== "\n") {
      const next = line ? `${line} ${words[i]}` : words[i];
      if (line && font.widthOfTextAtSize(next, size) > width) break;
      // A single word longer than the rule has to go on anyway; shrinking is
      // the caller's job and truncation beats an empty line.
      line = next;
      i += 1;
    }
    out.push(line);
  }
  return i >= words.length ? out : null;
}

export interface OverlayOptions {
  template: TemplateName;
  stamps: Stamp[];
}

export async function stampForm(opts: OverlayOptions): Promise<Buffer> {
  const doc = await PDFDocument.load(await readFile(templatePath(opts.template)));
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = doc.getPages();

  const pageAt = (n: number): PDFPage | null => pages[n - 1] ?? null;

  for (const st of opts.stamps) {
    if (st.kind === "paragraph") {
      const text = st.text.trim();
      if (!text || st.lines.length === 0) continue;
      const widths = st.lines.map((l) => Math.max(10, l.width));
      const top = st.size ?? 11;
      const floor = st.minSize ?? 8;
      let size = top;
      let wrapped = wrapInto(regular, text, size, widths);
      while (!wrapped && size > floor) {
        size = Math.max(floor, size - 0.5);
        wrapped = wrapInto(regular, text, size, widths);
      }
      if (!wrapped) {
        // Longer than the form allows even at the smallest size. Fill every
        // rule and mark the cut, so whoever reads it knows to ask for the rest
        // rather than believing the answer ended there.
        wrapped = wrapInto(regular, text, size, widths.map((w) => w * 4)) ?? [];
        wrapped = wrapped.slice(0, widths.length);
        const last = wrapped.length - 1;
        if (last >= 0) {
          while (wrapped[last] && regular.widthOfTextAtSize(`${wrapped[last]} …`, size) > widths[last]) {
            wrapped[last] = wrapped[last].replace(/\s*\S+$/, "");
          }
          wrapped[last] = `${wrapped[last]} …`;
        }
      }
      wrapped.forEach((line, n) => {
        const box = st.lines[n];
        const p = pageAt(box.page);
        if (!p || !line) return;
        p.drawText(line, { x: box.x, y: box.y, size, font: regular, color: rgb(0.05, 0.05, 0.12) });
      });
      continue;
    }

    const page = pageAt(st.page);
    // A map that names a page the template does not have is a bug in the map,
    // not a reason to fail issuing the member's document.
    if (!page) continue;

    if (st.kind === "cover") {
      // The specimen letter arrives with a previous member's details printed on
      // it. Painting the paper white before writing is what lets the real
      // values sit where the office expects them.
      page.drawRectangle({
        x: st.x,
        y: st.y,
        width: st.width,
        height: st.height,
        color: rgb(1, 1, 1),
        borderWidth: 0,
      });
      continue;
    }

    if (st.kind === "tick") {
      // Drawn rather than typed: a tick is U+2713, which the standard fonts
      // cannot encode, and pdf-lib throws instead of printing it. Two strokes
      // of a pen is also closer to what the office actually puts on a form.
      const h = st.size ?? 9;
      const ink = rgb(0.05, 0.05, 0.12);
      const thickness = Math.max(1, h / 8);
      page.drawLine({
        start: { x: st.x, y: st.y + h * 0.42 },
        end: { x: st.x + h * 0.34, y: st.y },
        thickness,
        color: ink,
      });
      page.drawLine({
        start: { x: st.x + h * 0.34, y: st.y },
        end: { x: st.x + h * 0.92, y: st.y + h },
        thickness,
        color: ink,
      });
      continue;
    }

    if (st.kind === "image") {
      const img = decodeImage(st.data);
      if (!img) continue; // a corrupt signature must not block the document
      try {
        const embedded = img.png ? await doc.embedPng(img.bytes) : await doc.embedJpg(img.bytes);
        const scale = Math.min(st.maxWidth / embedded.width, st.maxHeight / embedded.height, 1);
        page.drawImage(embedded, {
          x: st.x,
          y: st.y,
          width: embedded.width * scale,
          height: embedded.height * scale,
        });
      } catch {
        // Same reasoning: the rest of the document is still worth issuing.
      }
      continue;
    }

    const text = (st.text ?? "").toString();
    if (!text.trim()) continue;
    const font = st.bold ? bold : regular;
    const size = fitSize(font, text, st.size ?? 10, st.maxWidth, st.minSize);
    const width = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: st.align === "center" ? st.x - width / 2 : st.x,
      y: st.y,
      size,
      font,
      color: rgb(0.05, 0.05, 0.12), // near-black, as ink rather than pure black
    });
  }

  return Buffer.from(await doc.save());
}
