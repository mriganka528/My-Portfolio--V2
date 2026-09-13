import "server-only";
import { isIP } from "node:net";
import { getDb } from "./db";
import { hashToken } from "./password";
import { RateLimitError } from "./http";

const MINUTE = 60 * 1000;
export const RATE_LIMITS = {
  "login-address": { max: 30, windowMs: 15 * MINUTE },
  "login-email": { max: 8, windowMs: 15 * MINUTE },
  "contact-address": { max: 10, windowMs: 60 * MINUTE },
  "contact-email": { max: 3, windowMs: 60 * MINUTE },
  "admin-read": { max: 120, windowMs: MINUTE },
  "admin-write": { max: 30, windowMs: MINUTE }
} as const;

export function clientAddress(request: Request) {
  // Ignore spoofable proxy headers unless the deployment explicitly trusts its proxy.
  if (process.env.TRUST_PROXY !== "true") return "shared";
  const address = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "";
  if (isIP(address) === 4) return address;
  // Canonicalize IPv6 so equivalent spellings cannot create separate buckets.
  if (isIP(address) === 6 && !address.includes("%")) return new URL(`http://[${address}]/`).hostname;
  return "shared";
}

export async function rateLimit(namespace: keyof typeof RATE_LIMITS, identifier: string) {
  const { max, windowMs } = RATE_LIMITS[namespace];
  const db = getDb();
  const now = new Date();
  const key = `${namespace}:${hashToken(identifier)}`;
  // Atomic PostgreSQL upsert: attempts remain counted across server instances and restarts.
  const rows = await db.$queryRaw<Array<{ count: number; expiresAt: Date }>>`
    INSERT INTO "RateLimit" ("key", "count", "expiresAt") VALUES (${key}, 1, ${new Date(now.getTime() + windowMs)})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."expiresAt" <= ${now} THEN 1 ELSE LEAST("RateLimit"."count", ${max}) + 1 END,
      "expiresAt" = CASE WHEN "RateLimit"."expiresAt" <= ${now} THEN EXCLUDED."expiresAt" ELSE "RateLimit"."expiresAt" END
    RETURNING "count", "expiresAt"
  `;
  if (rows[0].count > max) {
    throw new RateLimitError(Math.max(1, Math.ceil((rows[0].expiresAt.getTime() - Date.now()) / 1000)));
  }
  // Expired keys contain only hashes, but should not accumulate indefinitely.
  if (Math.random() < 0.05) await db.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } });
}
