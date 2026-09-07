// Moves files already stored inline (base64 in Postgres) into Cloudflare R2,
// freeing space on Neon's 0.5GB free branch.
//
//   npm run backfill:r2                 # dry run — reports what would move
//   npm run backfill:r2 -- --apply      # actually move them
//   npm run backfill:r2 -- --apply --limit 10
//
// Covers UploadFile (member uploads) and MemberDocument (documents on a
// member's file, including the PDFs issued at approval).
//
// Safety:
//   * Dry run unless --apply is passed.
//   * Per row the order is upload → verify the bytes landed → only then point
//     the row at R2 and clear `data`. An interrupted run leaves the row
//     untouched with its data intact, so re-running simply redoes it. The
//     worst case is an orphaned object in the bucket, which costs nothing.
//   * Rows that already have a `url` are skipped, never overwritten.
//   * One file is held in memory at a time — ids and sizes are read first,
//     and each row's bytes are fetched only when it is its turn.

import { readFileSync, existsSync } from "node:fs";
import { AwsClient } from "aws4fetch";

const R2_VARS = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"];

const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const skip = (m) => console.log(`  \x1b[33m–\x1b[0m ${m}`);
const err = (m) => console.log(`  \x1b[31m✗\x1b[0m ${m}`);

function loadDotEnv(path = ".env") {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (line.trimStart().startsWith("#")) continue;
    const m = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/.exec(line);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = (m[2] ?? "").trim().replace(/^(['"])([\s\S]*)\1$/, "$2");
  }
}

const fmtBytes = (n) => {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) (v /= 1024), i++;
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
};

const client = () =>
  new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });

const endpoint = (key) =>
  `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/` +
  key.split("/").map(encodeURIComponent).join("/");

// Mirrors the key shape app/api/storage/presign/route.ts issues, so backfilled
// uploads sit in the same per-member namespace as new ones.
function buildKey(prefix, ownerId, fileName) {
  const safe = String(fileName || "file").replace(/[^\w.-]+/g, "_").slice(-100);
  return `${prefix}/${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
}

// The two tables share a shape: base64 in `data`, an "r2://<key>" marker in
// `url`, and a per-member key namespace.
const TABLES = [
  { label: "UploadFile", table: "UploadFile", model: "uploadFile", prefix: "uploads" },
  { label: "MemberDocument", table: "MemberDocument", model: "memberDocument", prefix: "documents" },
];

async function main() {
  loadDotEnv();

  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const limitFlag = args.indexOf("--limit");
  const limit = limitFlag !== -1 ? Number(args[limitFlag + 1]) : Infinity;

  console.log(`\n\x1b[1mBackfill inline files → Cloudflare R2\x1b[0m`);
  console.log(`\x1b[2m${apply ? "APPLY — rows will be modified" : "DRY RUN — nothing will be changed"}\x1b[0m`);

  const missing = R2_VARS.filter((k) => !process.env[k]);
  if (missing.length) {
    err(`R2 is not configured — missing ${missing.join(", ")}`);
    console.log("\nConfigure R2 first (README → File storage), then re-run.\n");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    err("DATABASE_URL is not set");
    process.exit(1);
  }

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient({ log: [] });

  let moved = 0;
  let freed = 0;
  let failed = 0;
  let remaining = limit;

  try {
    for (const { label, table, model, prefix } of TABLES) {
      // Ids and sizes only — never pull every blob into memory at once.
      const rows = await prisma.$queryRawUnsafe(
        `SELECT id, "ownerId", "fileName", "mimeType", LENGTH(data) AS len
           FROM "${table}"
          WHERE data <> '' AND (url IS NULL OR url = '')
          ORDER BY LENGTH(data) DESC`,
      );

      console.log(`\n\x1b[1m${label}\x1b[0m — ${rows.length} row(s) stored inline`);
      if (!rows.length) continue;

      for (const row of rows) {
        if (remaining <= 0) {
          skip(`--limit reached, stopping (${label} has more rows left)`);
          break;
        }
        // Counts the attempt, not the outcome: `--limit 1` means "try one row",
        // so a cautious first run stops after one even if that row fails.
        remaining--;
        const approx = Math.floor(Number(row.len) * 0.75); // base64 → bytes

        if (!apply) {
          skip(`would move ${row.fileName} (${fmtBytes(approx)})`);
          freed += Number(row.len);
          moved++;
          continue;
        }

        try {
          const full = await prisma[model].findUnique({ where: { id: row.id }, select: { data: true } });
          if (!full?.data) {
            skip(`${row.fileName} — data disappeared, skipping`);
            continue;
          }
          const bytes = Buffer.from(full.data, "base64");
          if (bytes.length === 0) {
            err(`${row.fileName} — data is not valid base64, left untouched`);
            failed++;
            continue;
          }

          const key = buildKey(prefix, row.ownerId, row.fileName);
          const contentType = row.mimeType || "application/octet-stream";

          const put = await client().fetch(endpoint(key), {
            method: "PUT",
            body: bytes,
            headers: { "Content-Type": contentType },
          });
          if (!put.ok) {
            err(`${row.fileName} — upload failed (${put.status}), left untouched`);
            failed++;
            continue;
          }

          // Verify the object is really there and the right size before the
          // row's only copy of the bytes is cleared.
          const head = await client().fetch(endpoint(key), { method: "HEAD" });
          const stored = Number(head.headers.get("content-length"));
          if (!head.ok || stored !== bytes.length) {
            err(
              `${row.fileName} — verify failed (${head.status}, ${stored} vs ${bytes.length} bytes), left untouched`,
            );
            failed++;
            continue;
          }

          await prisma[model].update({
            where: { id: row.id },
            data: { url: `r2://${key}`, data: "" },
          });

          ok(`${row.fileName} → ${fmtBytes(bytes.length)}`);
          moved++;
          freed += Number(row.len);
        } catch (e) {
          err(`${row.fileName} — ${e instanceof Error ? e.message : e}, left untouched`);
          failed++;
        }
      }
    }

    console.log("");
    if (!apply) {
      console.log(
        `\x1b[1m${moved} file(s)\x1b[0m would move, freeing about \x1b[1m${fmtBytes(freed)}\x1b[0m of database.`,
      );
      console.log("Re-run with --apply to do it.\n");
    } else {
      console.log(
        `\x1b[32m${moved} file(s) moved\x1b[0m, about \x1b[1m${fmtBytes(freed)}\x1b[0m of database freed.` +
          (failed ? ` \x1b[31m${failed} failed\x1b[0m and were left untouched.` : ""),
      );
      console.log("Postgres reclaims the space on its next VACUUM; run `npm run preflight -- db` to confirm.\n");
    }
  } finally {
    await prisma.$disconnect().catch(() => {});
  }

  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  err(e instanceof Error ? e.stack : String(e));
  process.exit(1);
});
