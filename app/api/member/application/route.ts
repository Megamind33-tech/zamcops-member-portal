import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { applicationDTO } from "@/lib/serialize";
import { FORM_DEFS, FORM_TYPES, missingRequiredFields, type ApplicationFormType } from "@/lib/applicationForms";

export const runtime = "nodejs";

const MAX_PAYLOAD = 200 * 1024; // JSON answers — generous for text-only forms

// The member's own application, plus their stored signature for preview.
export async function GET() {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const [application, member] = await Promise.all([
    prisma.membershipApplication.findUnique({ where: { ownerId: session.sub } }),
    prisma.member.findUnique({ where: { id: session.sub }, select: { signature: true, membershipStatus: true } }),
  ]);

  return json({
    application: application ? applicationDTO(application) : null,
    signature: member?.signature || "",
    membershipStatus: member?.membershipStatus || "Pending",
  });
}

function validBody(b: Record<string, unknown> | null): { formType: ApplicationFormType; payload: Record<string, unknown> } | null {
  if (!b) return null;
  const formType = b.formType as ApplicationFormType;
  if (!FORM_TYPES.includes(formType)) return null;
  const payload = b.payload;
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return null;
  if (JSON.stringify(payload).length > MAX_PAYLOAD) return null;
  return { formType, payload: payload as Record<string, unknown> };
}

// Save the application as a draft. A rejected application reopens as a draft
// so the member can correct and resubmit.
export async function PUT(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const body = validBody(await req.json().catch(() => null));
  if (!body) return bad("Invalid application payload.");

  const existing = await prisma.membershipApplication.findUnique({ where: { ownerId: session.sub } });
  if (existing && (existing.status === "Submitted" || existing.status === "Approved")) {
    return bad("Your application has already been submitted and can no longer be edited.");
  }

  const data = {
    formType: body.formType,
    payload: JSON.stringify(body.payload),
    status: "Draft",
    rejectionReason: "",
  };
  const application = existing
    ? await prisma.membershipApplication.update({ where: { ownerId: session.sub }, data })
    : await prisma.membershipApplication.create({ data: { ownerId: session.sub, ...data } });

  return json({ application: applicationDTO(application) });
}

// Submit the application for review. Requires every mandatory field, the
// member's stored signature, and an executed Deed of Assignment.
export async function POST(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const raw = await req.json().catch(() => null);
  const body = validBody(raw);
  if (!body) return bad("Invalid application payload.");
  if (raw?.deedAgreed !== true) {
    return bad("You must read and execute the Deed of Assignment before submitting.");
  }

  const member = await prisma.member.findUnique({ where: { id: session.sub } });
  if (!member) return bad("Not authenticated.", 401);
  if (!member.emailVerifiedAt) {
    return bad("Please verify your email address before submitting — check your inbox for the code.");
  }
  if (!member.signature) return bad("Please add your signature before submitting.");

  const missing = missingRequiredFields(FORM_DEFS[body.formType], body.payload);
  if (missing.length > 0) {
    return bad(`Please complete the required fields: ${missing.slice(0, 5).join("; ")}${missing.length > 5 ? "…" : ""}`);
  }

  const existing = await prisma.membershipApplication.findUnique({ where: { ownerId: session.sub } });
  if (existing && (existing.status === "Submitted" || existing.status === "Approved")) {
    return bad("Your application has already been submitted.");
  }

  const now = new Date();
  const data = {
    formType: body.formType,
    payload: JSON.stringify(body.payload),
    status: "Submitted",
    rejectionReason: "",
    deedAgreedAt: now,
    submittedAt: now,
  };
  const application = existing
    ? await prisma.membershipApplication.update({ where: { ownerId: session.sub }, data })
    : await prisma.membershipApplication.create({ data: { ownerId: session.sub, ...data } });

  return json({ application: applicationDTO(application) });
}
