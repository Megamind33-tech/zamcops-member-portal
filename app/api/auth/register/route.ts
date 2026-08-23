import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { json, bad, genMemberNumber, normalizePhone, seedMemberDefaults } from "@/lib/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { memberDTO } from "@/lib/serialize";
import { issueEmailOtp } from "@/lib/otp";
import { isMemberRole } from "@/lib/roles";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!rateLimit(`register:${clientIp(req)}`, 5, 15 * 60_000)) {
    return bad("Too many registration attempts — please wait a while and try again.", 429);
  }

  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid request body.");

  const { fullName, stageName, nrcOrPassport, phone, email, role, password } = body;
  if (!fullName || !phone || !email || !password) return bad("Please complete all required fields.");
  if (String(password).length < 6) return bad("Password must be at least 6 characters.");
  if (role && !isMemberRole(role)) return bad("Invalid role.");

  const normalizedPhone = normalizePhone(phone);
  const existing = await prisma.member.findFirst({
    where: { OR: [{ email: String(email).toLowerCase() }, { phone: normalizedPhone }] },
  });
  if (existing) return bad("An account with that email or phone already exists.", 409);

  const passwordHash = await hashPassword(password);

  // Member numbers are random, so retry a few times on a rare collision.
  let member = null;
  for (let attempt = 0; attempt < 5 && !member; attempt++) {
    try {
      member = await prisma.member.create({
        data: {
          memberNumber: genMemberNumber(),
          email: String(email).toLowerCase(),
          phone: normalizedPhone,
          passwordHash,
          fullName,
          stageName: stageName ?? "",
          nrcOrPassport: nrcOrPassport ?? "",
          role: isMemberRole(role) ? role : "Composer",
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const target = Array.isArray(e.meta?.target) ? (e.meta.target as string[]) : [];
        if (target.includes("memberNumber")) continue; // collision — regenerate
        return bad("An account with that email or phone already exists.", 409);
      }
      throw e;
    }
  }
  if (!member) return bad("We could not allocate a member number — please try again.", 500);

  await seedMemberDefaults(member.id, member.memberNumber);
  await issueEmailOtp(member.id); // emails the 6-digit verification code
  await setSessionCookie({ sub: member.id, role: "member", email: member.email });

  return json({ member: memberDTO(member) }, 201);
}
