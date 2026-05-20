import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isDashboardAuthEnabled,
  isPublicPath,
  verifyDashboardBasicAuth,
} from "@/lib/auth";
import {
  authRateLimitRetryAfterSeconds,
  clearAuthFailures,
  getClientIp,
  isAuthRateLimited,
  recordAuthFailure,
} from "@/lib/rate-limit";

export function proxy(request: NextRequest) {
  if (!isDashboardAuthEnabled() || isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const ip = getClientIp(request);

  if (isAuthRateLimited(ip)) {
    const retryAfter = authRateLimitRetryAfterSeconds(ip);
    const headers = { "Retry-After": String(retryAfter) };

    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error: "Too many failed login attempts",
          retryAfter,
        },
        { status: 429, headers },
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = "/rate-limited";
    url.search = `?retry=${retryAfter}`;

    return NextResponse.rewrite(url, { status: 429, headers });
  }

  if (verifyDashboardBasicAuth(request.headers.get("authorization"))) {
    clearAuthFailures(ip);
    return NextResponse.next();
  }

  recordAuthFailure(ip);

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="KeepSupabaseAlive", charset="UTF-8"',
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|.*\\.(?:svg|png|ico)$).*)",
  ],
};
