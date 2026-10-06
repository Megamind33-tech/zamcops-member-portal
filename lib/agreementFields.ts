import rightTypesByCc from "@/data/wipo/right-types-by-cc.json";

export const AGREEMENT_TYPES = ["General", "Implied", "Specific Exclude", "Specific Include"] as const;
export const AGREEMENT_STATUSES = ["Valid", "Duplicate Claim", "In Dispute", "Deleted", "Cycle"] as const;
export const SOURCE_TYPES = ["Assignee", "Assignor", "External Source", "Sister CMO"] as const;
export const RIGHT_CATEGORIES = ["PER", "MEC", "SYN", "POI", "PCT"] as const;
export const WORK_ASSOCIATIONS = ["Include Set", "Include Work"] as const;

export const rightTypesFor = (cc: string): string[] => (rightTypesByCc as Record<string, string[]>)[cc] ?? [];

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const date = (v: unknown) => String(v ?? "").trim();

export type AgreementIn = {
  code: string;
  type: string;
  creationClass: string;
  assignorId: string | null;
  assignorName: string;
  assigneeId: string | null;
  assigneeName: string;
  signatureDate: string;
  sourceType: string;
  sourceDetail: string;
  startDate: string;
  endDate: string;
  effectiveStart: string;
  effectiveEnd: string;
  rightTypes: string[];
  territory: string;
  shareValue: number | null;
  workAssociation: string;
  status: string;
};

// Reads and checks the WIPO Agreement window.
export function readAgreement(b: Record<string, unknown>): AgreementIn | { error: string } {
  const type = String(b.type ?? "General");
  if (!(AGREEMENT_TYPES as readonly string[]).includes(type)) return { error: "Choose an Agreement Type." };
  const creationClass = String(b.creationClass ?? "").trim();
  if (!creationClass) return { error: "Creation Class is required." };
  const code = String(b.code ?? "").trim().slice(0, 60);
  if (!code) return { error: "Code is required." };
  const assignorName = String(b.assignorName ?? "").trim();
  const assigneeName = String(b.assigneeName ?? "").trim();
  if (!assignorName) return { error: "Assignor is required." };
  if (!assigneeName) return { error: "Assignee is required." };
  const ds = { signatureDate: date(b.signatureDate), startDate: date(b.startDate), endDate: date(b.endDate), effectiveStart: date(b.effectiveStart), effectiveEnd: date(b.effectiveEnd) };
  for (const [k, v] of Object.entries(ds)) if (v && !DATE.test(v)) return { error: `${k} is not a valid date.` };
  if (ds.startDate && ds.endDate && ds.endDate < ds.startDate) return { error: "End Date is before Start Date." };
  if (ds.effectiveStart && ds.effectiveEnd && ds.effectiveEnd < ds.effectiveStart) return { error: "Effective End Date is before Effective Start Date." };
  const allowed = rightTypesFor(creationClass);
  const rightTypes = Array.isArray(b.rightTypes) ? b.rightTypes.map(String).filter((r) => allowed.includes(r)) : [];
  const share = b.shareValue === "" || b.shareValue == null ? null : Number(b.shareValue);
  if (share != null && (!Number.isFinite(share) || share < 0 || share > 100)) return { error: "Shares must be between 0 and 100." };
  const status = String(b.status ?? "Valid");
  const sourceType = String(b.sourceType ?? "");
  return {
    code,
    type,
    creationClass,
    assignorId: b.assignorId ? String(b.assignorId) : null,
    assignorName: assignorName.slice(0, 300),
    assigneeId: b.assigneeId ? String(b.assigneeId) : null,
    assigneeName: assigneeName.slice(0, 300),
    ...ds,
    sourceType: (SOURCE_TYPES as readonly string[]).includes(sourceType) ? sourceType : "",
    sourceDetail: String(b.sourceDetail ?? "").slice(0, 300),
    rightTypes,
    territory: String(b.territory ?? "").trim().slice(0, 200),
    shareValue: share,
    workAssociation: (WORK_ASSOCIATIONS as readonly string[]).includes(String(b.workAssociation)) ? String(b.workAssociation) : "",
    status: (AGREEMENT_STATUSES as readonly string[]).includes(status) ? status : "Valid",
  };
}

// WIPO "Active": a valid agreement whose effective period covers today.
export function isActive(a: { status: string; effectiveStart: string; effectiveEnd: string }, today = new Date().toISOString().slice(0, 10)): boolean {
  if (a.status !== "Valid") return false;
  if (a.effectiveStart && a.effectiveStart > today) return false;
  if (a.effectiveEnd && a.effectiveEnd < today) return false;
  return true;
}
