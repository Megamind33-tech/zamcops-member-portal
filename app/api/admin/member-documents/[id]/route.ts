import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { bad } from "@/lib/server";

export const runtime = "nodejs";

// Staff download/preview of a document on a member's file (e.g. to check a
// generated PDF before or after approval).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const { id } = await params;
  const doc = await prisma.memberDocument.findUnique({ where: { id } });
  if (!doc) return bad("Document not found.", 404);
  if (doc.url) return Response.redirect(doc.url, 302);
  if (!doc.data) return bad("This document has no downloadable file.", 404);

  const bytes = Buffer.from(doc.data, "base64");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": doc.mimeType || "application/pdf",
      "Content-Length": String(bytes.length),
      "Content-Disposition": `inline; filename="${doc.fileName.replace(/[^\w.\- ]/g, "_")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
