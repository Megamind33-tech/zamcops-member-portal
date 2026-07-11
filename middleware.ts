import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Server-side guard for the member portal and staff console. The client-side
// layout guards remain for UX, but this stops unauthenticated visitors from
// even receiving the page shell (and removes the flash-then-redirect).

const COOKIE_NAME = "zamcops_session";

const MEMBER_PATHS = [
  "/dashboard",
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

function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "dev-zamcops-secret-change-in-production");
}

async function sessionRole(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
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
    "/dashboard/:path*",
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
