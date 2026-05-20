const PRODUCTION_REQUIRED = [
  {
    key: "DASHBOARD_PASSWORD",
    hint: "Protects the dashboard and API with HTTP Basic Auth.",
  },
  {
    key: "ENCRYPTION_KEY",
    hint: "Encrypts Supabase anon keys at rest. Generate: openssl rand -hex 32",
  },
  {
    key: "CRON_SECRET",
    hint: "Protects POST /api/cron from unauthorized triggers.",
  },
] as const;

export function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return;

  const missing = PRODUCTION_REQUIRED.filter(
    ({ key }) => !process.env[key]?.trim(),
  );

  if (missing.length > 0) {
    const lines = missing.map(({ key, hint }) => `  - ${key}: ${hint}`);
    throw new Error(
      `Missing required production environment variables:\n${lines.join("\n")}`,
    );
  }

  const key = process.env.ENCRYPTION_KEY!.trim();
  if (!/^[0-9a-f]{64}$/i.test(key) && key.length < 16) {
    throw new Error(
      "ENCRYPTION_KEY must be 64 hex characters (openssl rand -hex 32) or a passphrase of at least 16 characters.",
    );
  }
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isCronAllowed(): boolean {
  if (!isProduction()) return true;
  return Boolean(process.env.CRON_SECRET?.trim());
}
