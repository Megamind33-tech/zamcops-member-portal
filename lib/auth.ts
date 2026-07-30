import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, getAuthSecret } from "@/lib/session";

const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type SessionRole = "member" | "admin";
export interface Session {
  sub: string; // member id or admin id
  role: SessionRole;
  email: string;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSessionToken(session: Session): Promise<string> {
  return new SignJWT({ role: session.role, email: session.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getAuthSecret());
}

export async function setSessionCookie(session: Session): Promise<void> {
  const token = await createSessionToken(session);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    return {
      sub: payload.sub as string,
      role: payload.role as SessionRole,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

export async function requireMember(): Promise<Session | null> {
  const s = await getSession();
  return s && s.role === "member" ? s : null;
}

export async function requireAdmin(): Promise<Session | null> {
  const s = await getSession();
  return s && s.role === "admin" ? s : null;
}
