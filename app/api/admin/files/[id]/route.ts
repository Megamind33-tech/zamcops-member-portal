import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { bad } from "@/lib/server";

export const runtime = "nodejs";

// Streams a stored upload to staff for inline playback or download.
//   GET /api/admin/files/<id>            → inline (e.g. <audio src>)
//   GET /api/admin/files/<id>?download=1 → as an attachment
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const { id } = await ctx.params;
  const file = await prisma.uploadFile.findUnique({ where: { id } });
  if (!file || !file.data) return bad("File not available.", 404);

  const buf = Buffer.from(file.data, "base64");
  const download = new URL(req.url).searchParams.get("download");
  const disposition = `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(file.fileName)}"`;

  return new Response(buf, {
    headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Length": String(buf.length),
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
