import { clearSessionCookie } from "@/lib/auth";
import { json } from "@/lib/server";

export const runtime = "nodejs";

export async function POST() {
  await clearSessionCookie();
  return json({ ok: true });
}
