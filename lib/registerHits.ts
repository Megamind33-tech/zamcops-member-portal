import { prisma } from "@/lib/db";
import type { OwnershipSplit } from "@/types";
import type { RegisterHit } from "@/lib/works";

export async function fetchRegisterHits(splits: OwnershipSplit[]): Promise<RegisterHit[]> {
  const ids = [...new Set(splits.map((s) => s.memberId).filter(Boolean))] as string[];
  const numbers = [...new Set(splits.map((s) => (s.memberNumber || "").trim()).filter(Boolean))];
  const names = [...new Set(splits.map((s) => (s.party || "").trim()).filter(Boolean))];
  if (!ids.length && !numbers.length && !names.length) return [];

  return prisma.member.findMany({
    where: {
      OR: [
        ...(ids.length ? [{ id: { in: ids } }] : []),
        ...numbers.map((n) => ({ memberNumber: { equals: n, mode: "insensitive" as const } })),
        ...names.map((n) => ({ fullName: { equals: n, mode: "insensitive" as const } })),
      ],
    },
    select: { id: true, fullName: true, memberNumber: true },
    take: 40,
  });
}
