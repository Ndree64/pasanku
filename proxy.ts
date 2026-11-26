import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LOCAL_SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Next.js 16 Proxy: pemeriksaan ringan berbasis cookie untuk mengarahkan
 * permintaan dasar sebelum Server Component memeriksa peran penuh di server.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocalSession = Boolean(
    request.cookies.get(LOCAL_SESSION_COOKIE)?.value
  );
  const hasSupabaseCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-"));

  const isAuthenticated = hasLocalSession || hasSupabaseCookie;

  const protectedPrefixes = ["/learner", "/validator", "/admin", "/preview"];
  const isProtected = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/learner/:path*",
    "/validator/:path*",
    "/admin/:path*",
    "/preview/:path*",
  ],
};
