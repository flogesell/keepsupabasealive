export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { validateProductionEnv } = await import("./src/lib/env");
    validateProductionEnv();

    const { getDb } = await import("./src/lib/db");
    getDb();
    const path = await import("path");
    const dbp =
      process.env.DATABASE_PATH?.trim() ||
      path.join(process.cwd(), "data", "keepsupabasealive.db");
    console.info("[keepsupabasealive] SQLite ready at", dbp);

    const { migratePlaintextSecrets } = await import("./src/lib/migrate-secrets");
    await migratePlaintextSecrets();

    const { ensureSchedulerStarted } = await import("./src/lib/scheduler");
    ensureSchedulerStarted();
  } catch (error) {
    console.error("[keepsupabasealive] instrumentation failed — app may return 500 for API routes", error);
    throw error;
  }
}
