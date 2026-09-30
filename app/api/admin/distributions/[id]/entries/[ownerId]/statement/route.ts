import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
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

// Staff copy of a member's statement — available regardless of whether the
// period has been published yet, so an import can be checked before the
// figures go out to anyone.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; ownerId: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const { id: distributionId, ownerId } = await params;
  const entry = await prisma.distributionEntry.findUnique({
    where: { distributionId_ownerId: { distributionId, ownerId } },
    include: { distribution: true },
  });
  if (!entry) return bad("Entry not found.", 404);

  const member = await prisma.member.findUnique({ where: { id: ownerId } });
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
