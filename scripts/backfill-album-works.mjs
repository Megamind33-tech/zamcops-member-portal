// Creates the missing per-track WORK DECLARATIONS for albums submitted before
// albums declared their tracks.
//
//   npm run backfill:album-works                    # dry run — reports what is missing
//   npm run backfill:album-works -- --apply         # create them
//   npm run backfill:album-works -- --apply --limit 1
//
// An album used to be stored as one row with its tracks serialised into a JSON
// column, so a ten-track album produced no declarations at all: ten registrable
// works existed only inside that string, absent from the register and from
// review. New submissions now declare each track. This fills the gap behind
// them.
//
// Safety:
//   * Dry run unless --apply is passed.
//   * Idempotent. Declarations are matched to a batch by the album's id and to
//     a track by its number within that batch, so a track that already has one
//     is skipped and re-running creates nothing twice.
//   * Only ever inserts. No existing row is modified or deleted, and an album
//     whose tracks are all declared is left completely alone.
//   * A malformed tracks column is reported and skipped rather than guessed at.

import { readFileSync, existsSync } from "node:fs";

// .env is read the same way the app's other scripts read it, so the command
// works from a checkout without the variables already exported.
function loadDotEnv(path = ".env") {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    const [, k, raw] = m;
    if (process.env[k]) continue;
    process.env[k] = raw.replace(/^["']|["']$/g, "");
  }
}

const ROLES = ["Composer", "Author", "Arranger", "Publisher", "Sub-author", "Sub-arranger", "Sub-publisher"];
const LEGACY = {
  "Author/Lyricist": "Author",
  Lyricist: "Author",
  "Sub-Author": "Sub-author",
  "Sub-Arranger": "Sub-arranger",
  "Sub-Publisher": "Sub-publisher",
  Producer: "Composer",
  Performer: "Composer",
};
const role = (r) => (ROLES.includes(r) ? r : (LEGACY[r] ?? "Composer"));

const namesFor = (splits, want) =>
  (splits ?? [])
    .filter((s) => role(String(s?.role ?? "")) === want)
    .map((s) => String(s?.party ?? "").trim())
    .filter(Boolean);

async function main() {
  loadDotEnv();
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const limitFlag = args.indexOf("--limit");
  const limit = limitFlag !== -1 ? Number(args[limitFlag + 1]) : Infinity;

  console.log("\n\x1b[1mAlbum tracks → work declarations\x1b[0m");
  console.log(
    `\x1b[2m${apply ? "APPLY — declarations will be created" : "DRY RUN — nothing will be changed"}\x1b[0m\n`,
  );

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  let albums;
  try {
    albums = await prisma.albumSubmission.findMany({ orderBy: { submittedAt: "asc" } });
  } catch (e) {
    console.error("Could not read albums:", e.message);
    process.exit(1);
  }

  let scanned = 0;
  let created = 0;
  let skippedComplete = 0;
  let malformed = 0;

  for (const album of albums) {
    if (created >= limit) break;
    scanned++;

    let tracks;
    try {
      tracks = JSON.parse(album.tracks || "[]");
      if (!Array.isArray(tracks)) throw new Error("not an array");
    } catch (e) {
      malformed++;
      console.log(`  \x1b[33m!\x1b[0m "${album.title}" — tracks column unreadable (${e.message}); skipped`);
      continue;
    }
    if (tracks.length === 0) continue;

    // Which numbers in this batch already have a declaration.
    const existing = await prisma.workDeclaration.findMany({
      where: { batchId: album.id },
      select: { workNo: true },
    });
    const have = new Set(existing.map((r) => r.workNo));

    const missing = tracks
      .map((t, i) => ({ t, no: String(i + 1) }))
      .filter(({ no }) => !have.has(no));

    if (missing.length === 0) {
      skippedComplete++;
      continue;
    }

    console.log(
      `  "${album.title}" — ${tracks.length} track(s), ${have.size} declared, \x1b[1m${missing.length} missing\x1b[0m`,
    );
    for (const { t, no } of missing) {
      console.log(`      ${no}. ${String(t?.title ?? "(untitled)").slice(0, 60)}`);
    }

    if (!apply) {
      created += missing.length;
      continue;
    }

    const data = missing.map(({ t, no }) => {
      const splits = Array.isArray(t?.ownershipSplits) ? t.ownershipSplits : [];
      return {
        ownerId: album.ownerId,
        batchId: album.id,
        workNo: no,
        title: String(t?.title ?? "").trim() || "(untitled)",
        workType: "Song",
        genre: t?.genre ?? "",
        language: "",
        duration: t?.duration ?? "",
        isrc: t?.isrc ?? "",
        audioFile: t?.audioFile ?? "",
        coverArt: album.coverArt ?? "",
        studioReceipt: album.studioReceipt ?? "",
        ownershipSplits: JSON.stringify(splits),
        composers: JSON.stringify(namesFor(splits, "Composer")),
        authors: JSON.stringify(namesFor(splits, "Author")),
        subArrangers: JSON.stringify(namesFor(splits, "Arranger")),
        publisher: namesFor(splits, "Publisher")[0] ?? "",
        yearComposed: String(album.releaseDate ?? "").slice(0, 4),
        dateCreated: album.releaseDate ?? "",
        // The album's own decision carries across, so a track of an approved
        // album is not sent back through review it has already passed.
        status: album.status ?? "Pending",
        submittedAt: album.submittedAt ?? new Date(),
      };
    });

    try {
      const res = await prisma.workDeclaration.createMany({ data });
      created += res.count;
      console.log(`      \x1b[32m✓ created ${res.count}\x1b[0m`);
    } catch (e) {
      console.log(`      \x1b[31m✗ failed: ${e.message}\x1b[0m`);
    }
  }

  await prisma.$disconnect();

  console.log(`\n  albums scanned        : ${scanned}`);
  console.log(`  already complete      : ${skippedComplete}`);
  if (malformed) console.log(`  unreadable tracks     : ${malformed}`);
  console.log(`  declarations ${apply ? "created" : "missing"} : \x1b[1m${created}\x1b[0m`);
  if (!apply && created > 0) console.log(`\n  Re-run with --apply to create them.`);
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
