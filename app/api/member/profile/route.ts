import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { json, bad, normalizePhone } from "@/lib/server";
import { memberDTO } from "@/lib/serialize";

export const runtime = "nodejs";

// Whitelisted, editable profile / KYC fields.
const EDITABLE = [
  "fullName", "stageName", "nrcOrPassport", "dateOfBirth", "gender", "phone",
  "province", "district", "address", "bankName", "bankAccount",
  "mobileMoneyNumber", "nextOfKinName", "nextOfKinPhone", "nrcDocument", "profilePhoto",
  "notificationPrefs",
] as const;

export async function PATCH(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid request body.");

  const data: Record<string, string> = {};
  for (const key of EDITABLE) {
    if (body[key] !== undefined && body[key] !== null) data[key] = String(body[key]);
  }

  if (data.phone !== undefined) {
    data.phone = normalizePhone(data.phone);
    if (!data.phone) return bad("Enter a valid phone number.");
    const clash = await prisma.member.findFirst({
      where: { phone: data.phone, NOT: { id: session.sub } },
      select: { id: true },
    });
    if (clash) return bad("An account with that phone number already exists.", 409);
  }

  try {
    const member = await prisma.member.update({ where: { id: session.sub }, data });
    return json({ member: memberDTO(member) });
  } catch (e) {
    // Race with the pre-check above — the unique index is the backstop.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return bad("An account with that phone number already exists.", 409);
    }
    throw e;
  }
}
