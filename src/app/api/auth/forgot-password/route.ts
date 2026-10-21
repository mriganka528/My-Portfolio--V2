import { DatabaseUnavailableError, getDb } from "@/lib/db";
import { assertSameOrigin, apiError, json, readJson } from "@/lib/http";
import { forgotPasswordSchema } from "@/lib/content-schema";
import { clientAddress, rateLimit } from "@/lib/rate-limit";
import { DUMMY_PASSWORD_HASH, verifyPassword } from "@/lib/password";
import { createOtp, deleteOtp, OTP_TTL_SECONDS, setOtpCookie } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!process.env.DATABASE_URL?.trim()) throw new DatabaseUnavailableError();
    await rateLimit("forgot-address", clientAddress(request));
    const { email } = forgotPasswordSchema.parse(await readJson(request, 4096));
    await rateLimit("forgot-email", email);

    const admin = await getDb().admin.findUnique({ where: { email } });
    if (!admin) {
      // Perform comparable password work so account existence is not obvious from timing.
      await verifyPassword("not-a-real-password", DUMMY_PASSWORD_HASH);
      return json({ ok: true, otpRequired: true, expiresIn: OTP_TTL_SECONDS });
    }

    const otp = await createOtp({ adminId: admin.id, email: admin.email, purpose: "password-reset" });
    try {
      const delivery = await sendOtpEmail({ to: admin.email, code: otp.code, purpose: "password-reset", minutes: OTP_TTL_SECONDS / 60 });
      const response = json({
        ok: true,
        otpRequired: true,
        expiresIn: OTP_TTL_SECONDS,
        ...(delivery.developmentCode ? { developmentCode: delivery.developmentCode } : {})
      });
      setOtpCookie(response, "reset", otp.token, otp.expiresAt);
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
