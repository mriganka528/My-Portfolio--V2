import { getSession } from "@/lib/auth";
import { DatabaseUnavailableError, getDb } from "@/lib/db";
import { assertSameOrigin, apiError, HttpError, json, readJson } from "@/lib/http";
import { settingsPasswordSchema } from "@/lib/content-schema";
import { rateLimit } from "@/lib/rate-limit";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createOtp, deleteOtp, maskEmail, OTP_TTL_SECONDS, setOtpCookie } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!process.env.DATABASE_URL?.trim()) throw new DatabaseUnavailableError();
    const session = await getSession();
    if (!session) throw new HttpError(401, "Your session has expired. Please sign in again.");
    await rateLimit("admin-settings", session.admin.id);
    const { currentPassword, newPassword } = settingsPasswordSchema.parse(await readJson(request, 4096));

    const admin = await getDb().admin.findUnique({ where: { id: session.admin.id }, select: { email: true, passwordHash: true } });
    if (!admin) throw new HttpError(401, "Your session has expired. Please sign in again.");
    if (!await verifyPassword(currentPassword, admin.passwordHash)) throw new HttpError(401, "Current password is incorrect.");
    if (newPassword === currentPassword) throw new HttpError(400, "Choose a password different from your current password.");

    const pendingPasswordHash = await hashPassword(newPassword);
    const otp = await createOtp({
      adminId: session.admin.id,
      email: admin.email,
      purpose: "settings-password",
      pendingPasswordHash
    });
    try {
      const delivery = await sendOtpEmail({ to: admin.email, code: otp.code, purpose: "settings-password", minutes: OTP_TTL_SECONDS / 60 });
      const response = json({
        ok: true,
        otpRequired: true,
        email: maskEmail(admin.email),
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
