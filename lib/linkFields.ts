import { prisma } from "@/lib/db";
import { RESERVE_TYPES } from "@/lib/poolAllocation";

// Validate the editable fields of a distribution pool link (used by create and
// edit). Returns only the fields that were sent, or an error to show staff.
export type LinkData = {
  amount?: number;
  adminFeePct?: number;
  adminFeeIntl?: number;
  adminFeeIntlRevenue?: number;
  adminFeeReserved?: number;
  periodStart?: string;
  periodEnd?: string;
  notes?: string;
  currency?: string;
  reserveType?: string;
  affiliation?: string;
  poolId?: string | null;
  workMethodId?: string | null;
  roMethodId?: string | null;
};

const pct = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 100) / 100 : null;
};

export async function readLinkFields(b: Record<string, unknown>): Promise<{ data: LinkData } | { error: string }> {
  const data: LinkData = {};
  if (b.amount !== undefined) {
    const n = Number(b.amount === "" ? 0 : b.amount);
    if (!Number.isFinite(n) || n < 0) return { error: "The amount must be zero or more." };
    data.amount = Math.round(n * 100) / 100;
  }
  const fees: [keyof LinkData, string][] = [
    ["adminFeePct", "domestic admin fee"],
    ["adminFeeIntl", "international admin fee"],
    ["adminFeeIntlRevenue", "international revenue admin fee"],
    ["adminFeeReserved", "reserved admin fee"],
  ];
  for (const [k, label] of fees) {
    if (b[k] === undefined || b[k] === "") continue;
    const p = pct(b[k]);
    if (p === null) return { error: `The ${label} must be between 0 and 100%.` };
    (data as Record<string, number>)[k] = p;
  }
  if (b.periodStart !== undefined) data.periodStart = String(b.periodStart).slice(0, 10);
  if (b.periodEnd !== undefined) data.periodEnd = String(b.periodEnd).slice(0, 10);
  if (data.periodStart && data.periodEnd && data.periodStart > data.periodEnd) return { error: "The period ends before it starts." };
  if (b.notes !== undefined) data.notes = String(b.notes).slice(0, 2000);
  if (b.currency !== undefined) {
    const c = String(b.currency).trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(c)) return { error: "The currency must be a three-letter code, such as ZMW." };
    data.currency = c;
  }
  if (b.reserveType !== undefined) {
    const r = String(b.reserveType);
    if (r && !(RESERVE_TYPES as readonly string[]).includes(r)) return { error: "Unknown reserve type." };
    data.reserveType = r;
  }
  if (b.affiliation !== undefined) {
    if (!["ZAMCOPS", "All"].includes(String(b.affiliation))) return { error: "Choose ZAMCOPS members or All right-holders." };
    data.affiliation = String(b.affiliation);
  }
  if (b.poolId !== undefined) {
    if (b.poolId) {
      if (!(await prisma.distributionPool.findUnique({ where: { id: String(b.poolId) }, select: { id: true } }))) return { error: "That pool does not exist." };
      data.poolId = String(b.poolId);
    } else data.poolId = null;
  }
  for (const [k, target] of [["workMethodId", "Work"], ["roMethodId", "Right owner"]] as const) {
    if (b[k] === undefined) continue;
    if (b[k]) {
      const m = await prisma.allocationMethod.findUnique({ where: { id: String(b[k]) }, select: { target: true } });
      if (!m || m.target !== target) return { error: `That is not a ${target.toLowerCase()} allocation method.` };
      (data as Record<string, string | null>)[k] = String(b[k]);
    } else (data as Record<string, string | null>)[k] = null;
  }
  return { data };
}
