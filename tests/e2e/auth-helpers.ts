import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const testOrigin = "http://127.0.0.1:3100";

type OtpResponse = { developmentCode?: string; error?: string };

export async function loginThroughUi(page: Page, email: string, password: string) {
  await page.goto("/admin/login");
  await page.getByLabel("email", { exact: true }).fill(email);
  await page.getByLabel("password", { exact: true }).fill(password);
  const responsePromise = page.waitForResponse(response =>
    response.url().endsWith("/api/auth/login") && response.request().method() === "POST");
  await page.getByRole("button", { name: "authenticate →", exact: true }).click();
  const response = await responsePromise;
  const data = await response.json() as OtpResponse;
  if (!response.ok() || !data.developmentCode) throw new Error(data.error || "The development verification code was not returned.");
  await page.getByLabel("verification code", { exact: true }).fill(data.developmentCode);
  await page.getByRole("button", { name: "verify code →", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

export async function loginThroughApi(request: APIRequestContext, email: string, password: string, rememberMe = false) {
  const login = await request.post(`${testOrigin}/api/auth/login`, {
    headers: { origin: testOrigin },
    data: { email, password, rememberMe }
  });
  const data = await login.json() as OtpResponse;
  if (!login.ok() || !data.developmentCode) throw new Error(data.error || "The development verification code was not returned.");
  const verify = await request.post(`${testOrigin}/api/auth/login/verify`, {
    headers: { origin: testOrigin },
    data: { code: data.developmentCode }
  });
  const verified = await verify.json() as OtpResponse;
  if (!verify.ok()) throw new Error(verified.error || "OTP verification failed.");
}
