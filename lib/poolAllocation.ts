import { prisma } from "@/lib/db";

// ──────────────────────────────────────────────────────────────────────────
// Distribution pool links: reading a list of works, and sharing a pool's money
// out across them. Kept out of the route handlers so the arithmetic is in one
// place and can be reasoned about (and tested) on its own.
// ──────────────────────────────────────────────────────────────────────────

export const MAX_LIST_LINES = 5000;

export type ParsedLine = { n: number; raw: string; ref: string; weight: number };

// One work per line. A weight (plays / airings) may follow after a tab, comma
// or semicolon. Handles a quoted title that itself contains commas.
export function parseWorkList(text: string): ParsedLine[] {
  const out: ParsedLine[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  lines.forEach((raw, i) => {
    let line = raw.trim();
    if (!line) return;
    if (i === 0 && /^(title|work|works|work title|iswc|id|main id)$/i.test(line.split(/[\t,;]/)[0].trim().replace(/^"|"$/g, ""))) return; // header row
    let ref = line;
    let weight = 1;
    const quoted = /^"((?:[^"]|"")*)"\s*(?:[\t,;]\s*(\d+(?:\.\d+)?))?\s*$/.exec(line);
    if (quoted) {
      ref = quoted[1].replace(/""/g, '"');
      if (quoted[2]) weight = Number(quoted[2]);
    } else if (line.includes("\t")) {
      const [a, b] = line.split("\t");
      ref = a.trim();
      if (b && Number.isFinite(Number(b))) weight = Number(b);
    } else {
      const m = /^(.*?)[,;]\s*(\d+(?:\.\d+)?)$/.exec(line);
      if (m) {
        ref = m[1].trim();
        weight = Number(m[2]);
      }
    }
    line = ref;
    if (!ref) return;
    if (!(weight > 0)) weight = 1;
    out.push({ n: i + 1, raw: raw.trim(), ref: ref.slice(0, 300), weight: Math.round(weight * 1000) / 1000 });
  });
  return out;
}

const isMainId = (s: string) => /^(?:133-)?(\d{1,9})(?:-W)?$/i.exec(s.trim());
const iswcKey = (s: string) => s.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
const looksLikeIswc = (s: string) => /^T[-\s.]?\d/i.test(s.trim()) && iswcKey(s).length >= 10;
const iswcFormats = (s: string): string[] => {
  const k = iswcKey(s);
  const m = /^T(\d{9})(\d)$/.exec(k);
  return [s.trim(), k, m ? `T-${m[1].slice(0, 3)}.${m[1].slice(3, 6)}.${m[1].slice(6, 9)}-${m[2]}` : ""].filter(Boolean);
};

export type WorkBrief = { id: string; title: string; iswc: string; wipoId: string; holders: string[] };
export type MatchRow = {
  n: number;
  ref: string;
  weight: number;
  status: "matched" | "ambiguous" | "notfound" | "duplicate" | "already";
  work?: WorkBrief;
  candidates?: WorkBrief[];
};

const SELECT = {
  id: true,
  title: true,
  iswc: true,
  wipoId: true,
  shares: { take: 3, orderBy: { share: "desc" as const }, select: { rightHolder: { select: { displayName: true } }, name: { select: { name: true } } } },
};
type Found = { id: string; title: string; iswc: string; wipoId: string; shares: { rightHolder: { displayName: string } | null; name: { name: string } | null }[] };
const brief = (w: Found): WorkBrief => ({
  id: w.id,
  title: w.title,
  iswc: w.iswc,
  wipoId: w.wipoId,
  holders: [...new Set(w.shares.map((s) => s.rightHolder?.displayName || s.name?.name || "").filter(Boolean))],
});

const chunk = <T,>(xs: T[], n: number) => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
};

// Match each line against the society register: by WIPO main id (133-507-W or
// 507), by ISWC, then by exact title (any case). A title shared by several
// works comes back as "ambiguous" with the candidates, never guessed.
export async function matchWorks(lines: ParsedLine[], existingWorkIds: Set<string>): Promise<MatchRow[]> {
  const ids = new Map<string, string[]>(); // wipoId -> refs
  const iswcs: string[] = [];
  const titles: string[] = [];
  for (const l of lines) {
    const id = isMainId(l.ref);
    if (id) ids.set(id[1], [...(ids.get(id[1]) ?? []), l.ref]);
    if (looksLikeIswc(l.ref)) iswcs.push(...iswcFormats(l.ref));
    titles.push(l.ref);
  }

  const byWipo = new Map<string, Found>();
  for (const part of chunk([...ids.keys()], 1000)) {
    for (const w of await prisma.registryWork.findMany({ where: { wipoId: { in: part } }, select: SELECT })) byWipo.set(w.wipoId, w);
  }
  const byIswc = new Map<string, Found[]>();
  for (const part of chunk([...new Set(iswcs)], 1000)) {
    for (const w of await prisma.registryWork.findMany({ where: { iswc: { in: part } }, select: SELECT })) {
      const k = iswcKey(w.iswc);
      byIswc.set(k, [...(byIswc.get(k) ?? []), w]);
    }
  }
  const byTitle = new Map<string, Found[]>();
  for (const part of chunk([...new Set(titles)], 400)) {
    for (const w of await prisma.registryWork.findMany({ where: { title: { in: part, mode: "insensitive" } }, select: SELECT })) {
      const k = w.title.trim().toLowerCase();
      byTitle.set(k, [...(byTitle.get(k) ?? []), w]);
    }
  }

  const seen = new Set<string>();
  return lines.map((l): MatchRow => {
    const base = { n: l.n, ref: l.ref, weight: l.weight };
    let hits: Found[] = [];
    const id = isMainId(l.ref);
    if (id && byWipo.has(id[1])) hits = [byWipo.get(id[1])!];
    else if (looksLikeIswc(l.ref) && byIswc.has(iswcKey(l.ref))) hits = byIswc.get(iswcKey(l.ref))!;
    else hits = byTitle.get(l.ref.trim().toLowerCase()) ?? [];

    if (hits.length === 0) return { ...base, status: "notfound" };
    if (hits.length > 1) {
      // several works share the title: if all but one are already on the list or repeated, say so rather than ask
      return { ...base, status: "ambiguous", candidates: hits.slice(0, 8).map(brief) };
    }
    const w = hits[0];
    if (existingWorkIds.has(w.id)) return { ...base, status: "already", work: brief(w) };
    if (seen.has(w.id)) return { ...base, status: "duplicate", work: brief(w) };
    seen.add(w.id);
    return { ...base, status: "matched", work: brief(w) };
  });
}

// ── allocation ────────────────────────────────────────────────────────────

const sameType = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export type AllocationResult = { lines: number; works: number; amount: number; fee: number; unidentifiedAmount: number; worksWithoutShares: number };

// Share the link's amount across its works in proportion to their weights, then
// each work's share across the right-holders who hold the pool's right type, in
// proportion to their shares. Works with no shares of that type are kept as an
// "unidentified" line so the money is accounted for rather than dropped.
// Everything is worked in whole cents and the rounding remainder goes to the
// largest line, so the lines add up to the link's amount exactly.
export async function allocateLink(linkId: string): Promise<AllocationResult> {
  const link = await prisma.distributionPoolLink.findUnique({
    where: { id: linkId },
    include: { pool: { select: { rightType: true } }, works: { select: { workId: true, weight: true } }, distribution: { select: { status: true } } },
  });
  if (!link) throw new Error("Pool link not found.");
  if (link.distribution.status === "Published") throw new Error("This distribution is published. Unpublish it before changing allocations.");
  if (!(link.amount > 0)) throw new Error("Give the pool link an amount to share out first.");
  if (link.works.length === 0) throw new Error("Add works to this pool link first.");

  const rightType = link.pool?.rightType || "Performing";
  const totalWeight = link.works.reduce((s, w) => s + (w.weight > 0 ? w.weight : 1), 0);
  const targetCents = Math.round(link.amount * 100);

  const sharesByWork = new Map<string, { rightHolderId: string | null; roleCode: string; share: number }[]>();
  for (const part of chunk(
    link.works.map((w) => w.workId),
    1000,
  )) {
    const rows = await prisma.workShare.findMany({ where: { workId: { in: part } }, select: { workId: true, rightHolderId: true, roleCode: true, share: true, rightType: true } });
    for (const s of rows) {
      if (!sameType(s.rightType, rightType) || !(s.share > 0)) continue;
      sharesByWork.set(s.workId, [...(sharesByWork.get(s.workId) ?? []), { rightHolderId: s.rightHolderId, roleCode: s.roleCode, share: s.share }]);
    }
  }

  type L = { workId: string; rightHolderId: string | null; roleCode: string; weight: number; cents: number };
  const lines: L[] = [];
  let withoutShares = 0;
  for (const w of link.works) {
    const weight = w.weight > 0 ? w.weight : 1;
    const workCents = (targetCents * weight) / totalWeight;
    const shares = sharesByWork.get(w.workId) ?? [];
    const total = shares.reduce((s, x) => s + x.share, 0);
    if (shares.length === 0 || !(total > 0)) {
      withoutShares++;
      lines.push({ workId: w.workId, rightHolderId: null, roleCode: "", weight, cents: Math.round(workCents) });
      continue;
    }
    for (const s of shares) lines.push({ workId: w.workId, rightHolderId: s.rightHolderId, roleCode: s.roleCode, weight, cents: Math.round((workCents * s.share) / total) });
  }
  // put the rounding remainder on the largest line
  const sum = lines.reduce((s, l) => s + l.cents, 0);
  if (lines.length && sum !== targetCents) {
    let big = 0;
    lines.forEach((l, i) => {
      if (l.cents > lines[big].cents) big = i;
    });
    lines[big].cents += targetCents - sum;
  }

  const feePct = Math.max(0, Math.min(100, link.adminFeePct || 0));
  const data = lines.map((l) => {
    const amount = l.cents / 100;
    return {
      distributionId: link.distributionId,
      linkId: link.id,
      workId: l.workId,
      rightHolderId: l.rightHolderId,
      roleCode: l.roleCode,
      rightType,
      amount,
      total: amount,
      weight: l.weight,
      adminFee: Math.round(amount * feePct) / 100,
      reserved: 0,
      disputed: false,
    };
  });

  await prisma.$transaction(
    async (tx) => {
      await tx.distributionLine.deleteMany({ where: { linkId: link.id } });
      for (const part of chunk(data, 2000)) await tx.distributionLine.createMany({ data: part });
      await tx.distributionPoolLink.update({ where: { id: link.id }, data: { status: "Allocated", allocatedAt: new Date() } });
    },
    { timeout: 120000, maxWait: 20000 },
  );

  const unidentified = data.filter((d) => !d.rightHolderId).reduce((s, d) => s + d.amount, 0);
  return {
    lines: data.length,
    works: link.works.length,
    amount: targetCents / 100,
    fee: Math.round(data.reduce((s, d) => s + d.adminFee, 0) * 100) / 100,
    unidentifiedAmount: Math.round(unidentified * 100) / 100,
    worksWithoutShares: withoutShares,
  };
}
