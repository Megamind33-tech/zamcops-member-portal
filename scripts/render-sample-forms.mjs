// Renders every official form with specimen answers, so placement can be
// checked against the paper without registering a member.
//
//   node scripts/render-sample-forms.mjs [outDir]
//
// The answers below deliberately fill every box the portal can fill, including
// the long free-text ones, because a map is only wrong in the places nobody
// tried. Pair it with scripts/verify-form-fill.py, which reads the output back
// and asserts each value landed on the rule it was mapped to.
//
// The repo has no TypeScript runner, so this compiles the handful of modules it
// needs into a temp directory and rewrites the "@/" imports on the way out.

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const outDir = process.argv[2] ?? path.join(root, "tmp", "forms");
// Inside the repo, not the system temp dir: the compiled modules still have to
// resolve pdf-lib out of node_modules.
const build = path.join(root, "tmp", "form-build");
rmSync(build, { recursive: true, force: true });
mkdirSync(build, { recursive: true });

// tsc only reads "paths" from a config file, so it gets one.
const cfg = path.join(build, "tsconfig.render.json");
writeFileSync(
  cfg,
  JSON.stringify({
    compilerOptions: {
      outDir: build,
      rootDir: root,
      module: "commonjs",
      target: "es2020",
      moduleResolution: "node",
      esModuleInterop: true,
      resolveJsonModule: true,
      skipLibCheck: true,
      baseUrl: root,
      paths: { "@/*": ["./*"] },
      types: ["node"],
      // Emit even if something fails to typecheck: `npx tsc --noEmit` is where
      // type errors belong, and a half-checked render is still worth looking at.
      noEmitOnError: false,
    },
    files: [path.join(root, "lib", "officialForms", "applicationForm.ts")],
  }),
);
try {
  execFileSync(path.join(root, "node_modules", ".bin", "tsc"), ["-p", cfg], {
    cwd: root,
    stdio: "inherit",
  });
} catch {
  console.log("  (compiled with warnings)");
}

// tsc resolves "@/..." but emits it unchanged, so point each one at the file.
for (const file of walk(build).filter((f) => f.endsWith(".js"))) {
  const depth = path.relative(build, path.dirname(file)).split(path.sep).filter(Boolean).length;
  const up = depth === 0 ? "./" : "../".repeat(depth);
  writeFileSync(file, readFileSync(file, "utf8").replaceAll('require("@/', `require("${up}`));
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const { applicationFormStamps, TEMPLATE_FOR } = await import(
  pathToFileURL(path.join(build, "lib", "officialForms", "applicationForm.js")).href
);
const { stampForm } = await import(
  pathToFileURL(path.join(build, "lib", "formOverlay.js")).href
);

const SAMPLES = JSON.parse(readFileSync(path.join(root, "scripts", "form-samples.json"), "utf8"));

mkdirSync(outDir, { recursive: true });
let unplacedTotal = 0;

for (const sample of SAMPLES) {
  const { stamps, unplaced, placements } = applicationFormStamps(sample);
  const pdf = await stampForm({ template: TEMPLATE_FOR[sample.formType], stamps });
  const dest = path.join(outDir, `${sample.formType.toLowerCase()}.pdf`);
  writeFileSync(dest, pdf);
  // What the map meant to write, for scripts/verify-form-fill.py to check the
  // finished page against.
  writeFileSync(dest.replace(/\.pdf$/, ".placements.json"), JSON.stringify(placements, null, 1));
  console.log(
    `  ${sample.formType.padEnd(11)} ${String(stamps.length).padStart(3)} marks  -> ${path.relative(root, dest)}`,
  );
  if (unplaced.length) {
    unplacedTotal += unplaced.length;
    for (const u of unplaced) console.log(`    \x1b[31munplaced\x1b[0m ${u}`);
  }
}

if (unplacedTotal) {
  console.log(`\n\x1b[31m${unplacedTotal} answer(s) have nowhere to go on the paper.\x1b[0m`);
  process.exit(1);
}
console.log("\n\x1b[32mEvery specimen answer has a place on its form.\x1b[0m");
