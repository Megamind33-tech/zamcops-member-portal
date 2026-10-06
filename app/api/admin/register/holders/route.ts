import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import type { Prisma } from "@prisma/client";
import { READY, INVITED, NO_EMAIL, inviteEmailFor } from "@/lib/invites";

export const runtime = "nodejs";

const PAGE_SIZE = 50;

type Ident = { code: string; label: string; value: string };
const parseIdents = (s: string): Ident[] => {
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
};

// The WIPO Connect right-holder register, searchable and paged on the server —
// about twenty thousand rows, far too many to ship through the admin overview.
//   ?q=      name, IPI, NRC, WIPO id or WIPOCOS id
//   ?filter= member (linked to a portal account) | ipi (has an IPI number)
//            | ready (has an email, not invited) | invited | noemail
//   ?scope=  affiliated (the register shows them as ZAMCOPS members) | other
//   ?page=   1-based
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const filter = url.searchParams.get("filter") ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);

  const and: Prisma.RightHolderWhereInput[] = [];
  if (q) {
    // Each word must appear in the main name or in any other name the person is
    // known by (pseudonyms, stage names) — "mc wabwino" finds "WABWINO MC" and a
    // pseudonym row alike. Number-like fields match the whole search text.
    const words = q.split(/\s+/).filter(Boolean).slice(0, 5);
    and.push({
      OR: [
        {
          AND: words.map((w) => ({
            OR: [
              { displayName: { contains: w, mode: "insensitive" as const } },
              { names: { some: { OR: [{ name: { contains: w, mode: "insensitive" as const } }, { firstName: { contains: w, mode: "insensitive" as const } }] } } },
            ],
          })),
        },
        { ipiNumber: { contains: q } },
        { ipiBaseNumber: { contains: q } },
        { nrc: { contains: q, mode: "insensitive" } },
        { wipoId: q },
        // the WIPOCOS id lives in the identifier list
        { identifiers: { contains: `"value":"${q.replace(/["\\]/g, "")}"`, mode: "insensitive" } },
      ],
    });
  }
  // WIPO Connect Rights Owners search form
  const sp = url.searchParams;
  const ci = (v: string) => ({ contains: v, mode: "insensitive" as const });
  const idQ = (sp.get("identifier") ?? "").trim().slice(0, 60);
  if (idQ) {
    if (sp.get("onlyMainId")) and.push({ wipoId: { in: [idQ, idQ] } });
    else and.push({ OR: [{ wipoId: { contains: idQ } }, { ipiNumber: idQ }, { ipiBaseNumber: idQ }, { nrc: ci(idQ) }, { identifiers: { contains: idQ, mode: "insensitive" } }] });
  }
  const lastName = (sp.get("lastName") ?? "").trim().slice(0, 80);
  if (lastName) and.push({ OR: [{ displayName: ci(lastName) }, { lastName: ci(lastName) }, { names: { some: { name: ci(lastName) } } }] });
  const firstName = (sp.get("firstName") ?? "").trim().slice(0, 80);
  if (firstName) and.push({ OR: [{ firstName: ci(firstName) }, { names: { some: { firstName: ci(firstName) } } }] });
  if (sp.get("type") === "N") and.push({ kind: "Person" });
  if (sp.get("type") === "L") and.push({ kind: { not: "Person" } });
  const cmo = sp.get("cmoOfAffiliation");
  if (cmo === "133") and.push({ isAffiliated: true });
  else if (cmo === "ALL_BUT_CURRENT_CMO") and.push({ isAffiliated: false });
  if (sp.get("statusCode")) and.push({ status: { equals: sp.get("statusCode")!, mode: "insensitive" } });
  if ((sp.get("dateBirth") ?? "").trim()) and.push({ birthDate: { startsWith: sp.get("dateBirth")!.trim().slice(0, 10) } });
  const scope = url.searchParams.get("scope");
  if (scope === "affiliated") and.push({ isAffiliated: true });
  if (scope === "other") and.push({ isAffiliated: false });
  const memberIdParam = url.searchParams.get("memberId");
  if (memberIdParam) and.push({ memberId: memberIdParam });
  if (filter === "member") and.push({ memberId: { not: null } });
  if (filter === "ipi") and.push({ NOT: { ipiNumber: "" } });
  if (filter === "ready") and.push(READY);
  if (filter === "invited") and.push(INVITED);
  if (filter === "noemail") and.push(NO_EMAIL);
  const where: Prisma.RightHolderWhereInput = and.length ? { AND: and } : {};

  const [rows, total, all, withIpi, linked, ready, invited, noEmail, affiliated] = await Promise.all([
    prisma.rightHolder.findMany({
      where,
      orderBy: { displayName: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        member: { select: { id: true, memberNumber: true } },
        contacts: { select: { email: true, value: true } },
        names: { select: { name: true, firstName: true, ipiNameNumber: true, nameType: true } },
        _count: { select: { shares: true } },
      },
    }),
    prisma.rightHolder.count({ where }),
    prisma.rightHolder.count(),
    prisma.rightHolder.count({ where: { NOT: { ipiNumber: "" } } }),
    prisma.rightHolder.count({ where: { memberId: { not: null } } }),
    prisma.rightHolder.count({ where: READY }),
    prisma.rightHolder.count({ where: INVITED }),
    prisma.rightHolder.count({ where: NO_EMAIL }),
    prisma.rightHolder.count({ where: { isAffiliated: true } }),
  ]);

  return json({
    page,
    pageSize: PAGE_SIZE,
    total,
    stats: { all, withIpi, linked, ready, invited, noEmail, affiliated, other: all - affiliated },
    holders: rows.map((h) => ({
      id: h.id,
      wipoId: h.wipoId,
      displayName: h.displayName,
      kind: h.kind,
      ipiNumber: h.ipiNumber,
      ipiBaseNumber: h.ipiBaseNumber,
      wipocosId: parseIdents(h.identifiers).find((i) => i.code === "WIPOCOS")?.value ?? "",
      identifiers: parseIdents(h.identifiers).map((i) => ({ code: i.code, value: i.value })),
      names: h.names.map((n) => ({ name: [n.firstName, n.name].filter(Boolean).join(" "), ipi: n.ipiNameNumber })),
      birthDate: h.birthDate,
      nrc: h.nrc,
      status: h.status,
      isAffiliated: h.isAffiliated,
      shareCount: h._count.shares,
      member: h.member,
      email: inviteEmailFor(h),
      inviteStatus: h.member ? "member" : h.inviteSentAt ? "invited" : inviteEmailFor(h) ? "ready" : "noemail",
      inviteSentAt: h.inviteSentAt,
    })),
  });
}
