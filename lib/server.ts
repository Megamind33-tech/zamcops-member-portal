import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const bad = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export function genMemberNumber(): string {
  const year = new Date().getFullYear();
  const n = Math.floor(10000 + Math.random() * 89999);
  return `ZAM-${year}-${n}`;
}

// Creates a member's starter records: royalty row, welcome notification and a
// membership application receipt.
export async function seedMemberDefaults(memberId: string, memberNumber: string) {
  await prisma.royaltySummary.create({ data: { ownerId: memberId } });
  await prisma.notification.create({
    data: {
      ownerId: memberId,
      title: "Welcome to ZAMCOPS",
      body: "Your membership application has been received. Complete your profile to speed up verification.",
      type: "info",
    },
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
