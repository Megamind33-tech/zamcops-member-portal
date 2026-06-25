import { del } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { json, bad } from "@/lib/server";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB — inline fallback stays under the serverless body limit
type UploadType = "Audio" | "Cover Art" | "Lyrics" | "Document";

const statusFor = (t: string) => (t === "Audio" ? "Processing" : "Pending");

// Records an uploaded file on an UploadFile row so staff can download / play it.
//  - JSON body  → a file already uploaded to Vercel Blob (large files): stores the URL.
//  - raw binary → small files (≤4MB) stored inline as base64.
//    POST /api/member/upload?type=Audio&name=song.mp3&linkedTo=My%20Song
export async function POST(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  // Blob-backed upload: the client already pushed the file to Vercel Blob.
  if (req.headers.get("content-type")?.includes("application/json")) {
    const b = await req.json().catch(() => null);
    if (!b?.url) return bad("Missing blob url.");
    const fileType = (b.fileType as UploadType) || "Document";
    const upload = await prisma.uploadFile.create({
      data: {
        ownerId: session.sub,
        fileName: b.fileName || "upload",
        fileType,
        linkedTo: b.linkedTo || "",
        status: statusFor(fileType),
        mimeType: b.mimeType || "",
        fileSize: Number(b.fileSize) || 0,
        url: String(b.url),
      },
    });
    return json({ id: upload.id, fileName: upload.fileName, fileType: upload.fileType, fileSize: upload.fileSize }, 201);
  }

  // Inline fallback: small file sent as a raw binary body.
  const url = new URL(req.url);
  const fileType = (url.searchParams.get("type") as UploadType) || "Document";
  const fileName = url.searchParams.get("name") || "upload";
  const linkedTo = url.searchParams.get("linkedTo") || "";
  const mimeType = req.headers.get("content-type") || "application/octet-stream";

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length === 0) return bad("No file received.");
  if (buf.length > MAX_BYTES) return bad("File is too large for inline upload (max 4MB).", 413);

  const upload = await prisma.uploadFile.create({
    data: {
      ownerId: session.sub,
      fileName,
      fileType,
      linkedTo,
      status: statusFor(fileType),
      mimeType,
      fileSize: buf.length,
      data: buf.toString("base64"),
    },
  });

  return json({ id: upload.id, fileName: upload.fileName, fileType: upload.fileType, fileSize: upload.fileSize }, 201);
}

// Members may remove an upload they own (e.g. before submitting).
export async function DELETE(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const b = await req.json().catch(() => null);
  const id = b?.id ? String(b.id) : "";
  if (!id) return bad("An upload id is required.");

  const row = await prisma.uploadFile.findUnique({ where: { id } });
  if (!row || row.ownerId !== session.sub) return bad("Upload not found.", 404);

  if (row.url && process.env.BLOB_READ_WRITE_TOKEN) {
    await del(row.url).catch(() => {});
  }
  await prisma.uploadFile.delete({ where: { id } });
  return json({ ok: true });
}
