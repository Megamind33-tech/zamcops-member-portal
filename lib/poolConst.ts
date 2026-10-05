// Shared option lists for stations and distribution pools (used by the staff
// console pages and kept in step with the API validation).
export const STATION_KINDS = ["Radio", "Television", "Live performance", "Online", "Other"] as const;
export const POOL_METHODS = ["Work List", "Log Based"] as const;
export const POOL_RIGHT_TYPES = ["Performing", "Mechanical", "Synchronisation", "Print", "Other"] as const;
