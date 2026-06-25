import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { json, bad } from "@/lib/server";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB — stays under the serverless body limit
type UploadType = "Audio" | "Cover Art" | "Lyrics" | "Document";

// Accepts a single file as a raw binary body and stores it (base64) on an
// UploadFile row so staff can later download / play it.
//   POST /api/member/upload?type=Audio&name=song.mp3&linkedTo=My%20Song
export async function POST(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const url = new URL(req.url);
  const fileType = (url.searchParams.get("type") as UploadType) || "Document";
  const fileName = url.searchParams.get("name") || "upload";
  const linkedTo = url.searchParams.get("linkedTo") || "";
  const mimeType = req.headers.get("content-type") || "application/octet-stream";

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length === 0) return bad("No file received.");
  if (buf.length > MAX_BYTES) return bad("File is too large (max 4MB).", 413);

  const upload = await prisma.uploadFile.create({
    data: {
      ownerId: session.sub,
      fileName,
      fileType,
      linkedTo,
      status: fileType === "Audio" ? "Processing" : "Pending",
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

  await prisma.uploadFile.delete({ where: { id } });
  return json({ ok: true });
}
