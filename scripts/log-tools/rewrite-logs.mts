// Rewrites station usage logs so WIPO can auto-match them.
//
//   node --experimental-strip-types --no-warnings scripts/log-tools/rewrite-logs.mts <register.csv|folder> <logs folder> <output folder>
//
// <register>      the catalogue CSV(s) exported from the portal (Title + right-holders columns)
// <logs folder>   the station .xlsx files (TITLE, ARTIST, FREQUENCY, STATION)
// <output>        gets one rewritten .xlsx per station, MATCH_REPORT.csv and SUMMARY.csv
//
// Songs the register knows (class A: exact title + artist, class C: the artist's work with a close title)
// get the register's own title and creator spelling. Everything else is left exactly as it was.
import fs from "node:fs";
import path from "node:path";
import { readXlsx } from "../../lib/xlsxRead.ts";
import { Register, worksFromCsv, type Cls } from "./matcher.mts";
import { xlsx } from "./xlsxWrite.mts";

const [regArg, logsDir, outDir] = process.argv.slice(2);
if (!regArg || !logsDir || !outDir) {
  console.error("Usage: rewrite-logs.mts <register.csv|folder> <logs folder> <output folder>");
  process.exit(2);
}

const regFiles = fs.statSync(regArg).isDirectory() ? fs.readdirSync(regArg).filter((f) => /\.csv$/i.test(f)).map((f) => path.join(regArg, f)) : [regArg];
const works = regFiles.flatMap((f) => worksFromCsv(fs.readFileSync(f, "utf8")));
const seen = new Set<string>();
const unique = works.filter((w) => (seen.has(w.id) ? false : (seen.add(w.id), true)));
console.log(`register: ${unique.length.toLocaleString()} works from ${regFiles.length} file(s)`);
const reg = new Register(unique);

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const report: string[] = [["Station", "Class", "Log title", "Log artist", "FREQUENCY", "Register Main Id", "Register title", "Register creator", "Title score", "Artist score", "Note"].map(q).join(",")];
const summary: string[] = [["File", "Songs", "A exact", "B same title other artist", "C artist's work", "D not in register", "Rewritten (A+C) songs", "Rewritten % of songs", "Rewritten % of FREQUENCY"].map(q).join(",")];
const tot = { songs: 0, freq: 0, rew: 0, rewFreq: 0, A: 0, B: 0, C: 0, D: 0 };

for (const file of fs.readdirSync(logsDir).filter((f) => /\.xlsx$/i.test(f)).sort()) {
  const rows = readXlsx(fs.readFileSync(path.join(logsDir, file)), 1).filter((r) => r.some((c) => (c ?? "").trim()));
  const head = rows[0].map((h) => h.trim().toUpperCase());
  const ti = head.indexOf("TITLE"), ai = head.indexOf("ARTIST"), fi = head.indexOf("FREQUENCY"), si = head.indexOf("STATION");
  if (ti < 0 || ai < 0 || fi < 0) { console.log("skip (no TITLE/ARTIST/FREQUENCY):", file); continue; }
  const station = (rows[1]?.[si] ?? "").trim();
  const n: Record<Cls, number> = { A: 0, B: 0, C: 0, D: 0 };
  let freq = 0, rewFreq = 0;
  const merged = new Map<string, (string | number)[]>();
  for (const r of rows.slice(1)) {
    const title = (r[ti] ?? "").trim(), artist = (r[ai] ?? "").trim(), f = Number(r[fi]) || 0;
    const hit = reg.match(title, artist);
    n[hit.cls]++;
    freq += f;
    report.push([station, hit.cls, title, artist, f, hit.work?.id ?? "", hit.title ?? "", hit.creator ?? "", Math.round(hit.titleScore), Math.round(hit.artistScore), hit.note].map(q).join(","));
    const rewrite = hit.cls === "A" || hit.cls === "C";
    if (rewrite) rewFreq += f;
    const outTitle = rewrite ? hit.title! : title, outArtist = rewrite ? hit.creator! : artist;
    const key = `${outTitle}\u0000${outArtist}`;
    const cur = merged.get(key);
    if (cur) cur[2] = (cur[2] as number) + f;
    else merged.set(key, [outTitle, outArtist, f, station]);
  }
  fs.writeFileSync(path.join(outDir, file), xlsx([["TITLE", "ARTIST", "FREQUENCY", "STATION"], ...merged.values()]));
  const songs = rows.length - 1, rew = n.A + n.C;
  summary.push([file, songs, n.A, n.B, n.C, n.D, rew, `${((rew / songs) * 100).toFixed(1)}%`, `${((rewFreq / (freq || 1)) * 100).toFixed(1)}%`].map(q).join(","));
  tot.songs += songs; tot.freq += freq; tot.rew += rew; tot.rewFreq += rewFreq; tot.A += n.A; tot.B += n.B; tot.C += n.C; tot.D += n.D;
}
summary.push(["TOTAL", tot.songs, tot.A, tot.B, tot.C, tot.D, tot.rew, `${((tot.rew / (tot.songs || 1)) * 100).toFixed(1)}%`, `${((tot.rewFreq / (tot.freq || 1)) * 100).toFixed(1)}%`].map(q).join(","));
fs.writeFileSync(path.join(outDir, "MATCH_REPORT.csv"), "﻿" + report.join("\r\n"));
fs.writeFileSync(path.join(outDir, "SUMMARY.csv"), "﻿" + summary.join("\r\n"));
console.log(`songs ${tot.songs.toLocaleString()} | A ${tot.A} B ${tot.B} C ${tot.C} D ${tot.D} | rewritten ${tot.rew} = ${((tot.rew / (tot.songs || 1)) * 100).toFixed(1)}% of songs, ${((tot.rewFreq / (tot.freq || 1)) * 100).toFixed(1)}% of FREQUENCY`);
