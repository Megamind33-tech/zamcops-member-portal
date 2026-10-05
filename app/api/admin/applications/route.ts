import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { applicationDTO } from "@/lib/serialize";
import { notifyMember } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { issueMemberDocuments, IssueError, ADMISSION_CLASS } from "@/lib/issueDocuments";
import { ADMIN_FIELDS, FORM_DEFS, type ApplicationFormType } from "@/lib/applicationForms";

export const runtime = "nodejs";

// Membership applications for the staff console — all of them, or one member's.
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const sp = new URL(req.url).searchParams;
  const ownerId = sp.get("ownerId");
  const formType = sp.get("formType");
  const applications = await prisma.membershipApplication.findMany({
    where: { ...(ownerId ? { ownerId } : {}), ...(formType ? { formType } : {}) },
    orderBy: { updatedAt: "desc" },
    include: formType ? { owner: { select: { id: true, fullName: true, memberNumber: true } } } : undefined,
  });
  return json({
    applications: applications.map((a) => ({
      ...applicationDTO(a),
      ...("owner" in a && a.owner ? { owner: a.owner } : {}),
    })),
  });
}

// Save the staff-only ("for official use") fields and/or correct the
// applicant's answers (`payload`) — staff fix typos, complete the group's
// member list, and so on. Only keys the form defines are kept.
export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (!b?.ownerId) return bad("Invalid request body.");
  const hasAdmin = typeof b.adminFields === "object" && b.adminFields !== null;
  const hasPayload = typeof b.payload === "object" && b.payload !== null && !Array.isArray(b.payload);
  if (!hasAdmin && !hasPayload) return bad("Invalid request body.");

  const current = await prisma.membershipApplication.findUnique({ where: { ownerId: b.ownerId } });
  if (!current) return bad("Application not found.", 404);

  const data: { adminFields?: string; payload?: string } = {};

  if (hasAdmin) {
    const allowed = new Set(ADMIN_FIELDS.map((f) => f.key));
    const adminFields: Record<string, string> = {};
    for (const [k, v] of Object.entries(b.adminFields as Record<string, unknown>)) {
      if (allowed.has(k)) adminFields[k] = String(v ?? "");
    }
    data.adminFields = JSON.stringify(adminFields);
  }

  if (hasPayload) {
    const def = FORM_DEFS[current.formType as ApplicationFormType];
    if (!def) return bad("Unknown application form.");
    const incoming = b.payload as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    // keep any answer the form has no field for (older drafts) untouched
    try {
      Object.assign(next, JSON.parse(current.payload));
    } catch {
      /* start clean */
    }
    for (const section of def.sections) {
      for (const f of section.fields ?? []) {
        if (!(f.key in incoming)) continue;
        const v = incoming[f.key];
        next[f.key] = Array.isArray(v) ? v.map((x) => String(x).slice(0, 200)) : String(v ?? "").slice(0, 2000);
      }
      if (section.repeat && section.repeat.key in incoming) {
        const rows = incoming[section.repeat.key];
        if (!Array.isArray(rows)) return bad(`${section.repeat.label} must be a list.`);
        if (rows.length > 200) return bad(`${section.repeat.label} is too long.`);
        next[section.repeat.key] = rows
          .map((r) => {
            const out: Record<string, string> = {};
            for (const c of section.repeat!.columns) out[c.key] = String((r as Record<string, unknown>)?.[c.key] ?? "").trim().slice(0, 300);
            return out;
          })
          .filter((r) => Object.values(r).some(Boolean));
      }
    }
    data.payload = JSON.stringify(next);
  }

  const application = await prisma.membershipApplication.update({ where: { ownerId: b.ownerId }, data });
  if (hasPayload) {
    await logAudit(session.sub, "application.edited", {
      targetType: "MembershipApplication",
      targetId: application.id,
      summary: `Corrected the ${application.formType} application answers`,
    });
  }
  return json({ application: applicationDTO(application) });
}

// Decide an application:
//   reject     — decline with a reason; the member can correct and resubmit
//   regenerate — re-issue the documents of an admitted member (e.g. after an
//                official signature was replaced)
//
// There is deliberately no "approve". A person is admitted when the society
// accepts their first work onto the register, so approving that work is what
// approves the membership, in app/api/admin/review. An application on its own
// is not something that can be granted.
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (b?.action === "approve") {
    return bad(
      "Membership is granted by accepting the member's first work, not on its own. Approve a submitted work under Work Declarations and the application is approved with it.",
    );
  }
  if (!b?.ownerId || !["reject", "regenerate"].includes(b.action)) {
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
    href: "/application",
    });
    await logAudit(session.sub, "application.rejected", {
      targetType: "MembershipApplication",
      targetId: updated.id,
      summary: `Rejected ${member.fullName} (${member.memberNumber})${reason ? ` — ${reason}` : ""}`,
    });
    return json({ application: applicationDTO(updated) });
  }

  if (application.status !== "Approved") {
    return bad(
      "This member has not been admitted yet — their documents are issued when the society accepts their first work.",
    );
  }

  const membershipClass =
    String(b.membershipClass ?? "").trim() || application.membershipClass || ADMISSION_CLASS;

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

  const updated = await prisma.membershipApplication.findUniqueOrThrow({ where: { ownerId } });

  await notifyMember(ownerId, {
    title: "Your documents were re-issued",
    body: "ZAMCOPS re-issued your official membership documents. The latest copies are available under My Documents.",
    type: "info",
    href: "/documents",
  });

  await logAudit(session.sub, "application.regenerated", {
    targetType: "MembershipApplication",
    targetId: updated.id,
    summary: `Re-issued documents for ${member.fullName} (${member.memberNumber}) as ${membershipClass.toUpperCase()}`,
  });

  return json({ application: applicationDTO(updated) });
}
