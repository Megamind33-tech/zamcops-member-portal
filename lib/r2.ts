// Cloudflare R2 (S3-compatible) storage for large uploads — free-tier
// friendly (10GB, zero egress fees). The bucket stays PRIVATE: members
// upload via short-lived presigned PUT URLs and staff stream files back
// through the authenticated proxy, which signs a GET at fetch time. R2-backed
// rows store a compact "r2://<key>" marker in `url`, never a signed link.
//
// Env vars (credentials + bucket required to enable this driver — otherwise the
// app falls back to Vercel Blob, then inline ≤4MB storage):
//   R2_ACCOUNT_ID        — Cloudflare account id (dashboard → R2 → API).
//                          Not needed when S3_ENDPOINT is set.
//   R2_ACCESS_KEY_ID     — API token key id    (alias: S3_ACCESS_KEY_ID)
//   R2_SECRET_ACCESS_KEY — API token secret    (alias: S3_SECRET_ACCESS_KEY)
//   R2_BUCKET            — bucket name         (alias: S3_BUCKET)
//   S3_ENDPOINT          — optional. Any S3-compatible endpoint, e.g. a MinIO
//                          container on your own VPS ("http://minio:9000") or
//                          another provider. When set it replaces the
//                          Cloudflare host and R2_ACCOUNT_ID is not read.
//   S3_REGION            — optional, defaults to "auto" (MinIO: "us-east-1").
//
// The bucket needs a CORS rule allowing PUT from the portal's origin so
// browsers can upload directly (see .env.example).

import { AwsClient } from "aws4fetch";

const R2_SCHEME = "r2://";

const env = (...names: string[]): string => {
  for (const n of names) {
    const v = process.env[n]?.trim();
    if (v) return v;
  }
  return "";
};

const accessKeyId = () => env("R2_ACCESS_KEY_ID", "S3_ACCESS_KEY_ID");
const secretAccessKey = () => env("R2_SECRET_ACCESS_KEY", "S3_SECRET_ACCESS_KEY");
const bucket = () => env("R2_BUCKET", "S3_BUCKET");
const endpoint = () => env("S3_ENDPOINT", "R2_ENDPOINT");

export function r2Configured(): boolean {
  if (!accessKeyId() || !secretAccessKey() || !bucket()) return false;
  // A custom endpoint stands in for the Cloudflare account host.
  return !!(endpoint() || env("R2_ACCOUNT_ID"));
}

export const isR2Url = (url: string): boolean => url.startsWith(R2_SCHEME);
export const r2Key = (url: string): string => url.slice(R2_SCHEME.length);
export const r2Url = (key: string): string => `${R2_SCHEME}${key}`;

function client(): AwsClient {
  return new AwsClient({
    accessKeyId: accessKeyId(),
    secretAccessKey: secretAccessKey(),
    service: "s3",
    region: env("S3_REGION") || "auto",
  });
}

function objectEndpoint(key: string): string {
  const path = key.split("/").map(encodeURIComponent).join("/");
  const base = endpoint()
    ? endpoint().replace(/\/+$/, "")
    : `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`;
  return `${base}/${bucket()}/${path}`;
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
