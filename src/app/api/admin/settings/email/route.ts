import { getSession } from "@/lib/auth";
import { DatabaseUnavailableError, getDb } from "@/lib/db";
import { assertSameOrigin, apiError, HttpError, json, readJson } from "@/lib/http";
import { settingsEmailSchema } from "@/lib/content-schema";
import { rateLimit } from "@/lib/rate-limit";
import { verifyPassword } from "@/lib/password";
import { createOtp, deleteOtp, maskEmail, OTP_TTL_SECONDS, setOtpCookie } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!process.env.DATABASE_URL?.trim()) throw new DatabaseUnavailableError();
    const session = await getSession();
    if (!session) throw new HttpError(401, "Your session has expired. Please sign in again.");
    await rateLimit("admin-settings", session.admin.id);
    const { currentPassword, email } = settingsEmailSchema.parse(await readJson(request, 4096));

    const db = getDb();
    const admin = await db.admin.findUnique({ where: { id: session.admin.id }, select: { email: true, passwordHash: true } });
    if (!admin) throw new HttpError(401, "Your session has expired. Please sign in again.");
    if (!await verifyPassword(currentPassword, admin.passwordHash)) throw new HttpError(401, "Current password is incorrect.");
    if (email === admin.email) throw new HttpError(400, "That is already your sign-in email.");
    const existing = await db.admin.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw new HttpError(409, "That email address is already in use.");

    const otp = await createOtp({ adminId: session.admin.id, email, purpose: "settings-email" });
    try {
      const delivery = await sendOtpEmail({ to: email, code: otp.code, purpose: "settings-email", minutes: OTP_TTL_SECONDS / 60 });
      const response = json({
        ok: true,
        otpRequired: true,
        email: maskEmail(email),
        expiresIn: OTP_TTL_SECONDS,
        ...(delivery.developmentCode ? { developmentCode: delivery.developmentCode } : {})
      });
      setOtpCookie(response, "settings", otp.token, otp.expiresAt);
      return response;
    } catch (error) {
      await deleteOtp(otp.id).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) return json({ error: "Admin access will be available after the database is connected." }, 503);
    return apiError(error);
  }
}
