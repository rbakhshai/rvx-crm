import { NextResponse, type NextRequest } from "next/server";

// The (app) layout is the real auth gate (it re-checks the session on
// every render); this list is defense-in-depth so unauthenticated
// requests are bounced before rendering. Keep it in sync with (app) route
// segments.
const PROTECTED_PREFIXES = [
  "/today", "/dashboard", "/mission-control", "/contacts", "/deals", "/companies",
  "/bird-dogs", "/tasks", "/notifications", "/search", "/triage", "/admin", "/trash",
  "/settings", "/reimbursements", "/hires", "/pool", "/leadership", "/acquisition",
  "/lead-work", "/my-leads", "/ops", "/issues",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  // Better Auth uses different cookie names in dev vs prod:
  //   dev:  better-auth.session_token
  //   prod: __Secure-better-auth.session_token  (HTTPS-only prefix)
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
