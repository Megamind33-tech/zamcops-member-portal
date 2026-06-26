import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { bad } from "@/lib/server";

export const runtime = "nodejs";

// Streams a stored upload to authenticated staff. Audio kept in Vercel Blob is
// proxied server-side (the Blob URL is never exposed to the client), so files
// are only reachable behind a staff session. Range requests are forwarded so
// the inline player can seek.
//   GET /api/admin/files/<id>            → inline
//   GET /api/admin/files/<id>?download=1 → attachment
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const { id } = await ctx.params;
  const file = await prisma.uploadFile.findUnique({ where: { id } });
  if (!file) return bad("File not found.", 404);

  const download = new URL(req.url).searchParams.get("download");
  const disposition = `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(file.fileName)}"`;
  const contentType = file.mimeType || "application/octet-stream";

  // Blob-backed (large) file: proxy it, forwarding the Range header.
  if (file.url) {
    const range = req.headers.get("range") || undefined;
    const upstream = await fetch(file.url, { headers: range ? { range } : undefined });
    if (!upstream.ok && upstream.status !== 206) return bad("File unavailable.", 502);

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Content-Disposition", disposition);
    headers.set("Cache-Control", "private, max-age=3600");
    const len = upstream.headers.get("content-length");
    if (len) headers.set("Content-Length", len);
    const cr = upstream.headers.get("content-range");
    if (cr) headers.set("Content-Range", cr);

    return new Response(upstream.body, { status: upstream.status, headers });
  }

  // Inline (small) file stored as base64.
  if (file.data) {
    const buf = Buffer.from(file.data, "base64");
    return new Response(buf, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buf.length),
        "Content-Disposition": disposition,
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  return bad("File not available.", 404);
}
