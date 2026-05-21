import cron from "node-cron";

const globalForScheduler = globalThis as unknown as {
  schedulerStarted?: boolean;
  schedulerRunning?: boolean;
};

async function runDuePingsTick(label: string) {
  if (globalForScheduler.schedulerRunning) return;
  globalForScheduler.schedulerRunning = true;
  try {
    const { runDuePings } = await import("./ping");
    const count = await runDuePings();
    if (count > 0) {
      console.log(`[scheduler] ${label}: pinged ${count} project(s)`);
    }
  } catch (error) {
    console.error(`[scheduler] ${label} failed:`, error);
  } finally {
    globalForScheduler.schedulerRunning = false;
  }
}

/** Idempotent — safe from instrumentation and first getDb() in production. */
export function ensureSchedulerStarted() {
  if (process.env.DISABLE_SCHEDULER === "true") return;
  if (globalForScheduler.schedulerStarted) return;
  globalForScheduler.schedulerStarted = true;

  cron.schedule("* * * * *", () => {
    void runDuePingsTick("cron");
  });

  // Don't wait until the next minute boundary after deploy / restart.
  setTimeout(() => {
    void runDuePingsTick("startup");
  }, 3_000);

  console.log("[scheduler] Started — due pings every minute (+ run 3s after startup)");
}

/** @deprecated Use ensureSchedulerStarted */
export function startScheduler() {
  ensureSchedulerStarted();
}
