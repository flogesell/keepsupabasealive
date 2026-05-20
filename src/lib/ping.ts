import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { decryptSecret } from "./crypto";
import { getDb } from "./db";
import {
  healthCheckUrl,
  parseSupabaseErrorBody,
} from "./supabase";
import { pings, projects, type Project } from "./schema";

export type PingResult = {
  success: boolean;
  statusCode: number | null;
  latencyMs: number;
  errorMessage: string | null;
  endpoint: string;
};

/**
 * Pings `/auth/v1/health` with the public anon key in the `apikey` header.
 * Hosted Supabase returns `{"error":"requested path is invalid"}` without it.
 * Does not query PostgREST or database tables.
 */
export async function executePing(project: Project): Promise<PingResult> {
  const endpoint = healthCheckUrl(project.url);
  const start = Date.now();

  if (!project.anonKey?.trim()) {
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
      method: "GET",
      headers: {
        Accept: "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });

    const latencyMs = Date.now() - start;
    const body = await response.text();
    const apiError = parseSupabaseErrorBody(body);
    const success = response.ok && !apiError;

    return {
      success,
      statusCode: response.status,
      latencyMs,
      errorMessage: success
        ? null
        : (apiError ?? `HTTP ${response.status}`),
      endpoint,
    };
  } catch (error) {
    return {
      success: false,
      statusCode: null,
      latencyMs: Date.now() - start,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
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
      await pingProject(project.id);
      count++;
    }
  }

  return count;
}
