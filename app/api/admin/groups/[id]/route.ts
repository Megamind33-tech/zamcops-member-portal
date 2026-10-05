import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { GROUP_KINDS } from "../route";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const g = await prisma.rightHolderGroup.findUnique({
    where: { id },
    include: {
      members: {
        orderBy: { displayName: "asc" },
        include: { rightHolder: { select: { id: true, displayName: true, ipiNumber: true, member: { select: { id: true, memberNumber: true } } } } },
      },
    },
  });
  if (!g) return bad("Group not found.", 404);
  return json({
    group: {
      id: g.id,
      name: g.name,
      code: g.code,
      kind: g.kind,
      status: g.status,
      description: g.description,
      notes: g.notes,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    },
    members: g.members.map((m) => ({
      id: m.id,
      rightHolderId: m.rightHolderId,
      displayName: m.rightHolder?.displayName || m.displayName,
      ipiNumber: m.rightHolder?.ipiNumber ?? "",
      memberId: m.rightHolder?.member?.id ?? null,
      memberNumber: m.rightHolder?.member?.memberNumber ?? "",
      role: m.role,
      sharePct: m.sharePct,
      notes: m.notes,
    })),
  });
}

type MemberIn = { rightHolderId?: string | null; displayName?: string; role?: string; sharePct?: number | string; notes?: string };

// Edit the group's particulars and/or replace its member list (sent complete).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return bad("Invalid request body.");
  const existing = await prisma.rightHolderGroup.findUnique({ where: { id } });
  if (!existing) return bad("Group not found.", 404);

  const data: Record<string, string> = {};
  if (b.name !== undefined) {
    const n = String(b.name).trim();
    if (!n) return bad("A group needs a name.");
    data.name = n.slice(0, 200);
  }
  if (b.kind !== undefined) {
    if (!GROUP_KINDS.includes(b.kind)) return bad("Unknown group type.");
    data.kind = b.kind;
  }
  if (b.status !== undefined) {
    if (!["Active", "Inactive"].includes(b.status)) return bad("Status must be Active or Inactive.");
    data.status = b.status;
  }
  if (b.code !== undefined) data.code = String(b.code).trim().slice(0, 40);
  if (b.description !== undefined) data.description = String(b.description).slice(0, 2000);
  if (b.notes !== undefined) data.notes = String(b.notes).slice(0, 4000);

  let members: { rightHolderId: string | null; displayName: string; role: string; sharePct: number; notes: string }[] | null = null;
  if (b.members !== undefined) {
    if (!Array.isArray(b.members)) return bad("Members must be a list.");
    members = [];
    for (const m of b.members as MemberIn[]) {
      const pct = Number(m.sharePct ?? 0);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) return bad("A member's share must be between 0 and 100.");
      const displayName = String(m.displayName ?? "").trim().slice(0, 200);
      if (!m.rightHolderId && !displayName) return bad("Every member needs a name or a right-holder from the register.");
      members.push({
        rightHolderId: m.rightHolderId || null,
        displayName,
        role: String(m.role ?? "").trim().slice(0, 60),
        sharePct: Math.round(pct * 100) / 100,
        notes: String(m.notes ?? "").slice(0, 500),
      });
    }
    const total = members.reduce((s, m) => s + m.sharePct, 0);
    if (total > 100.01) return bad(`Member shares total ${Math.round(total * 100) / 100}% — they can't be more than 100%.`);
    const ids = [...new Set(members.map((m) => m.rightHolderId).filter((x): x is string => !!x))];
    if (ids.length) {
      const found = await prisma.rightHolder.count({ where: { id: { in: ids } } });
      if (found !== ids.length) return bad("One of the chosen right-holders no longer exists.");
    }
  }
  if (Object.keys(data).length === 0 && members === null) return bad("Nothing to update.");

  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length) await tx.rightHolderGroup.update({ where: { id }, data });
    if (members !== null) {
      await tx.rightHolderGroupMember.deleteMany({ where: { groupId: id } });
      await tx.rightHolderGroupMember.createMany({ data: members.map((m) => ({ ...m, groupId: id })) });
    }
  });
  await logAudit(session.sub, "group.updated", {
    targetType: "Group",
    targetId: id,
    summary: `Edited group “${data.name ?? existing.name}”${members !== null ? ` (${members.length} members)` : ""}`,
  });
  return json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const g = await prisma.rightHolderGroup.findUnique({ where: { id }, select: { name: true } });
  if (!g) return bad("Group not found.", 404);
  await prisma.rightHolderGroup.delete({ where: { id } });
  await logAudit(session.sub, "group.deleted", { targetType: "Group", targetId: id, summary: `Deleted group “${g.name}”` });
  return json({ ok: true });
}
