import { getDb, DatabaseUnavailableError } from "@/lib/db";
import { verifyPassword, DUMMY_PASSWORD_HASH } from "@/lib/password";
import { assertSameOrigin, apiError, HttpError, json, readJson } from "@/lib/http";
import { loginSchema } from "@/lib/content-schema";
import { clientAddress, rateLimit } from "@/lib/rate-limit";
import { createOtp, deleteOtp, maskEmail, OTP_TTL_SECONDS, setOtpCookie } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!process.env.DATABASE_URL?.trim()) throw new DatabaseUnavailableError();
    await rateLimit("login-address", clientAddress(request));
    const { email, password, rememberMe } = loginSchema.parse(await readJson(request, 4096));
    await rateLimit("login-email", email);
    const admin = await getDb().admin.findUnique({ where: { email } });
    const valid = await verifyPassword(password, admin?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!admin || !valid) throw new HttpError(401, "Incorrect email or password.");

    const otp = await createOtp({ adminId: admin.id, email: admin.email, purpose: "login", rememberMe });
    try {
      const delivery = await sendOtpEmail({ to: admin.email, code: otp.code, purpose: "login", minutes: OTP_TTL_SECONDS / 60 });
      const response = json({
        ok: true,
        otpRequired: true,
        email: maskEmail(admin.email),
        expiresIn: OTP_TTL_SECONDS,
        ...(delivery.developmentCode ? { developmentCode: delivery.developmentCode } : {})
      });
      setOtpCookie(response, "login", otp.token, otp.expiresAt);
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
