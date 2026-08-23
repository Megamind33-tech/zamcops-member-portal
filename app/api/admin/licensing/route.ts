import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { licenseRequestDTO } from "@/lib/serialize";
import { notifyMember } from "@/lib/notify";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const STATUSES = ["Submitted", "In review", "Offer sent", "Accepted", "Declined"];
const USAGE_TYPES = ["Film & TV", "Advertising", "Online content", "Live events", "Other"];

// Logs an inbound licensing enquiry against a listed work. Businesses reach
// ZAMCOPS by phone/email, so staff capture the enquiry here; the member is
// notified that someone wants to license their work.
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request body.");
  if (!b.workId) return bad("Choose the listed work being enquired about.");
  if (!b.requesterName?.trim()) return bad("Enter the requester's name.");
  if (!b.requesterEmail?.trim()) return bad("Enter the requester's email.");
  if (!USAGE_TYPES.includes(b.usageType)) return bad("Pick a usage type.");

  const work = await prisma.licensableWork.findUnique({ where: { id: b.workId } });
  if (!work) return bad("Listed work not found.", 404);

  const row = await prisma.licenseRequest.create({
    data: {
      workId: work.id,
      ownerId: work.ownerId,
      requesterName: String(b.requesterName).trim(),
      requesterCompany: String(b.requesterCompany ?? "").trim(),
      requesterEmail: String(b.requesterEmail).trim(),
      usageType: b.usageType,
      description: String(b.description ?? "").trim(),
      proposedFee: b.proposedFee != null && b.proposedFee !== "" ? Number(b.proposedFee) : null,
    },
  });

  await notifyMember(work.ownerId, {
    title: "New licensing enquiry",
    body: `${row.requesterCompany || row.requesterName} enquired about licensing “${work.workTitle}” (${row.usageType}). ZAMCOPS is handling the negotiation.`,
    type: "info",
    href: "/notifications",
  });

  await logAudit(session.sub, "licensing.enquiry-logged", {
    targetType: "LicenseRequest",
    targetId: row.id,
    summary: `Logged enquiry from ${row.requesterCompany || row.requesterName} for “${work.workTitle}”`,
  });

  return json({ request: licenseRequestDTO(row) }, 201);
}

// Moves an inbound licensing enquiry through the desk's pipeline — optionally
// recording the negotiated proposed/facilitation fees — and notifies the member.
export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (!b?.id || !STATUSES.includes(b.status)) return bad("Invalid licensing payload.");

  const data: Record<string, unknown> = { status: b.status };
  if (b.proposedFee != null && b.proposedFee !== "") data.proposedFee = Number(b.proposedFee);
  if (b.facilitationFee != null && b.facilitationFee !== "") data.facilitationFee = Number(b.facilitationFee);

  const row = await prisma.licenseRequest.update({
    where: { id: b.id },
    data,
    include: { work: true },
  });

  await notifyMember(row.ownerId, {
    title: "Licensing enquiry update",
    body: `An enquiry for “${row.work.workTitle}” from ${row.requesterCompany || row.requesterName} is now “${row.status}”.`,
    type: row.status === "Accepted" ? "success" : row.status === "Declined" ? "warning" : "info",
    href: "/notifications",
  });

  await logAudit(session.sub, "licensing.status", {
    targetType: "LicenseRequest",
    targetId: row.id,
    summary: `Enquiry for “${row.work.workTitle}” → ${row.status}`,
  });

  return json({ request: licenseRequestDTO(row) });
}
