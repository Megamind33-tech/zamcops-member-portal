import { requireMember } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { localConfigured, localPut } from "@/lib/localStore";

export const runtime = "nodejs";

// Receives a large upload for the local-disk driver — the self-hosted stand-in
// for a presigned PUT to R2. The browser PUTs the file here with the key handed
// out by /api/storage/presign; the body is streamed to the volume rather than
// buffered, so a 300MB master costs no memory.
//
// Authorisation is the member's own session cookie (the request is same-origin),
// and the key must sit inside that member's namespace — the same rule the record
// endpoint enforces on the stored URL.
export async function PUT(req: Request) {
  if (!localConfigured()) return bad("Local storage is not configured.", 501);

  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);
  if (!rateLimit(`put-ip:${clientIp(req)}`, 60, 10 * 60_000)) {
    return bad("Too many uploads — please wait a few minutes and try again.", 429);
  }

  const key = new URL(req.url).searchParams.get("key") ?? "";
  if (!key.startsWith(`uploads/${session.sub}/`)) return bad("Invalid storage key.", 403);

  try {
    const size = await localPut(key, req.body);
    return json({ ok: true, size });
  } catch (err) {
    console.error("[storage] local put failed:", err);
    return bad("Could not store the file.", 500);
  }
}
