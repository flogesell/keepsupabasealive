const PUBLIC_PATHS = new Set([
  "/api/health",
  "/api/cron",
  "/rate-limited",
  "/favicon.svg",
  "/logo.svg",
]);

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function dashboardPassword(): string | undefined {
  return process.env.DASHBOARD_PASSWORD?.trim() || undefined;
}

function dashboardUsername(): string {
  return process.env.DASHBOARD_USER?.trim() || "admin";
}

export function isDashboardAuthEnabled(): boolean {
  return Boolean(dashboardPassword()?.length);
}

export function isPublicPath(pathname: string): boolean {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  if (PUBLIC_PATHS.has(normalized)) return true;
  // RSC / trailing slash variants
  if (normalized.startsWith("/rate-limited")) return true;
  return false;
}

function decodeBasicAuth(authorization: string): { username: string; password: string } | null {
  try {
    const decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator === -1) return null;
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export function verifyDashboardBasicAuth(
  authorization: string | null,
): boolean {
  const password = dashboardPassword();
  if (!password) return true;

  if (!authorization?.startsWith("Basic ")) return false;

  const credentials = decodeBasicAuth(authorization);
  if (!credentials) return false;

  const expectedUsername = dashboardUsername();
  if (credentials.username !== expectedUsername) return false;
  if (credentials.password.length !== password.length) return false;

  return safeEqual(credentials.password, password);
}
