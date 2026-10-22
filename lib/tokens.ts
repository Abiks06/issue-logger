import { createHash, randomBytes } from "crypto";

// Secrets handed to users (email links, API keys) are random; only their
// SHA-256 hash is persisted, so a database leak doesn't leak usable tokens.

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export const API_KEY_PREFIX = "il_";

/** New API key: the full secret (shown once), its display prefix, and its hash. */
export function generateApiKey() {
  const secret = `${API_KEY_PREFIX}${randomToken(24)}`;
  return { secret, prefix: secret.slice(0, 10), hashedKey: sha256(secret) };
}

/** Extracts a bearer token from an Authorization header. */
export function bearerToken(header: string | null) {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}
