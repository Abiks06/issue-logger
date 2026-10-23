import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * API routes that authenticate themselves instead of using the session:
 * Auth.js's own endpoints, the API-key ingestion API, the secret-protected cron
 * hook, the stale-session reset and the health check. Every other /api route needs a session,
 * so a new route is private unless it's added here deliberately.
 */
const PUBLIC_API_PREFIXES = ["/api/auth/", "/api/v1/", "/api/cron/", "/api/session/reset", "/api/health"];

export function isPublicApi(pathname: string) {
  return PUBLIC_API_PREFIXES.some((p) => pathname === p.replace(/\/$/, "") || pathname.startsWith(p));
}

export const proxy = auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;
  const path = nextUrl.pathname;

  if (path.startsWith("/api/")) {
    if (isPublicApi(path) || isLoggedIn) return NextResponse.next();
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const isAuthRoute = path.startsWith("/auth");

  // Redirect authenticated users away from login/register
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // Redirect unauthenticated users from protected routes to login
  if (!isAuthRoute && !isLoggedIn) {
    const loginUrl = new URL("/auth/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
