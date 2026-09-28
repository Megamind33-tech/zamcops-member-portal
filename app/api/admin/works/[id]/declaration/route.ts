import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { bad } from "@/lib/server";
import { generateWorkDeclarationPdf, toWorkLike } from "@/lib/workDocuments";

export const runtime = "nodejs";

// Staff copy of a work's declaration, rendered on demand with whatever the
// register currently holds — the distribution key, file number and factor —
// so it is usable for review before a work is approved, not only once the
// completed copy is filed to the member's record at that point.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const { id } = await params;
  const work = await prisma.workDeclaration.findUnique({ where: { id } });
  if (!work) return bad("Work not found.", 404);

  const member = await prisma.member.findUnique({ where: { id: work.ownerId } });
  if (!member) return bad("Member not found.", 404);

  const workLike = toWorkLike(work);
  const reference = `WD-${work.id.slice(-6).toUpperCase()}-${member.memberNumber.replace(/^ZAM-/, "")}`;
  const pdf = await generateWorkDeclarationPdf({ member, work: workLike, reference, copy: "office" });
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
