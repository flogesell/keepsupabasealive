import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  anonKey: text("anon_key").notNull(),
  intervalMinutes: integer("interval_minutes").notNull().default(360),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const pings = sqliteTable("pings", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  success: integer("success", { mode: "boolean" }).notNull(),
  statusCode: integer("status_code"),
  latencyMs: integer("latency_ms").notNull(),
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type Project = typeof projects.$inferSelect;
export type Ping = typeof pings.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
