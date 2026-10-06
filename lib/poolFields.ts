import { prisma } from "@/lib/db";
import { POOL_METHODS, POOL_RIGHT_TYPES } from "@/lib/poolConst";
import { RESERVE_TYPES } from "@/lib/poolAllocation";

export type PoolData = {
  code?: string;
  name?: string;
  className?: string;
  subClass?: string;
  method?: string;
  creationClass?: string;
  rightType?: string;
  adminFeePct?: number;
  workRoles?: string;
  workMethodId?: string | null;
  roMethodId?: string | null;
  logSourceId?: string | null;
  logMethodId?: string | null;
  reallocateWithinWork?: boolean;
  workShareTolerance?: number;
  internationalRevenueStream?: boolean;
  reserveType?: string;
  notes?: string;
  active?: boolean;
};

// Validate the editable fields of a distribution pool. Only fields that were
// sent are returned. `existingCode` lets an edit keep its own code.
export async function readPoolFields(b: Record<string, unknown>, existingCode?: string): Promise<{ data: PoolData } | { error: string }> {
  const data: PoolData = {};
  if (b.code !== undefined) {
    const c = String(b.code).trim().toUpperCase().slice(0, 40);
    if (!c) return { error: "A pool needs a code, for example TV-WL-01." };
    if (c !== existingCode && (await prisma.distributionPool.findUnique({ where: { code: c }, select: { id: true } }))) return { error: `A pool with code ${c} already exists.` };
    data.code = c;
  }
  for (const [k, max] of [["name", 200], ["subClass", 120], ["creationClass", 10], ["notes", 2000]] as const) if (b[k] !== undefined) data[k] = String(b[k]).trim().slice(0, max);
  if (b.className !== undefined) data.className = String(b.className).trim().slice(0, 60);
  if (b.method !== undefined) {
    if (!(POOL_METHODS as readonly string[]).includes(String(b.method))) return { error: "Unknown distribution method." };
    data.method = String(b.method);
  }
  if (b.rightType !== undefined) {
    if (!(POOL_RIGHT_TYPES as readonly string[]).includes(String(b.rightType))) return { error: "Unknown right type." };
    data.rightType = String(b.rightType);
  }
  if (b.adminFeePct !== undefined && b.adminFeePct !== "") {
    const f = Number(b.adminFeePct);
    if (!Number.isFinite(f) || f < 0 || f > 100) return { error: "The admin fee must be between 0 and 100%." };
    data.adminFeePct = Math.round(f * 100) / 100;
  }
  if (b.workShareTolerance !== undefined && b.workShareTolerance !== "") {
    const t = Number(b.workShareTolerance);
    if (!Number.isFinite(t) || t < 0 || t > 100) return { error: "The work share tolerance must be between 0 and 100." };
    data.workShareTolerance = Math.round(t * 100) / 100;
  }
  if (b.workRoles !== undefined) {
    const list = Array.isArray(b.workRoles) ? b.workRoles : String(b.workRoles).split(/[\s,;]+/);
    data.workRoles = JSON.stringify([...new Set(list.map((x) => String(x).trim().toUpperCase()).filter(Boolean))].slice(0, 80));
  }
  for (const [k, target] of [["workMethodId", "Work"], ["roMethodId", "Right owner"]] as const) {
    if (b[k] === undefined) continue;
    if (b[k]) {
      const m = await prisma.allocationMethod.findUnique({ where: { id: String(b[k]) }, select: { target: true } });
      if (!m || m.target !== target) return { error: `That is not a ${target.toLowerCase()} allocation method.` };
      data[k] = String(b[k]);
    } else data[k] = null;
  }
  // Log Based pools: the Log Source and Log Allocation Method from Matching Settings
  if (b.logSourceId !== undefined) {
    if (b.logSourceId) {
      if (!(await prisma.logSource.findUnique({ where: { id: String(b.logSourceId) }, select: { id: true } }))) return { error: "That log source does not exist." };
      data.logSourceId = String(b.logSourceId);
    } else data.logSourceId = null;
  }
  if (b.logMethodId !== undefined) {
    if (b.logMethodId) {
      if (!(await prisma.logAllocationMethod.findUnique({ where: { id: String(b.logMethodId) }, select: { id: true } }))) return { error: "That log allocation method does not exist." };
      data.logMethodId = String(b.logMethodId);
    } else data.logMethodId = null;
  }
  if (b.reserveType !== undefined) {
    const r = String(b.reserveType);
    if (r && !(RESERVE_TYPES as readonly string[]).includes(r)) return { error: "Unknown reserve type." };
    data.reserveType = r;
  }
  for (const k of ["reallocateWithinWork", "internationalRevenueStream", "active"] as const) if (b[k] !== undefined) data[k] = !!b[k];
  return { data };
}

export const POOL_LABELS: Record<string, string> = {
  code: "Code",
  name: "Name",
  className: "Class",
  subClass: "Sub class",
  method: "Distribution method",
  creationClass: "Creation class",
  rightType: "Right type",
  adminFeePct: "Admin fee %",
  workRoles: "Work roles",
  workMethodId: "Work allocation method",
  roMethodId: "Right owner allocation method",
  logSourceId: "Log Source",
  logMethodId: "Log Allocation Method",
  reallocateWithinWork: "Reallocate within the work",
  workShareTolerance: "Work share tolerance",
  internationalRevenueStream: "International revenue stream",
  reserveType: "Reserve type",
  notes: "Comment",
  active: "Active",
};

export const poolJson = (p: {
  id: string;
  code: string;
  name: string;
  className: string;
  subClass: string;
  method: string;
  creationClass: string;
  rightType: string;
  adminFeePct: number;
  workRoles: string;
  workMethodId: string | null;
  roMethodId: string | null;
  logSourceId: string | null;
  logMethodId: string | null;
  reallocateWithinWork: boolean;
  workShareTolerance: number;
  internationalRevenueStream: boolean;
  reserveType: string;
  notes: string;
  active: boolean;
}) => {
  let roles: string[] = [];
  try {
    const r = JSON.parse(p.workRoles || "[]");
    if (Array.isArray(r)) roles = r.map(String);
  } catch {
    /* none */
  }
  return { ...p, workRoles: roles };
};
