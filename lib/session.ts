// Shared session-cookie constants for lib/auth.ts (Node runtime) and
// middleware.ts (edge runtime). Keep this module edge-safe: Web APIs only,
// no Node-only imports.

export const SESSION_COOKIE_NAME = "zamcops_session";

const DEV_SECRET = "dev-zamcops-secret-change-in-production";

// The JWT signing secret. In production a real AUTH_SECRET is required —
// we fail closed (throw) rather than sign or verify sessions with the
// committed dev fallback. Callers that verify tokens catch the throw and
// treat the session as invalid.
export function getAuthSecret(): Uint8Array {
  const s = (process.env.AUTH_SECRET || "").trim();
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET is not set. Refusing to use the built-in dev secret in production — set AUTH_SECRET to a long random string.",
      );
    }
    return new TextEncoder().encode(DEV_SECRET);
  }
  return new TextEncoder().encode(s);
}
