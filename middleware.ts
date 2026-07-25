import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight cookie presence check (avoids pulling Better Auth crypto / DB access into Edge).
 * Full session validation still happens in app/dashboard/layout.tsx via auth.api.getSession().
 *
 * Better Auth sets secure-prefixed cookie names on HTTPS (e.g. __Secure-better-auth.session_token).
 * We strip the optional __Secure- / __Host- prefix before checking the known token names.
 */
const SESSION_COOKIE_NAMES = new Set([
  "better-auth.session",
  "better-auth.session_token",
]);

function stripCookiePrefix(name: string): string {
  if (name.startsWith("__Secure-")) return name.slice(9);
  if (name.startsWith("__Host-")) return name.slice(7);
  return name;
}

function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      (c) =>
        SESSION_COOKIE_NAMES.has(stripCookiePrefix(c.name)) &&
        c.value.length > 0
    );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = hasSessionCookie(request);

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(authed ? "/dashboard" : "/login", request.url)
    );
  }

  if (pathname.startsWith("/dashboard")) {
    if (!authed) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (pathname === "/login") {
    if (authed) {
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
