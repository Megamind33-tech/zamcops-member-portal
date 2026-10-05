import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

// Work sets — named, reusable lists of works that can be added to a pool link
// in one go (WIPO Connect "Set" under Works).
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  const sets = await prisma.workSet.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } } },
  });
  return json({ sets: sets.map((s) => ({ id: s.id, name: s.name, description: s.description, works: s._count.items, updatedAt: s.updatedAt })) });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const b = await req.json().catch(() => null);
  const name = String(b?.name ?? "").trim().slice(0, 120);
  if (!name) return bad("Give the work set a name.");
  if (await prisma.workSet.findUnique({ where: { name } })) return bad(`A work set called “${name}” already exists.`, 409);
  const s = await prisma.workSet.create({ data: { name, description: String(b?.description ?? "").slice(0, 500) } });
  await logAudit(session.sub, "work-set.created", { targetType: "Work set", targetId: s.id, summary: `Created work set “${name}”` });
  return json({ id: s.id }, 201);
}
