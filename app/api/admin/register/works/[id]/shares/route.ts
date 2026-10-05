import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

type ShareIn = {
  id?: string;
  rightHolderId?: string;
  roleCode?: string;
  rightType?: string;
  share?: number;
  territoryFormula?: string;
  isPublisher?: boolean;
};

// Edit the ownership view of a work in one request:
//   { upsert: [{ id?, rightHolderId, roleCode, rightType, share, territoryFormula, isPublisher }], remove: [id] }
// A row with an id is updated; one without is added. Everything is validated
// first and applied together, so a bad row leaves the work untouched.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return bad("Invalid request body.");

  const work = await prisma.registryWork.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!work) return bad("Work not found.", 404);

  const upsert: ShareIn[] = Array.isArray(b.upsert) ? b.upsert : [];
  const remove: string[] = Array.isArray(b.remove) ? b.remove.map(String) : [];
  if (upsert.length + remove.length === 0) return json({ ok: true });
  if (upsert.length + remove.length > 200) return bad("Too many changes at once.");

  const existing = await prisma.workShare.findMany({ where: { workId: id }, select: { id: true } });
  const mine = new Set(existing.map((s) => s.id));
  if (remove.some((r) => !mine.has(r))) return bad("A share to remove does not belong to this work.");

  const holderIds = [...new Set(upsert.map((s) => s.rightHolderId).filter(Boolean) as string[])];
  const holders = await prisma.rightHolder.findMany({ where: { id: { in: holderIds } }, select: { id: true } });
  const known = new Set(holders.map((h) => h.id));

  const rows = [];
  for (const s of upsert) {
    if (s.id && !mine.has(s.id)) return bad("A share to update does not belong to this work.");
    if (!s.rightHolderId || !known.has(s.rightHolderId)) return bad("Every share needs a right-holder from the register.");
    const share = Number(s.share);
    if (!Number.isFinite(share) || share < 0 || share > 1000) return bad("A share must be a number from 0 upwards.");
    const roleCode = String(s.roleCode ?? "").trim().toUpperCase().slice(0, 10);
    if (!roleCode) return bad("Every share needs a role (for example CA, A, C or E).");
    rows.push({
      id: s.id,
      rightHolderId: s.rightHolderId,
      roleCode,
      rightType: String(s.rightType ?? "").trim().slice(0, 20),
      share,
      territoryFormula: String(s.territoryFormula ?? "").trim().slice(0, 120),
      isPublisher: !!s.isPublisher,
    });
  }

  await prisma.$transaction([
    ...(remove.length ? [prisma.workShare.deleteMany({ where: { workId: id, id: { in: remove } } })] : []),
    ...rows.map((r) =>
      r.id
        ? prisma.workShare.update({ where: { id: r.id }, data: { rightHolderId: r.rightHolderId, roleCode: r.roleCode, rightType: r.rightType, share: r.share, territoryFormula: r.territoryFormula, isPublisher: r.isPublisher } })
        : prisma.workShare.create({ data: { workId: id, rightHolderId: r.rightHolderId, roleCode: r.roleCode, rightType: r.rightType, share: r.share, territoryFormula: r.territoryFormula, isPublisher: r.isPublisher } }),
    ),
    prisma.registryWork.update({ where: { id }, data: { editedAt: new Date() } }),
  ]);
  await logAudit(session.sub, "registry.work.shares", {
    targetType: "RegistryWork",
    targetId: id,
    summary: `${work.title}: ${rows.filter((r) => r.id).length} share(s) updated, ${rows.filter((r) => !r.id).length} added, ${remove.length} removed`,
  });
  return json({ ok: true });
}
