// Values WIPO Connect offers in its Matching Settings windows (no server imports, safe for pages).
export const COLUMN_TYPES = ["Matching", "Allocation", "Split"] as const;
export const FIELD_TYPES = ["String", "Integer"] as const;
export const TARGET_FIELDS = ["TITLE", "CREATOR", "PERFORMER", "IDENTIFIER"] as const;
export const PRE_MATCH_METHODS = ["Exact", "Fuzzy"] as const;
export const PRECISIONS = ["0.1", "0.01", "0.001", "0.0001", "0.00001", "0.000001"] as const;
export const DISTR_STATUSES = ["Fully Distributable", "Partially Distributable", "Not Distributable"] as const;

export type LogField = { column: string; columnType: string; targetField: string; fieldType: string; targetCode: string };
export type LogWeight = { column: string; weight: number | null; similarity: number | null; method: string; priority: number | null };
