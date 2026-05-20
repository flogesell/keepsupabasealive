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
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Auth health endpoint used by Supabase pause-prevention tooling. */
export function healthCheckUrl(projectUrl: string): string {
  return `${normalizeSupabaseUrl(projectUrl)}/auth/v1/health`;
}

export function parseSupabaseErrorBody(body: string): string | null {
  try {
    const json = JSON.parse(body) as { error?: string; message?: string };
    return json.error ?? json.message ?? null;
  } catch {
    return body.trim() || null;
  }
}
