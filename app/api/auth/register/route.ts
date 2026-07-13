import { prisma } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { json, bad, genMemberNumber, seedMemberDefaults } from "@/lib/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { memberDTO } from "@/lib/serialize";
import { issueEmailOtp } from "@/lib/otp";

export const runtime = "nodejs";

// ZAMCOPS membership is open to composers, authors and publishers.
const ROLES = ["Composer", "Author", "Publisher"];

export async function POST(req: Request) {
  if (!rateLimit(`register:${clientIp(req)}`, 5, 15 * 60_000)) {
    return bad("Too many registration attempts — please wait a while and try again.", 429);
  }

  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid request body.");

  const { fullName, stageName, nrcOrPassport, phone, email, role, password } = body;
  if (!fullName || !phone || !email || !password) return bad("Please complete all required fields.");
  if (String(password).length < 6) return bad("Password must be at least 6 characters.");
  if (role && !ROLES.includes(role)) return bad("Invalid role.");

  const existing = await prisma.member.findFirst({
    where: { OR: [{ email: String(email).toLowerCase() }, { phone }] },
  });
  if (existing) return bad("An account with that email or phone already exists.", 409);

  const memberNumber = genMemberNumber();
  const member = await prisma.member.create({
    data: {
      memberNumber,
      email: String(email).toLowerCase(),
      phone,
      passwordHash: await hashPassword(password),
      fullName,
      stageName: stageName ?? "",
      nrcOrPassport: nrcOrPassport ?? "",
      role: role ?? "Composer",
    },
  });

  await seedMemberDefaults(member.id, memberNumber);
  await issueEmailOtp(member.id); // emails the 6-digit verification code
  await setSessionCookie({ sub: member.id, role: "member", email: member.email });

  return json({ member: memberDTO(member) }, 201);
}
