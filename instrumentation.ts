export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateProductionEnv } = await import("./src/lib/env");
    validateProductionEnv();

    const { migratePlaintextSecrets } = await import("./src/lib/migrate-secrets");
    await migratePlaintextSecrets();

    const { startScheduler } = await import("./src/lib/scheduler");
    startScheduler();
  }
}
