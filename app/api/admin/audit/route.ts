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

  // WIPO Connect Audit search: ?search=1&entityType=&from=&to=&author=&mainId=&terminal=1&page=
  if (url.searchParams.get("search")) {
    const sp = url.searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const where: Record<string, unknown> = {};
    if (sp.get("entityType")) where.targetType = sp.get("entityType");
    if (sp.get("author")) where.adminId = sp.get("author");
    const range: Record<string, Date> = {};
    if (sp.get("from")) range.gte = new Date(sp.get("from") + "T00:00:00");
    if (sp.get("to")) range.lte = new Date(sp.get("to") + "T23:59:59.999");
    if (Object.keys(range).length) where.createdAt = range;
    const q = (sp.get("mainId") ?? "").trim();
    if (q) where.OR = [{ targetId: q }, { summary: { contains: q, mode: "insensitive" } }];
    const [admins, types] = await Promise.all([
      prisma.adminUser.findMany({ select: { id: true, email: true }, orderBy: { email: "asc" } }),
      prisma.auditLog.findMany({ distinct: ["targetType"], select: { targetType: true }, orderBy: { targetType: "asc" } }),
    ]);
    let rows = await prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 5000 });
    // "Show only Terminal": just the latest change of each record
    if (sp.get("terminal")) {
      const seen = new Set<string>();
      rows = rows.filter((r) => {
        if (!r.targetId) return true;
        const k = r.targetType + ":" + r.targetId;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }
    return json({ page, pageSize: PAGE_SIZE, total: rows.length, logs: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), authors: admins, entityTypes: types.map((t) => t.targetType).filter(Boolean) });
  }

  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 300 });
  return json({ logs });
}
