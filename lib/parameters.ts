// WIPO Connect > Administration > Parameters. Sections, labels, field names
// and defaults are those of WIPO's own Parameters page (each section there
// has its own Save button). Values are stored as one JSON document.

export type ParamField = {
  key: string;
  label: string;
  kind: "text" | "select" | "check" | "multi" | "territory" | "currency";
  options?: string[];
};
export type ParamSection = { title: string; fields: ParamField[] };

export const CURRENCY_CODES = ["AED","AFN","ALL","AMD","ANG","AOA","ARS","AUD","AWG","AZN","BAM","BBD","BDT","BGN","BHD","BIF","BMD","BND","BOB","BOV","BRL","BSD","BTN","BWP","BYN","BYR","BZD","CAD","CDF","CHE","CHF","CHW","CLF","CLP","CNY","COP","COU","CRC","CUC","CUP","CVE","CZK","DJF","DKK","DOP","DZD","EGP","ERN","ETB","EUR","FJD","FKP","FOK","GBP","GEL","GGP","GHS","GIP","GMD","GNF","GTQ","GYD","HKD","HNL","HRK","HTG","HUF","IDR","ILS","IMP","INR","IQD","IRR","ISK","JEP","JMD","JOD","JPY","KES","KGS","KHR","KID","KMF","KPW","KRW","KWD","KYD","KZT","LAK","LBP","LKR","LRD","LSL","LYD","MAD","MDL","MGA","MKD","MMK","MNT","MOP","MRU","MUR","MVR","MWK","MXN","MXV","MYR","MZN","NAD","NGN","NIO","NOK","NPR","NZD","OMR","PAB","PEN","PGK","PHP","PKR","PLN","PYG","QAR","RHD","RON","RSD","RUB","RWF","SAR","SBD","SCR","SDG","SEK","SGD","SHP","SLL","SOS","SRD","SSP","STN","SVC","SYP","SZL","THB","TJS","TMT","TND","TOP","TRY","TTD","TWD","TZS","UAH","UGX","USD","USN","UYI","UYU","UZS","VES","VND","VUV","WST","XAF","XCD","XDR","XOF","XPF","YER","ZAR","ZMW","ZiG"];
export const YES_NO = ["Yes", "No"];
export const WORK_ROLE_CODES = ["A", "AC", "AD", "AG", "AM", "AP", "AQ", "AR", "AS", "AT", "C", "CA", "CD", "CG", "CM", "CO", "CP", "CT", "DA", "DD", "DG", "DS", "DW", "E", "EB", "EJ", "EM", "EP", "ES", "ET", "FA", "FD", "IN", "JO", "MD", "MS", "PA", "PC", "PD", "PE", "PH", "PO", "PR", "PS", "PU", "PW", "RC", "RE", "SA", "SE", "SR", "ST", "TR", "VA", "WP"];

export const PARAM_SECTIONS: ParamSection[] = [
  { title: "Country Of Operation", fields: [{ key: "territoryOfOperation", label: "Territory", kind: "territory" }] },
  { title: "Report Parameters", fields: [{ key: "reportLang", label: "Language", kind: "select", options: ["English", "French", "Portuguese", "Spanish"] }] },
  {
    title: "Number Format",
    fields: [
      { key: "decimalSeparator", label: "Decimal Separator", kind: "text" },
      { key: "groupingSeparator", label: "Grouping Separator", kind: "text" },
      { key: "currencySymbol", label: "Currency Symbol", kind: "text" },
      { key: "currencyPosition", label: "Currency Position", kind: "select", options: ["Before the amount", "After the amount"] },
    ],
  },
  { title: "Default Territories Of Affiliation", fields: [{ key: "territoryOfAffiliation", label: "Territory", kind: "text" }] },
  { title: "Default Work Territories", fields: [{ key: "territoryWork", label: "Territory", kind: "text" }] },
  {
    title: "Automatic Massive Sync",
    fields: [
      { key: "ipSyncEnabled", label: "IP Sync", kind: "check" },
      { key: "workSyncEnabled", label: "Work Sync", kind: "check" },
    ],
  },
  {
    title: "Passkey Configuration",
    fields: [
      { key: "rpId", label: "Rp Id", kind: "text" },
      { key: "rpName", label: "Rp Name", kind: "text" },
      { key: "allowedOrigin", label: "Allowed Origin", kind: "text" },
    ],
  },
  {
    title: "RO Work Role Groups",
    fields: [
      { key: "authorsWorkRoleList", label: "Authors", kind: "multi", options: WORK_ROLE_CODES },
      { key: "publishersWorkRoleList", label: "Publishers", kind: "multi", options: WORK_ROLE_CODES },
      { key: "performersWorkRoleList", label: "Performers", kind: "multi", options: WORK_ROLE_CODES },
      { key: "producersWorkRoleList", label: "Producers", kind: "multi", options: WORK_ROLE_CODES },
    ],
  },
  { title: "Original Right Owners Work Roles", fields: [{ key: "creatorsWorkRoleList", label: "List of Work Roles", kind: "multi", options: WORK_ROLE_CODES }] },
  { title: "Components Parameters", fields: [{ key: "isToManageComponents", label: "Manage Components", kind: "select", options: YES_NO }] },
  {
    title: "Minimum Work Import Criteria",
    fields: [
      { key: "identifier", label: "International Identifiers", kind: "check" },
      { key: "ipiNameNumber", label: "IPI Name Numbers", kind: "check" },
      { key: "ipiNameRole", label: "Main Roles", kind: "check" },
    ],
  },
  {
    title: "Distribution Parameters",
    fields: [
      { key: "reserveUpAmount", label: "Reserve UP amount", kind: "select", options: YES_NO },
      { key: "reserveToIncompleteRo", label: "Reserve to Incomplete RO", kind: "select", options: YES_NO },
      { key: "reserveToUDS", label: "Reserve to Undistributable Works", kind: "select", options: YES_NO },
      { key: "closedDays", label: "Close distribution (Days)", kind: "text" },
      { key: "reserveToNsRo", label: "Reserve to NS RO", kind: "select", options: YES_NO },
      { key: "reserveToDpRo", label: "Reserve to DP RO", kind: "select", options: YES_NO },
      { key: "amountsScale", label: "Number of digits", kind: "select", options: ["0", "2", "3", "4", "5", "6"] },
      { key: "currencyList", label: "CRD Payment Currency", kind: "currency" },
    ],
  },
  {
    title: "License Parameters",
    fields: [
      { key: "invoiceCmoName", label: "CMO Name", kind: "text" },
      { key: "invoiceCmoAddress1", label: "CMO Address 1", kind: "text" },
      { key: "invoiceCmoAddress2", label: "CMO Address 2", kind: "text" },
      { key: "invoiceCmoPhone", label: "CMO Phone", kind: "text" },
      { key: "cmoTaxNumber", label: "CMO Tax Number", kind: "text" },
      { key: "invoiceCmoBankName", label: "CMO Bank Name", kind: "text" },
      { key: "invoiceCmoBankNr", label: "CMO Bank Number", kind: "text" },
      { key: "cmoSignatureJobTitle", label: "CMO Signature: Job Title", kind: "text" },
      { key: "cmoSignatureName", label: "CMO Signature: Name", kind: "text" },
      { key: "cmoSignatureSurname", label: "CMO Signature: Surname", kind: "text" },
      { key: "licenseEnd", label: "License End Date", kind: "text" },
      { key: "agentCreationClass", label: "Agent Creation Class", kind: "select", options: YES_NO },
      { key: "agentLicenseeCategory", label: "Agent Licensee Category", kind: "select", options: YES_NO },
      { key: "agentTariffType", label: "Agent Tariff Type", kind: "select", options: YES_NO },
      { key: "agentArea", label: "Agent Area", kind: "select", options: YES_NO },
    ],
  },
  {
    title: "Main ID Configuration",
    fields: [
      { key: "licenseAgentMainIdPrefix", label: "Agent Main ID Prefix", kind: "text" },
      { key: "licenseMainIdPrefix", label: "License Main ID Prefix", kind: "text" },
      { key: "licenseeMainIdPrefix", label: "Licensee Main ID Prefix", kind: "text" },
      { key: "collectionRequestMainIdPrefix", label: "Collection Request Main ID Prefix", kind: "text" },
      { key: "tariffTypeMainIdPrefix", label: "Tariff Type Main ID Prefix", kind: "text" },
    ],
  },
];

// What WIPO Connect currently has configured for ZAMCOPS.
export const PARAM_DEFAULTS: Record<string, string | boolean | string[]> = {
  territoryOfOperation: "Zambia",
  reportLang: "English",
  decimalSeparator: ".",
  groupingSeparator: ",",
  currencySymbol: "ZMW",
  currencyPosition: "Before the amount",
  territoryOfAffiliation: "+2WL",
  territoryWork: "+2WL",
  ipSyncEnabled: false,
  workSyncEnabled: false,
  rpId: "",
  rpName: "",
  allowedOrigin: "",
  authorsWorkRoleList: ["A", "AD", "AR", "C", "CA", "PA", "SA", "SR"],
  publishersWorkRoleList: ["E", "ES", "SE"],
  performersWorkRoleList: ["AC", "IN"],
  producersWorkRoleList: ["PC"],
  creatorsWorkRoleList: ["A", "AD", "AR", "C", "CA", "E", "ES", "IN", "PA", "SA", "SE", "SR", "TR"],
  isToManageComponents: "No",
  identifier: false,
  ipiNameNumber: false,
  ipiNameRole: false,
  reserveUpAmount: "Yes",
  reserveToIncompleteRo: "Yes",
  reserveToUDS: "Yes",
  closedDays: "",
  reserveToNsRo: "Yes",
  reserveToDpRo: "No",
  amountsScale: "0",
  currencyList: "ZMW",
  invoiceCmoName: "",
  invoiceCmoAddress1: "",
  invoiceCmoAddress2: "",
  invoiceCmoPhone: "",
  cmoTaxNumber: "",
  invoiceCmoBankName: "",
  invoiceCmoBankNr: "",
  cmoSignatureJobTitle: "",
  cmoSignatureName: "",
  cmoSignatureSurname: "",
  licenseEnd: "30",
  agentCreationClass: "No",
  agentLicenseeCategory: "No",
  agentTariffType: "No",
  agentArea: "No",
  licenseAgentMainIdPrefix: "",
  licenseMainIdPrefix: "",
  licenseeMainIdPrefix: "",
  collectionRequestMainIdPrefix: "",
  tariffTypeMainIdPrefix: "",
};

export const PARAM_KEYS = Object.keys(PARAM_DEFAULTS);
