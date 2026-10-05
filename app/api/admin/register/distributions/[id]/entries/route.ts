import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

// Turn a run's allocations into member payouts: for every right owner linked to
// a portal account, one DistributionEntry holding what they were allocated,
// with their biggest works as the breakdown. Safe to repeat — it replaces the
// amounts it created before. It does not publish: members see nothing until the
// run is published from the Distributions page.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const { id } = await params;
  const run = await prisma.distribution.findUnique({ where: { id }, select: { id: true, periodLabel: true, status: true } });
  if (!run) return bad("Distribution not found.", 404);

  const lines = await prisma.distributionLine.findMany({
    where: { distributionId: id, rightHolder: { memberId: { not: null } } },
    select: { amount: true, work: { select: { title: true } }, rightHolder: { select: { memberId: true } } },
  });

  const byMember = new Map<string, { amount: number; works: Map<string, number> }>();
  for (const l of lines) {
    const m = l.rightHolder?.memberId;
    if (!m) continue;
    const e = byMember.get(m) ?? { amount: 0, works: new Map<string, number>() };
    e.amount += l.amount;
    const t = l.work?.title ?? "Unlisted work";
    e.works.set(t, (e.works.get(t) ?? 0) + l.amount);
    byMember.set(m, e);
  }

  let written = 0;
  for (const [ownerId, e] of byMember) {
    const top = [...e.works.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([title, amount]) => ({ title, plays: 0, amount: Math.round(amount * 100) / 100 }));
    const data = { amount: Math.round(e.amount * 100) / 100, topSongs: JSON.stringify(top) };
    await prisma.distributionEntry.upsert({
      where: { distributionId_ownerId: { distributionId: id, ownerId } },
      create: { distributionId: id, ownerId, ...data },
      update: data,
    });
    written++;
  }
  await logAudit(session.sub, "distribution.entries", { targetType: "Distribution", targetId: id, summary: `${run.periodLabel}: payouts prepared for ${written} member(s)` });
  return json({ ok: true, members: written, status: run.status });
}
