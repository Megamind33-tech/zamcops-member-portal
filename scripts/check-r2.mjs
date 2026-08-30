// End-to-end check of the Cloudflare R2 configuration used by lib/r2.ts.
//
//   npm run check:r2
//
// Exercises the exact path the portal uses in production — presign a PUT,
// upload, presign a GET, read back, then delete — so a pass means members can
// actually upload and staff can actually download. Also probes the bucket's
// CORS rule, which is browser-only and therefore invisible to the app's own
// server-side code until a member hits it.
//
// Reads the four R2_* vars from the environment, falling back to .env.

import { readFileSync, existsSync } from "node:fs";
import { AwsClient } from "aws4fetch";

const REQUIRED = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"];

// The origin browsers will upload from; must appear in the bucket's CORS rule.
const ORIGIN = process.argv[2] || process.env.PORTAL_ORIGIN || "https://www.zamcopsportal.org";

const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const fail = (m) => console.log(`  \x1b[31m✗\x1b[0m ${m}`);
const warn = (m) => console.log(`  \x1b[33m!\x1b[0m ${m}`);

// Minimal .env loader — shell/Vercel values always win.
function loadDotEnv(path = ".env") {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/.exec(line);
    if (!m || line.trimStart().startsWith("#")) continue;
    const key = m[1];
    if (process.env[key] !== undefined) continue;
    process.env[key] = (m[2] ?? "").trim().replace(/^(['"])([\s\S]*)\1$/, "$2");
  }
}

function client() {
  return new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });
}

function objectEndpoint(key) {
  const path = key.split("/").map(encodeURIComponent).join("/");
  return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${path}`;
}

async function presign(key, method, expiresSeconds) {
  const url = `${objectEndpoint(key)}?X-Amz-Expires=${expiresSeconds}`;
  const signed = await client().sign(new Request(url, { method }), { aws: { signQuery: true } });
  return signed.url;
}

async function main() {
  loadDotEnv();

  console.log("\nCloudflare R2 configuration check\n");

  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    fail(`Missing: ${missing.join(", ")}`);
    console.log(
      "\nR2 is NOT active. Uploads are capped at 4MB and stored inline in the\n" +
        "database. Set all four vars (see .env.example) and re-run.\n",
    );
    process.exit(1);
  }
  ok(`All four R2_* vars set (bucket "${process.env.R2_BUCKET}")`);

  const key = `_healthcheck/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`;
  const body = `zamcops r2 check ${new Date().toISOString()}`;
  let uploaded = false;
  let failures = 0;

  try {
    // 1. Upload via a presigned PUT — the member upload path.
    const putUrl = await presign(key, "PUT", 3600);
    const put = await fetch(putUrl, {
      method: "PUT",
      body,
      headers: { "Content-Type": "text/plain" },
    });
    if (!put.ok) {
      fail(`Presigned PUT failed (${put.status} ${put.statusText}) — ${await put.text()}`);
      if (put.status === 403) warn("Check the API token has Object Read & Write on this bucket.");
      if (put.status === 404) warn("Check R2_BUCKET and R2_ACCOUNT_ID are correct.");
      process.exit(1);
    }
    uploaded = true;
    ok("Presigned PUT — member uploads can write to the bucket");

    // 2. Read back via a presigned GET — the staff download proxy path.
    const getUrl = await presign(key, "GET", 900);
    const get = await fetch(getUrl);
    if (!get.ok) {
      fail(`Presigned GET failed (${get.status}) — staff downloads would break`);
      failures++;
    } else if ((await get.text()) !== body) {
      fail("Presigned GET returned unexpected content");
      failures++;
    } else {
      ok("Presigned GET — staff downloads can read the bucket");
    }

    // 3. Bucket must stay private: an unsigned read should be refused.
    const naked = await fetch(objectEndpoint(key));
    if (naked.ok) {
      fail("Object is readable WITHOUT a signature — the bucket is public");
      warn("Make the bucket private; members' files are otherwise world-readable.");
      failures++;
    } else {
      ok("Unsigned read refused — bucket is private");
    }

    // 4. CORS preflight for the browser's direct PUT. Only browsers send this,
    //    so a missing rule shows up as a failed upload for members, not here.
    const pre = await fetch(await presign(key, "PUT", 60), {
      method: "OPTIONS",
      headers: {
        Origin: ORIGIN,
        "Access-Control-Request-Method": "PUT",
        "Access-Control-Request-Headers": "content-type",
      },
    });
    const allow = pre.headers.get("access-control-allow-origin");
    if (allow === ORIGIN || allow === "*") {
      ok(`CORS allows browser PUT from ${ORIGIN}`);
    } else {
      fail(`CORS does not allow PUT from ${ORIGIN}${allow ? ` (got "${allow}")` : ""}`);
      warn("Browser uploads will fail. Add the CORS rule from .env.example to the bucket.");
      failures++;
    }
  } finally {
    // 5. Delete — the cleanup path when a member removes an upload.
    if (uploaded) {
      const res = await client().fetch(objectEndpoint(key), { method: "DELETE" });
      if (res.ok || res.status === 404) ok("DELETE — removed uploads are cleaned up");
      else {
        fail(`DELETE failed (${res.status}) — stale objects will accumulate`);
        warn(`Left behind: ${key}`);
        failures++;
      }
    }
  }

  if (failures) {
    console.log(`\n\x1b[31m${failures} check(s) failed.\x1b[0m See the notes above.\n`);
    process.exit(1);
  }
  console.log("\n\x1b[32mR2 is wired up correctly.\x1b[0m Uploads up to 300MB go straight to the bucket.\n");
}

main().catch((e) => {
  fail(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
