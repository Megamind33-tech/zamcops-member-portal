import { bad } from "@/lib/server";
import { isR2Url, r2Configured, r2Key, r2PresignGet } from "@/lib/r2";

// Serves a stored file row, whichever of the three storage paths holds it:
//
//   url = "r2://<key>"  → proxied through a short-lived presigned GET, so the
//                         bucket stays private and no signed link reaches the
//                         client
//   url = "https://…"   → a public Vercel Blob URL; redirect to it
//   data = "<base64>"   → the inline fallback, decoded here
//
// R2-backed rows MUST be proxied rather than redirected: "r2://…" is a marker,
// not a fetchable URL, and Response.redirect happily emits it as a Location
// the browser cannot follow — a download that fails with no server-side error.

export interface StoredFile {
  url: string;
  data: string;
  mimeType: string;
  fileName: string;
}

export async function storedFileResponse(
  file: StoredFile,
  opts: { disposition: "inline" | "attachment"; fallbackType?: string; range?: string },
): Promise<Response> {
  const contentType = file.mimeType || opts.fallbackType || "application/octet-stream";
  const safeName = file.fileName.replace(/[^\w.\- ]/g, "_");
  const disposition = `${opts.disposition}; filename="${safeName}"`;

  if (file.url) {
    if (!isR2Url(file.url)) return Response.redirect(file.url, 302);
    if (!r2Configured()) return bad("File storage is not configured.", 502);

    const upstream = await fetch(await r2PresignGet(r2Key(file.url)), {
      headers: opts.range ? { range: opts.range } : undefined,
    });
    if (!upstream.ok && upstream.status !== 206) return bad("File unavailable.", 502);

    const headers = new Headers({
      "Content-Type": contentType,
      "Content-Disposition": disposition,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
    });
    const len = upstream.headers.get("content-length");
    if (len) headers.set("Content-Length", len);
    const cr = upstream.headers.get("content-range");
    if (cr) headers.set("Content-Range", cr);

    return new Response(upstream.body, { status: upstream.status, headers });
  }

  if (!file.data) return bad("This document has no downloadable file.", 404);

  const bytes = Buffer.from(file.data, "base64");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-store",
    },
  });
}
