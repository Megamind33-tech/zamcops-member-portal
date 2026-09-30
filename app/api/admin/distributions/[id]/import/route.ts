import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import {
  parseDistributionWorkbook,
  groupImportRows,
  ImportParseError,
  type MatchableMember,
} from "@/lib/distributionImport";

export const runtime = "nodejs";

// Bulk-loads a distribution period's line-item statements from an Excel
// export, matching each row's account to a member and upserting one
// DistributionEntry per member — the same record the admin "Manage entries"
// table edits by hand, just filled from a spreadsheet instead of typed in one
// member at a time.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const { id: distributionId } = await params;
  const distribution = await prisma.distribution.findUnique({ where: { id: distributionId } });
  if (!distribution) return bad("Distribution period not found.", 404);

  const b = await req.json().catch(() => null);
  const fileBase64 = typeof b?.fileBase64 === "string" ? b.fileBase64 : "";
  if (!fileBase64) return bad("Choose a workbook to import.");

  let buffer: Buffer;
  try {
    buffer = Buffer.from(fileBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
  } catch {
    return bad("Could not read the uploaded file.");
  }

  let grouped;
  try {
    const rows = parseDistributionWorkbook(buffer);
    const members = await prisma.member.findMany({
      select: { id: true, fullName: true, memberNumber: true, externalRef: true },
    });
    grouped = groupImportRows(rows, members as MatchableMember[]);
  } catch (e) {
    if (e instanceof ImportParseError) return bad(e.message);
    console.error("[distributions/import] parse failed:", e);
    return bad("Could not parse this workbook.", 500);
  }

  for (const { member, group, learnExternalRef } of grouped.matched) {
    await prisma.distributionEntry.upsert({
      where: { distributionId_ownerId: { distributionId, ownerId: member.id } },
      update: {
        amount: group.netAmount,
        currency: group.currency,
        grossAmount: group.grossAmount,
        adminFee: group.adminFee,
        lines: JSON.stringify(group.lines),
        externalRef: group.externalRef,
      },
      create: {
        distributionId,
        ownerId: member.id,
        amount: group.netAmount,
        currency: group.currency,
        grossAmount: group.grossAmount,
        adminFee: group.adminFee,
        lines: JSON.stringify(group.lines),
        externalRef: group.externalRef,
      },
    });
    if (learnExternalRef && group.externalRef) {
      await prisma.member.update({ where: { id: member.id }, data: { externalRef: group.externalRef } });
    }
  }

  await logAudit(session.sub, "distribution.imported", {
    targetType: "Distribution",
    targetId: distributionId,
    summary: `Imported statements for “${distribution.periodLabel}” — ${grouped.matched.length} matched, ${grouped.unmatched.length} unmatched`,
  });

  return json({
    ok: true,
    matched: grouped.matched.length,
    unmatched: grouped.unmatched.map((g) => ({
      memberName: g.memberName,
      memberNumber: g.memberNumber,
      externalRef: g.externalRef,
      netAmount: g.netAmount,
      currency: g.currency,
    })),
  });
}
