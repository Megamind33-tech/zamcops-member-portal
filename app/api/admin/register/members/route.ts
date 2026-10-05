import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";

export const runtime = "nodejs";

// Portal members matching a search, for picking who to link a right-holder to.
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return json({ members: [] });

  const words = q.split(/\s+/).filter(Boolean).slice(0, 4);
  const rows = await prisma.member.findMany({
    where: {
      AND: words.map((w) => ({
        OR: [
          { fullName: { contains: w, mode: "insensitive" as const } },
          { stageName: { contains: w, mode: "insensitive" as const } },
          { memberNumber: { contains: w, mode: "insensitive" as const } },
          { email: { contains: w, mode: "insensitive" as const } },
        ],
      })),
    },
    take: 15,
    orderBy: { fullName: "asc" },
    select: { id: true, memberNumber: true, fullName: true, stageName: true, rightHolder: { select: { id: true, displayName: true } } },
  });
  return json({ members: rows });
}
