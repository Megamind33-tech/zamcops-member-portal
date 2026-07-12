import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { bad } from "@/lib/server";

export const runtime = "nodejs";

// Streams one of the member's own documents. Approval-gated: generated
// documents (application form, deed, admission letter) only become
// downloadable once the membership is approved (status Active).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const { id } = await params;
  const doc = await prisma.memberDocument.findUnique({ where: { id } });
  if (!doc || doc.ownerId !== session.sub) return bad("Document not found.", 404);

  const member = await prisma.member.findUnique({
    where: { id: session.sub },
    select: { membershipStatus: true },
  });
  if (member?.membershipStatus !== "Active") {
    return bad("Documents become available for download once your membership is approved.", 403);
  }

  if (doc.url) return Response.redirect(doc.url, 302);
  if (!doc.data) return bad("This document has no downloadable file.", 404);

  const bytes = Buffer.from(doc.data, "base64");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": doc.mimeType || "application/pdf",
      "Content-Length": String(bytes.length),
      "Content-Disposition": `attachment; filename="${doc.fileName.replace(/[^\w.\- ]/g, "_")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
