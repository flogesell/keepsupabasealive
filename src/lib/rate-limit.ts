type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

function prune() {
  const now = Date.now();
  for (const [ip, entry] of store) {
    if (entry.resetAt <= now) store.delete(ip);
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export function isAuthRateLimited(ip: string): boolean {
  prune();
  const entry = store.get(ip);
  if (!entry) return false;
  if (entry.resetAt <= Date.now()) {
    store.delete(ip);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

export function recordAuthFailure(ip: string): void {
  prune();
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || entry.resetAt <= now) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  entry.count += 1;
}

export function clearAuthFailures(ip: string): void {
  store.delete(ip);
}

export function authRateLimitRetryAfterSeconds(ip: string): number {
  const entry = store.get(ip);
  if (!entry) return 0;
  return Math.max(0, Math.ceil((entry.resetAt - Date.now()) / 1000));
}
