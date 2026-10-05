import { prisma } from "@/lib/db";
import { compileFormula } from "@/lib/formula";
import { lockReason } from "@/lib/distLock";

// ──────────────────────────────────────────────────────────────────────────
// Distribution pool links: reading a list of works, and sharing a pool's money
// out across them. Kept out of the route handlers so the arithmetic is in one
// place and can be reasoned about (and tested) on its own.
// ──────────────────────────────────────────────────────────────────────────

export const MAX_LIST_LINES = 5000;

export type ParsedLine = { n: number; raw: string; ref: string; weight: number };

// One work per line. A weight (plays / airings) may follow after a tab, comma
// or semicolon. Handles a quoted title that itself contains commas.
export function parseWorkList(text: string): ParsedLine[] {
  const out: ParsedLine[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  lines.forEach((raw, i) => {
    let line = raw.trim();
    if (!line) return;
    if (i === 0 && /^(title|work|works|work title|iswc|id|main id)$/i.test(line.split(/[\t,;]/)[0].trim().replace(/^"|"$/g, ""))) return; // header row
    let ref = line;
    let weight = 1;
    const quoted = /^"((?:[^"]|"")*)"\s*(?:[\t,;]\s*(\d+(?:\.\d+)?))?\s*$/.exec(line);
    if (quoted) {
      ref = quoted[1].replace(/""/g, '"');
      if (quoted[2]) weight = Number(quoted[2]);
    } else if (line.includes("\t")) {
      const [a, b] = line.split("\t");
      ref = a.trim();
      if (b && Number.isFinite(Number(b))) weight = Number(b);
    } else {
      const m = /^(.*?)[,;]\s*(\d+(?:\.\d+)?)$/.exec(line);
      if (m) {
        ref = m[1].trim();
        weight = Number(m[2]);
      }
    }
    line = ref;
    if (!ref) return;
    if (!(weight > 0)) weight = 1;
    out.push({ n: i + 1, raw: raw.trim(), ref: ref.slice(0, 300), weight: Math.round(weight * 1000) / 1000 });
  });
  return out;
}

const isMainId = (s: string) => /^(?:133-)?(\d{1,9})(?:-W)?$/i.exec(s.trim());
const iswcKey = (s: string) => s.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
const looksLikeIswc = (s: string) => /^T[-\s.]?\d/i.test(s.trim()) && iswcKey(s).length >= 10;
const iswcFormats = (s: string): string[] => {
  const k = iswcKey(s);
  const m = /^T(\d{9})(\d)$/.exec(k);
  return [s.trim(), k, m ? `T-${m[1].slice(0, 3)}.${m[1].slice(3, 6)}.${m[1].slice(6, 9)}-${m[2]}` : ""].filter(Boolean);
};

export type WorkBrief = { id: string; title: string; iswc: string; wipoId: string; holders: string[] };
export type MatchRow = {
  n: number;
  ref: string;
  weight: number;
  status: "matched" | "ambiguous" | "notfound" | "duplicate" | "already";
  work?: WorkBrief;
  candidates?: WorkBrief[];
};

const SELECT = {
  id: true,
  title: true,
  iswc: true,
  wipoId: true,
  shares: { take: 3, orderBy: { share: "desc" as const }, select: { rightHolder: { select: { displayName: true } }, name: { select: { name: true } } } },
};
type Found = { id: string; title: string; iswc: string; wipoId: string; shares: { rightHolder: { displayName: string } | null; name: { name: string } | null }[] };
const brief = (w: Found): WorkBrief => ({
  id: w.id,
  title: w.title,
  iswc: w.iswc,
  wipoId: w.wipoId,
  holders: [...new Set(w.shares.map((s) => s.rightHolder?.displayName || s.name?.name || "").filter(Boolean))],
});

const chunk = <T,>(xs: T[], n: number) => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
};

// Match each line against the society register: by WIPO main id (133-507-W or
// 507), by ISWC, then by exact title (any case). A title shared by several
// works comes back as "ambiguous" with the candidates, never guessed.
export async function matchWorks(lines: ParsedLine[], existingWorkIds: Set<string>): Promise<MatchRow[]> {
  const ids = new Map<string, string[]>(); // wipoId -> refs
  const iswcs: string[] = [];
  const titles: string[] = [];
  for (const l of lines) {
    const id = isMainId(l.ref);
    if (id) ids.set(id[1], [...(ids.get(id[1]) ?? []), l.ref]);
    if (looksLikeIswc(l.ref)) iswcs.push(...iswcFormats(l.ref));
    titles.push(l.ref);
  }

  const byWipo = new Map<string, Found>();
  for (const part of chunk([...ids.keys()], 1000)) {
    for (const w of await prisma.registryWork.findMany({ where: { wipoId: { in: part } }, select: SELECT })) byWipo.set(w.wipoId, w);
  }
  const byIswc = new Map<string, Found[]>();
  for (const part of chunk([...new Set(iswcs)], 1000)) {
    for (const w of await prisma.registryWork.findMany({ where: { iswc: { in: part } }, select: SELECT })) {
      const k = iswcKey(w.iswc);
      byIswc.set(k, [...(byIswc.get(k) ?? []), w]);
    }
  }
  const byTitle = new Map<string, Found[]>();
  for (const part of chunk([...new Set(titles)], 400)) {
    for (const w of await prisma.registryWork.findMany({ where: { title: { in: part, mode: "insensitive" } }, select: SELECT })) {
      const k = w.title.trim().toLowerCase();
      byTitle.set(k, [...(byTitle.get(k) ?? []), w]);
    }
  }

  const seen = new Set<string>();
  return lines.map((l): MatchRow => {
    const base = { n: l.n, ref: l.ref, weight: l.weight };
    let hits: Found[] = [];
    const id = isMainId(l.ref);
    if (id && byWipo.has(id[1])) hits = [byWipo.get(id[1])!];
    else if (looksLikeIswc(l.ref) && byIswc.has(iswcKey(l.ref))) hits = byIswc.get(iswcKey(l.ref))!;
    else hits = byTitle.get(l.ref.trim().toLowerCase()) ?? [];

    if (hits.length === 0) return { ...base, status: "notfound" };
    if (hits.length > 1) {
      // several works share the title: if all but one are already on the list or repeated, say so rather than ask
      return { ...base, status: "ambiguous", candidates: hits.slice(0, 8).map(brief) };
    }
    const w = hits[0];
    if (existingWorkIds.has(w.id)) return { ...base, status: "already", work: brief(w) };
    if (seen.has(w.id)) return { ...base, status: "duplicate", work: brief(w) };
    seen.add(w.id);
    return { ...base, status: "matched", work: brief(w) };
  });
}

// ── allocation ────────────────────────────────────────────────────────────

export const RESERVE_TYPES = ["Unidentified", "Non-society", "Incomplete", "Undistributable", "Disputed"] as const;
export type ReserveType = (typeof RESERVE_TYPES)[number];

const sameType = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const isoLike = (s: string) => /^\d{4}-\d{2}-\d{2}/.test(s);

export type AllocationResult = {
  lines: number;
  works: number;
  amount: number;
  paid: number;
  reserved: number;
  fee: number;
  byReserve: Record<string, number>;
  workStatus: { full: number; partial: number; none: number };
};

type WorkInfo = { id: string; title: string; genre: string; iswc: string; status: string; domestic: boolean; registeredAt: string };
type ShareInfo = {
  workId: string;
  rightHolderId: string | null;
  roleCode: string;
  share: number;
  rightType: string;
  validFrom: string;
  validTo: string;
  rightHolder: { isAffiliated: boolean; kind: string } | null;
};
type Line = { workId: string; rightHolderId: string | null; roleCode: string; weight: number; cents: number; reserve: ReserveType | ""; affiliated: boolean | null };

// Share the link's amount out the way WIPO Connect's "Run Allocation" does:
//
//  1. Each work earns a weight (its plays, or the pool's Work Allocation Method
//     applied to them) and takes that fraction of the amount.
//  2. Within a work, the right-holders who hold the pool's right type (in the
//     pool's work roles, and valid during the period) split the work's part by
//     share — or by the pool's Right Owner Allocation Method.
//  3. Anything that cannot be paid is RESERVED, not lost: a share with no
//     right-holder (Unidentified), a right-holder who is not a society member
//     (Non-society), shares that do not add up (Incomplete), a work with
//     nothing to pay or that has been withdrawn (Undistributable), or one in
//     conflict (Disputed). Each becomes a line flagged reserved and a row in
//     Reserve Management.
//  4. The admin fee is taken per line: the domestic rate for members, the
//     international rate otherwise, the reserved rate on held-back money.
//
// Everything is worked in whole cents and the rounding remainder is put on the
// largest line, so the lines add up to the link's amount exactly. Re-running
// replaces what the link produced before.
export async function allocateLink(linkId: string): Promise<AllocationResult> {
  const link = await prisma.distributionPoolLink.findUnique({
    where: { id: linkId },
    include: {
      pool: { include: { workMethod: true, roMethod: true } },
      workMethod: true,
      roMethod: true,
      works: { select: { workId: true, weight: true } },
      distribution: { select: { id: true, status: true, closedAt: true } },
    },
  });
  if (!link) throw new Error("Pool link not found.");
  const locked = lockReason(link.distribution);
  if (locked) throw new Error(locked);
  if (!(link.amount > 0)) throw new Error("Give the pool link an amount to share out first.");
  if (link.works.length === 0) throw new Error("Add works to this pool link first.");

  await prisma.distributionPoolLink.update({ where: { id: linkId }, data: { status: "Allocating", lastError: "" } });
  try {
    return await run(link);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "The allocation failed.";
    await prisma.distributionPoolLink.update({ where: { id: linkId }, data: { status: "Failed", lastError: msg.slice(0, 500) } });
    throw e;
  }
}

type LinkIn = NonNullable<Awaited<ReturnType<typeof loadLink>>>;
const loadLink = (id: string) =>
  prisma.distributionPoolLink.findUnique({
    where: { id },
    include: {
      pool: { include: { workMethod: true, roMethod: true } },
      workMethod: true,
      roMethod: true,
      works: { select: { workId: true, weight: true } },
      distribution: { select: { id: true, status: true, closedAt: true } },
    },
  });

async function run(link: LinkIn): Promise<AllocationResult> {
  const pool = link.pool;
  const rightType = pool?.rightType || "Performing";
  let roles: string[] = [];
  try {
    const r = JSON.parse(pool?.workRoles || "[]");
    if (Array.isArray(r)) roles = r.map((x) => String(x).trim().toUpperCase()).filter(Boolean);
  } catch {
    /* no role filter */
  }
  const tol = Math.max(0, pool?.workShareTolerance ?? 0);
  const reallocate = pool?.reallocateWithinWork ?? true;
  const workMethod = link.workMethod ?? pool?.workMethod ?? null;
  const roMethod = link.roMethod ?? pool?.roMethod ?? null;
  const workF = workMethod ? compileFormula(workMethod.formula) : null;
  const roF = roMethod ? compileFormula(roMethod.formula) : null;
  const onlyMembers = link.affiliation !== "All";
  const targetCents = Math.round(link.amount * 100);
  const workIds = link.works.map((w) => w.workId);

  const works = new Map<string, WorkInfo>();
  const sharesBy = new Map<string, ShareInfo[]>();
  for (let i = 0; i < workIds.length; i += 1000) {
    const part = workIds.slice(i, i + 1000);
    for (const w of await prisma.registryWork.findMany({ where: { id: { in: part } }, select: { id: true, title: true, genre: true, iswc: true, status: true, domestic: true, registeredAt: true } })) works.set(w.id, w);
    for (const s of await prisma.workShare.findMany({
      where: { workId: { in: part } },
      select: { workId: true, rightHolderId: true, roleCode: true, share: true, rightType: true, validFrom: true, validTo: true, rightHolder: { select: { isAffiliated: true, kind: true } } },
    })) {
      sharesBy.set(s.workId, [...(sharesBy.get(s.workId) ?? []), s]);
    }
  }

  const validOnPeriod = (s: ShareInfo) => {
    if (s.validFrom && isoLike(s.validFrom) && link.periodEnd && isoLike(link.periodEnd) && s.validFrom.slice(0, 10) > link.periodEnd) return false;
    if (s.validTo && isoLike(s.validTo) && link.periodStart && isoLike(link.periodStart) && s.validTo.slice(0, 10) < link.periodStart) return false;
    return true;
  };

  // 1. work weights
  const weights = link.works.map((lw) => {
    const w = works.get(lw.workId);
    const eligible = (sharesBy.get(lw.workId) ?? []).filter((s) => sameType(s.rightType, rightType) && s.share > 0);
    const base = lw.weight > 0 ? lw.weight : 1;
    const wt = workF
      ? workF({ Weight: base, Work: { title: w?.title ?? "", genre: w?.genre ?? "", iswc: w?.iswc ?? "", status: w?.status ?? "", shares: eligible.length, domestic: w?.domestic ? 1 : 0, year: Number((w?.registeredAt ?? "").slice(0, 4)) || 0 } })
      : base;
    return { workId: lw.workId, weight: wt, base };
  });
  const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
  if (!(totalWeight > 0)) throw new Error("Every work on the list has a weight of zero, so there is nothing to share.");

  const lines: Line[] = [];
  const status = new Map<string, { status: string; note: string }>();
  const mark = (workId: string, st: string, note: string) => status.set(workId, { status: st, note });

  for (const lw of weights) {
    const w = works.get(lw.workId);
    const workCents = (targetCents * lw.weight) / totalWeight;
    if (!(lw.weight > 0)) {
      mark(lw.workId, "Not distributable", "Weight is zero");
      continue;
    }
    const reserveWhole = (type: ReserveType, note: string) => {
      lines.push({ workId: lw.workId, rightHolderId: null, roleCode: "", weight: lw.base, cents: Math.round(workCents), reserve: type, affiliated: null });
      mark(lw.workId, "Not distributable", note);
    };

    const rs = (w?.status ?? "").toUpperCase();
    if (rs === "CONFLICT" || rs === "DISPUTED") {
      reserveWhole("Disputed", "Work is in conflict");
      continue;
    }
    if (["DELETED", "WITHDRAWN", "SUSPENDED", "INVALID"].includes(rs)) {
      reserveWhole("Undistributable", `Work is ${rs.toLowerCase()}`);
      continue;
    }

    const eligible = (sharesBy.get(lw.workId) ?? []).filter(
      (s) => sameType(s.rightType, rightType) && s.share > 0 && validOnPeriod(s) && (roles.length === 0 || roles.includes(s.roleCode.trim().toUpperCase())),
    );
    if (eligible.length === 0) {
      reserveWhole("Undistributable", `No ${rightType.toLowerCase()} shares to pay`);
      continue;
    }

    const total = eligible.reduce((s, x) => s + x.share, 0);
    const workCtx = { title: w?.title ?? "", genre: w?.genre ?? "", iswc: w?.iswc ?? "", status: w?.status ?? "", shares: eligible.length, domestic: w?.domestic ? 1 : 0, year: Number((w?.registeredAt ?? "").slice(0, 4)) || 0 };
    const roW = eligible.map((s) =>
      roF ? roF({ Weight: s.share, Role: s.roleCode, Work: workCtx, Ro: { affiliated: s.rightHolder?.isAffiliated ? 1 : 0, kind: s.rightHolder?.kind ?? "", share: s.share } }) : s.share,
    );
    const roTotal = roW.reduce((a, b) => a + b, 0);
    if (!(roTotal > 0)) {
      reserveWhole("Undistributable", "Right-owner weights are zero");
      continue;
    }

    let payCents = workCents;
    let note = "";
    let partial = false;
    if (total > 100 + tol) {
      if (!reallocate) {
        reserveWhole("Incomplete", "Shares total more than 100%");
        continue;
      }
      partial = true;
      note = "Shares total more than 100%, reallocated within the work";
    } else if (total < 100 - tol) {
      partial = true;
      if (reallocate) note = "Shares total less than 100%, reallocated within the work";
      else {
        payCents = workCents * (total / 100);
        note = "Shares total less than 100%, the rest is reserved";
        lines.push({ workId: lw.workId, rightHolderId: null, roleCode: "", weight: lw.base, cents: Math.round(workCents - payCents), reserve: "Incomplete", affiliated: null });
      }
    }

    let anyReserved = false;
    eligible.forEach((s, i) => {
      const cents = Math.round((payCents * roW[i]) / roTotal);
      const holder = s.rightHolder;
      let reserve: ReserveType | "" = "";
      if (!s.rightHolderId) reserve = "Unidentified";
      else if (onlyMembers && !holder?.isAffiliated) reserve = "Non-society";
      if (reserve) anyReserved = true;
      lines.push({ workId: lw.workId, rightHolderId: s.rightHolderId, roleCode: s.roleCode, weight: lw.base, cents, reserve, affiliated: s.rightHolderId ? !!holder?.isAffiliated : null });
    });
    if (anyReserved) {
      partial = true;
      note = note || "Some shares are reserved";
    }
    mark(lw.workId, partial ? "Partially distributable" : "Fully distributable", note);
  }

  // rounding remainder onto the largest line so the money adds up exactly
  const sum = lines.reduce((s, l) => s + l.cents, 0);
  if (lines.length && sum !== targetCents) {
    let big = 0;
    lines.forEach((l, i) => {
      if (l.cents > lines[big].cents) big = i;
    });
    lines[big].cents += targetCents - sum;
  }

  const feeOf = (l: Line) => {
    if (l.reserve) return link.adminFeeReserved;
    if (l.affiliated === false) return pool?.internationalRevenueStream ? link.adminFeeIntlRevenue : link.adminFeeIntl;
    return link.adminFeePct;
  };
  const clamp = (n: number) => Math.max(0, Math.min(100, n || 0));
  const rows = lines.map((l) => {
    const amount = l.cents / 100;
    return {
      distributionId: link.distributionId,
      linkId: link.id,
      workId: l.workId,
      rightHolderId: l.rightHolderId,
      roleCode: l.roleCode,
      rightType,
      amount,
      total: amount,
      weight: l.weight,
      adminFee: Math.round(amount * clamp(feeOf(l))) / 100,
      reserved: l.reserve ? amount : 0,
      reserveType: l.reserve,
      disputed: l.reserve === "Disputed",
    };
  });

  const byReserve: Record<string, number> = {};
  for (const r of rows) if (r.reserved > 0) byReserve[r.reserveType] = Math.round(((byReserve[r.reserveType] ?? 0) + r.reserved) * 100) / 100;

  const now = new Date();
  await prisma.$transaction(
    async (tx) => {
      await tx.distributionLine.deleteMany({ where: { linkId: link.id } });
      await tx.reserve.deleteMany({ where: { linkId: link.id, status: "Open" } });
      for (let i = 0; i < rows.length; i += 2000) await tx.distributionLine.createMany({ data: rows.slice(i, i + 2000) });
      const reserveRows = Object.entries(byReserve).map(([reserveType, amount]) => ({
        distributionId: link.distributionId,
        linkId: link.id,
        className: link.kind,
        subClass: link.stationName,
        creationClass: pool?.creationClass ?? "MW",
        rightType,
        reserveType,
        reservedAt: now,
        amount,
        distributableAmount: amount,
      }));
      if (reserveRows.length) await tx.reserve.createMany({ data: reserveRows });
      await tx.distributionPoolLink.update({ where: { id: link.id }, data: { status: "Allocated", allocatedAt: now, lastError: "" } });
      await tx.distribution.update({ where: { id: link.distributionId }, data: { runAt: now } });
    },
    { timeout: 120000, maxWait: 20000 },
  );

  // per-work status for the Covered Works grid
  const groups = new Map<string, string[]>();
  for (const [workId, st] of status) {
    const k = `${st.status}\u0000${st.note}`;
    groups.set(k, [...(groups.get(k) ?? []), workId]);
  }
  for (const [k, ids] of groups) {
    const [st, note] = k.split("\u0000");
    for (let i = 0; i < ids.length; i += 1000) await prisma.distributionPoolWork.updateMany({ where: { linkId: link.id, workId: { in: ids.slice(i, i + 1000) } }, data: { status: st, note } });
  }

  const reserved = rows.reduce((s, r) => s + r.reserved, 0);
  const vals = [...status.values()];
  return {
    lines: rows.length,
    works: link.works.length,
    amount: targetCents / 100,
    paid: Math.round((targetCents / 100 - reserved) * 100) / 100,
    reserved: Math.round(reserved * 100) / 100,
    fee: Math.round(rows.reduce((s, r) => s + r.adminFee, 0) * 100) / 100,
    byReserve,
    workStatus: {
      full: vals.filter((v) => v.status === "Fully distributable").length,
      partial: vals.filter((v) => v.status === "Partially distributable").length,
      none: link.works.length - vals.filter((v) => v.status !== "Not distributable").length,
    },
  };
}
