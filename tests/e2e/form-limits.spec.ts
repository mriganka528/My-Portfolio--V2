import { test, expect } from "@playwright/test";

test("login sends the remember choice and honors the retry countdown", async ({ page }) => {
  const choices: boolean[] = [];
  await page.route("**/api/auth/login", async route => {
    choices.push(route.request().postDataJSON().rememberMe);
    await route.fulfill({ status: 429, contentType: "application/json", headers: { "Retry-After": "2" }, body: JSON.stringify({ error: "Too many attempts. Please try again later." }) });
  });
  await page.goto("/admin/login");
  await page.getByLabel("email", { exact: true }).fill("test@example.org");
  await page.getByLabel("password", { exact: true }).fill("test-password");
  const remember = page.getByRole("checkbox", { name: "Keep me signed in for 30 days" });
  await expect(remember).toBeChecked();
  await page.getByRole("button", { name: "authenticate →", exact: true }).click();
  await expect(page.getByRole("button", { name: /try again in/ })).toBeDisabled();
  await expect(page.getByLabel("email", { exact: true })).toHaveValue("test@example.org");
  await expect(page.getByRole("button", { name: "authenticate →", exact: true })).toBeEnabled();
  await remember.uncheck();
  await page.getByRole("button", { name: "authenticate →", exact: true }).click();
  await expect(page.getByRole("button", { name: /try again in/ })).toBeDisabled();
  expect(choices).toEqual([true, false]);
});

test("contact rate limits preserve the draft and enable retry after the cooldown", async ({ page }) => {
  await page.route("**/api/contact", route => route.fulfill({ status: 429, contentType: "application/json", headers: { "Retry-After": "2" }, body: JSON.stringify({ error: "Too many attempts. Please try again later." }) }));
  await page.goto("/#contact");
  await page.getByLabel("name", { exact: true }).fill("Test visitor");
  await page.getByLabel("email", { exact: true }).fill("test@example.org");
  await page.getByLabel("message", { exact: true }).fill("Keep this message while waiting to retry.");
  await page.getByRole("button", { name: "send message →", exact: true }).press("Enter");
  await expect(page.getByRole("button", { name: /try again in/ })).toBeDisabled();
  await expect(page.locator("#contact").getByRole("alert")).toContainText("Too many attempts");
  await expect(page.getByLabel("message", { exact: true })).toHaveValue("Keep this message while waiting to retry.");
  await expect(page.getByRole("button", { name: "send message →", exact: true })).toBeEnabled();
});
