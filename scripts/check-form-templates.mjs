// Checks the society's form templates for text that must not travel inside a
// member's document.
//
// The forms arrive as exports of documents the office has used for years, and
// some are exported from a filled specimen rather than a blank. Painting over a
// specimen's details hides them on the page but leaves them in the PDF's text
// layer, where anyone who selects the text or runs a search will find them — so
// a member's admission letter can end up carrying another member's name and
// home address. That is a privacy failure, not a cosmetic one, and it is
// invisible unless something looks for it.
//
//   node scripts/check-form-templates.mjs
//
// Exits non-zero when a template still holds specimen text.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const DIR = path.join(process.cwd(), "assets", "forms");

// Names and details found in the specimens the office supplied. A template is
// blank when none of these appear in it.
const SPECIMEN = [
  "Mosty Chansa",
  "Chelstone Green",
  "Plot Number 22",
  "Towera Nyirongo Mukubu",
];

// Printed on every form and correct to keep — listing them here documents that
// they were considered rather than missed.
const EXPECTED = ["Mirrias Siamutundo", "GENERAL MANAGER"];

// The mailbox the society has left behind. scripts/fix-form-letterhead.py took
// it out of the letterheads; if a re-exported template brings it back, every
// form the portal issues again invites members to write to a dead address.
const STALE = ["zamcops@zamnet.zm"];

async function textOf(file) {
  const doc = await getDocument({
    data: new Uint8Array(readFileSync(file)),
    useSystemFonts: true,
  }).promise;
  let out = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent();
    out += tc.items.map((it) => it.str).join(" ") + "\n";
  }
  return out;
}

let failures = 0;
const files = readdirSync(DIR).filter((f) => f.endsWith(".pdf")).sort();
if (files.length === 0) {
  console.error(`No templates found in ${DIR}`);
  process.exit(1);
}

for (const f of files) {
  const text = await textOf(path.join(DIR, f));
  const found = [...SPECIMEN, ...STALE].filter((s) => text.includes(s));
  const kept = EXPECTED.filter((s) => text.includes(s));
  if (found.length) {
    failures++;
    console.log(`  \x1b[31m✗\x1b[0m ${f} — specimen text still present: ${found.join(", ")}`);
    console.log(`       re-export without them, or run scripts/fix-form-letterhead.py; covering them is not enough`);
  } else {
    console.log(`  \x1b[32m✓\x1b[0m ${f} — no specimen text${kept.length ? ` (keeps: ${kept.join(", ")})` : ""}`);
  }
}

// Every position the field maps name has to still exist in the template.
//
// Slot ids carry the coordinate they were taken from, so re-exporting a form
// moves them. Without this, a template that shifted by a few points would keep
// rendering — quietly writing each answer a line away from its question, which
// is exactly the failure that is hardest to notice on a finished PDF.
console.log("\nChecking the field maps against assets/forms/slots.json");
const slots = JSON.parse(readFileSync(path.join(DIR, "slots.json"), "utf8"));
const mapDir = path.join(process.cwd(), "lib", "officialForms");
const TEMPLATE_OF = { applicationForm: null }; // resolved per id below

let dangling = 0;
for (const file of readdirSync(mapDir).filter((f) => f.endsWith(".ts"))) {
  const src = readFileSync(path.join(mapDir, file), "utf8");
  // Which sheets this map writes on, so an id is only looked for where it belongs.
  const sheets = Object.keys(slots).filter((t) => src.includes(`"${t}"`));
  const ids = [...src.matchAll(/"((?:p\d+\.\d+\.\d+)|(?:mark:[^"]+))"/g)].map((m) => m[1]);
  if (!ids.length) continue;
  const bad = [];
  for (const id of new Set(ids)) {
    const where = sheets.filter((t) => slots[t]?.anchors?.[id]);
    if (!where.length) bad.push(id);
  }
  if (bad.length) {
    dangling += bad.length;
    console.log(`  \x1b[31m✗\x1b[0m ${file} — ${bad.length} position(s) no longer on any template: ${bad.join(", ")}`);
  } else {
    console.log(`  \x1b[32m✓\x1b[0m ${file} — ${new Set(ids).size} position(s), all present`);
  }
}
void TEMPLATE_OF;

if (failures || dangling) {
  if (failures) {
    console.log(`\n\x1b[31m${failures} template(s) would leak specimen details into members' documents.\x1b[0m`);
  }
  if (dangling) {
    console.log(`\n\x1b[31m${dangling} mapped position(s) are missing — re-run \`npm run map:forms\` and re-map them.\x1b[0m`);
  }
  process.exit(1);
}
console.log("\n\x1b[32mAll templates are clean and every mapped position resolves.\x1b[0m");
