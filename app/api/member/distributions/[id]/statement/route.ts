import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { bad } from "@/lib/server";
import { generateDistributionStatementPdf } from "@/lib/statementDocuments";
import type { DistributionLine } from "@/types";

export const runtime = "nodejs";

function parseLines(s: string): DistributionLine[] {
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
}

// A member's own statement for one published distribution period. Only ever
// their own entry, and only once the period is Published — the same gate
// that reveals the figures on their Royalties page in the first place.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const { id: distributionId } = await params;
  const entry = await prisma.distributionEntry.findUnique({
    where: { distributionId_ownerId: { distributionId, ownerId: session.sub } },
    include: { distribution: true },
  });
  if (!entry || entry.distribution.status !== "Published") return bad("Statement not found.", 404);

  const member = await prisma.member.findUnique({ where: { id: session.sub } });
  if (!member) return bad("Member not found.", 404);

  const reference = `RS-${entry.distribution.id.slice(-6).toUpperCase()}-${member.memberNumber.replace(/^ZAM-/, "")}`;
  const pdf = generateDistributionStatementPdf({
    member,
    distribution: entry.distribution,
    entry: { ...entry, lines: parseLines(entry.lines) },
    reference,
  });
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
