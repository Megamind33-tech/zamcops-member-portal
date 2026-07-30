// Cloudflare R2 (S3-compatible) storage for large uploads — free-tier
// friendly (10GB, zero egress fees). The bucket stays PRIVATE: members
// upload via short-lived presigned PUT URLs and staff stream files back
// through the authenticated proxy, which signs a GET at fetch time. R2-backed
// rows store a compact "r2://<key>" marker in `url`, never a signed link.
//
// Env vars (all four required to enable R2 — otherwise the app falls back to
// Vercel Blob, then inline ≤4MB storage):
//   R2_ACCOUNT_ID        — Cloudflare account id (dashboard → R2 → API)
//   R2_ACCESS_KEY_ID     — R2 API token key id
//   R2_SECRET_ACCESS_KEY — R2 API token secret
//   R2_BUCKET            — bucket name
//
// The bucket needs a CORS rule allowing PUT from the portal's origin so
// browsers can upload directly (see .env.example).

import { AwsClient } from "aws4fetch";

const R2_SCHEME = "r2://";

export function r2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET
  );
}

export const isR2Url = (url: string): boolean => url.startsWith(R2_SCHEME);
export const r2Key = (url: string): string => url.slice(R2_SCHEME.length);
export const r2Url = (key: string): string => `${R2_SCHEME}${key}`;

function client(): AwsClient {
  return new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    service: "s3",
    region: "auto",
  });
}

function objectEndpoint(key: string): string {
  const path = key.split("/").map(encodeURIComponent).join("/");
  return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${path}`;
}

async function presign(key: string, method: "GET" | "PUT", expiresSeconds: number): Promise<string> {
  const url = `${objectEndpoint(key)}?X-Amz-Expires=${expiresSeconds}`;
  const signed = await client().sign(new Request(url, { method }), { aws: { signQuery: true } });
  return signed.url;
}

// One hour to complete the browser → R2 upload of a large master.
export const r2PresignPut = (key: string): Promise<string> => presign(key, "PUT", 3600);

// Short-lived: only ever consumed immediately by the server-side proxy.
export const r2PresignGet = (key: string): Promise<string> => presign(key, "GET", 900);

export async function r2Delete(key: string): Promise<void> {
  const res = await client().fetch(objectEndpoint(key), { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`R2 delete failed (${res.status})`);
}
