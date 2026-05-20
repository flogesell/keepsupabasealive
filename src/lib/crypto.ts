import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const PREFIX = "enc:v1:";
const IV_LENGTH = 12;

function deriveKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error("ENCRYPTION_KEY is not set");
  }
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  return scryptSync(raw, "keepsupabasealive-v1", 32);
}

export function isEncryptionEnabled(): boolean {
  return Boolean(process.env.ENCRYPTION_KEY?.trim());
}

/** Encrypts a secret for SQLite storage. Legacy rows without PREFIX stay readable. */
export function encryptSecret(plaintext: string): string {
  if (!isEncryptionEnabled()) {
    return plaintext;
  }

  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey();
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

/** Decrypts stored value, or returns legacy plaintext as-is. */
export function decryptSecret(stored: string): string {
  if (!stored.startsWith(PREFIX)) {
    return stored;
  }

  if (!isEncryptionEnabled()) {
    throw new Error(
      "Database contains encrypted secrets but ENCRYPTION_KEY is not set",
    );
  }

  const payload = stored.slice(PREFIX.length);
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted secret format");
  }

  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");
  const key = deriveKey();

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}
