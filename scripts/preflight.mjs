// Pre-deploy check for the ZAMCOPS portal, against the free-tier stack:
// Vercel Hobby + Neon (0.5GB) + Cloudflare R2 (10GB) + Resend (3k/month).
//
//   npm run preflight              # every section
//   npm run preflight -- email     # one section: core | db | storage | email | sms
//   npm run preflight -- --origin https://staging.example.org
//
// Each section talks to the real service with the real credentials, so a pass
// means the thing works — not merely that a variable is non-empty. Hard
// failures (which break a member-facing flow) exit non-zero; advisories do not.

import { readFileSync, existsSync } from "node:fs";
import { AwsClient } from "aws4fetch";

const SECTIONS = ["core", "db", "storage", "email", "sms"];

// Neon's free branch ceiling. Past this, writes start failing.
const NEON_FREE_BYTES = 512 * 1024 * 1024;

let hardFailures = 0;
let advisories = 0;

const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const info = (m) => console.log(`    \x1b[2m${m}\x1b[0m`);
const fail = (m) => {
  hardFailures++;
  console.log(`  \x1b[31m✗\x1b[0m ${m}`);
};
const warn = (m) => {
  advisories++;
  console.log(`  \x1b[33m!\x1b[0m ${m}`);
};
const heading = (m) => console.log(`\n\x1b[1m${m}\x1b[0m`);

function loadDotEnv(path = ".env") {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (line.trimStart().startsWith("#")) continue;
    const m = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/.exec(line);
    if (!m) continue;
    if (process.env[m[1]] !== undefined) continue;
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

// ── core ────────────────────────────────────────────────────────────────────
// Without these the app boots but every session or staff login fails closed.

function checkCore() {
  heading("Core");

  const secret = (process.env.AUTH_SECRET || "").trim();
  if (!secret) {
    fail("AUTH_SECRET is not set — in production every login fails (lib/session.ts)");
    info("Generate one: openssl rand -base64 48");
  } else if (secret.length < 32) {
    warn(`AUTH_SECRET is only ${secret.length} chars — use 32+ random characters`);
  } else if (secret === "change-me-to-a-long-random-secret") {
    fail("AUTH_SECRET is still the placeholder from .env.example");
  } else {
    ok(`AUTH_SECRET set (${secret.length} chars)`);
  }

  if (!process.env.ADMIN_PASSWORD) {
    fail("ADMIN_PASSWORD is not set — no staff account can be created in production");
    info("app/api/admin/login/route.ts refuses to seed the default admin123 account.");
  } else if (process.env.ADMIN_PASSWORD === "admin123") {
    fail("ADMIN_PASSWORD is still admin123 — choose a real password before deploying");
  } else {
    ok(`Staff account configured (${process.env.ADMIN_EMAIL || "admin@zamcops.org.zm"})`);
  }
}

// ── db ──────────────────────────────────────────────────────────────────────
// Reachability, plus how much of the Neon free tier is actually left. Files
// stored inline (base64 in Postgres) are the usual reason a free branch fills.

async function checkDb() {
  heading("Database (Neon free tier)");

  if (!process.env.DATABASE_URL) {
    fail("DATABASE_URL is not set — the app cannot start");
    return;
  }
  if (!process.env.DIRECT_URL) warn("DIRECT_URL is not set — `prisma db push` will fail");

  let prisma;
  try {
    const { PrismaClient } = await import("@prisma/client");
    prisma = new PrismaClient({ log: [] });
    await prisma.$queryRaw`SELECT 1`;
    ok("Database reachable");
  } catch (e) {
    fail(`Cannot reach the database: ${e instanceof Error ? e.message.split("\n")[0] : e}`);
    await prisma?.$disconnect().catch(() => {});
    return;
  }

  try {
    const [{ size }] = await prisma.$queryRaw`SELECT pg_database_size(current_database())::bigint AS size`;
    const total = Number(size);
    const pct = Math.round((total / NEON_FREE_BYTES) * 100);
    const line = `Database is ${fmtBytes(total)} of the ${fmtBytes(NEON_FREE_BYTES)} free branch (${pct}%)`;
    if (pct >= 90) fail(line);
    else if (pct >= 70) warn(line);
    else ok(line);

    // Files kept as base64 in Postgres rather than in R2.
    const [{ bytes, rows }] = await prisma.$queryRaw`
      SELECT COALESCE(SUM(len), 0)::bigint AS bytes, COUNT(*)::bigint AS rows FROM (
        SELECT LENGTH(data) AS len FROM "UploadFile"     WHERE data <> ''
        UNION ALL
        SELECT LENGTH(data) AS len FROM "MemberDocument" WHERE data <> ''
      ) t`;
    const inline = Number(bytes);
    if (inline === 0) {
      ok("No files stored inline — uploads are going to external storage");
    } else {
      const share = total > 0 ? Math.round((inline / total) * 100) : 0;
      warn(`${Number(rows)} file(s) stored inline in Postgres — ${fmtBytes(inline)} (${share}% of the database)`);
      info("Configure R2 so new uploads go to the bucket instead; see README → File storage.");
    }
  } catch (e) {
    warn(`Could not measure database size: ${e instanceof Error ? e.message.split("\n")[0] : e}`);
  }

  await prisma.$disconnect().catch(() => {});
}

// ── storage ─────────────────────────────────────────────────────────────────
// Drives the real upload path: presign PUT, read back, privacy, CORS, delete.

const R2_VARS = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"];

const r2Client = () =>
  new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });

const r2Endpoint = (key) =>
  `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/` +
  key.split("/").map(encodeURIComponent).join("/");

async function r2Presign(key, method, expiresSeconds) {
  const signed = await r2Client().sign(new Request(`${r2Endpoint(key)}?X-Amz-Expires=${expiresSeconds}`, { method }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

async function checkStorage(origin) {
  heading("File storage (Cloudflare R2 free tier)");

  const missing = R2_VARS.filter((k) => !process.env[k]);
  if (missing.length === R2_VARS.length) {
    fail("R2 is not configured — uploads are capped at 4MB and stored in the database");
    info("R2's free tier is 10GB with no egress fees. See README → File storage.");
    return;
  }
  if (missing.length) {
    fail(`R2 is half-configured — missing ${missing.join(", ")}`);
    info("All four are required; with any missing the app silently falls back to inline storage.");
    return;
  }
  ok(`All four R2_* vars set (bucket "${process.env.R2_BUCKET}")`);

  const key = `_preflight/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`;
  const body = `zamcops preflight ${new Date().toISOString()}`;
  let uploaded = false;

  try {
    const put = await fetch(await r2Presign(key, "PUT", 3600), {
      method: "PUT",
      body,
      headers: { "Content-Type": "text/plain" },
    });
    if (!put.ok) {
      fail(`Presigned PUT failed (${put.status}) — members cannot upload`);
      if (put.status === 403) info("Check the API token has Object Read & Write on this bucket.");
      if (put.status === 404) info("Check R2_BUCKET and R2_ACCOUNT_ID are correct.");
      return;
    }
    uploaded = true;
    ok("Presigned PUT — members can upload");

    const get = await fetch(await r2Presign(key, "GET", 900));
    if (!get.ok || (await get.text()) !== body) fail(`Presigned GET failed (${get.status}) — staff downloads break`);
    else ok("Presigned GET — staff can download");

    if ((await fetch(r2Endpoint(key))).ok) {
      fail("Objects are readable WITHOUT a signature — the bucket is public");
      info("Members' files are world-readable. Make the bucket private in the R2 dashboard.");
    } else {
      ok("Unsigned read refused — bucket is private");
    }

    const pre = await fetch(await r2Presign(key, "PUT", 60), {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "PUT",
        "Access-Control-Request-Headers": "content-type",
      },
    });
    const allow = pre.headers.get("access-control-allow-origin");
    if (allow === origin || allow === "*") ok(`CORS allows browser uploads from ${origin}`);
    else {
      fail(`CORS does not allow PUT from ${origin}${allow ? ` (got "${allow}")` : ""}`);
      info("Browser uploads will fail. Add the CORS rule from .env.example to the bucket.");
    }
  } catch (e) {
    fail(`R2 check failed: ${e instanceof Error ? e.message : e}`);
  } finally {
    if (uploaded) {
      const res = await r2Client().fetch(r2Endpoint(key), { method: "DELETE" });
      if (res.ok || res.status === 404) ok("DELETE — removed uploads are cleaned up");
      else warn(`DELETE failed (${res.status}) — left behind ${key}`);
    }
  }
}

// ── email ───────────────────────────────────────────────────────────────────
// Registration issues a 6-digit OTP by email, and a member cannot submit a
// membership application until it is verified. If email does not deliver,
// nobody can complete the flow the portal exists for — so this is a blocker,
// and the failure is silent server-side.

async function checkEmail() {
  heading("Email / registration OTP (Resend free tier)");

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    fail("RESEND_API_KEY is not set — verification codes are never delivered");
    info("Members can register but can never verify, so no membership application can be submitted.");
    info("Resend's free tier is 3,000 emails/month (100/day) and covers this.");
    return;
  }

  // Sender checks first: they need no network, and a bad EMAIL_FROM is fatal
  // regardless of whether Resend happens to be reachable right now.
  const from = process.env.EMAIL_FROM;
  if (!from) {
    fail("EMAIL_FROM is not set — Resend's shared sender only delivers to your own inbox");
    info("Members would never receive their code. Verify a domain in Resend and set EMAIL_FROM.");
    return;
  }
  const addr = (from.match(/<([^>]+)>/)?.[1] ?? from).trim();
  const domain = /^[^\s@]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/.exec(addr)?.[1]?.toLowerCase();
  if (!domain) {
    fail(`EMAIL_FROM is not a valid address: "${from}"`);
    info('Use either "no-reply@yourdomain.org" or "ZAMCOPS <no-reply@yourdomain.org>".');
    return;
  }

  let domains;
  try {
    const res = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` } });
    // Resend answers a malformed key with 400 ("API key is invalid"), not 401,
    // so treat every 4xx as fatal — a rejected key means no code ever sends.
    if (res.status >= 400 && res.status < 500) {
      const detail = await res
        .json()
        .then((b) => b?.message)
        .catch(() => null);
      fail(`RESEND_API_KEY was rejected (${res.status}${detail ? `: ${detail}` : ""}) — verification codes will not send`);
      return;
    }
    if (!res.ok) {
      warn(`Resend is unreachable (${res.status}) — could not verify the sender; retry before deploying`);
      return;
    }
    ok("RESEND_API_KEY accepted");
    domains = (await res.json().catch(() => ({})))?.data ?? [];
  } catch (e) {
    warn(`Could not reach Resend: ${e instanceof Error ? e.message : e}`);
    return;
  }

  const match = domains.find((d) => d?.name?.toLowerCase() === domain);
  if (!match) {
    fail(`"${domain}" is not a domain on this Resend account — mail from it will be rejected`);
    info(`Verified on this account: ${domains.map((d) => d.name).join(", ") || "none"}`);
  } else if (match.status !== "verified") {
    fail(`Resend domain "${domain}" is "${match.status}", not verified — codes will not deliver`);
    info("Finish the DNS records in the Resend dashboard. Verification is free.");
  } else {
    ok(`Sending as ${addr} on verified domain "${domain}"`);
  }
}

// ── sms ─────────────────────────────────────────────────────────────────────
// The one channel with no free tier. Absent, the app just skips SMS.

function checkSms() {
  heading("SMS (optional)");

  if (!process.env.AT_API_KEY || !process.env.AT_USERNAME) {
    ok("Not configured — SMS is skipped and every notice still arrives in-app and by email");
    info("Africa's Talking charges per message; it is the only piece with no free tier.");
    return;
  }
  if (process.env.AT_USERNAME === "sandbox") {
    warn("AT_USERNAME is \"sandbox\" — messages go to the simulator, not real phones");
  } else {
    ok(`SMS configured as "${process.env.AT_USERNAME}" (billed per message)`);
  }
}

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
  loadDotEnv();

  const args = process.argv.slice(2);
  const originFlag = args.indexOf("--origin");
  const origin =
    (originFlag !== -1 ? args[originFlag + 1] : null) || process.env.PORTAL_ORIGIN || "https://www.zamcopsportal.org";
  const picked = args.filter((a) => SECTIONS.includes(a));
  const run = picked.length ? picked : SECTIONS;

  console.log("\n\x1b[1mZAMCOPS portal — pre-deploy check\x1b[0m");
  console.log(`\x1b[2mSections: ${run.join(", ")}\x1b[0m`);

  if (run.includes("core")) checkCore();
  if (run.includes("db")) await checkDb();
  if (run.includes("storage")) await checkStorage(origin);
  if (run.includes("email")) await checkEmail();
  if (run.includes("sms")) checkSms();

  console.log("");
  if (hardFailures) {
    console.log(
      `\x1b[31m${hardFailures} blocker(s)\x1b[0m` +
        (advisories ? ` and \x1b[33m${advisories} advisory(ies)\x1b[0m` : "") +
        " — each one breaks a member-facing flow. Fix before deploying.\n",
    );
    process.exit(1);
  }
  if (advisories) console.log(`\x1b[33m${advisories} advisory(ies)\x1b[0m — nothing blocking.\n`);
  else console.log("\x1b[32mAll checks passed.\x1b[0m Everything runs within the free tiers.\n");
}

main().catch((e) => {
  console.error(`\n\x1b[31m✗\x1b[0m ${e instanceof Error ? e.stack : e}\n`);
  process.exit(1);
});
