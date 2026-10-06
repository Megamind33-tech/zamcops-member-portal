// WIPO Connect BI & Reports: the 38 queries it offers and the parameters each takes
// (copied from its own page). `run` marks the ones this portal can answer from the
// data it holds; the rest are reports in another society's format.
export type BiParam = { code: string; label: string; type: "STRING" | "DATE" | "INTEGER" | "CMO" | "MULTISELECT" };
export type BiQueryDef = { name: string; params: BiParam[]; run?: string; why?: string };

const P = (code: string, label: string, type: BiParam["type"] = "STRING"): BiParam => ({ code, label, type });
const CMO = P("cmo_code", "CMO Code");
const DIST = P("distribution_code", "Distribution Code");
const FROM = P("date_from", "From", "DATE");
const TO = P("date_to", "To", "DATE");
const OTHER_FORMAT = "This is a report in another society's file format and is not available in the portal.";

export const BI_QUERIES: BiQueryDef[] = [
  { name: "WORK Identifier", params: [CMO, P("identifier_code", "IdentifierCode")], run: "workIdentifier" },
  { name: "WORK Status", params: [], run: "workStatus" },
  { name: "Distributable status", params: [], run: "distributableStatus" },
  { name: "Distributed", params: [], run: "distributed" },
  { name: "Distributed per Main Id and CC", params: [P("work_main_id", "Main Id"), P("cc", "CC")], run: "distributedPerWork" },
  { name: "Entered within a certain period of time", params: [P("date_from", "From", "DATE"), P("date_to", "To", "DATE")], run: "workEntered" },
  { name: "SR without any PC", params: [P("cmo_code", "CMO code")], why: "Needs the sound recording producer (PC) roles, which the portal's register does not break out." },
  { name: "SWI Reports", params: [P("cc", "CC Code"), P("registration_date_from", "Registration from", "DATE"), P("registration_date_to", "Registration to", "DATE")], why: OTHER_FORMAT },
  { name: "Works declared by members", params: [P("cmoCode", "CMO Code"), P("date_from", "Registration Date From", "DATE"), P("date_to", "Registration Date To", "DATE")], run: "worksDeclared" },
  { name: "Work Set format for CWR", params: [P("registration_date_from", "Registration Date From", "DATE"), P("registration_date_to", "Registration Date To", "DATE")], why: OTHER_FORMAT },
  { name: "Creation class", params: [CMO], run: "creationClass" },
  { name: "Role", params: [CMO], run: "role" },
  { name: "City", params: [CMO], run: "city" },
  { name: "RO Identifier", params: [CMO], run: "roIdentifier" },
  { name: "RO Status", params: [], run: "roStatus" },
  { name: "Birthday", params: [CMO], run: "birthday" },
  { name: "Deceased", params: [CMO], run: "deceased" },
  { name: "IPBN-IPINN discrepancies", params: [CMO], run: "ipDiscrepancies" },
  { name: "Joined within specific period", params: [CMO, FROM, TO], run: "joined" },
  { name: "Minors/below 18 years of age", params: [CMO], run: "minors" },
  { name: "Certain age", params: [CMO, P("age", "Age", "INTEGER")], run: "certainAge" },
  { name: "Distributed Amount", params: [P("date_from_1", "Amount 1 From", "DATE"), P("date_to_1", "Amount 1 To", "DATE"), P("date_from_2", "Amount 2 From", "DATE"), P("date_to_2", "Amount 2 To", "DATE"), CMO], run: "distributedAmount" },
  { name: "Work Genre", params: [P("genre", "Genre Wipocos")], run: "workGenre" },
  { name: "No Works for a specific CC", params: [P("cc_code", "CC Code"), CMO], run: "noWorksForCc" },
  { name: "Number of Works by RO", params: [P("cmoCode", "CMO Code"), P("creationClasses", "Creation Classes", "MULTISELECT")], run: "worksByRo" },
  { name: "Lack of IPI Name Number", params: [P("cmoCode", "CMO Code"), P("creationClasses", "Creation Classes", "MULTISELECT")], run: "lackIpi" },
  { name: "RO", params: [DIST, P("cmo_code", "CMO Code", "CMO")], run: "roPaid" },
  { name: "RO and Distribution Pool", params: [DIST], run: "roPool" },
  { name: "Work", params: [DIST], run: "workPaid" },
  { name: "Work and Distribution Pool", params: [DIST], run: "workPool" },
  { name: "Unidentified grouped Title", params: [DIST], run: "unidentifiedTitle" },
  { name: "Unidentified grouped Title and Distribution Pool code", params: [DIST], run: "unidentifiedTitlePool" },
  { name: "UP list by Distribution and DPL ID", params: [P("distribution_code", "Distritbution code")], run: "upList" },
  { name: "CAPASSO - SWI Format", params: [CMO, P("creationClassCode", "Creation Class Code"), P("date_from", "Registration Date From", "DATE"), P("date_to", "Registration Date To", "DATE"), P("recordsNumber", "Number of Records", "INTEGER"), P("pageNumber", "Page", "INTEGER")], why: OTHER_FORMAT },
  { name: "SONACAM - MW Repertoire format", params: [CMO, P("date_from", "Registration Date From", "DATE"), P("date_to", "Registration Date To", "DATE")], why: OTHER_FORMAT },
  { name: "ZIMURA - Membership Repertoire", params: [], why: OTHER_FORMAT },
  { name: "ZAMCOPS - List of beneficiaries per society code", params: [DIST], run: "beneficiaries" },
  { name: "UPRS - Disaffiliated members", params: [P("affiliation_end_date_from", "Affiliation End Date From", "DATE"), P("affiliation_end_date_to", "Affiliation End Date To", "DATE")], why: OTHER_FORMAT },
  { name: "UPRS - Repertoire report", params: [P("registration_date_from", "Registration Date From", "DATE"), P("registration_date_to", "Registration Date To", "DATE")], why: OTHER_FORMAT },
  { name: "COPYGHANA - List of works by type and market", params: [CMO, P("year_from", "Publication Year From"), P("year_to", "Publication Year To"), P("cc_code", "CC Code")], why: OTHER_FORMAT },
  { name: "ZARRSO - Copyright Detained on T&I", params: [P("cmoCode", "CMO Code"), P("creationClasses", "Creation Classes", "MULTISELECT")], why: OTHER_FORMAT },
  { name: "GHAMRO - Distribution Payment Method (ONLY FOR GHAMRO)", params: [DIST], why: OTHER_FORMAT },
  { name: "Member's contact", params: [], run: "memberContacts" },
];
