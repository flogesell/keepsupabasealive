import fs from "fs";
import path from "path";

/**
 * Maps common SQLite / filesystem errors to actionable hints for self-hosting
 * (Coolify, Docker volumes, permissions).
 */
function hintForSingleError(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;

  const e = error as NodeJS.ErrnoException & { message?: string };
  const msg = String(e.message ?? "");

  if (
    msg.includes("Drizzle migrations not found") ||
    msg.includes("meta/_journal.json") ||
    (e.code === "ENOENT" &&
      (msg.includes("drizzle") || msg.includes("_journal")))
  ) {
    return "The `drizzle/` migrations folder is missing from the runtime image. Deploy using the repository Dockerfile, or set DRIZZLE_MIGRATIONS_FOLDER to a path that contains `meta/_journal.json`.";
  }

  if (
    e.code === "EACCES" ||
    e.code === "EPERM" ||
    e.code === "SQLITE_READONLY" ||
    e.code === "SQLITE_CANTOPEN" ||
    msg.includes("SQLITE_READONLY") ||
    msg.includes("SQLITE_CANTOPEN") ||
    msg.includes("readonly database")
  ) {
    return "SQLite cannot write its database directory (WAL files need the same folder as the .db). Check container logs for lines starting with `keepsupabasealive:` — usually: Coolify **volume** on `/data` (not a **file** mount), or clear a **custom container user**, or set `SQLITE_JOURNAL_MODE=DELETE` if the filesystem rejects WAL.";
  }

  return undefined;
}

/** Walks `error.cause` for wrapped DB open / migration failures. */
export function getDatabaseFailureHint(error: unknown): string | undefined {
  const visited = new WeakSet<object>();
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current && typeof current === "object"; depth++) {
    if (visited.has(current as object)) break;
    visited.add(current as object);
    const hint = hintForSingleError(current);
    if (hint) return hint;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

export function assertMigrationsFolder(migrationsFolder: string): void {
  const journal = path.join(migrationsFolder, "meta", "_journal.json");
  if (!fs.existsSync(journal)) {
    throw new Error(
      `Drizzle migrations not found (expected ${journal}). Set DRIZZLE_MIGRATIONS_FOLDER or copy the drizzle/ directory next to the server process.`,
    );
  }
}
