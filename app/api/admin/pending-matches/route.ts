import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { MATCH_STATUSES } from "@/lib/logMatching";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const PAGE_SIZE = 50;

type Cand = { workId: string; title: string; score: number };

// WIPO Connect Matching and Distribution > Pending Matches
//   ?amountFrom= &amountTo= &status= &performer= &creator= &dpl=(link id) &page=
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "PENDING_MATCH_ACCESS"))) return bad("You do not have the Pending Matches Access permission.", 403);
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const contains = (v: string) => ({ contains: v, mode: "insensitive" as const });
  const where: Prisma.UsageLogGroupWhereInput = {};
  const status = sp.get("status");
  where.status = status && (MATCH_STATUSES as readonly string[]).includes(status) ? status : { in: ["To be matched", "Possible match", "Not matched"] };
  const from = Number(sp.get("amountFrom"));
  const to = Number(sp.get("amountTo"));
  if (sp.get("amountFrom") && Number.isFinite(from)) where.amount = { ...(where.amount as object), gte: from };
  if (sp.get("amountTo") && Number.isFinite(to)) where.amount = { ...(where.amount as object), lte: to };
  if ((sp.get("creator") ?? "").trim()) where.creators = contains(sp.get("creator")!.trim());
  // DPL / Class / Sub Class narrow the lines to the pool links they were imported for
  if (sp.get("dpl") || sp.get("class") || sp.get("subClass")) {
    const links = await prisma.distributionPoolLink.findMany({
      where: {
        ...(sp.get("dpl") ? { id: sp.get("dpl")! } : {}),
        ...(sp.get("class") ? { className: contains(sp.get("class")!.trim()) } : {}),
        ...(sp.get("subClass") ? { subClass: contains(sp.get("subClass")!.trim()) } : {}),
      },
      select: { id: true },
    });
    const logs = await prisma.usageLog.findMany({ where: { linkId: { in: links.map((l) => l.id) } }, select: { id: true } });
    where.usageLogId = { in: logs.map((l) => l.id) };
  }

  const [total, rows] = await Promise.all([
    prisma.usageLogGroup.count({ where }),
    prisma.usageLogGroup.findMany({ where, orderBy: [{ amount: "desc" }, { title: "asc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  const logs = await prisma.usageLog.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.usageLogId))] } }, select: { id: true, linkId: true } });
  const links = await prisma.distributionPoolLink.findMany({
    where: { id: { in: logs.map((l) => l.linkId).filter((x): x is string => !!x) } },
    select: { id: true, seq: true, distributionId: true, amount: true },
  });
  // Estimated Amount: the link's amount in proportion to this line's share of everything logged for the link
  const sibling = await prisma.usageLog.findMany({ where: { linkId: { in: links.map((l) => l.id) } }, select: { id: true, linkId: true } });
  const sums = await prisma.usageLogGroup.groupBy({ by: ["usageLogId"], where: { usageLogId: { in: sibling.map((l) => l.id) } }, _sum: { amount: true } });
  const totalByLink = new Map<string, number>();
  for (const x of sums) {
    const lk = sibling.find((l) => l.id === x.usageLogId)?.linkId;
    if (lk) totalByLink.set(lk, (totalByLink.get(lk) ?? 0) + (x._sum.amount ?? 0));
  }
  const linkOf = new Map(logs.map((l) => [l.id, links.find((k) => k.id === l.linkId)]));
  const works = await prisma.registryWork.findMany({ where: { id: { in: rows.map((r) => r.workId).filter((x): x is string => !!x) } }, select: { id: true, title: true, wipoId: true } });
  const wById = new Map(works.map((w) => [w.id, w]));

  return json({
    page,
    pageSize: PAGE_SIZE,
    total,
    canManage: await hasPermission(session.sub, "MATCHING_MGMT"),
    statuses: MATCH_STATUSES,
    rows: rows.map((r) => {
      const link = linkOf.get(r.usageLogId);
      return {
        id: r.id,
        title: r.title,
        creators: r.creators,
        identifier: r.identifier,
        rows: r.rowsCount,
        amount: r.amount,
        score: r.score,
        status: r.status,
        matchedBy: r.matchedBy,
        work: r.workId ? (wById.get(r.workId) ?? null) : null,
        candidates: (r.candidates as Cand[]) ?? [],
        dplMainId: link ? `133-${link.seq}-DPL` : "",
        distributionId: link?.distributionId ?? null,
        linkId: link?.id ?? null,
        estimated: link && (totalByLink.get(link.id) ?? 0) > 0 ? Math.round(((link.amount * r.amount) / totalByLink.get(link.id)!) * 100) / 100 : 0,
      };
    }),
  });
}

// PATCH { id, action: "match", workId } | { id, action: "ignore" } | { id, action: "remove" }
export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "MATCHING_MGMT"))) return bad("You do not have the Matching (Management) permission.", 403);
  const b = await req.json().catch(() => null);
  const g = b?.id ? await prisma.usageLogGroup.findUnique({ where: { id: String(b.id) } }) : null;
  if (!g) return bad("Line not found.", 404);
  const log = await prisma.usageLog.findUnique({ where: { id: g.usageLogId }, select: { sourceId: true, importCode: true } });

  if (b.action === "match") {
    const work = await prisma.registryWork.findUnique({ where: { id: String(b.workId ?? "") }, select: { id: true, title: true } });
    if (!work) return bad("Choose a work to match this line to.");
    await prisma.usageLogGroup.update({ where: { id: g.id }, data: { workId: work.id, status: "Matched", score: g.score, matchedBy: "staff" } });
    // remember it for this log source, so the same title and creators match next time
    if (log?.sourceId) await prisma.usageMatchHistory.upsert({ where: { sourceId_key: { sourceId: log.sourceId, key: g.key } }, create: { sourceId: log.sourceId, key: g.key, workId: work.id }, update: { workId: work.id } });
    await logAudit(session.sub, "usage-match.saved", { targetType: "Usage log", targetId: g.usageLogId, summary: `Matched “${g.title}” to ${work.title}` });
    return json({ ok: true });
  }
  if (b.action === "ignore") {
    await prisma.usageLogGroup.update({ where: { id: g.id }, data: { status: "Ignored", workId: null, matchedBy: "staff" } });
    await logAudit(session.sub, "usage-match.ignored", { targetType: "Usage log", targetId: g.usageLogId, summary: `Ignored “${g.title}”` });
    return json({ ok: true });
  }
  if (b.action === "remove") {
    await prisma.usageLogGroup.update({ where: { id: g.id }, data: { status: "Not matched", workId: null, matchedBy: "" } });
    if (log?.sourceId) await prisma.usageMatchHistory.deleteMany({ where: { sourceId: log.sourceId, key: g.key } });
    await logAudit(session.sub, "usage-match.removed", { targetType: "Usage log", targetId: g.usageLogId, summary: `Removed the match of “${g.title}”` });
    return json({ ok: true });
  }
  return bad("Unknown action.");
}
