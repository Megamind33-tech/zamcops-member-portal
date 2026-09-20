// Renders each kind of message the portal sends, so the mail can be looked at
// rather than assumed. Writes one HTML file per message plus its plain-text
// alternative, which is the half nobody ever checks.
//
//   node scripts/preview-emails.mjs [outDir]

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const outDir = process.argv[2] ?? path.join(root, "tmp", "emails");
const build = path.join(root, "tmp", "email-build");
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
    files: [path.join(root, "lib", "email.ts")],
  }),
);
try {
  execFileSync(path.join(root, "node_modules", ".bin", "tsc"), ["-p", cfg], { cwd: root, stdio: "inherit" });
} catch { /* emitted anyway */ }

process.env.PORTAL_DOMAIN = process.env.PORTAL_DOMAIN || "zamcopsportal.org";
const { renderEmail } = await import(pathToFileURL(path.join(build, "lib", "email.js")).href);

const MESSAGES = [
  {
    name: "verification-code",
    subject: "418302 is your ZAMCOPS verification code",
    preheader: "The code expires in 10 minutes.",
    heading: "Confirm your email address",
    greeting: "Hello Bwalya,",
    paragraphs: ["Enter this code in the portal to finish setting up your ZAMCOPS membership account."],
    code: { value: "418302", caption: "Expires in 10 minutes" },
    footnote:
      "If you did not ask for this code, you can ignore this email — nobody can use it without access to your inbox.",
  },
  {
    name: "work-approved",
    subject: "“Mutima Wandi” is on the register",
    preheader: "Your clearance certificate is ready to download.",
    heading: "“Mutima Wandi” is on the register",
    greeting: "Hello Bwalya,",
    paragraphs: [
      "The society has entered your work in the ZAMCOPS register. Your clearance certificate is filed under My Documents and can be downloaded at any time.",
    ],
    facts: [
      { label: "Work", value: "Mutima Wandi" },
      { label: "Registered on", value: "20/09/2026" },
      { label: "Certificate reference", value: "COR-A1B2C3-2026-00417" },
      { label: "Member number", value: "ZAM-2026-00417" },
    ],
    action: { label: "View the certificate", href: "/documents" },
    footnote: "You can change which notices reach you under Settings → Notification preferences.",
  },
  {
    name: "admitted",
    subject: "You have been admitted to ZAMCOPS",
    preheader: "Your deed of assignment and admission letter are ready.",
    heading: "Welcome to the society",
    greeting: "Hello Bwalya,",
    paragraphs: [
      "Your first work has been accepted onto the register, and you are now a CANDIDATE member of ZAMCOPS.",
      "Four documents have been filed under My Documents: your membership application as submitted, the Deed of Assignment executed by you and the society, your admission letter, and the clearance certificate for this submission.",
    ],
    facts: [
      { label: "Member number", value: "ZAM-2026-00417" },
      { label: "Membership class", value: "CANDIDATE" },
      { label: "Admitted on", value: "20/09/2026" },
    ],
    action: { label: "Open My Documents", href: "/documents" },
  },
];

mkdirSync(outDir, { recursive: true });
for (const m of MESSAGES) {
  const { name, ...content } = m;
  const { html, text } = renderEmail(content);
  writeFileSync(path.join(outDir, `${name}.html`), html);
  writeFileSync(path.join(outDir, `${name}.txt`), text);
  console.log(`  ${name.padEnd(20)} ${String(html.length).padStart(5)} B html, ${String(text.length).padStart(4)} B text`);
}
console.log(`\nWrote ${MESSAGES.length} messages to ${path.relative(root, outDir)}`);
