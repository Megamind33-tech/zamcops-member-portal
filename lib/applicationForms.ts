// The official ZAMCOPS membership application forms, digitised field-for-field
// from the paper documents (Individual / Group / Publisher). This is the single
// source of truth shared by the member-facing wizard and the server-side PDF
// renderer, so the portal form and the printed form can never drift apart.

export type ApplicationFormType = "Individual" | "Group" | "Publisher";
export type ApplicationStatus = "Draft" | "Submitted" | "Approved" | "Rejected";

export type AppFieldType = "text" | "date" | "select" | "textarea" | "yesno" | "checkboxes";

export interface AppField {
  key: string;
  label: string;
  type: AppFieldType;
  options?: string[]; // for select / checkboxes
  required?: boolean;
  hint?: string;
  // Only show (and print) this field when another answer matches.
  showIf?: { key: string; value: string };
}

// A repeatable table of rows (e.g. "Members of group", "Works produced").
export interface AppRepeat {
  key: string;
  label: string;
  addLabel: string;
  columns: { key: string; label: string }[];
}

export interface AppSection {
  id: string;
  title: string;
  description?: string;
  fields?: AppField[];
  repeat?: AppRepeat;
}

export interface ApplicationFormDef {
  type: ApplicationFormType;
  title: string; // exact title printed on the form
  sections: AppSection[];
}

// Declaration printed above the applicant's signature on all three forms —
// verbatim from the paper documents.
export const DECLARATION_TEXT =
  "I understand that, if admitted, my membership will be subject to the Memorandum and Articles of " +
  "Association of the Society and that my rights, obligations and liabilities as a member will be governed " +
  "by the Memorandum and Articles of Association and all rules and regulations made thereunder.";

// Society letterhead lines (shared by every generated document).
export const SOCIETY_NAME = "ZAMBIA MUSIC COPYRIGHT PROTECTION SOCIETY";
export const SOCIETY_TAGLINE =
  "(Nonprofit Making, Affiliated to International Confederation of Societies of Authors & Composers - CISAC)";
export const SOCIETY_ADDRESS =
  "Anchor House, 3rd Floor. P.O. Box 51259, LUSAKA, Zambia";
export const SOCIETY_CONTACT =
  "Telefax: +260-1-229270 · E-mail: info@zamcops.org · Website: www.zamcops.org.zm";

const YESNO = ["Yes", "No"];

export const INDIVIDUAL_FORM: ApplicationFormDef = {
  type: "Individual",
  title: "APPLICATION FOR INDIVIDUAL MEMBERSHIP",
  sections: [
    {
      id: "personal",
      title: "Personal details",
      fields: [
        { key: "surname", label: "Surname", type: "text", required: true },
        { key: "firstName", label: "First name", type: "text", required: true },
        { key: "maidenName", label: "Maiden name", type: "text" },
        { key: "pseudonyms", label: "Pseudonyms", type: "text", hint: "Names you compose, write or publish under" },
        { key: "differentSpelling", label: "Different spelling of your name", type: "text" },
        { key: "sex", label: "Sex", type: "select", options: ["Male", "Female"], required: true },
        { key: "dateOfBirth", label: "Date of birth", type: "date", required: true },
        { key: "placeOfBirth", label: "Place of birth (country)", type: "text", required: true },
        { key: "nationality", label: "Nationality", type: "text", required: true },
        { key: "passportNo", label: "NRC / Passport number", type: "text", required: true },
        { key: "language", label: "Language", type: "text" },
        {
          key: "maritalStatus",
          label: "Marital status",
          type: "select",
          options: ["Single", "Married", "Divorced", "Widowed"],
        },
        { key: "spouse", label: "Spouse", type: "text", showIf: { key: "maritalStatus", value: "Married" } },
      ],
    },
    {
      id: "ipi",
      title: "IPI identification",
      description: "Leave blank if you have not been assigned IPI numbers yet — ZAMCOPS registers these for you.",
      fields: [
        { key: "ipiNameNumber", label: "IPI name number", type: "text" },
        { key: "ipiBaseNumber", label: "IPI base number", type: "text" },
      ],
    },
    {
      id: "contact",
      title: "Contact address",
      fields: [
        { key: "resAddress", label: "Contact address (residential)", type: "textarea", required: true },
        { key: "postalAddress", label: "Postal address", type: "textarea" },
        { key: "website", label: "Website", type: "text" },
      ],
    },
    {
      id: "payment",
      title: "Payment details",
      fields: [
        {
          key: "paymentMethod",
          label: "Payment method",
          type: "select",
          options: ["Bank transfer", "Mobile money", "Cheque", "Cash"],
        },
        { key: "bankAddress", label: "Bank name & branch address", type: "textarea" },
        { key: "accountNumber", label: "Account number", type: "text" },
      ],
    },
    {
      id: "employment",
      title: "Employment & other societies",
      fields: [
        {
          key: "fullTimeEmployment",
          label:
            "Apart from your involvement in artistic and literary works, do you have any full time employment with any government department / organisation / company?",
          type: "yesno",
          options: YESNO,
          required: true,
        },
        {
          key: "employerDetails",
          label: "If yes, name and address of the government department / organisation / company",
          type: "textarea",
          showIf: { key: "fullTimeEmployment", value: "Yes" },
        },
        {
          key: "otherSociety",
          label: "Are you a member of any other Copyright Society?",
          type: "yesno",
          options: YESNO,
          required: true,
        },
        {
          key: "otherSocietyDetails",
          label: "If yes, give details",
          type: "textarea",
          showIf: { key: "otherSociety", value: "Yes" },
        },
      ],
    },
    {
      id: "capacity",
      title: "Capacity",
      description:
        "ZAMCOPS membership is for composers, authors and publishers. Arrangers are credited on each work and receive a share; they are not a membership class. Related rights (performers, producers) are not administered.",
      fields: [
        {
          key: "capacities",
          label: "Tick as appropriate",
          type: "checkboxes",
          options: ["Composer", "Author", "Publisher"],
          required: true,
        },
      ],
    },
    {
      id: "works",
      title: "Works produced",
      description:
        "Indicate the works you have produced that have been performed / adapted / translated before and by whom, giving dates.",
      repeat: {
        key: "worksProduced",
        label: "Works produced",
        addLabel: "Add a work",
        columns: [
          { key: "title", label: "Work title" },
          { key: "performedBy", label: "Performed / adapted / translated by" },
          { key: "date", label: "Date" },
        ],
      },
    },
    {
      id: "other",
      title: "Other information",
      fields: [{ key: "otherInfo", label: "Any other relevant information", type: "textarea" }],
    },
    {
      id: "inheritance",
      title: "Inheritance — successor representative",
      description: "Who should represent your rights in the event of your death?",
      fields: [
        { key: "successorName", label: "Successor representative — name", type: "text" },
        { key: "successorAddress", label: "Successor representative — address", type: "textarea" },
      ],
    },
  ],
};

export const GROUP_FORM: ApplicationFormDef = {
  type: "Group",
  title: "GROUP MEMBERSHIP APPLICATION FORM",
  sections: [
    {
      id: "group",
      title: "Group identity",
      fields: [
        { key: "groupName", label: "Group name", type: "text", required: true },
        { key: "differentSpellings", label: "Different spellings", type: "text" },
        { key: "groupType", label: "Type", type: "text", hint: "e.g. Band, Choir, Ensemble" },
        { key: "ipiNameNumber", label: "IPI name number", type: "text" },
        { key: "ipiBaseNumber", label: "IPI base number", type: "text" },
      ],
    },
    {
      id: "foundation",
      title: "Foundation",
      fields: [
        { key: "dateOfFoundation", label: "Date of foundation", type: "date", required: true },
        { key: "placeOfFoundation", label: "Place of foundation", type: "text", required: true },
        { key: "country", label: "Country", type: "text", required: true },
        { key: "language", label: "Language", type: "text" },
        { key: "passportOrIdNumber", label: "Passport or identity card number", type: "text", required: true },
      ],
    },
    {
      id: "representative",
      title: "Representative and addresses",
      fields: [
        { key: "repName", label: "Representative — name or title", type: "text", required: true },
        { key: "homeAddress", label: "Home address", type: "textarea", required: true },
        { key: "homeEmail", label: "Email (home)", type: "text" },
        { key: "homeWebsite", label: "Website (home)", type: "text" },
        { key: "correspondenceAddress", label: "Correspondence address", type: "textarea" },
        { key: "cell", label: "Cell", type: "text", required: true },
        { key: "corrEmail", label: "Email (correspondence)", type: "text" },
        { key: "corrWebsite", label: "Website (correspondence)", type: "text" },
      ],
    },
    {
      id: "payments",
      title: "Payments — copyright",
      fields: [
        { key: "payee", label: "Payee", type: "text" },
        { key: "rate", label: "Rate", type: "text" },
        {
          key: "paymentMethod",
          label: "Method",
          type: "select",
          options: ["Bank transfer", "Mobile money", "Cheque", "Cash"],
        },
        { key: "bankAccount", label: "Bank account", type: "text" },
      ],
    },
    {
      id: "members",
      title: "Members of the group",
      repeat: {
        key: "groupMembers",
        label: "Members of the group",
        addLabel: "Add a member",
        columns: [
          { key: "surname", label: "Surname" },
          { key: "firstName", label: "First name" },
          { key: "ipiNameNumber", label: "IPI name number" },
        ],
      },
    },
    {
      id: "rights",
      title: "Managed rights (membership)",
      fields: [
        { key: "regionOrCity", label: "Region or city (residence)", type: "text" },
        { key: "categoryOfWorks", label: "Category of works", type: "text", hint: "e.g. Popular music, Gospel, Traditional" },
        { key: "rightHolderRole", label: "Type of right holder (role)", type: "text", hint: "e.g. Composer, Author, Publisher" },
        { key: "managedRights", label: "Managed or transferred rights", type: "text", hint: "e.g. Performing, Mechanical" },
        { key: "territories", label: "Territories", type: "text", hint: "e.g. Worldwide" },
      ],
    },
  ],
};

export const PUBLISHER_FORM: ApplicationFormDef = {
  type: "Publisher",
  title: "PUBLISHER MEMBERSHIP APPLICATION FORM",
  sections: [
    {
      id: "corporate",
      title: "Corporate identity",
      fields: [
        { key: "corporateName", label: "Corporate name", type: "text", required: true },
        { key: "spellingsMarks", label: "Spellings / marks", type: "text" },
        { key: "companyType", label: "Type", type: "text" },
        { key: "ipiNameNumber", label: "IPI name number", type: "text" },
        { key: "ipiBaseNumber", label: "IPI base number", type: "text" },
      ],
    },
    {
      id: "foundation",
      title: "Foundation & registration",
      fields: [
        { key: "foundationDate", label: "Foundation date", type: "date", required: true },
        { key: "foundationPlace", label: "Foundation place", type: "text", required: true },
        { key: "country", label: "Country", type: "text", required: true },
        { key: "language", label: "Language", type: "text" },
        { key: "commercialRegistrationDate", label: "Commercial registration date", type: "date", required: true },
        { key: "commercialRegistrationNumber", label: "Commercial registration number", type: "text", required: true },
        { key: "dateOfCopy", label: "Date of copy", type: "date" },
        { key: "legalForm", label: "Legal form", type: "text", hint: "e.g. Limited company, Partnership" },
      ],
    },
    {
      id: "addresses",
      title: "Addresses",
      fields: [
        { key: "headquartersAddress", label: "Headquarters", type: "textarea", required: true },
        { key: "hqEmail", label: "Email (headquarters)", type: "text" },
        { key: "hqWebsite", label: "Website (headquarters)", type: "text" },
        { key: "correspondenceAddress", label: "Correspondence address", type: "textarea" },
        { key: "cell", label: "Cell", type: "text", required: true },
        { key: "corrEmail", label: "Email (correspondence)", type: "text" },
        { key: "corrWebsite", label: "Website (correspondence)", type: "text" },
      ],
    },
    {
      id: "payments",
      title: "Payments — publisher",
      fields: [
        {
          key: "paymentMethod",
          label: "Method",
          type: "select",
          options: ["Bank transfer", "Mobile money", "Cheque", "Cash"],
        },
        { key: "bankAccount", label: "Bank account", type: "text" },
      ],
    },
    {
      id: "managers",
      title: "Managers and biography",
      repeat: {
        key: "managers",
        label: "Managers",
        addLabel: "Add a manager",
        columns: [
          { key: "name", label: "Name" },
          { key: "position", label: "Position" },
        ],
      },
      fields: [{ key: "biography", label: "Biography", type: "textarea" }],
    },
    {
      id: "rights",
      title: "Managed rights (membership)",
      fields: [
        { key: "regionOrCity", label: "Region or city (residence)", type: "text" },
        { key: "categoryOfWorks", label: "Category of works", type: "text" },
        { key: "rightHolderRole", label: "Type of right holder (role)", type: "text", hint: "e.g. Original publisher, Sub-publisher" },
        { key: "managedRights", label: "Managed or transferred rights", type: "text" },
        { key: "territories", label: "Territories", type: "text" },
      ],
    },
    {
      id: "inheritance",
      title: "Liquidation and inheritance — successor representative",
      fields: [
        { key: "successorName", label: "Successor representative — name", type: "text" },
        { key: "successorAddress", label: "Successor representative — address", type: "textarea" },
      ],
    },
  ],
};

export const FORM_DEFS: Record<ApplicationFormType, ApplicationFormDef> = {
  Individual: INDIVIDUAL_FORM,
  Group: GROUP_FORM,
  Publisher: PUBLISHER_FORM,
};

export const FORM_TYPES: ApplicationFormType[] = ["Individual", "Group", "Publisher"];

// Staff-only fields ("Internal use") — the paper forms carry these in the
// margins; in the portal they live on the admin member view.
export const ADMIN_FIELDS: { key: string; label: string; type: "text" | "date" }[] = [
  { key: "internalNumber", label: "Internal number", type: "text" },
  { key: "circleOfOccupation", label: "Circle of occupation", type: "text" },
  { key: "fileRef", label: "File", type: "text" },
  { key: "subscription", label: "Subscription", type: "text" },
  { key: "membershipPosition", label: "Membership status (position)", type: "text" },
  { key: "admissionDate", label: "Entry / admission date", type: "date" },
  { key: "exitDate", label: "Exit date", type: "date" },
];

// The applicant name a document should carry, per form type.
export function applicantName(formType: ApplicationFormType, payload: Record<string, unknown>, fallback: string): string {
  const p = payload as Record<string, string>;
  if (formType === "Individual") {
    const n = [p.firstName, p.surname].filter(Boolean).join(" ").trim();
    return n || fallback;
  }
  if (formType === "Group") return (p.groupName || "").trim() || fallback;
  return (p.corporateName || "").trim() || fallback;
}

// Which required field keys are missing from a payload (repeats are optional).
export function missingRequiredFields(def: ApplicationFormDef, payload: Record<string, unknown>): string[] {
  const p = payload as Record<string, unknown>;
  const missing: string[] = [];
  for (const section of def.sections) {
    for (const f of section.fields ?? []) {
      if (!f.required) continue;
      if (f.showIf && String(p[f.showIf.key] ?? "") !== f.showIf.value) continue;
      const v = p[f.key];
      const empty = f.type === "checkboxes" ? !Array.isArray(v) || v.length === 0 : !String(v ?? "").trim();
      if (empty) missing.push(f.label);
    }
  }
  return missing;
}
