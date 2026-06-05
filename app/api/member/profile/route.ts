import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { memberDTO } from "@/lib/serialize";

export const runtime = "nodejs";

// Whitelisted, editable profile / KYC fields.
const EDITABLE = [
  "fullName", "stageName", "nrcOrPassport", "dateOfBirth", "gender", "phone",
  "province", "district", "address", "bankName", "bankAccount",
  "mobileMoneyNumber", "nextOfKinName", "nextOfKinPhone", "nrcDocument", "profilePhoto",
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

  const member = await prisma.member.update({ where: { id: session.sub }, data });
  return json({ member: memberDTO(member) });
}
