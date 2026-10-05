import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export const GROUP_KINDS = ["Group", "Band", "Ensemble", "Estate", "Publisher", "Other"];

// Groups of right-holders: searchable list (?q=, ?kind=, ?status=).
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const kind = url.searchParams.get("kind") ?? "";
  const status = url.searchParams.get("status") ?? "";

  const where: Prisma.RightHolderGroupWhereInput = {
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }, { members: { some: { displayName: { contains: q, mode: "insensitive" } } } }] } : {}),
    ...(kind ? { kind } : {}),
    ...(status ? { status } : {}),
  };
  const groups = await prisma.rightHolderGroup.findMany({
    where,
    orderBy: { name: "asc" },
    take: 500,
    include: { _count: { select: { members: true } } },
  });
  return json({
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      code: g.code,
      kind: g.kind,
      status: g.status,
      description: g.description,
      memberCount: g._count.members,
      updatedAt: g.updatedAt,
    })),
  });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const b = await req.json().catch(() => null);
  const name = String(b?.name ?? "").trim();
  if (!name) return bad("Give the group a name.");
  const kind = GROUP_KINDS.includes(b?.kind) ? b.kind : "Group";
  const g = await prisma.rightHolderGroup.create({
    data: { name: name.slice(0, 200), kind, code: String(b?.code ?? "").trim().slice(0, 40), description: String(b?.description ?? "").slice(0, 2000) },
  });
  await logAudit(session.sub, "group.created", { targetType: "Group", targetId: g.id, summary: `Created group “${g.name}”` });
  return json({ id: g.id }, 201);
}
