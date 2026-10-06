import { prisma } from "@/lib/db";
import { normalize, similarity, creatorsSimilarity } from "@/lib/logText";
import { parseLog, type ParsedGroup } from "@/lib/logParse";
import { compileFormula } from "@/lib/formula";
import type { LogField, LogWeight } from "@/lib/matchingSettings-const";

export const MATCH_STATUSES = ["To be matched", "Possible match", "Matched", "Not matched", "Ignored"] as const;

type Source = {
  id: string;
  minThreshold: number;
  maxThreshold: number;
  roles: string[];
  similarity: number | null;
  numberOfWorks: number | null;
  weights: LogWeight[];
};

type Candidate = { workId: string; title: string; score: number };

async function candidatesFor(g: ParsedGroup, src: Source): Promise<Candidate[]> {
  // identifier first: an exact ISRC / identifier hit is a certain match
  if (g.identifier) {
    const hit = await prisma.registryWork.findMany({
      where: { OR: [{ isrc: g.identifier }, { iswc: g.identifier }, { identifiers: { contains: g.identifier } }] },
      select: { id: true, title: true },
      take: 5,
    });
    if (hit.length) return hit.map((w) => ({ workId: w.id, title: w.title, score: 100 }));
    if (!g.title) return [];
  }

  // pre-matching: narrow the register by the longest words of the title, then keep the closest titles
  const words = normalize(g.title).split(" ").filter((w) => w.length > 2).sort((a, b) => b.length - a.length).slice(0, 3);
  if (words.length === 0) return [];
  const pool = await prisma.registryWork.findMany({
    where: { OR: words.map((w) => ({ title: { contains: w, mode: "insensitive" as const } })) },
    select: { id: true, title: true },
    take: 600,
  });
  const preMin = src.similarity ?? 50;
  const keep = src.numberOfWorks ?? 10;
  const close = pool
    .map((w) => ({ w, s: similarity(g.title, w.title) }))
    .filter((x) => x.s >= preMin)
    .sort((a, b) => b.s - a.s)
    .slice(0, keep);
  if (close.length === 0) return [];

  const wTitle = src.weights.find((w) => w.column && w.weight != null && /title/i.test(w.column))?.weight ?? 1;
  const wCreator = src.weights.find((w) => w.column && w.weight != null && /artist|creator|author|composer/i.test(w.column))?.weight ?? 1;

  let namesBy = new Map<string, string[]>();
  if (g.creators) {
    const shares = await prisma.workShare.findMany({
      where: { workId: { in: close.map((c) => c.w.id) }, ...(src.roles.length ? { roleCode: { in: src.roles } } : {}) },
      select: { workId: true, rightHolder: { select: { displayName: true } }, name: { select: { name: true } } },
    });
    namesBy = new Map();
    for (const s of shares) {
      const list = namesBy.get(s.workId) ?? [];
      for (const n of [s.rightHolder?.displayName, s.name?.name]) if (n) list.push(n);
      namesBy.set(s.workId, list);
    }
  }

  return close
    .map(({ w, s }) => {
      if (!g.creators) return { workId: w.id, title: w.title, score: s };
      const c = creatorsSimilarity(g.creators, namesBy.get(w.id) ?? []);
      // final score: the title and creator similarities, each by its weight
      return { workId: w.id, title: w.title, score: Math.round(((s * wTitle + c * wCreator) / (wTitle + wCreator)) * 100) / 100 };
    })
    .sort((a, b) => b.score - a.score);
}

// Match every group of an imported log. A group with a confirmed match in the
// source's history is matched at once; otherwise the best candidate decides:
// at or above Max Final Threshold → Matched, at or above Min → Possible match.
export async function matchUsageLog(usageLogId: string): Promise<{ matched: number; possible: number; notMatched: number }> {
  const log = await prisma.usageLog.findUnique({ where: { id: usageLogId } });
  if (!log?.sourceId) throw new Error("This usage log has no log source.");
  const s = await prisma.logSource.findUnique({ where: { id: log.sourceId } });
  if (!s) throw new Error("The log source of this usage log no longer exists.");
  const src: Source = { id: s.id, minThreshold: s.minThreshold, maxThreshold: s.maxThreshold, roles: s.roles as string[], similarity: s.similarity, numberOfWorks: s.numberOfWorks, weights: s.weights as LogWeight[] };

  const groups = await prisma.usageLogGroup.findMany({ where: { usageLogId, status: { notIn: ["Matched", "Ignored"] } } });
  const hist = new Map((await prisma.usageMatchHistory.findMany({ where: { sourceId: s.id, key: { in: groups.map((g) => g.key) } } })).map((h) => [h.key, h.workId]));
  const out = { matched: 0, possible: 0, notMatched: 0 };

  for (const g of groups) {
    const h = hist.get(g.key);
    if (h && (await prisma.registryWork.count({ where: { id: h } }))) {
      await prisma.usageLogGroup.update({ where: { id: g.id }, data: { workId: h, score: 100, status: "Matched", matchedBy: "history", candidates: [] } });
      out.matched++;
      continue;
    }
    const cands = (await candidatesFor({ key: g.key, title: g.title, creators: g.creators, identifier: g.identifier, rowsCount: g.rowsCount, amount: g.amount, splits: {} }, src)).slice(0, 5);
    const top = cands[0];
    let status = "Not matched";
    let workId: string | null = null;
    if (top && top.score >= src.maxThreshold) {
      status = "Matched";
      workId = top.workId;
      out.matched++;
    } else if (top && top.score >= src.minThreshold) {
      status = "Possible match";
      out.possible++;
    } else out.notMatched++;
    await prisma.usageLogGroup.update({ where: { id: g.id }, data: { workId, score: top?.score ?? null, status, candidates: cands, matchedBy: workId ? "auto" : "" } });
  }
  return out;
}

// Import: parse, group, store, then match. Returns the new usage log id.
export async function importUsageLog(opts: { buf: Buffer; filename: string; linkId: string; sourceId: string }): Promise<string> {
  const src = await prisma.logSource.findUnique({ where: { id: opts.sourceId } });
  if (!src) throw new Error("Choose a Log Source for this pool link.");
  const format = await prisma.logFormat.findUnique({ where: { id: src.formatId } });
  if (!format) throw new Error("The Log Source's Log Format no longer exists.");
  const link = await prisma.distributionPoolLink.findUnique({ where: { id: opts.linkId }, select: { id: true, distributionId: true } });
  if (!link) throw new Error("Pool link not found.");

  const now = new Date();
  const importCode = `UL-${now.toISOString().replace(/\D/g, "").slice(0, 17)}`;
  const log = await prisma.usageLog.create({
    data: { importCode, filename: opts.filename, linkId: link.id, distributionId: link.distributionId, sourceId: src.id, status: "IMPORTING", startedAt: now },
  });
  try {
    const parsed = parseLog(opts.buf, { sheetNumber: format.sheetNumber, headerLines: format.headerLines, footerLines: format.footerLines, fields: format.fields as LogField[] });
    if (parsed.groups.length === 0) throw new Error("The file has no usable lines.");
    await prisma.usageLogGroup.createMany({
      data: parsed.groups.map((g) => ({ usageLogId: log.id, key: g.key, title: g.title, creators: g.creators, identifier: g.identifier, rowsCount: g.rowsCount, amount: g.amount, splits: g.splits })),
    });
    await prisma.usageLog.update({ where: { id: log.id }, data: { insertedItems: parsed.rows, groupedItems: parsed.groups.length, status: "MATCHING" } });
    await matchUsageLog(log.id);
    const done = await prisma.usageLogGroup.count({ where: { usageLogId: log.id, status: { in: ["Matched", "Ignored"] } } });
    await prisma.usageLog.update({ where: { id: log.id }, data: { processedItems: done, endedAt: new Date(), status: "MATCH_COMPLETED" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "The import failed.";
    await prisma.usageLog.update({ where: { id: log.id }, data: { status: "IMPORT_ERROR", errorNumbers: 1, endedAt: new Date() } });
    await prisma.issueLog.create({ data: { source: `Usage log ${importCode}`, message: msg.slice(0, 2000) } }).catch(() => {});
    throw new Error(msg);
  }
  return log.id;
}

// Run Allocation for a Log Based link: every matched group of its usage logs
// becomes a work on the link, weighed by the Log Allocation Method's formula
// (for example $PLAYS$) applied to the work's total. Lines still unmatched stay in
// Pending Matches and are not paid until staff match them.
export async function syncLogWorks(linkId: string, methodFormula: string | null): Promise<{ works: number; unmatched: number }> {
  const logs = await prisma.usageLog.findMany({ where: { linkId, status: { not: "IMPORT_ERROR" } }, select: { id: true } });
  const groups = await prisma.usageLogGroup.findMany({ where: { usageLogId: { in: logs.map((l) => l.id) } }, select: { workId: true, status: true, amount: true } });
  const totals = new Map<string, number>();
  let unmatched = 0;
  for (const g of groups) {
    if (g.status === "Matched" && g.workId) totals.set(g.workId, (totals.get(g.workId) ?? 0) + g.amount);
    else if (g.status !== "Ignored") unmatched++;
  }
  if (totals.size === 0) throw new Error(groups.length ? "No usage log line is matched to a work yet — match them in Pending Matches first." : "Import a usage log for this pool link first.");

  const f = methodFormula ? compileFormula(methodFormula.replace(/\$[A-Za-z_]+\$/g, "$Weight$")) : null;
  await prisma.$transaction([
    prisma.distributionPoolWork.deleteMany({ where: { linkId } }),
    prisma.distributionPoolWork.createMany({
      data: [...totals].map(([workId, amount]) => ({ linkId, workId, weight: f ? f({ Weight: amount }) : amount })),
    }),
  ]);
  return { works: totals.size, unmatched };
}
