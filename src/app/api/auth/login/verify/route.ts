import { cookies } from "next/headers";
import { after } from "next/server";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { DatabaseUnavailableError } from "@/lib/db";
import { assertSameOrigin, apiError, HttpError, json, readJson } from "@/lib/http";
import { loginVerifySchema } from "@/lib/content-schema";
import { clientAddress, rateLimit } from "@/lib/rate-limit";
import { checkOtpCode, clearOtpCookie, deleteOtp, findOtp, readOtpToken } from "@/lib/otp";
import { sendLoginAlertEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!process.env.DATABASE_URL?.trim()) throw new DatabaseUnavailableError();
    const address = clientAddress(request);
    await rateLimit("login-otp", address);
    const token = await readOtpToken("login");
    if (!token) throw new HttpError(400, "Your sign-in verification has expired. Please sign in again.");
    const record = await findOtp(token, "login");
    if (!record) throw new HttpError(410, "This verification code has expired. Please sign in again.");
    const { code } = loginVerifySchema.parse(await readJson(request, 2048));
    await checkOtpCode(record, code);

    const previous = (await cookies()).get(SESSION_COOKIE)?.value;
    const session = await createSession(record.adminId, record.rememberMe, previous);
    await deleteOtp(record.id);

    const userAgent = request.headers.get("user-agent");
    after(async () => {
      await sendLoginAlertEmail({ to: record.admin.email, userAgent, ip: address })
        .catch(error => console.error("Admin sign-in alert failed:", error instanceof Error ? error.name : "Unknown error"));
    });

    const response = json({ ok: true, email: record.admin.email });
    response.cookies.set(SESSION_COOKIE, session.token, { ...sessionCookieOptions, expires: session.expiresAt, maxAge: session.maxAge });
    clearOtpCookie(response, "login");
    return response;
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) return json({ error: "Admin access will be available after the database is connected." }, 503);
    return apiError(error);
  }
}
