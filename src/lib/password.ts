import { randomBytes, scrypt as cryptoScrypt, timingSafeEqual, createHash } from "node:crypto";

const COST = 32768;
function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    cryptoScrypt(password, salt, 64, { N: COST, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error); else resolve(key);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(32);
  const key = await derive(password, salt);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const parts = encoded.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt" || !/^[a-f0-9]{64}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2])) return false;
  const actual = await derive(password, Buffer.from(parts[1], "hex"));
  return timingSafeEqual(actual, Buffer.from(parts[2], "hex"));
}

// Matches the work performed for an existing account; it is never a login credential.
export const DUMMY_PASSWORD_HASH = `scrypt$${"0".repeat(64)}$${"0".repeat(128)}`;
export function hashToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
