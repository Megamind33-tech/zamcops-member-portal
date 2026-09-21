// Checks what sign-up carries into the membership application.
//
// The point of the prefill is that a member is never asked the same thing
// twice, so this asserts the overlap is actually covered — and that every key
// it fills is a real question on the form it fills it on. A prefill key that
// no form asks for is an answer nobody ever sees; a repeated question the
// prefill misses is the repetition coming back.
//
//   node scripts/check-prefill.mjs

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const build = path.join(root, "tmp", "prefill-build");
rmSync(build, { recursive: true, force: true });
mkdirSync(build, { recursive: true });
const cfg = path.join(build, "tsconfig.json");
writeFileSync(
  cfg,
  JSON.stringify({
    compilerOptions: {
      outDir: build, rootDir: root, module: "commonjs", target: "es2020",
      moduleResolution: "node", esModuleInterop: true, skipLibCheck: true,
      baseUrl: root, paths: { "@/*": ["./*"] }, types: ["node"], noEmitOnError: false,
    },
    files: [path.join(root, "lib", "applicationPrefill.ts"), path.join(root, "lib", "applicationForms.ts")],
  }),
);
try {
  execFileSync(path.join(root, "node_modules", ".bin", "tsc"), ["-p", cfg], { cwd: root, stdio: "inherit" });
} catch { /* emitted anyway */ }

const load = (f) => import(pathToFileURL(path.join(build, "lib", f)).href);
const { prefillFromAccount, withPrefill, splitName, addressLine, districtProvince } =
  await load("applicationPrefill.js");
const { FORM_DEFS, FORM_TYPES } = await load("applicationForms.js");

const MEMBER = {
  fullName: "Bwalya Mwansa Chileshe",
  stageName: "BM Kopala",
  nrcOrPassport: "284619/61/1",
  dateOfBirth: "1991-04-17",
  gender: "Female",
  role: "Composer",
  email: "bwalya.chileshe@example.zm",
  phone: "+260 977 401 882",
  address: "Plot 4417 Kabulonga Road",
  district: "Lusaka",
  province: "Lusaka",
  bankName: "Zanaco, Cairo Road",
  bankAccount: "0123456789012",
  mobileMoneyNumber: "0977 401882 (MTN)",
  nextOfKinName: "Kelvin Chileshe",
};

const problems = [];
const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad = (m) => { problems.push(m); console.log(`  \x1b[31m✗\x1b[0m ${m}`); };

// Every key the prefill fills must be a question the form actually asks.
for (const type of FORM_TYPES) {
  const asked = new Set();
  for (const section of FORM_DEFS[type].sections) {
    for (const f of section.fields ?? []) asked.add(f.key);
    if (section.repeat) asked.add(section.repeat.key);
  }
  const filled = Object.keys(prefillFromAccount(MEMBER, type));
  const orphans = filled.filter((k) => !asked.has(k));
  if (orphans.length) bad(`${type}: fills ${orphans.join(", ")}, which that form never asks`);
  else ok(`${type}: all ${filled.length} prefilled answers are real questions on the form`);
}

// The details sign-up already took must not be asked again on the Individual
// form — this is the repetition the change exists to remove.
const individual = prefillFromAccount(MEMBER, "Individual");
for (const [key, expected] of [
  ["surname", "Chileshe"],
  ["firstName", "Bwalya Mwansa"],
  ["nrcNumber", "284619/61/1"],
  ["cell", "+260 977 401 882"],
  ["email", "bwalya.chileshe@example.zm"],
  ["pseudonyms", "BM Kopala"],
]) {
  if (individual[key] === expected) ok(`Individual.${key} comes from the account`);
  else bad(`Individual.${key} is ${JSON.stringify(individual[key])}, expected ${JSON.stringify(expected)}`);
}

// The NRC belongs in the NRC box. An earlier copy of this mapping put it in
// the passport box, which is exactly the defect the printed forms had.
if (individual.passportNo === undefined) ok("the NRC is not written into the passport box");
else bad(`passportNo was prefilled with ${JSON.stringify(individual.passportNo)} — the NRC is not a passport number`);

// What the member typed always wins.
const merged = withPrefill({ surname: "Chileshe-Mulenga", firstName: "" }, MEMBER, "Individual");
if (merged.surname === "Chileshe-Mulenga") ok("an answer the member typed beats the account's");
else bad(`the account overwrote the member's own surname (${merged.surname})`);
if (merged.firstName === "Bwalya Mwansa") ok("a blank the member left is still filled from the account");
else bad(`a blank was not filled from the account (${JSON.stringify(merged.firstName)})`);

// A district that carries its province's name is written once. The specimen
// member lives in Lusaka district, Lusaka province, and every document that
// named them — the deed, the admission letter, the certificate — addressed
// them in "Lusaka, Lusaka".
if (districtProvince("Lusaka", "Lusaka") === "Lusaka") ok("a district is not repeated as its own province");
else bad(`district and province read as ${JSON.stringify(districtProvince("Lusaka", "Lusaka"))}`);
if (districtProvince("Kabwe", "Central") === "Kabwe, Central") ok("a district and a different province are both written");
else bad(`a distinct district and province read as ${JSON.stringify(districtProvince("Kabwe", "Central"))}`);
if (districtProvince("", "Lusaka") === "Lusaka") ok("a missing district leaves no stray comma");
else bad(`a missing district read as ${JSON.stringify(districtProvince("", "Lusaka"))}`);

const addr = addressLine(MEMBER);
if (!/Lusaka.*Lusaka/.test(addr)) ok(`the address line reads ${JSON.stringify(addr)}`);
else bad(`the address line repeats the town: ${JSON.stringify(addr)}`);

// Zambian convention: the last word is the surname.
const one = splitName("Mampi");
if (one.surname === "Mampi" && one.firstName === "") ok("a single-word name files as the surname");
else bad(`single-word name split wrongly: ${JSON.stringify(one)}`);

if (problems.length) {
  console.log(`\n\x1b[31m${problems.length} problem(s) with the sign-up prefill.\x1b[0m`);
  process.exit(1);
}
console.log("\n\x1b[32mSign-up answers reach the application, and nothing is asked twice.\x1b[0m");
