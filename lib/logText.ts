// Text comparison for usage-log matching. Pure functions, no database.

export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

// 0–100. The better of the whole-string edit similarity and the word-set
// overlap, so "WABWINO MC" and "MC Wabwino" count as the same name.
export function similarity(x: string, y: string): number {
  const a = normalize(x);
  const b = normalize(y);
  if (!a || !b) return 0;
  if (a === b) return 100;
  const whole = (1 - levenshtein(a, b) / Math.max(a.length, b.length)) * 100;
  const ta = new Set(a.split(" "));
  const tb = new Set(b.split(" "));
  const shared = [...ta].filter((t) => tb.has(t)).length;
  const sets = (shared / Math.max(ta.size, tb.size)) * 100;
  return Math.round(Math.max(whole, sets) * 100) / 100;
}

// How well a creators string ("A. One / B Two") is covered by the names a work has:
// each creator in the log is compared with the work's names and the average is taken.
export function creatorsSimilarity(logCreators: string, workNames: string[]): number {
  const parts = logCreators.split(/[\/;,&]|\band\b|\bfeat\.?\b|\bft\.?\b/i).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0 || workNames.length === 0) return 0;
  const best = parts.map((p) => Math.max(...workNames.map((n) => similarity(p, n))));
  return Math.round((best.reduce((s, v) => s + v, 0) / best.length) * 100) / 100;
}
