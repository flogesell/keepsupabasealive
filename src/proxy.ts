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
    return new NextResponse("Too many failed login attempts. Try again later.", {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    });
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
