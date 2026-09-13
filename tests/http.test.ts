import assert from "node:assert/strict";
import { test } from "node:test";
import { apiError, assertSameOrigin, HttpError, RateLimitError, readJson } from "../src/lib/http";

test("rate-limit responses expose the retry delay and are never cached", async () => {
  const response = apiError(new RateLimitError(61));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "61");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), {
    error: "Too many attempts. Please try again in 2 minutes.", retryAfterSeconds: 61
  });
  assert.equal(apiError(new HttpError(401, "Please sign in.")).headers.get("Retry-After"), null);
});

test("mutation requests require the configured same origin", () => {
  const previous = process.env.APP_URL;
  process.env.APP_URL = "https://portfolio.example.org";
  try {
    const valid = new Request("http://internal-server/api", { headers: { origin: "https://portfolio.example.org" } });
    assert.doesNotThrow(() => assertSameOrigin(valid));
    const invalidHeaders: HeadersInit[] = [{}, { origin: "https://attacker.example.org" }, { origin: "https://portfolio.example.org", "sec-fetch-site": "cross-site" }];
    for (const headers of invalidHeaders) {
      assert.throws(() => assertSameOrigin(new Request("https://portfolio.example.org/api", { headers })), (error: unknown) => error instanceof HttpError && error.status === 403);
    }
  } finally {
    if (previous === undefined) delete process.env.APP_URL; else process.env.APP_URL = previous;
  }
});

test("JSON parsing rejects malformed, non-JSON, and oversized requests", async () => {
  const request = (body: string, type = "application/json") => new Request("https://example.org", { method: "POST", headers: { "content-type": type }, body });
  assert.deepEqual(await readJson(request('{"ok":true}')), { ok: true });
  await assert.rejects(readJson(request("invalid")), (error: unknown) => error instanceof HttpError && error.status === 400);
  await assert.rejects(readJson(request("{}", "text/plain")), (error: unknown) => error instanceof HttpError && error.status === 415);
  await assert.rejects(readJson(request(JSON.stringify({ value: "x".repeat(100) })), 20), (error: unknown) => error instanceof HttpError && error.status === 413);
});
