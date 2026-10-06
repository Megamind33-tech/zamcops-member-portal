import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { readAgreement, isActive, AGREEMENT_TYPES, AGREEMENT_STATUSES, RIGHT_CATEGORIES, SOURCE_TYPES } from "@/lib/agreementFields";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const PAGE_SIZE = 50;

// WIPO Connect Agreements and Mandates search.
//   ?identifier=(code) &statusCode= &fkType= &includeInactive=1 &assignorName= &assigneeName= &rightTypeCode= &page=
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "AGREEMENT_ACCESS"))) return bad("You do not have the Agreement (Access) permission.", 403);
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const contains = (v: string) => ({ contains: v, mode: "insensitive" as const });
  const where: Prisma.AgreementWhereInput = {};
  const code = (sp.get("identifier") ?? "").trim();
  if (code) where.code = contains(code);
  if (sp.get("fkType")) where.type = sp.get("fkType")!;
  if ((sp.get("assignorName") ?? "").trim()) where.assignorName = contains(sp.get("assignorName")!.trim());
  if ((sp.get("assigneeName") ?? "").trim()) where.assigneeName = contains(sp.get("assigneeName")!.trim());
  if (sp.get("rightTypeCode")) where.rightTypes = { array_contains: sp.get("rightTypeCode")! };

  // Unless "Include Inactive" is ticked (or a status is chosen) only agreements in force today are listed.
  const today = new Date().toISOString().slice(0, 10);
  if (sp.get("statusCode")) where.status = sp.get("statusCode")!;
  else if (!sp.get("includeInactive")) {
    where.status = "Valid";
    where.AND = [{ OR: [{ effectiveStart: "" }, { effectiveStart: { lte: today } }] }, { OR: [{ effectiveEnd: "" }, { effectiveEnd: { gte: today } }] }];
  }

  const [total, rows] = await Promise.all([
    prisma.agreement.count({ where }),
    prisma.agreement.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { _count: { select: { works: { where: { excluded: false } } } } } }),
  ]);
  return json({
    page,
    pageSize: PAGE_SIZE,
    total,
    canManage: await hasPermission(session.sub, "AGREEMENT_MGMT"),
    options: { types: AGREEMENT_TYPES, statuses: AGREEMENT_STATUSES, rightCategories: RIGHT_CATEGORIES, sourceTypes: SOURCE_TYPES },
    rows: rows.map((a) => ({
      id: a.id,
      code: a.code,
      assignor: a.assignorName,
      assignee: a.assigneeName,
      type: a.type,
      creationClass: a.creationClass,
      works: a._count.works,
      territory: a.territory,
      rightTypes: a.rightTypes as string[],
      effectiveEnd: a.effectiveEnd,
      status: a.status,
      active: isActive(a),
    })),
  });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "AGREEMENT_MGMT"))) return bad("You do not have the Agreement (Management) permission.", 403);
  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request.");
  const f = readAgreement(b);
  if ("error" in f) return bad(f.error);
  if (await prisma.agreement.findFirst({ where: { code: f.code, status: { not: "Deleted" } } })) return bad(`An agreement with code ${f.code} already exists.`, 409);
  const a = await prisma.agreement.create({ data: { ...f, comments: [] } });
  await logAudit(session.sub, "agreement.created", { targetType: "Agreement", targetId: a.id, summary: `Created ${f.type.toLowerCase()} agreement ${f.code}: ${f.assignorName} → ${f.assigneeName}` });
  return json({ id: a.id }, 201);
}
