import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, setSessionCookie } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Ensures the staff account configured via env exists, then signs in.
// Returns an error message when seeding is refused (default password in
// production), null otherwise.
async function ensureSeedAdmin(): Promise<string | null> {
  const email = (process.env.ADMIN_EMAIL || "admin@zamcops.org.zm").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "ZAMCOPS Staff";
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) return null;
  if (!password && process.env.NODE_ENV === "production") {
    return "No staff account exists and ADMIN_PASSWORD is not configured — refusing to create one with the default password in production. Set ADMIN_EMAIL/ADMIN_PASSWORD and try again.";
  }
  await prisma.adminUser.create({
    data: { email, name, passwordHash: await hashPassword(password || "admin123") },
  });
  return null;
}

export async function POST(req: Request) {
  if (!rateLimit(`admin-login:${clientIp(req)}`, 10, 5 * 60_000)) {
    return bad("Too many sign-in attempts — please wait a few minutes and try again.", 429);
  }

  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid request body.");
  const { email, password } = body;
  if (!email || !password) return bad("Enter your staff email and password.");

  const seedError = await ensureSeedAdmin();
  if (seedError) return bad(seedError, 503);

  const admin = await prisma.adminUser.findUnique({
    where: { email: String(email).trim().toLowerCase() },
  });
  if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
    return bad("Invalid staff credentials.", 401);
  }

  await setSessionCookie({ sub: admin.id, role: "admin", email: admin.email });
  return json({ admin: { id: admin.id, email: admin.email, name: admin.name } });
}
