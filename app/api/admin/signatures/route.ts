import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { OFFICES, type Office } from "@/lib/issueDocuments";

export const runtime = "nodejs";

const MAX_IMAGE = 500 * 1024;

const OFFICE_LABEL: Record<Office, string> = {
  GENERAL_MANAGER: "General Manager",
  BOARD_SECRETARY: "Board Secretary",
};

// The stored official signatures (admin console only — these images are never
// served through member-facing APIs; members only receive the rendered PDFs).
export async function GET() {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const rows = await prisma.officialSignature.findMany();
  return json({
    signatures: rows.map((s) => ({
      office: s.office,
      officerName: s.officerName,
      officerTitle: s.officerTitle,
      image: s.image,
      updatedAt: s.updatedAt.toISOString(),
      updatedBy: s.updatedBy,
    })),
  });
}

// Upload / replace an office's signature. The new image supersedes the old one
// for every document generated from now on; already-issued PDFs are unchanged
// until staff regenerate them.
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request body.");
  const { office, officerName, officerTitle, image } = b;
  if (!OFFICES.includes(office)) return bad("Unknown office.");
  if (!officerName?.trim()) return bad("The officer's name is required.");
  if (typeof image !== "string" || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(image)) {
    return bad("The signature must be a transparent PNG image.");
  }
  if (image.length > MAX_IMAGE) return bad("Signature image is too large.");

  const admin = await prisma.adminUser.findUnique({ where: { id: session.sub } });
  const data = {
    officerName: officerName.trim(),
    officerTitle: (officerTitle || OFFICE_LABEL[office as Office]).trim(),
    image,
    updatedBy: admin?.name ?? "",
  };
  await prisma.officialSignature.upsert({
    where: { office },
    update: data,
    create: { office, ...data },
  });

  await logAudit(session.sub, "signature.uploaded", {
    targetType: "OfficialSignature",
    targetId: office,
    summary: `${OFFICE_LABEL[office as Office]} signature set to ${data.officerName}`,
  });

  return json({ ok: true });
}
