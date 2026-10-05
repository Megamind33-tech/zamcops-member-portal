import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit, diffFields } from "@/lib/audit";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return bad("Invalid request body.");
  const existing = await prisma.broadcastStation.findUnique({ where: { id } });
  if (!existing) return bad("Station not found.", 404);

  const data: Record<string, string | boolean> = {};
  if (b.name !== undefined) {
    const n = String(b.name).trim();
    if (!n) return bad("A station needs a name.");
    data.name = n.slice(0, 200);
  }
  if (b.kind !== undefined) {
    if (!["Radio", "Television", "Live performance", "Online", "Other"].includes(b.kind)) return bad("Unknown station type.");
    data.kind = b.kind;
  }
  for (const [k, max] of [["code", 40], ["region", 80], ["notes", 2000]] as const) if (b[k] !== undefined) data[k] = String(b[k]).trim().slice(0, max);
  if (b.active !== undefined) data.active = !!b.active;
  if (!Object.keys(data).length) return bad("Nothing to update.");

  await prisma.broadcastStation.update({ where: { id }, data });
  // keep the label on existing pool links in step
  if (typeof data.name === "string" || typeof data.kind === "string") {
    await prisma.distributionPoolLink.updateMany({
      where: { stationId: id },
      data: { ...(data.name ? { stationName: data.name as string } : {}), ...(data.kind ? { kind: data.kind as string } : {}) },
    });
  }
  await logAudit(session.sub, "station.updated", {
    targetType: "Station",
    targetId: id,
    summary: `Edited station “${(data.name as string) ?? existing.name}”`,
    changes: diffFields(existing as unknown as Record<string, unknown>, data, { name: "Name", kind: "Type", code: "Code", region: "Region", notes: "Notes", active: "Active" }),
  });
  return json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const s = await prisma.broadcastStation.findUnique({ where: { id }, include: { _count: { select: { links: true } } } });
  if (!s) return bad("Station not found.", 404);
  if (s._count.links > 0) return bad(`“${s.name}” is used in ${s._count.links} distribution pool link${s._count.links === 1 ? "" : "s"}. Mark it inactive instead of deleting it.`, 409);
  await prisma.broadcastStation.delete({ where: { id } });
  await logAudit(session.sub, "station.deleted", { targetType: "Station", targetId: id, summary: `Deleted station “${s.name}”` });
  return json({ ok: true });
}
