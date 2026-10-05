// Invitations for right-holders on the WIPO Connect register who have no portal
// account yet.
//
// Staff add an email address (or the contact email WIPO already holds is used)
// and send an invite. The email carries a link with a one-time token; only the
// token's SHA-256 is stored, so a database read cannot be turned into working
// links. Signing up through the link creates the account and links it to the
// right-holder record, carrying over the IPI numbers and other details the
// society already holds.

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/notify";
import { portalUrl } from "@/lib/email";

import type { Prisma } from "@prisma/client";

export const INVITE_DAYS = 14;

// Right-holders with no account, never invited, and an email to send to.
export const READY: Prisma.RightHolderWhereInput = {
  memberId: null,
  inviteSentAt: null,
  OR: [{ NOT: { inviteEmail: "" } }, { contacts: { some: { email: { contains: "@" } } } }],
};
// No account and no email anywhere on file: staff need to add one.
export const NO_EMAIL: Prisma.RightHolderWhereInput = {
  memberId: null,
  inviteEmail: "",
  NOT: { contacts: { some: { email: { contains: "@" } } } },
};
export const INVITED: Prisma.RightHolderWhereInput = { memberId: null, inviteSentAt: { not: null } };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const validEmail = (s: string) => EMAIL_RE.test(s.trim());
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

type HolderForEmail = { inviteEmail: string; contacts: { email: string; value: string }[] };

/** The address to invite: the one staff typed, else one WIPO Connect holds. */
export function inviteEmailFor(h: HolderForEmail): string {
  const typed = h.inviteEmail.trim().toLowerCase();
  if (validEmail(typed)) return typed;
  for (const c of h.contacts) {
    for (const v of [c.email, c.value]) {
      if (v && validEmail(v)) return v.trim().toLowerCase();
    }
  }
  return "";
}

type HolderRow = {
  displayName: string;
  ipiNumber: string;
  ipiBaseNumber: string;
  wipoId: string;
  nrc: string;
  sex: string;
  birthDate: string;
  region: string;
  nextOfKin: string;
  addresses: { line1: string; line2: string; line3: string; city: string; province: string }[];
};

/** Member columns the society already holds for a right-holder. Empty values are omitted. */
export function memberFieldsFromHolder(h: HolderRow) {
  const a = h.addresses[0];
  const addr = a ? [a.line1, a.line2, a.line3, a.city].filter((x, i, arr) => x && arr.indexOf(x) === i).join(", ") : "";
  const sex = /^m/i.test(h.sex) ? "Male" : /^f/i.test(h.sex) ? "Female" : "";
  const out: Record<string, string> = {
    ipiNumber: h.ipiNumber,
    ipiBaseNumber: h.ipiBaseNumber,
    wipoId: h.wipoId,
    nrcOrPassport: h.nrc,
    dateOfBirth: h.birthDate,
    gender: sex,
    address: addr,
    province: a?.province ?? "",
    district: h.region,
    nextOfKinName: h.nextOfKin,
  };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v));
}

/** A holder whose invitation link is valid right now, or null. */
export async function findInvite(token: string) {
  const t = (token ?? "").trim();
  if (!/^[a-f0-9]{64}$/.test(t)) return null;
  return prisma.rightHolder.findFirst({
    where: { inviteTokenHash: hashToken(t), memberId: null, inviteExpiresAt: { gt: new Date() } },
    include: { addresses: true },
  });
}

export type SendResult = { ok: true; sentTo: string } | { ok: false; error: string };

export function emailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY || "").trim();
}

/** Issue a fresh link (replacing any earlier one) and email it. */
export async function sendInvite(holderId: string): Promise<SendResult> {
  if (!emailConfigured()) return { ok: false, error: "Email is not set up on the server yet (RESEND_API_KEY)." };

  const h = await prisma.rightHolder.findUnique({ where: { id: holderId }, include: { contacts: true } });
  if (!h) return { ok: false, error: "Right-holder not found." };
  if (h.memberId) return { ok: false, error: "This person already has a portal account." };

  const to = inviteEmailFor(h);
  if (!to) return { ok: false, error: "No email address on file — add one first." };

  const taken = await prisma.member.findFirst({ where: { email: to }, select: { id: true } });
  if (taken) return { ok: false, error: "A portal account already uses that email — link it by hand instead of inviting." };

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);
  await prisma.rightHolder.update({
    where: { id: holderId },
    data: {
      inviteTokenHash: hashToken(token),
      inviteSentAt: new Date(),
      inviteExpiresAt: expires,
      inviteCount: { increment: 1 },
    },
  });

  try {
    await sendTransactionalEmail(to, {
      subject: "You are invited to the ZAMCOPS member portal",
      preheader: "Create your account to see your works and distributions.",
      heading: "Your ZAMCOPS member portal",
      greeting: `Dear ${h.displayName},`,
      paragraphs: [
        "The Zambian Music Copyright Protection Society now has a member portal. Your details are already on the society's register, so your account will be linked to them when you sign up.",
        "Through the portal you can see your registered works, follow distributions and keep your contact details up to date.",
      ],
      facts: h.ipiNumber ? [{ label: "IPI number on record", value: h.ipiNumber }] : undefined,
      action: { label: "Create my account", href: portalUrl(`/register?invite=${token}`) },
      footnote: `This link works once and expires in ${INVITE_DAYS} days. If you were not expecting this message you can ignore it.`,
    });
  } catch (err) {
    console.error("[invite] email could not be sent:", err);
    return { ok: false, error: "The email could not be sent — the mail service did not respond. Try again shortly." };
  }

  return { ok: true, sentTo: to };
}
