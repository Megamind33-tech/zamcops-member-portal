import { prisma } from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { json, bad } from "@/lib/server";

export const runtime = "nodejs";

// Unambiguous alphabet (no 0/O, 1/l/I) for temporary passwords staff read out.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

function tempPassword(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (x) => ALPHABET[x % ALPHABET.length]).join("");
}

// Staff-assisted password reset (no email service yet): sets a one-time
// temporary password on the member's account and returns it ONCE so staff can
// pass it to the verified member. The member should change it after signing in.
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const b = await req.json().catch(() => null);
  if (!b?.id) return bad("A member id is required.");

  const member = await prisma.member.findUnique({ where: { id: b.id } });
  if (!member) return bad("Member not found.", 404);

  const password = tempPassword();
  await prisma.member.update({
    where: { id: member.id },
    data: { passwordHash: await hashPassword(password) },
  });

  await prisma.notification.create({
    data: {
      ownerId: member.id,
      title: "Password reset by ZAMCOPS staff",
      body: "A temporary password was issued for your account. Sign in with it, then change your password under Settings.",
      type: "warning",
    },
  });

  return json({ tempPassword: password });
}
