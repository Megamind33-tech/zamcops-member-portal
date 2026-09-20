import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword, jsonWithSession } from "@/lib/auth";
import { bad, genMemberNumber, normalizePhone, seedMemberDefaults } from "@/lib/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { memberDTO } from "@/lib/serialize";
import { issueEmailOtp } from "@/lib/otp";
import { isMemberRole } from "@/lib/roles";
import { prefillFromAccount, formTypeForRole } from "@/lib/applicationPrefill";
import { FORM_TYPES, type ApplicationFormType } from "@/lib/applicationForms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!rateLimit(`register:${clientIp(req)}`, 5, 15 * 60_000)) {
    return bad("Too many registration attempts — please wait a while and try again.", 429);
  }

  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid request body.");

  const { fullName, stageName, nrcOrPassport, phone, email, role, password, membershipType } = body;
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

  // The membership application starts here, already carrying everything just
  // given. Asking for a surname, an NRC, a phone number and an email a second
  // time on the application form is the repetition this removes — the member
  // opens a form with those answers in place and fills only what is new.
  //
  // A group registers at sign-up like anyone else; which form they get is
  // their choice here, and it can be changed on the application itself.
  const formType: ApplicationFormType = FORM_TYPES.includes(membershipType as ApplicationFormType)
    ? (membershipType as ApplicationFormType)
    : formTypeForRole(member.role);
  try {
    await prisma.membershipApplication.create({
      data: {
        ownerId: member.id,
        formType,
        payload: JSON.stringify(prefillFromAccount(member, formType)),
        status: "Draft",
      },
    });
  } catch (err) {
    // A member without a draft application can still create one from the
    // Membership page, so this must not fail the registration itself.
    console.error("[register] could not start the membership application:", err);
  }

  await issueEmailOtp(member.id); // emails the 6-digit verification code

  return jsonWithSession({ member: memberDTO(member) }, { sub: member.id, role: "member", email: member.email }, 201);
}
