import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";

export const runtime = "nodejs";

const STATUSES = ["Pending", "Under Review", "Approved", "Rejected"];

// Updates the review status of a work / single / album and notifies the member.
export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request body.");
  const { kind, id, status } = b;
  if (!id || !STATUSES.includes(status)) return bad("Invalid review payload.");

  let ownerId: string | null = null;
  let title = "";
  let label = "";

  if (kind === "work") {
    const row = await prisma.workDeclaration.update({ where: { id }, data: { status } });
    ownerId = row.ownerId; title = row.title; label = "Work declaration";
  } else if (kind === "single") {
    const row = await prisma.songSubmission.update({ where: { id }, data: { status } });
    ownerId = row.ownerId; title = row.title; label = "Single";
  } else if (kind === "album") {
    const row = await prisma.albumSubmission.update({ where: { id }, data: { status } });
    ownerId = row.ownerId; title = row.title; label = "Album";
  } else {
    return bad("Unknown review kind.");
  }

  if (ownerId && (status === "Approved" || status === "Rejected")) {
    await prisma.notification.create({
      data: {
        ownerId,
        title: `${label} ${status.toLowerCase()}`,
        body: `Your ${label.toLowerCase()} “${title}” has been ${status.toLowerCase()}.`,
        type: status === "Approved" ? "success" : "warning",
      },
    });
  }

  return json({ ok: true });
}

// Staff may delete any submission outright (including registered/Approved ones).
export async function DELETE(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request body.");
  const { kind, id } = b;
  if (!id) return bad("A submission id is required.");

  if (kind === "work") await prisma.workDeclaration.delete({ where: { id } });
  else if (kind === "single") await prisma.songSubmission.delete({ where: { id } });
  else if (kind === "album") await prisma.albumSubmission.delete({ where: { id } });
  else return bad("Unknown review kind.");

  return json({ ok: true });
}
