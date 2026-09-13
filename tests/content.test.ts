import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyPortfolio, portfolioSchema, contactSchema, skillSchema, projectSchema } from "../src/lib/content-schema";
import { externalUrl, socialUrl } from "../src/lib/links";

test("initial portfolio contains no seeded personal content", () => {
  const data = portfolioSchema.parse(emptyPortfolio());
  assert.deepEqual(data.skills, []);
  assert.deepEqual(data.projects, []);
  assert.deepEqual(data.experience, []);
  const { showExperience, ...profile } = data.profile;
  assert.equal(showExperience, true);
  for (const value of Object.values(profile)) {
    assert.ok(value === "" || value === false || (Array.isArray(value) && value.length === 0));
  }
});

test("unsafe social protocols and extra fields cannot reach storage", () => {
  const data = emptyPortfolio();
  data.profile.github = "javascript:alert(1)";
  assert.equal(portfolioSchema.safeParse(data).success, false);
  data.profile.github = "https://example.org/path";
  const parsed = portfolioSchema.parse({ ...data, admin: true, profile: { ...data.profile, passwordHash: "injected" } });
  assert.equal("admin" in parsed, false);
  assert.equal("passwordHash" in parsed.profile, false);
});

test("unsafe icon slugs, excessive proficiency, and missing names are rejected", () => {
  const item = { id: "test-skill", name: "", slug: "../invalid", category: "", level: 101 };
  assert.equal(skillSchema.safeParse(item).success, false);
  assert.equal(skillSchema.safeParse({ ...item, name: "Test only", slug: "", level: 0 }).success, true);
});

test("duplicate item IDs cannot overwrite or collide at save time", () => {
  const data = emptyPortfolio();
  const item = { id: "duplicate", company: "Test only", role: "", period: "", note: "" };
  data.experience = [item, item];
  assert.equal(portfolioSchema.safeParse(data).success, false);
});

test("project links and accent values are validated", () => {
  const project = { id: "test-project", name: "Test only", index: "", category: "", description: "", stack: [], stars: "", year: "", status: "", color: "var(--teal)", url: "", sourceUrl: "" };
  assert.equal(projectSchema.safeParse(project).success, true);
  assert.equal(projectSchema.safeParse({ ...project, url: "data:text/html,invalid" }).success, false);
  assert.equal(projectSchema.safeParse({ ...project, color: "url(https://example.org)" }).success, false);
});

test("contact input must be meaningful and bounded", () => {
  assert.equal(contactSchema.safeParse({ name: "", email: "invalid", message: "short" }).success, false);
  assert.equal(contactSchema.safeParse({ name: "Test only", email: "test@example.org", message: "x".repeat(5001) }).success, false);
});

test("links allow HTTP(S), normalize handles, and reject executable URLs", () => {
  assert.equal(externalUrl("example.org/path"), "https://example.org/path");
  assert.equal(externalUrl("javascript:alert(1)"), undefined);
  assert.equal(externalUrl("data:text/html,test"), undefined);
  assert.equal(externalUrl("https://user:password@example.org"), undefined);
  assert.equal(externalUrl(""), undefined);
  assert.equal(socialUrl("@test_only", "twitter"), "https://x.com/test_only");
});
