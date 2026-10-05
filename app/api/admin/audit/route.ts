import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";

export const runtime = "nodejs";

const PAGE_SIZE = 25;

// The staff activity trail, newest first.
//   (no params)   the latest 300 entries — the Team & Activity feed
//   ?targetType=&targetId=   one record's history (its Audit tab), paged: ?page=
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const url = new URL(req.url);
  const targetType = url.searchParams.get("targetType");
  const targetId = url.searchParams.get("targetId");

  if (targetType && targetId) {
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const where = { targetType, targetId };
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    ]);
    return json({ page, pageSize: PAGE_SIZE, total, logs });
  }

  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 300 });
  return json({ logs });
}
