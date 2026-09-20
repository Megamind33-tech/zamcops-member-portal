// Dumps every printed text run of every official form into
// assets/forms/anchors.json, so field maps can say "write after the words
// 'Surname'" instead of carrying a hand-measured coordinate for each of the
// hundred-odd boxes across the membership forms.
//
//   npm run map:forms
//
// Coordinates come from the templates themselves and are regenerated whenever
// one is replaced. That matters: re-exporting the work declaration once moved
// every row by about 40pt, and a map of literal numbers would have gone on
// looking right while writing into the wrong cells.
//
// Runs at development time only. Nothing reads pdfjs at runtime; the server
// reads the JSON.

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const DIR = path.join(process.cwd(), "assets", "forms");
const OUT = path.join(DIR, "anchors.json");

const out = {};
for (const file of readdirSync(DIR).filter((f) => f.endsWith(".pdf")).sort()) {
  const name = path.basename(file, ".pdf");
  const doc = await getDocument({
    data: new Uint8Array(readFileSync(path.join(DIR, file))),
    useSystemFonts: true,
  }).promise;

  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    const runs = [];
    for (const it of (await page.getTextContent()).items) {
      const text = (it.str ?? "").trim();
      if (!text) continue;
      runs.push({
        // Rounded to a tenth of a point: finer than any placement needs, and it
        // keeps the file readable when a diff has to be understood.
        t: it.str,
        x: Math.round(it.transform[4] * 10) / 10,
        y: Math.round(it.transform[5] * 10) / 10,
        w: Math.round((it.width ?? 0) * 10) / 10,
      });
    }
    pages.push({ page: i, width: Math.round(vp.width), height: Math.round(vp.height), runs });
  }
  out[name] = { pages };
  const total = pages.reduce((n, p) => n + p.runs.length, 0);
  console.log(`  ${name.padEnd(12)} ${pages.length} page(s), ${total} text run(s)`);
}

writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`\n  written ${path.relative(process.cwd(), OUT)}`);
