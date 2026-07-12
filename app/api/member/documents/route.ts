import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { memberDocumentDTO } from "@/lib/serialize";

export const runtime = "nodejs";

// Lists the member's official documents (metadata only). Downloads are gated
// on approval — `canDownload` tells the client whether to offer them.
export async function GET() {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const [documents, member] = await Promise.all([
    prisma.memberDocument.findMany({
      where: { ownerId: session.sub },
      orderBy: { uploadedAt: "desc" },
      omit: { data: true },
    }),
    prisma.member.findUnique({ where: { id: session.sub }, select: { membershipStatus: true } }),
  ]);

  return json({
    documents: documents.map(memberDocumentDTO),
    canDownload: member?.membershipStatus === "Active",
  });
}
