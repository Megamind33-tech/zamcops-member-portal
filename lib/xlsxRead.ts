import { inflateRawSync } from "node:zlib";

// A small .xlsx reader: an .xlsx file is a zip of XML parts, so the zip index is
// read by hand and the sheet, shared strings and cells are picked out of the XML.
// No package is needed. Only cell text is returned (dates arrive as their serial number).

function unzip(buf: Buffer): Map<string, Buffer> {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("This is not an .xlsx file.");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = new Map<string, Buffer>();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("The .xlsx file is damaged.");
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (buf.readUInt32LE(local) !== 0x04034b50) continue;
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + csize);
    if (method === 0) files.set(name, Buffer.from(raw));
    else if (method === 8) files.set(name, inflateRawSync(raw));
  }
  return files;
}

const unesc = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

const textOf = (xml: string) => [...xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => unesc(m[1])).join("");

function colIndex(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/[0-9]/g, "")) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

// Rows of the sheet with the given 1-based number, as text. Empty cells are "".
export function readXlsx(buf: Buffer, sheetNumber = 1): string[][] {
  const files = unzip(buf);
  const get = (name: string) => files.get(name)?.toString("utf8") ?? "";

  const shared = [...get("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>|<si\/>/g)].map((m) => (m[1] ? textOf(m[1]) : ""));

  // sheet N → its part, through the workbook relationships
  const sheets = [...get("xl/workbook.xml").matchAll(/<sheet\b[^>]*?\br:id="([^"]+)"[^>]*>/g)].map((m) => m[1]);
  const rels = new Map<string, string>();
  for (const m of get("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /\bId="([^"]+)"/.exec(m[0])?.[1];
    const target = /\bTarget="([^"]+)"/.exec(m[0])?.[1];
    if (id && target) rels.set(id, target.startsWith("/") ? target.slice(1) : "xl/" + target);
  }
  const part = rels.get(sheets[sheetNumber - 1] ?? "") ?? `xl/worksheets/sheet${sheetNumber}.xml`;
  const xml = get(part);
  if (!xml) throw new Error(`The file has no sheet number ${sheetNumber}.`);

  const rows: string[][] = [];
  for (const rm of xml.matchAll(/<row\b[^>]*?(?:\br="(\d+)")?[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowNo = rm[1] ? Number(rm[1]) - 1 : rows.length;
    const cells: string[] = [];
    for (const cm of rm[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1];
      const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1];
      const idx = ref ? colIndex(ref) : cells.length;
      const type = /\bt="([^"]+)"/.exec(attrs)?.[1] ?? "";
      const body = cm[2] ?? "";
      let value = "";
      if (type === "inlineStr") value = textOf(body);
      else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "";
        value = type === "s" ? (shared[Number(v)] ?? "") : unesc(v);
      }
      while (cells.length < idx) cells.push("");
      cells[idx] = value;
    }
    while (rows.length < rowNo) rows.push([]);
    rows[rowNo] = cells;
  }
  return rows;
}
