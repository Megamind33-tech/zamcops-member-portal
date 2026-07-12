import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { json, bad } from "@/lib/server";

export const runtime = "nodejs";

const MAX_IMAGE = 500 * 1024; // data URL length — a drawn/processed PNG is far smaller

// Stores (or replaces) the member's reusable signature — a transparent PNG
// produced client-side from a canvas drawing or a processed upload. It is
// applied to every document section that requires the member's signature.
export async function POST(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const b = await req.json().catch(() => null);
  const image = typeof b?.image === "string" ? b.image : "";
  if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(image)) {
    return bad("Signature must be a PNG or JPEG image.");
  }
  if (image.length > MAX_IMAGE) return bad("Signature image is too large — please use a smaller image.");

  await prisma.member.update({ where: { id: session.sub }, data: { signature: image } });
  return json({ ok: true });
}

// Removes the stored signature (e.g. to redo it) — only while no submitted or
// approved application depends on it.
export async function DELETE() {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const application = await prisma.membershipApplication.findUnique({ where: { ownerId: session.sub } });
  if (application && (application.status === "Submitted" || application.status === "Approved")) {
    return bad("Your signature is attached to a submitted application and can no longer be removed.");
  }

  await prisma.member.update({ where: { id: session.sub }, data: { signature: "" } });
  return json({ ok: true });
}
