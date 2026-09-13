import { test, expect } from "@playwright/test";

test("portfolio sections, terminal, navigation, and responsive layout", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#hero")).toBeVisible();
  const terminal = page.getByRole("textbox", { name: "Terminal command" });
  await terminal.fill("help");
  await terminal.press("Enter");
  await expect(page.getByText("whoami · about · stack · work · contact · clear", { exact: true })).toBeVisible();
  await terminal.press("ArrowUp");
  await expect(terminal).toHaveValue("help");
  await terminal.fill("clear");
  await terminal.press("Enter");
  await expect(page.getByText("whoami · about · stack · work · contact · clear", { exact: true })).toHaveCount(0);
  await terminal.fill("constructor");
  await terminal.press("Enter");
  await expect(page.getByText('unknown: constructor. try "help"', { exact: true })).toBeVisible();
  for (const name of ["about", "skills", "projects", "contact"]) {
    await page.getByRole("navigation", { name: "Portfolio sections" }).getByRole("button", { name, exact: true }).press("Enter");
    await expect(page.locator(`#${name}`)).toBeInViewport();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("anonymous users cannot open the editor, read messages, or change content", async ({ page, request }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByLabel("email", { exact: true })).toBeVisible();
  await expect(page.getByLabel("password", { exact: true })).toBeVisible();
  expect((await request.get("/api/admin/content")).status()).toBe(401);
  expect((await request.get("/api/admin/messages")).status()).toBe(401);
  expect((await request.put("/api/admin/content", { headers: { origin: "http://127.0.0.1:3100" }, data: {} })).status()).toBe(401);
  expect((await request.post("/api/auth/login", { headers: { origin: "https://untrusted.example.org" }, data: {} })).status()).toBe(403);
});

test("failed contact submissions retain the visitor's message", async ({ page }) => {
  await page.route("**/api/contact", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Service temporarily unavailable." }) }));
  await page.goto("/#contact");
  await page.getByLabel("name", { exact: true }).fill("Test submission");
  await page.getByLabel("email", { exact: true }).fill("test@example.org");
  await page.getByLabel("message", { exact: true }).fill("This is an automated form test.");
  await page.getByRole("button", { name: "send message →", exact: true }).press("Enter");
  await expect(page.locator("#contact").getByRole("alert")).toHaveText("Service temporarily unavailable.");
  await expect(page.getByLabel("message", { exact: true })).toHaveValue("This is an automated form test.");
  await expect(page.getByText("SENT", { exact: true })).toHaveCount(0);
});

test("unconfigured database has an honest empty state and no demo credentials", async ({ page }) => {
  test.skip(!!process.env.E2E_DATABASE_URL, "Runs only without a configured database.");
  await page.goto("/");
  await expect(page.getByText("Profile not published", { exact: true })).toBeVisible();
  await expect(page.getByText("No projects published yet.", { exact: true })).toBeVisible();
  await page.goto("/admin/login");
  await page.getByLabel("email", { exact: true }).fill("test@example.org");
  await page.getByLabel("password", { exact: true }).fill("not-a-real-password");
  await page.getByRole("button", { name: "authenticate →", exact: true }).click();
  await expect(page.locator("#login-error")).toContainText("after the database is connected");
  await expect(page).toHaveURL(/\/admin\/login$/);
});
