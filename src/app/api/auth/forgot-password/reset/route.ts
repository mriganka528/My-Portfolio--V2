import { cookies } from "next/headers";
import { after } from "next/server";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { DatabaseUnavailableError, getDb } from "@/lib/db";
import { assertSameOrigin, apiError, HttpError, json, readJson } from "@/lib/http";
import { resetPasswordSchema } from "@/lib/content-schema";
import { clientAddress, rateLimit } from "@/lib/rate-limit";
import { hashPassword } from "@/lib/password";
import { clearOtpCookie, findOtp, readOtpToken } from "@/lib/otp";
import { sendLoginAlertEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!process.env.DATABASE_URL?.trim()) throw new DatabaseUnavailableError();
    const address = clientAddress(request);
    await rateLimit("forgot-otp", address);
    const token = await readOtpToken("reset");
    if (!token) throw new HttpError(400, "Your reset request has expired. Enter your email again.");
    const record = await findOtp(token, "password-reset");
    if (!record || record.expiresAt <= new Date()) throw new HttpError(410, "Your reset request has expired. Enter your email again.");
    if (!record.verifiedAt) throw new HttpError(403, "Verify the emailed code before resetting your password.");
    const { password } = resetPasswordSchema.parse(await readJson(request, 4096));

    const passwordHash = await hashPassword(password);
    const db = getDb();
    await db.$transaction([
      db.admin.update({ where: { id: record.adminId }, data: { passwordHash } }),
      db.session.deleteMany({ where: { adminId: record.adminId } }),
      db.adminOtp.deleteMany({ where: { adminId: record.adminId } })
    ]);

    const previous = (await cookies()).get(SESSION_COOKIE)?.value;
    const session = await createSession(record.adminId, false, previous);

    const userAgent = request.headers.get("user-agent");
    after(async () => {
      await sendLoginAlertEmail({ to: record.admin.email, userAgent, ip: address, method: "password-reset" })
        .catch(error => console.error("Admin sign-in alert failed:", error instanceof Error ? error.name : "Unknown error"));
    });

    const response = json({ ok: true, email: record.admin.email });
    response.cookies.set(SESSION_COOKIE, session.token, { ...sessionCookieOptions, expires: session.expiresAt, maxAge: session.maxAge });
    clearOtpCookie(response, "reset");
    return response;
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) return json({ error: "Admin access will be available after the database is connected." }, 503);
    return apiError(error);
  }
}
