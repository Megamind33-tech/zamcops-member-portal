import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { bad } from "@/lib/server";
import { storedFileResponse } from "@/lib/fileResponse";

export const runtime = "nodejs";

// Streams a submission's artwork to authenticated staff.
//
// Cover art is not stored the way the other uploads are. The member's browser
// resizes it and puts it straight into storage, and what the submission row
// keeps is whatever that returned — which for the two drivers that matter is a
// marker, "local://<key>" or "r2://<key>", not a URL a browser can fetch. Put
// in an <img src>, those render nothing, so every sleeve in the staff console
// fell back to the placeholder and staff reviewed artwork they could not see.
//
// Resolving it here rather than at the point of upload keeps the submissions
// already in the database working: the row is read, whatever it holds is
// handed to the same machinery that serves every other upload, and no backfill
// or schema change is needed. A data URL is decoded, a public https:// URL is
// redirected to, and the two markers are streamed off the volume or proxied
// out of the bucket.
//
// The reference comes from the row, never from the caller — the caller names a
// submission, not a storage key — so this cannot be pointed at arbitrary
// storage.
//   GET /api/admin/media/work|song|album/<id>            → inline
//   GET /api/admin/media/work|song|album/<id>?download=1 → attachment

const KINDS = ["work", "song", "album"] as const;
type Kind = (typeof KINDS)[number];

const isKind = (v: string): v is Kind => (KINDS as readonly string[]).includes(v);

async function coverOf(kind: Kind, id: string): Promise<{ coverArt: string; title: string } | null> {
  const select = { coverArt: true, title: true };
  if (kind === "work") return prisma.workDeclaration.findUnique({ where: { id }, select });
  if (kind === "song") return prisma.songSubmission.findUnique({ where: { id }, select });
  return prisma.albumSubmission.findUnique({ where: { id }, select });
}

export async function GET(req: Request, ctx: { params: Promise<{ kind: string; id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const { kind, id } = await ctx.params;
  if (!isKind(kind)) return bad("Unknown media kind.", 404);

  const row = await coverOf(kind, id);
  if (!row) return bad("Not found.", 404);

  const ref = (row.coverArt || "").trim();
  if (!ref) return bad("No artwork was submitted.", 404);

  // A data URL carries its own type; a marker or link carries none, and the
  // member's browser always encodes the sleeve as JPEG before storing it.
  const inline = /^data:([^;,]+);base64,([\s\S]*)$/.exec(ref);
  const safeTitle = (row.title || "artwork").replace(/[^\w.\- ]/g, "_");

  return storedFileResponse(
    {
      url: inline ? "" : ref,
      data: inline ? inline[2] : "",
      mimeType: inline ? inline[1] : "image/jpeg",
      fileName: `${safeTitle} — artwork.jpg`,
    },
    {
      disposition: new URL(req.url).searchParams.get("download") ? "attachment" : "inline",
      range: req.headers.get("range") || undefined,
      fallbackType: "image/jpeg",
    },
  );
}
