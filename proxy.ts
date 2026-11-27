import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js 16 Proxy: pemeriksaan ringan berbasis cookie Supabase sebelum
 * Server Component memverifikasi sesi dan peran penuh di server.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSupabaseCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-"));

  const protectedPrefixes = ["/learner", "/validator", "/admin", "/preview"];
  const isProtected = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtected && !hasSupabaseCookie) {
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
