import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { applicationDTO } from "@/lib/serialize";
import { notifyMember } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { issueMemberDocuments, IssueError } from "@/lib/issueDocuments";
import { ADMIN_FIELDS } from "@/lib/applicationForms";

export const runtime = "nodejs";

// Membership applications for the staff console — all of them, or one member's.
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const ownerId = new URL(req.url).searchParams.get("ownerId");
  const applications = await prisma.membershipApplication.findMany({
    where: ownerId ? { ownerId } : undefined,
    orderBy: { updatedAt: "desc" },
  });
  return json({ applications: applications.map(applicationDTO) });
}

// Save the staff-only ("for official use") fields on an application.
export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (!b?.ownerId || typeof b.adminFields !== "object" || b.adminFields === null) {
    return bad("Invalid request body.");
  }
  const allowed = new Set(ADMIN_FIELDS.map((f) => f.key));
  const adminFields: Record<string, string> = {};
  for (const [k, v] of Object.entries(b.adminFields as Record<string, unknown>)) {
    if (allowed.has(k)) adminFields[k] = String(v ?? "");
  }

  const application = await prisma.membershipApplication
    .update({ where: { ownerId: b.ownerId }, data: { adminFields: JSON.stringify(adminFields) } })
    .catch(() => null);
  if (!application) return bad("Application not found.", 404);

  return json({ application: applicationDTO(application) });
}

// Decide an application:
//   approve    — counter-sign & issue the document set, activate the membership
//   reject     — decline with a reason; the member can correct and resubmit
//   regenerate — re-issue the documents of an approved member (e.g. after an
//                official signature was replaced)
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (!b?.ownerId || !["approve", "reject", "regenerate"].includes(b.action)) {
    return bad("Invalid request body.");
  }
  const { ownerId, action } = b;

  const member = await prisma.member.findUnique({ where: { id: ownerId } });
  if (!member) return bad("Member not found.", 404);
  const application = await prisma.membershipApplication.findUnique({ where: { ownerId } });
  if (!application) return bad("This member has not completed a membership application.", 404);

  if (action === "reject") {
    if (application.status !== "Submitted") return bad("Only a submitted application can be rejected.");
    const reason = String(b.reason ?? "").trim();
    const updated = await prisma.membershipApplication.update({
      where: { ownerId },
      data: { status: "Rejected", rejectionReason: reason, decidedAt: new Date() },
    });
    await prisma.member.update({ where: { id: ownerId }, data: { membershipStatus: "Rejected" } });
    await notifyMember(ownerId, {
      title: "Membership application declined",
      body: reason
        ? `Your ZAMCOPS membership application was not approved: ${reason}. You can update and resubmit it from the Membership page.`
        : "Your ZAMCOPS membership application was not approved. You can update and resubmit it from the Membership page.",
      type: "warning",
    });
    await logAudit(session.sub, "application.rejected", {
      targetType: "MembershipApplication",
      targetId: updated.id,
      summary: `Rejected ${member.fullName} (${member.memberNumber})${reason ? ` — ${reason}` : ""}`,
    });
    return json({ application: applicationDTO(updated) });
  }

  if (action === "approve" && application.status !== "Submitted") {
    return bad("Only a submitted application can be approved.");
  }
  if (action === "regenerate" && application.status !== "Approved") {
    return bad("Documents can only be regenerated for an approved application.");
  }

  const membershipClass =
    String(b.membershipClass ?? "").trim() || application.membershipClass || "CANDIDATE";

  // Persist the class before generation so the admission letter carries it.
  await prisma.membershipApplication.update({
    where: { ownerId },
    data: { membershipClass },
  });

  try {
    await issueMemberDocuments(ownerId);
  } catch (e) {
    if (e instanceof IssueError) return bad(e.message);
    console.error("[applications] document issuance failed:", e);
    return bad("Could not generate the documents. Please try again.", 500);
  }

  const updated = await prisma.membershipApplication.update({
    where: { ownerId },
    data:
      action === "approve"
        ? { status: "Approved", rejectionReason: "", decidedAt: new Date() }
        : {},
  });

  if (action === "approve") {
    await prisma.member.update({ where: { id: ownerId }, data: { membershipStatus: "Active" } });
    await notifyMember(ownerId, {
      title: "Membership approved",
      body: `Congratulations — you have been admitted as a ${membershipClass.toUpperCase()} member of ZAMCOPS. Your signed application, Deed of Assignment and admission letter are ready to download under My Documents.`,
      type: "success",
    });
  } else {
    await notifyMember(ownerId, {
      title: "Your documents were re-issued",
      body: "ZAMCOPS re-issued your official membership documents. The latest copies are available under My Documents.",
      type: "info",
    });
  }

  await logAudit(session.sub, action === "approve" ? "application.approved" : "application.regenerated", {
    targetType: "MembershipApplication",
    targetId: updated.id,
    summary: `${action === "approve" ? "Approved" : "Re-issued documents for"} ${member.fullName} (${member.memberNumber}) as ${membershipClass.toUpperCase()}`,
  });

  return json({ application: applicationDTO(updated) });
}
