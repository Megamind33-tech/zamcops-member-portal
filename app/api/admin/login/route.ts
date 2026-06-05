import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, setSessionCookie } from "@/lib/auth";
import { json, bad } from "@/lib/server";

export const runtime = "nodejs";

// Ensures the staff account configured via env exists, then signs in.
async function ensureSeedAdmin() {
  const email = (process.env.ADMIN_EMAIL || "admin@zamcops.org.zm").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const name = process.env.ADMIN_NAME || "ZAMCOPS Staff";
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (!existing) {
    await prisma.adminUser.create({
      data: { email, name, passwordHash: await hashPassword(password) },
    });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid request body.");
  const { email, password } = body;
  if (!email || !password) return bad("Enter your staff email and password.");

  await ensureSeedAdmin();

  const admin = await prisma.adminUser.findUnique({
    where: { email: String(email).trim().toLowerCase() },
  });
  if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
    return bad("Invalid staff credentials.", 401);
  }

  await setSessionCookie({ sub: admin.id, role: "admin", email: admin.email });
  return json({ admin: { id: admin.id, email: admin.email, name: admin.name } });
}
