import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { notifyMember } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { issueWorkDocuments, IssueError } from "@/lib/issueDocuments";

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
  let workApproved = false;
  if (kind === "work") {
    const row = await prisma.workDeclaration.update({ where: { id }, data });
    ownerId = row.ownerId; title = row.title;
    workApproved = status === "Approved";
  } else if (kind === "single") {
    const row = await prisma.songSubmission.update({ where: { id }, data });
    ownerId = row.ownerId; title = row.title;
  } else {
    const row = await prisma.albumSubmission.update({ where: { id }, data });
    ownerId = row.ownerId; title = row.title;
  }

  const label = LABELS[kind];

  // Approving a work enters it in the register, so the member's signed
  // Declaration of a Musical Work and the counter-signed Certificate of
  // Registration are issued onto their file. A missing signature is the usual
  // cause of failure and is worth reporting; the work stays approved either
  // way, and staff can re-issue from the member's record once it is fixed.
  let documentWarning = "";
  if (workApproved) {
    try {
      await issueWorkDocuments(id);
    } catch (e) {
      documentWarning =
        e instanceof IssueError
          ? `${label} approved, but its documents were not issued: ${e.message}`
          : `${label} approved, but its documents could not be generated.`;
      if (!(e instanceof IssueError)) console.error("[review] work document issuance failed:", e);
    }
  }

  if (ownerId && (status === "Approved" || status === "Rejected")) {
    await notifyMember(ownerId, {
      title: `${label} ${status.toLowerCase()}`,
      body:
        status === "Rejected"
          ? `Your ${label.toLowerCase()} “${title}” was rejected${reason ? `: ${reason}` : "."}`
          : workApproved && !documentWarning
            ? `“${title}” is now entered in the ZAMCOPS register of works. Your signed declaration and certificate of registration are ready under My Documents.`
            : `Your ${label.toLowerCase()} “${title}” has been ${status.toLowerCase()}.`,
      type: status === "Approved" ? "success" : "warning",
      href: workApproved && !documentWarning ? "/documents" : "/works",
    });
  }

  await logAudit(session.sub, `review.${status.toLowerCase().replace(" ", "-")}`, {
    targetType: label,
    targetId: id,
    summary: `${label} “${title}” → ${status}${reason ? ` (${reason})` : ""}`,
  });

  return json({ ok: true, warning: documentWarning || undefined });
}

// Re-issues the documents of a work already in the register — used after the
// member supplies a missing signature, after a new Board Secretary signature is
// uploaded, or after staff amend the particulars of a registered work.
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  const id = b?.id ? String(b.id) : "";
  if (!id || b?.kind !== "work") return bad("A work id is required.");
  if (b?.action !== "reissue") return bad("Unknown action.");

  const work = await prisma.workDeclaration.findUnique({ where: { id } });
  if (!work) return bad("Work not found.", 404);
  if (work.status !== "Approved") return bad("Only a registered work has documents to re-issue.");

  try {
    await issueWorkDocuments(id);
  } catch (e) {
    if (e instanceof IssueError) return bad(e.message);
    console.error("[review] work document re-issue failed:", e);
    return bad("Could not generate the documents. Please try again.", 500);
  }

  await notifyMember(work.ownerId, {
    title: "Work documents re-issued",
    body: `ZAMCOPS re-issued the declaration and certificate of registration for “${work.title}”. The latest copies are under My Documents.`,
    type: "info",
    href: "/documents",
  });

  await logAudit(session.sub, "review.documents-reissued", {
    targetType: LABELS.work,
    targetId: id,
    summary: `Re-issued documents for work “${work.title}”`,
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
