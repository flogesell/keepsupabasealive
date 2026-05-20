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

    // Redirect (not rewrite): the browser must navigate to a path that does not
    // require Basic Auth. A rewrite keeps the visible URL on `/` (etc.), so RSC
    // and follow-up requests still hit the proxy as `/` and get 401 before the
    // error page can render.
    const url = request.nextUrl.clone();
    url.pathname = "/rate-limited";
    url.search = "";
    url.searchParams.set("retry", String(retryAfter));

    return NextResponse.redirect(url, { status: 307, headers });
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
    // Exclude /rate-limited so the lockout page is never behind Basic Auth
    // (even if PUBLIC_PATHS drifts, this path must stay reachable).
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|rate-limited(?:/|$)|.*\\.(?:svg|png|ico)$).*)",
  ],
};
