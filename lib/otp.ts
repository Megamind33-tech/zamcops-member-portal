import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/notify";

// Email verification codes: a 6-digit OTP, stored as a bcrypt hash on the
// member row, valid for 10 minutes, invalidated after 5 wrong attempts.

export const OTP_TTL_MS = 10 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;

// Generates, stores and emails a fresh code. Best-effort: an email-provider
// outage must not fail registration — the member can hit "Resend code".
export async function issueEmailOtp(memberId: string): Promise<void> {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member || member.emailVerifiedAt) return;

  const code = String(randomInt(100000, 1000000));
  await prisma.member.update({
    where: { id: memberId },
    data: {
      otpHash: await bcrypt.hash(code, 10),
      otpExpiresAt: new Date(Date.now() + OTP_TTL_MS),
      otpAttempts: 0,
    },
  });

  try {
    await sendTransactionalEmail(
      member.email,
      "Your verification code",
      `Your ZAMCOPS email verification code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`
    );
  } catch (err) {
    console.error("[otp] send failed:", err);
  }
}

export type VerifyResult = { ok: true } | { ok: false; error: string };

// Checks a submitted code and marks the email verified on success.
export async function verifyEmailOtp(memberId: string, code: string): Promise<VerifyResult> {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) return { ok: false, error: "Not authenticated." };
  if (member.emailVerifiedAt) return { ok: true };

  if (!member.otpHash || !member.otpExpiresAt) {
    return { ok: false, error: "No active code — press “Resend code” to get a new one." };
  }
  if (member.otpExpiresAt.getTime() < Date.now()) {
    return { ok: false, error: "That code has expired — press “Resend code” to get a new one." };
  }
  if (member.otpAttempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, error: "Too many wrong attempts — press “Resend code” to get a new one." };
  }

  const match = /^\d{6}$/.test(code) && (await bcrypt.compare(code, member.otpHash));
  if (!match) {
    await prisma.member.update({
      where: { id: memberId },
      data: { otpAttempts: { increment: 1 } },
    });
    return { ok: false, error: "That code is not correct — check the email and try again." };
  }

  await prisma.member.update({
    where: { id: memberId },
    data: { emailVerifiedAt: new Date(), otpHash: "", otpExpiresAt: null, otpAttempts: 0 },
  });
  return { ok: true };
}
