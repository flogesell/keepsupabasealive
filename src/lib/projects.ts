import { and, desc, eq, gte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { encryptSecret } from "./crypto";
import { getDb } from "./db";
import { getLatestPing } from "./ping";
import { pings, projects } from "./schema";
import { normalizeSupabaseUrl } from "./supabase";

export async function listProjectsWithStats() {
  const db = getDb();
  const allProjects = await db
    .select()
    .from(projects)
    .orderBy(desc(projects.createdAt));

  return Promise.all(
    allProjects.map(async (project) => {
      const latestPing = await getLatestPing(project.id);
      const [stats] = await db
        .select({
          total: sql<number>`count(*)`,
          success: sql<number>`sum(case when ${pings.success} = 1 then 1 else 0 end)`,
        })
        .from(pings)
        .where(
          and(
            eq(pings.projectId, project.id),
            gte(
              pings.createdAt,
              new Date(Date.now() - 24 * 60 * 60 * 1000),
            ),
          ),
        );

      return {
        ...project,
        url: normalizeSupabaseUrl(project.url),
        latestPing,
        stats24h: {
          total: Number(stats?.total ?? 0),
          success: Number(stats?.success ?? 0),
        },
      };
    }),
  );
}

export async function getPingHistory(hours = 24, projectId?: string) {
  const db = getDb();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const conditions = projectId
    ? and(gte(pings.createdAt, since), eq(pings.projectId, projectId))
    : gte(pings.createdAt, since);

  return db
    .select({
      id: pings.id,
      projectId: pings.projectId,
      projectName: projects.name,
      success: pings.success,
      statusCode: pings.statusCode,
      latencyMs: pings.latencyMs,
      errorMessage: pings.errorMessage,
      createdAt: pings.createdAt,
    })
    .from(pings)
    .innerJoin(projects, eq(pings.projectId, projects.id))
    .where(conditions)
    .orderBy(desc(pings.createdAt))
    .limit(500);
}

export async function getChartData(hours = 24) {
  const db = getDb();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const rows = await db
    .select({
      bucket: sql<string>`strftime('%Y-%m-%d %H:00', datetime(${pings.createdAt} / 1000, 'unixepoch'))`,
      success: sql<number>`sum(case when ${pings.success} = 1 then 1 else 0 end)`,
      failed: sql<number>`sum(case when ${pings.success} = 0 then 1 else 0 end)`,
      avgLatency: sql<number>`avg(${pings.latencyMs})`,
    })
    .from(pings)
    .where(gte(pings.createdAt, since))
    .groupBy(
      sql`strftime('%Y-%m-%d %H:00', datetime(${pings.createdAt} / 1000, 'unixepoch'))`,
    )
    .orderBy(
      sql`strftime('%Y-%m-%d %H:00', datetime(${pings.createdAt} / 1000, 'unixepoch'))`,
    );

  return rows.map((row) => ({
    time: row.bucket,
    success: Number(row.success),
    failed: Number(row.failed),
    avgLatency: Math.round(Number(row.avgLatency ?? 0)),
  }));
}

export async function createProject(data: {
  name: string;
  url: string;
  anonKey: string;
  intervalMinutes: number;
}) {
  const db = getDb();
  const now = new Date();
  const id = nanoid();

  await db.insert(projects).values({
    id,
    name: data.name,
    url: normalizeSupabaseUrl(data.url),
    anonKey: encryptSecret(data.anonKey.trim()),
    intervalMinutes: data.intervalMinutes,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}
