import path from "path";
import { validateProductionEnv } from "./env";
import { getDb } from "./db";
import { migratePlaintextSecrets } from "./migrate-secrets";
import { ensureSchedulerStarted } from "./scheduler";

export async function register() {
  validateProductionEnv();

  getDb();
  const dbp =
    process.env.DATABASE_PATH?.trim() ||
    path.join(process.cwd(), "data", "keepsupabasealive.db");
  console.info("[keepsupabasealive] SQLite ready at", dbp);

  await migratePlaintextSecrets();
  ensureSchedulerStarted();
}
