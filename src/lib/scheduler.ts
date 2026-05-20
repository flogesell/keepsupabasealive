import cron from "node-cron";

let started = false;

export function startScheduler() {
  if (started || process.env.DISABLE_SCHEDULER === "true") return;
  started = true;

  cron.schedule("* * * * *", async () => {
    try {
      const { runDuePings } = await import("./ping");
      const count = await runDuePings();
      if (count > 0) {
        console.log(`[scheduler] Pinged ${count} project(s)`);
      }
    } catch (error) {
      console.error("[scheduler] Error running pings:", error);
    }
  });

  console.log("[scheduler] Started — checking for due pings every minute");
}
