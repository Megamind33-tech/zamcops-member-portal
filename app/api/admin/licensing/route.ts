import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { licenseRequestDTO } from "@/lib/serialize";

export const runtime = "nodejs";

const STATUSES = ["Submitted", "In review", "Offer sent", "Accepted", "Declined"];

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

  await prisma.notification.create({
    data: {
      ownerId: row.ownerId,
      title: "Licensing enquiry update",
      body: `An enquiry for “${row.work.workTitle}” from ${row.requesterCompany || row.requesterName} is now “${row.status}”.`,
      type: row.status === "Accepted" ? "success" : row.status === "Declined" ? "warning" : "info",
    },
  });

  return json({ request: licenseRequestDTO(row) });
}
