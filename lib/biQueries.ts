import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export type BiResult = { columns: string[]; rows: (string | number)[][] };
type Params = Record<string, string>;

const LIMIT = 20000;
const mainW = (wipoId: string) => (wipoId.startsWith("local_") ? "" : `133-${wipoId}-W`);
const money = (n: number) => Math.round(n * 100) / 100;
const iso = (d: Date) => d.toISOString().slice(0, 10);

async function distribution(code: string) {
  const c = (code ?? "").trim();
  if (!c) throw new Error("Give a Distribution Code.");
  const d = await prisma.distribution.findFirst({ where: { OR: [{ code: c }, { id: c }] }, select: { id: true, code: true, periodLabel: true } });
  if (!d) throw new Error(`No distribution has the code ${c}.`);
  return d;
}

// holders by an age rule on their birth date (YYYY-MM-DD)
async function holdersWhere(where: Prisma.RightHolderWhereInput, cols: (h: { wipoId: string; displayName: string; ipiNumber: string; birthDate: string; deathDate: string; status: string; kind: string }) => (string | number)[], head: string[]): Promise<BiResult> {
  const hs = await prisma.rightHolder.findMany({ where, orderBy: { displayName: "asc" }, take: LIMIT, select: { wipoId: true, displayName: true, ipiNumber: true, birthDate: true, deathDate: true, status: true, kind: true } });
  return { columns: head, rows: hs.map(cols) };
}

const RUNNERS: Record<string, (p: Params) => Promise<BiResult>> = {
  async workIdentifier(p) {
    const code = (p.identifier_code ?? "").trim();
    if (!code) throw new Error("Give an IdentifierCode, for example ISWC or ISRC.");
    const ws = await prisma.registryWork.findMany({ where: { identifiers: { contains: `"code":"${code.replace(/["\\]/g, "")}"`, mode: "insensitive" } }, take: LIMIT, orderBy: { title: "asc" }, select: { wipoId: true, title: true, identifiers: true } });
    const rows = ws.map((w) => {
      let v = "";
      try {
        v = (JSON.parse(w.identifiers) as { code: string; value: string }[]).find((i) => i.code.toLowerCase() === code.toLowerCase())?.value ?? "";
      } catch {
        /* none */
      }
      return [mainW(w.wipoId), w.title, code.toUpperCase(), v];
    });
    return { columns: ["Main Id", "Title", "Identifier", "Value"], rows };
  },

  async workStatus() {
    const g = await prisma.registryWork.groupBy({ by: ["status"], _count: { _all: true }, orderBy: { status: "asc" } });
    return { columns: ["Status", "Works"], rows: g.map((x) => [x.status || "(none)", x._count._all]) };
  },

  async distributableStatus() {
    const r = await prisma.$queryRaw<{ status: string; n: bigint }[]>`
      SELECT CASE WHEN s >= 99.99 THEN 'Fully Distributable' WHEN s > 0 THEN 'Partially Distributable' ELSE 'Not Distributable' END AS status, count(*)::bigint AS n
      FROM (SELECT w.id, COALESCE(SUM(ws.share) FILTER (WHERE ws."rightHolderId" IS NOT NULL AND lower(trim(ws."rightType")) = 'performing'), 0) AS s
            FROM "RegistryWork" w LEFT JOIN "WorkShare" ws ON ws."workId" = w.id GROUP BY w.id) t
      GROUP BY 1 ORDER BY 1`;
    return { columns: ["Distributable Status", "Works"], rows: r.map((x) => [x.status, Number(x.n)]) };
  },

  async distributed() {
    const ds = await prisma.distribution.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, code: true, periodLabel: true } });
    const sums = await prisma.distributionLine.groupBy({ by: ["distributionId"], _sum: { amount: true, adminFee: true, reserved: true } });
    const by = new Map(sums.map((s) => [s.distributionId, s._sum]));
    return {
      columns: ["Distribution", "Name", "Allocated", "Admin fee", "Reserved"],
      rows: ds.map((d) => [d.code, d.periodLabel, money(by.get(d.id)?.amount ?? 0), money(by.get(d.id)?.adminFee ?? 0), money(by.get(d.id)?.reserved ?? 0)]),
    };
  },

  async distributedPerWork(p) {
    const main = (p.work_main_id ?? "").trim().replace(/^133-|-W$/gi, "");
    const cc = (p.cc ?? "").trim().toUpperCase();
    if (!main && !cc) throw new Error("Give a Main Id or a CC.");
    const works = await prisma.registryWork.findMany({ where: { ...(main ? { wipoId: main } : {}), ...(cc ? { creationClass: cc } : {}) }, select: { id: true, wipoId: true, title: true, creationClass: true }, take: 2000 });
    const sums = await prisma.distributionLine.groupBy({ by: ["workId"], where: { workId: { in: works.map((w) => w.id) } }, _sum: { amount: true } });
    const by = new Map(sums.map((s) => [s.workId, s._sum.amount ?? 0]));
    return { columns: ["Main Id", "Title", "CC", "Distributed"], rows: works.map((w) => [mainW(w.wipoId), w.title, w.creationClass, money(by.get(w.id) ?? 0)]) };
  },

  async workEntered(p) {
    const from = p.date_from ?? "";
    const to = p.date_to ?? "";
    if (!from || !to) throw new Error("Give both From and To dates.");
    const ws = await prisma.registryWork.findMany({ where: { registeredAt: { gte: from, lte: to } }, orderBy: { registeredAt: "asc" }, take: LIMIT, select: { wipoId: true, title: true, registeredAt: true, creationClass: true, status: true } });
    return { columns: ["Main Id", "Title", "Registration date", "CC", "Status"], rows: ws.map((w) => [mainW(w.wipoId), w.title, w.registeredAt, w.creationClass, w.status]) };
  },

  async worksDeclared(p) {
    const from = p.date_from ? new Date(p.date_from + "T00:00:00") : undefined;
    const to = p.date_to ? new Date(p.date_to + "T23:59:59.999") : undefined;
    const ds = await prisma.workDeclaration.findMany({ where: { ...(from || to ? { submittedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) }, orderBy: { submittedAt: "desc" }, take: LIMIT, select: { title: true, genre: true, iswc: true, submittedAt: true, owner: { select: { fullName: true, memberNumber: true } } } });
    return { columns: ["Title", "Genre", "ISWC", "Member", "Member no.", "Declared"], rows: ds.map((d) => [d.title, d.genre, d.iswc, d.owner.fullName, d.owner.memberNumber, iso(d.submittedAt)]) };
  },

  async creationClass() {
    const g = await prisma.registryWork.groupBy({ by: ["creationClass"], _count: { _all: true }, orderBy: { creationClass: "asc" } });
    return { columns: ["Creation Class", "Works"], rows: g.map((x) => [x.creationClass || "(not set)", x._count._all]) };
  },

  async role() {
    const g = await prisma.workShare.groupBy({ by: ["roleCode"], _count: { _all: true }, orderBy: { roleCode: "asc" } });
    return { columns: ["Role", "Shares"], rows: g.map((x) => [x.roleCode || "(none)", x._count._all]) };
  },

  async city() {
    const g = await prisma.rightHolderAddress.groupBy({ by: ["city"], _count: { _all: true }, orderBy: { city: "asc" } });
    return { columns: ["City", "Addresses"], rows: g.map((x) => [x.city || "(none)", x._count._all]) };
  },

  async roIdentifier() {
    const hs = await prisma.rightHolder.findMany({ select: { identifiers: true } });
    const count = new Map<string, number>();
    for (const h of hs) {
      try {
        for (const i of JSON.parse(h.identifiers) as { code: string }[]) count.set(i.code, (count.get(i.code) ?? 0) + 1);
      } catch {
        /* none */
      }
    }
    return { columns: ["Identifier", "Right owners"], rows: [...count].sort((a, b) => a[0].localeCompare(b[0])) };
  },

  async roStatus() {
    const g = await prisma.rightHolder.groupBy({ by: ["status"], _count: { _all: true }, orderBy: { status: "asc" } });
    return { columns: ["Status", "Right owners"], rows: g.map((x) => [x.status || "(none)", x._count._all]) };
  },

  // right owners whose birthday falls in the current month
  async birthday() {
    const mm = String(new Date().getMonth() + 1).padStart(2, "0");
    return holdersWhere({ birthDate: { contains: `-${mm}-` }, kind: "Person" }, (h) => [`133-${h.wipoId}`, h.displayName, h.birthDate, h.status], ["Main Id", "Name", "Birth date (this month)", "Status"]);
  },

  async deceased() {
    return holdersWhere({ NOT: { deathDate: "" } }, (h) => [`133-${h.wipoId}`, h.displayName, h.birthDate, h.deathDate], ["Main Id", "Name", "Birth date", "Death date"]);
  },

  async ipDiscrepancies() {
    return holdersWhere({ OR: [{ AND: [{ NOT: { ipiNumber: "" } }, { ipiBaseNumber: "" }] }, { AND: [{ ipiNumber: "" }, { NOT: { ipiBaseNumber: "" } }] }] }, (h) => [`133-${h.wipoId}`, h.displayName, h.ipiNumber, h.ipiNumber ? "No IPI base number" : "No IPI name number"], ["Main Id", "Name", "IPI name number", "Discrepancy"]);
  },

  async joined(p) {
    const from = p.date_from ?? "";
    const to = p.date_to ?? "";
    if (!from || !to) throw new Error("Give both From and To dates.");
    const hs = await prisma.rightHolder.findMany({ where: { isAffiliated: true, affiliatedFrom: { gte: from, lte: to } }, orderBy: { affiliatedFrom: "asc" }, take: LIMIT, select: { wipoId: true, displayName: true, affiliatedFrom: true } });
    return { columns: ["Main Id", "Name", "Joined"], rows: hs.map((h) => [`133-${h.wipoId}`, h.displayName, h.affiliatedFrom]) };
  },

  async minors() {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 18);
    return holdersWhere({ kind: "Person", birthDate: { gt: iso(cutoff) } }, (h) => [`133-${h.wipoId}`, h.displayName, h.birthDate], ["Main Id", "Name", "Birth date"]);
  },

  async certainAge(p) {
    const age = Number(p.age);
    if (!Number.isInteger(age) || age < 0 || age > 130) throw new Error("Give an Age between 0 and 130.");
    const now = new Date();
    const youngest = new Date(now.getFullYear() - age - 1, now.getMonth(), now.getDate() + 1);
    const oldest = new Date(now.getFullYear() - age, now.getMonth(), now.getDate());
    return holdersWhere({ kind: "Person", birthDate: { gte: iso(youngest), lte: iso(oldest) } }, (h) => [`133-${h.wipoId}`, h.displayName, h.birthDate, age], ["Main Id", "Name", "Birth date", "Age"]);
  },

  // total allocated within two periods of distributions (by distribution creation date), side by side
  async distributedAmount(p) {
    const sum = async (f?: string, t?: string) => {
      if (!f || !t) return null;
      const r = await prisma.distributionLine.aggregate({ where: { distribution: { createdAt: { gte: new Date(f + "T00:00:00"), lte: new Date(t + "T23:59:59.999") } } }, _sum: { amount: true } });
      return money(r._sum.amount ?? 0);
    };
    const a = await sum(p.date_from_1, p.date_to_1);
    const b = await sum(p.date_from_2, p.date_to_2);
    if (a === null && b === null) throw new Error("Give at least one period (From and To).");
    return { columns: ["Period", "From", "To", "Allocated"], rows: [...(a === null ? [] : [["Amount 1", p.date_from_1, p.date_to_1, a]]), ...(b === null ? [] : [["Amount 2", p.date_from_2, p.date_to_2, b]])] as (string | number)[][] };
  },

  async workGenre(p) {
    const g = (p.genre ?? "").trim();
    if (!g) throw new Error("Give a Genre.");
    const ws = await prisma.registryWork.findMany({ where: { genre: { contains: g, mode: "insensitive" } }, orderBy: { title: "asc" }, take: LIMIT, select: { wipoId: true, title: true, genre: true } });
    return { columns: ["Main Id", "Title", "Genre"], rows: ws.map((w) => [mainW(w.wipoId), w.title, w.genre]) };
  },

  async noWorksForCc(p) {
    const cc = (p.cc_code ?? "").trim().toUpperCase();
    if (!cc) throw new Error("Give a CC Code.");
    return holdersWhere({ isAffiliated: true, shares: { none: { work: { creationClass: cc } } } }, (h) => [`133-${h.wipoId}`, h.displayName, h.ipiNumber], ["Main Id", "Name", "IPI name number"]);
  },

  async worksByRo(p) {
    const ccs = (p.creationClasses ?? "").split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
    const rows = await prisma.$queryRaw<{ wipo: string; name: string; n: bigint }[]>`
      SELECT h."wipoId" AS wipo, h."displayName" AS name, count(DISTINCT s."workId")::bigint AS n
      FROM "RightHolder" h JOIN "WorkShare" s ON s."rightHolderId" = h.id JOIN "RegistryWork" w ON w.id = s."workId"
      WHERE ${ccs.length ? Prisma.sql`w."creationClass" IN (${Prisma.join(ccs)})` : Prisma.sql`true`}
      GROUP BY h.id ORDER BY n DESC, name ASC LIMIT ${LIMIT}`;
    return { columns: ["Main Id", "Name", "Works"], rows: rows.map((r) => [`133-${r.wipo}`, r.name, Number(r.n)]) };
  },

  async lackIpi() {
    return holdersWhere({ ipiNumber: "", names: { none: { NOT: { ipiNameNumber: "" } } } }, (h) => [`133-${h.wipoId}`, h.displayName, h.kind === "Person" ? "Natural person" : "Legal entity"], ["Main Id", "Name", "Type"]);
  },

  async roPaid(p) {
    const d = await distribution(p.distribution_code);
    const affil = (p.cmo_code ?? "").trim();
    const g = await prisma.distributionLine.groupBy({ by: ["rightHolderId"], where: { distributionId: d.id, rightHolderId: { not: null } }, _sum: { amount: true, adminFee: true, reserved: true } });
    const hs = await prisma.rightHolder.findMany({ where: { id: { in: g.map((x) => x.rightHolderId!) }, ...(affil === "133" ? { isAffiliated: true } : {}) }, select: { id: true, wipoId: true, displayName: true, ipiNumber: true } });
    const by = new Map(hs.map((h) => [h.id, h]));
    const rows = g
      .filter((x) => by.has(x.rightHolderId!))
      .map((x) => {
        const h = by.get(x.rightHolderId!)!;
        return [`133-${h.wipoId}`, h.displayName, h.ipiNumber, money(x._sum.amount ?? 0), money(x._sum.adminFee ?? 0), money(x._sum.reserved ?? 0)];
      });
    return { columns: ["Main Id", "Name", "IPI name number", "Allocated", "Admin fee", "Reserved"], rows };
  },

  async roPool(p) {
    const d = await distribution(p.distribution_code);
    const lines = await prisma.distributionLine.groupBy({ by: ["rightHolderId", "linkId"], where: { distributionId: d.id, rightHolderId: { not: null } }, _sum: { amount: true } });
    const [hs, links] = await Promise.all([
      prisma.rightHolder.findMany({ where: { id: { in: [...new Set(lines.map((l) => l.rightHolderId!))] } }, select: { id: true, wipoId: true, displayName: true } }),
      prisma.distributionPoolLink.findMany({ where: { distributionId: d.id }, select: { id: true, seq: true, pool: { select: { code: true } } } }),
    ]);
    const hb = new Map(hs.map((h) => [h.id, h]));
    const lb = new Map(links.map((l) => [l.id, l]));
    return { columns: ["Main Id", "Name", "DPL", "Pool", "Allocated"], rows: lines.map((l) => [`133-${hb.get(l.rightHolderId!)?.wipoId ?? ""}`, hb.get(l.rightHolderId!)?.displayName ?? "", l.linkId ? `133-${lb.get(l.linkId)?.seq}-DPL` : "", lb.get(l.linkId ?? "")?.pool?.code ?? "", money(l._sum.amount ?? 0)]) };
  },

  async workPaid(p) {
    const d = await distribution(p.distribution_code);
    const g = await prisma.distributionLine.groupBy({ by: ["workId"], where: { distributionId: d.id, workId: { not: null } }, _sum: { amount: true, reserved: true } });
    const ws = await prisma.registryWork.findMany({ where: { id: { in: g.map((x) => x.workId!) } }, select: { id: true, wipoId: true, title: true } });
    const by = new Map(ws.map((w) => [w.id, w]));
    return { columns: ["Main Id", "Title", "Allocated", "Reserved"], rows: g.map((x) => [mainW(by.get(x.workId!)?.wipoId ?? ""), by.get(x.workId!)?.title ?? "", money(x._sum.amount ?? 0), money(x._sum.reserved ?? 0)]) };
  },

  async workPool(p) {
    const d = await distribution(p.distribution_code);
    const g = await prisma.distributionLine.groupBy({ by: ["workId", "linkId"], where: { distributionId: d.id, workId: { not: null } }, _sum: { amount: true } });
    const [ws, links] = await Promise.all([
      prisma.registryWork.findMany({ where: { id: { in: [...new Set(g.map((x) => x.workId!))] } }, select: { id: true, wipoId: true, title: true } }),
      prisma.distributionPoolLink.findMany({ where: { distributionId: d.id }, select: { id: true, seq: true, pool: { select: { code: true } } } }),
    ]);
    const wb = new Map(ws.map((w) => [w.id, w]));
    const lb = new Map(links.map((l) => [l.id, l]));
    return { columns: ["Main Id", "Title", "DPL", "Pool", "Allocated"], rows: g.map((x) => [mainW(wb.get(x.workId!)?.wipoId ?? ""), wb.get(x.workId!)?.title ?? "", x.linkId ? `133-${lb.get(x.linkId)?.seq}-DPL` : "", lb.get(x.linkId ?? "")?.pool?.code ?? "", money(x._sum.amount ?? 0)]) };
  },

  async unidentifiedTitle(p) {
    const d = await distribution(p.distribution_code);
    const g = await prisma.distributionLine.groupBy({ by: ["workId"], where: { distributionId: d.id, reserveType: "Unidentified" }, _sum: { reserved: true, amount: true } });
    const ws = await prisma.registryWork.findMany({ where: { id: { in: g.map((x) => x.workId!).filter(Boolean) } }, select: { id: true, title: true } });
    const by = new Map(ws.map((w) => [w.id, w.title]));
    return { columns: ["Title", "Unidentified amount"], rows: g.map((x) => [by.get(x.workId ?? "") ?? "(no work)", money(x._sum.amount ?? 0)]) };
  },

  async unidentifiedTitlePool(p) {
    const d = await distribution(p.distribution_code);
    const g = await prisma.distributionLine.groupBy({ by: ["workId", "linkId"], where: { distributionId: d.id, reserveType: "Unidentified" }, _sum: { amount: true } });
    const [ws, links] = await Promise.all([
      prisma.registryWork.findMany({ where: { id: { in: g.map((x) => x.workId!).filter(Boolean) } }, select: { id: true, title: true } }),
      prisma.distributionPoolLink.findMany({ where: { distributionId: d.id }, select: { id: true, pool: { select: { code: true } } } }),
    ]);
    const wb = new Map(ws.map((w) => [w.id, w.title]));
    const lb = new Map(links.map((l) => [l.id, l.pool?.code ?? ""]));
    return { columns: ["Title", "Pool", "Unidentified amount"], rows: g.map((x) => [wb.get(x.workId ?? "") ?? "(no work)", lb.get(x.linkId ?? "") ?? "", money(x._sum.amount ?? 0)]) };
  },

  async upList(p) {
    const d = await distribution(p.distribution_code);
    const rs = await prisma.reserve.findMany({ where: { distributionId: d.id, reserveType: "Unidentified" }, orderBy: { reservedAt: "asc" }, include: { link: { select: { seq: true } } } });
    return { columns: ["Distribution", "DPL", "Class", "Sub class", "Reserved", "Status"], rows: rs.map((r) => [d.code, r.link ? `133-${r.link.seq}-DPL` : "", r.className, r.subClass, money(r.amount), r.status]) };
  },

  async beneficiaries(p) {
    const d = await distribution(p.distribution_code);
    const g = await prisma.distributionLine.groupBy({ by: ["rightHolderId"], where: { distributionId: d.id, rightHolderId: { not: null } }, _sum: { amount: true } });
    const hs = await prisma.rightHolder.findMany({ where: { id: { in: g.map((x) => x.rightHolderId!) } }, select: { id: true, wipoId: true, displayName: true, ipiNumber: true, isAffiliated: true } });
    const by = new Map(hs.map((h) => [h.id, h]));
    return { columns: ["Main Id", "Name", "IPI name number", "Society", "Allocated"], rows: g.map((x) => { const h = by.get(x.rightHolderId!); return [`133-${h?.wipoId ?? ""}`, h?.displayName ?? "", h?.ipiNumber ?? "", h?.isAffiliated ? "ZAMCOPS" : "Other", money(x._sum.amount ?? 0)]; }) };
  },

  async memberContacts() {
    const hs = await prisma.rightHolder.findMany({ where: { isAffiliated: true }, orderBy: { displayName: "asc" }, take: LIMIT, select: { wipoId: true, displayName: true, contacts: { select: { email: true, phone: true, value: true } } } });
    return {
      columns: ["Main Id", "Name", "Email", "Phone"],
      rows: hs.map((h) => [`133-${h.wipoId}`, h.displayName, [...new Set(h.contacts.map((c) => c.email).filter(Boolean))].join("; "), [...new Set(h.contacts.map((c) => c.phone).filter(Boolean))].join("; ")]),
    };
  },
};

export async function runBi(run: string, params: Params): Promise<BiResult> {
  const fn = RUNNERS[run];
  if (!fn) throw new Error("This query is not available.");
  return fn(params);
}
