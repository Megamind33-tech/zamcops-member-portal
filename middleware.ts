import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE_NAME, getAuthSecret } from "@/lib/session";

// Server-side guard for the member portal and staff console. The client-side
// layout guards remain for UX, but this stops unauthenticated visitors from
// even receiving the page shell (and removes the flash-then-redirect).

// Guarded member-portal sections. `config.matcher` below must mirror this
// list ("<path>/:path*" per entry, plus "/admin/:path*") — Next.js requires
// the matcher to be statically analyzable, so it can't be derived from this
// array. Keep the two lists adjacent and in sync.
const MEMBER_PATHS = [
  "/dashboard",
  "/application",
  "/documents",
  "/works",
  "/submit",
  "/uploads",
  "/royalties",
  "/statements",
  "/notifications",
  "/profile",
  "/support",
  "/settings",
  "/licensing",
];

async function sessionRole(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    // getAuthSecret throws in production when AUTH_SECRET is unset — the
    // catch treats that as "no valid session", so we fail closed.
    const { payload } = await jwtVerify(token, getAuthSecret());
    return (payload.role as string) ?? null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return NextResponse.next();
    const role = await sessionRole(req);
    if (role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (MEMBER_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const role = await sessionRole(req);
    if (role !== "member") {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/application/:path*",
    "/documents/:path*",
    "/works/:path*",
    "/submit/:path*",
    "/uploads/:path*",
    "/royalties/:path*",
    "/statements/:path*",
    "/notifications/:path*",
    "/profile/:path*",
    "/support/:path*",
    "/settings/:path*",
    "/licensing/:path*",
  ],
};
