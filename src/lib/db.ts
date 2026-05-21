import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "fs";
import path from "path";
import { assertMigrationsFolder } from "./db-errors";
import { ensureSchedulerStarted } from "./scheduler";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  sqlite?: Database.Database;
  db?: ReturnType<typeof drizzle<typeof schema>>;
};

function getDatabasePath(): string {
  return (
    process.env.DATABASE_PATH ??
    path.join(process.cwd(), "data", "keepsupabasealive.db")
  );
}

function getMigrationsFolder(): string {
  const explicit = process.env.DRIZZLE_MIGRATIONS_FOLDER?.trim();
  if (explicit) return explicit;
  return path.join(process.cwd(), "drizzle");
}

export function getDb() {
  if (!globalForDb.db) {
    const dbPath = getDatabasePath();
    const migrationsFolder = getMigrationsFolder();

    try {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    } catch (error) {
      throw new Error(
        `Could not create database directory for ${dbPath}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }

    assertMigrationsFolder(migrationsFolder);

    let sqlite: Database.Database;
    try {
      sqlite = new Database(dbPath);
    } catch (error) {
      throw new Error(
        `Could not open SQLite database at ${dbPath}. Check DATABASE_PATH and filesystem permissions.`,
        { cause: error },
      );
    }

    const journal = process.env.SQLITE_JOURNAL_MODE?.trim().toUpperCase();
    const allowedJournal = new Set(["DELETE", "TRUNCATE", "PERSIST", "WAL", "OFF"]);
    sqlite.pragma(
      journal && allowedJournal.has(journal)
        ? `journal_mode = ${journal}`
        : "journal_mode = WAL",
    );
    sqlite.pragma("foreign_keys = ON");

    const db = drizzle(sqlite, { schema });

    try {
      migrate(db, { migrationsFolder });
    } catch (error) {
      sqlite.close();
      throw new Error(
        `Database migration failed (folder: ${migrationsFolder}).`,
        { cause: error },
      );
    }

    globalForDb.sqlite = sqlite;
    globalForDb.db = db;

    if (process.env.NODE_ENV === "production") {
      ensureSchedulerStarted();
    }
  }

  return globalForDb.db;
}
