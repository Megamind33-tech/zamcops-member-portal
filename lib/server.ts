import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyMember } from "@/lib/notify";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: NO_STORE });
export const bad = (message: string, status = 400) => NextResponse.json({ error: message }, { status, headers: NO_STORE });

// List queries omit `data` to keep payloads small, so DTOs can't see inline
// bytes. Attach `hasData` from a companion id-only query (rows with data != "")
// so `hasFile` still reflects inline-stored files.
export function markHasData<T extends { id: string }>(
  rows: T[],
  idsWithData: { id: string }[],
): (T & { hasData: boolean })[] {
  const set = new Set(idsWithData.map((r) => r.id));
  return rows.map((r) => ({ ...r, hasData: set.has(r.id) }));
}

// Canonical phone form used for storage and lookups: trimmed, with spaces,
// dashes and parentheses removed (e.g. "+260 97 000-0000" → "+260970000000").
export function normalizePhone(raw: unknown): string {
  return String(raw ?? "").trim().replace(/[\s()-]/g, "");
}

export function genMemberNumber(): string {
  const year = new Date().getFullYear();
  const n = Math.floor(10000 + Math.random() * 89999);
  return `ZAM-${year}-${n}`;
}

// Creates a member's starter records: royalty row, welcome notification and a
// membership application receipt.
export async function seedMemberDefaults(memberId: string, memberNumber: string) {
  await prisma.royaltySummary.create({ data: { ownerId: memberId } });
  await notifyMember(memberId, {
    title: "Welcome to ZAMCOPS",
    body: "Your membership application has been received. Complete your profile to speed up verification.",
    type: "info",
    href: "/application",
  });
  await prisma.statement.create({
    data: {
      ownerId: memberId,
      type: "Membership Receipt",
      title: `${new Date().getFullYear()} Membership Application`,
      reference: `MR-${memberNumber.split("-").slice(1).join("-")}`,
      amount: 350,
    },
  });
}
