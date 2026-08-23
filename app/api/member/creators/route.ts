import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { json, bad } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Look up a creator already on the ZAMCOPS register. Used when declaring a
// work so a non-submitting contributor does not have to re-upload their NRC.
export async function GET(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const q = new URL(req.url).searchParams.get("q")?.trim() || "";
  if (q.length < 3) return json({ members: [] });

  const members = await prisma.member.findMany({
    where: {
      OR: [
        { memberNumber: { contains: q, mode: "insensitive" } },
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { equals: q.toLowerCase(), mode: "insensitive" } },
      ],
    },
    select: { id: true, fullName: true, memberNumber: true, role: true },
    take: 6,
  });

  return json({ members });
}
