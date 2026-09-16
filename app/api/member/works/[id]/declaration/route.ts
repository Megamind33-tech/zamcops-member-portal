import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { bad } from "@/lib/server";
import { generateWorkDeclarationPdf, toWorkLike } from "@/lib/workDocuments";

export const runtime = "nodejs";

// The member's own signed Declaration of a Musical Work, rendered on demand.
//
// Unlike the approval-gated documents on their file, this one is available the
// moment a work is submitted: it is the member's record of exactly what they
// declared and what they lodged, and it is what the office asks for when a
// registration is queried. It is rendered per request rather than stored, so it
// always reflects the current particulars and costs the database nothing.
//
// The Certificate of Registration is a different document: it is counter-signed
// by the Society and only exists once the work is entered in the register, so it
// is issued to the member's documents at approval instead.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const { id } = await params;
  const work = await prisma.workDeclaration.findUnique({ where: { id } });
  if (!work || work.ownerId !== session.sub) return bad("Work not found.", 404);

  const member = await prisma.member.findUnique({ where: { id: session.sub } });
  if (!member) return bad("Member not found.", 404);
  if (!member.signature) {
    return bad("Add your signature under Profile before downloading a signed declaration.", 409);
  }

  const workLike = toWorkLike(work);
  const reference = `WD-${work.id.slice(-6).toUpperCase()}-${member.memberNumber.replace(/^ZAM-/, "")}`;
  const pdf = generateWorkDeclarationPdf({ member, work: workLike, reference });
  const bytes = Buffer.from(pdf.base64, "base64");

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(bytes.length),
      "Content-Disposition": `attachment; filename="${pdf.fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
