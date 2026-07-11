import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { notifyMember } from "@/lib/notify";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const STATUSES = ["Pending", "Under Review", "Approved", "Rejected"];
const LABELS: Record<string, string> = { work: "Work declaration", single: "Single", album: "Album" };

// Updates the review status of a work / single / album and notifies the member.
// A rejection can carry a reason, which is stored on the record and included in
// the member's notification.
export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request body.");
  const { kind, id, status } = b;
  if (!id || !STATUSES.includes(status)) return bad("Invalid review payload.");
  if (!LABELS[kind]) return bad("Unknown review kind.");

  const reason = status === "Rejected" ? String(b.reason ?? "").trim().slice(0, 500) : "";
  const data = { status, rejectionReason: reason };

  let ownerId = "";
  let title = "";
  if (kind === "work") {
    const row = await prisma.workDeclaration.update({ where: { id }, data });
    ownerId = row.ownerId; title = row.title;
  } else if (kind === "single") {
    const row = await prisma.songSubmission.update({ where: { id }, data });
    ownerId = row.ownerId; title = row.title;
  } else {
    const row = await prisma.albumSubmission.update({ where: { id }, data });
    ownerId = row.ownerId; title = row.title;
  }

  const label = LABELS[kind];

  if (ownerId && (status === "Approved" || status === "Rejected")) {
    await notifyMember(ownerId, {
      title: `${label} ${status.toLowerCase()}`,
      body:
        status === "Rejected"
          ? `Your ${label.toLowerCase()} “${title}” was rejected${reason ? `: ${reason}` : "."}`
          : `Your ${label.toLowerCase()} “${title}” has been ${status.toLowerCase()}.`,
      type: status === "Approved" ? "success" : "warning",
    });
  }

  await logAudit(session.sub, `review.${status.toLowerCase().replace(" ", "-")}`, {
    targetType: label,
    targetId: id,
    summary: `${label} “${title}” → ${status}${reason ? ` (${reason})` : ""}`,
  });

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
  if (!LABELS[kind]) return bad("Unknown review kind.");

  let title = "";
  if (kind === "work") title = (await prisma.workDeclaration.delete({ where: { id } })).title;
  else if (kind === "single") title = (await prisma.songSubmission.delete({ where: { id } })).title;
  else title = (await prisma.albumSubmission.delete({ where: { id } })).title;

  await logAudit(session.sub, "review.deleted", {
    targetType: LABELS[kind],
    targetId: id,
    summary: `Deleted ${LABELS[kind].toLowerCase()} “${title}”`,
  });

  return json({ ok: true });
}
