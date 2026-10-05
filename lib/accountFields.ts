export const UI_LANGUAGES = ["English", "French", "Portuguese", "Spanish"];
export const ACCOUNT_TYPES = ["Operator", "Agent"];

export type AccountFields = {
  email: string;
  name: string;
  firstName: string;
  language: string;
  accountType: string;
  active: boolean;
  tags: string;
  matchMin: number | null;
  matchMax: number | null;
  groupIds: string[];
};

const amount = (v: unknown): number | null | "bad" => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : "bad";
};

// Reads and checks the WIPO "User Account" form.
export function readAccount(b: Record<string, unknown>): AccountFields | { error: string } {
  const email = String(b.email ?? "").trim().toLowerCase();
  const name = String(b.name ?? "").trim();
  if (!email || !name) return { error: "Email and Name are required." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address." };
  const matchMin = amount(b.matchMin);
  const matchMax = amount(b.matchMax);
  if (matchMin === "bad" || matchMax === "bad") return { error: "Matching Amount must be a positive number." };
  if (matchMin != null && matchMax != null && matchMin > matchMax) return { error: "Matching Amount Min cannot be above Max." };
  return {
    email,
    name: name.slice(0, 200),
    firstName: String(b.firstName ?? "").trim().slice(0, 200),
    language: UI_LANGUAGES.includes(String(b.language)) ? String(b.language) : "English",
    accountType: ACCOUNT_TYPES.includes(String(b.accountType)) ? String(b.accountType) : "Operator",
    active: b.active !== false && b.active !== "Not active",
    tags: String(b.tags ?? "").trim().slice(0, 300),
    matchMin,
    matchMax,
    groupIds: Array.isArray(b.groupIds) ? b.groupIds.map(String) : [],
  };
}
