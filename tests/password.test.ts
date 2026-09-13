import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes } from "node:crypto";
import { hashPassword, verifyPassword, hashToken, DUMMY_PASSWORD_HASH } from "../src/lib/password";

test("salted passwords verify correctly and reject incorrect credentials", async () => {
  const password = randomBytes(24).toString("base64url");
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.ok(!first.includes(password));
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword(`${password}!`, first), false);
  assert.equal(await verifyPassword(password, DUMMY_PASSWORD_HASH), false);
});

test("malformed password hashes fail closed", async () => {
  for (const hash of ["", "scrypt", "scrypt$a$b", `scrypt$${"0".repeat(64)}$invalid`]) {
    assert.equal(await verifyPassword("not-a-credential", hash), false);
  }
});

test("session hashes are deterministic without revealing the raw token", () => {
  const token = randomBytes(32).toString("base64url");
  assert.equal(hashToken(token), hashToken(token));
  assert.match(hashToken(token), /^[a-f0-9]{64}$/);
  assert.notEqual(hashToken(token), hashToken(`${token}x`));
  assert.notEqual(hashToken(token), token);
});
