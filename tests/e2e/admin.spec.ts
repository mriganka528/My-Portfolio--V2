import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { emptyPortfolio, type PortfolioData } from "../../src/lib/content-schema";

test("admin authentication, publishing, conflicts, inbox, and logout", async ({ page, context }) => {
  test.skip(!process.env.E2E_DATABASE_URL || !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD, "Requires a dedicated migrated test database and provisioned admin.");
  const origin = "http://127.0.0.1:3100";
  const marker = randomUUID().slice(0, 8);
  await page.goto("/admin/login");
  await page.getByLabel("email", { exact: true }).fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel("password", { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "authenticate →", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  const session = (await context.cookies()).find(cookie => cookie.name === "portfolio_admin_session");
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Strict");

  const originalResponse = await context.request.get("/api/admin/content");
  expect(originalResponse.ok()).toBe(true);
  const original: PortfolioData = await originalResponse.json();
  let messageId: string | undefined;
  try {
    await page.getByLabel("First Name", { exact: true }).fill(`TEST-${marker}`);
    await page.getByLabel("Full Name", { exact: true }).fill(`Test ${marker}`);
    await page.getByRole("button", { name: "save changes", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Changes saved");
    const saved: PortfolioData = await (await context.request.get("/api/admin/content")).json();
    expect(saved.profile.firstName).toBe(`TEST-${marker}`);
    expect(saved.version).toBe(original.version + 1);

    const stale = await context.request.put("/api/admin/content", { headers: { origin }, data: original });
    expect(stale.status()).toBe(409);
    const crossOrigin = await context.request.put("/api/admin/content", { headers: { origin: "https://untrusted.example.org" }, data: saved });
    expect(crossOrigin.status()).toBe(403);

    const next = { ...saved, skills: [{ id: `skill-${marker}`, name: `Skill ${marker}`, slug: "", category: "Tool", level: 75 }], projects: [{ id: `project-${marker}`, index: "01", name: `Project ${marker}`, category: "", description: `Project description ${marker}`, stack: ["one", "two"], stars: "", year: "", status: "", color: "var(--teal)", url: "https://example.org/project", sourceUrl: "" }], experience: [{ id: `job-${marker}`, company: `Company ${marker}`, role: "", period: "", note: "" }] };
    expect((await context.request.put("/api/admin/content", { headers: { origin }, data: next })).ok()).toBe(true);
    await page.goto("/admin");
    await page.getByRole("navigation", { name: "Content management" }).getByRole("button", { name: "experience", exact: true }).click();
    const visibility = page.getByRole("switch", { name: "Show experience section" });
    if (await visibility.getAttribute("aria-checked") === "true") await visibility.click();
    await page.getByRole("button", { name: "save changes", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Changes saved");
    await page.reload();
    await page.getByRole("navigation", { name: "Content management" }).getByRole("button", { name: "experience", exact: true }).click();
    await expect(visibility).toHaveAttribute("aria-checked", "false");
    await expect(page.getByLabel("Company", { exact: true })).toHaveValue(`Company ${marker}`);
    await page.goto("/");
    await expect(page.getByText("work history", { exact: true })).toHaveCount(0);
    await expect(page.getByText(`Company ${marker}`, { exact: true })).toHaveCount(0);
    await page.goto("/admin");
    await page.getByRole("navigation", { name: "Content management" }).getByRole("button", { name: "experience", exact: true }).click();
    await visibility.click();
    await page.getByRole("button", { name: "save changes", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Changes saved");
    await page.goto("/");
    await expect(page.getByText("work history", { exact: true })).toHaveCount(1);
    await expect(page.getByText(`Company ${marker}`, { exact: true })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(`TEST-${marker.toUpperCase()}`);
    await page.getByRole("button", { name: new RegExp(`Project ${marker}`) }).click();
    await expect(page.getByText(`Project description ${marker}`)).toBeVisible();
    await expect(page.getByRole("link", { name: "view project" })).toHaveAttribute("href", "https://example.org/project");

    await page.getByLabel("name", { exact: true }).fill(`Test ${marker}`);
    await page.getByLabel("email", { exact: true }).fill(`${marker}@example.org`);
    await page.getByLabel("message", { exact: true }).fill(`Automated contact verification ${marker}`);
    await page.getByRole("button", { name: "send message →", exact: true }).press("Enter");
    await expect(page.getByText("SENT", { exact: true })).toBeVisible();
    const inbox = await (await context.request.get("/api/admin/messages")).json();
    messageId = inbox.messages.find((message: { email: string }) => message.email === `${marker}@example.org`)?.id;
    expect(messageId).toBeTruthy();
    await page.goto("/admin");
    await page.getByRole("navigation", { name: "Content management" }).getByRole("button", { name: "messages" }).click();
    await expect(page.getByText(`Automated contact verification ${marker}`)).toBeVisible();
    expect((await context.request.patch(`/api/admin/messages/${messageId}`, { headers: { origin }, data: { read: true } })).ok()).toBe(true);
  } finally {
    if (messageId) await context.request.delete(`/api/admin/messages/${messageId}`, { headers: { origin } });
    const current: PortfolioData = await (await context.request.get("/api/admin/content")).json();
    const restored = await context.request.put("/api/admin/content", { headers: { origin }, data: { ...original, version: current.version } });
    expect(restored.ok()).toBe(true);
  }

  await page.goto("/admin");
  await page.getByRole("button", { name: "logout", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  expect((await context.request.get("/api/admin/content")).status()).toBe(401);
  expect((await context.request.put("/api/admin/content", { headers: { origin }, data: emptyPortfolio() })).status()).toBe(401);
});
