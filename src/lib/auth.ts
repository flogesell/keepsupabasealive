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

export function isDashboardAuthEnabled(): boolean {
  return Boolean(process.env.DASHBOARD_PASSWORD?.length);
}

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

export function verifyDashboardBasicAuth(
  authorization: string | null,
): boolean {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return true;

  if (!authorization?.startsWith("Basic ")) return false;

  const decoded = atob(authorization.slice(6));
  const separator = decoded.indexOf(":");
  if (separator === -1) return false;

  const username = decoded.slice(0, separator);
  const providedPassword = decoded.slice(separator + 1);
  const expectedUsername = process.env.DASHBOARD_USER ?? "admin";

  if (username !== expectedUsername) return false;
  if (providedPassword.length !== password.length) return false;

  return safeEqual(providedPassword, password);
}
