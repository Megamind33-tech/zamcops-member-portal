import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { bad } from "@/lib/server";
import { storedFileResponse } from "@/lib/fileResponse";

export const runtime = "nodejs";

// Staff download/preview of a document on a member's file (e.g. to check a
// generated PDF before or after approval).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const { id } = await params;
  const doc = await prisma.memberDocument.findUnique({ where: { id } });
  if (!doc) return bad("Document not found.", 404);
  return storedFileResponse(doc, { disposition: "inline", fallbackType: "application/pdf" });
}
