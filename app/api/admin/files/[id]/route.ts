import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { bad } from "@/lib/server";
import { storedFileResponse } from "@/lib/fileResponse";

export const runtime = "nodejs";

// Streams a stored upload to authenticated staff. Whichever driver holds the
// file — the VPS volume, R2, Vercel Blob or the inline fallback — it is served
// behind a staff session, and Range requests are honoured so the inline player
// can seek.
//   GET /api/admin/files/<id>            → inline
//   GET /api/admin/files/<id>?download=1 → attachment
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const { id } = await ctx.params;
  const file = await prisma.uploadFile.findUnique({ where: { id } });
  if (!file) return bad("File not found.", 404);

  return storedFileResponse(file, {
    disposition: new URL(req.url).searchParams.get("download") ? "attachment" : "inline",
    range: req.headers.get("range") || undefined,
  });
}
