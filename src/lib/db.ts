import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "fs";
import path from "path";
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

export function getDb() {
  if (!globalForDb.db) {
    const dbPath = getDatabasePath();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");

    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

    globalForDb.sqlite = sqlite;
    globalForDb.db = db;
  }

  return globalForDb.db;
}
