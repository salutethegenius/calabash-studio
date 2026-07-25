import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight cookie presence check (avoids pulling Better Auth crypto / DB access into Edge).
 * Full session validation still happens in app/dashboard/layout.tsx via auth.api.getSession().
 */
const SESSION_COOKIE_NAMES = new Set([
  "better-auth.session",
  "better-auth.session_token",
]);

function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      (c) =>
        SESSION_COOKIE_NAMES.has(c.name) &&
        c.value.length > 0
    );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    if (!hasSessionCookie(request)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (pathname === "/login") {
    if (hasSessionCookie(request)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except the Sentry tunnel, Next.js internals, and static assets
  matcher: [
    "/((?!monitoring|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
