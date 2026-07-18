import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight cookie presence check (avoids pulling Better Auth crypto into Edge).
 * Full session validation still happens in app/dashboard/layout.tsx via auth.api.getSession().
 */
function hasSessionCookie(request: NextRequest): boolean {
  const all = request.cookies.getAll();
  return all.some(
    (c) =>
      c.name.includes("session_token") ||
      c.name.includes("better-auth.session")
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
  matcher: ["/dashboard/:path*", "/login"],
};
