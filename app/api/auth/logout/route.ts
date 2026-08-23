import { NextResponse } from "next/server";
import { attachClearedSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return attachClearedSessionCookie(
    NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store, max-age=0" } }),
  );
}
