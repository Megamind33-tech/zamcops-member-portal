import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, jsonWithSession } from "@/lib/auth";
import { bad } from "@/lib/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The password shipped in .env.example, and the fallback used in development.
// It is published in this repository, so it must never guard a real console.
const DEFAULT_ADMIN_PASSWORD = "admin123";

// Ensures the staff account configured via env exists, then signs in.
// Returns an error message when seeding is refused (default password in
// production), null otherwise.
async function ensureSeedAdmin(): Promise<string | null> {
  const email = (process.env.ADMIN_EMAIL || "admin@zamcops.org.zm").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "ZAMCOPS Staff";
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) return null;

  // Refuse the default in production whether it arrived by being left unset or
  // by being copied verbatim out of .env.example. The second case is the one
  // that actually happens: docker-compose.yml marks ADMIN_PASSWORD required, so
  // it is never unset there — only, too often, still "admin123".
  if (process.env.NODE_ENV === "production" && (!password || password === DEFAULT_ADMIN_PASSWORD)) {
    return "No staff account exists and ADMIN_PASSWORD is unset or still the default — refusing to create one with a password published in the source. Set ADMIN_EMAIL/ADMIN_PASSWORD to real values and try again.";
  }

  await prisma.adminUser.create({
    data: { email, name, passwordHash: await hashPassword(password || DEFAULT_ADMIN_PASSWORD) },
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

  return jsonWithSession(
    { admin: { id: admin.id, email: admin.email, name: admin.name } },
    { sub: admin.id, role: "admin", email: admin.email },
  );
}
