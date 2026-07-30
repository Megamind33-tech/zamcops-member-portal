import { requireMember } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { r2Configured, r2PresignPut, r2Url } from "@/lib/r2";

export const runtime = "nodejs";

const MAX_BYTES = 300 * 1024 * 1024; // matches the Blob route's ceiling
const ALLOWED_TYPES = [/^audio\//, /^image\//, /^application\/pdf$/];

// Issues a short-lived presigned PUT URL so members can upload large files
// directly to Cloudflare R2, bypassing the serverless body limit. Returns 501
// when R2 is not configured so the client can fall back to Vercel Blob or the
// inline (≤4MB) path.
export async function POST(req: Request) {
  if (!r2Configured()) return bad("External storage is not configured.", 501);

  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);
  if (
    !rateLimit(`presign:${session.sub}`, 30, 10 * 60_000) ||
    !rateLimit(`presign-ip:${clientIp(req)}`, 60, 10 * 60_000)
  ) {
    return bad("Too many uploads — please wait a few minutes and try again.", 429);
  }

  const b = await req.json().catch(() => null);
  const fileName = String(b?.fileName ?? "").trim().slice(0, 200);
  const contentType = String(b?.contentType ?? "application/octet-stream");
  const fileSize = Number(b?.fileSize) || 0;
  if (!fileName) return bad("A file name is required.");
  if (fileSize <= 0 || fileSize > MAX_BYTES) return bad("Files must be under 300MB.");
  if (!ALLOWED_TYPES.some((re) => re.test(contentType))) return bad("Unsupported file type.");

  // Key is namespaced per member; the record endpoint later verifies the
  // stored URL sits inside the caller's own namespace.
  const safeName = fileName.replace(/[^\w.-]+/g, "_").slice(-100);
  const key = `uploads/${session.sub}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

  return json({ uploadUrl: await r2PresignPut(key), url: r2Url(key) });
}
