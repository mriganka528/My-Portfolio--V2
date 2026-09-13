import { randomUUID } from "node:crypto";
import { test, expect, type APIResponse } from "@playwright/test";
import { Pool } from "pg";
import { hashPassword, hashToken } from "../../src/lib/password";

const origin = "http://127.0.0.1:3100";
const adminId = randomUUID();
const email = `security-${adminId}@example.org`;
const contactEmail = `contact-${adminId}@example.org`;
const password = randomUUID();
const key = (namespace: string, identifier: string) => `${namespace}:${hashToken(identifier)}`;
const keys = [key("login-address", "shared"), key("contact-address", "shared"), key("login-email", email), key("contact-email", contactEmail), key("admin-read", adminId), key("admin-write", adminId)];
let db: Pool;

async function seedLimit(namespace: string, identifier: string, count: number) {
  await db.query('INSERT INTO "RateLimit" ("key", "count", "expiresAt") VALUES ($1, $2, (NOW() AT TIME ZONE \'UTC\') + INTERVAL \'1 minute\') ON CONFLICT ("key") DO UPDATE SET "count" = EXCLUDED."count", "expiresAt" = EXCLUDED."expiresAt"', [key(namespace, identifier), count]);
}

async function expectLimited(response: APIResponse) {
  expect(response.status()).toBe(429);
  const seconds = Number(response.headers()["retry-after"]);
  expect(seconds).toBeGreaterThan(0);
  expect((await response.json()).retryAfterSeconds).toBe(seconds);
}

test.describe("database-backed session and rate-limit enforcement", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "Requires a dedicated migrated test database.");

  test.beforeAll(async () => {
    db = new Pool({ connectionString: process.env.E2E_DATABASE_URL, max: 1 });
    await db.query('INSERT INTO "Admin" ("id", "email", "passwordHash", "updatedAt") VALUES ($1, $2, $3, NOW())', [adminId, email, await hashPassword(password)]);
  });

  test.beforeEach(async () => {
    await db.query('DELETE FROM "RateLimit" WHERE "key" = ANY($1::text[])', [keys]);
  });

  test.afterAll(async () => {
    if (!db) return;
    try {
      await db.query('DELETE FROM "ContactMessage" WHERE "email" = $1', [contactEmail]);
      await db.query('DELETE FROM "RateLimit" WHERE "key" = ANY($1::text[])', [keys]);
      await db.query('DELETE FROM "Admin" WHERE "id" = $1', [adminId]);
    } finally { await db.end(); }
  });

  for (const rememberMe of [true, false]) {
    test(`${rememberMe ? "30-day" : "12-hour"} sessions survive navigation and expire on the server`, async ({ context, page, browser }) => {
      const response = await context.request.post("/api/auth/login", { headers: { origin }, data: { email, password, rememberMe } });
      expect(response.status()).toBe(200);
      const cookie = (await context.cookies()).find(item => item.name === "portfolio_admin_session")!;
      expect(cookie).toBeDefined();
      expect(cookie.httpOnly).toBe(true);
      expect(cookie.sameSite).toBe("Strict");
      const lifetime = (rememberMe ? 30 * 24 : 12) * 3600;
      expect(cookie.expires - Date.now() / 1000).toBeGreaterThan(lifetime - 15);
      expect(cookie.expires - Date.now() / 1000).toBeLessThanOrEqual(lifetime);
      const stored = await db.query('SELECT "expiresAt" AT TIME ZONE \'UTC\' AS "expiresAt" FROM "Session" WHERE "tokenHash" = $1', [hashToken(cookie.value)]);
      expect(Math.abs(stored.rows[0].expiresAt.getTime() / 1000 - cookie.expires)).toBeLessThan(2);
      await page.goto("/admin/login");
      await expect(page).toHaveURL(/\/admin$/);
      await page.reload();
      await expect(page).toHaveURL(/\/admin$/);

      const reopened = await browser.newContext({ storageState: await context.storageState() });
      try {
        expect((await reopened.request.get(`${origin}/api/admin/content`)).status()).toBe(200);
      } finally { await reopened.close(); }

      await db.query('UPDATE "Session" SET "expiresAt" = (NOW() AT TIME ZONE \'UTC\') - INTERVAL \'1 second\' WHERE "tokenHash" = $1', [hashToken(cookie.value)]);
      expect((await context.request.get("/api/admin/content")).status()).toBe(401);
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/admin\/login$/);
    });
  }

  test("login limits concurrent attempts, normalizes account email, and recovers after expiry", async ({ request }) => {
    const attempts = await Promise.all(Array.from({ length: 8 }, () => request.post("/api/auth/login", { headers: { origin }, data: { email: email.toUpperCase(), password: "incorrect-password" } })));
    expect(attempts.map(response => response.status())).toEqual(Array(8).fill(401));
    const blocked = await request.post("/api/auth/login", { headers: { origin }, data: { email, password } });
    await expectLimited(blocked);
    expect(blocked.headers()["set-cookie"]).toBeUndefined();
    await db.query('UPDATE "RateLimit" SET "expiresAt" = (NOW() AT TIME ZONE \'UTC\') - INTERVAL \'1 second\' WHERE "key" = $1', [key("login-email", email)]);
    expect((await request.post("/api/auth/login", { headers: { origin }, data: { email, password } })).status()).toBe(200);
  });

  test("malformed requests consume address limits and untrusted proxy headers cannot bypass them", async ({ request }) => {
    for (const [path, namespace, max] of [["/api/auth/login", "login-address", 30], ["/api/contact", "contact-address", 10]] as const) {
      await seedLimit(namespace, "shared", max - 1);
      expect((await request.post(path, { headers: { origin }, data: {} })).status()).toBe(400);
      await expectLimited(await request.post(path, { headers: { origin, "x-forwarded-for": "203.0.113.2" }, data: {} }));
    }
  });

  test("contact quotas prevent extra messages and return a retry delay", async ({ request }) => {
    const data = { name: "Security test", email: contactEmail, message: "A temporary test contact message." };
    for (let i = 0; i < 3; i++) expect((await request.post("/api/contact", { headers: { origin }, data })).status()).toBe(201);
    await expectLimited(await request.post("/api/contact", { headers: { origin }, data: { ...data, email: contactEmail.toUpperCase() } }));
    const count = await db.query('SELECT COUNT(*)::int AS count FROM "ContactMessage" WHERE "email" = $1', [contactEmail]);
    expect(count.rows[0].count).toBe(3);
  });

  test("admin quotas cover reads and writes across sessions while logout still revokes access", async ({ context, browser }) => {
    expect((await context.request.post("/api/auth/login", { headers: { origin }, data: { email, password, rememberMe: true } })).status()).toBe(200);
    const cookie = (await context.cookies()).find(item => item.name === "portfolio_admin_session")!;
    const second = await browser.newContext();
    try {
      expect((await second.request.post(`${origin}/api/auth/login`, { headers: { origin }, data: { email, password } })).status()).toBe(200);
      await seedLimit("admin-read", adminId, 119);
      expect((await context.request.get("/api/admin/content")).status()).toBe(200);
      await expectLimited(await second.request.get(`${origin}/api/admin/messages`));
      await expectLimited(await context.request.get("/api/admin/content"));
      await seedLimit("admin-write", adminId, 29);
      expect((await context.request.put("/api/admin/content", { headers: { origin }, data: {} })).status()).toBe(400);
      await expectLimited(await context.request.put("/api/admin/content", { headers: { origin }, data: {} }));
      await expectLimited(await context.request.patch("/api/admin/messages/missing", { headers: { origin }, data: { read: true } }));
      await expectLimited(await second.request.delete(`${origin}/api/admin/messages/missing`, { headers: { origin } }));
      expect((await context.request.post("/api/auth/logout", { headers: { origin } })).status()).toBe(200);
      expect((await context.cookies()).some(item => item.name === "portfolio_admin_session")).toBe(false);
      const stored = await db.query('SELECT "id" FROM "Session" WHERE "tokenHash" = $1', [hashToken(cookie.value)]);
      expect(stored.rowCount).toBe(0);
      await context.addCookies([cookie]);
      expect((await context.request.get("/api/admin/content")).status()).toBe(401);
    } finally { await second.close(); }
  });
});
