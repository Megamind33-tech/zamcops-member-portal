import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { inviteEmailFor, emailConfigured } from "@/lib/invites";

export const runtime = "nodejs";

// One right-holder from the WIPO Connect register, with everything WIPO holds
// on them: names and their IPI numbers, addresses, contacts, the works they
// hold a share in, and what they were allocated in distribution runs.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const { id } = await params;
  const h = await prisma.rightHolder.findUnique({
    where: { id },
    include: {
      names: true,
      addresses: true,
      contacts: true,
      member: { select: { id: true, memberNumber: true, fullName: true } },
    },
  });
  if (!h) return bad("Right-holder not found.", 404);

  const [shareCount, shares, lineTotals, lineCount] = await Promise.all([
    prisma.workShare.count({ where: { rightHolderId: id } }),
    prisma.workShare.findMany({
      where: { rightHolderId: id },
      take: 100,
      orderBy: { work: { title: "asc" } },
      include: { work: { select: { id: true, title: true, wipoId: true, iswc: true } } },
    }),
    prisma.distributionLine.aggregate({ where: { rightHolderId: id }, _sum: { amount: true } }),
    prisma.distributionLine.count({ where: { rightHolderId: id } }),
  ]);

  let identifiers: unknown = [];
  try {
    identifiers = JSON.parse(h.identifiers);
  } catch {
    /* leave empty */
  }

  // never send the token hash to the browser
  const { inviteTokenHash: _hash, ...safe } = h;
  void _hash;
  return json({
    holder: { ...safe, identifiers },
    invite: {
      email: inviteEmailFor(h),
      typedEmail: h.inviteEmail,
      sentAt: h.inviteSentAt,
      expiresAt: h.inviteExpiresAt,
      count: h.inviteCount,
      canSend: emailConfigured(),
    },
    shareCount,
    shares: shares.map((s) => ({
      id: s.id,
      work: s.work,
      roleCode: s.roleCode,
      isPublisher: s.isPublisher,
      rightType: s.rightType,
      share: s.share,
      territoryFormula: s.territoryFormula,
    })),
    distributions: { lines: lineCount, totalAmount: lineTotals._sum.amount ?? 0 },
  });
}
