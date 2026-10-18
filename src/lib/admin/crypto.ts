import crypto from "crypto";

/**
 * Hash password securely using Node.js native crypto scrypt with random 16-byte salt.
 * Format: scrypt:<salt_hex>:<hash_hex>
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt:${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

/**
 * Verify password against stored scrypt hash using timingSafeEqual to prevent timing attacks.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const parts = storedHash.split(":");
      if (parts.length !== 3 || parts[0] !== "scrypt") {
        return resolve(false);
      }
      const salt = parts[1];
      const originalKey = Buffer.from(parts[2], "hex");

      crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
        if (err) return resolve(false);
        if (derivedKey.length !== originalKey.length) return resolve(false);
        const match = crypto.timingSafeEqual(derivedKey, originalKey);
        resolve(match);
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Hash a session token using SHA-256 for secure database lookup.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a cryptographically random session token (64 hex characters).
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
