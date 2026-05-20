import { eq } from "drizzle-orm";
import { decryptSecret, encryptSecret, isEncryptionEnabled } from "./crypto";
import { getDb } from "./db";
import { projects } from "./schema";

const PREFIX = "enc:v1:";

/** Re-encrypt legacy plaintext anon keys after enabling ENCRYPTION_KEY. */
export async function migratePlaintextSecrets(): Promise<void> {
  if (!isEncryptionEnabled()) return;

  const db = getDb();
  const all = await db.select({ id: projects.id, anonKey: projects.anonKey }).from(projects);

  for (const row of all) {
    if (row.anonKey.startsWith(PREFIX)) continue;

    const plaintext = decryptSecret(row.anonKey);
    await db
      .update(projects)
      .set({ anonKey: encryptSecret(plaintext) })
      .where(eq(projects.id, row.id));
  }
}
