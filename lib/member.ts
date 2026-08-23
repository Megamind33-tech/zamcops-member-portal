import type { Member } from "@/types";

// Fields that make up a complete membership profile. Used for the completion meter
// on the dashboard and profile screens.
const PROFILE_FIELDS: (keyof Member)[] = [
  "fullName",
  "stageName",
  "nrcOrPassport",
  "dateOfBirth",
  "gender",
  "phone",
  "email",
  "province",
  "district",
  "address",
  "bankName",
  "bankAccount",
  "nextOfKinName",
  "nrcDocument",
  "profilePhoto",
];

export function profileCompletion(member: Member): number {
  const filled = PROFILE_FIELDS.filter((f) => {
    const v = member[f];
    return v !== undefined && v !== null && String(v).trim() !== "";
  }).length;
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

export function missingProfileFields(member: Member): string[] {
  const labels: Partial<Record<keyof Member, string>> = {
    dateOfBirth: "Date of birth",
    gender: "Gender",
    province: "Province",
    district: "District",
    address: "Address",
    bankName: "Bank / mobile money",
    nextOfKinName: "Next of kin",
    nrcDocument: "NRC / passport upload",
    profilePhoto: "Profile photo",
  };
  return (Object.keys(labels) as (keyof Member)[])
    .filter((f) => !String(member[f] ?? "").trim())
    .map((f) => labels[f]!);
}
