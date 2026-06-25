import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireMember } from "@/lib/auth";
import { json, bad } from "@/lib/server";

export const runtime = "nodejs";

// Issues a short-lived client token so members can upload large files (audio
// masters, etc.) directly to Vercel Blob — bypassing the serverless body limit.
// Returns 501 when no Blob store is connected, so the client can fall back to
// the inline (≤4MB) upload path.
export async function POST(req: Request): Promise<Response> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return bad("Blob storage is not configured.", 501);

  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const body = (await req.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["audio/*", "image/*", "application/pdf"],
        maximumSizeInBytes: 300 * 1024 * 1024, // 300MB
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ sub: session.sub }),
      }),
      // The file row is recorded client-side once upload() resolves, so this
      // callback (which doesn't fire on localhost) is intentionally a no-op.
      onUploadCompleted: async () => {},
    });
    return Response.json(result);
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Could not start the upload.", 400);
  }
}
