import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { inviteEmailFor, emailConfigured } from "@/lib/invites";
import { suggestMembers } from "@/lib/registerLink";
import { logAudit, diffFields } from "@/lib/audit";

export const runtime = "nodejs";

// One right-holder from the WIPO Connect register, with everything WIPO holds
// on them: names and their IPI numbers, addresses, contacts, the works they
// hold a share in, and what they were allocated in distribution runs.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const { id } = await params;
  const h = await prisma.rightHolder.findUnique({
    where: { id },
    include: {
      names: true,
      addresses: true,
      contacts: true,
      member: { select: { id: true, memberNumber: true, fullName: true } },
    },
  });
  if (!h) return bad("Right-holder not found.", 404);

  const [shareCount, shares, lineTotals, lineCount] = await Promise.all([
    prisma.workShare.count({ where: { rightHolderId: id } }),
    prisma.workShare.findMany({
      where: { rightHolderId: id },
      take: 100,
      orderBy: { work: { title: "asc" } },
      include: { work: { select: { id: true, title: true, wipoId: true, iswc: true } } },
    }),
    prisma.distributionLine.aggregate({ where: { rightHolderId: id }, _sum: { amount: true } }),
    prisma.distributionLine.count({ where: { rightHolderId: id } }),
  ]);

  let identifiers: unknown = [];
  try {
    identifiers = JSON.parse(h.identifiers);
  } catch {
    /* leave empty */
  }

  const suggestions = h.memberId ? [] : await suggestMembers(h);

  // never send the token hash to the browser
  const { inviteTokenHash: _hash, ...safe } = h;
  void _hash;
  return json({
    holder: { ...safe, identifiers },
    invite: {
      email: inviteEmailFor(h),
      typedEmail: h.inviteEmail,
      sentAt: h.inviteSentAt,
      expiresAt: h.inviteExpiresAt,
      count: h.inviteCount,
      canSend: emailConfigured(),
    },
    suggestions,
    shareCount,
    shares: shares.map((s) => ({
      id: s.id,
      work: s.work,
      roleCode: s.roleCode,
      isPublisher: s.isPublisher,
      rightType: s.rightType,
      share: s.share,
      territoryFormula: s.territoryFormula,
    })),
    distributions: { lines: lineCount, totalAmount: lineTotals._sum.amount ?? 0 },
  });
}

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const IDENTITY: [string, number, string][] = [
  ["displayName", 200, "Name"],
  ["firstName", 120, "First name"],
  ["lastName", 120, "Last name"],
  ["kind", 20, "Type"],
  ["sex", 20, "Sex"],
  ["birthDate", 20, "Born"],
  ["deathDate", 20, "Died"],
  ["status", 40, "Status"],
  ["region", 80, "Region"],
  ["nextOfKin", 200, "Next of kin"],
  ["spouse", 200, "Spouse"],
  ["nrc", 40, "NRC / ID"],
  ["ipiNumber", 20, "IPI name number"],
  ["ipiBaseNumber", 20, "IPI base number"],
];

// Edit a right-holder: identity fields, and/or replace the complete list of
// addresses, contacts and (add or amend — never delete) the names they are
// known by. The WIPO Connect import still wins on a re-run, as documented in
// scripts/import-wipo.mjs.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return bad("Invalid request body.");

  const existing = await prisma.rightHolder.findUnique({ where: { id }, include: { names: true, addresses: true, contacts: true } });
  if (!existing) return bad("Right-holder not found.", 404);

  const data: Record<string, string> = {};
  for (const [k, max] of IDENTITY) {
    if (b[k] === undefined) continue;
    data[k] = str(b[k], max);
  }
  if (data.displayName !== undefined && !data.displayName) return bad("A right-holder needs a name.");
  if (data.kind !== undefined && !["Person", "Legal entity"].includes(data.kind)) return bad("Type must be Person or Legal entity.");

  const addresses = Array.isArray(b.addresses)
    ? b.addresses.map((a: Record<string, unknown>) => ({
        line1: str(a.line1, 200), line2: str(a.line2, 200), line3: str(a.line3, 200), city: str(a.city, 100),
        province: str(a.province, 100), postcode: str(a.postcode, 20), country: str(a.country, 100), addressType: str(a.addressType, 40),
      })).filter((a: Record<string, string>) => Object.values(a).some(Boolean))
    : null;
  const contacts = Array.isArray(b.contacts)
    ? b.contacts.map((c: Record<string, unknown>) => ({
        contactType: str(c.contactType, 40), value: str(c.value, 200), email: str(c.email, 200), phone: str(c.phone, 60), contactName: str(c.contactName, 200), department: str(c.department, 100),
      })).filter((c: Record<string, string>) => c.value || c.email || c.phone || c.contactName)
    : null;
  const names = Array.isArray(b.names)
    ? b.names.map((n: Record<string, unknown>) => ({ id: n.id ? String(n.id) : "", name: str(n.name, 200), firstName: str(n.firstName, 120), nameType: str(n.nameType, 40), ipiNameNumber: str(n.ipiNameNumber, 20) })).filter((n: { name: string }) => n.name)
    : null;
  const ownNames = new Set(existing.names.map((n) => n.id));
  if (names?.some((n: { id: string }) => n.id && !ownNames.has(n.id))) return bad("One of those names does not belong to this right-holder.");

  if (!Object.keys(data).length && !addresses && !contacts && !names) return bad("Nothing to update.");

  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length) await tx.rightHolder.update({ where: { id }, data });
    if (addresses) {
      await tx.rightHolderAddress.deleteMany({ where: { rightHolderId: id } });
      await tx.rightHolderAddress.createMany({ data: addresses.map((a: Record<string, string>) => ({ ...a, rightHolderId: id })) });
    }
    if (contacts) {
      await tx.rightHolderContact.deleteMany({ where: { rightHolderId: id } });
      await tx.rightHolderContact.createMany({ data: contacts.map((c: Record<string, string>) => ({ ...c, rightHolderId: id })) });
    }
    if (names) {
      for (const n of names as { id: string; name: string; firstName: string; nameType: string; ipiNameNumber: string }[]) {
        if (n.id) await tx.rightHolderName.update({ where: { id: n.id }, data: { name: n.name, firstName: n.firstName, nameType: n.nameType, ipiNameNumber: n.ipiNameNumber } });
        else await tx.rightHolderName.create({ data: { wipoNameId: `local_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`, rightHolderId: id, name: n.name, firstName: n.firstName, nameType: n.nameType, ipiNameNumber: n.ipiNameNumber } });
      }
    }
  });

  const changes = diffFields(existing as unknown as Record<string, unknown>, data, Object.fromEntries(IDENTITY.map(([k, , label]) => [k, label])));
  if (addresses) changes.push({ field: "Addresses", from: `${existing.addresses.length}`, to: `${addresses.length}` });
  if (contacts) changes.push({ field: "Contacts", from: `${existing.contacts.length}`, to: `${contacts.length}` });
  if (names) changes.push({ field: "Names", from: `${existing.names.length}`, to: `${Math.max(existing.names.length, names.length)}` });
  await logAudit(session.sub, "right-holder.updated", {
    targetType: "Right-holder",
    targetId: id,
    summary: `Edited right-holder “${data.displayName ?? existing.displayName}”`,
    changes,
  });
  return json({ ok: true });
}
