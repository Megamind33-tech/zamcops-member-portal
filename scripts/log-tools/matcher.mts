import { normalize, similarity } from "../../lib/logText.ts";

// Matches usage-log songs to the society register and says how sure it is.
//   A  exact title AND a creator that matches the artist  -> safe to auto-match
//   B  exact title but a different artist                  -> needs a human (same title, other song?)
//   C  a creator matches the artist AND the title is close -> the artist's own work, spelled differently
//   D  nothing in the register
// A and C rows get rewritten with the register's own title and creator spelling.

export type Work = { id: string; title: string; alts: string[]; creators: string[] };
export type Cls = "A" | "B" | "C" | "D";
export type Hit = { cls: Cls; work?: Work; title?: string; creator?: string; titleScore: number; artistScore: number; note: string };

const GENERIC = new Set(["varios", "various", "various artists", "unknown", "unknown artist", "traditional", "va", "n a", "na", "playlist", "radio", "dj", "mix"]);
const ARTIST_OK = 80; // an artist matches a creator at this similarity or better
const TITLE_CLOSE = 75; // a title is "close" at this similarity or better

export function cleanTitle(t: string): string {
  return t
    .replace(/\.(mp3|wav|m4a|flac)$/i, "")
    .replace(/\s*[\(\[][^\)\]]*[\)\]]/g, " ") // (Live) [Official Video] (Radio Edit)
    .replace(/\s+[-–|]\s+(remaster(ed)?( \d{4})?|radio edit|live|remix|official.*|lyrics?.*|audio|video|single version|album version|instrumental|karaoke.*|zambianplay\.com.*|\S+\.(com|net|org|co\.zm).*)$/i, "")
    .replace(/\s+(feat|ft)\.?\s+.*$/i, "")
    .replace(/^\d{1,3}\s*[-.)]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

// "Bruno Mars Karaoke Band / Made famous by Bruno Mars" -> ["Bruno Mars"]
export function artistNames(a: string): string[] {
  let s = a.replace(/[\(\[][^\)\]]*[\)\]]/g, " ");
  const famous = /made famous by\s+(.+)$/i.exec(s);
  if (famous) s = famous[1];
  s = s.replace(/\b(karaoke( band| version)?|tribute( band)?( to)?|official|topic|vevo|music|band)\b/gi, " ");
  const parts = s.split(/\/|;|,|&|\bfeat\.?\b|\bft\.?\b|\bfeaturing\b|\bwith\b|\bx\b|\band\b/i).map((p) => p.replace(/\s+/g, " ").trim()).filter((p) => p.length > 1);
  return [...new Set(parts)];
}

const isGeneric = (n: string) => GENERIC.has(normalize(n));

// both orders of "SURNAME, FIRST"
function nameForms(c: string): string[] {
  const m = /^([^,]+),\s*(.+)$/.exec(c.trim());
  return m ? [c, `${m[2]} ${m[1]}`] : [c];
}
const sortedKey = (n: string) => normalize(n).split(" ").sort().join(" ");

export class Register {
  works: Work[] = [];
  private titles = new Map<string, { w: Work; t: string }[]>();
  private byCreator = new Map<string, Work[]>();

  constructor(works: Work[]) {
    this.works = works;
    for (const w of works) {
      for (const t of [w.title, ...w.alts]) {
        const k = normalize(cleanTitle(t) || t);
        if (!k) continue;
        const l = this.titles.get(k) ?? [];
        l.push({ w, t });
        this.titles.set(k, l);
      }
      for (const c of w.creators) {
        for (const f of nameForms(c)) {
          const k = sortedKey(f);
          if (!k) continue;
          const l = this.byCreator.get(k) ?? [];
          if (l[l.length - 1] !== w) l.push(w);
          this.byCreator.set(k, l);
        }
      }
    }
  }

  private artistScore(names: string[], w: Work): { score: number; creator: string } {
    let best = { score: 0, creator: "" };
    for (const c of w.creators) {
      for (const f of nameForms(c)) {
        for (const n of names) {
          const s = similarity(n, f);
          if (s > best.score) best = { score: s, creator: c };
        }
      }
    }
    return best;
  }

  match(title: string, artist: string): Hit {
    const names = artistNames(artist).filter((n) => !isGeneric(n));
    const ct = cleanTitle(title) || title;
    const tk = normalize(ct);

    // exact title (clean or raw)
    const exact = [...(this.titles.get(tk) ?? []), ...(this.titles.get(normalize(title)) ?? [])];
    if (exact.length) {
      let best: { w: Work; t: string; a: { score: number; creator: string } } | null = null;
      for (const e of exact) {
        const a = names.length ? this.artistScore(names, e.w) : { score: 0, creator: "" };
        if (!best || a.score > best.a.score) best = { ...e, a };
      }
      if (best && best.a.score >= ARTIST_OK) return { cls: "A", work: best.w, title: best.t, creator: best.a.creator, titleScore: 100, artistScore: best.a.score, note: "exact title + artist" };
      return { cls: "B", work: best?.w, title: best?.t, creator: best?.a.creator, titleScore: 100, artistScore: best?.a.score ?? 0, note: names.length ? "same title, different artist" : "same title, artist not usable" };
    }

    // the artist's own works with a close title
    let bestC: { w: Work; t: string; ts: number; a: { score: number; creator: string } } | null = null;
    const seen = new Set<Work>();
    for (const n of names) {
      for (const w of this.byCreator.get(sortedKey(n)) ?? []) {
        if (seen.has(w)) continue;
        seen.add(w);
        const a = this.artistScore([n], w);
        if (a.score < ARTIST_OK) continue;
        for (const t of [w.title, ...w.alts]) {
          const ts = similarity(ct, cleanTitle(t) || t);
          if (ts >= TITLE_CLOSE && (!bestC || ts > bestC.ts)) bestC = { w, t, ts, a };
        }
      }
    }
    if (bestC) return { cls: "C", work: bestC.w, title: bestC.t, creator: bestC.a.creator, titleScore: bestC.ts, artistScore: bestC.a.score, note: "artist's work, title differs" };
    return { cls: "D", titleScore: 0, artistScore: 0, note: "not in the register" };
  }
}

// ── CSV (the portal's catalogue export or any export with title / creator columns) ──
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cur = "", q = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n") { row.push(cur.replace(/\r$/, "")); rows.push(row); row = []; cur = ""; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur.replace(/\r$/, "")); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

export function worksFromCsv(text: string): Work[] {
  const rows = parseCsv(text);
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const find = (re: RegExp) => head.findIndex((h) => re.test(h));
  const ti = find(/^(title|work title|original title|titre)$/);
  const ci = find(/(right.?holder|creator|composer|author|owner|artist)/);
  const ii = find(/(main ?id|^id$|work id)/);
  const ai = find(/(alt|other).*title/);
  if (ti < 0) throw new Error("No Title column found in the register file. Columns: " + rows[0].join(" | "));
  if (ci < 0) throw new Error("No creators / right-holders column found. Columns: " + rows[0].join(" | "));
  return rows.slice(1).map((r, n) => ({
    id: ii >= 0 ? r[ii] : String(n + 1),
    title: (r[ti] ?? "").trim(),
    alts: ai >= 0 ? (r[ai] ?? "").split(/[;|]/).map((x) => x.trim()).filter(Boolean) : [],
    creators: (r[ci] ?? "").split(/;|\|/).map((x) => x.trim()).filter(Boolean),
  })).filter((w) => w.title);
}
