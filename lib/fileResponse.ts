import { bad } from "@/lib/server";
import { isR2Url, r2Configured, r2Key, r2PresignGet } from "@/lib/r2";
import { isLocalUrl, localConfigured, localKey, localReadStream, localSize } from "@/lib/localStore";

// Serves a stored file row, whichever of the four storage paths holds it:
//
//   url = "local://<key>" → streamed off the VPS volume, honouring Range so
//                           staff can scrub through a long master
//   url = "r2://<key>"    → proxied through a short-lived presigned GET, so the
//                           bucket stays private and no signed link reaches the
//                           client
//   url = "https://…"     → a public Vercel Blob URL; redirect to it
//   data = "<base64>"     → the inline fallback, decoded here
//
// R2-backed rows MUST be proxied rather than redirected: "r2://…" is a marker,
// not a fetchable URL, and Response.redirect happily emits it as a Location
// the browser cannot follow — a download that fails with no server-side error.
// The same goes for "local://…".

export interface StoredFile {
  url: string;
  data: string;
  mimeType: string;
  fileName: string;
}

// "bytes=0-" / "bytes=1000-2000" → absolute offsets inside a file of `size`.
// Anything malformed or out of range returns null, and the whole file is sent.
function parseRange(header: string | undefined, size: number): { start: number; end: number } | null {
  const m = /^bytes=(\d*)-(\d*)$/.exec((header ?? "").trim());
  if (!m || size <= 0) return null;
  const [, rawStart, rawEnd] = m;
  let start: number;
  let end: number;
  if (rawStart === "") {
    if (rawEnd === "") return null;
    const suffix = Number(rawEnd);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Number(rawEnd);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start > end || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}

export async function storedFileResponse(
  file: StoredFile,
  opts: { disposition: "inline" | "attachment"; fallbackType?: string; range?: string },
): Promise<Response> {
  const contentType = file.mimeType || opts.fallbackType || "application/octet-stream";
  const safeName = file.fileName.replace(/[^\w.\- ]/g, "_");
  const disposition = `${opts.disposition}; filename="${safeName}"`;

  if (file.url) {
    if (isLocalUrl(file.url)) {
      if (!localConfigured()) return bad("File storage is not configured.", 502);
      const key = localKey(file.url);
      let size: number;
      try {
        size = await localSize(key);
      } catch {
        return bad("File unavailable.", 404);
      }
      const range = parseRange(opts.range, size);
      const headers = new Headers({
        "Content-Type": contentType,
        "Content-Disposition": disposition,
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
      });
      if (range) {
        headers.set("Content-Length", String(range.end - range.start + 1));
        headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
        return new Response(localReadStream(key, range), { status: 206, headers });
      }
      headers.set("Content-Length", String(size));
      return new Response(localReadStream(key), { headers });
    }

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

  // The inline fallback answers Range like the other two drivers. It is decoded
  // whole either way — the row is capped at a few megabytes — but a player that
  // asks for a window and is handed the entire file back cannot seek, and staff
  // reviewing a submission scrub through it rather than listen start to finish.
  const bytes = Buffer.from(file.data, "base64");
  const headers = new Headers({
    "Content-Type": contentType,
    "Content-Disposition": disposition,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
  });

  const range = parseRange(opts.range, bytes.length);
  if (range) {
    const slice = bytes.subarray(range.start, range.end + 1);
    headers.set("Content-Length", String(slice.length));
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${bytes.length}`);
    return new Response(new Uint8Array(slice), { status: 206, headers });
  }

  headers.set("Content-Length", String(bytes.length));
  return new Response(new Uint8Array(bytes), { headers });
}
