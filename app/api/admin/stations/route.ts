import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

// Radio / TV stations (and other places music is reported from). ?q= ?kind= ?active=
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const kind = url.searchParams.get("kind") ?? "";
  const active = url.searchParams.get("active");
  const where: Prisma.BroadcastStationWhereInput = {
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }, { region: { contains: q, mode: "insensitive" } }] } : {}),
    ...(kind ? { kind } : {}),
    ...(active === "1" ? { active: true } : active === "0" ? { active: false } : {}),
  };
  const stations = await prisma.broadcastStation.findMany({ where, orderBy: [{ kind: "asc" }, { name: "asc" }], take: 1000, include: { _count: { select: { links: true } } } });
  return json({
    stations: stations.map((s) => ({ id: s.id, name: s.name, kind: s.kind, code: s.code, region: s.region, notes: s.notes, active: s.active, links: s._count.links })),
  });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const b = await req.json().catch(() => null);
  const name = String(b?.name ?? "").trim();
  if (!name) return bad("Give the station a name.");
  const kind = ["Radio", "Television", "Live performance", "Online", "Other"].includes(b?.kind) ? (b.kind as string) : "Radio";
  const dup = await prisma.broadcastStation.findFirst({ where: { name: { equals: name, mode: "insensitive" }, kind } });
  if (dup) return bad(`${kind} station “${dup.name}” already exists.`, 409);
  const s = await prisma.broadcastStation.create({
    data: { name: name.slice(0, 200), kind, code: String(b?.code ?? "").trim().slice(0, 40), region: String(b?.region ?? "").trim().slice(0, 80), notes: String(b?.notes ?? "").slice(0, 2000) },
  });
  await logAudit(session.sub, "station.created", { targetType: "Station", targetId: s.id, summary: `Added ${kind.toLowerCase()} station “${s.name}”` });
  return json({ id: s.id }, 201);
}
