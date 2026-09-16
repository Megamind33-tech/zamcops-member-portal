// Local-disk object storage — the default when the portal runs on your own
// VPS and you would rather not depend on Cloudflare R2 or Vercel Blob.
//
// Files live under LOCAL_STORAGE_DIR (a mounted volume in Docker), and rows
// store a compact "local://<key>" marker in `url`, mirroring the "r2://<key>"
// convention. Nothing under the directory is served statically: every read
// goes through an authenticated route that streams the file, so a member's
// master recording is never reachable by guessing a URL.
//
// Env:
//   LOCAL_STORAGE_DIR — absolute (or project-relative) directory to write to.
//                       Set it to enable this driver; it takes precedence over
//                       R2/Blob so a self-hosted deployment stays self-contained.

import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";

const LOCAL_SCHEME = "local://";

export function localConfigured(): boolean {
  return !!process.env.LOCAL_STORAGE_DIR?.trim();
}

export const isLocalUrl = (url: string): boolean => url.startsWith(LOCAL_SCHEME);
export const localKey = (url: string): string => url.slice(LOCAL_SCHEME.length);
export const localUrl = (key: string): string => `${LOCAL_SCHEME}${key}`;

export function localRoot(): string {
  const dir = process.env.LOCAL_STORAGE_DIR?.trim() || "";
  if (!dir) throw new Error("LOCAL_STORAGE_DIR is not set.");
  return path.resolve(dir);
}

// Object keys are built server-side, but they still reach this module from a
// request path, so every one is re-checked: no leading slash, no "." or ".."
// segment, no empty segment, and the resolved result must stay inside the
// storage root. A key that escapes the root is a bug or an attack, never a file
// to read — so it is rejected rather than quietly rewritten into something that
// happens to be safe.
export function resolveKey(key: string): string {
  if (!key || key.startsWith("/") || key.includes("\0")) throw new Error("Invalid storage key.");
  if (key.split("/").some((seg) => seg === "." || seg === ".." || seg === "")) {
    throw new Error("Invalid storage key.");
  }
  const root = localRoot();
  const full = path.resolve(root, key);
  // Belt and braces: even with the segment checks above, the result has to land
  // inside the root or we do not touch it.
  if (!full.startsWith(root + path.sep)) throw new Error("Invalid storage key.");
  return full;
}

// Streams a request body straight to disk — a 300MB master never has to be
// held in memory. Writes to a temporary sibling first so an interrupted upload
// cannot leave a truncated file at the real key.
export async function localPut(key: string, body: ReadableStream<Uint8Array> | null): Promise<number> {
  if (!body) throw new Error("Empty upload body.");
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  const tmp = `${full}.${Date.now()}.part`;
  try {
    await pipeline(Readable.fromWeb(body as NodeWebReadableStream<Uint8Array>), createWriteStream(tmp));
    await rename(tmp, full);
  } catch (err) {
    await rm(tmp, { force: true }).catch(() => {});
    throw err;
  }
  return (await stat(full)).size;
}

export async function localSize(key: string): Promise<number> {
  return (await stat(resolveKey(key))).size;
}

// Returns a web stream for the whole object, or for a byte range when the
// caller is serving a Range request (audio scrubbing in the staff player).
export function localReadStream(key: string, range?: { start: number; end: number }): ReadableStream<Uint8Array> {
  const node = createReadStream(resolveKey(key), range);
  return Readable.toWeb(node) as ReadableStream<Uint8Array>;
}

export async function localDelete(key: string): Promise<void> {
  await rm(resolveKey(key), { force: true });
}
