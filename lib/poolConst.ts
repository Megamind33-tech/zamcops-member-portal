// Shared option lists for distribution pools and reserves (used by the
// staff console pages and kept in step with the API validation).
// WIPO Connect's six distribution methods. Work List is fully supported; the
// others are recorded on the pool and described in the console.
export const POOL_METHODS = ["Work List", "Log Based", "RO List", "Reserve", "Analogy", "CRD"] as const;
export const POOL_RIGHT_TYPES = ["Performing", "Mechanical", "Synchronisation", "Print", "Other"] as const;
export const RESERVE_TYPE_LIST = ["Unidentified", "Non-society", "Incomplete", "Undistributable", "Disputed"] as const;
export const RESERVE_STATUSES = ["Open", "In Distribution", "Prescribed", "Closed"] as const;
export const CREATION_CLASSES = ["MW", "AV", "AVP", "SR", "LW", "LF", "LN", "DW", "SM", "DM", "WA", "PH", "AC", "AD", "AF", "AM", "CW", "IS", "LS", "MM", "RW"] as const;
