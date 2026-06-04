import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { decryptSecret } from "./crypto";
import { getDb } from "./db";
import {
  healthCheckUrl,
  parseSupabaseErrorBody,
} from "./supabase";
import { pings, projects, type Project } from "./schema";

const DEV = process.env.NODE_ENV === "development";

export type PingResult = {
  success: boolean;
  statusCode: number | null;
  latencyMs: number;
  errorMessage: string | null;
  endpoint: string;
};

// Keepalive credentials — clearly fake, never match a real account.
const PING_EMAIL = "keepalive@ping.keepsupabasealive.invalid";
const PING_PASSWORD = "keepalive-ping-do-not-create";

/**
 * POSTs fake credentials to GoTrue's password-grant endpoint.
 * GoTrue queries auth.users regardless of whether the email exists, so
 * the database is touched. We expect HTTP 400 ("invalid_grant") for a
 * healthy project; anything ≥ 500 or a network error means the project
 * is down or paused.
 */
export async function executePing(project: Project): Promise<PingResult> {
  const endpoint = healthCheckUrl(project.url);
  const start = Date.now();

  if (DEV) console.debug(`[ping] ${project.name} → POST ${endpoint}`);

  if (!project.anonKey?.trim()) {
    if (DEV) console.debug(`[ping] ${project.name} skipped — no anon key`);
    return {
      success: false,
      statusCode: null,
      latencyMs: 0,
      errorMessage:
        "Anon key is required. Add it from Supabase → Project Settings → API (anon public).",
      endpoint,
    };
  }

  let anonKey: string;
  try {
    anonKey = decryptSecret(project.anonKey).trim();
  } catch {
    if (DEV) console.debug(`[ping] ${project.name} skipped — decrypt failed`);
    return {
      success: false,
      statusCode: null,
      latencyMs: 0,
      errorMessage: "Could not decrypt stored anon key. Check ENCRYPTION_KEY.",
      endpoint,
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ email: PING_EMAIL, password: PING_PASSWORD }),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });

    const latencyMs = Date.now() - start;
    const body = await response.text();

    // 400 = "invalid_grant" (expected — GoTrue queried auth.users, project is alive).
    // 401 = our anon key is wrong.
    // 5xx / null = project is paused or unreachable.
    const success = response.status < 500 && response.status !== 401;

    let errorMessage: string | null = null;
    if (!success) {
      errorMessage = parseSupabaseErrorBody(body) ?? `HTTP ${response.status}`;
    }

    if (DEV) {
      const label = success ? "ok" : "failed";
      console.debug(`[ping] ${project.name} ${label} — ${response.status} (${latencyMs}ms)\n  body: ${body.slice(0, 300)}`);
    }

    return {
      success,
      statusCode: response.status,
      latencyMs,
      errorMessage,
      endpoint,
    };
  } catch (error) {
    const latencyMs = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (DEV) console.debug(`[ping] ${project.name} error — ${errorMessage} (${latencyMs}ms)`);
    return {
      success: false,
      statusCode: null,
      latencyMs,
      errorMessage,
      endpoint,
    };
  }
}

export async function pingProject(projectId: string): Promise<PingResult | null> {
  const db = getDb();
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project || !project.enabled) return null;

  const result = await executePing(project);

  await db.insert(pings).values({
    id: nanoid(),
    projectId: project.id,
    success: result.success,
    statusCode: result.statusCode,
    latencyMs: result.latencyMs,
    errorMessage: result.errorMessage,
    createdAt: new Date(),
  });

  await db
    .update(projects)
    .set({ updatedAt: new Date() })
    .where(eq(projects.id, project.id));

  return result;
}

export async function getLatestPing(projectId: string) {
  const db = getDb();
  const [latest] = await db
    .select()
    .from(pings)
    .where(eq(pings.projectId, projectId))
    .orderBy(desc(pings.createdAt))
    .limit(1);
  return latest ?? null;
}

export async function runDuePings(): Promise<number> {
  const db = getDb();
  const allProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.enabled, true));

  let count = 0;

  for (const project of allProjects) {
    const latest = await getLatestPing(project.id);
    const lastPingAt = latest?.createdAt ?? new Date(0);
    const dueAt =
      lastPingAt.getTime() + project.intervalMinutes * 60 * 1000;

    if (Date.now() >= dueAt) {
      if (DEV) console.debug(`[ping] ${project.name} is due (last: ${lastPingAt.toISOString()}, interval: ${project.intervalMinutes}m)`);
      await pingProject(project.id);
      count++;
    } else if (DEV) {
      const msLeft = dueAt - Date.now();
      console.debug(`[ping] ${project.name} not due for ${Math.round(msLeft / 1000)}s`);
    }
  }

  return count;
}
