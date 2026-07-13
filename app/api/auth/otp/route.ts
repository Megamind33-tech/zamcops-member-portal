import { requireMember } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { issueEmailOtp, verifyEmailOtp } from "@/lib/otp";

export const runtime = "nodejs";

// Email verification codes for the signed-in member:
//   { action: "send" }              — (re)issue a code to their email
//   { action: "verify", code }      — check a code and mark the email verified
export async function POST(req: Request) {
  const session = await requireMember();
  if (!session) return bad("Not authenticated.", 401);

  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request body.");

  if (b.action === "send") {
    if (
      !rateLimit(`otp-send:${session.sub}`, 3, 10 * 60_000) ||
      !rateLimit(`otp-send-ip:${clientIp(req)}`, 10, 10 * 60_000)
    ) {
      return bad("Too many codes requested — please wait a few minutes and try again.", 429);
    }
    await issueEmailOtp(session.sub);
    return json({ ok: true });
  }

  if (b.action === "verify") {
    if (!rateLimit(`otp-verify:${session.sub}`, 10, 10 * 60_000)) {
      return bad("Too many attempts — please wait a few minutes and try again.", 429);
    }
    const result = await verifyEmailOtp(session.sub, String(b.code ?? "").trim());
    if (!result.ok) return bad(result.error);
    return json({ ok: true });
  }

  return bad("Unknown action.");
}
