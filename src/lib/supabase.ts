const PROJECT_REF_PATTERN = /^[a-z0-9]{10,32}$/i;

export class InvalidSupabaseUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSupabaseUrlError";
  }
}

/** Extract the project ref from common Supabase URL formats. */
export function extractProjectRef(input: string): string {
  const trimmed = input.trim();

  const dashboardMatch = trimmed.match(
    /(?:dashboard\/project|\/project)\/([a-z0-9]+)/i,
  );
  if (dashboardMatch) {
    return dashboardMatch[1].toLowerCase();
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const url = new URL(trimmed);
    const hostMatch = url.hostname.match(/^([a-z0-9]+)\.supabase\.co$/i);
    if (hostMatch) {
      return hostMatch[1].toLowerCase();
    }
    throw new InvalidSupabaseUrlError(
      `Expected a project URL like https://your-ref.supabase.co, got hostname "${url.hostname}".`,
    );
  }

  const ref = trimmed
    .replace(/\.supabase\.co\/?$/i, "")
    .replace(/^\/+/, "")
    .toLowerCase();

  if (!PROJECT_REF_PATTERN.test(ref)) {
    throw new InvalidSupabaseUrlError(
      "Enter your project reference (e.g. abcdefgh) or full URL https://abcdefgh.supabase.co — not the Supabase dashboard link alone.",
    );
  }

  return ref;
}

export function normalizeSupabaseUrl(input: string): string {
  const ref = extractProjectRef(input);
  return `https://${ref}.supabase.co`;
}

export function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (seconds < 60) return rtf.format(-seconds, "second");
  if (seconds < 3600) return rtf.format(-Math.floor(seconds / 60), "minute");
  if (seconds < 86400) return rtf.format(-Math.floor(seconds / 3600), "hour");
  return rtf.format(-Math.floor(seconds / 86400), "day");
}

export function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms.toLocaleString()}ms`;
  return `${(ms / 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}s`;
}

/**
 * GoTrue password-grant endpoint.
 * Sending fake credentials forces GoTrue to query auth.users — a real
 * PostgreSQL round-trip that Supabase counts as project activity.
 * Expects HTTP 400 ("invalid_grant") for a healthy project; 5xx or null
 * status indicates the project is paused or unreachable.
 * `/auth/v1/health` is intentionally excluded from Supabase's activity
 * tracking, which is why we use this endpoint instead.
 */
export function healthCheckUrl(projectUrl: string): string {
  return `${normalizeSupabaseUrl(projectUrl)}/auth/v1/token?grant_type=password`;
}

export function parseSupabaseErrorBody(body: string): string | null {
  try {
    const json = JSON.parse(body) as { error?: string; message?: string };
    return json.error ?? json.message ?? null;
  } catch {
    return body.trim() || null;
  }
}
