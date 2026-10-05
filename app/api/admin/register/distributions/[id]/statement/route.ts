import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";

export const runtime = "nodejs";

// The allocation lines behind one row of a run: everything one right owner
// received in it (?holder=), or everyone paid on one work (?work=).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const { id } = await params;
  const url = new URL(req.url);
  const holder = url.searchParams.get("holder");
  const work = url.searchParams.get("work");
  if (!holder && !work) return bad("Say whose statement: ?holder= or ?work=.");

  const lines = await prisma.distributionLine.findMany({
    where: { distributionId: id, ...(holder ? { rightHolderId: holder } : { workId: work }) },
    include: { work: { select: { id: true, title: true, iswc: true } }, rightHolder: { select: { id: true, displayName: true } } },
    orderBy: { amount: "desc" },
    take: 500,
  });
  return json({
    lines: lines.map((l) => ({
      id: l.id,
      work: l.work,
      rightHolder: l.rightHolder,
      roleCode: l.roleCode,
      rightType: l.rightType,
      amount: l.amount,
      total: l.total,
      adminFee: l.adminFee,
      reserved: l.reserved,
      disputed: l.disputed,
    })),
    truncated: lines.length === 500,
  });
}
